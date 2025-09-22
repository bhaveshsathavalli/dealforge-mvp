"use server";

import { createClient } from "@/lib/supabase/server";
import { resolveOfficialSite } from "@/lib/facts/resolve-vendor";
import { collectPricing } from "@/lib/facts/collectors/pricing";
import { collectFeatures } from "@/lib/facts/collectors/features";
import { collectIntegrations } from "@/lib/facts/collectors/integrations";
import { collectSecurity } from "@/lib/facts/collectors/security";
import { collectReliability } from "@/lib/facts/collectors/reliability";
import { collectChangelog } from "@/lib/facts/collectors/changelog";
import { saveSourceAndFacts, composeCompareCell } from "@/lib/facts/persist-and-compose";
import { canRun, finishRun } from "@/lib/facts/run-guard";

export async function runCompareFactsPipeline(params: { orgId: string; youName: string; compName: string }) {
  const { orgId, youName, compName } = params;
  
  if (!canRun(orgId)) return { ok: false, reason: "cooldown" };
  
  const sb = await createClient();
  
  const youVendor = await resolveOfficialSite(orgId, youName);
  const compVendor = await resolveOfficialSite(orgId, compName);
  
  if (!youVendor) {
    console.error(`[runCompareFactsPipeline] Failed to resolve vendor: ${youName}`);
    return { ok: false, reason: `Failed to resolve vendor: ${youName}` };
  }
  
  if (!compVendor) {
    console.error(`[runCompareFactsPipeline] Failed to resolve vendor: ${compName}`);
    return { ok: false, reason: `Failed to resolve vendor: ${compName}` };
  }
  
  const youDomain = (youVendor?.website || "").replace(/^https?:\/\//, "").split("/")[0];
  const compDomain = (compVendor?.website || "").replace(/^https?:\/\//, "").split("/")[0];
  
  const collectors = [
    collectPricing,
    collectFeatures,
    collectIntegrations,
    collectSecurity,
    collectReliability,
    collectChangelog
  ];
  
  for (const fn of collectors) {
    const a = await fn(youDomain).catch(() => null);
    if (a) await saveSourceAndFacts(youVendor.id, a);
    
    const b = await fn(compDomain).catch(() => null);
    if (b) await saveSourceAndFacts(compVendor.id, b);
  }
  
  const { data: youFacts } = await sb.from("facts").select("*").eq("vendor_id", youVendor.id);
  const { data: compFacts } = await sb.from("facts").select("*").eq("vendor_id", compVendor.id);
  
  const metrics = ["pricing", "features", "integrations", "security", "reliability", "changelog"];
  
  const { data: run } = await sb
    .from("compare_runs")
    .insert({
      org_id: orgId,
      you_vendor_id: youVendor.id,
      comp_vendor_id: compVendor.id
    })
    .select()
    .single();
    
  for (const m of metrics) {
    const youCell = composeCompareCell(youFacts || [], m);
    const compCell = composeCompareCell(compFacts || [], m);
    
    await sb.from("compare_rows").insert({
      run_id: run.id,
      metric: m,
      you_text: youCell.text,
      comp_text: compCell.text,
      you_citations: youCell.citations,
      comp_citations: compCell.citations,
      answer_score_you: youCell.answer_score,
      answer_score_comp: compCell.answer_score
    });
  }
  
  finishRun(orgId);
  return { ok: true, runId: run.id };
}