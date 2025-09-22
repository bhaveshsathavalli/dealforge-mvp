import { searchGoogleSerp } from '@/lib/collect/serp';

/**
 * Find the homepage URL for a product/company name using SerpAPI
 * Returns the best candidate homepage (domain only, normalized)
 */
export async function serpFindHomepage(productName: string): Promise<string> {
  try {
    // Search for the product name to find their official website
    const query = `${productName} official website`;
    const results = await searchGoogleSerp(query);
    
    if (!results.length) {
      throw new Error('No search results found');
    }
    
    // Look for the most likely homepage candidate
    for (const result of results) {
      const url = result.source_url;
      if (!url) continue;
      
      try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.toLowerCase();
        
        // Skip obvious non-homepage domains
        if (hostname.includes('wikipedia.org') || 
            hostname.includes('linkedin.com') ||
            hostname.includes('facebook.com') ||
            hostname.includes('twitter.com') ||
            hostname.includes('instagram.com') ||
            hostname.includes('youtube.com') ||
            hostname.includes('crunchbase.com') ||
            hostname.includes('glassdoor.com')) {
          continue;
        }
        
        // Check if the title or snippet suggests this is the official site
        const title = result.title?.toLowerCase() || '';
        const snippet = result.text_snippet?.toLowerCase() || '';
        
        if (title.includes('official') || 
            title.includes('home') ||
            snippet.includes('official') ||
            snippet.includes('homepage') ||
            hostname.includes(productName.toLowerCase().replace(/\s+/g, ''))) {
          
          // Return just the domain (normalized)
          return `https://${hostname}`;
        }
      } catch (e) {
        // Invalid URL, skip
        continue;
      }
    }
    
    // If no obvious match, return the first valid domain
    for (const result of results) {
      const url = result.source_url;
      if (!url) continue;
      
      try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.toLowerCase();
        
        // Skip social media and other non-homepage sites
        if (hostname.includes('wikipedia.org') || 
            hostname.includes('linkedin.com') ||
            hostname.includes('facebook.com') ||
            hostname.includes('twitter.com') ||
            hostname.includes('instagram.com') ||
            hostname.includes('youtube.com') ||
            hostname.includes('crunchbase.com') ||
            hostname.includes('glassdoor.com')) {
          continue;
        }
        
        return `https://${hostname}`;
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('No suitable homepage found');
    
  } catch (error) {
    console.error('[serpFindHomepage] Error:', error);
    throw new Error(`Failed to detect homepage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

