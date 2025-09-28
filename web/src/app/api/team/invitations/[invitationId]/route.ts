import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { resolveOrgContext } from '@/server/orgContext';

export async function DELETE(
  req: Request,
  { params }: { params: { invitationId: string } }
) {
  try {
    console.log('invites.clerk', JSON.stringify({ 
      evt: 'invite_revoke_start', 
      invitationId: params.invitationId 
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

    const { invitationId } = params;

    console.log('invites.clerk', JSON.stringify({
      evt: 'invite_revoke_calling_clerk',
      orgId: ctx.orgId,
      userId: ctx.userId,
      invitationId
    }));

    await clerkClient.organizations.revokeOrganizationInvitation({
      organizationId: ctx.orgId,
      invitationId
    });

    console.log('invites.clerk', JSON.stringify({
      evt: 'invite_revoke_success',
      orgId: ctx.orgId,
      userId: ctx.userId,
      invitationId
    }));

    return NextResponse.json({
      ok: true,
      data: { success: true }
    });

  } catch (error: any) {
    console.error('invites.clerk', JSON.stringify({
      evt: 'invite_revoke_error',
      error: error.message,
      code: error?.errors?.[0]?.code,
      where: 'DELETE /api/team/invitations/[invitationId]',
      invitationId: params.invitationId
    }));

    return NextResponse.json({
      ok: false,
      error: { 
        code: error?.errors?.[0]?.code || 'CLERK_ERROR', 
        message: error?.errors?.[0]?.message || 'Failed to cancel invitation'
      }
    }, { status: 500 });
  }
}