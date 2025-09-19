import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { collectForRun } from "@/lib/collect/adapter";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  
  console.log("[api/runs/start] Auth check:", { userId: !!userId, orgId });
  
  if (!userId) {
    console.log("[api/runs/start] No userId, returning 401");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    console.log("[api/runs/start] No orgId, returning 400");
    return NextResponse.json({ error: "no_org" }, { status: 400 });
  }

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
        org_id: "24380377-0628-4469-83e0-2422a1a883d8", // Use existing org UUID
        clerk_org_id: orgId,
        clerk_user_id: userId
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