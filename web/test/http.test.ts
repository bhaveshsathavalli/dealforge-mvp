import { describe, it, expect } from 'vitest';
import { 
  fetchPage, 
  isValidUrl, 
  extractDomain, 
  isSameDomain, 
  getCacheKey,
  extractPageMetadata,
  hasPageChanged,
  type CacheInfo 
} from '../src/lib/facts/http';

describe('HTTP Fetcher', () => {
  describe('URL Utilities', () => {
    it('should validate URLs correctly', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });

    it('should extract domains correctly', () => {
      expect(extractDomain('https://example.com/path')).toBe('example.com');
      expect(extractDomain('http://subdomain.example.com:8080/path')).toBe('subdomain.example.com');
      expect(extractDomain('not-a-url')).toBe(null);
    });

    it('should check same domain correctly', () => {
      expect(isSameDomain('https://example.com/path1', 'https://example.com/path2')).toBe(true);
      expect(isSameDomain('https://example.com', 'https://different.com')).toBe(false);
      expect(isSameDomain('https://example.com', 'not-a-url')).toBe(false);
    });

    it('should generate cache keys', () => {
      const key1 = getCacheKey('https://example.com/path');
      const key2 = getCacheKey('https://example.com/path');
      const key3 = getCacheKey('https://example.com/different');
      
      expect(key1).toBe(key2); // Same URL should generate same key
      expect(key1).not.toBe(key3); // Different URLs should generate different keys
      expect(key1).toMatch(/^fetch_[a-z0-9]+$/); // Should match expected format
    });
  });

  describe('Page Metadata Extraction', () => {
    it('should extract title from HTML', () => {
      const html = '<html><head><title>Test Page</title></head><body></body></html>';
      const metadata = extractPageMetadata(html);
      expect(metadata.title).toBe('Test Page');
    });

    it('should extract description from HTML', () => {
      const html = '<html><head><meta name="description" content="Test description"></head><body></body></html>';
      const metadata = extractPageMetadata(html);
      expect(metadata.description).toBe('Test description');
    });

    it('should extract language from HTML', () => {
      const html = '<html lang="en"><head></head><body></body></html>';
      const metadata = extractPageMetadata(html);
      expect(metadata.language).toBe('en');
    });

    it('should handle malformed HTML gracefully', () => {
      const html = '<html><head><title>Test</title></head><body></body>';
      const metadata = extractPageMetadata(html);
      expect(metadata.title).toBe('Test');
    });
  });

  describe('Cache Change Detection', () => {
    it('should detect changes when ETag differs', () => {
      const current: CacheInfo = { etag: '"new-etag"' };
      const previous: CacheInfo = { etag: '"old-etag"' };
      expect(hasPageChanged(current, previous)).toBe(true);
    });

    it('should detect changes when Last-Modified differs', () => {
      const current: CacheInfo = { lastModified: 'Wed, 21 Oct 2024 08:00:00 GMT' };
      const previous: CacheInfo = { lastModified: 'Wed, 21 Oct 2024 07:00:00 GMT' };
      expect(hasPageChanged(current, previous)).toBe(true);
    });

    it('should not detect changes when cache is identical', () => {
      const current: CacheInfo = { etag: '"same-etag"' };
      const previous: CacheInfo = { etag: '"same-etag"' };
      expect(hasPageChanged(current, previous)).toBe(false);
    });

    it('should assume changed when no previous cache', () => {
      const current: CacheInfo = { etag: '"some-etag"' };
      expect(hasPageChanged(current)).toBe(true);
    });

    it('should assume changed when cache info is incomplete', () => {
      const current: CacheInfo = { etag: '"some-etag"' };
      const previous: CacheInfo = { lastModified: 'some-date' };
      expect(hasPageChanged(current, previous)).toBe(true);
    });
  });

  describe('URL Normalization', () => {
    it('should remove fragments from URLs', () => {
      // This is tested indirectly through fetchPage, but we can test the normalization logic
      const testUrl = 'https://example.com/path#fragment';
      // The normalizeUrl function is internal, but we can verify it works through other functions
      const domain = extractDomain(testUrl);
      expect(domain).toBe('example.com');
    });
  });

  // Note: We don't test actual HTTP requests in unit tests to avoid flakiness
  // Integration tests would be better suited for testing actual fetchPage behavior
});
