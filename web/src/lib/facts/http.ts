import crypto from "crypto";

export type FetchResult = { 
  status: 404; 
  url: string; 
  etag?: string; 
  lastModified?: string; 
  body?: string 
};

export async function directFetch(url: string, opts?: { etag?: string; lastModified?: string; timeoutMs?: number }): Promise<FetchResult> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 12000);
  const headers: Record<string, string> = {};
  
  if (opts?.etag) headers["If-None-Match"] = opts.etag;
  if (opts?.lastModified) headers["If-Modified-Since"] = opts.lastModified;
  
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    const etag = res.headers.get("ETag") ?? undefined;
    const lastModified = res.headers.get("Last-Modified") ?? undefined;
    
    if (res.status === 304) return { status: 304, url, etag, lastModified };
    
    const body = await res.text();
    return { status: res.status, url, etag, lastModified, body };
  } finally {
    clearTimeout(t);
  }
}

export function normalizeHtmlOrJson(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function hashBody(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}