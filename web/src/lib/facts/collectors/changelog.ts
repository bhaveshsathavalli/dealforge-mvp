import { directFetch, normalizeHtmlOrJson, hashBody } from "../http";
import { sourceScore } from "../scores";
import { upsertFact, saveSource } from "../persist";
import * as cheerio from "cheerio";

export type ChangelogExtractInput = {
  orgId: string;
  vendor: { id: string; website: string; domain: string };
  page: { url: string; mainHtml: string; text: string; fetchedAt?: string };
};

export async function collectChangelog(domain: string) {
  const paths = ["/changelog", "/release-notes", "/updates"];
  
  for (const path of paths) {
    const url = `https://${domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}${path}`;
    const res = await directFetch(url, {});
    
    if (res.status !== 200 || !res.body) return null;
    
    const norm = normalizeHtmlOrJson(res.body);
    const $: cheerio.CheerioAPI = cheerio.load(norm);
    const entries = $("h1,h2,h3,li").map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 3);
    
    const facts = entries.map((entry: string) => ({
      metric: "changelog",
      key: `release:${entry.toLowerCase().slice(0, 40)}`,
      value: entry,
      text_summary: entry,
      citations: [{ url, title: "Changelog" }],
      firstParty: true,
      confidence: 0.8
    }));
    
    const sScore = sourceScore({
      firstParty: true,
      recencyDays: 0,
      pageType: "changelog",
      structured: true,
      reputation: "official"
    });
    
    return {
      source: {
        url,
        title: "Changelog",
        body: norm,
        body_hash: hashBody(norm),
        first_party: true,
        metric: "changelog",
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

export async function extractChangelog(input: ChangelogExtractInput) {
  const { orgId, vendor, page } = input;

  if (!isFirstParty(page.url, vendor.domain)) {
    return { factIds: [], report: { parsed: 0, saved: 0, skipped: ["non-first-party"] } };
  }

  const $ = cheerio.load(page.mainHtml ?? "");
  const entries = $("h1,h2,h3,li").map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 10);

  const changelogItems = Array.from(entries).map(entry => ({
    release: entry,
    release_key: `release:${entry.toLowerCase().slice(0, 40).replace(/[^a-z0-9\s-]/g, '')}`
  }));

  const recencyDays = daysSince(page.fetchedAt);
  const hasStructure = changelogItems.length > 0;

  const conf = sourceScore({
    firstParty: true,
    recencyDays,
    pageType: "changelog",
    structured: hasStructure,
    reputation: "official",
  });

  const factIds: string[] = [];
  const skipped: string[] = [];

  for (const item of changelogItems) {
    if (conf < PUBLISH_THRESHOLD) {
      skipped.push(`low-confidence:${item.release_key}`);
      continue;
    }

    const value_json = {
      release: item.release,
      feature_type: "update",
      raw_text: item.release
    };

    const fid = await upsertFact({
      orgId,
      vendorId: vendor.id,
      metric: "changelog",
      subject: item.release_key,
      key: "release",
      value_json,
      units: null,
      text_summary: item.release,
      citations: [],
      confidence: conf,
    });

    factIds.push(fid);
  }

  // helpful console during DRY_RUN
  if (process.env.DRY_RUN === "1") {
    console.log("changelog: releases parsed =", changelogItems.length);
    if (changelogItems.length) {
      console.log("Recent releases:");
      changelogItems.slice(0, 3).forEach(item => console.log(`  ${item.release}`));
    }
  }

  return { factIds, report: { parsed: changelogItems.length, saved: factIds.length, skipped } };
}