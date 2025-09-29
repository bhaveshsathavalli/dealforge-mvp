import { NextResponse } from 'next/server';
import { resolveOrgContext } from '@/server/orgContext';
import { clerkClient } from '@clerk/nextjs/server';
import { toClerkRole } from '@/server/roles';

export async function PATCH(
  req: Request,
  { params }: { params: { membershipId: string } }
) {
  const membershipId = params.membershipId;
  const url = new URL(req.url);
  
  console.log('team.api', JSON.stringify({
    evt: 'enter',
    method: 'PATCH',
    membershipId: membershipId,
    params: {...params},
    url: url.pathname,
    bodyPresent: req.body ? 'yes' : 'no'
  }));

  try {
    const ctx = await resolveOrgContext();
    
    if (!ctx.ok) {
      const result = {
        evt: 'result',
        method: 'PATCH',
        status: 401,
        payloadKeys: ['ok', 'error'],
        authError: ctx.reason
      };
      console.log('team.api', JSON.stringify(result));
      
      return NextResponse.json({
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' }
      }, { status: 401 });
    }

    if (!ctx.orgId) {
      const result = {
        evt: 'result',
        method: 'PATCH',
        status: 400,
        payloadKeys: ['ok', 'error'],
        error: 'NO_ORG'
      };
      console.log('team.api', JSON.stringify(result));
      
      return NextResponse.json({
        ok: false,
        error: { code: 'NO_ORG', message: 'No organization selected' }
      }, { status: 400 });
    }

    // Require admin role
    if (ctx.role !== 'admin') {
      const result = {
        evt: 'result',
        method: 'PATCH',
        status: 403,
        payloadKeys: ['ok', 'error'],
        role: ctx.role
      };
      console.log('team.api', JSON.stringify(result));
      
      return NextResponse.json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      const result = {
        evt: 'result',
        method: 'PATCH',
        status: 400,
        payloadKeys: ['ok', 'error'],
        parseError: 'BAD_BODY'
      };
      console.log('team.api', JSON.stringify(result));
      
      return NextResponse.json({ 
        ok: false, 
        error: { code: 'BAD_BODY', message: 'Invalid JSON' }
      }, { status: 400 });
    }

    const { role } = body as { role?: string };
    
    // Validate role
    if (!role || !['member', 'admin'].includes(role)) {
      const result = {
        evt: 'result',
        method: 'PATCH',
        status: 400,
        payloadKeys: ['ok', 'error'],
        invalidRole: role
      };
      console.log('team.api', JSON.stringify(result));
      
      return NextResponse.json({
        ok: false,
        error: { code: 'INVALID_ROLE', message: 'role must be member | admin' }
      }, { status: 400 });
    }

    const clerkRole = toClerkRole(role as 'admin' | 'member');

    console.log('team.api', JSON.stringify({
      evt: 'role_change_start',
      membershipId: membershipId,
      uiRole: role,
      clerkRole: clerkRole
    }));

    const client = await clerkClient();
    console.log('team.api', JSON.stringify({
      evt: 'client_created',
      clientType: typeof client,
      hasOrganizations: !!client.organizations,
      organizationsMethods: client.organizations ? Object.keys(client.organizations) : 'none'
    }));
    
    // Check if this is the last admin before changing
    if (role === 'member') {
      const list = await client.organizations.getOrganizationMembershipList({
        organizationId: ctx.orgId!,
        limit: 200
      });
      
      const adminCount = list.data.filter(m => ['admin','org:admin'].includes(m.role)).length;
      const target = list.data.find(m => m.id === membershipId);
      const targetIsAdmin = ['admin','org:admin'].includes(target?.role || '');
      
      if (targetIsAdmin && adminCount <= 1) {
        const result = {
          evt: 'result',
          method: 'PATCH',
          status: 409,
          payloadKeys: ['ok', 'error'],
          error: 'LAST_ADMIN',
          adminCount: adminCount
        };
        console.log('team.api', JSON.stringify(result));
        
        return NextResponse.json(
          { ok: false, error: { code: 'LAST_ADMIN', message: 'Cannot remove privileges from the last admin.' }},
          { status: 409 }
        );
      }
    }

    // Use the correct Clerk SDK method signature per tests
    console.log('team.api', JSON.stringify({
      evt: 'about_to_call_update',
      membershipId,
      clerkRole,
      methodExists: typeof client.organizations.updateOrganizationMembership === 'function'
    }));
    
    try {
      const updateResult = await client.organizations.updateOrganizationMembership({
        organizationId: ctx.orgId!,
        organizationMembershipId: membershipId,
        role: clerkRole,
      });
      
      console.log('team.api', JSON.stringify({
        evt: 'update_organization_membership_success',
        updateResult: !!updateResult
      }));
    } catch (updateError: any) {
      console.error('team.api', JSON.stringify({
        evt: 'update_organization_membership_error',
        error: updateError.message,
        code: updateError?.code,
        clerkErrors: updateError?.errors,
        status: updateError?.status,
        membershipId,
        clerkRole
      }));
      throw updateError;
    }

    const successResult = {
      evt: 'result',
      method: 'PATCH',
      status: 200,
      payloadKeys: ['ok'],
      success: true
    };
    console.log('team.api', JSON.stringify(successResult));

    return NextResponse.json({ ok: true }, { status: 200 });

  } catch (error: any) {
    const clerkError = error?.errors?.[0];
    
    const errorResult = {
      evt: 'result',
      method: 'PATCH',
      status: 500,
      payloadKeys: ['ok', 'error'],
      clerkError: clerkError?.code,
      message: clerkError?.message,
      rawError: error.message
    };
    console.error('team.api', JSON.stringify(errorResult));

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
  _req: Request,
  { params }: { params: { membershipId: string } }
) {
  const membershipId = params.membershipId;
  const url = new URL(_req.url);
  
  console.log('team.api', JSON.stringify({
    evt: 'enter',
    method: 'DELETE',
    membershipId: membershipId,
    params: {...params},
    url: url.pathname,
    bodyPresent: 'no' // DELETE should never have body
  }));

  try {
    const ctx = await resolveOrgContext();
    
    if (!ctx.ok) {
      const result = {
        evt: 'result',
        method: 'DELETE',
        status: 401,
        payloadKeys: ['ok', 'error'],
        authError: ctx.reason
      };
      console.log('team.api', JSON.stringify(result));
      
      return NextResponse.json({
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' }
      }, { status: 401 });
    }

    if (!ctx.orgId) {
      const result = {
        evt: 'result',
        method: 'DELETE',
        status: 400,
        payloadKeys: ['ok', 'error'],
        error: 'NO_ORG'
      };
      console.log('team.api', JSON.stringify(result));
      
      return NextResponse.json({
        ok: false,
        error: { code: 'NO_ORG', message: 'No organization selected' }
      }, { status: 400 });
    }

    // Require admin role
    if (ctx.role !== 'admin') {
      const result = {
        evt: 'result',
        method: 'DELETE',
        status: 403,
        payloadKeys: ['ok', 'error'],
        role: ctx.role
      };
      console.log('team.api', JSON.stringify(result));
      
      return NextResponse.json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }, { status: 403 });
    }

    console.log('team.api', JSON.stringify({
      evt: 'remove_check_start',
      membershipId: membershipId
    }));

    const client = await clerkClient();
    
    // Check if this is the last admin before removing
    const list = await client.organizations.getOrganizationMembershipList({
      organizationId: ctx.orgId!,
      limit: 200
    });
    
    const adminCount = list.data.filter(m => ['admin','org:admin'].includes(m.role)).length;
    const target = list.data.find(m => m.id === membershipId);
    const targetIsAdmin = ['admin','org:admin'].includes(target?.role || '');
    
    if (targetIsAdmin && adminCount <= 1) {
      const lastAdminResult = {
        evt: 'result',
        method: 'DELETE',
        status: 409,
        payloadKeys: ['ok', 'error'],
        error: 'LAST_ADMIN',
        adminCount: adminCount
      };
      console.log('team.api', JSON.stringify(lastAdminResult));
      
      return NextResponse.json({
        ok: false,
        error: { code: 'LAST_ADMIN', message: "Cannot remove the last admin" }
      }, { status: 409 });
    }

    // Use the correct Clerk SDK method
    console.log('team.api', JSON.stringify({
      evt: 'about_to_call_delete',
      membershipId,
      methodExists: typeof client.organizations.deleteOrganizationMembership === 'function'
    }));
    
    try {
      const deleteResult = await client.organizations.deleteOrganizationMembership({
        organizationId: ctx.orgId!,
        organizationMembershipId: membershipId,
      });
      
      console.log('team.api', JSON.stringify({
        evt: 'delete_organization_membership_success',
        deleteResult: !!deleteResult
      }));
    } catch (deleteError: any) {
      console.error('team.api', JSON.stringify({
        evt: 'delete_organization_membership_error',
        error: deleteError.message,
        code: deleteError?.code,
        clerkErrors: deleteError?.errors,
        status: deleteError?.status,
        membershipId
      }));
      throw deleteError;
    }

    const successResult = {
      evt: 'result',
      method: 'DELETE',
      status: 200,
      payloadKeys: ['ok'],
      success: true
    };
    console.log('team.api', JSON.stringify(successResult));

    return NextResponse.json({ ok: true }, { status: 200 });

  } catch (error: any) {
    const clerkError = error?.errors?.[0];
    
    const errorResult = {
      evt: 'result',
      method: 'DELETE',
      status: 500,
      payloadKeys: ['ok', 'error'],
      clerkError: clerkError?.code,
      message: clerkError?.message,
      rawError: error.message
    };
    console.error('team.api', JSON.stringify(errorResult));

    return NextResponse.json({
      ok: false,
      error: { 
        code: clerkError?.code || 'CLERK_ERROR', 
        message: clerkError?.message || 'Failed to remove member'
      }
    }, { status: 500 });
  }
}