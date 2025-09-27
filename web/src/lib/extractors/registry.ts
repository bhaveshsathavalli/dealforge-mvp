import { featuresMarkdown } from './markdown/features.md';

export type PageKind = 'pricing' | 'features' | 'integrations' | 'trust' | 'changelog';

// TODO: Implement JSON-first features extractor
async function featuresJsonFirst(input: any): Promise<any[]> {
  return [];
}

// TODO: Implement DOM features extractor  
async function featuresDom(input: any): Promise<any[]> {
  return [];
}

export const registry = {
  features: [featuresJsonFirst, featuresDom, featuresMarkdown],
  // Other extractor types can be added here as needed
};

export function isSufficient(kind: PageKind, out: any): boolean {
  switch (kind) {
    case 'pricing':
      return Array.isArray(out) && out.some((item: any) => item.price || item.monthly_price || item.annual_price);
    
    case 'features':
      return Array.isArray(out) && out.length >= 10;
    
    case 'integrations':
      return Array.isArray(out) && out.length >= 10;
    
    case 'trust':
      return Array.isArray(out) && out.some((item: any) => item.badge || item.certification);
    
    case 'changelog':
      return Array.isArray(out) && out.length >= 3;
    
    default:
      return false;
  }
}
