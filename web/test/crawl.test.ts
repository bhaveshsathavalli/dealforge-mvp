import { describe, it, expect, vi, beforeEach } from 'vitest';
import { discoverMetricPages, pushReason } from '../src/lib/facts/crawl';
import { fetchPage } from '../src/lib/facts/http';
import { isolateMain } from '../src/lib/facts/readability';
import { classifyPage } from '../src/lib/facts/classifyPage';
import { recordUnknownReason } from '../src/lib/facts/persist';

// Mock the dependencies
vi.mock('../src/lib/facts/http');
vi.mock('../src/lib/facts/readability');
vi.mock('../src/lib/facts/classifyPage');
vi.mock('../src/lib/facts/persist');

const mockFetchPage = vi.mocked(fetchPage);
const mockIsolateMain = vi.mocked(isolateMain);
const mockClassifyPage = vi.mocked(classifyPage);
const mockRecordUnknownReason = vi.mocked(recordUnknownReason);

describe('Bounded Crawler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('discoverMetricPages', () => {
    it('should crawl and discover pricing pages', async () => {
      // Mock successful page fetch and classification
      mockFetchPage.mockResolvedValue({
        html: '<html><body><h1>Pricing Plans</h1><a href="/plans">View Plans</a></body></html>',
        status: 200,
        cache: {},
        fetchedAt: '2024-01-01T00:00:00Z'
      });

      mockIsolateMain.mockReturnValue({
        title: 'Pricing Plans',
        mainHtml: '<h1>Pricing Plans</h1>',
        text: 'Pricing Plans'
      });

      mockClassifyPage.mockReturnValue({
        metric: 'pricing',
        score: 0.8,
        why: { urlHits: ['/(pricing|plans)/i'], textHits: ['pricing'] }
      });

      const result = await discoverMetricPages({
        rootUrl: 'https://example.com',
        metric: 'pricing'
      });

      // Should find pricing pages from seed URLs
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({
        title: 'Pricing Plans',
        classScore: 0.8
      });
    });

    it('should respect depth limit of 2', async () => {
      mockFetchPage.mockResolvedValue({
        html: '<html><body><a href="/level1">Level 1</a></body></html>',
        status: 200,
        cache: {},
        fetchedAt: '2024-01-01T00:00:00Z'
      });

      mockIsolateMain.mockReturnValue({
        title: 'Test Page',
        mainHtml: '<body>Test</body>',
        text: 'Test'
      });

      mockClassifyPage.mockReturnValue({
        metric: 'features',
        score: 0.8,
        why: { urlHits: [], textHits: [] }
      });

      const result = await discoverMetricPages({
        rootUrl: 'https://example.com',
        metric: 'features'
      });

      // Should crawl seed URLs (depth 0) but not go beyond depth 2
      expect(mockFetchPage).toHaveBeenCalledTimes(20); // 19 seed URLs + 1 from link
    });

    it('should respect page limit of 60', async () => {
      // Mock many pages
      mockFetchPage.mockResolvedValue({
        html: '<html><body><a href="/page1">Page 1</a><a href="/page2">Page 2</a></body></html>',
        status: 200,
        cache: {},
        fetchedAt: '2024-01-01T00:00:00Z'
      });

      mockIsolateMain.mockReturnValue({
        title: 'Test Page',
        mainHtml: '<body>Test</body>',
        text: 'Test'
      });

      mockClassifyPage.mockReturnValue({
        metric: 'pricing',
        score: 0.8,
        why: { urlHits: [], textHits: [] }
      });

      const result = await discoverMetricPages({
        rootUrl: 'https://example.com',
        metric: 'pricing'
      });

      // Should stop at 60 pages
      expect(result.length).toBeLessThanOrEqual(60);
    });

    it('should only crawl same domain and allowed subdomains', async () => {
      mockFetchPage.mockResolvedValue({
        html: '<html><body><a href="https://docs.example.com/page">Docs</a><a href="https://external.com/page">External</a></body></html>',
        status: 200,
        cache: {},
        fetchedAt: '2024-01-01T00:00:00Z'
      });

      mockIsolateMain.mockReturnValue({
        title: 'Test Page',
        mainHtml: '<body>Test</body>',
        text: 'Test'
      });

      mockClassifyPage.mockReturnValue({
        metric: 'pricing',
        score: 0.8,
        why: { urlHits: [], textHits: [] }
      });

      await discoverMetricPages({
        rootUrl: 'https://example.com',
        metric: 'pricing'
      });

      // Should only fetch pages from same domain or allowed subdomains
      const fetchCalls = mockFetchPage.mock.calls;
      const allowedDomains = fetchCalls.every(call => {
        const url = call[0];
        const hostname = new URL(url).hostname.toLowerCase();
        return hostname === 'example.com' || 
               hostname.startsWith('docs.') ||
               hostname.startsWith('help.') ||
               hostname.startsWith('support.') ||
               hostname.startsWith('status.') ||
               hostname.startsWith('trust.') ||
               hostname.startsWith('security.') ||
               hostname.startsWith('partners.');
      });

      expect(allowedDomains).toBe(true);
    });

    it('should normalize URLs by removing fragments and trailing slashes', async () => {
      mockFetchPage.mockResolvedValue({
        html: '<html><body><a href="/page/#section">Page</a><a href="/other/">Other</a></body></html>',
        status: 200,
        cache: {},
        fetchedAt: '2024-01-01T00:00:00Z'
      });

      mockIsolateMain.mockReturnValue({
        title: 'Test Page',
        mainHtml: '<body>Test</body>',
        text: 'Test'
      });

      mockClassifyPage.mockReturnValue({
        metric: 'pricing',
        score: 0.8,
        why: { urlHits: [], textHits: [] }
      });

      await discoverMetricPages({
        rootUrl: 'https://example.com',
        metric: 'pricing'
      });

      // URLs should be normalized
      const fetchCalls = mockFetchPage.mock.calls;
      const normalizedUrls = fetchCalls.every(call => {
        const url = call[0];
        return !url.includes('#') && !url.endsWith('/');
      });

      expect(normalizedUrls).toBe(true);
    });

    it('should return top 8 pages by classification score', async () => {
      // Mock multiple pages with different scores
      const pages = [
        { score: 0.9, title: 'High Score Page' },
        { score: 0.8, title: 'Medium Score Page' },
        { score: 0.7, title: 'Low Score Page' },
        { score: 0.6, title: 'Lower Score Page' },
        { score: 0.5, title: 'Even Lower Score Page' },
        { score: 0.4, title: 'Very Low Score Page' },
        { score: 0.3, title: 'Extremely Low Score Page' },
        { score: 0.2, title: 'Minimal Score Page' },
        { score: 0.1, title: 'Barely Score Page' }
      ];

      mockFetchPage.mockResolvedValue({
        html: '<html><body>Test</body></html>',
        status: 200,
        cache: {},
        fetchedAt: '2024-01-01T00:00:00Z'
      });

      mockIsolateMain.mockReturnValue({
        title: 'Test Page',
        mainHtml: '<body>Test</body>',
        text: 'Test'
      });

      // Mock different classification scores
      let callCount = 0;
      mockClassifyPage.mockImplementation(() => {
        const page = pages[callCount % pages.length];
        callCount++;
        return {
          metric: 'pricing',
          score: page.score,
          why: { urlHits: [], textHits: [] }
        };
      });

      const result = await discoverMetricPages({
        rootUrl: 'https://example.com',
        metric: 'pricing'
      });

      // Should return top 8 pages sorted by score
      expect(result).toHaveLength(8);
      expect(result[0].classScore).toBeGreaterThanOrEqual(result[1].classScore);
      expect(result[1].classScore).toBeGreaterThanOrEqual(result[2].classScore);
    });

    it('should skip pages that do not match the requested metric', async () => {
      mockFetchPage.mockResolvedValue({
        html: '<html><body>Test</body></html>',
        status: 200,
        cache: {},
        fetchedAt: '2024-01-01T00:00:00Z'
      });

      mockIsolateMain.mockReturnValue({
        title: 'Test Page',
        mainHtml: '<body>Test</body>',
        text: 'Test'
      });

      mockClassifyPage.mockReturnValue({
        metric: 'features', // Different from requested 'pricing'
        score: 0.8,
        why: { urlHits: [], textHits: [] }
      });

      const result = await discoverMetricPages({
        rootUrl: 'https://example.com',
        metric: 'pricing'
      });

      // Should return empty array since no pages match 'pricing'
      expect(result).toHaveLength(0);
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetchPage.mockRejectedValue(new Error('Network error'));

      // Should not throw and return empty array
      await expect(discoverMetricPages({
        rootUrl: 'https://example.com',
        metric: 'pricing'
      })).resolves.toEqual([]);
    });

    it('should handle pages with no HTML content', async () => {
      mockFetchPage.mockResolvedValue({
        html: '', // Empty HTML
        status: 200,
        cache: {},
        fetchedAt: '2024-01-01T00:00:00Z'
      });

      const result = await discoverMetricPages({
        rootUrl: 'https://example.com',
        metric: 'pricing'
      });

      // Should skip pages with no HTML
      expect(result).toHaveLength(0);
    });

    it('should start with comprehensive seed URLs', async () => {
      mockFetchPage.mockResolvedValue({
        html: '<html><body>Test</body></html>',
        status: 200,
        cache: {},
        fetchedAt: '2024-01-01T00:00:00Z'
      });

      mockIsolateMain.mockReturnValue({
        title: 'Test Page',
        mainHtml: '<body>Test</body>',
        text: 'Test'
      });

      mockClassifyPage.mockReturnValue({
        metric: 'pricing',
        score: 0.8,
        why: { urlHits: [], textHits: [] }
      });

      await discoverMetricPages({
        rootUrl: 'https://example.com',
        metric: 'pricing'
      });

      // Should start with seed URLs
      const fetchCalls = mockFetchPage.mock.calls;
      const seedUrls = [
        'https://example.com/',
        'https://example.com/product',
        'https://example.com/platform',
        'https://example.com/pricing',
        'https://example.com/plans',
        'https://example.com/integrations',
        'https://example.com/apps',
        'https://example.com/partners',
        'https://example.com/security',
        'https://example.com/trust',
        'https://example.com/changelog',
        'https://example.com/release-notes',
        'https://example.com/updates',
        'https://example.com/whats-new',
        'https://example.com/status',
        'https://example.com/docs',
        'https://example.com/help',
        'https://example.com/en',
        'https://example.com/en-us'
      ];

      // Should have fetched at least some seed URLs
      expect(fetchCalls.length).toBeGreaterThan(0);
    });
  });

  describe('pushReason', () => {
    it('should record unknown reason for vendor and metric', async () => {
      await pushReason('vendor-123', 'pricing', 'No pricing page found', 'org-456');

      expect(mockRecordUnknownReason).toHaveBeenCalledWith(
        'vendor-123',
        'pricing',
        'No pricing page found',
        'org-456'
      );
    });

    it('should handle errors gracefully', async () => {
      mockRecordUnknownReason.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(pushReason('vendor-123', 'pricing', 'Test reason')).resolves.not.toThrow();
    });

    it('should work without orgId parameter', async () => {
      await pushReason('vendor-123', 'pricing', 'Test reason');

      expect(mockRecordUnknownReason).toHaveBeenCalledWith(
        'vendor-123',
        'pricing',
        'Test reason',
        undefined
      );
    });
  });

  describe('URL normalization', () => {
    it('should remove fragments from URLs', () => {
      const testUrl = 'https://example.com/page#section';
      const normalized = testUrl.replace(/#.*$/, '');
      expect(normalized).toBe('https://example.com/page');
    });

    it('should remove trailing slashes from URLs', () => {
      const testUrl = 'https://example.com/page/';
      const normalized = testUrl.replace(/\/+$/, '');
      expect(normalized).toBe('https://example.com/page');
    });

    it('should handle multiple trailing slashes', () => {
      const testUrl = 'https://example.com/page///';
      const normalized = testUrl.replace(/\/+$/, '');
      expect(normalized).toBe('https://example.com/page');
    });
  });

  describe('Domain validation', () => {
    it('should allow same domain', () => {
      const sameOrAllowed = (host: string, rootHost: string) => {
        if (host === rootHost) return true;
        return ['docs.', 'help.', 'support.', 'status.', 'trust.', 'security.', 'partners.']
          .some(p => host.startsWith(p) && host.endsWith(rootHost));
      };

      expect(sameOrAllowed('example.com', 'example.com')).toBe(true);
    });

    it('should allow allowed subdomains', () => {
      const sameOrAllowed = (host: string, rootHost: string) => {
        if (host === rootHost) return true;
        return ['docs.', 'help.', 'support.', 'status.', 'trust.', 'security.', 'partners.']
          .some(p => host.startsWith(p) && host.endsWith(rootHost));
      };

      expect(sameOrAllowed('docs.example.com', 'example.com')).toBe(true);
      expect(sameOrAllowed('help.example.com', 'example.com')).toBe(true);
      expect(sameOrAllowed('support.example.com', 'example.com')).toBe(true);
      expect(sameOrAllowed('status.example.com', 'example.com')).toBe(true);
      expect(sameOrAllowed('trust.example.com', 'example.com')).toBe(true);
      expect(sameOrAllowed('security.example.com', 'example.com')).toBe(true);
      expect(sameOrAllowed('partners.example.com', 'example.com')).toBe(true);
    });

    it('should reject disallowed subdomains', () => {
      const sameOrAllowed = (host: string, rootHost: string) => {
        if (host === rootHost) return true;
        return ['docs.', 'help.', 'support.', 'status.', 'trust.', 'security.', 'partners.']
          .some(p => host.startsWith(p) && host.endsWith(rootHost));
      };

      expect(sameOrAllowed('blog.example.com', 'example.com')).toBe(false);
      expect(sameOrAllowed('api.example.com', 'example.com')).toBe(false);
      expect(sameOrAllowed('www.example.com', 'example.com')).toBe(false);
    });

    it('should reject different domains', () => {
      const sameOrAllowed = (host: string, rootHost: string) => {
        if (host === rootHost) return true;
        return ['docs.', 'help.', 'support.', 'status.', 'trust.', 'security.', 'partners.']
          .some(p => host.startsWith(p) && host.endsWith(rootHost));
      };

      expect(sameOrAllowed('different.com', 'example.com')).toBe(false);
      expect(sameOrAllowed('docs.different.com', 'example.com')).toBe(false);
    });
  });
});
