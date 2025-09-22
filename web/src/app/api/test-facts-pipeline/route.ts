import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const sb = await createClient();
    
    // Try to insert a test vendor
    const { data, error } = await sb
      .from("vendors")
      .insert({
        name: "Test Vendor",
        website: "https://example.com",
        official_site_confidence: 90
      })
      .select()
      .single();
      
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: `Failed to insert test vendor: ${error.message}`,
        suggestion: "Run the migration: web/supabase/migrations/2025-09-21_facts_pipeline.sql"
      }, { status: 500 });
    }
    
    // Clean up the test record
    await sb.from("vendors").delete().eq("id", data.id);
    
    return NextResponse.json({ 
      success: true, 
      message: "Facts pipeline tables are working correctly",
      testVendorId: data.id
    });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}