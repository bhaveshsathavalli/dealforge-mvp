import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');
    
    if (!runId) {
      return NextResponse.json({ error: "runId parameter required" }, { status: 400 });
    }
    
    const sb = await createClient();
    
    // Check if the run exists in the old system
    const { data: oldRun, error: oldError } = await sb
      .from("query_runs")
      .select("id, org_id, query_text, status")
      .eq("id", runId)
      .single();
    
    // Check if the run exists in the new facts pipeline
    const { data: newRun, error: newError } = await sb
      .from("compare_runs")
      .select("id, org_id, you_vendor_id, comp_vendor_id")
      .eq("id", runId)
      .single();
    
    return NextResponse.json({
      runId,
      oldSystem: {
        exists: !!oldRun,
        data: oldRun,
        error: oldError?.message
      },
      newSystem: {
        exists: !!newRun,
        data: newRun,
        error: newError?.message
      }
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
