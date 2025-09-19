import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const sb = supabaseServer();
    
    // Use raw SQL to get schema information
    const { data: columns, error } = await sb.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'query_runs' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    });
    
    if (error) {
      // Fallback: try to get sample data to understand structure
      const { data: sampleData, error: sampleError } = await sb
        .from("query_runs")
        .select("*")
        .limit(1);
      
      return NextResponse.json({
        ok: false,
        error: error,
        sampleData: sampleData,
        sampleError: sampleError,
        message: "Failed to get schema info, showing sample data instead"
      });
    }
    
    // Also try to get a sample row to see what's actually in the table
    const { data: sampleData, error: sampleError } = await sb
      .from("query_runs")
      .select("*")
      .limit(1);
    
    return NextResponse.json({
      ok: true,
      schema: columns,
      sampleData: sampleData,
      sampleError: sampleError
    });
    
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: String(err),
      message: "Unexpected error occurred"
    });
  }
}
