/**
 * Readability Module for Facts Pipeline
 * Isolates main content from HTML pages by removing noise elements
 */

export interface IsolatedContent {
  title: string;
  mainHtml: string;
  text: string;
}

/**
 * Remove unwanted HTML elements that contain navigation, ads, or other noise
 */
function removeNoiseElements(html: string): string {
  // Elements to remove completely
  const elementsToRemove = [
    'script', 'style', 'nav', 'header', 'footer', 'aside',
    'noscript', 'iframe', 'embed', 'object', 'applet',
    'form', 'button', 'input', 'select', 'textarea',
    'advertisement', 'ads', 'banner', 'sidebar',
    'menu', 'navigation', 'breadcrumb', 'breadcrumbs',
    'social', 'share', 'comment', 'comments',
    'cookie', 'privacy', 'terms', 'disclaimer',
    'newsletter', 'subscribe', 'popup', 'modal',
    'tooltip', 'dropdown', 'overlay', 'backdrop'
  ];

  let cleanedHtml = html;

  // Remove elements by tag name
  elementsToRemove.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis');
    cleanedHtml = cleanedHtml.replace(regex, '');
    
    // Also remove self-closing tags
    const selfClosingRegex = new RegExp(`<${tag}[^>]*/?>`, 'gi');
    cleanedHtml = cleanedHtml.replace(selfClosingRegex, '');
  });

  // Remove elements by class/id patterns
  const noisePatterns = [
    /<[^>]*class="[^"]*(?:nav|menu|header|footer|sidebar|ad|banner|social|share|comment|cookie|popup|modal)[^"]*"[^>]*>.*?<\/[^>]*>/gis,
    /<[^>]*id="[^"]*(?:nav|menu|header|footer|sidebar|ad|banner|social|share|comment|cookie|popup|modal)[^"]*"[^>]*>.*?<\/[^>]*>/gis,
    /<[^>]*class="[^"]*(?:navigation|breadcrumb|newsletter|subscribe|tooltip|dropdown|overlay)[^"]*"[^>]*>.*?<\/[^>]*>/gis,
    /<[^>]*id="[^"]*(?:navigation|breadcrumb|newsletter|subscribe|tooltip|dropdown|overlay)[^"]*"[^>]*>.*?<\/[^>]*>/gis
  ];

  noisePatterns.forEach(pattern => {
    cleanedHtml = cleanedHtml.replace(pattern, '');
  });

  return cleanedHtml;
}

/**
 * Extract title from HTML
 */
function extractTitle(html: string): string {
  // Try <title> tag first
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }

  // Try h1 tag
  const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // Try meta title
  const metaTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  if (metaTitleMatch) {
    return metaTitleMatch[1].trim();
  }

  return 'Untitled';
}

/**
 * Find the main content area using various strategies
 */
function findMainContent(html: string): string {
  // Strategy 1: Look for <main> tag
  const mainMatch = html.match(/<main[^>]*>(.*?)<\/main>/is);
  if (mainMatch) {
    return mainMatch[1];
  }

  // Strategy 2: Look for content with specific IDs
  const contentIds = ['content', 'main-content', 'main', 'article', 'post', 'page-content'];
  for (const id of contentIds) {
    // Find the opening tag and extract tag name
    const openRegex = new RegExp(`<([a-zA-Z]+)[^>]*id=["']${id}["'][^>]*>`, 'i');
    const openMatch = html.match(openRegex);
    if (openMatch) {
      const tagName = openMatch[1];
      const fullRegex = new RegExp(`<${tagName}[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\/${tagName}>`, 'i');
      const match = html.match(fullRegex);
      if (match) {
        return match[1];
      }
    }
  }

  // Strategy 3: Look for content with specific classes
  const contentClasses = ['content', 'main-content', 'main', 'article', 'post', 'page-content', 'entry-content'];
  for (const className of contentClasses) {
    // Find the opening tag and extract tag name
    const openRegex = new RegExp(`<([a-zA-Z]+)[^>]*class="[^"]*${className}[^"]*"[^>]*>`, 'i');
    const openMatch = html.match(openRegex);
    if (openMatch) {
      const tagName = openMatch[1];
      const fullRegex = new RegExp(`<${tagName}[^>]*class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\/${tagName}>`, 'i');
      const match = html.match(fullRegex);
      if (match) {
        return match[1];
      }
    }
  }

  // Strategy 4: Find the largest content block
  const bodyMatch = html.match(/<body[^>]*>(.*?)<\/body>/is);
  if (bodyMatch) {
    const bodyContent = bodyMatch[1];
    
    // Find all div, article, section elements and pick the largest
    const contentElements = bodyContent.match(/<(?:div|article|section)[^>]*>.*?<\/(?:div|article|section)>/gis) || [];
    
    if (contentElements.length > 0) {
      // Sort by content length and return the largest
      const sortedElements = contentElements.sort((a, b) => {
        const aText = stripHtmlTags(a).trim().length;
        const bText = stripHtmlTags(b).trim().length;
        return bText - aText;
      });
      
      return sortedElements[0];
    }
    
    return bodyContent;
  }

  // Fallback: return empty string if no body found
  return '';
}

/**
 * Strip HTML tags and return plain text
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove script tags
    .replace(/<style[^>]*>.*?<\/style>/gis, '') // Remove style tags
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .replace(/&[a-zA-Z0-9#]+;/g, ' '); // Replace other HTML entities
}

/**
 * Collapse whitespace in text
 */
function collapseWhitespace(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
    .trim(); // Remove leading/trailing whitespace
}

/**
 * Clean and normalize HTML content
 */
function cleanHtml(html: string): string {
  return html
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/>\s+</g, '><') // Remove whitespace between tags
    .trim();
}

/**
 * Isolate main content from HTML page
 */
export function isolateMain(html: string): IsolatedContent {
  // Extract title first (before cleaning)
  const title = extractTitle(html);
  
  // Remove noise elements
  const cleanedHtml = removeNoiseElements(html);
  
  // Find main content area
  const mainContent = findMainContent(cleanedHtml);
  
  // Clean the main content HTML
  const mainHtml = cleanHtml(mainContent);
  
  // Extract plain text
  const text = collapseWhitespace(stripHtmlTags(mainContent));
  
  return {
    title,
    mainHtml,
    text
  };
}

/**
 * Check if content appears to be the main article/content
 */
export function isMainContent(html: string): boolean {
  const content = isolateMain(html);
  
  // Check if we have substantial content
  if (content.text.length < 100) {
    return false;
  }
  
  // Check for common content indicators
  const contentIndicators = [
    /<h[1-6][^>]*>/i, // Has headings
    /<p[^>]*>/i, // Has paragraphs
    /<article[^>]*>/i, // Has article tag
    /<section[^>]*>/i, // Has section tag
    /<div[^>]*class="[^"]*content[^"]*"/i, // Has content class
    /<div[^>]*id="[^"]*content[^"]*"/i // Has content id
  ];
  
  const hasIndicators = contentIndicators.some(pattern => pattern.test(content.mainHtml));
  
  return hasIndicators;
}

/**
 * Get content statistics
 */
export function getContentStats(html: string): {
  originalLength: number;
  mainLength: number;
  textLength: number;
  compressionRatio: number;
} {
  const content = isolateMain(html);
  
  return {
    originalLength: html.length,
    mainLength: content.mainHtml.length,
    textLength: content.text.length,
    compressionRatio: content.text.length / html.length
  };
}