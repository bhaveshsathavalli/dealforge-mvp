import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgUuidFromClerk } from "@/lib/org/ids";

export async function GET() {
  try {
    const { orgUuid, userId } = await getOrgUuidFromClerk();
    const sb = await createClient();
    
    console.log(`[debug-db] Testing with orgUuid: ${orgUuid}, userId: ${userId}`);
    
    // Test 1: Check if we can query orgs table
    const { data: orgData, error: orgError } = await sb
      .from("orgs")
      .select("id, name, clerk_org_id")
      .eq("id", orgUuid)
      .single();
    
    if (orgError) {
      console.error(`[debug-db] Org query error:`, orgError);
      return NextResponse.json({ 
        success: false, 
        error: `Org query failed: ${orgError.message}`,
        orgUuid,
        userId 
      }, { status: 500 });
    }
    
    console.log(`[debug-db] Org data:`, orgData);
    
    // Test 2: Try to insert a test vendor
    const { data: vendorData, error: vendorError } = await sb
      .from("vendors")
      .insert({
        org_id: orgUuid,
        name: `Test Vendor ${Date.now()}`,
        website: "https://test.com",
        official_site_confidence: 95
      })
      .select()
      .single();
    
    if (vendorError) {
      console.error(`[debug-db] Vendor insert error:`, vendorError);
      return NextResponse.json({ 
        success: false, 
        error: `Vendor insert failed: ${vendorError.message}`,
        orgData,
        orgUuid,
        userId 
      }, { status: 500 });
    }
    
    console.log(`[debug-db] Vendor created:`, vendorData);
    
    // Test 3: Try to query the vendor back
    const { data: vendorQuery, error: vendorQueryError } = await sb
      .from("vendors")
      .select("*")
      .eq("id", vendorData.id)
      .single();
    
    if (vendorQueryError) {
      console.error(`[debug-db] Vendor query error:`, vendorQueryError);
      return NextResponse.json({ 
        success: false, 
        error: `Vendor query failed: ${vendorQueryError.message}`,
        vendorData,
        orgData 
      }, { status: 500 });
    }
    
    // Clean up test vendor
    await sb.from("vendors").delete().eq("id", vendorData.id);
    
    return NextResponse.json({ 
      success: true, 
      message: "All database tests passed",
      orgData,
      vendorData,
      vendorQuery 
    });
    
  } catch (error: any) {
    console.error(`[debug-db] Unexpected error:`, error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
