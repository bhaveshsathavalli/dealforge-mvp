/**
 * Facts Pipeline Metric Registry
 * Single source of truth for what we collect and how to recognize it
 */

export type MetricKey = "pricing" | "features" | "integrations" | "security" | "reliability" | "changelog";

export interface MetricConfig {
  urlPatterns: RegExp[];
  contentSignals: string[];
  requiredKeys: string[];
  weight: number;
}

export const METRICS: Record<MetricKey, MetricConfig> = {
  pricing: {
    urlPatterns: [
      /(pricing|plans|packages|billing)/i,
      /\/pricing/i,
      /\/plans/i,
      /\/packages/i,
      /\/billing/i,
      /price/i,
      /cost/i
    ],
    contentSignals: [
      "pricing",
      "plan",
      "per month",
      "per user",
      "billed",
      "subscription",
      "tier",
      "enterprise",
      "starter",
      "pro",
      "free",
      "trial",
      "$",
      "€",
      "£",
      "¥"
    ],
    requiredKeys: ["price_amount"],
    weight: 10
  },

  features: {
    urlPatterns: [
      /(features|capabilities|platform)/i,
      /\/features/i,
      /\/capabilities/i,
      /\/platform/i,
      /\/product/i,
      /what.*we.*offer/i,
      /our.*features/i,
      /\bfeatures\b/i
    ],
    contentSignals: [
      "features",
      "capabilities",
      "platform",
      "functionality",
      "tools",
      "dashboard",
      "analytics",
      "reporting",
      "automation",
      "workflow",
      "integration",
      "api",
      "mobile",
      "desktop",
      "cloud",
      "how it works",
      "use cases"
    ],
    requiredKeys: ["capability"],
    weight: 8
  },

  integrations: {
    urlPatterns: [
      /(integrations|works with|connect)/i,
      /\/integrations?\b/i,
      /\/connect/i,
      /\/partners?\b/i,
      /\/apps?\b/i,
      /\/marketplace/i,
      /\/addons?\b/i,
      /\/extensions?\b/i,
      /\/directory/i,
      /third.*party/i,
      /api.*integrations/i
    ],
    contentSignals: [
      "integrations",
      "works with",
      "connect",
      "partners",
      "apps",
      "marketplace",
      "add-on",
      "extension",
      "app directory",
      "api",
      "webhook",
      "sso",
      "oauth",
      "rest",
      "graphql",
      "zapier",
      "slack",
      "microsoft",
      "google",
      "salesforce"
    ],
    requiredKeys: ["integration_name"],
    weight: 7
  },

  security: {
    urlPatterns: [
      /(security|compliance|privacy)/i,
      /\/security/i,
      /\/compliance/i,
      /\/privacy/i,
      /\/trust/i,
      /\/safety/i,
      /data.*protection/i,
      /security.*center/i
    ],
    contentSignals: [
      "SOC",
      "ISO",
      "SSO",
      "MFA",
      "SCIM",
      "encryption",
      "security",
      "compliance",
      "privacy",
      "gdpr",
      "hipaa",
      "sox",
      "pci",
      "audit",
      "certification",
      "penetration",
      "vulnerability",
      "firewall",
      "vpn",
      "2fa",
      "rbac"
    ],
    requiredKeys: ["control_or_cert"],
    weight: 6
  },

  reliability: {
    urlPatterns: [
      /(uptime|incidents)/i,
      /\/uptime/i,
      /\/status/i,
      /\/reliability/i,
      /\/performance/i,
      /service.*level/i,
      /\bsla\b/i,
      /incident/i,
      /outage/i,
      /maintenance/i,
      /availability.*report/i,
      /system.*availability/i
    ],
    contentSignals: [
      "uptime",
      "SLA",
      "incidents",
      "availability",
      "reliability",
      "performance",
      "downtime",
      "outage",
      "maintenance",
      "monitoring",
      "alerting",
      "redundancy",
      "backup",
      "disaster",
      "recovery",
      "99.9",
      "99.99",
      "99.999",
      "guarantee",
      "service level",
      "response",
      "procedures",
      "architecture",
      "planning",
      "systems"
    ],
    requiredKeys: ["uptime_90d"],
    weight: 5
  },

  changelog: {
    urlPatterns: [
      /(release|what's new|version|changelog)/i,
      /\/release/i,
      /\/changelog/i,
      /\/updates/i,
      /\/news/i,
      /\/blog/i,
      /version.*notes/i,
      /release.*notes/i,
      /what.*new/i,
      /latest.*updates/i
    ],
    contentSignals: [
      "release",
      "what's new",
      "version",
      "changelog",
      "updates",
      "new features",
      "improvements",
      "bug fixes",
      "enhancements",
      "roadmap",
      "beta",
      "alpha",
      "rc",
      "v1",
      "v2",
      "2024",
      "2025",
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december"
    ],
    requiredKeys: ["release_title"],
    weight: 4
  }
};

export const ALL_METRICS: MetricKey[] = Object.keys(METRICS) as MetricKey[];

/**
 * Check if a URL matches any pattern for a given metric
 */
export function urlMatchesMetric(url: string, metric: MetricKey): boolean {
  const patterns = METRICS[metric].urlPatterns;
  return patterns.some(pattern => pattern.test(url));
}

/**
 * Check if content contains signals for a given metric
 */
export function contentMatchesMetric(content: string, metric: MetricKey): boolean {
  const signals = METRICS[metric].contentSignals;
  const lowerContent = content.toLowerCase();
  return signals.some(signal => lowerContent.includes(signal.toLowerCase()));
}

/**
 * Get the best matching metric for a URL and content
 */
export function getBestMetricMatch(url: string, content: string): MetricKey | null {
  let bestMatch: MetricKey | null = null;
  let bestScore = 0;

  for (const metric of ALL_METRICS) {
    let score = 0;
    
    // URL pattern matching
    if (urlMatchesMetric(url, metric)) {
      score += METRICS[metric].weight;
    }
    
    // Content signal matching
    if (contentMatchesMetric(content, metric)) {
      score += METRICS[metric].weight * 0.5; // Content signals are less reliable than URL patterns
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = metric;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}

/**
 * Get all metrics that match a URL
 */
export function getMatchingMetrics(url: string): MetricKey[] {
  return ALL_METRICS.filter(metric => urlMatchesMetric(url, metric));
}

/**
 * Get metrics sorted by weight (highest first)
 */
export function getMetricsByWeight(): MetricKey[] {
  return [...ALL_METRICS].sort((a, b) => METRICS[b].weight - METRICS[a].weight);
}
