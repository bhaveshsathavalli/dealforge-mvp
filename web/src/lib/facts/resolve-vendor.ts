import { createClient } from "@/lib/supabase/server";
import { searchGoogleSerp } from "@/lib/collect/serp"; // you already have this wrapper function

function scoreCandidate(url: string, brand: string) {
  const host = url.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  let s = 0;
  if (host.includes(brand.toLowerCase().replace(/\s+/g, ""))) s += 80;
  if (/\.(io|com|ai|co|app)$/.test(host)) s += 10;
  if (/(g2\.com|capterra|medium\.com|youtube\.com|linkedin\.com|twitter\.com)/.test(host)) s -= 40;
  return s;
}

export async function resolveOfficialSite(orgId: string, vendorName: string) {
  const sb = await createClient();
  
  const { data: existing } = await sb
    .from("vendors")
    .select("*")
    .eq("org_id", orgId)
    .ilike("name", vendorName)
    .maybeSingle();
    
  if (existing?.website) return existing;
  
  const hits = await searchGoogleSerp(`"${vendorName}" official site`);
  let best = { url: "", score: -999 };
  
  for (const h of hits ?? []) {
    const url = (h.link || h.source_url || "").trim();
    const sc = scoreCandidate(url, vendorName);
    if (sc > best.score) best = { url, score: sc };
  }
  
  const website = best.score >= 70 ? best.url : null;
  
  const { data, error } = await sb
    .from("vendors")
    .insert({
      org_id: orgId,
      name: vendorName,
      website,
      official_site_confidence: best.score
    })
    .select()
    .single();
    
  if (error) {
    console.error(`[resolveOfficialSite] Error inserting vendor:`, error);
    throw new Error(`Failed to create vendor: ${error.message}`);
  }
    
  return data;
}