import 'server-only';
import { SupabaseClient } from '@supabase/supabase-js';

export type Lane = 'pricing' | 'features' | 'integrations' | 'trust' | 'changelog';

export interface Fact {
  id: string;
  subject: string | null;
  key: string | null;
  value_json: any;
  text_summary: string | null;
  citations: string[];
  confidence: number;
  first_seen_at: string;
  last_seen_at: string;
}

export interface FactsByMetric extends Record<string, unknown[]> {
  pricing: Fact[];
  features: Fact[];
  integrations: Fact[];
  trust: Fact[];
  changelog: Fact[];
}

export interface GetFactsByMetricParams {
  orgId: string;
  vendorId: string;
  metric: Lane;
}

/**
 * Gets facts by metric for a specific vendor within an organization.
 * All queries include org_id for safety.
 * 
 * @param sb - Supabase client instance
 * @param params - Query parameters
 * @returns Normalized array of facts for the metric
 */
export async function getFactsByMetric(
  sb: SupabaseClient,
  params: GetFactsByMetricParams
): Promise<Fact[]> {
  const { orgId, vendorId, metric } = params;

  const { data: facts, error } = await sb
    .from('facts')
    .select('*')
    .eq('org_id', orgId)
    .eq('vendor_id', vendorId)
    .eq('metric', metric)
    .order('last_seen_at', { ascending: false });

  if (error) {
    console.error('Failed to get facts:', { orgId, vendorId, metric, error });
    return []; // Return empty array instead of throwing to be more resilient
  }

  // Normalize citations to always be arrays
  return facts?.map(fact => ({
    ...fact,
    citations: Array.isArray(fact.citations) ? fact.citations : []
  })) || [];
}

/**
 * Gets facts by multiple lanes for a specific vendor within an organization.
 * 
 * @param sb - Supabase client instance
 * @param orgId - Organization ID
 * @param vendorId - Vendor ID
 * @param lanes - Array of lanes to fetch (default: all lanes)
 * @returns Object with facts organized by metric/lane
 */
export async function getFactsByLanes(
  sb: SupabaseClient,
  orgId: string,
  vendorId: string,
  lanes: Lane[] = ['pricing', 'features', 'integrations', 'trust', 'changelog']
): Promise<FactsByMetric> {
  const factsByMetric: FactsByMetric = {
    pricing: [],
    features: [],
    integrations: [],
    trust: [],
    changelog: []
  };

  // Fetch facts for each requested lane
  const promises = lanes.map(metric => 
    getFactsByMetric(sb, { orgId, vendorId, metric }).then(facts => {
      (factsByMetric as any)[metric] = facts;
    })
  );

  await Promise.all(promises);

  return factsByMetric;
}

/**
 * Gets facts for multiple vendors within an organization.
 * 
 * @param sb - Supabase client instance
 * @param orgId - Organization ID
 * @param vendorIds - Array of vendor IDs
 * @param lanes - Array of lanes to fetch (default: all lanes)
 * @returns Object with facts organized by vendor ID, then by metric/lane
 */
export async function getFactsForVendors(
  sb: SupabaseClient,
  orgId: string,
  vendorIds: string[],
  lanes: Lane[] = ['pricing', 'features', 'integrations', 'trust', 'changelog']
): Promise<Record<string, FactsByMetric>> {
  const factsByVendor: Record<string, FactsByMetric> = {};

  const promises = vendorIds.map(async (vendorId) => {
    factsByVendor[vendorId] = await getFactsByLanes(sb, orgId, vendorId, lanes);
  });

  await Promise.all(promises);

  return factsByVendor;
}
