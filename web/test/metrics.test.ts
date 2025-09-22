import { describe, it, expect } from 'vitest';
import { 
  METRICS, 
  ALL_METRICS, 
  urlMatchesMetric, 
  contentMatchesMetric, 
  getBestMetricMatch, 
  getMatchingMetrics,
  getMetricsByWeight,
  type MetricKey 
} from '../src/lib/facts/metrics';

describe('Metrics Registry', () => {
  describe('URL Pattern Matching', () => {
    it('should match pricing URLs', () => {
      const pricingUrls = [
        'https://example.com/pricing',
        'https://example.com/plans',
        'https://example.com/packages',
        'https://example.com/billing',
        'https://example.com/pricing/enterprise',
        'https://example.com/plans/pro',
        'https://example.com/billing/info',
        'https://example.com/price-list',
        'https://example.com/cost-breakdown'
      ];

      pricingUrls.forEach(url => {
        expect(urlMatchesMetric(url, 'pricing')).toBe(true);
      });
    });

    it('should match features URLs', () => {
      const featuresUrls = [
        'https://example.com/features',
        'https://example.com/capabilities',
        'https://example.com/platform',
        'https://example.com/product',
        'https://example.com/features/analytics',
        'https://example.com/capabilities/ai',
        'https://example.com/platform/overview'
      ];

      featuresUrls.forEach(url => {
        expect(urlMatchesMetric(url, 'features')).toBe(true);
      });
    });

    it('should match integrations URLs', () => {
      const integrationsUrls = [
        'https://example.com/integrations',
        'https://example.com/connect',
        'https://example.com/partners',
        'https://example.com/apps',
        'https://example.com/marketplace',
        'https://example.com/integrations/slack',
        'https://example.com/connect/api'
      ];

      integrationsUrls.forEach(url => {
        expect(urlMatchesMetric(url, 'integrations')).toBe(true);
      });
    });

    it('should match security URLs', () => {
      const securityUrls = [
        'https://example.com/security',
        'https://example.com/compliance',
        'https://example.com/privacy',
        'https://example.com/trust',
        'https://example.com/security/center',
        'https://example.com/compliance/gdpr',
        'https://example.com/privacy-policy'
      ];

      securityUrls.forEach(url => {
        expect(urlMatchesMetric(url, 'security')).toBe(true);
      });
    });

    it('should match reliability URLs', () => {
      const reliabilityUrls = [
        'https://example.com/uptime',
        'https://example.com/status',
        'https://example.com/reliability',
        'https://example.com/performance',
        'https://example.com/uptime/status',
        'https://example.com/status-page',
        'https://example.com/sla'
      ];

      reliabilityUrls.forEach(url => {
        expect(urlMatchesMetric(url, 'reliability')).toBe(true);
      });
    });

    it('should match changelog URLs', () => {
      const changelogUrls = [
        'https://example.com/release',
        'https://example.com/changelog',
        'https://example.com/updates',
        'https://example.com/news',
        'https://example.com/blog',
        'https://example.com/release/notes',
        'https://example.com/whats-new',
        'https://example.com/version-notes'
      ];

      changelogUrls.forEach(url => {
        expect(urlMatchesMetric(url, 'changelog')).toBe(true);
      });
    });
  });

  describe('Content Signal Matching', () => {
    it('should match pricing content signals', () => {
      const pricingContent = [
        'Our pricing starts at $99 per month',
        'Choose from our flexible plans',
        'Billed annually for savings',
        'Per user pricing available',
        'Enterprise tier includes premium features',
        'Free trial for 14 days',
        'Subscription management made easy'
      ];

      pricingContent.forEach(content => {
        expect(contentMatchesMetric(content, 'pricing')).toBe(true);
      });
    });

    it('should match features content signals', () => {
      const featuresContent = [
        'Advanced analytics dashboard',
        'Platform capabilities include',
        'Key features of our product',
        'Mobile and desktop support',
        'API integration tools',
        'Workflow automation features',
        'Cloud-based platform'
      ];

      featuresContent.forEach(content => {
        expect(contentMatchesMetric(content, 'features')).toBe(true);
      });
    });

    it('should match integrations content signals', () => {
      const integrationsContent = [
        'Integrates with Slack and Microsoft Teams',
        'Works with popular CRM systems',
        'Connect via REST API',
        'Zapier integration available',
        'OAuth 2.0 authentication',
        'Webhook support for real-time updates',
        'Third-party app marketplace'
      ];

      integrationsContent.forEach(content => {
        expect(contentMatchesMetric(content, 'integrations')).toBe(true);
      });
    });

    it('should match security content signals', () => {
      const securityContent = [
        'SOC 2 Type II certified',
        'ISO 27001 compliance',
        'SSO and MFA support',
        'End-to-end encryption',
        'GDPR compliant data handling',
        'HIPAA security controls',
        'RBAC and SCIM provisioning'
      ];

      securityContent.forEach(content => {
        expect(contentMatchesMetric(content, 'security')).toBe(true);
      });
    });

    it('should match reliability content signals', () => {
      const reliabilityContent = [
        '99.9% uptime guarantee',
        'SLA-backed service level',
        'Incident response procedures',
        'High availability architecture',
        'Disaster recovery planning',
        'Performance monitoring',
        'Redundancy and backup systems'
      ];

      reliabilityContent.forEach(content => {
        expect(contentMatchesMetric(content, 'reliability')).toBe(true);
      });
    });

    it('should match changelog content signals', () => {
      const changelogContent = [
        'New features in this release',
        'Version 2.1.0 now available',
        'What\'s new this month',
        'Bug fixes and improvements',
        'Beta release notes',
        'Roadmap updates for 2024',
        'Latest enhancements'
      ];

      changelogContent.forEach(content => {
        expect(contentMatchesMetric(content, 'changelog')).toBe(true);
      });
    });
  });

  describe('Best Metric Matching', () => {
    it('should identify pricing pages correctly', () => {
      const testCases = [
        {
          url: 'https://example.com/pricing',
          content: 'Starting at $99 per month with flexible plans',
          expected: 'pricing'
        },
        {
          url: 'https://example.com/plans',
          content: 'Choose your subscription tier',
          expected: 'pricing'
        }
      ];

      testCases.forEach(({ url, content, expected }) => {
        expect(getBestMetricMatch(url, content)).toBe(expected);
      });
    });

    it('should identify features pages correctly', () => {
      const testCases = [
        {
          url: 'https://example.com/features',
          content: 'Advanced analytics dashboard and reporting capabilities',
          expected: 'features'
        },
        {
          url: 'https://example.com/platform',
          content: 'Comprehensive platform features',
          expected: 'features'
        }
      ];

      testCases.forEach(({ url, content, expected }) => {
        expect(getBestMetricMatch(url, content)).toBe(expected);
      });
    });

    it('should identify integrations pages correctly', () => {
      const testCases = [
        {
          url: 'https://example.com/integrations',
          content: 'Connect with Slack, Microsoft Teams, and Zapier',
          expected: 'integrations'
        },
        {
          url: 'https://example.com/connect',
          content: 'API integrations and webhooks',
          expected: 'integrations'
        }
      ];

      testCases.forEach(({ url, content, expected }) => {
        expect(getBestMetricMatch(url, content)).toBe(expected);
      });
    });
  });

  describe('Utility Functions', () => {
    it('should return all metrics', () => {
      expect(ALL_METRICS).toEqual([
        'pricing',
        'features', 
        'integrations',
        'security',
        'reliability',
        'changelog'
      ]);
    });

    it('should return metrics sorted by weight', () => {
      const sortedMetrics = getMetricsByWeight();
      expect(sortedMetrics[0]).toBe('pricing'); // weight 10
      expect(sortedMetrics[1]).toBe('features'); // weight 8
      expect(sortedMetrics[2]).toBe('integrations'); // weight 7
      expect(sortedMetrics[3]).toBe('security'); // weight 6
      expect(sortedMetrics[4]).toBe('reliability'); // weight 5
      expect(sortedMetrics[5]).toBe('changelog'); // weight 4
    });

    it('should return matching metrics for a URL', () => {
      const matches = getMatchingMetrics('https://example.com/pricing');
      expect(matches).toContain('pricing');
    });

    it('should return empty array for non-matching URLs', () => {
      const matches = getMatchingMetrics('https://example.com/about');
      expect(matches).toEqual([]);
    });
  });

  describe('Metric Configuration', () => {
    it('should have correct weights', () => {
      expect(METRICS.pricing.weight).toBe(10);
      expect(METRICS.features.weight).toBe(8);
      expect(METRICS.integrations.weight).toBe(7);
      expect(METRICS.security.weight).toBe(6);
      expect(METRICS.reliability.weight).toBe(5);
      expect(METRICS.changelog.weight).toBe(4);
    });

    it('should have required keys defined', () => {
      expect(METRICS.pricing.requiredKeys).toContain('price_amount');
      expect(METRICS.features.requiredKeys).toContain('capability');
      expect(METRICS.integrations.requiredKeys).toContain('integration_name');
      expect(METRICS.security.requiredKeys).toContain('control_or_cert');
      expect(METRICS.reliability.requiredKeys).toContain('uptime_90d');
      expect(METRICS.changelog.requiredKeys).toContain('release_title');
    });

    it('should have URL patterns defined', () => {
      ALL_METRICS.forEach(metric => {
        expect(METRICS[metric].urlPatterns.length).toBeGreaterThan(0);
        expect(METRICS[metric].urlPatterns.every(pattern => pattern instanceof RegExp)).toBe(true);
      });
    });

    it('should have content signals defined', () => {
      ALL_METRICS.forEach(metric => {
        expect(METRICS[metric].contentSignals.length).toBeGreaterThan(0);
        expect(METRICS[metric].contentSignals.every(signal => typeof signal === 'string')).toBe(true);
      });
    });
  });
});
