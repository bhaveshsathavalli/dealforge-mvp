import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { auth, clerkClient, Organization } from "@clerk/nextjs/server";

type OrgRow = { id: string; name: string | null; clerk_org_id: string | null; slug: string | null };

function admin() {
  // Admin client (service role); RLS bypass for controlled server writes.
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    global: { headers: { "X-Client-Info": "geo-admin" } },
  });
}

export async function ensureDbOrg(): Promise<{ dbOrgId: string; clerkOrgId: string }> {
  const { orgId: clerkOrgId } = auth();
  if (!clerkOrgId) throw new Error("No active Clerk org. Switch or create an organization.");

  const sb = admin();
  // 1) Try to find existing org row mapped to Clerk
  let { data: found, error } = await sb.from("orgs").select("id,name,clerk_org_id,slug").eq("clerk_org_id", clerkOrgId).maybeSingle();
  if (error) throw error;

  if (found?.id) return { dbOrgId: found.id, clerkOrgId };

  // 2) Create one if missing (pull name/slug from Clerk)
  const org: Organization = await clerkClient.organizations.getOrganization({ organizationId: clerkOrgId });
  const name = org.name ?? "New Org";
  const slug = (org.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).slice(0, 50);

  const { data: created, error: insertErr } = await sb
    .from("orgs")
    .insert({ name, slug, clerk_org_id: clerkOrgId })
    .select("id")
    .single();
  if (insertErr) throw insertErr;

  return { dbOrgId: created.id, clerkOrgId };
}
