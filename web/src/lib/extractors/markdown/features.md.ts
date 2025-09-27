import { canonicalizeFeature, inferSupport, parsePlansFromText, type FeatureSlug, type Support } from '../../features/taxonomy';

export interface FeatureItem {
  vendor: string;
  feature: FeatureSlug;
  display: string;
  support: Support;
  plans?: string[];
  proof_url: string;
  fetchedAt: string;
  confidence: number;
}

export interface FeaturesMarkdownOptions {
  md: string;
  url: string;
}

export function featuresMarkdown({ md, url }: FeaturesMarkdownOptions): FeatureItem[] {
  const results: FeatureItem[] = [];
  const vendor = new URL(url).hostname;
  const fetchedAt = new Date().toISOString();

  // Find sections with relevant headings
  const sectionRegex = /^#{1,6}\s+(.+)$/gm;
  const sections: Array<{ heading: string; content: string; startIndex: number }> = [];
  
  const allMatches = Array.from(md.matchAll(sectionRegex));
  for (let i = 0; i < allMatches.length; i++) {
    const match = allMatches[i];
    const heading = match[1].toLowerCase();
    if (/feature|capabilit|platform|security|admin|integration|compare/.test(heading)) {
      const startIndex = match.index!;
      const nextMatch = allMatches[i + 1];
      const endIndex = nextMatch ? nextMatch.index! : md.length;
      const content = md.slice(startIndex, endIndex);
      sections.push({ heading: match[1], content, startIndex });
    }
  }

  // Process each section
  for (const section of sections) {
    const isFeatureSection = /feature|capabilit/.test(section.heading.toLowerCase());
    
    // Extract bullet points
    const bulletRegex = /^[-*+]\s+(.+)$/gmi;
    const bulletMatches = Array.from(section.content.matchAll(bulletRegex));
    for (const bulletMatch of bulletMatches) {
      const text = bulletMatch[1];
      const feature = canonicalizeFeature(text);
      if (!feature) continue;

      const support = inferSupport(text);
      const plans = parsePlansFromText(text);
      const confidence = isFeatureSection ? 0.8 : 0.7;

      results.push({
        vendor,
        feature,
        display: text,
        support,
        plans: plans.length > 0 ? plans : undefined,
        proof_url: url,
        fetchedAt,
        confidence,
      });
    }

    // Extract table rows
    const tableRegex = /^\|(.+)\|$/gm;
    const tableMatches = Array.from(section.content.matchAll(tableRegex));
    for (const tableMatch of tableMatches) {
      const row = tableMatch[1];
      const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
      
      // Skip header rows (usually contain "Feature", "Plan", etc.)
      if (cells.some(cell => /feature|plan|capability|available/i.test(cell))) continue;
      
      // Look for feature in first cell and availability in other cells
      const featureText = cells[0] || '';
      const availabilityText = cells.slice(1).join(' ');
      
      const feature = canonicalizeFeature(featureText);
      if (!feature) continue;

      const support = inferSupport(availabilityText || featureText);
      const plans = parsePlansFromText(availabilityText || featureText);
      const confidence = 0.9; // High confidence for table data

      results.push({
        vendor,
        feature,
        display: featureText,
        support,
        plans: plans.length > 0 ? plans : undefined,
        proof_url: url,
        fetchedAt,
        confidence,
      });
    }
  }

  // Also process the entire document for any missed features
  const globalBulletRegex = /^[-*+]\s+(.+)$/gmi;
  const globalMatches = Array.from(md.matchAll(globalBulletRegex));
  for (const globalMatch of globalMatches) {
    const text = globalMatch[1];
    const feature = canonicalizeFeature(text);
    if (!feature) continue;

    // Skip if we already found this feature in a section
    if (results.some(r => r.feature === feature && r.display === text)) continue;

    const support = inferSupport(text);
    const plans = parsePlansFromText(text);
    const confidence = 0.7;

    results.push({
      vendor,
      feature,
      display: text,
      support,
      plans: plans.length > 0 ? plans : undefined,
      proof_url: url,
      fetchedAt,
      confidence,
    });
  }

  // Filter out low confidence items
  return results.filter(item => item.confidence >= 0.7);
}
