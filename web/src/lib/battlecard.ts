import { supabaseServer } from '@/lib/supabaseServer';
import { auth } from '@clerk/nextjs/server';

export interface BattlecardSection {
  id: string;
  title: string;
  content: string;
  citations: BattlecardCitation[];
}

export interface BattlecardCitation {
  id: string;
  source_url: string;
  anchor_text: string;
  quote?: string;
  user_added: boolean;
  added_by?: string;
}

export interface BattlecardData {
  competitor: string;
  sections: BattlecardSection[];
}

export async function buildBattlecard(
  runId: string, 
  competitor: string, 
  options?: { userId?: string }
): Promise<BattlecardData | { error: string }> {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return { error: 'Not authenticated' };
    }

    const sb = supabaseServer();

    // Get the run to verify access
    const { data: run, error: runError } = await sb
      .from('query_runs')
      .select('id, query_text, clerk_org_id')
      .eq('id', runId)
      .eq('clerk_org_id', orgId)
      .single();

    if (runError || !run) {
      return { error: 'Run not found' };
    }

    // Get claims related to this competitor
    const { data: claims, error: claimsError } = await sb
      .from('claims')
      .select(`
        id,
        text,
        stance,
        support_level
      `)
      .eq('run_id', runId)
      .ilike('text', `%${competitor}%`)
      .order('created_at', { ascending: true });

    if (claimsError) {
      return { error: 'Failed to fetch claims' };
    }

    // Get citations for these claims
    const claimIds = (claims || []).map(c => c.id);
    const { data: citations, error: citationsError } = await sb
      .from('citations')
      .select(`
        id,
        source_url,
        anchor_text,
        claim_id,
        user_added,
        added_by
      `)
      .in('claim_id', claimIds);

    if (citationsError) {
      return { error: 'Failed to fetch citations' };
    }

    // Get evidence for these claims
    const { data: evidence, error: evidenceError } = await sb
      .from('evidence')
      .select(`
        id,
        source_url,
        quote,
        claim_id
      `)
      .in('claim_id', claimIds);

    if (evidenceError) {
      return { error: 'Failed to fetch evidence' };
    }

    // Group citations by claim
    const citationsByClaim = new Map<string, BattlecardCitation[]>();
    (citations || []).forEach(citation => {
      if (!citationsByClaim.has(citation.claim_id)) {
        citationsByClaim.set(citation.claim_id, []);
      }
      citationsByClaim.get(citation.claim_id)!.push({
        id: citation.id,
        source_url: citation.source_url,
        anchor_text: citation.anchor_text,
        user_added: citation.user_added || false,
        added_by: citation.added_by
      });
    });

    // Group evidence by claim
    const evidenceByClaim = new Map<string, any[]>();
    (evidence || []).forEach(ev => {
      if (!evidenceByClaim.has(ev.claim_id)) {
        evidenceByClaim.set(ev.claim_id, []);
      }
      evidenceByClaim.get(ev.claim_id)!.push(ev);
    });

    // Build sections based on claims
    const sections: BattlecardSection[] = [
      {
        id: 'overview',
        title: 'Company Overview',
        content: `${competitor} is a leading provider in the competitive landscape with significant market presence and customer base.`,
        citations: []
      },
      {
        id: 'differentiators',
        title: 'Key Differentiators',
        content: (claims || []).length > 0 
          ? (claims || []).slice(0, 2).map(c => c.text).join(' ')
          : `Our analysis shows ${competitor} has several key differentiators in the market.`,
        citations: (claims || []).slice(0, 2).flatMap(c => citationsByClaim.get(c.id) || [])
      },
      {
        id: 'advantages',
        title: 'Competitive Advantages',
        content: (claims || []).length > 2 
          ? (claims || []).slice(2, 4).map(c => c.text).join(' ')
          : `${competitor} demonstrates strong competitive advantages in key areas.`,
        citations: (claims || []).slice(2, 4).flatMap(c => citationsByClaim.get(c.id) || [])
      },
      {
        id: 'objections',
        title: 'Common Objections',
        content: `Address common objections about ${competitor} including pricing, implementation complexity, and feature limitations.`,
        citations: []
      }
    ];

    return {
      competitor,
      sections
    };
  } catch (error) {
    console.error('Error building battlecard:', error);
    return { error: 'Internal server error' };
  }
}

export async function addUserCitation(
  runId: string,
  competitor: string,
  citation: {
    source_url: string;
    anchor_text: string;
    quote?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return { success: false, error: 'Not authenticated' };
    }

    const sb = supabaseServer();

    // Verify run access
    const { data: run, error: runError } = await sb
      .from('query_runs')
      .select('id, clerk_org_id')
      .eq('id', runId)
      .eq('clerk_org_id', orgId)
      .single();

    if (runError || !run) {
      return { success: false, error: 'Run not found' };
    }

    // Insert user-added citation
    const { error: insertError } = await sb
      .from('citations')
      .insert({
        run_id: runId,
        claim_id: null, // User-added citations aren't tied to specific claims initially
        source_url: citation.source_url,
        anchor_text: citation.anchor_text,
        user_added: true,
        added_by: userId
      });

    if (insertError) {
      return { success: false, error: 'Failed to add citation' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding user citation:', error);
    return { success: false, error: 'Internal server error' };
  }
}
