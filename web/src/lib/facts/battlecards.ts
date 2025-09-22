import { createClient } from "@/lib/supabase/server";
import { answerScore } from "./scores";

export async function composeBattlecards(runId: string) {
  const sb = await createClient();
  
  const { data: run } = await sb
    .from("compare_runs")
    .select(`
      you_vendor_id,
      comp_vendor_id,
      vendors!compare_runs_you_vendor_id_fkey(name),
      vendors!compare_runs_comp_vendor_id_fkey(name)
    `)
    .eq("id", runId)
    .single();
    
  if (!run) return;
  
  const { data: youFacts } = await sb
    .from("facts")
    .select("*")
    .eq("vendor_id", run.you_vendor_id);
    
  const { data: compFacts } = await sb
    .from("facts")
    .select("*")
    .eq("vendor_id", run.comp_vendor_id);
    
  // Simple differentiators based on feature comparisons
  const differentiators = [];
  const youFeatures = (youFacts || []).filter(f => f.metric === "features");
  const compFeatures = (compFacts || []).filter(f => f.metric === "features");
  
  for (const youFeature of youFeatures) {
    const compHasFeature = compFeatures.some(cf => 
      cf.value?.toLowerCase().includes(youFeature.value?.toLowerCase() || "")
    );
    
    if (!compHasFeature) {
      differentiators.push({
        section: "differentiators",
        text: `We offer ${youFeature.value} which competitors don't`,
        citations: youFeature.citations || [],
        answer_score: answerScore(0.8, 0.7, 0.9),
        persona: "SE"
      });
    }
  }
  
  // Insert battlecard bullets
  if (differentiators.length) {
    await sb.from("battlecard_bullets").insert(
      differentiators.map(d => ({
        run_id: runId,
        ...d
      }))
    );
  }
}