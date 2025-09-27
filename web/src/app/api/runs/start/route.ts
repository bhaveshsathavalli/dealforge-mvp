import { NextResponse } from "next/server";
import { withOrg } from "@/server/withOrg";
import { supabaseServer } from "@/lib/supabaseServer";
import { collectForRun } from "@/lib/collect/adapter";
import { randomUUID } from "crypto";

export const POST = withOrg(async ({ orgId, clerkUserId }, req: Request) => {
  const { query } = await req.json();
  if (!query || typeof query !== "string") {
    console.log("[api/runs/start] Invalid query:", query);
    return NextResponse.json({ error: "bad_query" }, { status: 400 });
  }

  try {
    const sb = supabaseServer();
    const { data, error } = await sb
      .from("query_runs")
      .insert({ 
        query_text: query, 
        status: "collecting", 
        org_id: orgId,
        clerk_org_id: null, // We're using internal org_id now
        clerk_user_id: clerkUserId
      })
      .select("id")
      .single();

    if (error) {
      console.error("[api/runs/start] insert error:", error);
      
      // If it's a permission error, return a helpful message
      if (error.code === '42501') {
        return NextResponse.json({ 
          error: "database_not_setup", 
          message: "Database tables not set up yet. Please configure Supabase tables first." 
        }, { status: 503 });
      }
      
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    if (!data) {
      console.error("[api/runs/start] No data returned from insert");
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    console.log("[api/runs/start] Successfully created run:", data.id);

    // Fire-and-forget collection
    setTimeout(() => {
      collectForRun(data.id, query).catch(err => {
        console.error("[api/runs/start] Collection failed:", err);
      });
    }, 0);

    return NextResponse.json({ runId: data.id, status: "collecting" });
  } catch (err) {
    console.error("[api/runs/start] unexpected error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}