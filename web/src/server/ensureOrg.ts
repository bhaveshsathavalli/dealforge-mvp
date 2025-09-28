import "server-only";
import { auth, currentUser, createClerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "./supabaseAdmin";

export interface EnsureOrgInput {
  clerkOrgId: string;
  name?: string;
  slug?: string;
}

export interface EnsureOrgResult {
  orgId: string;
  role: string;
}

/**
 * Ensures an organization exists in Supabase and mirrors user data.
 * Idempotent - safe to call multiple times.
 */
export async function ensureOrg(input: EnsureOrgInput): Promise<EnsureOrgResult> {
  const { clerkOrgId, name: inputName, slug: inputSlug } = input;
  
  try {
    // Get current user info from Clerk
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      throw new Error("User not authenticated");
    }

    // Get user details from Clerk
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    const fullName = user?.fullName;
    const imageUrl = user?.imageUrl;

    // Create Clerk client
    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

    // Get organization details from Clerk
    const org = await clerkClient.organizations.getOrganization({ 
      organizationId: clerkOrgId 
    });

    // Get user's role in the organization
    let role = 'member';
    try {
      const memberships = await clerkClient.organizations.getOrganizationMembershipList({
        organizationId: clerkOrgId,
      });
      const userMembership = memberships.data.find(m => m.publicUserData?.userId === clerkUserId);
      role = userMembership?.role || 'member';
    } catch (error) {
      console.warn('Failed to get membership role, defaulting to member:', error);
    }

    // Upsert organization
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('orgs')
      .upsert({
        clerk_org_id: clerkOrgId,
        name: inputName || org.name,
        slug: inputSlug || org.slug,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'clerk_org_id'
      })
      .select('id')
      .single();

    if (orgError) {
      throw new Error(`Failed to upsert organization: ${orgError.message}`);
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
      throw new Error(`Failed to upsert profile: ${profileError.message}`);
    }

    // Upsert organization membership
    const { error: membershipError } = await supabaseAdmin
      .from('org_memberships')
      .upsert({
        clerk_org_id: clerkOrgId,
        clerk_user_id: clerkUserId,
        role: role,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'clerk_org_id,clerk_user_id'
      });

    if (membershipError) {
      throw new Error(`Failed to upsert membership: ${membershipError.message}`);
    }

    return {
      orgId: orgData.id,
      role: role
    };

  } catch (error) {
    console.error('Error in ensureOrg:', error);
    throw error;
  }
}