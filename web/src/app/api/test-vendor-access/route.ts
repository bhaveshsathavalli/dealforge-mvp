import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const sb = await createClient();
    
    // Try to query vendors table directly
    const { data: vendors, error: vendorsError } = await sb
      .from("vendors")
      .select("id, name")
      .limit(1);
      
    if (vendorsError) {
      return NextResponse.json({ 
        success: false, 
        error: `Vendors table error: ${vendorsError.message}`,
        code: vendorsError.code
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Vendors table is accessible",
      vendors: vendors || []
    });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
