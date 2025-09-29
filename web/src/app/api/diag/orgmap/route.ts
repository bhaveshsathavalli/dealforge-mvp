import { ok, err } from "@/server/util/apiJson";
import { withOrgId, OrgContext } from "@/server/withOrg";
import { supabaseServer } from "@/lib/supabaseServer";

export const GET = withOrgId(async (ctx: OrgContext, req: Request) => {
  try {
    const { clerkOrgId, orgId } = ctx;
    const sb = supabaseServer();

    // Get database org by clerk org ID
    let dbOrgByClerkId = null;
    if (clerkOrgId) {
      try {
        const { data } = await sb
          .from('orgs')
          .select('id, name, clerk_org_id')
          .eq('clerk_org_id', clerkOrgId)
          .single();
        dbOrgByClerkId = data;
      } catch (e) {
        dbOrgByClerkId = { error: e instanceof Error ? e.message : 'Unknown error' };
      }
    }

    // Get vendors for the resolved org (limit 5 for readability)
    let vendorsForDbOrg: any[] = [];
    if (orgId) {
      try {
        const { data } = await sb
          .from('vendors')
          .select('id, name, org_id')
          .eq('org_id', orgId)
          .limit(5);
        vendorsForDbOrg = data || [];
      } catch (e) {
        vendorsForDbOrg = [{ error: e instanceof Error ? e.message : 'Unknown error' }];
      }
    }

    // Count vendors with null org_id (data integrity check)
    let vendorsWithNullOrgIdCount = 0;
    try {
      const { count } = await sb
        .from('vendors')
        .select('id', { count: 'exact', head: true })
        .is('org_id', null);
      vendorsWithNullOrgIdCount = count || 0;
    } catch (e) {
      console.error('Failed to count vendors with null org_id:', e);
    }

    return ok({
      ok: true,
      clerkOrgId,
      dbOrgByClerkId,
      vendorsForDbOrg,
      vendorsWithNullOrgIdCount
    });

  } catch (error) {
    console.error('Org mapping diagnostic error:', error);
    return err(500, 'Org mapping diagnostic failed', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
