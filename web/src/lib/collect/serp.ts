type SerpResult = {
  title?: string;
  link?: string;
  snippet?: string;
  position?: number;
};

export async function searchGoogleSerp(query: string, signal?: AbortSignal) {
  const key = process.env.SERPAPI_KEY;
  if (!key) throw new Error("Missing SERPAPI_KEY");

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", key);

  const res = await fetch(url, { signal, timeout: 8000 as any });
  if (!res.ok) throw new Error(`SerpAPI HTTP ${res.status}`);
  const json = await res.json();

  const organic: SerpResult[] = json.organic_results ?? [];
  return organic.map((r, i) => ({
    title: r.title ?? "",
    source_url: r.link ?? "",
    text_snippet: r.snippet ?? "",
    rank: r.position ?? i + 1,
    engine: "google" as const,
    query_string: query,
  }));
}
