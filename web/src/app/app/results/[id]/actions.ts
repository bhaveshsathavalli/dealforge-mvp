'use server';

import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { AnswerWithCitations, TAnswer } from '@/lib/answer-schema';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.ENAI_API_KEY!;
const TOP_HITS = 12;

export async function getOrBuildAnswer(runId: string) {
  const supabase = await createClient();

  // 1) Authenticate current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Not authenticated');
  }

  // 2) Verify the user is a member of the org for the given runId
  const { data: run, error: runError } = await supabase
    .from('query_runs')
    .select(`
      id,
      org_id,
      query_text,
      mode,
      status,
      created_at
    `)
    .eq('id', runId)
    .single();

  if (runError || !run) {
    return { error: 'Run not found' };
  }

  // Check org membership
  const { data: membership } = await supabase
    .from('org_members')
    .select('id')
    .eq('org_id', run.org_id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return { error: 'Access denied' };
  }

  // 3) Check if we already have processed rows for this run
  const { data: existingClaims } = await supabase
    .from('claims')
    .select(`
      id,
      text,
      stance,
      support_level
    `)
    .eq('run_id', runId)
    .order('created_at', { ascending: true });

  if (existingClaims && existingClaims.length > 0) {
    const { data: existingCites } = await supabase
      .from('citations')
      .select(`
        id,
        source_url,
        anchor_text,
        claim_id
      `)
      .eq('run_id', runId);

    const { data: existingEvidence } = await supabase
      .from('evidence')
      .select(`
        id,
        source_url,
        quote,
        claim_id
      `)
      .eq('run_id', runId);

    return { 
      ok: true, 
      run, 
      claims: existingClaims, 
      citations: existingCites || [],
      evidence: existingEvidence || []
    };
  }

  // 4) Pull top N raw_hits for the run
  const { data: hits, error: hitsError } = await supabase
    .from('raw_hits')
    .select(`
      id,
      source_url,
      domain,
      title,
      text_snippet,
      html_snippet
    `)
    .eq('run_id', runId)
    .order('rank', { ascending: true })
    .limit(TOP_HITS);

  if (hitsError || !hits || hits.length === 0) {
    return { error: 'No raw hits found for this run' };
  }

  // 5) Build prompt
  const prompt = [
    `You are DealForge, producing concise sales-ready bullets grounded in vendor primary sources.`,
    `Query: ${run.query_text}`,
    `Mode: ${run.mode}`,
    `Rules:`,
    `- Strictly cite deep links; never invent URLs.`,
    `- Prefer vendor/pricing/support docs; avoid forums unless corroborated.`,
    `- Minimum 2 citations per bullet.`,
    `- Ensure ≥3 unique domains overall if possible.`,
    `Provide JSON exactly matching the AnswerWithCitations schema.`,
    `---`,
    `SOURCES (title | domain | url | snippet):`,
    ...hits.map(h => `- ${h.title || 'Untitled'} | ${h.domain || 'Unknown'} | ${h.source_url}\n  ${h.text_snippet?.slice(0, 300) || h.html_snippet?.slice(0, 300) || 'No snippet available'}`),
  ].join('\n');

  // 6) Call OpenAI with JSON schema
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  
  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Return only valid JSON.' }, 
        { role: 'user', content: prompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'AnswerWithCitations',
          schema: {
            type: 'object',
            properties: {
              bullets: {
                type: 'array',
                minItems: 4,
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string' },
                    citation_ids: { type: 'array', items: { type: 'string' }, minItems: 2 }
                  },
                  required: ['text', 'citation_ids'],
                  additionalProperties: false
                }
              },
              citations: {
                type: 'array',
                minItems: 4,
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    url: { type: 'string' },
                    domain: { type: 'string' },
                    snippet: { type: 'string' },
                    quote: { type: 'string' }
                  },
                  required: ['id','title','url','domain','snippet','quote'],
                  additionalProperties: false
                }
              },
              confidence: { type: 'number' },
              disclaimers: { type: 'string' }
            },
            required: ['bullets', 'citations'],
            additionalProperties: false
          },
          strict: true
        }
      },
      temperature: 0.2,
    });

    const json = JSON.parse(resp.choices[0].message.content ?? '{}');
    const parsed = AnswerWithCitations.safeParse(json);
    
    if (!parsed.success) {
      return { 
        error: 'LLM schema validation failed', 
        details: parsed.error.format() 
      };
    }
    
    const answer: TAnswer = parsed.data;

    // Simple domain diversity guard (non-blocking)
    const domains = new Set(answer.citations.map(c => c.domain));
    if (domains.size < 3) {
      console.warn(`Only ${domains.size} unique domains found, expected at least 3`);
    }

    // 7) Insert claims first, then citations and evidence
    const claimIdMap = new Map<string, number>();
    
    for (const bullet of answer.bullets) {
      const { data: insertedClaim, error: claimError } = await supabase
        .from('claims')
        .insert({
          run_id: runId,
          text: bullet.text,
          stance: 'neutral',
          support_level: 'medium'
        })
        .select('id')
        .single();

      if (claimError) {
        console.error('Failed to insert claim:', claimError);
        continue;
      }

      claimIdMap.set(bullet.text, insertedClaim.id);
    }

    // 8) Insert citations and evidence
    for (const citation of answer.citations) {
      // Find the claim this citation belongs to
      const bullet = answer.bullets.find(b => b.citation_ids.includes(citation.id));
      if (!bullet) continue;
      
      const claimId = claimIdMap.get(bullet.text);
      if (!claimId) continue;

      // Insert citation
      const { error: citeError } = await supabase
        .from('citations')
        .insert({
          run_id: runId,
          claim_id: claimId,
          source_url: citation.url,
          anchor_text: citation.title
        });

      if (citeError) {
        console.error('Failed to insert citation:', citeError);
        continue;
      }

      // Insert evidence
      const { error: evidenceError } = await supabase
        .from('evidence')
        .insert({
          run_id: runId,
          claim_id: claimId,
          source_url: citation.url,
          quote: citation.quote,
          reliability_score: 0.8
        });

      if (evidenceError) {
        console.error('Failed to insert evidence:', evidenceError);
      }
    }

    // 9) Return the processed data
    const { data: claims } = await supabase
      .from('claims')
      .select(`
        id,
        text,
        stance,
        support_level
      `)
      .eq('run_id', runId)
      .order('created_at', { ascending: true });

    const { data: citations } = await supabase
      .from('citations')
      .select(`
        id,
        source_url,
        anchor_text,
        claim_id
      `)
      .eq('run_id', runId);

    const { data: evidence } = await supabase
      .from('evidence')
      .select(`
        id,
        source_url,
        quote,
        claim_id
      `)
      .eq('run_id', runId);

    return { 
      ok: true, 
      run, 
      claims: claims || [], 
      citations: citations || [],
      evidence: evidence || [],
      confidence: answer.confidence,
      disclaimers: answer.disclaimers
    };

  } catch (error: unknown) {
    console.error('OpenAI API error:', error);
    return { 
      error: 'Failed to generate answer', 
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}