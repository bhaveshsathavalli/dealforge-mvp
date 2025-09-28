import { NextResponse } from 'next/server';
import { withOrgId } from '@/server/withOrg';
import { supabaseServer } from '@/lib/supabaseServer';

export const GET = withOrgId(async ({ orgId, clerkOrgId }) => {
  try {
    if (!orgId) {
      return NextResponse.json({
        ok: false,
        error: { code: 'NO_ORG', message: 'Organization not found' }
      }, { status: 401 });
    }

    const sb = supabaseServer();

    // Get team members using the view
    const { data: team, error } = await sb
      .from('v_org_team')
      .select('clerk_user_id, email, name, role')
      .eq('clerk_org_id', clerkOrgId);

    if (error) {
      return NextResponse.json({
        ok: false,
        error: { code: 'DB_ERROR', message: error.message }
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      team: team || []
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