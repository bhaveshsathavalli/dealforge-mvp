import { supabaseServer } from "@/lib/supabaseServer";
import { requireOrg } from "@/lib/authz";

export type Citation = { 
  url: string; 
  title?: string; 
  quote?: string; 
  user_added?: boolean;
}

export type CompareRow = { 
  metric: string; 
  you: string; 
  competitor: string; 
  citations: Citation[] 
}

// Stable metric order and keyword classification
const METRIC_ORDER = ["Pricing","Features & Plans","Integrations","Usage Limits","Reporting & Analytics","Security"] as const;

const KEYWORDS: Record<(typeof METRIC_ORDER)[number], string[]> = {
  "Pricing": ["price","pricing","cost","per month","per seat","plan","free trial","tier"],
  "Features & Plans": ["feature","plan","package","capability","module"],
  "Integrations": ["integrat","api","salesforce","hubspot","zapier","crm","webhook","sdk"],
  "Usage Limits": ["limit","quota","cap","api call","seat limit","storage","throughput","rate limit"],
  "Reporting & Analytics": ["report","analytics","dashboard","insight","kpi","metric"],
  "Security": ["soc","iso","hipaa","gdpr","encryp","sso","scim","compliance","security"]
};

// Helper functions
function hostFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
  } catch {
    return '';
  }
}

function isVendor(url: string, domain?: string): boolean {
  if (!domain) return false;
  const urlHost = hostFromUrl(url);
  const domainHost = hostFromUrl(domain);
  return urlHost === domainHost || urlHost.endsWith('.' + domainHost);
}

function pickTopCitations(cites: Citation[], domain?: string, max = 3): Citation[] {
  // Dedupe by normalized URL
  const seen = new Set<string>();
  const deduped = cites.filter(cite => {
    const normalized = hostFromUrl(cite.url);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  // Sort: vendor domains first, then others
  const sorted = deduped.sort((a, b) => {
    const aIsVendor = domain ? isVendor(a.url, domain) : false;
    const bIsVendor = domain ? isVendor(b.url, domain) : false;
    if (aIsVendor && !bIsVendor) return -1;
    if (!aIsVendor && bIsVendor) return 1;
    return 0;
  });

  return sorted.slice(0, max);
}

function classifyMetric(text: string): (typeof METRIC_ORDER)[number] {
  const lowerText = text.toLowerCase();
  
  // Find longest matching keyword for each metric
  let bestMatch: (typeof METRIC_ORDER)[number] = "Features & Plans";
  let longestMatch = 0;
  
  for (const metric of METRIC_ORDER) {
    for (const keyword of KEYWORDS[metric]) {
      if (lowerText.includes(keyword) && keyword.length > longestMatch) {
        bestMatch = metric;
        longestMatch = keyword.length;
      }
    }
  }
  
  return bestMatch;
}

function inferFromQuery(query: string, side: "you" | "competitor"): string {
  const vsMatch = query.match(/(.+?)\s+vs\s+(.+)/i);
  if (vsMatch) {
    return side === "you" ? vsMatch[1].trim() : vsMatch[2].trim();
  }
  return side === "you" ? "Your Product" : "Competitor";
}

function bestText(claims: Array<{text: string, citations: Citation[]}>, preferredDomain?: string): string {
  if (claims.length === 0) return "";
  
  // Filter to sentences between 8-40 words
  const validClaims = claims.filter(claim => {
    const wordCount = claim.text.split(/\s+/).length;
    return wordCount >= 8 && wordCount <= 40;
  });
  
  if (validClaims.length === 0) {
    // Fallback to any non-empty text
    const fallback = claims.find(claim => claim.text.trim().length > 0);
    return fallback?.text || "";
  }
  
  // Prefer claims with vendor domain citations
  if (preferredDomain) {
    const vendorClaim = validClaims.find(claim => 
      claim.citations.some(cite => isVendor(cite.url, preferredDomain))
    );
    if (vendorClaim) return vendorClaim.text;
  }
  
  // Return shortest valid claim
  return validClaims.reduce((shortest, current) => 
    current.text.length < shortest.text.length ? current : shortest
  ).text;
}

export async function buildCompareTable(runId: string): Promise<CompareRow[]> {
  const { orgId } = await requireOrg();
  const sb = supabaseServer();

  try {
    // Load the run and its context
    const { data: run, error: runErr } = await sb
      .from("query_runs")
      .select("id, status, clerk_org_id, query_text, created_at, run_context")
      .eq("id", runId)
      .single();

    if (runErr) throw new Error(`Run not found: ${runErr.message}`);
    if (!run || run.clerk_org_id !== orgId) throw new Error("Run not found or access denied");

    const ctx = run?.run_context ?? {};
    const youName = ctx.you ?? inferFromQuery(run?.query_text, "you");
    const compName = ctx.competitor ?? inferFromQuery(run?.query_text, "competitor");
    const youSite = ctx.you_site ?? null;
    const compSite = ctx.competitor_site ?? null;

    // Load raw hits data (this is what's actually available)
    const { data: hits, error: hitsErr } = await sb
      .from("raw_hits")
      .select(`
        id,
        source_url,
        title,
        text_snippet,
        rank
      `)
      .eq("run_id", runId)
      .order("rank", { ascending: true })
      .limit(20); // Limit to top 20 hits

    if (hitsErr) throw new Error(`Failed to fetch hits: ${hitsErr.message}`);
    if (!hits || hits.length === 0) return [];

    // Convert raw hits to "claims" for processing
    const enrichedClaims = hits.map(hit => {
      // Create a citation from the hit
      const citation: Citation = {
        url: hit.source_url,
        title: hit.title || hit.source_url,
        quote: hit.text_snippet || hit.title || "",
        user_added: isVendor(hit.source_url, youSite) || isVendor(hit.source_url, compSite)
      };

      // Infer side based on content
      let side: "you" | "competitor" | "unassigned" = "unassigned";
      const lowerText = (hit.text_snippet || hit.title || "").toLowerCase();
      const lowerYouName = youName.toLowerCase();
      const lowerCompName = compName.toLowerCase();
      
      if (lowerText.includes(lowerCompName) || (compSite && lowerText.includes(hostFromUrl(compSite)))) {
        side = "competitor";
      } else if (lowerText.includes(lowerYouName) || (youSite && lowerText.includes(hostFromUrl(youSite)))) {
        side = "you";
      }

      return {
        text: hit.text_snippet || hit.title || hit.source_url,
        side,
        citations: [citation]
      };
    });

    // Bucket claims by metric
    const metricBuckets = new Map<string, Array<typeof enrichedClaims[0]>>();
    
    for (const claim of enrichedClaims) {
      const metric = classifyMetric(claim.text);
      if (!metricBuckets.has(metric)) {
        metricBuckets.set(metric, []);
      }
      metricBuckets.get(metric)!.push(claim);
    }

    // Build rows for each metric in order
    const rows: CompareRow[] = [];
    
    for (const metric of METRIC_ORDER) {
      const claims = metricBuckets.get(metric) || [];
      
      // Split into you vs competitor piles
      const youClaims = claims.filter(c => c.side === "you");
      const compClaims = claims.filter(c => c.side === "competitor");
      
      // Get best text for each side
      const youText = bestText(youClaims.map(c => ({ text: c.text, citations: c.citations })), youSite);
      const compText = bestText(compClaims.map(c => ({ text: c.text, citations: c.citations })), compSite);
      
      // Skip if both sides are empty
      if (!youText && !compText) continue;
      
      // Collect all citations for this metric
      const allCitations = [...youClaims, ...compClaims]
        .flatMap(c => c.citations);
      
      rows.push({
        metric,
        you: youText || "—",
        competitor: compText || "—",
        citations: pickTopCitations(allCitations, undefined, 3)
      });
    }

    // Second pass: if we have < 3 rows, try to fill gaps with unassigned claims
    if (rows.length < 3) {
      const unassignedClaims = enrichedClaims.filter(c => c.side === "unassigned");
      
      for (const metric of METRIC_ORDER) {
        if (rows.some(r => r.metric === metric)) continue; // Already have this metric
        
        const metricClaims = unassignedClaims.filter(c => classifyMetric(c.text) === metric);
        if (metricClaims.length === 0) continue;
        
        // Use first claim for both sides if we have no data
        const claim = metricClaims[0];
        const allCitations = metricClaims.flatMap(c => c.citations);
        
        rows.push({
          metric,
          you: claim.text || "—",
          competitor: "—",
          citations: pickTopCitations(allCitations, undefined, 3)
        });
        
        if (rows.length >= 3) break;
      }
    }

    // Ensure we have at least some rows
    if (rows.length === 0) {
      // Fallback: create generic rows from any available claims
      const fallbackClaims = enrichedClaims.slice(0, 6); // Take first 6 claims
      
      for (let i = 0; i < Math.min(3, fallbackClaims.length); i += 2) {
        const youClaim = fallbackClaims[i];
        const compClaim = fallbackClaims[i + 1] || fallbackClaims[i];
        
        rows.push({
          metric: `Feature ${Math.floor(i / 2) + 1}`,
          you: youClaim?.text || "—",
          competitor: compClaim?.text || "—",
          citations: pickTopCitations([
            ...(youClaim?.citations || []),
            ...(compClaim?.citations || [])
          ], undefined, 3)
        });
      }
    }

    return rows;

  } catch (error) {
    console.error('[buildCompareTable] Error:', error);
    return [];
  }
}
