import { NextRequest, NextResponse } from "next/server";
import { fetchPage } from "@/lib/facts/http";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ 
        error: "URL parameter is required",
        usage: "Add ?url=https://example.com to test the fetcher"
      }, { status: 400 });
    }
    
    // Check if this is a second run (simulate cache)
    const isSecondRun = searchParams.get('cache') === 'true';
    let prevCache;
    
    if (isSecondRun) {
      // Simulate having previous cache data
      prevCache = {
        etag: '"test-etag-123"',
        lastModified: 'Wed, 21 Oct 2024 07:28:00 GMT'
      };
    }
    
    const startTime = Date.now();
    const result = await fetchPage(url, prevCache);
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      url,
      status: result.status,
      htmlLength: result.html.length,
      cache: result.cache,
      fetchedAt: result.fetchedAt,
      duration: `${duration}ms`,
      isCacheHit: result.status === 304,
      metadata: result.html ? {
        title: result.html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim(),
        hasContent: result.html.length > 0
      } : null,
      instructions: {
        firstRun: "Visit this URL to fetch the page",
        secondRun: `Visit ${request.url}&cache=true to test cache behavior`,
        expectedBehavior: "Second run should return status 304 if server supports conditional requests"
      }
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
