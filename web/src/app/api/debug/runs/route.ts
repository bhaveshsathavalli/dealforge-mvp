import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  console.log('Debug Runs API: GET /api/debug/runs called');
  
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('Debug Runs API: User not authenticated');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('Debug Runs API: User authenticated:', user.id);

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      console.log('Debug Runs API: No organization membership found');
      return NextResponse.json({ error: 'No organization membership' }, { status: 403 });
    }

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
      .eq('org_id', membership.org_id)
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
}
