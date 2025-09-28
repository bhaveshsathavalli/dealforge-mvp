import { NextResponse } from 'next/server';
import { resolveOrgContext, OrgContextError } from '@/server/orgContext';
import { supabaseAdmin } from '@/server/supabaseAdmin';

export async function GET(req: Request) {
  try {
    const context = await resolveOrgContext(req);
    
    // Get counts for all tables
    const { count: orgsCount, error: orgsError } = await supabaseAdmin
      .from('orgs')
      .select('*', { count: 'exact', head: true });

    const { count: profilesCount, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: membershipsCount, error: membershipsError } = await supabaseAdmin
      .from('org_memberships')
      .select('*', { count: 'exact', head: true });

    // Force the lazy mirror by checking current state
    const { data: profiles, error: profilesDataError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', context.clerkUserId);

    const { data: memberships, error: membershipsDataError } = await supabaseAdmin
      .from('org_memberships')
      .select('*')
      .eq('clerk_user_id', context.clerkUserId)
      .eq('clerk_org_id', context.clerkOrgId);

    const { data: team, error: teamError } = await supabaseAdmin
      .from('v_org_team')
      .select('*')
      .eq('clerk_org_id', context.clerkOrgId);

    const response = {
      ok: true,
      data: {
        clerkUserId: context.clerkUserId,
        clerkOrgId: context.clerkOrgId,
        role: context.role,
        counts: {
          orgs: orgsCount || 0,
          profiles: profilesCount || 0,
          org_memberships: membershipsCount || 0,
        },
        mirrored: {
          profiles: profiles?.length || 0,
          memberships: memberships?.length || 0,
          team: team?.length || 0,
        },
        errors: {
          orgs: orgsError?.message || null,
          profiles: profilesError?.message || null,
          memberships: membershipsError?.message || null,
          profilesData: profilesDataError?.message || null,
          membershipsData: membershipsDataError?.message || null,
          team: teamError?.message || null,
        }
      }
    };

    console.info('team.debug', JSON.stringify({
      evt: 'mirror_check',
      clerkUserId: context.clerkUserId,
      clerkOrgId: context.clerkOrgId,
      role: context.role,
      counts: response.data.counts,
      mirrored: response.data.mirrored
    }));

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof OrgContextError) {
      const status = error.code === 'UNAUTHENTICATED' ? 401 : 403;
      return NextResponse.json({
        ok: false,
        error: { code: error.code, message: error.message }
      }, { status });
    }
    
    console.error('team.debug', JSON.stringify({
      evt: 'mirror_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }));
    
    return NextResponse.json({
      ok: false,
      error: { code: 'INTERNAL', message: 'Mirror check failed' }
    }, { status: 500 });
  }
}
