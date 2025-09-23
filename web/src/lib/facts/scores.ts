// web/src/lib/facts/scores.ts

/**
 * Existing scoring utilities (kept intact).
 * These are used to compute source-level scores and roll them up to a fact score.
 */

export function sourceScore(p: {
  firstParty: boolean;
  recencyDays: number;
  pageType:
    | "pricing" | "features" | "integrations" | "security" | "reliability"
    | "changelog" | "marketplace" | "social" | "docs" | "blog" | "review";
  structured: boolean;
  reputation: "official" | "marketplace" | "review" | "forum" | "news";
}) {
  const rec = p.recencyDays <= 90 ? 1 : p.recencyDays <= 365 ? 0.6 : 0.3;
  const typeW = {
    pricing: 1, features: 0.9, integrations: 0.9, security: 1, reliability: 1,
    changelog: 0.8, marketplace: 0.8, social: 0.3, docs: 0.9, blog: 0.5, review: 0.6
  }[p.pageType];
  const repW = {
    official: 1, marketplace: 0.85, review: 0.7, forum: 0.4, news: 0.5
  }[p.reputation];

  let s = 0;
  if (p.firstParty) s += 0.45;
  s += 0.20 * rec;
  s += 0.15 * typeW;
  s += 0.10 * (p.structured ? 1 : 0.4);
  s += 0.10 * repW;

  return Math.max(0, Math.min(1, s));
}

export function factScore(sourceScores: number[], distinctDomains: number) {
  const maxS = Math.max(...sourceScores, 0);
  const top2 = [...sourceScores].sort((a, b) => b - a).slice(0, 2);
  const meanTop2 = top2.length ? top2.reduce((a, b) => a + b, 0) / top2.length : 0;

  let f = 0.7 * maxS + 0.3 * meanTop2;
  f += Math.min(0.1, 0.03 * Math.max(0, distinctDomains - 1));

  return Math.max(0, Math.min(1, f));
}

export function answerScore(reliability: number, completeness: number, specificity: number) {
  return Math.max(0, Math.min(1, 0.6 * reliability + 0.2 * completeness + 0.2 * specificity));
}

/**
 * New helpers used by collectors/publish steps.
 * These do not change existing behavior; they’re additive and can be used independently.
 */

export const PUBLISH_THRESHOLD = 0.70;

export function isFirstParty(url: string, vendorDomain: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const dom = vendorDomain.toLowerCase();
    return host === dom || host.endsWith("." + dom);
  } catch {
    return false;
  }
}

/** Map days-old → normalized recency (kept aligned with sourceScore buckets). */
export function recencyScore(days: number | null | undefined): number {
  if (days == null) return 0.6;       // unknown → neutral-ish
  if (days <= 90) return 1.0;         // fresh
  if (days <= 365) return 0.6;        // within a year
  return 0.3;                         // older
}

/** Prefer structured pages (tables/JSON/cards). */
export function structureScore(hasTableOrJson: boolean): number {
  return hasTableOrJson ? 1.0 : 0.6;
}

/**
 * Lightweight confidence combiner for single-page extractions.
 * - trust:        1.0 for first-party, else <1.0 if you choose
 * - metricMatch:  1.0 when the page was classified as the target metric
 * - recency:      from recencyScore()
 * - structure:    from structureScore()
 */
export function confidence(input: {
  trust: number;        // 0..1
  metricMatch: number;  // 0..1
  recency: number;      // 0..1
  structure: number;    // 0..1
}) {
  const { trust, metricMatch, recency, structure } = input;
  return 0.55 * trust + 0.20 * metricMatch + 0.15 * recency + 0.10 * structure;
}
