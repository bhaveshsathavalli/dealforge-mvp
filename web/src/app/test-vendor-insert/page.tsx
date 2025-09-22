import { createClient } from "@/lib/supabase/server";
import { getOrgUuidFromClerk } from "@/lib/org/ids";

export const dynamic = "force-dynamic";

export default async function TestVendorInsertPage() {
  try {
    const { orgUuid } = await getOrgUuidFromClerk();
    const sb = await createClient();
    
    // Try to insert a test vendor directly
    const { data: vendor, error } = await sb
      .from("vendors")
      .insert({
        org_id: orgUuid,
        name: "Test Vendor Direct",
        website: "https://test-direct.com",
        official_site_confidence: 90
      })
      .select()
      .single();
      
    if (error) {
      return (
        <div className="p-6">
          <h1 className="text-xl font-bold mb-4">Test Vendor Insert</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">Failed to insert vendor: {error.message}</p>
            <p className="text-red-600 text-sm mt-2">Code: {error.code}</p>
            <p className="text-red-600 text-sm">Org UUID: {orgUuid}</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">Test Vendor Insert</h1>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-green-800 mb-2">Success</h2>
          <p className="text-green-700">Vendor inserted successfully!</p>
          <p className="text-green-600 text-sm mt-2">Vendor ID: {vendor.id}</p>
          <p className="text-green-600 text-sm">Org UUID: {orgUuid}</p>
        </div>
      </div>
    );
    
  } catch (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">Test Vendor Insert</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Unexpected Error</h2>
          <p className="text-red-700">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }
}
