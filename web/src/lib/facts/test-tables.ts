import { createClient } from "@/lib/supabase/server";

export async function testFactsTables() {
  const sb = await createClient();
  
  try {
    // Test vendors table
    const { data: vendors, error: vendorsError } = await sb
      .from("vendors")
      .select("id")
      .limit(1);
      
    if (vendorsError) {
      return { success: false, error: `Vendors table error: ${vendorsError.message}` };
    }
    
    // Test sources table
    const { data: sources, error: sourcesError } = await sb
      .from("sources")
      .select("id")
      .limit(1);
      
    if (sourcesError) {
      return { success: false, error: `Sources table error: ${sourcesError.message}` };
    }
    
    // Test facts table
    const { data: facts, error: factsError } = await sb
      .from("facts")
      .select("id")
      .limit(1);
      
    if (factsError) {
      return { success: false, error: `Facts table error: ${factsError.message}` };
    }
    
    // Test compare_runs table
    const { data: runs, error: runsError } = await sb
      .from("compare_runs")
      .select("id")
      .limit(1);
      
    if (runsError) {
      return { success: false, error: `Compare runs table error: ${runsError.message}` };
    }
    
    // Test compare_rows table
    const { data: rows, error: rowsError } = await sb
      .from("compare_rows")
      .select("id")
      .limit(1);
      
    if (rowsError) {
      return { success: false, error: `Compare rows table error: ${rowsError.message}` };
    }
    
    return { 
      success: true, 
      message: "All facts pipeline tables are accessible",
      tables: ["vendors", "sources", "facts", "compare_runs", "compare_rows"]
    };
    
  } catch (error) {
    return { 
      success: false, 
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}