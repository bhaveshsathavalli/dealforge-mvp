import { NextRequest, NextResponse } from 'next/server';
import { withOrgId } from '@/server/withOrg';
import { collectLane, type Lane } from '@/server/jobs/collectVendor';

export const POST = withOrgId(async ({ orgId }, request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    // Get request body
    const body = await request.json();
    const { lanes }: { lanes?: Lane[] } = body;

    // Default to all lanes if none specified
    const targetLanes: Lane[] = lanes || ['pricing', 'features', 'integrations', 'trust', 'changelog'];
    
    // Collect data for each lane
    const results: Record<string, { saved: number; skipped: boolean; reason?: string }> = {};

    for (const lane of targetLanes) {
      try {
        const result = await collectLane(params.id, lane, orgId);
        results[lane] = result;
      } catch (error) {
        results[lane] = {
          saved: 0,
          skipped: false,
          reason: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Refresh endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
