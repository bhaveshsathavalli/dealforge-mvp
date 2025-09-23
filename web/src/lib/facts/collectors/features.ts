// web/src/lib/facts/collectors/features.ts
import * as cheerio from "cheerio";
import { upsertFact } from "../persist";
import { sourceScore } from "../scores";

export type FeaturesExtractInput = {
  orgId: string;
  vendor: { id: string; website: string; domain: string };
  page: { url: string; mainHtml: string; text: string; fetchedAt?: string };
};

type Feature = {
  section?: string | null;
  name: string;                // concise "feature" label
  description?: string | null; // short one-liner
  raw?: Record<string, unknown>;
};

// -------------------- config / helpers --------------------

const PUBLISH_THRESHOLD = 0.70;

function isFirstParty(url: string, vendorDomain: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const dom = vendorDomain.toLowerCase();
    return host === dom || host.endsWith("." + dom);
  } catch { return false; }
}

function daysSince(iso?: string): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : Math.max(0, Math.round((Date.now() - t) / 86_400_000));
}

function cleanText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-.,!?]/g, '')
    .replace(/\s*[.!?]+\s*$/, '')
    .replace(/\s*(Learn more|Get started|Read more|See more|View details|Find out more)\s*[.!?]*\s*$/i, '')
    .trim();
}

function normalizeName(name: string): string {
  return cleanText(name)
    .replace(/^[-•*]\s*/, '')
    .substring(0, 100);
}

function normalizeDescription(desc: string): string {
  const cleaned = cleanText(desc);
  const sentences = cleaned.split(/[.!?]/).filter(s => s.trim().length > 0);
  return sentences.slice(0, 2).join('. ').trim() || null;
}

// -------------------- JSON extraction --------------------

function pickJsonFromDataProps($: cheerio.CheerioAPI): any {
  const node = $('[data-props], [data-state], [data-json]').first().attr('data-props') || 
               $('[data-props], [data-state], [data-json]').first().attr('data-state') ||
               $('[data-props], [data-state], [data-json]').first().attr('data-json');
  try { return node ? JSON.parse(node) : null; } catch { return null; }
}

function pickJsonLd($: cheerio.CheerioAPI): any[] {
  const out: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const t = $(el).contents().text();
    try {
      const j = JSON.parse(t);
      if (Array.isArray(j)) out.push(...j); else out.push(j);
    } catch {}
  });
  return out;
}

function pickWindowJson(html: string): any {
  const patterns = [
    /window\.__NEXT_DATA__\s*=\s*(\{[\s\S]*?\});/,
    /window\.__APOLLO_STATE__\s*=\s*(\{[\s\S]*?\});/,
    /window\.__NUXT__\s*=\s*(\{[\s\S]*?\});/
  ];
  
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m) {
      try { return JSON.parse(m[1]); } catch {}
    }
  }
  return null;
}

function extractFeaturesFromJson(data: any, source: string): Feature[] {
  const features: Feature[] = [];
  
  function searchForFeatures(obj: any, path: string = ''): void {
    if (!obj || typeof obj !== 'object') return;
    
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => searchForFeatures(item, `${path}[${i}]`));
      return;
    }
    
    // Check if this object looks like a feature
    const name = obj.title || obj.name || obj.label || obj.heading;
    const description = obj.description || obj.summary || obj.text || obj.content;
    const section = obj.category || obj.section || obj.group || obj.type;
    
    if (name && typeof name === 'string' && name.length > 2) {
      features.push({
        section: section || null,
        name: normalizeName(name),
        description: description ? normalizeDescription(description) : null,
        raw: { source, path, ...obj }
      });
    }
    
    // Recursively search nested objects
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        searchForFeatures(value, path ? `${path}.${key}` : key);
      }
    }
  }
  
  searchForFeatures(data);
  return features;
}

function extractFromJson($: cheerio.CheerioAPI, html: string): { features: Feature[]; jsonCount: number; jsonSource?: string } {
  let jsonCount = 0;
  let jsonSource: string | undefined;
  
  // Try data-props first
  const dataProps = pickJsonFromDataProps($);
  if (dataProps) {
    const features = extractFeaturesFromJson(dataProps, 'data-props');
    if (features.length >= 10) {
      return { features, jsonCount: features.length, jsonSource: 'data-props' };
    }
    jsonCount += features.length;
  }
  
  // Try JSON-LD
  const jsonLd = pickJsonLd($);
  if (jsonLd.length > 0) {
    const features = extractFeaturesFromJson(jsonLd, 'jsonld');
    if (features.length >= 10) {
      return { features, jsonCount: features.length, jsonSource: 'jsonld' };
    }
    jsonCount += features.length;
  }
  
  // Try window objects
  const windowJson = pickWindowJson(html);
  if (windowJson) {
    const features = extractFeaturesFromJson(windowJson, 'window');
    if (features.length >= 10) {
      return { features, jsonCount: features.length, jsonSource: 'window' };
    }
    jsonCount += features.length;
  }
  
  return { features: [], jsonCount, jsonSource };
}

// -------------------- DOM extraction --------------------

function extractFromSections($: cheerio.CheerioAPI): Feature[] {
  const features: Feature[] = [];
  
  const sectionSelectors = [
    'section:has(h2)',
    'section:has(h3)', 
    '[data-section]',
    '[class*="section"]'
  ].join(',');
  
  $(sectionSelectors).each((_, section) => {
    const $section = $(section);
    const sectionTitle = $section.find('h2, h3').first().text().trim();
    if (!sectionTitle) return;
    
    const cardSelectors = [
      '.feature',
      '.card', 
      '.tile',
      '.module',
      '[class*="feature-"]',
      '[class*="-feature"]',
      '[data-card]'
    ].join(',');
    
    $section.find(cardSelectors).each((_, card) => {
      const $card = $(card);
      const cardText = $card.text().trim();
      if (!cardText || cardText.length < 10) return;
      
      let name = $card.find('h3, h4, .title').first().text().trim();
      if (!name) {
        const firstSentence = cardText.split(/[.!?]/)[0]?.trim();
        name = firstSentence || cardText.substring(0, 50).trim();
      }
      
      if (name.length < 3) return;
      
      let description = '';
      const $desc = $card.find('p, li').first();
      if ($desc.length) {
        description = $desc.text().trim();
      } else {
        description = cardText.replace(name, '').trim();
        description = description.replace(/^[-•*]\s*/, '').trim();
      }
      
      features.push({
        section: sectionTitle,
        name: normalizeName(name),
        description: normalizeDescription(description),
        raw: { source: 'dom-section', cardText }
      });
    });
  });
  
  return features;
}

function extractFromCards($: cheerio.CheerioAPI): Feature[] {
  const features: Feature[] = [];
  
  const cardSelectors = [
    '.feature',
    '.card', 
    '.tile',
    '.module',
    '[class*="feature-"]',
    '[class*="-feature"]',
    '[data-card]'
  ].join(',');
  
  $(cardSelectors).each((_, card) => {
    const $card = $(card);
    const cardText = $card.text().trim();
    if (!cardText || cardText.length < 10) return;
    
    let name = $card.find('h3, h4, .title').first().text().trim();
    if (!name) {
      const firstSentence = cardText.split(/[.!?]/)[0]?.trim();
      name = firstSentence || cardText.substring(0, 50).trim();
    }
    
    if (name.length < 3) return;
    
    let description = '';
    const $desc = $card.find('p, li').first();
    if ($desc.length) {
      description = $desc.text().trim();
    } else {
      description = cardText.replace(name, '').trim();
      description = description.replace(/^[-•*]\s*/, '').trim();
    }
    
    features.push({
      section: null,
      name: normalizeName(name),
      description: normalizeDescription(description),
      raw: { source: 'dom-card', cardText }
    });
  });
  
  return features;
}

// -------------------- cleanup and deduplication --------------------

function deduplicateFeatures(features: Feature[]): Feature[] {
  const seen = new Set<string>();
  const deduped: Feature[] = [];
  
  for (const feature of features) {
    const key = `${feature.section || ""}|${feature.name.toLowerCase()}`;
    if (!seen.has(key) && feature.name.length >= 3) {
      seen.add(key);
      deduped.push(feature);
    }
  }
  
  return deduped;
}

// -------------------- main entry --------------------

export async function extractFeatures(input: FeaturesExtractInput) {
  const { orgId, vendor, page } = input;

  if (!isFirstParty(page.url, vendor.domain)) {
    return { factIds: [], report: { parsed: 0, saved: 0, skipped: ["non-first-party"] } };
  }

  const $: cheerio.CheerioAPI = cheerio.load(page.mainHtml ?? "");

  // JSON-first extraction
  const jsonResult = extractFromJson($, page.mainHtml ?? "");
  let features = jsonResult.features;
  let jsonCount = features.length;
  let domCount = 0;

  // DOM fallback if JSON didn't yield enough
  if (jsonCount < 10) {
    const sectionFeatures = extractFromSections($);
    const cardFeatures = extractFromCards($);
    const domFeatures = [...sectionFeatures, ...cardFeatures];
    features = [...features, ...domFeatures];
    domCount = domFeatures.length;
  }

  const dedupedFeatures = deduplicateFeatures(features);
  const hasStructure = jsonCount >= 10 || dedupedFeatures.length > 0;
  const recencyDays = daysSince(page.fetchedAt);

  const conf = sourceScore({
    firstParty: true,
    recencyDays,
    pageType: "features",
    structured: hasStructure,
    reputation: "official",
  });

  const factIds: string[] = [];
  const skipped: string[] = [];

  for (const feature of dedupedFeatures) {
    if (conf < PUBLISH_THRESHOLD) {
      skipped.push(`low-confidence:${feature.name}`);
      continue;
    }

    const value_json = {
      section: feature.section ?? null,
      description: feature.description ?? null,
      raw: feature.raw ?? null
    };

    const fid = await upsertFact({
      orgId,
      vendorId: vendor.id,
      metric: "features",
      subject: `feature:${feature.name}`,
      key: "present",
      value_json,
      units: null,
      text_summary: null,
      citations: [],
      confidence: conf,
    });

    factIds.push(fid);
  }

  // DRY_RUN logging
  if (process.env.DRY_RUN === "1") {
    console.log(`features: parsed = ${dedupedFeatures.length} { sections: ${extractFromSections($).length}, cards: ${extractFromCards($).length} } (json:${jsonCount}, dom:${domCount})`);
    
    if (jsonResult.jsonSource) {
      console.log(`jsonSource: ${jsonResult.jsonSource}`);
    }
    
    if (dedupedFeatures.length) {
      console.log("Sample items:");
      dedupedFeatures.slice(0, 5).forEach(f => {
        console.log(`  {${f.section || 'null'}, ${f.name}}`);
      });
    }
  }

  return { factIds, report: { parsed: dedupedFeatures.length, saved: factIds.length, skipped } };
}

// ---- compatibility shim for app/compare/actions.ts ----
export async function collectFeatures(input: FeaturesExtractInput) {
  return extractFeatures(input);
}