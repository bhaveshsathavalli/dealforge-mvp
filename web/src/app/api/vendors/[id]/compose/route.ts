import { NextRequest, NextResponse } from 'next/server';
import { withOrgId } from '@/server/withOrg';
import { supabaseServer } from '@/lib/supabaseServer';
import { composeNarrative } from '@/lib/compose';

export const POST = withOrgId(async ({ orgId }, request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    // Get request body
    const body = await request.json();
    const { persona }: { persona: 'AE' | 'SE' | 'Exec' } = body;

    if (!persona || !['AE', 'SE', 'Exec'].includes(persona)) {
      return NextResponse.json({ error: 'Invalid persona' }, { status: 400 });
    }

    const sb = supabaseServer();

    // Get vendor info
    const { data: vendor, error: vendorError } = await sb
      .from('vendors')
      .select('*')
      .eq('id', params.id)
      .eq('org_id', orgId)
      .single();

    if (vendorError || !vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Get facts for composition (only structured data, no raw page text)
    const { data: facts, error: factsError } = await sb
      .from('facts')
      .select('*')
      .eq('vendor_id', params.id)
      .not('text_summary', 'is', null)
      .order('fact_score', { ascending: false })
      .limit(50); // Limit to top 50 facts to avoid token limits

    if (factsError) {
      return NextResponse.json({ error: 'Failed to fetch facts' }, { status: 500 });
    }

    if (!facts || facts.length === 0) {
      return NextResponse.json({ error: 'No facts available for composition' }, { status: 400 });
    }

    // Compose narrative using LLM
    const narrative = await composeNarrative({
      vendorName: vendor.name,
      facts,
      persona
    });

    // Save narrative to battlecard_bullets table
    const bullets = [];
    
    // Create a synthetic run_id for this vendor (in a real implementation, this would be a proper compare run)
    const runId = params.id; // Using vendor ID as run_id for now

    // Clear existing bullets for this vendor
    await sb
      .from('battlecard_bullets')
      .delete()
      .eq('run_id', runId);

    // Save narrative sections as bullets
    if (narrative.overview) {
      bullets.push({
        run_id: runId,
        section: 'overview',
        text: narrative.overview,
        citations: [],
        answer_score: 0.8,
        persona
      });
    }

    if (narrative.whyWeWin) {
      narrative.whyWeWin.forEach((text: string) => {
        bullets.push({
          run_id: runId,
          section: 'differentiators',
          text,
          citations: [],
          answer_score: 0.8,
          persona
        });
      });
    }

    if (narrative.whyTheyWin) {
      narrative.whyTheyWin.forEach((text: string) => {
        bullets.push({
          run_id: runId,
          section: 'competitor_advantages',
          text,
          citations: [],
          answer_score: 0.7,
          persona
        });
      });
    }

    if (narrative.objections) {
      narrative.objections.forEach((text: string) => {
        bullets.push({
          run_id: runId,
          section: 'objections',
          text,
          citations: [],
          answer_score: 0.7,
          persona
        });
      });
    }

    if (narrative.landmines) {
      narrative.landmines.forEach((text: string) => {
        bullets.push({
          run_id: runId,
          section: 'landmines',
          text,
          citations: [],
          answer_score: 0.6,
          persona
        });
      });
    }

    if (narrative.talkTracks) {
      narrative.talkTracks.forEach((text: string) => {
        bullets.push({
          run_id: runId,
          section: 'talk_tracks',
          text,
          citations: [],
          answer_score: 0.8,
          persona
        });
      });
    }

    if (narrative.questions) {
      narrative.questions.forEach((text: string) => {
        bullets.push({
          run_id: runId,
          section: 'questions',
          text,
          citations: [],
          answer_score: 0.8,
          persona
        });
      });
    }

    // Insert bullets
    if (bullets.length > 0) {
      const { error: insertError } = await sb
        .from('battlecard_bullets')
        .insert(bullets);

      if (insertError) {
        console.error('Error inserting bullets:', insertError);
        return NextResponse.json({ error: 'Failed to save narrative' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      narrative,
      bulletsSaved: bullets.length
    });

  } catch (error) {
    console.error('Compose endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
