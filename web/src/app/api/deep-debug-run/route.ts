import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/authz";

export async function GET(request: Request) {
  try {
    const { orgId } = await requireOrg();
    const sb = await createClient();
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');
    
    if (!runId) {
      return NextResponse.json({ error: "runId parameter required" }, { status: 400 });
    }
    
    // Check old system
    const { data: oldRun, error: oldError } = await sb
      .from("query_runs")
      .select("id, org_id, query_text, status, created_at")
      .eq("id", runId)
      .single();
    
    // Check new system
    const { data: newRun, error: newError } = await sb
      .from("compare_runs")
      .select("id, org_id, you_vendor_id, comp_vendor_id, created_at")
      .eq("id", runId)
      .single();
    
    // Check if there are any compare_rows for this run
    const { data: rows, error: rowsError } = await sb
      .from("compare_rows")
      .select("*")
      .eq("run_id", runId);
    
    return NextResponse.json({
      runId,
      orgId,
      oldSystem: {
        exists: !!oldRun,
        data: oldRun,
        error: oldError?.message
      },
      newSystem: {
        exists: !!newRun,
        data: newRun,
        error: newError?.message
      },
      compareRows: {
        count: rows?.length || 0,
        data: rows,
        error: rowsError?.message
      }
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
