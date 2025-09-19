import { supabaseServer } from "@/lib/supabaseServer";
import { searchGoogleSerp } from "./serp";

export async function collectForRun(runId: string, query: string) {
  const sb = supabaseServer();

  try {
    console.log("[collectForRun] Starting collection for run:", runId, "query:", query);
    const rows = await searchGoogleSerp(query);
    if (!rows.length) throw new Error("No results from SerpAPI");

    const toInsert = rows.map((h) => ({
      run_id: runId,
      source_url: h.source_url,
      title: h.title,
      text_snippet: h.text_snippet,
      engine: h.engine,
      rank: h.rank,
      query_string: h.query_string,
      fetched_at: new Date().toISOString(),
    }));

    const { error: insertErr } = await sb.from("raw_hits").insert(toInsert);
    if (insertErr) throw insertErr;

    await sb.from("query_runs").update({ status: "done" }).eq("id", runId);
    console.log("[collectForRun] Successfully completed collection for run:", runId);
  } catch (err: any) {
    await supabaseServer()
      .from("query_runs")
      .update({ status: "failed" })
      .eq("id", runId);
    console.error("[collectForRun] failed:", err?.message ?? err);
  }
}
