import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['org:member', 'org:admin']).optional().default('org:member'),
});

export async function GET(req: Request) {
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

    console.info('team.api', JSON.stringify({
      route: 'GET /api/team/invitations',
      evt: 'start',
      orgId,
      userId
    }));

    const invitations = await clerkClient.organizations.getOrganizationInvitationList({
      organizationId: orgId
    });

    const formattedInvitations = invitations.data.map(invitation => ({
      id: invitation.id,
      emailAddress: invitation.emailAddress,
      role: invitation.role,
      status: invitation.status,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt
    }));

    console.info('team.api', JSON.stringify({
      route: 'GET /api/team/invitations',
      evt: 'success',
      orgId,
      userId,
      count: formattedInvitations.length
    }));

    return NextResponse.json({
      ok: true,
      data: { invitations: formattedInvitations }
    });

  } catch (error: any) {
    const clerkError = error?.errors?.[0];
    
    console.error('team.api', JSON.stringify({
      route: 'GET /api/team/invitations',
      evt: 'error',
      orgId: (await auth()).orgId,
      userId: (await auth()).userId,
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
    const validation = inviteSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors }
      }, { status: 400 });
    }

    const { email, role } = validation.data;

    console.info('team.api', JSON.stringify({
      route: 'POST /api/team/invitations',
      evt: 'start',
      orgId,
      userId,
      email,
      role
    }));

    const invitation = await clerkClient.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: email,
      role
    });

    console.info('team.api', JSON.stringify({
      route: 'POST /api/team/invitations',
      evt: 'success',
      orgId,
      userId,
      email,
      role,
      invitationId: invitation.id
    }));

    return NextResponse.json({
      ok: true,
      data: { 
        invitation: {
          id: invitation.id,
          emailAddress: invitation.emailAddress,
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
      route: 'POST /api/team/invitations',
      evt: 'error',
      orgId: (await auth()).orgId,
      userId: (await auth()).userId,
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