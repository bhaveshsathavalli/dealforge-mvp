import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const sb = await createClient();
    
    // Try to query existing tables that should exist
    const results = {};
    
    // Check query_runs table
    try {
      const { data, error } = await sb.from("query_runs").select("id").limit(1);
      results.query_runs = { exists: !error, error: error?.message };
    } catch (e) {
      results.query_runs = { exists: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
    
    // Check raw_hits table
    try {
      const { data, error } = await sb.from("raw_hits").select("id").limit(1);
      results.raw_hits = { exists: !error, error: error?.message };
    } catch (e) {
      results.raw_hits = { exists: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
    
    // Check vendors table (facts pipeline)
    try {
      const { data, error } = await sb.from("vendors").select("id").limit(1);
      results.vendors = { exists: !error, error: error?.message };
    } catch (e) {
      results.vendors = { exists: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
    
    // Check compare_runs table (facts pipeline)
    try {
      const { data, error } = await sb.from("compare_runs").select("id").limit(1);
      results.compare_runs = { exists: !error, error: error?.message };
    } catch (e) {
      results.compare_runs = { exists: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
    
    return NextResponse.json({ 
      success: true, 
      tables: results,
      message: "Database table status"
    });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}