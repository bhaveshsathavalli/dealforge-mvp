import 'server-only';
import { supabaseServer } from '@/lib/supabaseServer';
import { fetchContent } from '@/lib/fetchers';
import { featuresMarkdown } from '@/lib/extractors/markdown/features.md';
import { isSufficient } from '@/lib/extractors/registry';
import { upsertFact, saveSource } from '@/lib/facts/persist';

export type Lane = 'pricing' | 'features' | 'integrations' | 'trust' | 'changelog';

export const TTL: Record<Lane, number> = { 
  pricing: 7, 
  features: 14, 
  integrations: 14, 
  trust: 7, 
  changelog: 3 
};

export async function collectLane(
  vendorId: string, 
  lane: Lane,
  orgId: string
): Promise<{ saved: number; skipped: boolean; reason?: string }> {
  const sb = supabaseServer();

  // Get vendor info
  const { data: vendor, error: vendorError } = await sb
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .eq('org_id', orgId)
    .single();

  if (vendorError || !vendor) {
    return { saved: 0, skipped: true, reason: 'Vendor not found' };
  }

  if (!vendor.website) {
    return { saved: 0, skipped: true, reason: 'No website URL' };
  }

  // Check TTL - look for recent sources for this lane
  const ttlDays = TTL[lane];
  const ttlDate = new Date();
  ttlDate.setDate(ttlDate.getDate() - ttlDays);

  const { data: recentSources } = await sb
    .from('sources')
    .select('fetched_at')
    .eq('vendor_id', vendorId)
    .eq('metric', lane)
    .gte('fetched_at', ttlDate.toISOString())
    .limit(1);

  if (recentSources && recentSources.length > 0) {
    return { saved: 0, skipped: true, reason: `Within TTL (${ttlDays} days)` };
  }

  // Generate seed URLs for the lane
  const baseUrl = vendor.website;
  const seeds = generateSeeds(baseUrl, lane);

  let totalSaved = 0;
  const errors: string[] = [];

  for (const url of seeds) {
    try {
      // Fetch content using Jina
      const { md } = await fetchContent(url);

      // Run extractors based on lane
      let extractedData: any[] = [];
      
      switch (lane) {
        case 'features':
          extractedData = featuresMarkdown({ md, url });
          break;
        case 'pricing':
        case 'integrations':
        case 'trust':
        case 'changelog':
          // TODO: Implement other extractors
          extractedData = [];
          break;
      }

      // Check if sufficient data was extracted
      if (!isSufficient(lane, extractedData)) {
        errors.push(`Insufficient data from ${url}`);
        continue;
      }

      // Save source
      const sourceId = await saveSource({
        orgId: orgId,
        vendorId: vendor.id,
        url,
        metricGuess: lane,
        pageClassConfidence: 0.8,
        title: `Extracted ${lane} data`,
        html: md,
        cache: null,
        trustTier: 1,
      });

      // Save facts
      for (const item of extractedData) {
        const factId = await upsertFact({
          orgId: orgId,
          vendorId: vendor.id,
          metric: lane,
          subject: `${lane}:${item.feature || item.name || item.id || 'unknown'}`,
          key: 'data',
          value_json: item,
          units: null,
          text_summary: item.display || item.description || JSON.stringify(item),
          citations: [sourceId],
          confidence: item.confidence || 0.8,
        });
        totalSaved++;
      }

    } catch (error) {
      errors.push(`Error processing ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  if (totalSaved === 0 && errors.length > 0) {
    return { saved: 0, skipped: false, reason: errors.join('; ') };
  }

  return { saved: totalSaved, skipped: false };
}

function generateSeeds(baseUrl: string, lane: Lane): string[] {
  const url = new URL(baseUrl);
  const seeds: string[] = [];

  switch (lane) {
    case 'pricing':
      seeds.push(new URL('/pricing', url.origin).toString());
      seeds.push(new URL('/plans', url.origin).toString());
      break;
    case 'features':
      seeds.push(new URL('/features', url.origin).toString());
      seeds.push(new URL('/capabilities', url.origin).toString());
      seeds.push(new URL('/platform', url.origin).toString());
      break;
    case 'integrations':
      seeds.push(new URL('/integrations', url.origin).toString());
      seeds.push(new URL('/apps', url.origin).toString());
      seeds.push(new URL('/partners', url.origin).toString());
      break;
    case 'trust':
      seeds.push(new URL('/security', url.origin).toString());
      seeds.push(new URL('/trust', url.origin).toString());
      break;
    case 'changelog':
      seeds.push(new URL('/changelog', url.origin).toString());
      seeds.push(new URL('/release-notes', url.origin).toString());
      seeds.push(new URL('/updates', url.origin).toString());
      break;
  }

  return seeds;
}
