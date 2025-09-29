import { createClient } from "@supabase/supabase-js"; // or your helper

export async function getActivePlans(supabase: any) {
  const { data, error } = await supabase
    .from("plans")
    .select("id, slug, name, max_users, max_competitors, stripe_price_id, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function setOrgPlanBySlug(supabase: any, orgId: string, slug: string) {
  const { data: plan, error: pe } = await supabase
    .from("plans")
    .select("id")
    .eq("slug", slug)
    .single();
  if (pe || !plan) throw pe || new Error("Plan not found");

  const { error: oe } = await supabase
    .from("orgs")
    .update({ plan_id: plan.id, plan_type: slug }) // keep text for legacy UI
    .eq("id", orgId);
  if (oe) throw oe;
}
