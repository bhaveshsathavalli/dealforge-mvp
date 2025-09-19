// src/app/api/_diag/ping-serp/route.ts
export const maxDuration = 15; // vercel/edge safety if needed

export async function GET() {
  const key = process.env.SERPAPI_KEY ?? process.env.SERP_API_KEY;
  if (!key) {
    return Response.json({ ok: false, error: "Missing SERPAPI_KEY (or SERP_API_KEY) in env" }, { status: 500 });
  }

  // Small, cheap query against SerpAPI's Google engine
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("q", "site:serpapi.com pricing");
  url.searchParams.set("engine", "google");
  url.searchParams.set("api_key", key);
  url.searchParams.set("num", "1");

  try {
    const r = await fetch(url.toString());
    const j = await r.json();
    return Response.json({ ok: true, status: r.status, haveOrganic: Boolean(j?.organic_results?.length) });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
