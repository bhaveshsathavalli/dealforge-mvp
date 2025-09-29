import 'server-only';
import { SupabaseClient } from '@supabase/supabase-js';

export interface VendorInfo {
  id: string;
  name: string;
  website: string;
}

export interface ResolvedVendors {
  you: VendorInfo;
  comp: VendorInfo;
}

/**
 * Ensures a self vendor exists for the organization and resolves competitor vendor.
 * 
 * @param sb - Supabase client instance
 * @param orgId - Organization ID
 * @param compId - Competitor vendor ID
 * @returns Resolved vendor pair { you, comp }
 * @throws Error if vendor resolution fails
 */
export async function resolveYouAndComp(
  sb: SupabaseClient,
  orgId: string,
  compId: string
): Promise<ResolvedVendors> {
  // First, ensure self vendor exists (similar to seedOrg pattern)
  const selfVendor = await ensureSelfVendor(sb, orgId);
  
  // Then load competitor vendor
  const compVendor = await loadCompetitorVendor(sb, orgId, compId);
  
  return {
    you: selfVendor,
    comp: compVendor
  };
}

/**
 * Ensures a self vendor exists for the organization.
 * Similar to seedOrg logic but returns vendor info.
 */
async function ensureSelfVendor(sb: SupabaseClient, orgId: string): Promise<VendorInfo> {
  // Use upsert to handle duplicates gracefully
  const { data: vendor, error: vendorError } = await sb
    .from('vendors')
    .upsert({
      org_id: orgId,
      name: 'Slack',
      website: 'https://slack.com'
    }, { onConflict: 'org_id,name' })
    .select('id, name, website')
    .single();

  if (vendorError) {
    throw new Error(`Failed to create/retrieve self vendor: ${vendorError.message}`);
  }

  return vendor;
}

/**
 * Loads competitor vendor by ID with org validation.
 */
async function loadCompetitorVendor(sb: SupabaseClient, orgId: string, compId: string): Promise<VendorInfo> {
  const { data: compVendor, error: compError } = await sb
    .from('vendors')
    .select('id, name, website')
    .eq('id', compId)
    .eq('org_id', orgId)
    .single();

  if (compError || !compVendor) {
    throw new Error(`Competitor vendor not found: ${compError?.message || 'No vendor found'}`);
  }

  return compVendor;
}
