import { createClient } from "@/lib/supabase/server";
import { createTestComparison } from "./actions";
import { isFactsPipelineEnabled } from "@/lib/flags";

export const dynamic = "force-dynamic";

export default async function TestFactsPipelinePage() {
  const factsPipelineEnabled = isFactsPipelineEnabled();
  
  if (!factsPipelineEnabled) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Facts Pipeline Test</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Feature Disabled</h2>
          <p className="text-red-700">
            The facts pipeline feature is currently disabled. Please contact your administrator to enable it.
          </p>
        </div>
      </div>
    );
  }

  const sb = await createClient();
  
  // Get the current user's org ID (you'll need to implement this based on your auth setup)
  const { data: { user } } = await sb.auth.getUser();
  const orgId = user?.user_metadata?.org_id || "test-org-id";
  
  // Get recent compare runs
  const { data: recentRuns } = await sb
    .from("compare_runs")
    .select(`
      id,
      created_at,
      you_vendor:vendors!compare_runs_you_vendor_id_fkey(name),
      comp_vendor:vendors!compare_runs_comp_vendor_id_fkey(name)
    `)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(5);
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Facts Pipeline Test</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Test the Pipeline</h2>
        <form action={createTestComparison.bind(null, orgId)}>
          <button 
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Create Test Comparison
          </button>
        </form>
        <p className="text-sm text-gray-600 mt-2">
          This will create a comparison between "Your Product" and "Competitor" using the new facts pipeline.
        </p>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Recent Facts Pipeline Runs</h2>
        {recentRuns?.length ? (
          <div className="space-y-2">
            {recentRuns.map((run: any) => (
              <div key={run.id} className="border rounded p-3">
                <div className="font-medium">
                  {run.you_vendor?.name || "Unknown"} vs {run.comp_vendor?.name || "Unknown"}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(run.created_at).toLocaleString()}
                </div>
                <a 
                  href={`/app/compare/${run.id}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  View →
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No facts pipeline runs found. Create a test comparison above.</p>
        )}
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Expected Results After Running:</h3>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>Redirect to <code>/app/compare/[runId]</code> with working comparison</li>
          <li>Pricing and features rows populated with AnswerScore badges</li>
          <li>Citation chips showing source links</li>
          <li>Refresh page shows same data (no SerpAPI calls)</li>
          <li>Repeat within 15 min shows cooldown message</li>
        </ul>
      </div>
    </div>
  );
}