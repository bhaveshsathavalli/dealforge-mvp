import { NextResponse } from 'next/server';
import { withOrgId } from '@/server/withOrg';
import { supabaseServer } from '@/lib/supabaseServer';

export const GET = withOrgId(async ({ orgId, clerkUserId }) => {
  try {
    if (!orgId) {
      return NextResponse.json({
        ok: false,
        error: { code: 'NO_ORG', message: 'Organization not found' }
      }, { status: 401 });
    }

    const sb = supabaseServer();

    // Get counts
    const { count: allCount, error: allCountError } = await sb
      .from('competitors')
      .select('*', { count: 'exact', head: true });

    const { count: orgCount, error: orgCountError } = await sb
      .from('competitors')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    const { count: activeCount, error: activeCountError } = await sb
      .from('competitors')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('active', true);

    const { count: deletedCount, error: deletedCountError } = await sb
      .from('competitors')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('active', false);

    // Get recent competitors for this org
    const { data: recent, error: recentError } = await sb
      .from('competitors')
      .select('id, name, org_id, created_at, active')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (allCountError || orgCountError || activeCountError || deletedCountError || recentError) {
      return NextResponse.json({
        ok: false,
        error: { 
          code: 'DB_ERROR', 
          message: 'Failed to fetch competitor data',
          details: {
            allCountError: allCountError?.message,
            orgCountError: orgCountError?.message,
            activeCountError: activeCountError?.message,
            deletedCountError: deletedCountError?.message,
            recentError: recentError?.message
          }
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      counts: {
        all: allCount || 0,
        byOrg: orgCount || 0,
        active: activeCount || 0,
        deleted: deletedCount || 0
      },
      recent: recent || []
    });

  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: { 
        code: 'INTERNAL', 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
});


