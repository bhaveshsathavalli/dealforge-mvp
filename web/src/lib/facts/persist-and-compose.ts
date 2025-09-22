import { createClient } from "@/lib/supabase/server";
import { answerScore } from "./scores";

type Citation = { url: string; title?: string; source_id?: string };

export async function saveSourceAndFacts(vendorId: string, payload: { source: any; facts: any[] }) {
  const sb = await createClient();
  
  const { data: src } = await sb
    .from("sources")
    .insert({
      vendor_id: vendorId,
      metric: payload.source.metric,
      url: payload.source.url,
      title: payload.source.title,
      body: payload.source.body,
      body_hash: payload.source.body_hash,
      first_party: payload.source.first_party,
      fetched_at: new Date().toISOString(),
      source_score: payload.source.source_score
    })
    .select("id")
    .single();
    
  if (payload.facts?.length) {
    const facts = payload.facts.map(f => ({
      vendor_id: vendorId,
      metric: f.metric,
      key: f.key,
      value: f.value,
      text_summary: f.text_summary,
      citations: (f.citations ?? []).map((c: Citation) => ({ ...c, source_id: src?.id })),
      fact_score: f.confidence ?? 0.7
    }));
    
    await sb.from("facts").insert(facts);
  }
}

export function composeCompareCell(facts: any[], metric: string) {
  const fs = (facts ?? []).filter((f: any) => f.metric === metric);
  
  if (!fs.length) {
    return {
      text: "Not publicly stated.",
      citations: [],
      answer_score: 0.35
    };
  }
  
  const best = fs.sort((a: any, b: any) => (b.fact_score || 0) - (a.fact_score || 0))[0];
  const reliability = best.fact_score || 0.6;
  const completeness = metric === "pricing" ? (/\d/.test(best.value || best.text_summary) ? 1 : 0.5) : 0.7;
  const specificity = (best.value && /\d/.test(best.value)) ? 0.9 : 0.6;
  
  return {
    text: best.text_summary || best.value || "Not publicly stated.",
    citations: best.citations ?? [],
    answer_score: answerScore(reliability, completeness, specificity)
  };
}