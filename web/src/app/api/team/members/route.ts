import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { resolveOrgContext } from '@/server/orgContext';

export async function GET(req: Request) {
  try {
    console.log('invites.clerk', JSON.stringify({ evt: 'members_start' }));
    
    // Get org context
    const ctx = await resolveOrgContext();
    
    if (!ctx.ok) {
      console.log('invites.clerk', JSON.stringify({ 
        evt: 'members_auth_failed', 
        reason: ctx.reason 
      }));
      
      return NextResponse.json({
        ok: false,
        error: { 
          code: ctx.reason === 'UNAUTHENTICATED' ? 'UNAUTHENTICATED' : 'AUTH_ERROR',
          message: ctx.reason === 'UNAUTHENTICATED' ? 'Not authenticated' : 'Authentication failed'
        }
      }, { status: 401 });
    }

    if (!ctx.orgId) {
      console.log('invites.clerk', JSON.stringify({ evt: 'members_no_org' }));
      
      return NextResponse.json({
        ok: false,
        error: { code: 'NO_ORG', message: 'No organization selected' }
      }, { status: 400 });
    }

    if (ctx.role !== 'admin' && ctx.role !== 'member') {
      console.log('invites.clerk', JSON.stringify({ 
        evt: 'members_forbidden', 
        role: ctx.role 
      }));
      
      return NextResponse.json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' }
      }, { status: 403 });
    }

    console.log('invites.clerk', JSON.stringify({
      evt: 'members_fetching',
      orgId: ctx.orgId,
      userId: ctx.userId
    }));

    // Fetch members from Clerk
    const memberships = await clerkClient.organizations.getOrganizationMembershipList({
      organizationId: ctx.orgId,
      limit: 100
    });

    const members = memberships.data.map(membership => ({
      membershipId: membership.id,
      email: membership.publicUserData?.identifier || '',
      name: membership.publicUserData?.firstName && membership.publicUserData?.lastName 
        ? `${membership.publicUserData.firstName} ${membership.publicUserData.lastName}`
        : membership.publicUserData?.firstName || membership.publicUserData?.identifier || '',
      imageUrl: membership.publicUserData?.imageUrl || null,
      role: membership.role,
      createdAt: membership.createdAt
    }));

    console.log('invites.clerk', JSON.stringify({
      evt: 'members_success',
      orgId: ctx.orgId,
      userId: ctx.userId,
      count: members.length
    }));

    return NextResponse.json({
      ok: true,
      data: { members }
    });

  } catch (error: any) {
    console.error('invites.clerk', JSON.stringify({
      evt: 'members_error',
      error: error.message,
      code: error?.errors?.[0]?.code,
      where: 'GET /api/team/members'
    }));

    return NextResponse.json({
      ok: false,
      error: { 
        code: error?.errors?.[0]?.code || 'CLERK_ERROR', 
        message: error?.errors?.[0]?.message || 'Failed to fetch members'
      }
    }, { status: 500 });
  }
}