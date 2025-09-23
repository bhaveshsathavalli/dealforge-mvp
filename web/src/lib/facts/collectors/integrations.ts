// web/src/lib/facts/collectors/integrations.ts
import * as cheerio from "cheerio";
import { upsertFact } from "../persist";
import { sourceScore } from "../scores";

export type IntegrationsExtractInput = {
  orgId: string;
  vendor: { id: string; website: string; domain: string };
  page: { url: string; mainHtml: string; text: string; fetchedAt?: string };
};

// -------------------- config / helpers --------------------

const PUBLISH_THRESHOLD = 0.70;

type Integration = {
  name: string;
  category: string | null;
  listing_url: string;
  integration_type: "native" | "api" | "partner";
  normalized_name: string;
};

// Alias map for normalizing integration names
const ALIASES: Record<string, string> = {
  "SFDC": "Salesforce",
  "Salesforce CRM": "Salesforce",
  "GA4": "Google Analytics 4",
  "Google Analytics (GA4)": "Google Analytics 4",
  "GMail": "Google Workspace Gmail",
  "G Suite": "Google Workspace"
};

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

function normalizeName(name: string): string {
  const trimmed = name.trim();
  return ALIASES[trimmed] || trimmed;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function determineIntegrationType(
  cardText: string, 
  listingUrl: string, 
  vendorDomain: string
): "native" | "api" | "partner" {
  const vendorName = vendorDomain.split('.')[0]; // Extract vendor name from domain
  const text = cardText.toLowerCase();
  const url = listingUrl.toLowerCase();
  
  // Check for native integrations
  if (text.includes(`by ${vendorName}`) || url.includes(vendorDomain)) {
    return "native";
  }
  
  // Check for API integrations
  if (text.includes("api") || text.includes("zapier") || 
      text.includes("webhook") || text.includes("sdk")) {
    return "api";
  }
  
  // Default to partner
  return "partner";
}

function makeAbsoluteUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

// -------------------- JSON extractors --------------------

function pickJsonFromDataProps($: cheerio.CheerioAPI) {
  const node = $('[data-props]').first().attr('data-props');
  try { return node ? JSON.parse(node) : null; } catch { return null; }
}

function pickJsonLd($: cheerio.CheerioAPI) {
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

function pickWindowJson(html: string) {
  const m = html.match(/window\.(?:__NEXT_DATA__|__APOLLO_STATE__|__INITIAL_STATE__)\s*=\s*(\{[\s\S]*?\});/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

// -------------------- extractors --------------------

/** Extract integrations from app/marketplace cards */
function extractFromCards($: cheerio.CheerioAPI, baseUrl: string, vendorDomain: string): Integration[] {
  const integrations: Integration[] = [];
  
  // Find marketplace/integrations containers
  const containerSelectors = [
    '[class*="market"]',
    '[class*="apps"]',
    '[class*="integrations"]',
    '[class*="directory"]',
    '[data-testid*="market"]',
    'section:has(h1,h2:contains("Apps"))',
    'main:has(h1,h2:contains("Integrations"))'
  ].join(',');
  
  const containers = $(containerSelectors);
  
  // If no containers found, search the whole page
  const searchRoot = containers.length > 0 ? containers : $('body');
  
  // Find integration cards within containers
  const cardSelectors = [
    '[data-app]',
    '[data-integration]',
    '[class*="card"]',
    '[class*="tile"]',
    '[class*="app"]',
    'a[href*="/apps/"]',
    'a[href*="/integrations/"]'
  ].join(',');
  
  // Debug: log first 500 chars of HTML in DRY_RUN mode
  if (process.env.DRY_RUN === "1") {
    console.log("HTML sample (first 500 chars):", (searchRoot.html() || "").substring(0, 500));
  }
  
  searchRoot.find(cardSelectors).each((_, card) => {
    const $card = $(card);
    const cardText = $card.text().trim();
    
    if (!cardText || cardText.length < 3) return;
    
    // Extract name from title elements
    let name = $card.find("h3, h4, .card-title, .app-name, .integration-title, [aria-label]").first().text().trim();
    if (!name) {
      // Fallback to first meaningful text
      const firstLine = cardText.split('\n')[0]?.trim();
      name = firstLine || cardText.substring(0, 50).trim();
    }
    
    if (!name || name.length < 2) return;
    
    // Extract category from nearby badge/chip or group heading
    let category: string | null = null;
    
    // Look for badges/chips within the card
    const badgeText = $card.find('.badge, .chip, .tag, [class*="badge"], [class*="chip"], [class*="tag"]').first().text().trim();
    if (badgeText) {
      category = badgeText;
    } else {
      // Look for group heading above the card
      const $parent = $card.closest('section, .section, .group');
      if ($parent.length) {
        const groupHeading = $parent.find('h2, h3').first().text().trim();
        if (groupHeading && !groupHeading.toLowerCase().includes('integration') && 
            !groupHeading.toLowerCase().includes('app') && 
            !groupHeading.toLowerCase().includes('partner')) {
          category = groupHeading;
        }
      }
    }
    
    // Extract listing URL
    let listingUrl = $card.find('a').first().attr('href') || '';
    if (listingUrl) {
      listingUrl = makeAbsoluteUrl(listingUrl, baseUrl);
    }
    
    // Determine integration type
    const integrationType = determineIntegrationType(cardText, listingUrl, vendorDomain);
    
    // Normalize name
    const normalizedName = normalizeName(name);
    
    integrations.push({
      name,
      category,
      listing_url: listingUrl,
      integration_type: integrationType,
      normalized_name: normalizedName
    });
  });
  
  return integrations;
}

/** Deduplicate integrations by normalized name */
function deduplicateIntegrations(integrations: Integration[]): Integration[] {
  const seen = new Set<string>();
  const deduped: Integration[] = [];
  
  for (const integration of integrations) {
    const key = integration.normalized_name.toLowerCase().trim();
    if (!seen.has(key) && key.length >= 2) {
      seen.add(key);
      deduped.push(integration);
    }
  }
  
  return deduped;
}

/** Extract integrations from JSON data */
function extractFromJson($: cheerio.CheerioAPI, html: string, baseUrl: string, vendorDomain: string): { integrations: Integration[]; counts: { dataProps: number; jsonLd: number; window: number } } {
  const integrations: Integration[] = [];
  const counts = { dataProps: 0, jsonLd: 0, window: 0 };

  // Debug logging in DRY_RUN mode
  if (process.env.DRY_RUN === "1") {
    const dataPropsNode = $('[data-props]').first();
    if (dataPropsNode.length > 0) {
      console.log("Data-props found, content preview:", dataPropsNode.attr('data-props')?.substring(0, 200) + "...");
    }
  }

  // 1. Try Slack-like data-props
  const dataProps = pickJsonFromDataProps($);
  if (dataProps) {
    // Slack pattern: dataProps.appCards or dataProps.appCategories[].apps
    if (dataProps.appCards && Array.isArray(dataProps.appCards)) {
      dataProps.appCards.forEach((app: any) => {
        if (app.name) {
          integrations.push({
            name: app.name,
            category: app.category || null,
            listing_url: app.url || app.href || '',
            integration_type: determineIntegrationType(app.description || '', app.url || '', vendorDomain),
            normalized_name: normalizeName(app.name)
          });
          counts.dataProps++;
        }
      });
    }
    
    // Also check appCategories pattern
    if (dataProps.appCategories && Array.isArray(dataProps.appCategories)) {
      dataProps.appCategories.forEach((category: any) => {
        if (category.apps && Array.isArray(category.apps)) {
          category.apps.forEach((app: any) => {
            if (app.name) {
              integrations.push({
                name: app.name,
                category: category.title || category.name || null,
                listing_url: app.url || app.href || '',
                integration_type: determineIntegrationType(app.description || '', app.url || '', vendorDomain),
                normalized_name: normalizeName(app.name)
              });
              counts.dataProps++;
            }
          });
        }
      });
    }

    // Slack-specific pattern: appCategoriesNavData (navigation data, not actual apps)
    if (dataProps.appCategoriesNavData && Array.isArray(dataProps.appCategoriesNavData)) {
      dataProps.appCategoriesNavData.forEach((category: any) => {
        if (category.title) {
          // Create a placeholder integration for the category
          integrations.push({
            name: category.title,
            category: 'Category',
            listing_url: '',
            integration_type: 'partner' as const,
            normalized_name: normalizeName(category.title)
          });
          counts.dataProps++;
        }
      });
    }

    // Look for other common patterns
    const findAppsInObject = (obj: any, path: string = ''): void => {
      if (typeof obj !== 'object' || obj === null) return;
      
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            // Look for items that might be apps
            if (item.name && (item.title || item.description || item.url)) {
              integrations.push({
                name: item.name,
                category: item.category || item.type || null,
                listing_url: item.url || item.href || item.link || '',
                integration_type: determineIntegrationType(item.description || '', item.url || '', vendorDomain),
                normalized_name: normalizeName(item.name)
              });
              counts.dataProps++;
            }
          }
          findAppsInObject(item, `${path}[${index}]`);
        });
      } else {
        Object.keys(obj).forEach(key => {
          findAppsInObject(obj[key], path ? `${path}.${key}` : key);
        });
      }
    };
    
    findAppsInObject(dataProps);
  }

  // 2. Try JSON-LD structured data
  const jsonLd = pickJsonLd($);
  jsonLd.forEach((item: any) => {
    if (item['@type'] === 'SoftwareApplication' || item['@type'] === 'Product') {
      if (item.name) {
        integrations.push({
          name: item.name,
          category: item.category || item.applicationCategory || null,
          listing_url: item.url || item.sameAs || '',
          integration_type: determineIntegrationType(item.description || '', item.url || '', vendorDomain),
          normalized_name: normalizeName(item.name)
        });
        counts.jsonLd++;
      }
    }
  });

  // 3. Try window.__NEXT_DATA__ and similar
  const windowJson = pickWindowJson(html);
  if (windowJson) {
    // Look for arrays with title/name in pageProps
    const findAppsInObject = (obj: any, path: string = ''): void => {
      if (typeof obj !== 'object' || obj === null) return;
      
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            if (item.name || item.title) {
              integrations.push({
                name: item.name || item.title,
                category: item.category || item.type || null,
                listing_url: item.url || item.href || item.link || '',
                integration_type: determineIntegrationType(item.description || '', item.url || '', vendorDomain),
                normalized_name: normalizeName(item.name || item.title)
              });
              counts.window++;
            }
          }
          findAppsInObject(item, `${path}[${index}]`);
        });
      } else {
        Object.keys(obj).forEach(key => {
          findAppsInObject(obj[key], path ? `${path}.${key}` : key);
        });
      }
    };
    
    findAppsInObject(windowJson);
  }

  return { integrations, counts };
}

// -------------------- main entry --------------------

export async function extractIntegrations(input: IntegrationsExtractInput) {
  const { orgId, vendor, page } = input;

  if (!isFirstParty(page.url, vendor.domain)) {
    return { factIds: [], report: { parsed: 0, saved: 0, skipped: ["non-first-party"] } };
  }

  const $: cheerio.CheerioAPI = cheerio.load(page.mainHtml ?? "");

  // Try JSON extraction first
  const jsonResult = extractFromJson($, page.mainHtml ?? "", page.url, vendor.domain);
  let integrations = jsonResult.integrations;
  let jsonCount = integrations.length;

  // If JSON found ≥ 20 items, use it and set structured=true
  const useJson = jsonCount >= 20;
  
  if (!useJson) {
    // Fallback to DOM extraction
    const domIntegrations = extractFromCards($, page.url, vendor.domain);
    integrations = [...integrations, ...domIntegrations];
  }

  const dedupedIntegrations = deduplicateIntegrations(integrations);
  const domCount = dedupedIntegrations.length - jsonCount;

  const hasStructure = useJson || dedupedIntegrations.length > 0;
  const recencyDays = daysSince(page.fetchedAt);

  const conf = sourceScore({
      firstParty: true,
    recencyDays,
      pageType: "integrations",
    structured: hasStructure,
    reputation: "official",
  });

  const factIds: string[] = [];
  const skipped: string[] = [];

  for (const integration of dedupedIntegrations) {
    if (conf < PUBLISH_THRESHOLD) {
      skipped.push(`low-confidence:${integration.name}`);
      continue;
    }

    const value_json = {
      name: integration.normalized_name,
      category: integration.category,
      integration_type: integration.integration_type,
      listing_url: integration.listing_url
    };

    const fid = await upsertFact({
      orgId,
      vendorId: vendor.id,
      metric: "integrations",
      subject: `integration:${integration.normalized_name}`,
      key: "listing",
      value_json,
      units: null,
      text_summary: null,
      citations: [],
      confidence: conf,
    });

    factIds.push(fid);
  }

  // helpful console during DRY_RUN
  if (process.env.DRY_RUN === "1") {
    console.log("integrations: apps parsed =", dedupedIntegrations.length, `(json:${jsonCount}, dom:${domCount})`);
    console.log("jsonFound:", jsonResult.counts);
    if (dedupedIntegrations.length) {
      console.log("Sample 3 names:");
      dedupedIntegrations.slice(0, 3).forEach(i => {
        console.log(`  ${i.normalized_name} (${i.integration_type})${i.category ? ` - ${i.category}` : ''}`);
      });
      if (dedupedIntegrations.length > 3) {
        console.log(`  ... and ${dedupedIntegrations.length - 3} more`);
      }
    }
  }

  return { factIds, report: { parsed: dedupedIntegrations.length, saved: factIds.length, skipped } };
}

// ---- compatibility shim for app/compare/actions.ts ----
export async function collectIntegrations(input: IntegrationsExtractInput) {
  return extractIntegrations(input);
}