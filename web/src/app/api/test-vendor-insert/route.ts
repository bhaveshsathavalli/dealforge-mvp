import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgUuidFromClerk } from "@/lib/org/ids";

export async function POST(request: NextRequest) {
  try {
    const { orgUuid } = await getOrgUuidFromClerk();
    const sb = await createClient();
    
    // Try to insert a test vendor
    const { data: vendor, error } = await sb
      .from("vendors")
      .insert({
        org_id: orgUuid,
        name: "Test Vendor",
        website: "https://test.com",
        official_site_confidence: 90
      })
      .select()
      .single();
      
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: `Failed to insert vendor: ${error.message}`,
        code: error.code
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      vendor,
      message: "Vendor inserted successfully"
    });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
