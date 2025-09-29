import { NextResponse } from 'next/server';
import { resolveOrgContext } from '@/server/orgContext';
import { clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'admin']).optional().default('member'),
});

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
        data: { invitations: [] }
      });
    }

    console.log('team.api', { evt: 'invites.list', orgId: ctx.orgId });

    // Get invitations from Clerk as single source of truth
    const client = await clerkClient();
    const invitations = await client.organizations.getOrganizationInvitationList({
      organizationId: ctx.orgId
    });

    const formattedInvitations = invitations.data.map(invitation => ({
      invitationId: invitation.id,
      email: invitation.emailAddress,
      role: invitation.role,
      status: invitation.status,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt
    }));

    console.log('team.api', { evt: 'invites.list', count: formattedInvitations.length });

    return NextResponse.json({
      ok: true,
      data: { invitations: formattedInvitations }
    });

  } catch (error: any) {
    const clerkError = error?.errors?.[0];
    
    console.error('team.api', JSON.stringify({
      evt: 'invites.error',
      code: clerkError?.code,
      message: clerkError?.message,
      raw: error.message
    }));

    return NextResponse.json({
      ok: false,
      error: { 
        code: clerkError?.code || 'CLERK_ERROR', 
        message: clerkError?.message || 'Failed to fetch invitations'
      }
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const validation = inviteSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors }
      }, { status: 400 });
    }

    const { email, role } = validation.data;

    // Map UI role to Clerk role
    const mappedRole = role === 'admin' ? 'org:admin' : 'org:member';

    console.log('team.api', { evt: 'invites.create', email, role, mappedRole, orgId: ctx.orgId });

    // Create invitation via Clerk
    const client = await clerkClient();
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId: ctx.orgId!,
      emailAddress: email,
      role: mappedRole,
    });

    console.log('team.api', { evt: 'invites.create', invitationId: invitation.id });

    return NextResponse.json({
      ok: true,
      data: { 
        invitation: {
          invitationId: invitation.id,
          email: invitation.emailAddress,
          role: invitation.role,
          status: invitation.status,
          createdAt: invitation.createdAt,
          updatedAt: invitation.updatedAt
        }
      }
    });

  } catch (error: any) {
    const clerkError = error?.errors?.[0];
    
    console.error('team.api', JSON.stringify({
      evt: 'invites.create.error',
      code: clerkError?.code,
      message: clerkError?.message,
      raw: error.message
    }));

    return NextResponse.json({
      ok: false,
      error: { 
        code: clerkError?.code || 'CLERK_ERROR', 
        message: clerkError?.message || 'Failed to create invitation'
      }
    }, { status: 500 });
  }
}