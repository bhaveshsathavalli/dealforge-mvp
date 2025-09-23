// web/src/lib/facts/http.ts
/**
 * HTTP fetcher for the facts pipeline.
 * - Conditional requests via ETag/Last-Modified
 * - Auto retry + cache-bust if we get 304 or empty bodies
 * - Friendly helpers used elsewhere (directFetch, normalizeHtmlOrJson, hashBody)
 */

import crypto from "crypto";

export interface CacheInfo {
  etag?: string;
  lastModified?: string;
}

export interface FetchResult {
  html: string;
  status: number;
  cache: CacheInfo;
  fetchedAt: string;
}

export interface FetchOptions {
  timeout?: number;
  retries?: number;
  userAgent?: string;
  forceFresh?: boolean;          // always add a cache-busting param
  returnPartialOn304?: boolean;  // caller will deal with cached body
}

const DEFAULT_OPTIONS: Required<FetchOptions> = {
  timeout: 12000,
  retries: 2,
  userAgent:
    'GEOFactsBot/1.0 (+https://example.invalid) FactsFetcher/Node',
  forceFresh: false,
  returnPartialOn304: false,
};

/* ---------------------------- small utilities ---------------------------- */

export function hashBody(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

/** Normalize URL by removing fragments and coalescing root slashes */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    if (!u.pathname) u.pathname = "/";
    return u.toString();
  } catch {
    return url;
  }
}

/** Sleep ms */
function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** Append/replace a query param safely */
export function withParam(url: string, key: string, value: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set(key, value);
    return u.toString();
  } catch {
    return url;
  }
}

/** Some fetch wrappers like to be sure it *is* a web URL */
export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function isSameDomain(a: string, b: string): boolean {
  const da = extractDomain(a);
  const db = extractDomain(b);
  return !!da && da === db;
}

/** Simple stable cache key */
export function getCacheKey(url: string): string {
  const n = normalizeUrl(url);
  let h = 0;
  for (let i = 0; i < n.length; i++) {
    h = ((h << 5) - h) + n.charCodeAt(i);
    h |= 0;
  }
  return `fetch_${Math.abs(h).toString(36)}`;
}

/** Minimal metadata yank (best-effort) */
export function extractPageMetadata(html: string): {
  title?: string; description?: string; language?: string;
} {
  const m: { title?: string; description?: string; language?: string } = {};
  try {
    const t = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (t) m.title = t[1].trim();
    const d = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i
    );
    if (d) m.description = d[1].trim();
    const l = html.match(/<html[^>]*lang=["']([^"']*)["'][^>]*>/i);
    if (l) m.language = l[1].trim();
  } catch {}
  return m;
}

/** Compare server cache headers */
export function hasPageChanged(current: CacheInfo, previous?: CacheInfo): boolean {
  if (!previous) return true;
  if (current.etag && previous.etag) return current.etag !== previous.etag;
  if (current.lastModified && previous.lastModified) {
    return current.lastModified !== previous.lastModified;
  }
  return true;
}

/** HTML/JSON normalizer (used in some collectors) */
export function normalizeHtmlOrJson(body: string): string {
  // For JSON-ish responses, wrap as <pre> to keep downstream cheerio safe.
  const trimmed = body.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return `<pre data-kind="json">${escapeHtml(trimmed)}</pre>`;
  }
  return body;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* -------------------------------- fetchers -------------------------------- */

/**
 * Main fetcher with smart 304/empty-body fallback.
 * If we ever see status 304 or an empty body, we retry *once* with:
 *  - cache-busting param
 *  - no conditional headers
 *  - Cache-Control: no-cache
 */
export async function fetchPage(
  url: string,
  prevCache?: CacheInfo,
  options: FetchOptions = {}
): Promise<FetchResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let target = normalizeUrl(url);

  // First pass: maybe force-fresh (explicit) or normal
  if (opts.forceFresh) {
    target = withParam(target, "__t", String(Date.now()));
  }

  // Try the request; if it returns 304/empty, fall back with cache-bust once
  const first = await doFetchOnce(target, prevCache, opts, /*allowConditionals*/ !opts.forceFresh);

  if (
    first.status === 304 ||
    (first.status >= 200 && first.status < 300 && (!first.html || first.html.length < 20))
  ) {
    // Retry once with hard no-cache + cache-bust and NO conditionals
    const busted = withParam(target, "__b", `${Date.now()}${Math.random()}`);
    const second = await doFetchOnce(busted, undefined /* drop conditionals */, {
      ...opts,
      forceFresh: true,
    }, /*allowConditionals*/ false);

    // If second also came back empty, just return second; caller can decide.
    if (second.html && second.html.length >= 20) return second;
    return second.status === 304 && opts.returnPartialOn304 ? second : second;
  }

  return first;
}

async function doFetchOnce(
  url: string,
  prevCache: CacheInfo | undefined,
  opts: Required<FetchOptions>,
  allowConditionals: boolean
): Promise<FetchResult> {
  let lastErr: any = null;

  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), opts.timeout);

      const headers: Record<string, string> = {
        "User-Agent": opts.userAgent,
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.6",
        // Let node-fetch handle decompression; don't force content-encoding
        "Cache-Control": opts.forceFresh ? "no-cache" : "max-age=0",
        "Pragma": opts.forceFresh ? "no-cache" : "no-cache",
        "Upgrade-Insecure-Requests": "1",
      };

      if (allowConditionals && prevCache) {
        if (prevCache.etag) headers["If-None-Match"] = prevCache.etag;
        if (prevCache.lastModified) headers["If-Modified-Since"] = prevCache.lastModified;
      }

      const resp = await fetch(url, {
        method: "GET",
        headers,
        redirect: "follow",
        signal: controller.signal,
      });

      clearTimeout(to);

      // Build cache info
      const cache: CacheInfo = {};
      const etag = resp.headers.get("etag");
      const lm = resp.headers.get("last-modified");
      if (etag) cache.etag = etag;
      if (lm) cache.lastModified = lm;

      let html = "";
      if (resp.status !== 304) {
        // node >=18 decodes gzip/deflate automatically
        html = await resp.text();
      }

      return {
        html,
        status: resp.status,
        cache,
        fetchedAt: new Date().toISOString(),
      };
    } catch (e: any) {
      lastErr = e;
      // Backoff on abort/network errors
      const backoff = Math.min(1000 * Math.pow(2, attempt), 5000);
      if (attempt < opts.retries) {
        await sleep(backoff);
        continue;
      }
      throw lastErr;
    }
  }

  // Should not reach here
  throw lastErr ?? new Error("Unknown fetch error");
}

/**
 * Convenience: fire a single GET and return {status, body, fetchedAt}.
 * No conditionals, always bust cache once to avoid stale 304s.
 */
export async function directFetch(
  url: string,
  opts: Partial<Pick<FetchOptions, "timeout" | "userAgent">> = {}
): Promise<{ status: number; body: string; fetchedAt: string; headers: Record<string, string> }> {
  const r = await fetchPage(url, undefined, {
    ...opts,
    retries: 0,
    forceFresh: true,
  } as FetchOptions);

  // Normalize to the old shape some scripts used
  return {
    status: r.status,
    body: r.html,
    fetchedAt: r.fetchedAt,
    headers: {}, // keep simple; extend if you need raw headers
  };
}
