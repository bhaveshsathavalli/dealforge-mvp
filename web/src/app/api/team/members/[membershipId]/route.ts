import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';

const updateRoleSchema = z.object({
  role: z.enum(['org:admin', 'org:member'])
});

export async function PATCH(
  req: Request,
  { params }: { params: { membershipId: string } }
) {
  try {
    const { userId, orgId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json({
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' }
      }, { status: 401 });
    }

    if (!orgId) {
      return NextResponse.json({
        ok: false,
        error: { code: 'NO_ORG', message: 'No organization selected' }
      }, { status: 400 });
    }

    // Check if user is admin - FIX: Use proper role resolution
    let userRole = sessionClaims?.org_role as string;
    if (!userRole) {
      const memberships = await clerkClient.organizations.getOrganizationMembershipList({
        organizationId: orgId,
        limit: 100
      });
      const me = memberships.data.find(m => m.publicUserData?.userId === userId);
      userRole = me?.role || null;
    }
    
    if (userRole !== 'org:admin' && userRole !== 'admin') {
      return NextResponse.json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }, { status: 403 });
    }

    const body = await req.json();
    const validation = updateRoleSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid role', details: validation.error.errors }
      }, { status: 400 });
    }

    const { role } = validation.data;
    const { membershipId } = params;

    console.info('team.api', JSON.stringify({
      route: 'PATCH /api/team/members/:membershipId',
      evt: 'start',
      orgId,
      userId,
      membershipId,
      newRole: role
    }));

    await clerkClient.organizations.updateOrganizationMembership(membershipId, { role });

    console.info('team.api', JSON.stringify({
      route: 'PATCH /api/team/members/:membershipId',
      evt: 'success',
      orgId,
      userId,
      membershipId,
      newRole: role
    }));

    return NextResponse.json({
      ok: true,
      data: { success: true }
    });

  } catch (error: any) {
    const clerkError = error?.errors?.[0];
    
    console.error('team.api', JSON.stringify({
      route: 'PATCH /api/team/members/:membershipId',
      evt: 'error',
      orgId: (await auth()).orgId,
      userId: (await auth()).userId,
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
    const { userId, orgId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json({
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' }
      }, { status: 401 });
    }

    if (!orgId) {
      return NextResponse.json({
        ok: false,
        error: { code: 'NO_ORG', message: 'No organization selected' }
      }, { status: 400 });
    }

    // Check if user is admin - FIX: Use proper role resolution
    let userRole = sessionClaims?.org_role as string;
    if (!userRole) {
      const memberships = await clerkClient.organizations.getOrganizationMembershipList({
        organizationId: orgId,
        limit: 100
      });
      const me = memberships.data.find(m => m.publicUserData?.userId === userId);
      userRole = me?.role || null;
    }
    
    if (userRole !== 'org:admin' && userRole !== 'admin') {
      return NextResponse.json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }, { status: 403 });
    }

    const { membershipId } = params;

    console.info('team.api', JSON.stringify({
      route: 'DELETE /api/team/members/:membershipId',
      evt: 'start',
      orgId,
      userId,
      membershipId
    }));

    await clerkClient.organizations.deleteOrganizationMembership(membershipId);

    console.info('team.api', JSON.stringify({
      route: 'DELETE /api/team/members/:membershipId',
      evt: 'success',
      orgId,
      userId,
      membershipId
    }));

    return NextResponse.json({
      ok: true,
      data: { success: true }
    });

  } catch (error: any) {
    const clerkError = error?.errors?.[0];
    
    console.error('team.api', JSON.stringify({
      route: 'DELETE /api/team/members/:membershipId',
      evt: 'error',
      orgId: (await auth()).orgId,
      userId: (await auth()).userId,
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
