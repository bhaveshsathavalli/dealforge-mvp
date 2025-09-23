// web/src/lib/facts/collectors/pricing.ts
import * as cheerio from "cheerio";
import { upsertFact } from "../persist";
import { sourceScore } from "../scores";

export type PricingExtractInput = {
  orgId: string;
  vendor: { id: string; website: string; domain: string };
  page: { url: string; mainHtml: string; text: string; fetchedAt?: string };
};

// -------------------- config / helpers --------------------

const PUBLISH_THRESHOLD = 0.70;

type Plan = {
  plan_name: string;
  monthly_price?: number | null;
  annual_price?: number | null;
  currency?: string | null;
  unit?: "user" | "seat" | "account" | "flat" | null;
  billing_cycle?: "monthly" | "annual" | null;
  free_trial_days?: number | null;
  contact_sales?: boolean;
  raw?: { monthly?: string; annual?: string };
};

const CUR = /(\$|€|£|₹|¥)/;
const NUM = /(\d[\d,]*(?:\.\d+)?)/;
const TRIAL = /(\d+)\s*(day|days|d)\s*(free|trial)/i;

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

function parseUnit(s: string): Plan["unit"] {
  const t = s.toLowerCase();
  if (t.includes("per user") || t.includes("/user") || /\buser\b/.test(t)) return "user";
  if (t.includes("per seat") || t.includes("/seat") || /\bseat\b/.test(t)) return "seat";
  if (t.includes("per account") || t.includes("/account")) return "account";
  if (t.includes("flat")) return "flat";
  return null;
}

function parsePrice(s: string): { amount?: number; currency?: string; raw?: string } {
  const cur = s.match(CUR)?.[1] ?? null;
  const amt = s.match(NUM)?.[1]?.replace(/,/g, "");
  const amount = amt ? Number(amt) : undefined;
  return { amount, currency: cur ?? undefined, raw: s.trim() };
}

function findFreeTrialDays(text: string): number | null {
  const m = text.match(TRIAL);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

// -------------------- extractors --------------------

/** Parse the common “plans as columns” table layout */
function extractFromTables($: cheerio.CheerioAPI): Plan[] {
  const plans: Plan[] = [];

  $("table").each((_, el) => {
    const headers = $(el)
      .find("thead th, thead td")
      .map((__, h) => $(h).text().trim())
      .get();

    if (headers.length < 2) return; // first col is row label

    const names = headers.slice(1);
    const cols: Record<number, Plan> = {};
    names.forEach((n, i) => { cols[i + 1] = { plan_name: n }; });

    $(el).find("tbody tr").each((__, row) => {
      const cells = $(row).find("td,th");
      if (!cells.length) return;

      const label = $(cells[0]).text().trim().toLowerCase();
      cells.slice(1).each((idx, c) => {
        const txt = $(c).text().trim();
        const p = cols[idx + 1];
        if (!p) return;

        if (label.includes("price")) {
          const { amount, currency, raw } = parsePrice(txt);
          const isMonthly = /month|mo\./i.test(txt);
          const isAnnual  = /year|yr\.|annual/i.test(txt);

          if (isMonthly) {
            p.monthly_price = amount ?? null;
            p.raw = { ...(p.raw || {}), monthly: raw };
            p.billing_cycle = p.billing_cycle ?? "monthly";
          }
          if (isAnnual) {
            p.annual_price = amount ?? null;
            p.raw = { ...(p.raw || {}), annual: raw };
            p.billing_cycle = "annual";
          }
          if (!p.currency && currency) p.currency = currency;
          if (!p.unit) p.unit = parseUnit(txt);
        }

        if (label.includes("trial")) {
          p.free_trial_days = findFreeTrialDays(txt);
        }
      });
    });

    plans.push(...Object.values(cols));
  });

  return plans;
}

/**
 * Parse “pricing cards”. Uses only selectors Cheerio supports.
 * Then a fallback: find price blobs and pair them with the nearest preceding H2/H3.
 */
function extractFromCards($: cheerio.CheerioAPI): Plan[] {
  const plans: Plan[] = [];

  // 1) obvious cards (safe selectors)
  const obviousCards = $([
    '[class*="plan"]',
    '[class*="pricing"]',
    '[data-plan]',
    "section"
  ].join(",")).toArray();

  for (const el of obviousCards) {
    const $el = $(el);

    // Skip if the element has no currency symbol anywhere
    if (!CUR.test($el.text())) continue;

    const name =
      $el.find("h3, h2, .plan-name, .tier-name").first().text().trim() ||
      ($el.attr("data-plan") || "").trim();

    if (!name) continue;

    const priceChunk =
      $el.find(".price, .pricing, .amount, .cost").first().text().trim() ||
      $el.text();

    const monthly = /month|mo\./i.test(priceChunk) ? parsePrice(priceChunk) : null;
    const annual  = /year|yr\.|annual/i.test(priceChunk) ? parsePrice(priceChunk) : null;

    const unit = parseUnit(priceChunk);
    const trialDays = findFreeTrialDays($el.text());
    const contact = /contact sales|talk to sales|request pricing/i.test($el.text());

    const plan: Plan = {
      plan_name: name,
      monthly_price: monthly?.amount ?? null,
      annual_price: annual?.amount ?? null,
      currency: monthly?.currency ?? annual?.currency ?? null,
      unit,
      billing_cycle: annual?.amount ? "annual" : monthly?.amount ? "monthly" : null,
      free_trial_days: trialDays,
      contact_sales: contact,
      raw: { monthly: monthly?.raw, annual: annual?.raw },
    };

    if (
      plan.plan_name &&
      (plan.monthly_price != null ||
        plan.annual_price != null ||
        plan.contact_sales ||
        plan.free_trial_days != null)
    ) {
      plans.push(plan);
    }
  }

  // 2) fallback: search for price blobs & pair with nearest preceding h2/h3
  if (plans.length === 0) {
    const priceNodes: cheerio.Element[] = [];
    $("*").each((_, el) => {
      const t = $(el).text();
      if (CUR.test(t) && NUM.test(t)) priceNodes.push(el);
    });

    for (const node of priceNodes.slice(0, 12)) { // keep it bounded
      const $n = $(node);
      const txt = $n.text().replace(/\s+/g, " ").trim();
      const { amount, currency, raw } = parsePrice(txt);
      if (amount == null && !/contact sales/i.test(txt)) continue;

      // Find a nearby plan name: the closest previous h3/h2 in the same section/card-ish ancestor
      let name = "";
      let parent: cheerio.Cheerio = $n.parent();
      for (let hops = 0; hops < 6 && name === "" && parent.length; hops++, parent = parent.parent()) {
        const h = parent.find("h3, h2").first().text().trim();
        if (h) { name = h; break; }
      }
      if (!name) continue;

      const unit = parseUnit(txt);
      const isMonthly = /month|mo\./i.test(txt);
      const isAnnual  = /year|yr\.|annual/i.test(txt);

      const plan: Plan = {
        plan_name: name,
        monthly_price: isMonthly ? (amount ?? null) : null,
        annual_price: isAnnual ? (amount ?? null) : null,
        currency: currency ?? null,
        unit,
        billing_cycle: isAnnual ? "annual" : (isMonthly ? "monthly" : null),
        free_trial_days: findFreeTrialDays($n.closest("section,div,article").text()),
        contact_sales: /contact sales|talk to sales|request pricing/i.test($n.closest("section,div,article").text()),
        raw: { monthly: isMonthly ? raw : undefined, annual: isAnnual ? raw : undefined },
      };

      // avoid dupes by (name,monthly,annual)
      const key = `${plan.plan_name}|${plan.monthly_price ?? ""}|${plan.annual_price ?? ""}`;
      if (!plans.some(p => `${p.plan_name}|${p.monthly_price ?? ""}|${p.annual_price ?? ""}` === key)) {
        plans.push(plan);
      }
    }
  }

  return plans;
}

// -------------------- main entry --------------------

export async function extractPricing(input: PricingExtractInput) {
  const { orgId, vendor, page } = input;

  if (!isFirstParty(page.url, vendor.domain)) {
    return { factIds: [], report: { parsed: 0, saved: 0, skipped: ["non-first-party"] } };
  }

  const $: cheerio.CheerioAPI = cheerio.load(page.mainHtml ?? "");

  const tablePlans = extractFromTables($);
  const cardPlans  = extractFromCards($);
  const plans = [...tablePlans, ...cardPlans].filter(p => p.plan_name);

  const hasStructure = $("table").length > 0 || $('[class*="plan"], [class*="pricing"], [data-plan]').length > 0;
  const recencyDays = daysSince(page.fetchedAt);

  const conf = sourceScore({
    firstParty: true,
    recencyDays,
    pageType: "pricing",
    structured: hasStructure,
    reputation: "official",
  });

  const factIds: string[] = [];
  const skipped: string[] = [];

  for (const plan of plans) {
    if (conf < PUBLISH_THRESHOLD) {
      skipped.push(`low-confidence:${plan.plan_name}`);
      continue;
    }

    const value_json = {
      monthly_price: plan.monthly_price ?? null,
      annual_price: plan.annual_price ?? null,
      currency: plan.currency ?? null,
      unit: plan.unit ?? null,
      billing_cycle: plan.billing_cycle ?? null,
      free_trial_days: plan.free_trial_days ?? null,
      contact_sales: !!plan.contact_sales,
      raw: plan.raw ?? {},
    };

    const fid = await upsertFact({
      orgId,
      vendorId: vendor.id,
      metric: "pricing",
      subject: `plan:${plan.plan_name}`,
      key: "price",
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
    console.log("pricing: plans parsed =", plans.length, { tables: tablePlans.length, cards: cardPlans.length });
    if (plans.length) {
      console.log(plans.slice(0, 6).map(p => ({
        name: p.plan_name,
        m: p.monthly_price, y: p.annual_price, cur: p.currency, unit: p.unit, bill: p.billing_cycle
      })));
    }
  }

  return { factIds, report: { parsed: plans.length, saved: factIds.length, skipped } };
}

// ---- compatibility shim for app/compare/actions.ts ----
export async function collectPricing(input: PricingExtractInput) {
  return extractPricing(input);
}
