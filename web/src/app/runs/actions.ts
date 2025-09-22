"use server";

import { redirect } from 'next/navigation';
import { runCompareFactsPipeline } from '@/app/compare/actions';
import { getOrgUuidFromClerk } from '@/lib/org/ids';
import { supabaseAdmin } from '@/server/supabaseAdmin';

export async function startCompareRun(competitorId: string) {
  const { orgUuid, userId } = await getOrgUuidFromClerk();
  
  // Get the actual org UUID from clerk_org_id
  const { data: orgData, error: orgError } = await supabaseAdmin
    .from('orgs')
    .select('id, product_name, product_website')
    .eq('id', orgUuid)
    .single();
    
  if (orgError || !orgData) {
    throw new Error('Organization not found');
  }
  
  if (!orgData.product_name) {
    throw new Error('Please set your Product Name in Settings.');
  }

  // Load competitor data
  const { data: comp, error: compError } = await supabaseAdmin
    .from('competitors')
    .select('id, name, website')
    .eq('id', competitorId)
    .eq('org_id', orgData.id)
    .single();
    
  if (compError || !comp) {
    throw new Error('Competitor not found.');
  }

  // Use the facts pipeline instead of legacy
  const result = await runCompareFactsPipeline({
    youName: orgData.product_name,
    compName: comp.name
  });

  if (!result?.ok) {
    if (result?.reason === "cooldown") {
      throw new Error('Please wait before starting another comparison (15 minute cooldown)');
    }
    throw new Error('Failed to start comparison');
  }

  // Redirect to the new compare page
  redirect(`/app/compare/${result.runId}`);
}
