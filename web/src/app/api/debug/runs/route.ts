import { NextResponse } from 'next/server';
import { withOrgId } from '@/server/withOrg';
import { supabaseServer } from '@/lib/supabaseServer';

export const GET = withOrgId(async ({ orgId }) => {
  console.log('Debug Runs API: GET /api/debug/runs called');
  
  try {
    const supabase = supabaseServer();

    // Get runs for the organization
    const { data: runs, error: runsError } = await supabase
      .from('query_runs')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        query_text
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (runsError) {
      console.error('Debug Runs API: Error fetching runs:', runsError);
      return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
    }

    // Get hit counts for each run
    const runsWithHits = await Promise.all(
      (runs || []).map(async (run) => {
        const { count: hitCount } = await supabase
          .from('raw_hits')
          .select('*', { count: 'exact', head: true })
          .eq('run_id', run.id);

        return {
          id: run.id,
          status: run.status,
          startedAt: run.created_at,
          finishedAt: run.updated_at,
          hits: hitCount || 0,
          query: run.query_text
        };
      })
    );

    console.log('Debug Runs API: Returning', runsWithHits.length, 'runs');
    return NextResponse.json({ rows: runsWithHits });

  } catch (error: unknown) {
    console.error('Debug Runs API: Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
});
