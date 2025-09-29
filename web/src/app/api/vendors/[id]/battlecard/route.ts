import { NextRequest, NextResponse } from 'next/server';
import { withOrgId, OrgContext } from '@/server/withOrg';
import { supabaseServer } from '@/lib/supabaseServer';
import { ok, err } from '@/server/util/apiJson';
import crypto from 'crypto';

// Helper functions
function computeHeatmap(features: any[]): any[] {
  return features.map(feature => {
    const confidence = feature.fact_score || 0.5;
    const support = feature.value_json?.support || 'unknown';
    
    // Determine win/tie/lose based on support level and confidence
    let status = 'tie';
    if (support === 'native' && confidence > 0.8) {
      status = 'win';
    } else if (support === 'no' || confidence < 0.3) {
      status = 'lose';
    }

    return {
      feature: feature.subject || feature.text_summary,
      status,
      confidence,
      support,
      proof: feature.citations || []
    };
  });
}

function composeNarrativeFromBullets(bullets: any[]): any {
  const narrative: any = {};
  
  const sections = bullets.reduce((acc, bullet) => {
    if (!acc[bullet.section]) {
      acc[bullet.section] = [];
    }
    acc[bullet.section].push(bullet.text);
    return acc;
  }, {});

  // Map bullet sections to narrative structure
  if (sections.differentiators) {
    narrative.whyWeWin = sections.differentiators;
  }
  if (sections.objections) {
    narrative.objections = sections.objections;
  }
  if (sections.landmines) {
    narrative.landmines = sections.landmines;
  }
  if (sections.proof) {
    narrative.talkTracks = sections.proof;
  }

  return narrative;
}

export const GET = withOrgId(async (ctx: OrgContext, req: Request) => {
  const traceId = crypto.randomUUID();
  
  // Extract vendor ID from URL
  const url = new URL(req.url);
  const vendorId = url.pathname.split('/')[3]; // Extract ID from /api/vendors/[id]/battlecard
  
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

    // Get facts by lane with individual error handling
    const laneQueries = ['pricing', 'features', 'integrations', 'security', 'changelog'];
    const lanes: any = {};
    const laneErrors: any = {};

    for (const metric of laneQueries) {
      try {
        const { data: facts, error: factsError } = await sb
          .from('facts')
          .select('*')
          .eq('vendor_id', vendorId)
          .eq('org_id', ctx.orgId) // Add org filter
          .eq('metric', metric);

        if (factsError) {
          laneErrors[metric] = factsError.message;
          lanes[metric] = [];
        } else {
          lanes[metric] = facts || [];
        }
      } catch (laneError) {
        laneErrors[metric] = laneError instanceof Error ? laneError.message : 'Unknown error';
        lanes[metric] = [];
      }
    }

    // Organize facts by lane
    const organizedLanes = {
      pricing: lanes.pricing || [],
      features: lanes.features || [],
      integrations: lanes.integrations || [],
      trust: {
        badges: lanes.security?.filter((f: any) => f.value_json?.badge) || [],
        links: lanes.security?.filter((f: any) => f.value_json?.url) || []
      },
      changelog: lanes.changelog || []
    };

    // Compute heatmap from features
    const heatmap = computeHeatmap(organizedLanes.features);

    // Get existing narrative from battlecard_bullets
    let narrative;
    try {
      const { data: bullets } = await sb
        .from('battlecard_bullets')
        .select('*')
        .eq('run_id', vendorId) // Using vendor ID as run_id for now
        .order('section', { ascending: true });

      narrative = bullets ? composeNarrativeFromBullets(bullets) : undefined;
    } catch (narrativeError) {
      console.error('Battlecard narrative query failed:', narrativeError);
      narrative = undefined;
    }

    return ok({
      pricing: organizedLanes.pricing,
      features: organizedLanes.features,
      integrations: organizedLanes.integrations,
      trust: organizedLanes.trust,
      changelog: organizedLanes.changelog,
      heatmap,
      narrative,
      debug: {
        laneErrors: Object.keys(laneErrors).length > 0 ? laneErrors : undefined,
        traceId
      }
    });

  } catch (error) {
    console.error('Battlecard.get', error);
    return err(500, 'Internal server error', { 
      traceId, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
