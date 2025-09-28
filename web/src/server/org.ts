import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { DEFAULT_PRODUCT, normalizeUrl } from "./productDefaults";

/**
 * Ensures a profile record exists for the given Clerk user ID.
 * Idempotent - safe to call multiple times.
 */
export async function ensureProfile(clerkUserId: string, email?: string, name?: string, imageUrl?: string) {
  const sb = supabaseServer();
  
  const { error } = await sb
    .from('profiles')
    .upsert({
      clerk_user_id: clerkUserId,
      email: email ?? null,
      name: name ?? null,
      image_url: imageUrl ?? null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'clerk_user_id'
    });

  if (error) {
    throw new Error(`Failed to ensure profile: ${error.message}`);
  }
}

/**
 * Ensures an organization record exists for the given Clerk org ID.
 * Idempotent - safe to call multiple times.
 */
export async function ensureOrg(clerkOrgId: string, name?: string) {
  const sb = supabaseServer();
  
  const { error } = await sb
    .from('orgs')
    .upsert({
      clerk_org_id: clerkOrgId,
      name: name ?? clerkOrgId,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'clerk_org_id'
    });

  if (error) {
    throw new Error(`Failed to ensure org: ${error.message}`);
  }
}

/**
 * Ensures a membership record exists for the given user and org.
 * Idempotent - safe to call multiple times.
 */
export async function ensureMembership(clerkUserId: string, clerkOrgId: string, role: string = "member") {
  const sb = supabaseServer();
  
  const { error } = await sb
    .from('org_memberships')
    .upsert({
      clerk_user_id: clerkUserId,
      clerk_org_id: clerkOrgId,
      role: role,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'clerk_user_id,clerk_org_id'
    });

  if (error) {
    throw new Error(`Failed to ensure membership: ${error.message}`);
  }
}

/**
 * Resolves the active internal org UUID for the current request.
 * Always returns a valid orgId (creates a personal org as last resort).
 * 
 * This function:
 * 1. Reads Clerk auth (userId, orgId)
 * 2. Upserts mirrors: profiles, orgs, org_memberships
 * 3. Resolves internal orgs.id by clerk_org_id
 * 4. Fallbacks if orgId is undefined: profiles.last_active_org_id → first membership → create personal org
 * 5. Updates profiles.last_active_org_id to the resolved orgs.id
 * 6. Returns { orgId, clerkUserId, clerkOrgId }
 */
export async function getActiveOrg() {
  const { userId: clerkUserId, orgId: clerkOrgId } = await auth();
  if (!clerkUserId) throw new Error("Not authenticated");

  const sb = supabaseServer();

  // Get additional user/org info from Clerk
  const u = await currentUser().catch(() => null);
  let orgName: string | undefined = undefined;
  let role = "member";
  if (clerkOrgId) {
    const org = await clerkClient.organizations
      .getOrganization({ organizationId: clerkOrgId })
      .catch(() => null);
    orgName = org?.name ?? undefined;
    try {
      const mems = await clerkClient.organizations.getOrganizationMembershipList({
        organizationId: clerkOrgId,
        userId: clerkUserId,
        limit: 1,
      });
      role = (mems?.data?.[0]?.role as string) ?? "member";
    } catch {}
  }

  // Mirrors (idempotent)
  await ensureProfile(
    clerkUserId, 
    u?.emailAddresses?.[0]?.emailAddress, 
    u?.fullName ?? undefined, 
    u?.imageUrl ?? undefined
  );
  
  if (clerkOrgId) {
    await ensureOrg(clerkOrgId, orgName);
    await ensureMembership(clerkUserId, clerkOrgId, role);
  }

  // Resolve internal org UUID
  let orgId: string | undefined;

  if (clerkOrgId) {
    // Primary: use the active Clerk org
    const { data: found, error } = await sb
      .from('orgs')
      .select('id')
      .eq('clerk_org_id', clerkOrgId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to find org: ${error.message}`);
    }
    
    orgId = found?.id;
  } else {
    // Fallback A: last active on profile
    const { data: last, error: lastError } = await sb
      .from('profiles')
      .select('last_active_org_id')
      .eq('clerk_user_id', clerkUserId)
      .single();
    
    if (lastError && lastError.code !== 'PGRST116') {
      throw new Error(`Failed to get last active org: ${lastError.message}`);
    }
    
    orgId = last?.last_active_org_id ?? undefined;

    // Fallback B: first membership → org
    if (!orgId) {
      const { data: viaMem, error: memError } = await sb
        .from('org_memberships')
        .select(`
          orgs!inner(id)
        `)
        .eq('clerk_user_id', clerkUserId)
        .limit(1)
        .single();
      
      if (memError && memError.code !== 'PGRST116') {
        throw new Error(`Failed to get membership: ${memError.message}`);
      }
      
      orgId = viaMem?.orgs?.id;
    }
  }

  // Fallback C: create a personal org if none
  if (!orgId) {
    const { data: created, error: createError } = await sb
      .from('orgs')
      .insert({
        name: 'Personal',
        clerk_org_id: null // Personal org has no Clerk org ID
      })
      .select('id')
      .single();
    
    if (createError) {
      throw new Error(`Failed to create personal org: ${createError.message}`);
    }
    
    orgId = created.id;
  }

  // Remember last active org
  const { error: updateError } = await sb
    .from('profiles')
    .update({
      last_active_org_id: orgId,
      updated_at: new Date().toISOString()
    })
    .eq('clerk_user_id', clerkUserId);

  if (updateError) {
    throw new Error(`Failed to update last active org: ${updateError.message}`);
  }

  return { 
    orgId, 
    clerkUserId, 
    clerkOrgId: clerkOrgId ?? null 
  };
}

/**
 * Ensures an organization has default product values if they're empty.
 * Idempotent - safe to call multiple times.
 */
export async function ensureOrgProductDefaults(supabase: any, orgId: string) {
  // Read current
  const { data: row, error } = await supabase
    .from("orgs")
    .select("product_name, product_website")
    .eq("id", orgId)
    .single();

  if (error && error.code !== "PGRST116") { // 116 = no rows single()
    console.warn("ensureOrgProductDefaults: read error", { orgId, error });
  }

  const currentName = row?.product_name?.trim();
  const currentUrl  = normalizeUrl(row?.product_website);

  const nextName = currentName && currentName.length > 0 ? currentName : DEFAULT_PRODUCT.name;
  const nextUrl  = currentUrl  && currentUrl.length  > 0 ? currentUrl  : DEFAULT_PRODUCT.website;

  // If both are already set, do nothing
  if (currentName && currentUrl) return { updated: false };

  // Upsert (insert if missing row, update if exists but empty)
  const payload = {
    product_name: nextName,
    product_website: nextUrl,
  };

  const upsert = await supabase
    .from("orgs")
    .update(payload)
    .eq("id", orgId)
    .select("id")
    .single();

  if (upsert.error) {
    console.error("ensureOrgProductDefaults: upsert error", { orgId, error: upsert.error, payload });
    throw upsert.error;
  }

  return { updated: true };
}
