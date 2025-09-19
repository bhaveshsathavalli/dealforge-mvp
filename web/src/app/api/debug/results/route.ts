import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const runId = url.searchParams.get('id');
  
  if (!runId) {
    return NextResponse.json({ error: 'Missing runId parameter' }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    // Get claim count
    const { count: claimCount } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .eq('run_id', runId);

    // Get citation count
    const { count: citationCount } = await supabase
      .from('citations')
      .select('*', { count: 'exact', head: true })
      .eq('run_id', runId);

    // Get evidence count
    const { count: evidenceCount } = await supabase
      .from('evidence')
      .select('*', { count: 'exact', head: true })
      .eq('run_id', runId);

    return NextResponse.json({
      haveClaims: (claimCount || 0) > 0,
      claimCount: claimCount || 0,
      citationCount: citationCount || 0,
      evidenceCount: evidenceCount || 0,
    });

  } catch (error: unknown) {
    return NextResponse.json({ 
      error: 'Failed to fetch results data',
      details: error instanceof Error ? error.message : 'Unknown error',
      note: 'This may be because the database tables do not exist yet'
    }, { status: 500 });
  }
}
