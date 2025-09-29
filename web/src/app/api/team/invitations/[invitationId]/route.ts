import { NextResponse } from 'next/server';
import { resolveOrgContext } from '@/server/orgContext';
import { clerkClient } from '@clerk/nextjs/server';

export async function DELETE(
  req: Request,
  { params }: { params: { invitationId: string } }
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

    const { invitationId } = params;

    console.log('team.api', { evt: 'invites.revoke', invitationId });

    try {
      const client = await clerkClient();
      await client.organizations.revokeOrganizationInvitation({
        organizationId: ctx.orgId!,
        invitationId
      });

      console.log('team.api', { evt: 'invites.revoke', success: true });

      return NextResponse.json({
        ok: true
      });

    } catch (revokeError: any) {
      // Handle specific Clerk errors for invitation status
      if (revokeError?.status === 404) {
        console.log('team.api', { evt: 'invites.revoke.not_found', invitationId });
        return NextResponse.json({
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Invitation not found' }
        }, { status: 404 });
      }

      // Check if invite is not pending
      if (revokeError?.message?.includes('status') || revokeError?.message?.includes('accepted')) {
        console.log('team.api', { evt: 'invites.revoke.invalid_status', invitationId });
        return NextResponse.json({
          ok: false,
          error: { code: 'INVALID_STATUS', message: 'Can only cancel pending invitations' }
        }, { status: 409 });
      }

      throw revokeError;
    }

  } catch (error: any) {
    const clerkError = error?.errors?.[0];
    
    console.error('team.api', JSON.stringify({
      evt: 'invites.revoke.error',
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