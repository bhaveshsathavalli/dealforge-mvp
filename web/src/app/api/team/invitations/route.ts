import { NextResponse } from 'next/server';
import { resolveOrgContext } from '@/server/orgContext';
import { clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';
import { UiRole, toClerkRole, fromClerkRole } from '@/server/roles';

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

    // Get invitations from Clerk - only pending invites
    const client = await clerkClient();
    const invitations = await client.organizations.getOrganizationInvitationList({
      organizationId: ctx.orgId!,
      limit: 100
    });

    // Filter and map pending invites only
    const pendingInvites = invitations.data
      .filter(invite => invite.status === 'pending')
      .map(invite => ({
        id: invite.id,
        email: invite.emailAddress,
        role: fromClerkRole(invite.role),
        status: invite.status,
        createdAt: invite.createdAt
      }));

    console.log('team.api', { evt: 'invites.list', pendingCount: pendingInvites.length });

    return NextResponse.json({
      ok: true,
      data: { invitations: pendingInvites }
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
    const clerkRole = toClerkRole(role as UiRole);

    console.log('team.api', { evt: 'invites.create', email, role, clerkRole });

    // Create invitation via Clerk
    const client = await clerkClient();
    await client.organizations.createOrganizationInvitation({
      organizationId: ctx.orgId!,
      emailAddress: email,
      role: clerkRole,
      inviterUserId: ctx.userId
    });

    console.log('team.api', { evt: 'invites.create', success: true });

    return NextResponse.json({
      ok: true
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