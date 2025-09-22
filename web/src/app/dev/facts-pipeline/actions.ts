"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgUuidFromClerk } from "@/lib/org/ids";
import { runCompareFactsPipeline } from "@/app/compare/actions";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/server/supabaseAdmin";

export async function runFactsPipelineAction(competitorId: string) {
  const { orgUuid } = await getOrgUuidFromClerk();
  const sb = await createClient();
  
  // Get your product info
  const { data: orgData } = await sb
    .from("orgs")
    .select("product_name, product_website")
    .eq("id", orgUuid)
    .single();

  if (!orgData?.product_name) {
    throw new Error("Please set your Product Name in Settings first");
  }

  const { data: competitor } = await supabaseAdmin
    .from("competitors")
    .select("name")
    .eq("id", competitorId)
    .eq("org_id", orgUuid)
    .single();

  if (!competitor) {
    throw new Error("Competitor not found");
  }

  try {
    const result = await runCompareFactsPipeline({
      orgId: orgUuid,
      youName: orgData.product_name,
      compName: competitor.name
    });
    
    if (!result?.ok) {
      throw new Error(`Pipeline failed: ${result?.reason || 'Unknown error'}`);
    }
    
    redirect(`/app/compare/${result.runId}`);
  } catch (error) {
    console.error("Facts pipeline failed:", error);
    throw error;
  }
}

export async function clearCooldownAction() {
  const { orgUuid } = await getOrgUuidFromClerk();
  const { finishRun } = await import("@/lib/facts/run-guard");
  finishRun(orgUuid);
}

export async function addTestCompetitorAction(formData: FormData) {
  const { orgUuid } = await getOrgUuidFromClerk();
  const name = formData.get("name") as string;
  const website = formData.get("website") as string;
  
  if (!name?.trim()) {
    throw new Error("Competitor name is required");
  }
  
  const { data: competitor, error } = await supabaseAdmin
    .from("competitors")
    .insert({
      org_id: orgUuid,
      name: name.trim(),
      website: website?.trim() || null,
      active: true
    })
    .select("id, name, website")
    .single();
    
  if (error) {
    throw new Error(`Failed to add competitor: ${error.message}`);
  }
  
  // Redirect back to refresh the page
  redirect("/dev/facts-pipeline");
}
