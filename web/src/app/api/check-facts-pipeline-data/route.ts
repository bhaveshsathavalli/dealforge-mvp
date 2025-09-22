import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/authz";

export async function GET() {
  try {
    const { orgId } = await requireOrg();
    const sb = await createClient();
    
    // Check if there are any compare runs
    const { data: runs, error: runsError } = await sb
      .from("compare_runs")
      .select(`
        id,
        org_id,
        created_at,
        vendors!compare_runs_you_vendor_id_fkey(name),
        vendors!compare_runs_comp_vendor_id_fkey(name)
      `)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5);
    
    if (runsError) {
      return NextResponse.json({ error: runsError.message }, { status: 500 });
    }
    
    // Check if there are any compare rows
    const { data: rows, error: rowsError } = await sb
      .from("compare_rows")
      .select("*")
      .limit(5);
    
    if (rowsError) {
      return NextResponse.json({ error: rowsError.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      orgId,
      compareRuns: runs || [],
      compareRows: rows || [],
      message: `Found ${runs?.length || 0} compare runs and ${rows?.length || 0} compare rows`
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
