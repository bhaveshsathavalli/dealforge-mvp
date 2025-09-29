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
): Promise<{ lane: Lane; saved: number; skipped: boolean; minConfidence: number; reason?: string; errors?: string[] }> {
  const sb = supabaseServer();

  // Get vendor info
  const { data: vendor, error: vendorError } = await sb
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .eq('org_id', orgId)
    .single();

  if (vendorError || !vendor) {
    return { lane, saved: 0, skipped: true, minConfidence: 0.7, reason: 'Vendor not found' };
  }

  if (!vendor.website) {
    return { lane, saved: 0, skipped: true, minConfidence: 0.7, reason: 'No website URL' };
  }

  // Check TTL - look for recent sources AND facts for this lane
  const ttlDays = TTL[lane];
  const ttlDate = new Date();
  ttlDate.setDate(ttlDate.getDate() - ttlDays);

  const [{ data: recentSources }, { data: recentFacts }] = await Promise.all([
    sb
      .from('sources')
      .select('fetched_at')
      .eq('vendor_id', vendorId)
      .eq('org_id', orgId)
      .eq('metric', lane)
      .gte('fetched_at', ttlDate.toISOString())
      .limit(1),
    sb
      .from('facts')
      .select('id')
      .eq('vendor_id', vendorId)
      .eq('org_id', orgId)
      .eq('metric', lane)
      .limit(1)
  ]);

  // Only skip if there are BOTH fresh sources AND facts
  if (recentSources && recentSources.length > 0 && recentFacts && recentFacts.length > 0) {
    return { lane, saved: 0, skipped: true, minConfidence: 0.7, reason: `Within TTL (${ttlDays} days)` };
  }

  // Generate seed URLs for the lane
  const baseUrl = vendor.website;
  const seeds = generateSeeds(baseUrl, lane);

  let totalSaved = 0;
  const errors: string[] = [];


  // Handle regular lanes that process seed URLs
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
          // Use pricing collector
          const pricingResult = await import('@/lib/facts/collectors/pricing').then(
            ({ extractPricing }) => extractPricing({
              orgId,
              vendor: {
                id: vendor.id,
                website: vendor.website,
                domain: new URL(vendor.website).hostname
              },
              page: { url, mainHtml: md, text: md, fetchedAt: new Date().toISOString() }
            })
          );
          extractedData = pricingResult.factIds.map(id => ({ factId: id, metric: 'pricing' }));
          break;
        case 'integrations':
          // Use integrations collector
          const integrationsResult = await import('@/lib/facts/collectors/integrations').then(
            ({ extractIntegrations }) => extractIntegrations({
              orgId,
              vendor: {
                id: vendor.id,
                website: vendor.website,
                domain: new URL(vendor.website).hostname
              },
              page: { url, mainHtml: md, text: md, fetchedAt: new Date().toISOString() }
            })
          );
          extractedData = integrationsResult.factIds.map(id => ({ factId: id, metric: 'integrations' }));
          break;
        case 'trust':
          // Use security collector
          const securityResult = await import('@/lib/facts/collectors/security').then(
            ({ extractSecurity }) => extractSecurity({
              orgId,
              vendor: {
                id: vendor.id,
                website: vendor.website,
                domain: new URL(vendor.website).hostname
              },
              page: { url, mainHtml: md, text: md, fetchedAt: new Date().toISOString() }
            })
          );
          extractedData = securityResult.factIds.map(id => ({ factId: id, metric: 'trust' }));
          break;
        case 'changelog':
          // Use changelog collector
          const changelogResult = await import('@/lib/facts/collectors/changelog').then(
            ({ extractChangelog }) => extractChangelog({
              orgId,
              vendor: {
                id: vendor.id,
                website: vendor.website,
                domain: new URL(vendor.website).hostname
              },
              page: { url, mainHtml: md, text: md, fetchedAt: new Date().toISOString() }
            })
          );
          extractedData = changelogResult.factIds.map(id => ({ factId: id, metric: 'changelog' }));
          break;
        default:
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

      // Handle fact saving based on lane type
      if (lane === 'pricing' || lane === 'integrations') {
        // These collectors already save facts internally, just count them
        totalSaved += extractedData.length;
      } else {
        // Save facts for other lanes
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
      }

    } catch (error) {
      errors.push(`Error processing ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const minConfidence = 0.7; // Default minimum confidence
  
  return {
    lane,
    saved: totalSaved,
    skipped: false,
    minConfidence,
    ...(errors.length > 0 && { errors })
  };
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
