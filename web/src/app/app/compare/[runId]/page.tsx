import { createClient } from "@/lib/supabase/server";
import { AnswerScoreBadge } from "@/components/compare/AnswerScoreBadge";
import { CitationChip } from "@/components/compare/CitationChip";
import { isFactsPipelineEnabled } from "@/lib/flags";

export const dynamic = "force-dynamic";

export default async function CompareRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  
  // Check if facts pipeline is enabled
  if (!isFactsPipelineEnabled()) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Feature Disabled</h2>
          <p className="text-yellow-700">
            The facts pipeline feature is currently disabled. Please contact your administrator to enable it.
          </p>
        </div>
      </div>
    );
  }
  
  const sb = await createClient();
  
  console.log(`[CompareRunPage] Looking for run: ${runId}`);
  
  // Load compare run and rows from the new facts pipeline
  const { data: run, error: runError } = await sb
    .from("compare_runs")
    .select(`
      id,
      org_id,
      you_vendor_id,
      comp_vendor_id,
      version,
      created_at,
      you_vendor:vendors!compare_runs_you_vendor_id_fkey(name),
      comp_vendor:vendors!compare_runs_comp_vendor_id_fkey(name)
    `)
    .eq("id", runId)
    .single();
    
  if (runError) {
    console.error(`[CompareRunPage] Error loading run:`, runError);
    return <div className="p-6">Error loading run: {runError.message}</div>;
  }
    
  if (!run) {
    console.log(`[CompareRunPage] Run not found: ${runId}`);
    return <div className="p-6">Run not found.</div>;
  }
  
  console.log(`[CompareRunPage] Found run:`, run);
  
  const { data: rows } = await sb
    .from("compare_rows")
    .select("*")
    .eq("run_id", runId)
    .order("metric");
    
  if (!rows?.length) {
    return <div className="p-6">No comparison data yet.</div>;
  }
  
  const youName = (run.you_vendor as any)?.name || "You";
  const compName = (run.comp_vendor as any)?.name || "Competitor";
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-semibold">{youName} vs {compName}</h1>
          <p className="text-sm text-gray-500">Last verified • v{run.version}</p>
        </div>
        <button className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded">
          Refresh
        </button>
      </div>
      
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="w-40 text-left">Metric</th>
            <th className="text-left">You</th>
            <th className="text-left">Competitor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.id} className="align-top border-t">
              <td className="py-3">{r.metric}</td>
              <td className="py-3">
                <div className="flex items-center gap-2 mb-1">
                  <AnswerScoreBadge score={r.answer_score_you || 0} />
                  <span>{r.you_text}</span>
                </div>
                <div className="mt-1">
                  {(r.you_citations || []).slice(0, 3).map((c: any, i: number) => (
                    <CitationChip key={i} url={c.url} score={0.8} />
                  ))}
                </div>
              </td>
              <td className="py-3">
                <div className="flex items-center gap-2 mb-1">
                  <AnswerScoreBadge score={r.answer_score_comp || 0} />
                  <span>{r.comp_text}</span>
                </div>
                <div className="mt-1">
                  {(r.comp_citations || []).slice(0, 3).map((c: any, i: number) => (
                    <CitationChip key={i} url={c.url} score={0.8} />
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}