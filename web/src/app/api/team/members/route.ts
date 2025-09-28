import { NextResponse } from 'next/server';
import { resolveOrgContext } from '@/server/orgContext';
import { supabaseAdmin } from '@/server/supabaseAdmin';

export async function GET() {
  try {
    const ctx = await resolveOrgContext();
    
    if (!ctx.ok) {
      return NextResponse.json({
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' }
      }, { status: 401 });
    }

    if (!ctx.orgId) {
      return NextResponse.json({
        ok: true,
        data: { members: [] }
      });
    }

    console.info('team.members', JSON.stringify({
      evt: 'start',
      orgId: ctx.orgId,
      userId: ctx.userId
    }));

    try {
      // Query Supabase view v_org_team filtered by clerk_org_id
      const { data: members, error } = await supabaseAdmin
        .from('v_org_team')
        .select('*')
        .eq('clerk_org_id', ctx.orgId);

      if (error) {
        console.error('team.members', JSON.stringify({
          evt: 'db_error',
          orgId: ctx.orgId,
          error: error.message
        }));

        return NextResponse.json({
          ok: false,
          error: { code: 'DB_ERROR', message: error.message }
        }, { status: 500 });
      }

      console.info('team.members', JSON.stringify({
        evt: 'success',
        orgId: ctx.orgId,
        userId: ctx.userId,
        count: members?.length || 0
      }));

      return NextResponse.json({
        ok: true,
        data: { members: members || [] }
      });

    } catch (dbError: any) {
      console.error('team.members', JSON.stringify({
        evt: 'db_exception',
        orgId: ctx.orgId,
        error: dbError.message
      }));

      return NextResponse.json({
        ok: false,
        error: { code: 'DB_ERROR', message: dbError.message }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('team.members', JSON.stringify({
      evt: 'fatal',
      error: error.message
    }));

    return NextResponse.json({
      ok: false,
      error: { 
        code: 'FATAL_ERROR', 
        message: 'Failed to fetch members'
      }
    }, { status: 500 });
  }
}