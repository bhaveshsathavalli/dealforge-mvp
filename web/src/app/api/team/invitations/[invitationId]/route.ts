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

    console.log('team.api', { evt: 'invites.revoke', invitationId, orgId: ctx.orgId });

    // Revoke invitation via Clerk
    const client = await clerkClient();
    await client.organizations.revokeOrganizationInvitation(invitationId);

    console.log('team.api', { evt: 'invites.revoke', success: true });

    return NextResponse.json({
      ok: true,
      data: { success: true }
    });

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