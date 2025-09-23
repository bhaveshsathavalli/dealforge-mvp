// web/scripts/dev-features.ts
import { fetchPage } from "../src/lib/facts/http";
import { isolateMain } from "../src/lib/facts/readability";
import { classifyPage } from "../src/lib/facts/classifyPage";
import { extractFeatures } from "../src/lib/facts/collectors/features";
import { renderPageIfNeeded } from "../src/lib/facts/headless";

const url = process.argv[2] ?? "https://www.intercom.com/features";
const vendorDomain = process.argv[3] ?? "intercom.com";
const vendorId = process.argv[4] ?? "00000000-0000-0000-0000-000000000000";
const orgId = process.argv[5] ?? "00000000-0000-0000-0000-000000000000";

const URL_RX = /(\/features?\b|\/capabilities?\b|\/benefits?\b|\/platform\b)/i;
const TOKENS = ["features", "capabilities", "platform", "tools", "functionality", "benefits", "solutions"];

(async () => {
  // 1) static fetch
  let res = await fetchPage(url, undefined, { forceFresh: true });
  if (!res.html) { 
    console.log("No HTML (maybe 304)"); 
    process.exit(0); 
  }

  let iso = isolateMain(res.html);
  let cls = classifyPage({ url, text: iso.text || "" });
  console.log("classify:", cls);

  const tokenHits = TOKENS.reduce((n, t) => (iso.text?.toLowerCase().includes(t) ? n + 1 : n), 0);
  const urlLooksLikeFeatures = URL_RX.test(url);
  const allowFallback = urlLooksLikeFeatures || tokenHits >= 2;

  if (cls.metric !== "features" && !allowFallback) {
    console.log("Not features; exiting.");
    console.log(JSON.stringify({ factIds: [], report: { parsed: 0, saved: 0, skipped: [] } }, null, 2));
    process.exit(0);
  }

  // 2) extractor attempt
  let out = await extractFeatures({
    orgId,
    vendor: { id: vendorId, website: `https://${vendorDomain}`, domain: vendorDomain },
    page: { url, mainHtml: iso.mainHtml, text: iso.text || "", fetchedAt: res.fetchedAt }
  });

  // 3) optional headless retry when allowed & parsed < 3 & looks like features
  if (process.env.FACTS_HEADLESS_ENABLED === "1" && out.report.parsed < 3 && allowFallback) {
    const rendered = await renderPageIfNeeded(url);
    if (rendered?.html) {
      iso = isolateMain(rendered.html);
      out = await extractFeatures({
        orgId,
        vendor: { id: vendorId, website: `https://${vendorDomain}`, domain: vendorDomain },
        page: { url, mainHtml: iso.mainHtml, text: iso.text || "", fetchedAt: rendered.fetchedAt }
      });
      console.log("classify (after headless):", classifyPage({ url, text: iso.text || "" }));
    }
  }

  console.log(JSON.stringify(out, null, 2));
})();