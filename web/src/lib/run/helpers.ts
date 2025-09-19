// src/lib/run/helpers.ts
import { cookies } from "next/headers";

type NormalizedHit = {
  source_url: string;
  domain: string;
  title: string;
  text_snippet: string;
  rank: number;
  engine: string;         // "google"
  query_string: string;
};

export function domainOf(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export async function serpSearch(query: string, budgetMs = 8000): Promise<NormalizedHit[]> {
  const key = process.env.SERP_API_KEY;
  if (!key) throw new Error("Missing SERP_API_KEY");

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), budgetMs);

  const params = new URLSearchParams({
    engine: "google",
    q: query,
    num: "12",
    api_key: key,
  });

  try {
    const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`SerpAPI ${res.status}`);
    }
    const json = await res.json();

    const organic = Array.isArray(json.organic_results) ? json.organic_results : [];
    const out: NormalizedHit[] = organic
      .map((r: any, i: number) => {
        const url = r.link || r.url;
        if (!url) return null;
        return {
          source_url: url,
          domain: domainOf(url),
          title: r.title || "",
          text_snippet: r.snippet || r.snippet_highlighted_words?.join(" ") || "",
          rank: typeof r.position === "number" ? r.position : i + 1,
          engine: "google",
          query_string: query,
        };
      })
      .filter(Boolean) as NormalizedHit[];

    return out;
  } catch (e) {
    console.error("[serpapi] fetch failed:", e);
    return [];
  } finally {
    clearTimeout(t);
  }
}