/**
 * HTTP Fetcher for Facts Pipeline
 * Handles ETag/Last-Modified caching, retries, and normalization
 */

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
}

const DEFAULT_OPTIONS: Required<FetchOptions> = {
  timeout: 12000, // 12 seconds
  retries: 3,
  userAgent: 'GEOFactsBot/1.0'
};

/**
 * Normalize URL by removing fragments and unifying trailing slash
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove fragment (#...)
    urlObj.hash = '';
    
    // Unify trailing slash for root paths
    if (urlObj.pathname === '/' || urlObj.pathname === '') {
      urlObj.pathname = '/';
    }
    
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original
    return url;
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch a web page with caching, retries, and proper error handling
 */
export async function fetchPage(
  url: string, 
  prevCache?: CacheInfo,
  options: FetchOptions = {}
): Promise<FetchResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const normalizedUrl = normalizeUrl(url);
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeout);
      
      const headers: Record<string, string> = {
        'User-Agent': opts.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      };
      
      // Add conditional headers if we have cache info
      if (prevCache?.etag) {
        headers['If-None-Match'] = prevCache.etag;
      }
      if (prevCache?.lastModified) {
        headers['If-Modified-Since'] = prevCache.lastModified;
      }
      
      const response = await fetch(normalizedUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
        redirect: 'follow'
      });
      
      clearTimeout(timeoutId);
      
      // Handle 304 Not Modified
      if (response.status === 304) {
        return {
          html: '',
          status: 304,
          cache: prevCache || {},
          fetchedAt: new Date().toISOString()
        };
      }
      
      // Extract cache headers
      const cache: CacheInfo = {};
      const etag = response.headers.get('etag');
      const lastModified = response.headers.get('last-modified');
      
      if (etag) {
        cache.etag = etag;
      }
      if (lastModified) {
        cache.lastModified = lastModified;
      }
      
      // Get response text
      let html = '';
      if (response.ok) {
        html = await response.text();
      }
      
      return {
        html,
        status: response.status,
        cache,
        fetchedAt: new Date().toISOString()
      };
      
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // Timeout - retry with backoff
          if (attempt < opts.retries) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000);
            await sleep(backoffMs);
            continue;
          }
        } else if (error.message.includes('fetch')) {
          // Network error - retry with backoff
          if (attempt < opts.retries) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000);
            await sleep(backoffMs);
            continue;
          }
        }
      }
      
      // If we're on the last attempt or it's a non-retryable error, throw
      if (attempt === opts.retries) {
        throw lastError;
      }
    }
  }
  
  throw lastError || new Error('Unknown error occurred');
}

/**
 * Check if a URL is likely to be a valid web page
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Check if two URLs are from the same domain
 */
export function isSameDomain(url1: string, url2: string): boolean {
  const domain1 = extractDomain(url1);
  const domain2 = extractDomain(url2);
  return domain1 !== null && domain1 === domain2;
}

/**
 * Generate a cache key for a URL
 */
export function getCacheKey(url: string): string {
  const normalizedUrl = normalizeUrl(url);
  // Simple hash function for cache key
  let hash = 0;
  for (let i = 0; i < normalizedUrl.length; i++) {
    const char = normalizedUrl.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `fetch_${Math.abs(hash).toString(36)}`;
}

/**
 * Parse HTML content to extract basic metadata
 */
export function extractPageMetadata(html: string): {
  title?: string;
  description?: string;
  language?: string;
} {
  const metadata: { title?: string; description?: string; language?: string } = {};
  
  try {
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
    }
    
    // Extract description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    if (descMatch) {
      metadata.description = descMatch[1].trim();
    }
    
    // Extract language
    const langMatch = html.match(/<html[^>]*lang=["']([^"']*)["'][^>]*>/i);
    if (langMatch) {
      metadata.language = langMatch[1].trim();
    }
  } catch (error) {
    // Ignore parsing errors
  }
  
  return metadata;
}

/**
 * Check if response indicates the page has changed
 */
export function hasPageChanged(
  currentCache: CacheInfo, 
  previousCache?: CacheInfo
): boolean {
  if (!previousCache) {
    return true; // No previous cache, assume changed
  }
  
  // Check ETag
  if (currentCache.etag && previousCache.etag) {
    return currentCache.etag !== previousCache.etag;
  }
  
  // Check Last-Modified
  if (currentCache.lastModified && previousCache.lastModified) {
    return currentCache.lastModified !== previousCache.lastModified;
  }
  
  // If we can't determine, assume changed
  return true;
}