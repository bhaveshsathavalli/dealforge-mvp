import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const sb = supabaseServer();
    
    // Test basic connection
    const { data: testData, error: testError } = await sb
      .from("query_runs")
      .select("count")
      .limit(1);
    
    if (testError) {
      console.error("[db-test] Error:", testError);
      return NextResponse.json({
        ok: false,
        error: testError,
        message: "Database connection failed",
        details: {
          code: testError.code,
          message: testError.message,
          hint: testError.hint
        }
      });
    }
    
    // Test insert permission
    const { data: insertData, error: insertError } = await sb
      .from("query_runs")
      .insert({
        query_text: "test query",
        status: "test",
        org_id: "24380377-0628-4469-83e0-2422a1a883d8", // Use existing org UUID
        clerk_org_id: "test_org",
        clerk_user_id: "test_user"
      })
      .select("id")
      .single();
    
    if (insertError) {
      console.error("[db-test] Insert error:", insertError);
      return NextResponse.json({
        ok: false,
        error: insertError,
        message: "Database insert failed",
        details: {
          code: insertError.code,
          message: insertError.message,
          hint: insertError.hint
        }
      });
    }
    
    // Clean up test data
    await sb.from("query_runs").delete().eq("id", insertData.id);
    
    return NextResponse.json({
      ok: true,
      message: "Database connection successful",
      testData,
      insertData
    });
    
  } catch (err) {
    console.error("[db-test] Unexpected error:", err);
    return NextResponse.json({
      ok: false,
      error: String(err),
      message: "Unexpected error occurred"
    });
  }
}
