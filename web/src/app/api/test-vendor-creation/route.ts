import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const sb = await createClient();
    
    // Test if we can create a vendor
    const { data: vendor, error } = await sb
      .from("vendors")
      .insert({
        org_id: "org_32t4PH52hlsXG6uOhDvQKfzmUvg",
        name: "Test Vendor",
        website: "https://example.com"
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, vendor });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
