import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const sb = supabaseServer();
    
    // Check what's in the orgs table
    const { data: orgsData, error: orgsError } = await sb
      .from("orgs")
      .select("*")
      .limit(5);
    
    // Check what's in the query_runs table
    const { data: runsData, error: runsError } = await sb
      .from("query_runs")
      .select("*")
      .limit(5);
    
    return NextResponse.json({
      ok: true,
      orgs: {
        data: orgsData,
        error: orgsError
      },
      runs: {
        data: runsData,
        error: runsError
      }
    });
    
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: String(err),
      message: "Unexpected error occurred"
    });
  }
}
