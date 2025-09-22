import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withOrgScope } from "@/lib/org";

export async function POST() {
  try {
    return withOrgScope(async (orgId) => {
      const sb = await createClient();
      
      // Test inserting into each facts pipeline table
      const results: Record<string, any> = {};
      
      // Test vendors table
      try {
        const { data: vendor, error } = await sb
          .from("vendors")
          .insert({
            org_id: null, // Global vendor for testing
            name: "Test Vendor",
            website: "https://test.com",
            official_site_confidence: 95
          })
          .select()
          .single();
        
        if (error) throw error;
        results.vendors = { success: true, id: vendor.id };
        
        // Test sources table
        const { data: source, error: sourceError } = await sb
          .from("sources")
          .insert({
            org_id: orgId,
            vendor_id: vendor.id,
            metric: "pricing",
            url: "https://test.com/pricing",
            title: "Test Pricing",
            body: "Test body content",
            body_hash: "test_hash_123",
            first_party: true,
            source_score: 0.9
          })
          .select()
          .single();
        
        if (sourceError) throw sourceError;
        results.sources = { success: true, id: source.id };
        
        // Test facts table
        const { data: fact, error: factError } = await sb
          .from("facts")
          .insert({
            org_id: orgId,
            vendor_id: vendor.id,
            metric: "pricing",
            key: "test_price",
            value: "$99/month",
            text_summary: "Test pricing fact",
            citations: [{"url": "https://test.com/pricing", "title": "Pricing"}],
            fact_score: 0.9
          })
          .select()
          .single();
        
        if (factError) throw factError;
        results.facts = { success: true, id: fact.id };
        
        // Test compare_runs table
        const { data: run, error: runError } = await sb
          .from("compare_runs")
          .insert({
            org_id: orgId,
            you_vendor_id: vendor.id,
            comp_vendor_id: vendor.id,
            version: 1
          })
          .select()
          .single();
        
        if (runError) throw runError;
        results.compare_runs = { success: true, id: run.id };
        
        // Test compare_rows table
        const { data: row, error: rowError } = await sb
          .from("compare_rows")
          .insert({
            run_id: run.id,
            metric: "pricing",
            you_text: "Test pricing",
            comp_text: "Test competitor pricing",
            you_citations: [{"url": "https://test.com/pricing", "title": "Pricing"}],
            comp_citations: [{"url": "https://competitor.com/pricing", "title": "Pricing"}],
            answer_score_you: 0.9,
            answer_score_comp: 0.8
          })
          .select()
          .single();
        
        if (rowError) throw rowError;
        results.compare_rows = { success: true, id: row.id };
        
        // Test battlecard_bullets table
        const { data: bullet, error: bulletError } = await sb
          .from("battlecard_bullets")
          .insert({
            run_id: run.id,
            section: "differentiators",
            text: "Test differentiator",
            citations: [{"url": "https://test.com/features", "title": "Features"}],
            answer_score: 0.8,
            persona: "SE"
          })
          .select()
          .single();
        
        if (bulletError) throw bulletError;
        results.battlecard_bullets = { success: true, id: bullet.id };
        
        // Test update_events table
        const { data: event, error: eventError } = await sb
          .from("update_events")
          .insert({
            org_id: orgId,
            vendor_id: vendor.id,
            metric: "pricing",
            type: "PRICE_CHANGE",
            old: {"price": "$89/month"},
            new: {"price": "$99/month"},
            severity: 2,
            source_ids: [source.id]
          })
          .select()
          .single();
        
        if (eventError) throw eventError;
        results.update_events = { success: true, id: event.id };
        
      } catch (error) {
        results.error = error instanceof Error ? error.message : "Unknown error";
      }
      
      return NextResponse.json({ 
        success: true, 
        results,
        message: "RLS write tests completed"
      });
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}