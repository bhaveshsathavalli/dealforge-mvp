import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const { userId, orgId } = await auth();
  
  console.log("[api/runs/list] Auth check:", { userId: !!userId, orgId });
  
  if (!userId) {
    console.log("[api/runs/list] No userId, returning 401");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  
  if (!orgId) {
    console.log("[api/runs/list] No orgId, returning 400");
    return NextResponse.json({ error: "no_org" }, { status: 400 });
  }

  try {
    const sb = supabaseServer();
    const { data, error } = await sb
      .from("query_runs")
      .select("id, query_text, status, created_at, cost_cents, latency_ms")
      .eq("clerk_org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[api/runs/list] database error:", error);
      
      // If it's a permission error, return empty results instead of failing
      if (error.code === '42501') {
        console.log("[api/runs/list] Database not set up yet, returning empty results");
        return NextResponse.json({ runs: [] });
      }
      
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    console.log("[api/runs/list] Successfully fetched runs:", data?.length || 0);
    return NextResponse.json({ runs: data || [] });
  } catch (err) {
    console.error("[api/runs/list] unexpected error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
