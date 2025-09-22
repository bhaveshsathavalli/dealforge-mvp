import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withOrgScope } from "@/lib/org";

export async function POST() {
  try {
    return withOrgScope(async (orgId) => {
      const sb = await createClient();
      
      // Create test vendors
      const { data: youVendor, error: youError } = await sb
        .from("vendors")
        .insert({
          org_id: orgId,
          name: "Tableau",
          website: "https://tableau.com",
          official_site_confidence: 95
        })
        .select()
        .single();
      
      if (youError) {
        return NextResponse.json({ error: `Failed to create you vendor: ${youError.message}` }, { status: 500 });
      }
      
      const { data: compVendor, error: compError } = await sb
        .from("vendors")
        .insert({
          org_id: orgId,
          name: "Looker",
          website: "https://looker.com",
          official_site_confidence: 95
        })
        .select()
        .single();
      
      if (compError) {
        return NextResponse.json({ error: `Failed to create comp vendor: ${compError.message}` }, { status: 500 });
      }
      
      // Create compare run
      const { data: run, error: runError } = await sb
        .from("compare_runs")
        .insert({
          org_id: orgId,
          you_vendor_id: youVendor.id,
          comp_vendor_id: compVendor.id
        })
        .select()
        .single();
      
      if (runError) {
        return NextResponse.json({ error: `Failed to create run: ${runError.message}` }, { status: 500 });
      }
      
      // Create compare rows
      const { error: rowsError } = await sb
        .from("compare_rows")
        .insert([
          {
            run_id: run.id,
            metric: "pricing",
            you_text: "Starting at $75/user/month",
            comp_text: "Starting at $90/user/month",
            you_citations: [{"url": "https://tableau.com/pricing", "title": "Tableau Pricing"}],
            comp_citations: [{"url": "https://looker.com/pricing", "title": "Looker Pricing"}],
            answer_score_you: 0.9,
            answer_score_comp: 0.85
          },
          {
            run_id: run.id,
            metric: "features",
            you_text: "Drag-and-drop analytics, Real-time dashboards, Mobile support",
            comp_text: "SQL-based modeling, Embedded analytics, API-first approach",
            you_citations: [{"url": "https://tableau.com/features", "title": "Tableau Features"}],
            comp_citations: [{"url": "https://looker.com/features", "title": "Looker Features"}],
            answer_score_you: 0.85,
            answer_score_comp: 0.8
          }
        ]);
      
      if (rowsError) {
        return NextResponse.json({ error: `Failed to create rows: ${rowsError.message}` }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        runId: run.id,
        youVendor: youVendor.name,
        compVendor: compVendor.name,
        message: `✅ Created working comparison! Visit: http://localhost:3000/app/compare/${run.id}`
      });
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}