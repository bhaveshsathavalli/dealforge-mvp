import { withOrgId, OrgContext } from '@/server/withOrg';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolveYouAndComp } from '@/server/vendors/resolve';
import { getFactsByLanes, type Lane } from '@/server/facts/read';
import { ok, err } from '@/server/util/apiJson';
import crypto from 'crypto';

interface FactsResponse {
  ok: boolean;
  you: {
    id: string;
    name: string;
    website: string;
    facts: {
      pricing: unknown[];
      features: unknown[];
      integrations: unknown[];
      trust: unknown[];
      changelog: unknown[];
    };
  };
  comp: {
    id: string;
    name: string;
    website: string;
    facts: {
      pricing: unknown[];
      features: unknown[];
      integrations: unknown[];
      trust: unknown[];
      changelog: unknown[];
    };
  };
  traceId: string;
}

export const GET = withOrgId(async (ctx: OrgContext, req: Request): Promise<Response> => {
  const traceId = crypto.randomUUID();
  
  try {
    // Validate active org
    if (!ctx.orgId) {
      return err(401, 'No active organization', { traceId });
    }

    // Extract competitor vendor ID from URL path parameter
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const compId = pathSegments[pathSegments.length - 2]; // Get [id] from /api/vendors/[id]/facts
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(compId)) {
      return err(400, 'Invalid competitor vendor ID format', { compId, traceId });
    }

    // Parse lanes query parameter (optional)
    const lanesParam = url.searchParams.get('lanes');
    let lanes: Lane[] = ['pricing', 'features', 'integrations', 'trust', 'changelog'];
    
    if (lanesParam) {
      const requestedLanes = lanesParam.split(',') as Lane[];
      const validLanes: Lane[] = ['pricing', 'features', 'integrations', 'trust', 'changelog'];
      
      // Validate that all requested lanes are valid
      const invalidLanes = requestedLanes.filter(lane => !validLanes.includes(lane));
      if (invalidLanes.length > 0) {
        return err(400, 'Invalid lane specified', { invalidLanes, traceId });
      }
      
      lanes = requestedLanes;
    }

    const sb = supabaseServer();

    // Resolve vendor pair using the utility function
    const { you, comp } = await resolveYouAndComp(sb, ctx.orgId, compId);

    // Fetch facts for both vendors in parallel
    const [youFactsRaw, compFactsRaw] = await Promise.all([
      getFactsByLanes(sb, ctx.orgId, you.id, lanes),
      getFactsByLanes(sb, ctx.orgId, comp.id, lanes)
    ]);

    // Normalize facts arrays even if some lanes weren't requested
    const normalizeFacts = (facts: Record<string, unknown[]>) => ({
      pricing: lanes.includes('pricing') ? (facts.pricing || []) : [],
      features: lanes.includes('features') ? (facts.features || []) : [],
      integrations: lanes.includes('integrations') ? (facts.integrations || []) : [],
      trust: lanes.includes('trust') ? (facts.trust || []) : [],
      changelog: lanes.includes('changelog') ? (facts.changelog || []) : []
    });

    const response: FactsResponse = {
      ok: true,
      you: {
        id: you.id,
        name: you.name,
        website: you.website,
        facts: normalizeFacts(youFactsRaw)
      },
      comp: {
        id: comp.id,
        name: comp.name,
        website: comp.website,
        facts: normalizeFacts(compFactsRaw)
      },
      traceId
    };

    return ok(response);

  } catch (error) {
    console.error('Facts API error:', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      traceId 
    });
    
    return err(500, 'Failed to fetch facts', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      traceId 
    });
  }
});
