import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgUuidFromClerk } from "@/lib/org/ids";

export async function GET(request: NextRequest) {
  try {
    const { orgUuid } = await getOrgUuidFromClerk();
    const sb = await createClient();
    
    // Get the runId from query params
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');
    
    if (!runId) {
      return NextResponse.json({ 
        success: false, 
        error: "runId parameter required" 
      }, { status: 400 });
    }
    
    console.log(`[DebugCompareRun] Looking for run: ${runId} in org: ${orgUuid}`);
    
    // Try to get the run
    const { data: run, error: runError } = await sb
      .from("compare_runs")
      .select("*")
      .eq("id", runId)
      .single();
      
    if (runError) {
      console.error(`[DebugCompareRun] Error loading run:`, runError);
      return NextResponse.json({ 
        success: false, 
        error: `Error loading run: ${runError.message}`,
        code: runError.code
      }, { status: 500 });
    }
    
    if (!run) {
      return NextResponse.json({ 
        success: false, 
        error: "Run not found",
        runId,
        orgUuid
      }, { status: 404 });
    }
    
    // Check if the run belongs to the current org
    if (run.org_id !== orgUuid) {
      return NextResponse.json({ 
        success: false, 
        error: "Run belongs to different org",
        runOrgId: run.org_id,
        currentOrgId: orgUuid
      }, { status: 403 });
    }
    
    // Get the rows
    const { data: rows, error: rowsError } = await sb
      .from("compare_rows")
      .select("*")
      .eq("run_id", runId);
      
    if (rowsError) {
      console.error(`[DebugCompareRun] Error loading rows:`, rowsError);
    }
    
    return NextResponse.json({ 
      success: true, 
      run,
      rows: rows || [],
      rowCount: rows?.length || 0
    });
    
  } catch (error) {
    console.error(`[DebugCompareRun] Unexpected error:`, error);
    return NextResponse.json({ 
      success: false, 
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}