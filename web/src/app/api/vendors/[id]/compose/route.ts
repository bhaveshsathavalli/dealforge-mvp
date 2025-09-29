import { NextRequest, NextResponse } from 'next/server';
import { withOrgId } from '@/server/withOrg';
import { supabaseServer } from '@/lib/supabaseServer';
import { composeNarrative } from '@/lib/compose';
import { ok, err } from '@/server/util/apiJson';
import crypto from 'crypto';

export const POST = withOrgId(async (ctx: OrgContext, req: Request) => {
  const traceId = crypto.randomUUID();
  
  // Extract vendor ID from URL
  const url = new URL(req.url);
  const vendorId = url.pathname.split('/')[3]; // Extract ID from /api/vendors/[id]/compose
  
  // Validate UUID param
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(vendorId)) {
    return err(400, 'Invalid vendor ID format', { id: vendorId });
  }

  // Validate active org
  if (!ctx.orgId) {
    return err(401, 'No active organization', { traceId });
  }

  try {
    // Get request body
    const body = await req.json();
    const { persona }: { persona: 'AE' | 'SE' | 'Exec' } = body;

    if (!persona || !['AE', 'SE', 'Exec'].includes(persona)) {
      return err(400, 'Invalid persona. Must be one of: AE, SE, Exec', { persona, traceId });
    }

    const sb = supabaseServer();

    // Get vendor info
    const { data: vendor, error: vendorError } = await sb
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .eq('org_id', ctx.orgId)
      .single();

    if (vendorError || !vendor) {
      return err(404, 'Vendor not found in organization', { id: vendorId, traceId });
    }

    // Get facts for composition (only structured data, no raw page text)
    const { data: facts, error: factsError } = await sb
      .from('facts')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('org_id', ctx.orgId) // Add org filter
      .not('text_summary', 'is', null)
      .order('fact_score', { ascending: false })
      .limit(50); // Limit to top 50 facts to avoid token limits

    if (factsError) {
      return err(500, 'Failed to fetch facts', { error: factsError.message, traceId });
    }

    if (!facts || facts.length === 0) {
      return err(400, 'No facts available for composition', { traceId });
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
    const runId = vendorId; // Using vendor ID as run_id for now

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
        return err(500, 'Failed to save narrative', { error: insertError.message, traceId });
      }
    }

    return ok({
      success: true,
      narrative,
      bulletsSaved: bullets.length,
      debug: { traceId }
    });

  } catch (error) {
    console.error('Compose endpoint error:', error);
    return err(500, 'Internal server error', { 
      traceId, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
