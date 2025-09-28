import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';

export async function GET(req: Request) {
  try {
    const { userId, orgId } = await auth();
    
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

    console.info('team.api', JSON.stringify({
      route: 'GET /api/team/members',
      evt: 'start',
      orgId,
      userId
    }));

    const memberships = await clerkClient.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100
    });

    const members = memberships.data.map(membership => ({
      membershipId: membership.id, // FIX: Use membershipId for consistency
      email: membership.publicUserData?.identifier || '',
      name: membership.publicUserData?.firstName && membership.publicUserData?.lastName 
        ? `${membership.publicUserData.firstName} ${membership.publicUserData.lastName}`
        : membership.publicUserData?.firstName || membership.publicUserData?.identifier || '',
      imageUrl: membership.publicUserData?.imageUrl || null,
      role: membership.role,
      createdAt: membership.createdAt
    }));

    console.info('team.api', JSON.stringify({
      route: 'GET /api/team/members',
      evt: 'success',
      orgId,
      userId,
      count: members.length
    }));

    return NextResponse.json({
      ok: true,
      data: { members }
    });

  } catch (error: any) {
    const clerkError = error?.errors?.[0];
    
    console.error('team.api', JSON.stringify({
      route: 'GET /api/team/members',
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
        message: clerkError?.message || 'Failed to fetch members'
      }
    }, { status: 500 });
  }
}