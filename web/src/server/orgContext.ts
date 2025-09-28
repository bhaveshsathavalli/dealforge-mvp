import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';

export type OrgContext = {
  ok: boolean;
  userId?: string;
  orgId?: string;
  role?: 'admin' | 'member';
  reason?: string;
  clerkCode?: string;
  clerkMessage?: string;
};

function normalizeRole(role?: string): 'admin' | 'member' {
  if (!role) return 'member';
  const normalized = role.toLowerCase();
  if (normalized.includes('admin')) return 'admin';
  return 'member';
}

export async function resolveOrgContext(): Promise<OrgContext> {
  try {
    console.log('org.ctx', JSON.stringify({ evt: 'start' }));
    
    // Step 1: Get basic auth info
    const { userId, orgId, sessionClaims } = await auth();
    
    if (!userId) {
      console.log('org.ctx', JSON.stringify({ evt: 'no_user' }));
      return { ok: false, reason: 'UNAUTHENTICATED' };
    }

    console.log('org.ctx', JSON.stringify({ 
      evt: 'auth_ok', 
      userId, 
      orgId, 
      hasSessionClaims: !!sessionClaims 
    }));

    // Step 2: Try to derive role from sessionClaims first
    let role: 'admin' | 'member' | undefined;
    
    if (sessionClaims?.org_role) {
      role = normalizeRole(sessionClaims.org_role as string);
      console.log('org.ctx', JSON.stringify({ 
        evt: 'role_from_session', 
        rawRole: sessionClaims.org_role, 
        normalizedRole: role 
      }));
    }

    // Step 3: If no role from sessionClaims, fetch from Clerk
    if (!role && orgId) {
      try {
        console.log('org.ctx', JSON.stringify({ evt: 'fetching_memberships', orgId }));
        
        const memberships = await clerkClient.organizations.getOrganizationMembershipList({
          organizationId: orgId,
          limit: 100
        });
        
        const me = memberships.data.find(m => m.publicUserData?.userId === userId);
        if (me) {
          role = normalizeRole(me.role);
          console.log('org.ctx', JSON.stringify({ 
            evt: 'role_from_membership', 
            rawRole: me.role, 
            normalizedRole: role 
          }));
        }
      } catch (clerkError: any) {
        console.error('org.ctx', JSON.stringify({ 
          evt: 'membership_lookup_failed', 
          error: clerkError.message,
          code: clerkError?.errors?.[0]?.code 
        }));
        
        return { 
          ok: false, 
          reason: 'LOOKUP_FAILED', 
          clerkCode: clerkError?.errors?.[0]?.code,
          clerkMessage: clerkError.message 
        };
      }
    }

    // Step 4: If still no role and no orgId, try user's memberships
    if (!role && !orgId) {
      try {
        console.log('org.ctx', JSON.stringify({ evt: 'fetching_user_memberships', userId }));
        
        const userMemberships = await clerkClient.users.getOrganizationMembershipList({
          userId,
          limit: 10
        });
        
        const activeMembership = userMemberships.data.find(m => m.organization?.id) || userMemberships.data[0];
        if (activeMembership) {
          role = normalizeRole(activeMembership.role);
          const foundOrgId = activeMembership.organization?.id;
          
          console.log('org.ctx', JSON.stringify({ 
            evt: 'role_from_user_membership', 
            rawRole: activeMembership.role, 
            normalizedRole: role,
            foundOrgId 
          }));
          
          return { 
            ok: true, 
            userId, 
            orgId: foundOrgId, 
            role 
          };
        }
      } catch (clerkError: any) {
        console.error('org.ctx', JSON.stringify({ 
          evt: 'user_membership_lookup_failed', 
          error: clerkError.message,
          code: clerkError?.errors?.[0]?.code 
        }));
        
        return { 
          ok: false, 
          reason: 'LOOKUP_FAILED', 
          clerkCode: clerkError?.errors?.[0]?.code,
          clerkMessage: clerkError.message 
        };
      }
    }

    // Step 5: Return result
    if (!role) {
      console.log('org.ctx', JSON.stringify({ evt: 'no_role_found' }));
      return { ok: false, reason: 'NO_ROLE' };
    }

    const result = { 
      ok: true, 
      userId, 
      orgId, 
      role 
    };
    
    console.log('org.ctx', JSON.stringify({ 
      evt: 'success', 
      ...result 
    }));
    
    return result;

  } catch (error: any) {
    console.error('org.ctx', JSON.stringify({ 
      evt: 'fatal_error', 
      error: error.message 
    }));
    
    return { 
      ok: false, 
      reason: 'FATAL_ERROR', 
      clerkMessage: error.message 
    };
  }
}