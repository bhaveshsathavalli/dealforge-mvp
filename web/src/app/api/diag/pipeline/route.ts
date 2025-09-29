import { ok, err } from "@/server/util/apiJson";
import { auth } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabaseServer";
import crypto from "crypto";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return err(401, "Not authenticated");
    }

    const sb = supabaseServer();
    
    // Get org info
    let orgId: string | null = null;
    try {
      const { data: orgData } = await sb
        .from('orgs')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();
      orgId = orgData?.id || null;
    } catch (e) {
      console.error('Pipeline health: org lookup failed', e);
    }

    // Get counts by metric
    const factsByMetric: Record<string, number> = {};
    if (orgId) {
      try {
        const { data: facts } = await sb
          .from('facts')
          .select('metric')
          .eq('org_id', orgId);
        
        for (const fact of facts || []) {
          factsByMetric[fact.metric] = (factsByMetric[fact.metric] || 0) + 1;
        }
      } catch (e) {
        console.error('Pipeline health: facts query failed', e);
      }
    }

    // Get vendor count
    let vendorCount = 0;
    if (orgId) {
      try {
        const { count } = await sb
          .from('vendors')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId);
        vendorCount = count || 0;
      } catch (e) {
        console.error('Pipeline health: vendor count failed', e);
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
        provider: process.env.PROVIDER || 'unknown',
        traceId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Pipeline health endpoint error:', error);
    return err(500, 'Pipeline health check failed', { 
      traceId: crypto.randomUUID(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
