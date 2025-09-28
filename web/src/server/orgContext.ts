import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/nextjs/server';
import { supabaseAdmin } from './supabaseAdmin';

export type Role = 'admin' | 'member';
export type OrgContext = { 
  clerkUserId: string; 
  clerkOrgId: string; 
  role: Role;
  orgId?: string; // Supabase internal org UUID
};

export class OrgContextError extends Error {
  constructor(
    message: string,
    public code: 'UNAUTHENTICATED' | 'NO_ORG' | 'NO_MEMBERSHIP' | 'DB_ERROR'
  ) {
    super(message);
    this.name = 'OrgContextError';
  }
}

function normalizeRole(role?: string): Role {
  if (!role) return 'member';
  const v = role.toLowerCase();
  if (v.includes('admin')) return 'admin';
  return 'member';
}

export async function resolveOrgContext(req: Request): Promise<OrgContext> {
  try {
    // Check for test mode cookies first
    const cookieHeader = req.headers.get('cookie');
    const testUserId = cookieHeader?.match(/TEST_CLERK_USER=([^;]+)/)?.[1];
    const testOrgId = cookieHeader?.match(/TEST_CLERK_ORG=([^;]+)/)?.[1];
    
    console.log('team.debug', JSON.stringify({
      evt: 'test_cookie_parsing',
      cookieHeader,
      testUserId,
      testOrgId
    }));
    
    if (testUserId && testOrgId) {
      // Test mode - get role from database
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('org_memberships')
        .select('role')
        .eq('clerk_org_id', testOrgId)
        .eq('clerk_user_id', testUserId)
        .single();
      
      console.log('team.debug', JSON.stringify({
        evt: 'test_membership_query',
        testUserId,
        testOrgId,
        membership,
        membershipError
      }));
      
      if (!membership) {
        throw new OrgContextError('No membership found for test user', 'NO_MEMBERSHIP');
      }
      
      return {
        clerkUserId: testUserId,
        clerkOrgId: testOrgId,
        role: membership.role === 'admin' ? 'admin' : 'member'
      };
    }
    
    // Production mode - use Clerk
    const { userId: clerkUserId, orgId: clerkOrgId } = await auth();
    
    if (!clerkUserId) {
      throw new OrgContextError('Not authenticated', 'UNAUTHENTICATED');
    }
    
    if (!clerkOrgId) {
      throw new OrgContextError('No organization selected', 'NO_ORG');
    }
    
    // Get role from org_memberships (source of truth)
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('org_memberships')
      .select('role')
      .eq('clerk_org_id', clerkOrgId)
      .eq('clerk_user_id', clerkUserId)
      .single();
    
    if (membershipError || !membership) {
      // Fallback to Clerk API if not in our DB
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
      
      try {
        const mems = await clerk.users.getOrganizationMembershipList({
          userId: clerkUserId,
          organizationId: clerkOrgId,
          limit: 1
        });
        
        if (mems.data && mems.data.length > 0) {
          const clerkRole = normalizeRole(mems.data[0].role);
          
          // Upsert into our DB for consistency
          await supabaseAdmin.from('org_memberships').upsert({
            clerk_user_id: clerkUserId,
            clerk_org_id: clerkOrgId,
            role: clerkRole,
            updated_at: new Date().toISOString()
          }, { onConflict: 'clerk_user_id,clerk_org_id' });
          
          return {
            clerkUserId,
            clerkOrgId,
            role: clerkRole
          };
        }
      } catch (clerkError) {
        console.error('team.debug', JSON.stringify({
          evt: 'clerk_fallback_failed',
          clerkUserId,
          clerkOrgId,
          error: clerkError instanceof Error ? clerkError.message : 'Unknown error'
        }));
      }
      
      throw new OrgContextError('No membership found', 'NO_MEMBERSHIP');
    }
    
    // Get Supabase orgId for completeness
    const { data: orgData } = await supabaseAdmin
      .from('orgs')
      .select('id')
      .eq('clerk_org_id', clerkOrgId)
      .single();
    
    const context = {
      clerkUserId,
      clerkOrgId,
      role: membership.role === 'admin' ? 'admin' : 'member',
      orgId: orgData?.id
    };

    // Log context for debugging
    console.info('invites.clerk', JSON.stringify({
      evt: 'ctx',
      userId: context.clerkUserId,
      orgId: context.clerkOrgId,
      role: context.role,
      supabaseOrgId: context.orgId
    }));

    return context;
    
  } catch (error) {
    if (error instanceof OrgContextError) {
      throw error;
    }
    
    console.error('team.debug', JSON.stringify({
      evt: 'resolve_org_context_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }));
    
    throw new OrgContextError('Failed to resolve org context', 'DB_ERROR');
  }
}
