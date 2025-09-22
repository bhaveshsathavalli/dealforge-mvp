import { createClient } from "@/lib/supabase/server";
import { getOrgUuidFromClerk } from "@/lib/org/ids";

export const dynamic = "force-dynamic";

export default async function DebugCompetitorsPage() {
  try {
    const { orgUuid } = await getOrgUuidFromClerk();
    const sb = await createClient();
    
    // Check competitors table
    const { data: competitors, error: competitorsError } = await sb
      .from("competitors")
      .select("id, name, website, org_id, active")
      .eq("org_id", orgUuid);
      
    // Check all competitors (without org filter)
    const { data: allCompetitors, error: allCompetitorsError } = await sb
      .from("competitors")
      .select("id, name, website, org_id, active")
      .limit(10);
    
    // Check orgs table
    const { data: orgs, error: orgsError } = await sb
      .from("orgs")
      .select("id, name, clerk_org_id, product_name")
      .limit(5);
    
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">Debug Competitors</h1>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Current Org Info</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p><strong>Org UUID:</strong> {orgUuid}</p>
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Competitors for Current Org</h2>
          {competitorsError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">Error: {competitorsError.message}</p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700">Found {competitors?.length || 0} competitors</p>
              {competitors?.length ? (
                <ul className="mt-2 space-y-1">
                  {competitors.map((comp: any) => (
                    <li key={comp.id} className="text-green-600">
                      {comp.name} (ID: {comp.id}, Active: {comp.active ? 'Yes' : 'No'})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-green-600">No competitors found for this org</p>
              )}
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">All Competitors (First 10)</h2>
          {allCompetitorsError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">Error: {allCompetitorsError.message}</p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-700">Found {allCompetitors?.length || 0} total competitors</p>
              {allCompetitors?.length ? (
                <ul className="mt-2 space-y-1">
                  {allCompetitors.map((comp: any) => (
                    <li key={comp.id} className="text-yellow-600">
                      {comp.name} (Org: {comp.org_id}, Active: {comp.active ? 'Yes' : 'No'})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-yellow-600">No competitors found in database</p>
              )}
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Organizations</h2>
          {orgsError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">Error: {orgsError.message}</p>
            </div>
          ) : (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-purple-700">Found {orgs?.length || 0} organizations</p>
              {orgs?.length ? (
                <ul className="mt-2 space-y-1">
                  {orgs.map((org: any) => (
                    <li key={org.id} className="text-purple-600">
                      {org.name} (ID: {org.id}, Clerk: {org.clerk_org_id}, Product: {org.product_name})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-purple-600">No organizations found</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
    
  } catch (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">Debug Competitors</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Unexpected Error</h2>
          <p className="text-red-700">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }
}
