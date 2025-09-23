// web/src/lib/facts/classifyPage.ts
import { METRICS, type MetricKey } from "./metrics";

type Why = { urlHits: string[]; textHits: string[] };

// Priority order: higher index = higher priority
const METRIC_PRIORITY: Record<MetricKey, number> = {
  integrations: 6,
  features: 5,
  pricing: 4,
  security: 3,
  reliability: 2,
  changelog: 1
};

export function classifyPage(
  { url, text }: { url: string; text: string }
): { metric: MetricKey | "unknown"; score: number; why: Why } {
  const lower = (text || "").toLowerCase();
  let best: { m: MetricKey | "unknown"; s: number; why: Why; priority: number } = {
    m: "unknown", s: 0, why: { urlHits: [], textHits: [] }, priority: -1
  };

  (Object.keys(METRICS) as MetricKey[]).forEach((m) => {
    const def = METRICS[m];

    const urlHits = def.urlPatterns
      .filter((re) => re.test(url))
      .map((re) => re.toString());

    let textHits: string[] = [];
    for (const token of def.contentSignals) {
      if (lower.includes(token.toLowerCase())) textHits.push(token);
    }

    // Special scoring for features: boost URL weight and text bundle
    let su = urlHits.length ? 1 : 0;
    let st = Math.min(1, textHits.length / 5);
    
    if (m === "features") {
      // Features gets higher URL weight (0.55) and text bundle up to +0.35
      su = urlHits.length ? 1.0 : 0;
      const featuresTextBundle = ["features", "capabilities", "how it works", "use cases"];
      const bundleHits = featuresTextBundle.filter(token => lower.includes(token.toLowerCase())).length;
      st = Math.min(0.5, bundleHits * 0.5); // 0.5 max from bundle (0.5 per hit)
      
    } else {
      // Standard scoring for other metrics
      su = urlHits.length ? 1 : 0;
      st = Math.min(1, textHits.length / 5);
    }
    
    const score = 0.65 * su + 0.35 * st;
    const priority = METRIC_PRIORITY[m] || 0;

    // Choose best match: higher score wins, but if scores are equal, higher priority wins
    if (score > best.s || (score === best.s && priority > best.priority)) {
      best = { m, s: score, why: { urlHits, textHits }, priority };
    }
  });

  // Special tiebreaker: if both features and pricing match, prefer features when path includes /features and not /pricing
  if (best.m === "pricing" && url.includes("/features") && !url.includes("/pricing")) {
    const featuresDef = METRICS.features;
    const featuresUrlHits = featuresDef.urlPatterns.filter((re) => re.test(url));
    if (featuresUrlHits.length > 0) {
      const featuresTextHits = featuresDef.contentSignals.filter(token => lower.includes(token.toLowerCase()));
      const featuresScore = 0.65 * 1.0 + 0.35 * Math.min(0.5, featuresTextHits.length * 0.5);
      if (featuresScore >= 0.65) {
        best = { 
          m: "features", 
          s: featuresScore, 
          why: { urlHits: featuresUrlHits.map(re => re.toString()), textHits: featuresTextHits }, 
          priority: METRIC_PRIORITY.features 
        };
      }
    }
  }

  if (best.s < 0.65) return { metric: "unknown", score: best.s, why: best.why };
  return { metric: best.m, score: best.s, why: best.why };
}
