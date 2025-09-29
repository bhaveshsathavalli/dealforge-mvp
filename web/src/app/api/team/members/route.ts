import { NextResponse } from 'next/server';
import { resolveOrgContext } from '@/server/orgContext';
import { clerkClient } from '@clerk/nextjs/server';
import { fromClerkRole } from '@/server/roles';

export async function GET(req: Request) {
  const url = new URL(req.url);
  
  console.log('team.api', JSON.stringify({
    evt: 'enter',
    method: 'GET',
    url: '/api/team/members',
    pathname: url.pathname
  }));

  try {
    const ctx = await resolveOrgContext();
    
    if (!ctx.ok) {
      console.log('team.api', JSON.stringify({
        evt: 'result',
        method: 'GET',
        status: 401,
        payloadKeys: ['ok', 'error'],
        authError: ctx.reason
      }));
      
      return NextResponse.json({
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' }
      }, { status: 401 });
    }

    if (!ctx.orgId) {
      console.log('team.api', JSON.stringify({
        evt: 'result',
        method: 'GET',
        status: 200,
        payloadKeys: ['ok', 'data'],
        noOrg: true
      }));
      
      return NextResponse.json({
        ok: true,
        data: { members: [] }
      });
    }

    console.log('team.api', { evt: 'members.list', orgId: ctx.orgId, userId: ctx.userId });

    // Get members from Clerk as single source of truth
    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: ctx.orgId,
      limit: 100
    });

    const members = memberships.data.map(membership => ({
      membershipId: membership.id,
      userId: membership.publicUserData?.userId,
      email: membership.publicUserData?.identifier || membership.publicUserData?.emailAddress || '',
      name: membership.publicUserData?.firstName && membership.publicUserData?.lastName 
        ? `${membership.publicUserData.firstName} ${membership.publicUserData.lastName}`
        : membership.publicUserData?.firstName || membership.publicUserData?.identifier || '',
      imageUrl: membership.publicUserData?.imageUrl || null,
      role: fromClerkRole(membership.role),
      createdAt: membership.createdAt
    }));

    console.log('team.api', JSON.stringify({
      evt: 'result',
      method: 'GET',
      status: 200,
      payloadKeys: ['ok', 'data'],
      memberCount: members.length
    }));

    return NextResponse.json({
      ok: true,
      data: { members }
    }, { status: 200 });

  } catch (error: any) {
    const clerkError = error?.errors?.[0];
    
    console.error('team.api', JSON.stringify({
      evt: 'result',
      method: 'GET',
      status: 500,
      payloadKeys: ['ok', 'error'],
      clerkError: clerkError?.code,
      message: clerkError?.message,
      rawError: error.message
    }));

    return NextResponse.json({
      ok: false,
      error: { 
        code: clerkError?.code || 'CLERK_ERROR', 
        message: clerkError?.message || 'Failed to fetch members'
      }
    }, { status: 500 });
  }
}