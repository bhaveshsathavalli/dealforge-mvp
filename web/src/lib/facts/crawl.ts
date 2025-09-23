// web/src/lib/facts/crawl.ts
import { fetchPage } from "./http";
import { isolateMain } from "./readability";
import { classifyPage } from "./classifyPage";
import { type MetricKey, urlMatchesMetric } from "./metrics";
import { recordUnknownReason } from "./persist";

const ALLOWED_SUBS = [
  "docs.", "help.", "support.", "status.", "trust.", "security.", "partners.",
];

function normalize(u: string) {
  // drop fragment + trailing slashes, but preserve query string
  return u.replace(/#.*$/, "").replace(/\/+$/, "");
}

function sameOrAllowed(host: string, rootHost: string) {
  if (host === rootHost) return true;
  return ALLOWED_SUBS.some((p) => host.startsWith(p) && host.endsWith(rootHost));
}

// Skip obvious non-HTML assets and files
function isLikelyHtmlUrl(u: URL): boolean {
  const p = u.pathname.toLowerCase();
  // if it looks like a file with one of these extensions, skip it
  if (/\.(?:css|js|mjs|ts|tsx|png|jpe?g|gif|webp|svg|ico|bmp|pdf|zip|gz|tar|tgz|mp4|webm|mp3|wav|json|xml|csv|txt|woff2?|ttf|eot)$/i.test(p)) {
    return false;
  }
  return true;
}

// Lightweight text probe to decide if headless is worth trying
function looksLikePricingText(t: string): boolean {
  if (!t) return false;
  const lc = t.toLowerCase();
  const needles = [
    "$", "€", "£", "¥",
    "per user", "per seat", "per month", "per year",
    "billed monthly", "billed annually",
    "plan", "pricing", "price",
  ];
  return needles.some((n) => lc.includes(n));
}

type Hit = { url: string; title: string; classScore: number };

/**
 * Bounded BFS crawler that only returns pages that look like the requested metric.
 * - Depth ≤ 2
 * - Pages visited ≤ 60
 * - Same domain or allowed subdomains (docs/help/status/trust/security/partners)
 *
 * Prefers classifier-confirmed pages, but also accepts URL-strong seeds
 * when score ≥ 0.65 to avoid missing JS-heavy pages.
 *
 * Optional headless retry: when FACTS_HEADLESS_ENABLED === "1", will render with Playwright
 * if (a) URL matches metric, (b) initial score < 0.70, and (c) page text has pricing-ish tokens.
 */
export async function discoverMetricPages(
  { rootUrl, metric }: { rootUrl: string; metric: MetricKey }
): Promise<Hit[]> {
  const start = new URL(rootUrl);
  const rootHost = start.hostname.toLowerCase();

  // Common entry points
  const seeds = [
    "/", "/product", "/platform",
    "/pricing", "/plans",
    "/integrations", "/apps", "/partners",
    "/security", "/trust",
    "/changelog", "/release-notes", "/updates", "/whats-new",
    "/status", "/docs", "/help", "/en", "/en-us",
  ]
    .map((p) => new URL(p, start.origin).toString())
    .map(normalize);

  const seen = new Set<string>();
  const q: Array<{ url: string; depth: number }> = [];
  for (const s of seeds) {
    if (!seen.has(s)) {
      seen.add(s);
      q.push({ url: s, depth: 0 });
    }
  }

  const hits: Hit[] = [];
  const MAX_VISITS = 60;
  const MAX_DEPTH = 2;
  let visits = 0;

  while (q.length && visits < MAX_VISITS && hits.length < MAX_VISITS) {
    const { url, depth } = q.shift()!;
    if (depth > MAX_DEPTH) continue;

    // domain guard
    let host = "";
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch {
      continue;
    }
    if (!sameOrAllowed(host, rootHost)) continue;

    // fetch (use forceFresh for seeds, handle 304 properly)
    let res: { html?: string | null; status?: number } | undefined;
    try {
      res = await fetchPage(url, undefined, { forceFresh: depth === 0 });
      visits++;
    } catch {
      // transient network error; just skip
      continue;
    }

    // 304 Not Modified – we don't have new HTML, skip classification/harvest
    if (res?.status === 304) {
      continue;
    }

    if (!res?.html || res.html.length < 20) {
      // Empty or very short HTML — nothing to classify from
      continue;
    }

    // extract + classify
    let iso = isolateMain(res.html);
    let cls = classifyPage({ url, text: iso.text || "" });
    const urlLooksRight = urlMatchesMetric(url, metric);

    // Optional headless retry (best-effort)
    if (
      process.env.FACTS_HEADLESS_ENABLED === "1" &&
      urlLooksRight &&
      cls.score < 0.70 &&
      looksLikePricingText(iso.text || "")
    ) {
      try {
        const { renderPage } = await import("./headless");
        const rendered = await renderPage(url, { timeoutMs: 15_000 });
        if (rendered.html) {
          const iso2 = isolateMain(rendered.html);
          const cls2 = classifyPage({ url, text: iso2.text || "" });
          if (cls2.score >= 0.70 && cls2.metric === metric) {
            // Upgrade to rendered result
            iso = iso2;
            cls = cls2;
          }
        }
      } catch {
        // headless is best-effort; ignore failures
      }
    }

    // Accept when:
    // 1) Classifier is confident it's the target metric; OR
    // 2) URL clearly matches the metric AND score ≥ 0.65 (URL-strong, text-light)
    if (cls.metric === metric || (urlLooksRight && cls.score >= 0.65)) {
      hits.push({
        url,
        title: iso.title || "",
        classScore: cls.score,
      });
    }

    // BFS outlinks (only if we have HTML content)
    if (res.html && res.html.length > 0) {
      // Robust regex for href attributes with single or double quotes, any case
      const linkRe = /href\s*=\s*(?:"([^"#\s]+)"|'([^'#\s]+)')/gi;
      const links = Array.from(res.html.matchAll(linkRe))
        .map((m) => m[1] || m[2])
        .filter(Boolean) as string[];

      for (const href of links) {
        try {
          // Guard against non-http(s) protocols
          if (
            href.startsWith("mailto:") ||
            href.startsWith("tel:") ||
            href.startsWith("javascript:")
          ) {
            continue;
          }

          const target = new URL(href, url); // resolve relative → absolute

          // Only http(s)
          if (target.protocol !== "http:" && target.protocol !== "https:") continue;

          // Skip obvious static assets/files
          if (!isLikelyHtmlUrl(target)) continue;

          const clean = normalize(target.toString());
          const h = target.hostname.toLowerCase();
          if (!sameOrAllowed(h, rootHost)) continue;

          if (!seen.has(clean)) {
            seen.add(clean);
            q.push({ url: clean, depth: depth + 1 });
          }
        } catch {
          /* ignore invalid links */
        }
      }
    }
  }

  hits.sort((a, b) => b.classScore - a.classScore);
  return hits.slice(0, 8);
}

/**
 * Non-fatal reason logger (used by orchestrator when no publishable facts).
 * Call signature of recordUnknownReason may require orgId; pass only if present.
 */
export async function pushReason(
  vendorId: string,
  metric: MetricKey,
  reason: string,
  orgId?: string
) {
  try {
    if (orgId) {
      await recordUnknownReason(vendorId, metric, reason, orgId);
    } else {
      // @ts-expect-error allow 3-arg call when orgId is not required
      await recordUnknownReason(vendorId, metric, reason);
    }
  } catch {
    // logging is best-effort
  }
}
