import { ok, err } from "@/server/util/apiJson";
import { withOrgId, OrgContext } from "@/server/withOrg";
import { supabaseServer } from "@/lib/supabaseServer";
import crypto from "crypto";

export const GET = withOrgId(async (ctx: OrgContext, req: Request) => {
  try {
    const { orgId } = ctx;
    const sb = supabaseServer();
    
    // Use the injected orgId directly - no need to recompute

    // Get vendor count with explicit org filter
    let vendorCount = 0;
    if (orgId) {
      try {
        const { count } = await sb
          .from('vendors')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId);
        vendorCount = count || 0;
      } catch (e) {
        console.error('Pipeline health: vendor count failed', e);
      }
    }

    // Get counts by metric with explicit org filter
    const factsByMetric: Record<string, number> = {};
    if (orgId) {
      try {
        const { data: factsRows } = await sb
          .from('facts')
          .select('metric, count:count(*)')
          .eq('org_id', orgId)
          .group('metric');
        
        for (const row of factsRows || []) {
          factsByMetric[row.metric] = parseInt(row.count) || 0;
        }
      } catch (e) {
        console.error('Pipeline health: facts query failed', e);
      }
    }

    return ok({
      orgId,
      vendorCount,
      factsByMetric,
      flags: {
        FACTS_PIPELINE_ENABLED: process.env.FACTS_PIPELINE_ENABLED === 'true',
        FACTS_HEADLESS_ENABLED: process.env.FACTS_HEADLESS_ENABLED !== '0',
        hasJinaKey: !!process.env.JINA_API_KEY,
        hasReaderBase: !!process.env.READER_BASE,
        provider: process.env.PROVIDER || 'unknown'
      },
      traceId: crypto.randomUUID()
    });

  } catch (error) {
    console.error('Pipeline health endpoint error:', error);
    return err(500, 'Pipeline health check failed', { 
      traceId: crypto.randomUUID(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
