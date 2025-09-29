import { NextResponse } from 'next/server';
import { resolveOrgContext } from '@/server/orgContext';
import { clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';

const updateRoleSchema = z.object({
  role: z.enum(['member', 'admin'])
});

export async function PATCH(
  req: Request,
  { params }: { params: { membershipId: string } }
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

    const body = await req.json();
    const validation = updateRoleSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid role', details: validation.error.errors }
      }, { status: 400 });
    }

    const { membershipId } = params;
    const { role } = validation.data;

    // Map UI role to Clerk role
    const mappedRole = role === 'admin' ? 'org:admin' : 'org:member';

    console.log('team.api', { evt: 'member.role.change', membershipId, role, mappedRole });

    // Update member role via Clerk
    const client = await clerkClient();
    await client.organizations.updateOrganizationMembership(membershipId, { role: mappedRole });

    console.log('team.api', { evt: 'member.role.change', success: true });

    return NextResponse.json({
      ok: true,
      data: { success: true }
    });

  } catch (error: any) {
    const clerkError = error?.errors?.[0];
    
    console.error('team.api', JSON.stringify({
      evt: 'member.role.change.error',
      membershipId: params.membershipId,
      code: clerkError?.code,
      message: clerkError?.message,
      raw: error.message
    }));

    return NextResponse.json({
      ok: false,
      error: { 
        code: clerkError?.code || 'CLERK_ERROR', 
        message: clerkError?.message || 'Failed to update member role'
      }
    }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { membershipId: string } }
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

    const { membershipId } = params;

    console.log('team.api', { evt: 'member.remove', membershipId });

    // Remove member via Clerk
    const client = await clerkClient();
    await client.organizations.deleteOrganizationMembership(membershipId);

    console.log('team.api', { evt: 'member.remove', success: true });

    return NextResponse.json({
      ok: true,
      data: { success: true }
    });

  } catch (error: any) {
    const clerkError = error?.errors?.[0];
    
    console.error('team.api', JSON.stringify({
      evt: 'member.remove.error',
      membershipId: params.membershipId,
      code: clerkError?.code,
      message: clerkError?.message,
      raw: error.message
    }));

    return NextResponse.json({
      ok: false,
      error: { 
        code: clerkError?.code || 'CLERK_ERROR', 
        message: clerkError?.message || 'Failed to remove member'
      }
    }, { status: 500 });
  }
}