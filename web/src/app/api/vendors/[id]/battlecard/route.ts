import { NextRequest, NextResponse } from 'next/server';
import { withOrgId } from '@/server/withOrg';
import { supabaseServer } from '@/lib/supabaseServer';

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

export const GET = withOrgId(async ({ orgId }, request: NextRequest, { params }: { params: { id: string } }) => {
  try {
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

    // Get facts by lane
    const { data: facts, error: factsError } = await sb
      .from('facts')
      .select('*')
      .eq('vendor_id', params.id)
      .order('metric', { ascending: true });

    if (factsError) {
      return NextResponse.json({ error: 'Failed to fetch facts' }, { status: 500 });
    }

    // Organize facts by lane
    const lanes = {
      pricing: facts?.filter(f => f.metric === 'pricing') || [],
      features: facts?.filter(f => f.metric === 'features') || [],
      integrations: facts?.filter(f => f.metric === 'integrations') || [],
      trust: {
        badges: facts?.filter(f => f.metric === 'security' && f.value_json?.badge) || [],
        links: facts?.filter(f => f.metric === 'security' && f.value_json?.url) || []
      },
      changelog: facts?.filter(f => f.metric === 'changelog') || []
    };

    // Compute heatmap from features
    const heatmap = computeHeatmap(lanes.features);

    // Get existing narrative from battlecard_bullets
    const { data: bullets } = await sb
      .from('battlecard_bullets')
      .select('*')
      .eq('run_id', params.id) // Using vendor ID as run_id for now
      .order('section', { ascending: true });

    const narrative = bullets ? composeNarrativeFromBullets(bullets) : undefined;

    const response = {
      pricing: lanes.pricing,
      features: lanes.features,
      integrations: lanes.integrations,
      trust: lanes.trust,
      changelog: lanes.changelog,
      heatmap,
      narrative
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Battlecard endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
});
