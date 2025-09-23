// web/src/lib/facts/headless.ts
import * as cheerio from "cheerio";

/** ===== Public types ===== */
export type HeadlessResult = { html: string };

export type Harvest = {
  jsonBlobs: Array<{ url?: string; body: any }>;
  dataProps: any[];       // parsed from data-* attributes that contain JSON
  windowVars: Array<{ key: string; value: any }>; // __NEXT_DATA__, __NUXT__, etc.
  jsonLd: any[];          // <script type="application/ld+json">
};

export type RenderAndHarvestResult = {
  html: string;
  harvest: Harvest;
};

/** ===== Config ===== */
const DEFAULT_TIMEOUT_MS = 20_000;

// Default ON (set FACTS_HEADLESS_ENABLED=0 to disable)
export const HEADLESS_ENABLED =
  process.env.FACTS_HEADLESS_ENABLED === "0" ? false : true;

/** ===== Small utils ===== */
function safeParseJSON(s: string | null | undefined): any | null {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

function extractJsonFromHtml(html: string): Pick<Harvest, "dataProps" | "jsonLd"> {
  const $ = cheerio.load(html ?? "");
  const dataProps: any[] = [];

  // Common JSON-carrying attributes
  $('[data-props], [data-state], [data-json], [data-hydration], [data-initial-state]').each((_, el) => {
    for (const attr of ["data-props", "data-state", "data-json", "data-hydration", "data-initial-state"]) {
      const raw = $(el).attr(attr);
      const parsed = safeParseJSON(raw);
      if (parsed) dataProps.push(parsed);
    }
  });

  // JSON-LD
  const jsonLd: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    const parsed = safeParseJSON(raw);
    if (parsed) jsonLd.push(parsed);
  });

  return { dataProps, jsonLd };
}

/** ===== Basic headless (back-compat) ===== */
export async function renderPage(
  url: string,
  opts?: { timeoutMs?: number }
): Promise<HeadlessResult> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let chromium: any;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    // Playwright not installed
    return { html: "" };
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 GEOFactsBot/1.0",
  });

  try {
    const page = await context.newPage();

    await Promise.race([
      page.goto(url, { waitUntil: "networkidle", timeout: timeoutMs }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("headless: timeout")), timeoutMs)),
    ]);

    const html = await page.content();
    return { html: html ?? "" };
  } catch {
    return { html: "" };
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

/** ===== Full renderer + harvester (recommended) ===== */
export async function renderAndHarvest(
  url: string,
  opts?: { timeoutMs?: number }
): Promise<RenderAndHarvestResult> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let chromium: any;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    // Optional dependency missing → return empty shell
    return { html: "", harvest: { jsonBlobs: [], dataProps: [], windowVars: [], jsonLd: [] } };
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 GEOFactsBot/1.0 HeadlessRenderer/Playwright",
  });

  const harvest: Harvest = { jsonBlobs: [], dataProps: [], windowVars: [], jsonLd: [] };

  try {
    const page: any = await context.newPage();

    // Capture JSON responses (XHR/fetch)
    page.on("response", async (res: any) => {
      try {
        const ct = (res.headers()["content-type"] || "").toLowerCase();
        if (ct.includes("application/json")) {
          const body = await res.json().catch(() => null);
          if (body) harvest.jsonBlobs.push({ url: res.url(), body });
        }
      } catch { /* ignore */ }
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForLoadState("networkidle", { timeout: Math.min(12_000, timeoutMs) }).catch(() => {});

    // Auto-scroll to trigger lazy loads
    await page.evaluate(async () => {
      const step = 600;
      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
      const el = document.scrollingElement || document.documentElement;
      let y = 0;
      for (;;) {
        const h = el.scrollHeight || document.body.scrollHeight;
        if (y >= h) break;
        y += step;
        window.scrollTo(0, y);
        await delay(120);
      }
    }).catch(() => {});

    // Try clicking common "load more" buttons
    const clickers = [
      'button:has-text("Load more")',
      'button:has-text("Show more")',
      'button:has-text("View more")',
      'a:has-text("Load more")',
      '[data-action="load-more"]',
    ];
    for (const sel of clickers) {
      try {
        const el = await page.$(sel);
        if (el) {
          await el.click({ timeout: 1500 }).catch(() => {});
          await page.waitForTimeout(800);
        }
      } catch { /* ignore */ }
    }

    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});

    // Pull common window vars (NEXT/NUXT/APOLLO, etc.)
    harvest.windowVars = await page.evaluate(() => {
      const out: Array<{ key: string; value: any }> = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      ["__NEXT_DATA__", "__NUXT__", "__APOLLO_STATE__", "__INITIAL_STATE__"].forEach((k) => {
        if (w && w[k]) out.push({ key: k, value: w[k] });
      });
      return out;
    });

    const html: string = await page.content();

    // Also scan the final HTML for data-props + JSON-LD
    const { dataProps, jsonLd } = extractJsonFromHtml(html);
    harvest.dataProps = dataProps;
    harvest.jsonLd = jsonLd;

    return { html: html ?? "", harvest };
  } catch {
    return { html: "", harvest: { jsonBlobs: [], dataProps: [], windowVars: [], jsonLd: [] } };
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

/** ===== Dev conveniences (kept, but now use full renderer when enabled) ===== */

// Old signature, used by dev scripts. Returns html + fetchedAt when enabled.
// Uses HEADLESS_ENABLED default (ON). If disabled or playwright missing → null.
export async function renderPageIfNeeded(
  url: string
): Promise<{ html: string; fetchedAt: string } | null> {
  try {
    if (!HEADLESS_ENABLED) return null;
    const out = await renderAndHarvest(url);
    if (!out.html) return null;
    return { html: out.html, fetchedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}

// New helper: render + harvest conditionally (preferred by collectors)
export async function renderAndHarvestIfNeeded(
  url: string
): Promise<RenderAndHarvestResult | null> {
  try {
    if (!HEADLESS_ENABLED) return null;
    const out = await renderAndHarvest(url);
    if (!out.html && out.harvest.jsonBlobs.length === 0) return null;
    return out;
  } catch {
    return null;
  }
}
