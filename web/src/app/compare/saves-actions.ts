"use server";

import { createClient } from "@/lib/supabase/server";

export async function savePersonalSnapshot(runId: string, name: string, userId: string, orgId: string) {
  const sb = await createClient();
  
  // Get the full comparison data
  const { data: run } = await sb
    .from("compare_runs")
    .select(`
      *,
      vendors!compare_runs_you_vendor_id_fkey(name),
      vendors!compare_runs_comp_vendor_id_fkey(name)
    `)
    .eq("id", runId)
    .single();
    
  const { data: rows } = await sb
    .from("compare_rows")
    .select("*")
    .eq("run_id", runId);
    
  const snapshot = {
    run,
    rows,
    savedAt: new Date().toISOString()
  };
  
  await sb.from("personal_saves").insert({
    user_id: userId,
    org_id: orgId,
    base_run_id: runId,
    name,
    snapshot
  });
}

export async function saveOrgSnapshot(runId: string, name: string, orgId: string) {
  const sb = await createClient();
  
  // Get the full comparison data
  const { data: run } = await sb
    .from("compare_runs")
    .select(`
      *,
      vendors!compare_runs_you_vendor_id_fkey(name),
      vendors!compare_runs_comp_vendor_id_fkey(name)
    `)
    .eq("id", runId)
    .single();
    
  const { data: rows } = await sb
    .from("compare_rows")
    .select("*")
    .eq("run_id", runId);
    
  const snapshot = {
    run,
    rows,
    savedAt: new Date().toISOString()
  };
  
  await sb.from("org_snapshots").insert({
    org_id: orgId,
    base_run_id: runId,
    name,
    snapshot
  });
}