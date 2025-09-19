import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST() {
  try {
    const supabase = supabaseServer();
    
    // Disable RLS for query_runs and raw_hits tables
    const { error: queryRunsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE query_runs DISABLE ROW LEVEL SECURITY;'
    });
    
    const { error: rawHitsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE raw_hits DISABLE ROW LEVEL SECURITY;'
    });

    if (queryRunsError || rawHitsError) {
      return NextResponse.json({ 
        error: 'Failed to disable RLS', 
        queryRunsError, 
        rawHitsError 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'RLS disabled for query_runs and raw_hits' 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to execute SQL', 
      details: error.message 
    }, { status: 500 });
  }
}
