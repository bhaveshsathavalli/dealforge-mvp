import { NextResponse } from 'next/server';
import { resolveOrgContext, OrgContextError } from '@/server/orgContext';
import { supabaseAdmin } from '@/server/supabaseAdmin';

export async function GET(req: Request) {
  try {
    const context = await resolveOrgContext(req);
    
    // Admin-only endpoint
    if (context.role !== 'admin') {
      return NextResponse.json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }, { status: 403 });
    }
    
    // Get team members from v_org_team
    const { data: team, error } = await supabaseAdmin
      .from('v_org_team')
      .select('clerk_user_id, email, name, role')
      .eq('clerk_org_id', context.clerkOrgId);
    
    if (error) {
      console.error('team.debug', JSON.stringify({
        evt: 'team_debug_error',
        clerkOrgId: context.clerkOrgId,
        error: error.message
      }));
      
      return NextResponse.json({
        ok: false,
        error: { code: 'DB_ERROR', message: 'Failed to fetch team data' }
      }, { status: 500 });
    }
    
    console.info('team.debug', JSON.stringify({
      evt: 'team_debug',
      clerkOrgId: context.clerkOrgId,
      count: team?.length || 0
    }));
    
    return NextResponse.json({
      ok: true,
      data: {
        team: team || []
      }
    });
  } catch (error) {
    if (error instanceof OrgContextError) {
      const status = error.code === 'UNAUTHENTICATED' ? 401 : 403;
      return NextResponse.json({
        ok: false,
        error: { code: error.code, message: error.message }
      }, { status });
    }
    
    console.error('team.debug', JSON.stringify({
      evt: 'team_debug_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }));
    
    return NextResponse.json({
      ok: false,
      error: { code: 'INTERNAL', message: 'Internal server error' }
    }, { status: 500 });
  }
}


