import { createClient } from "@/lib/supabase/server";
import { getOrgUuidFromClerk } from "@/lib/org/ids";
import { runCompareFactsPipeline } from "@/app/compare/actions";
import { redirect } from "next/navigation";
import { isFactsPipelineEnabled } from "@/lib/flags";

export default async function SmokeTestPage() {
  const { orgUuid, userId } = await getOrgUuidFromClerk();
  const sb = await createClient();
  
  // Get last 5 compare runs for this org
  const { data: runs, error: runsError } = await sb
    .from("compare_runs")
    .select(`
      id,
      org_id,
      created_at,
      you_vendor:vendors!compare_runs_you_vendor_id_fkey(name),
      comp_vendor:vendors!compare_runs_comp_vendor_id_fkey(name)
    `)
    .eq("org_id", orgUuid)
    .order("created_at", { ascending: false })
    .limit(5);

  async function runSmokeTest() {
    "use server";
    
    try {
      const result = await runCompareFactsPipeline({
        youName: "Tableau",
        compName: "Looker"
      });
      
      if (!result?.ok) {
        throw new Error(`Pipeline failed: ${result?.reason || 'Unknown error'}`);
      }
      
      redirect(`/app/compare/${result.runId}`);
    } catch (error) {
      console.error("Smoke test failed:", error);
      throw error;
    }
  }

  const factsPipelineEnabled = isFactsPipelineEnabled();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Facts Pipeline Smoke Test</h1>
      
      {/* Feature Flag Banner */}
      <div className={`border rounded-lg p-4 mb-6 ${
        factsPipelineEnabled 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            factsPipelineEnabled ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span className={`font-semibold ${
            factsPipelineEnabled ? 'text-green-800' : 'text-red-800'
          }`}>
            FACTS_PIPELINE_ENABLED: {factsPipelineEnabled ? 'true' : 'false'}
          </span>
        </div>
        <p className={`text-sm mt-1 ${
          factsPipelineEnabled ? 'text-green-700' : 'text-red-700'
        }`}>
          {factsPipelineEnabled 
            ? 'Facts pipeline feature is enabled and available for testing.'
            : 'Facts pipeline feature is disabled. Some functionality may not work.'
          }
        </p>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">Organization Info</h2>
        <div className="text-sm space-y-1">
          <div><strong>Clerk User ID:</strong> {userId}</div>
          <div><strong>Clerk Org ID:</strong> {orgUuid}</div>
          <div><strong>Database Org UUID:</strong> {orgUuid}</div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Run Smoke Test</h2>
        {factsPipelineEnabled ? (
          <>
            <div className="flex gap-3">
              <form action={runSmokeTest}>
                <button 
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                  Run (Tableau vs Looker)
                </button>
              </form>
              <form action={async () => {
                "use server";
                await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/clear-cooldown`, { method: 'POST' });
              }}>
                <button 
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
                >
                  Clear Cooldown
                </button>
              </form>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              This will test the full facts pipeline: vendor resolution → data collection → comparison generation
            </p>
          </>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600">
              Smoke test functionality is disabled because FACTS_PIPELINE_ENABLED is set to false.
            </p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Recent Compare Runs</h2>
        {runsError ? (
          <div className="text-red-500">Error loading runs: {runsError.message}</div>
        ) : runs?.length ? (
          <div className="space-y-2">
            {runs.map((run: any) => (
              <div key={run.id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {run.you_vendor?.name || "Unknown"} vs {run.comp_vendor?.name || "Unknown"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(run.created_at).toLocaleString()}
                    </div>
                  </div>
                  <a 
                    href={`/app/compare/${run.id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View →
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No compare runs found. Run the smoke test above to create one.</p>
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
