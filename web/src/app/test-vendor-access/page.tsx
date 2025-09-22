import { createClient } from "@/lib/supabase/server";
import { getOrgUuidFromClerk } from "@/lib/org/ids";

export const dynamic = "force-dynamic";

export default async function TestVendorAccessPage() {
  try {
    const { orgUuid } = await getOrgUuidFromClerk();
    const sb = await createClient();
    
    // Try to query vendors table
    const { data: vendors, error: vendorsError } = await sb
      .from("vendors")
      .select("id, name, org_id")
      .limit(5);
      
    if (vendorsError) {
      return (
        <div className="p-6">
          <h1 className="text-xl font-bold mb-4">Vendor Access Test</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">Error accessing vendors table: {vendorsError.message}</p>
            <p className="text-red-600 text-sm mt-2">Code: {vendorsError.code}</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">Vendor Access Test</h1>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold text-green-800 mb-2">Success</h2>
          <p className="text-green-700">Vendors table is accessible!</p>
          <p className="text-green-600 text-sm mt-2">Org UUID: {orgUuid}</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Vendors Found</h2>
          {vendors?.length ? (
            <ul className="space-y-2">
              {vendors.map((vendor: any) => (
                <li key={vendor.id} className="text-blue-700">
                  <strong>{vendor.name}</strong> (ID: {vendor.id}, Org: {vendor.org_id})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-blue-600">No vendors found</p>
          )}
        </div>
      </div>
    );
    
  } catch (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">Vendor Access Test</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Unexpected Error</h2>
          <p className="text-red-700">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }
}
