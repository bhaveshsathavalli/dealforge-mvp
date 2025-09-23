// web/scripts/dev-pricing.ts
import { fetchPage } from "../src/lib/facts/http";
import { isolateMain } from "../src/lib/facts/readability";
import { classifyPage } from "../src/lib/facts/classifyPage";
// If your metrics helper isn’t exported/available, we also do a local regex check.
let urlMatchesMetric: undefined | ((u: string, m: "pricing") => boolean);
try {
  // optional, use if present
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  urlMatchesMetric = require("../src/lib/facts/metrics").urlMatchesMetric;
} catch {}

import { extractPricing } from "../src/lib/facts/collectors/pricing";

const url = process.argv[2] ?? "https://www.tableau.com/pricing";
const vendorDomain = process.argv[3] ?? "tableau.com";
const vendorId = process.argv[4] ?? "00000000-0000-0000-0000-000000000000";
const orgId = process.argv[5] ?? "00000000-0000-0000-0000-000000000000";

const DRY_RUN = process.env.DRY_RUN === "1";
const USE_HEADLESS = process.env.FACTS_HEADLESS_ENABLED === "1";

function urlLooksPricingSimple(u: string): boolean {
  try {
    const p = new URL(u).pathname.toLowerCase();
    // accept /pricing or /something/pricing (and trailing slash)
    return /(^|\/)pricing(\/|$)/i.test(p);
  } catch { return false; }
}

async function maybeHeadlessRender(currentUrl: string) {
  if (!USE_HEADLESS) return null;
  try {
    const { renderPage } = await import("../src/lib/facts/headless");
    const rendered = await renderPage(currentUrl, { timeoutMs: 15_000 });
    return rendered?.html ?? null;
  } catch {
    return null;
  }
}

(async () => {
  const res = await fetchPage(url, undefined, { forceFresh: true });
  if (!res.html) { console.log("No HTML (maybe 304)"); return; }

  let iso = isolateMain(res.html);
  let cls = classifyPage({ url, text: iso.text || "" });
  console.log("classify:", cls);

  // URL-strong: treat clear /pricing URLs as pricing even if classifier is unsure
  const urlLooksPricing =
    (urlMatchesMetric ? urlMatchesMetric(url, "pricing") : urlLooksPricingSimple(url));

  // If URL looks like pricing but score is weak or text is tiny, try headless BEFORE deciding
  const textWeak = (iso.text || "").length < 200 || cls.score < 0.7;
  if (urlLooksPricing && USE_HEADLESS && textWeak) {
    const rendered = await maybeHeadlessRender(url);
    if (rendered) {
      const iso2 = isolateMain(rendered);
      const cls2 = classifyPage({ url, text: iso2.text || "" });
      if (cls2.score >= cls.score) {
        iso = iso2;
        cls = cls2;
        console.log("classify (after headless):", cls2);
      }
    }
  }

  // Accept if classifier says pricing OR URL is pricing
  const isPricing = cls.metric === "pricing" || urlLooksPricing;
  if (!isPricing) {
    console.log("Not pricing; exiting.");
    return;
  }

  const out = await extractPricing({
    orgId,
    vendor: { id: vendorId, website: `https://${vendorDomain}`, domain: vendorDomain },
    page: { url, mainHtml: iso.mainHtml, text: iso.text, fetchedAt: res.fetchedAt }
  });

  // DRY mode: don’t write, mask IDs for readability
  if (DRY_RUN) {
    const fake = { factIds: out.factIds.map((_, i) => `dry-fact-${i + 1}`), report: out.report };
    console.log(JSON.stringify(fake, null, 2));
    return;
  }

  console.log(JSON.stringify(out, null, 2));
})();
