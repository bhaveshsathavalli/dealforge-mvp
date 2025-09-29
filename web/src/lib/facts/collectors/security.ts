import { directFetch, normalizeHtmlOrJson, hashBody } from "../http";
import { sourceScore } from "../scores";
import { upsertFact, saveSource } from "../persist";
import * as cheerio from "cheerio";

export type SecurityExtractInput = {
  orgId: string;
  vendor: { id: string; website: string; domain: string };
  page: { url: string; mainHtml: string; text: string; fetchedAt?: string };
};

export async function collectSecurity(domain: string) {
  const paths = ["/security", "/trust"];
  
  for (const path of paths) {
    const url = `https://${domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}${path}`;
    const res = await directFetch(url, {});
    
    if (res.status !== 200 || !res.body) return null;
    
    const norm = normalizeHtmlOrJson(res.body);
    const $: cheerio.CheerioAPI = cheerio.load(norm);
    const text = $("body").text();
    
    const securityItems = [];
    if (/SOC2/i.test(text)) securityItems.push("SOC2 certified");
    if (/ISO\s*27001/i.test(text)) securityItems.push("ISO 27001 certified");
    if (/GDPR/i.test(text)) securityItems.push("GDPR compliant");
    if (/HIPAA/i.test(text)) securityItems.push("HIPAA compliant");
    
    const facts = securityItems.map((item: string) => ({
      metric: "security",
      key: `certification:${item.toLowerCase().replace(/\s+/g, "_")}`,
      value: item,
      text_summary: item,
      citations: [{ url, title: "Security" }],
      firstParty: true,
      confidence: 0.9
    }));
    
    const sScore = sourceScore({
      firstParty: true,
      recencyDays: 0,
      pageType: "security",
      structured: true,
      reputation: "official"
    });
    
    return {
      source: {
        url,
        title: "Security",
        body: norm,
        body_hash: hashBody(norm),
        first_party: true,
        metric: "security",
        source_score: sScore
      },
      facts
    };
  }
  
  return null;
}

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

// -------------------- main entry --------------------

export async function extractSecurity(input: SecurityExtractInput) {
  const { orgId, vendor, page } = input;

  if (!isFirstParty(page.url, vendor.domain)) {
    return { factIds: [], report: { parsed: 0, saved: 0, skipped: ["non-first-party"] } };
  }

  const $ = cheerio.load(page.mainHtml ?? "");
  const text = $("body").text();
  
  const securityItems = [];
  if (/SOC2/i.test(text)) securityItems.push("SOC2 certified");
  if (/ISO\s*27001/i.test(text)) securityItems.push("ISO 27001 certified");
  if (/GDPR/i.test(text)) securityItems.push("GDPR compliant");
  if (/HIPAA/i.test(text)) securityItems.push("HIPAA compliant");

  const recencyDays = daysSince(page.fetchedAt);
  const hasStructure = securityItems.length > 0;

  const conf = sourceScore({
    firstParty: true,
    recencyDays,
    pageType: "security",
    structured: hasStructure,
    reputation: "official",
  });

  const factIds: string[] = [];
  const skipped: string[] = [];

  for (const item of securityItems) {
    if (conf < PUBLISH_THRESHOLD) {
      skipped.push(`low-confidence:${item}`);
      continue;
    }

    const value_json = {
      certification: item,
      compliance: true,
      raw_text: item
    };

    const fid = await upsertFact({
      orgId,
      vendorId: vendor.id,
      metric: "trust",
      subject: `certification:${item.toLowerCase().replace(/\s+/g, "_")}`,
      key: "certification",
      value_json,
      units: null,
      text_summary: item,
      citations: [],
      confidence: conf,
    });

    factIds.push(fid);
  }

  // helpful console during DRY_RUN
  if (process.env.DRY_RUN === "1") {
    console.log("security: certificates parsed =", securityItems.length);
    if (securityItems.length) {
      console.log(securityItems.slice(0, 5));
    }
  }

  return { factIds, report: { parsed: securityItems.length, saved: factIds.length, skipped } };
}

// ---- compatibility shim ----
export async function collectTrust(input: SecurityExtractInput) {
  return extractSecurity(input);
}