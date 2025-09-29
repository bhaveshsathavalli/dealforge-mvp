import { NextResponse } from 'next/server';
import { resolveOrgContext } from '@/server/orgContext';
import { clerkClient } from '@clerk/nextjs/server';

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
      role: membership.role,
      createdAt: membership.createdAt
    }));

    console.log('team.api', { evt: 'members.list', count: members.length });

    return NextResponse.json({
      ok: true,
      data: { members }
    });

  } catch (error: any) {
    const clerkError = error?.errors?.[0];
    
    console.error('team.api', JSON.stringify({
      evt: 'members.error',
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