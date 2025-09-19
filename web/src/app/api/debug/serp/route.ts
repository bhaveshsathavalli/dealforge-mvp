// src/app/api/debug/serp/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get('q');
  
  if (!process.env.SERP_API_KEY) {
    return NextResponse.json({ hasKey: false });
  }

  if (!query) {
    return NextResponse.json({ hasKey: true });
  }

  // Test SerpAPI with the query
  const key = process.env.SERP_API_KEY;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const params = new URLSearchParams({
    engine: "google",
    q: query,
    num: "3",
    api_key: key,
  });

  const serpUrl = `https://serpapi.com/search.json?${params.toString()}`;
  const maskedUrl = serpUrl.replace(/api_key=[^&]+/, 'api_key=***');

  try {
    const res = await fetch(serpUrl, {
      signal: controller.signal,
    });

    console.log(`[debug/serp] ${maskedUrl} -> ${res.status}`);

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      console.log(`[debug/serp] error: ${errorText.substring(0, 200)}`);
      return NextResponse.json({ 
        hasKey: true, 
        ok: false, 
        details: `HTTP ${res.status}: ${errorText.substring(0, 100)}` 
      });
    }

    const json = await res.json();
    
    if (json.search_metadata?.status !== 'Success') {
      const details = {
        status: json.search_metadata?.status,
        error: json.error || 'Unknown SerpAPI error'
      };
      console.log(`[debug/serp] api error:`, details);
      return NextResponse.json({ 
        hasKey: true, 
        ok: false, 
        details 
      });
    }

    const organicCount = Array.isArray(json.organic_results) ? json.organic_results.length : 0;
    
    return NextResponse.json({ 
      hasKey: true, 
      ok: true, 
      organicCount, 
      status: json.search_metadata?.status 
    });

  } catch (err: any) {
    console.log(`[debug/serp] fetch failed: ${err.message}`);
    return NextResponse.json({ 
      hasKey: true, 
      ok: false, 
      details: err.message 
    });
  } finally {
    clearTimeout(timeout);
  }
}