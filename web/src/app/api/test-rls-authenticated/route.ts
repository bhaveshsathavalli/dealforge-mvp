import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/authz";

export async function POST() {
  try {
    const { orgId } = await requireOrg();
    const sb = await createClient();
    
    // Test if we can read from vendors table
    const { data: vendors, error } = await sb
      .from("vendors")
      .select("id, name")
      .limit(1);
    
    if (error) {
      return NextResponse.json({ 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      vendors,
      orgId,
      message: "RLS policies are working correctly!"
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
