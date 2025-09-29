import { NextResponse } from 'next/server';
import { resolveOrgContext } from '@/server/orgContext';
import { clerkClient } from '@clerk/nextjs/server';
import { toClerkRole } from '@/server/roles';

export async function PATCH(
  req: Request,
  { params }: { params: { membershipId: string } }
) {
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
        ok: false,
        error: { code: 'NO_ORG', message: 'No organization selected' }
      }, { status: 400 });
    }

    // Require admin role
    if (ctx.role !== 'admin') {
      return NextResponse.json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }, { status: 403 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json({
        ok: false,
        error: { code: 'BAD_BODY', message: 'Invalid JSON body' }
      }, { status: 400 });
    }

    const { role } = body;
    
    // Validate role
    if (!role || !['member', 'admin'].includes(role)) {
      return NextResponse.json({
        ok: false,
        error: { code: 'INVALID_ROLE', message: 'Role must be "member" or "admin"' }
      }, { status: 400 });
    }

    const clerkRole = toClerkRole(role);

    console.log('team.api', { evt: 'member.role.change', membershipId: params.membershipId, role, clerkRole });

    const client = await clerkClient();
    await client.organizations.updateOrganizationMembership({
      organizationId: ctx.orgId!,
      membershipId: params.membershipId,
      role: clerkRole,
    });

    console.log('team.api', { evt: 'member.role.change', success: true });

    return NextResponse.json({ ok: true }, { status: 200 });

  } catch (error: any) {
    const clerkError = error?.errors?.[0];
    
    console.error('team.api', JSON.stringify({
      evt: 'member.role.change.error',
      membershipId: params.membershipId,
      code: clerkError?.code,
      message: clerkError?.message,
      raw: error.message
    }));

    return NextResponse.json({
      ok: false,
      error: { 
        code: clerkError?.code || 'CLERK_ERROR', 
        message: clerkError?.message || 'Failed to update member role'
      }
    }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { membershipId: string } }
) {
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
        ok: false,
        error: { code: 'NO_ORG', message: 'No organization selected' }
      }, { status: 400 });
    }

    // Require admin role
    if (ctx.role !== 'admin') {
      return NextResponse.json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }, { status: 403 });
    }

    console.log('team.api', { evt: 'member.remove', membershipId: params.membershipId });

    const client = await clerkClient();
    
    // Check if this is the last admin before removing
    const list = await client.organizations.getOrganizationMembershipList({
      organizationId: ctx.orgId!,
      limit: 100
    });
    
    const adminCount = list.data.filter(m => ['admin','org:admin'].includes(m.role)).length;
    const target = list.data.find(m => m.id === params.membershipId);
    const targetIsAdmin = ['admin','org:admin'].includes(target?.role || '');
    
    if (targetIsAdmin && adminCount <= 1) {
      console.log('team.api', { evt: 'member.remove.last_admin', membershipId: params.membershipId });
      return NextResponse.json({
        ok: false,
        error: { code: 'LAST_ADMIN', message: 'Cannot remove the last admin' }
      }, { status: 409 });
    }

    await client.organizations.deleteOrganizationMembership({
      organizationId: ctx.orgId!,
      membershipId: params.membershipId,
    });

    console.log('team.api', { evt: 'member.remove', success: true });

    return NextResponse.json({ ok: true }, { status: 200 });

  } catch (error: any) {
    const clerkError = error?.errors?.[0];
    
    console.error('team.api', JSON.stringify({
      evt: 'member.remove.error',
      membershipId: params.membershipId,
      code: clerkError?.code,
      message: clerkError?.message,
      raw: error.message
    }));

    return NextResponse.json({
      ok: false,
      error: { 
        code: clerkError?.code || 'CLERK_ERROR', 
        message: clerkError?.message || 'Failed to remove member'
      }
    }, { status: 500 });
  }
}