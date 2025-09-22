// web/src/lib/facts/crawl.ts
import { fetchPage } from "./http";
import { isolateMain } from "./readability";
import { classifyPage } from "./classifyPage";
import { type MetricKey } from "./metrics";
import { recordUnknownReason } from "./persist";

const ALLOWED_SUBS = ["docs.", "help.", "support.", "status.", "trust.", "security.", "partners."];

function normalize(u: string) { return u.replace(/#.*$/, "").replace(/\/+$/, ""); }
function sameOrAllowed(host: string, rootHost: string) {
  if (host === rootHost) return true;
  return ALLOWED_SUBS.some(p => host.startsWith(p) && host.endsWith(rootHost));
}

export async function discoverMetricPages(
  { rootUrl, metric }: { rootUrl: string; metric: MetricKey }
): Promise<Array<{ url: string; title: string; classScore: number }>> {
  const start = new URL(rootUrl);
  const rootHost = start.hostname.toLowerCase();

  const seeds = [
    "/", "/product", "/platform",
    "/pricing", "/plans",
    "/integrations", "/apps", "/partners",
    "/security", "/trust",
    "/changelog", "/release-notes", "/updates", "/whats-new",
    "/status", "/docs", "/help", "/en", "/en-us"
  ].map(p => new URL(p, start.origin).toString()).map(normalize);

  const seen = new Set<string>();
  const q: Array<{ url: string; depth: number }> = [];
  for (const s of seeds) { if (!seen.has(s)) { seen.add(s); q.push({ url: s, depth: 0 }); } }

  const hits: Array<{ url: string; title: string; classScore: number }> = [];

  while (q.length && hits.length < 60) {
    const { url, depth } = q.shift()!;
    if (depth > 2) continue;

    let host = "";
    try { host = new URL(url).hostname.toLowerCase(); } catch { continue; }
    if (!sameOrAllowed(host, rootHost)) continue;

    let res;
    try {
      res = await fetchPage(url);
    } catch {
      continue; // Skip on fetch error
    }
    if (!res.html) continue;

    const iso = isolateMain(res.html);
    const cls = classifyPage({ url, text: iso.text });
    if (cls.metric === metric) hits.push({ url, title: iso.title || "", classScore: cls.score });

    // simple in-page link harvest
    const links = Array.from(res.html.matchAll(/href="([^"#]+)"/gi)).map(m => m[1]);
    for (const href of links) {
      try {
        const abs = new URL(href, url).toString();
        const clean = normalize(abs);
        const h = new URL(clean).hostname.toLowerCase();
        if (!sameOrAllowed(h, rootHost)) continue;
        if (!seen.has(clean)) { seen.add(clean); q.push({ url: clean, depth: depth + 1 }); }
      } catch { /* ignore */ }
    }
  }

  hits.sort((a, b) => b.classScore - a.classScore);
  return hits.slice(0, 8);
}

export async function pushReason(vendorId: string, metric: MetricKey, reason: string, orgId?: string) {
  try { await recordUnknownReason(vendorId, metric, reason, orgId); } catch { /* non-fatal */ }
}
