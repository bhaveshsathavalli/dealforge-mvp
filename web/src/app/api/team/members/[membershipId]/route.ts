import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';
import { resolveOrgContext } from '@/server/orgContext';

const updateRoleSchema = z.object({
  role: z.enum(['org:admin', 'org:member'])
});

export async function PATCH(
  req: Request,
  { params }: { params: { membershipId: string } }
) {
  try {
    console.log('invites.clerk', JSON.stringify({ 
      evt: 'member_update_start', 
      membershipId: params.membershipId 
    }));
    
    // Get org context
    const ctx = await resolveOrgContext();
    
    if (!ctx.ok) {
      return NextResponse.json({
        ok: false,
        error: { 
          code: ctx.reason === 'UNAUTHENTICATED' ? 'UNAUTHENTICATED' : 'AUTH_ERROR',
          message: ctx.reason === 'UNAUTHENTICATED' ? 'Not authenticated' : 'Authentication failed'
        }
      }, { status: 401 });
    }

    if (!ctx.orgId) {
      return NextResponse.json({
        ok: false,
        error: { code: 'NO_ORG', message: 'No organization selected' }
      }, { status: 400 });
    }

    if (ctx.role !== 'admin') {
      return NextResponse.json({
        ok: false,
        error: { code: 'ADMIN_REQUIRED', message: 'Admin access required' }
      }, { status: 403 });
    }

    const body = await req.json();
    const validation = updateRoleSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({
        ok: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid role', 
          details: validation.error.errors 
        }
      }, { status: 400 });
    }

    const { role } = validation.data;
    const { membershipId } = params;

    console.log('invites.clerk', JSON.stringify({
      evt: 'member_update_calling_clerk',
      orgId: ctx.orgId,
      userId: ctx.userId,
      membershipId,
      newRole: role
    }));

    await clerkClient.organizations.updateOrganizationMembership({
      organizationId: ctx.orgId,
      membershipId,
      role
    });

    console.log('invites.clerk', JSON.stringify({
      evt: 'member_update_success',
      orgId: ctx.orgId,
      userId: ctx.userId,
      membershipId,
      newRole: role
    }));

    return NextResponse.json({
      ok: true,
      data: { success: true }
    });

  } catch (error: any) {
    console.error('invites.clerk', JSON.stringify({
      evt: 'member_update_error',
      error: error.message,
      code: error?.errors?.[0]?.code,
      where: 'PATCH /api/team/members/[membershipId]',
      membershipId: params.membershipId
    }));

    return NextResponse.json({
      ok: false,
      error: { 
        code: error?.errors?.[0]?.code || 'CLERK_ERROR', 
        message: error?.errors?.[0]?.message || 'Failed to update member role'
      }
    }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { membershipId: string } }
) {
  try {
    console.log('invites.clerk', JSON.stringify({ 
      evt: 'member_delete_start', 
      membershipId: params.membershipId 
    }));
    
    // Get org context
    const ctx = await resolveOrgContext();
    
    if (!ctx.ok) {
      return NextResponse.json({
        ok: false,
        error: { 
          code: ctx.reason === 'UNAUTHENTICATED' ? 'UNAUTHENTICATED' : 'AUTH_ERROR',
          message: ctx.reason === 'UNAUTHENTICATED' ? 'Not authenticated' : 'Authentication failed'
        }
      }, { status: 401 });
    }

    if (!ctx.orgId) {
      return NextResponse.json({
        ok: false,
        error: { code: 'NO_ORG', message: 'No organization selected' }
      }, { status: 400 });
    }

    if (ctx.role !== 'admin') {
      return NextResponse.json({
        ok: false,
        error: { code: 'ADMIN_REQUIRED', message: 'Admin access required' }
      }, { status: 403 });
    }

    const { membershipId } = params;

    console.log('invites.clerk', JSON.stringify({
      evt: 'member_delete_calling_clerk',
      orgId: ctx.orgId,
      userId: ctx.userId,
      membershipId
    }));

    await clerkClient.organizations.deleteOrganizationMembership({
      organizationId: ctx.orgId,
      membershipId
    });

    console.log('invites.clerk', JSON.stringify({
      evt: 'member_delete_success',
      orgId: ctx.orgId,
      userId: ctx.userId,
      membershipId
    }));

    return NextResponse.json({
      ok: true,
      data: { success: true }
    });

  } catch (error: any) {
    console.error('invites.clerk', JSON.stringify({
      evt: 'member_delete_error',
      error: error.message,
      code: error?.errors?.[0]?.code,
      where: 'DELETE /api/team/members/[membershipId]',
      membershipId: params.membershipId
    }));

    return NextResponse.json({
      ok: false,
      error: { 
        code: error?.errors?.[0]?.code || 'CLERK_ERROR', 
        message: error?.errors?.[0]?.message || 'Failed to delete member'
      }
    }, { status: 500 });
  }
}