import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const sb = await createClient();
    
    // Create a test comparison run
    const { data: run, error } = await sb
      .from("compare_runs")
      .insert({
        org_id: "org_32t4PH52hlsXG6uOhDvQKfzmUvg",
        you_vendor_id: "00000000-0000-0000-0000-000000000001", // dummy vendor ID
        comp_vendor_id: "00000000-0000-0000-0000-000000000002"  // dummy vendor ID
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Create some test compare rows
    await sb.from("compare_rows").insert([
      {
        run_id: run.id,
        metric: "pricing",
        you_text: "Starting at $99/month",
        comp_text: "Starting at $149/month",
        you_citations: [{"url": "https://example.com/pricing", "title": "Pricing"}],
        comp_citations: [{"url": "https://competitor.com/pricing", "title": "Pricing"}],
        answer_score_you: 0.85,
        answer_score_comp: 0.80
      },
      {
        run_id: run.id,
        metric: "features",
        you_text: "Advanced analytics, Real-time dashboards",
        comp_text: "Basic analytics, Static reports",
        you_citations: [{"url": "https://example.com/features", "title": "Features"}],
        comp_citations: [{"url": "https://competitor.com/features", "title": "Features"}],
        answer_score_you: 0.90,
        answer_score_comp: 0.70
      }
    ]);
    
    return NextResponse.json({ 
      success: true, 
      runId: run.id,
      message: `Created test comparison. Visit: http://localhost:3000/compare/${run.id}`
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
