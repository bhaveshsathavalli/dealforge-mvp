export function sourceScore(p: {
  firstParty: boolean;
  recencyDays: number;
  pageType: "pricing" | "features" | "integrations" | "security" | "reliability" | "changelog" | "marketplace" | "social" | "docs" | "blog" | "review";
  structured: boolean;
  reputation: "official" | "marketplace" | "review" | "forum" | "news";
}) {
  const rec = p.recencyDays <= 90 ? 1 : p.recencyDays <= 365 ? 0.6 : 0.3;
  const typeW = {
    pricing: 1, features: 0.9, integrations: 0.9, security: 1, reliability: 1,
    changelog: 0.8, marketplace: 0.8, social: 0.3, docs: 0.9, blog: 0.5, review: 0.6
  }[p.pageType];
  const repW = {
    official: 1, marketplace: 0.85, review: 0.7, forum: 0.4, news: 0.5
  }[p.reputation];
  
  let s = 0;
  if (p.firstParty) s += 0.45;
  s += 0.20 * rec;
  s += 0.15 * typeW;
  s += 0.10 * (p.structured ? 1 : 0.4);
  s += 0.10 * repW;
  
  return Math.max(0, Math.min(1, s));
}

export function factScore(sourceScores: number[], distinctDomains: number) {
  const maxS = Math.max(...sourceScores, 0);
  const top2 = sourceScores.sort((a, b) => b - a).slice(0, 2);
  const meanTop2 = top2.length ? top2.reduce((a, b) => a + b, 0) / top2.length : 0;
  
  let f = 0.7 * maxS + 0.3 * meanTop2;
  f += Math.min(0.1, 0.03 * Math.max(0, distinctDomains - 1));
  
  return Math.max(0, Math.min(1, f));
}

export function answerScore(reliability: number, completeness: number, specificity: number) {
  return Math.max(0, Math.min(1, 0.6 * reliability + 0.2 * completeness + 0.2 * specificity));
}