import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';

export async function DELETE(
  req: Request,
  { params }: { params: { invitationId: string } }
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

    const { invitationId } = params;

    console.info('team.api', JSON.stringify({
      route: 'DELETE /api/team/invitations/:invitationId',
      evt: 'start',
      orgId,
      userId,
      invitationId
    }));

    await clerkClient.organizations.revokeOrganizationInvitation(invitationId);

    console.info('team.api', JSON.stringify({
      route: 'DELETE /api/team/invitations/:invitationId',
      evt: 'success',
      orgId,
      userId,
      invitationId
    }));

    return NextResponse.json({
      ok: true,
      data: { success: true }
    });

  } catch (error: any) {
    const clerkError = error?.errors?.[0];
    
    console.error('team.api', JSON.stringify({
      route: 'DELETE /api/team/invitations/:invitationId',
      evt: 'error',
      orgId: (await auth()).orgId,
      userId: (await auth()).userId,
      invitationId: params.invitationId,
      code: clerkError?.code,
      message: clerkError?.message,
      raw: error.message
    }));

    return NextResponse.json({
      ok: false,
      error: { 
        code: clerkError?.code || 'CLERK_ERROR', 
        message: clerkError?.message || 'Failed to cancel invitation'
      }
    }, { status: 500 });
  }
}
