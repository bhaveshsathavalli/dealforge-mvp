import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";

export async function getOrgUuidFromClerk() {
  const { orgId, userId } = await auth();
  if (!orgId) throw new Error("No Clerk orgId in session");
  
  const sb = await createClient();
  
  // orgs table stores UUID primary key + clerk_org_id (text). Return the UUID.
  const { data, error } = await sb
    .from("orgs")
    .select("id")
    .eq("clerk_org_id", orgId)
    .maybeSingle();
    
  if (error) throw new Error(`Database error: ${error.message}`);
  if (!data) throw new Error(`Org not found for clerk_org_id=${orgId}`);
  
  return { orgUuid: data.id as string, userId };
}
