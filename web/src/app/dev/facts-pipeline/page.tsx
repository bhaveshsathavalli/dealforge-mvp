import { createClient } from "@/lib/supabase/server";
import { getOrgUuidFromClerk } from "@/lib/org/ids";
import { runFactsPipelineAction, clearCooldownAction, addTestCompetitorAction } from "./actions";
import { supabaseAdmin } from "@/server/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { isFactsPipelineEnabled } from "@/lib/flags";

export default async function FactsPipelineTestPage() {
  const factsPipelineEnabled = isFactsPipelineEnabled();
  
  if (!factsPipelineEnabled) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
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

  const { orgUuid, userId } = await getOrgUuidFromClerk();
  const { orgId } = await auth();
  const sb = await createClient();
  
  // Get your product info
  const { data: orgData } = await sb
    .from("orgs")
    .select("product_name, product_website")
    .eq("id", orgUuid)
    .single();

  // Get competitors using the same approach as the competitors API
  const { data: competitors } = await supabaseAdmin
    .from('competitors')
    .select('id, name, website, slug, active, aliases')
    .eq('org_id', orgUuid)
    .eq('active', true)
    .order('created_at', { ascending: false });

  // Get recent facts pipeline runs
  const { data: factsRuns } = await sb
    .from("compare_runs")
    .select(`
      id,
      org_id,
      created_at,
      version,
      you_vendor:vendors!compare_runs_you_vendor_id_fkey(name),
      comp_vendor:vendors!compare_runs_comp_vendor_id_fkey(name)
    `)
    .eq("org_id", orgUuid)
    .order("created_at", { ascending: false })
    .limit(10);


  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Facts Pipeline Test</h1>
      
      {/* Product Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">Your Product</h2>
        <div className="text-sm space-y-1">
          <div><strong>Product Name:</strong> {orgData?.product_name || "Not set"}</div>
          <div><strong>Product Website:</strong> {orgData?.product_website || "Not set"}</div>
          <div><strong>Org UUID:</strong> {orgUuid}</div>
        </div>
        {!orgData?.product_name && (
          <div className="mt-2 text-red-600 text-sm">
            ⚠️ Please set your Product Name in Settings first
          </div>
        )}
      </div>

      {/* Competitors */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Run Facts Pipeline</h2>
        <p className="text-sm text-gray-600 mb-4">
          Test the facts pipeline with your actual product vs competitors
        </p>
        
        {competitors?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitors.map((comp: any) => (
              <div key={comp.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{comp.name}</h3>
                  <span className="text-xs text-gray-500">{comp.website || "No website"}</span>
                </div>
                <div className="flex gap-2">
                  <form action={runFactsPipelineAction.bind(null, comp.id)}>
                    <button 
                      type="submit"
                      disabled={!orgData?.product_name}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium py-1 px-3 rounded"
                    >
                      Run Pipeline
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-gray-500">
              No competitors found. Add a test competitor below to test the facts pipeline:
            </div>
            <form action={addTestCompetitorAction} className="flex gap-2">
              <input 
                name="name"
                placeholder="Competitor name (e.g., Power BI)" 
                className="flex-1 border border-gray-300 rounded px-3 py-2" 
                required 
              />
              <input 
                name="website"
                placeholder="Website (optional)" 
                className="flex-1 border border-gray-300 rounded px-3 py-2" 
              />
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
              >
                Add Test Competitor
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Controls</h2>
        <div className="flex gap-3">
          <form action={clearCooldownAction}>
            <button 
              type="submit"
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded"
            >
              Clear Cooldown
            </button>
          </form>
          <a 
            href="/app/settings"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded inline-block"
          >
            Settings
          </a>
          <a 
            href="/app/competitors"
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded inline-block"
          >
            Manage Competitors
          </a>
        </div>
      </div>

      {/* Recent Facts Pipeline Runs */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Recent Facts Pipeline Runs</h2>
        {factsRuns?.length ? (
          <div className="space-y-2">
            {factsRuns.map((run: any) => (
              <div key={run.id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {run.you_vendor?.name || "Unknown"} vs {run.comp_vendor?.name || "Unknown"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(run.created_at).toLocaleString()} • v{run.version}
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
          <p className="text-gray-500">No facts pipeline runs yet. Run a comparison above to create one.</p>
        )}
      </div>

      {/* Expected Results */}
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
