import "server-only";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "./supabaseAdmin";
import { resolveOrgContext } from "./orgContext";

export interface EnsureOrgResult {
  ok: boolean;
  orgId?: string;
  role?: string;
  code?: string;
  message?: string;
}

/**
 * Ensures an organization exists in Supabase and mirrors user data.
 * Idempotent - safe to call multiple times.
 * Never throws - always returns structured result.
 */
export async function ensureOrg(): Promise<EnsureOrgResult> {
  try {
    console.log('ensureOrg', { evt: 'start' });
    
    // Get org context using single source of truth
    const ctx = await resolveOrgContext();
    
    if (!ctx.ok) {
      console.log('ensureOrg', { evt: 'unauth', reason: ctx.reason });
      return { ok: false, code: 'UNAUTHENTICATED', message: ctx.reason };
    }
    
    if (!ctx.orgId) {
      console.warn('ensureOrg', { evt: 'no_active_org' });
      return { ok: false, code: 'NO_ACTIVE_ORG', message: 'No active organization' };
    }
    
    const clerkOrgId = ctx.orgId;
    const clerkUserId = ctx.userId;
    
    // Verify organization exists in Clerk
    try {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({ 
        organizationId: clerkOrgId 
      });
      
      console.log('ensureOrg', { evt: 'clerk_org_found', orgId: clerkOrgId, orgName: org.name });
    } catch (clerkError: any) {
      if (clerkError?.status === 404) {
        console.log('ensureOrg', { evt: 'org_not_found', orgId: clerkOrgId });
        return { ok: false, code: 'ORG_NOT_FOUND', message: 'Organization not found in Clerk' };
      }
      
      console.error('ensureOrg', { 
        evt: 'clerk_error', 
        orgId: clerkOrgId, 
        error: clerkError.message,
        status: clerkError?.status 
      });
      return { ok: false, code: 'CLERK_ERROR', message: clerkError.message };
    }

    // Get user details from Clerk
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    const fullName = user?.fullName;
    const imageUrl = user?.imageUrl;

    // Get organization details from Clerk for upsert
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ 
      organizationId: clerkOrgId 
    });

    // Upsert organization
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('orgs')
      .upsert({
        clerk_org_id: clerkOrgId,
        name: org.name,
        slug: org.slug,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'clerk_org_id'
      })
      .select('id')
      .single();

    if (orgError) {
      console.error('ensureOrg', { evt: 'db_org_error', error: orgError.message });
      return { ok: false, code: 'DB_ERROR', message: `Failed to upsert organization: ${orgError.message}` };
    }

    // Upsert user profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        clerk_user_id: clerkUserId,
        email: email,
        name: fullName,
        image_url: imageUrl,
        last_active_org_id: orgData.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'clerk_user_id'
      });

    if (profileError) {
      console.error('ensureOrg', { evt: 'db_profile_error', error: profileError.message });
      return { ok: false, code: 'DB_ERROR', message: `Failed to upsert profile: ${profileError.message}` };
    }

    // Upsert organization membership
    const { error: membershipError } = await supabaseAdmin
      .from('org_memberships')
      .upsert({
        clerk_org_id: clerkOrgId,
        clerk_user_id: clerkUserId,
        role: ctx.role,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'clerk_org_id,clerk_user_id'
      });

    if (membershipError) {
      console.error('ensureOrg', { evt: 'db_membership_error', error: membershipError.message });
      return { ok: false, code: 'DB_ERROR', message: `Failed to upsert membership: ${membershipError.message}` };
    }

    console.log('ensureOrg', { evt: 'success', orgId: orgData.id, role: ctx.role });
    return {
      ok: true,
      orgId: orgData.id,
      role: ctx.role
    };

  } catch (error: any) {
    console.error('ensureOrg', { evt: 'fatal', error: error.message });
    return { ok: false, code: 'FATAL_ERROR', message: error.message };
  }
}