import { NextResponse } from 'next/server';
import { withOrgId } from '@/server/withOrg';
import { supabaseServer } from '@/lib/supabaseServer';

export const POST = withOrgId(async ({ orgId, clerkOrgId, role }, req: Request) => {
  try {
    if (role !== 'admin') {
      return NextResponse.json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }, { status: 403 });
    }

    const { targetUserId, role: newRole } = await req.json();
    
    if (!targetUserId || !newRole || !['admin', 'member'].includes(newRole)) {
      return NextResponse.json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'Valid targetUserId and role are required' }
      }, { status: 400 });
    }

    const sb = supabaseServer();

    // Update role in org_memberships
    const { error } = await sb
      .from('org_memberships')
      .update({ role: newRole })
      .eq('clerk_org_id', clerkOrgId)
      .eq('clerk_user_id', targetUserId);

    if (error) {
      return NextResponse.json({
        ok: false,
        error: { code: 'DB_ERROR', message: error.message }
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: 'Role updated successfully'
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