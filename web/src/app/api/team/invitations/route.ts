import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';
import { resolveOrgContext } from '@/server/orgContext';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'admin']).optional().default('member'),
});

export async function GET(req: Request) {
  try {
    console.log('invites.clerk', JSON.stringify({ evt: 'invitations_list_start' }));
    
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

    console.log('invites.clerk', JSON.stringify({
      evt: 'invitations_list_fetching',
      orgId: ctx.orgId,
      userId: ctx.userId
    }));

    const invitations = await clerkClient.organizations.getOrganizationInvitationList({
      organizationId: ctx.orgId
    });

    const formattedInvitations = invitations.data.map(invitation => ({
      id: invitation.id,
      emailAddress: invitation.emailAddress,
      role: invitation.role,
      status: invitation.status,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt
    }));

    console.log('invites.clerk', JSON.stringify({
      evt: 'invitations_list_success',
      orgId: ctx.orgId,
      userId: ctx.userId,
      count: formattedInvitations.length
    }));

    return NextResponse.json({
      ok: true,
      data: { invitations: formattedInvitations }
    });

  } catch (error: any) {
    console.error('invites.clerk', JSON.stringify({
      evt: 'invitations_list_error',
      error: error.message,
      code: error?.errors?.[0]?.code,
      where: 'GET /api/team/invitations'
    }));

    return NextResponse.json({
      ok: false,
      error: { 
        code: error?.errors?.[0]?.code || 'CLERK_ERROR', 
        message: error?.errors?.[0]?.message || 'Failed to fetch invitations'
      }
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    console.log('invites.clerk', JSON.stringify({ evt: 'invite_create_start' }));
    
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
    const validation = inviteSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({
        ok: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid input', 
          details: validation.error.errors 
        }
      }, { status: 400 });
    }

    const { email, role } = validation.data;

    console.log('invites.clerk', JSON.stringify({
      evt: 'invite_create_calling_clerk',
      orgId: ctx.orgId,
      userId: ctx.userId,
      email,
      role
    }));

    const invitation = await clerkClient.organizations.createOrganizationInvitation({
      organizationId: ctx.orgId,
      emailAddress: email,
      role: role === 'admin' ? 'org:admin' : 'org:member'
    });

    console.log('invites.clerk', JSON.stringify({
      evt: 'invite_create_success',
      orgId: ctx.orgId,
      userId: ctx.userId,
      email,
      role,
      invitationId: invitation.id
    }));

    return NextResponse.json({
      ok: true,
      data: { 
        invitationId: invitation.id,
        email: invitation.emailAddress,
        role: invitation.role
      }
    });

  } catch (error: any) {
    console.error('invites.clerk', JSON.stringify({
      evt: 'invite_create_error',
      error: error.message,
      code: error?.errors?.[0]?.code,
      where: 'POST /api/team/invitations'
    }));

    return NextResponse.json({
      ok: false,
      error: { 
        code: error?.errors?.[0]?.code || 'CLERK_ERROR', 
        message: error?.errors?.[0]?.message || 'Failed to create invitation'
      }
    }, { status: 500 });
  }
}