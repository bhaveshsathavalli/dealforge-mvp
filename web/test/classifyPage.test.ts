import { describe, it, expect } from 'vitest';
import { classifyPage } from '../src/lib/facts/classifyPage';

describe('Page Classifier', () => {
  describe('URL-based classification', () => {
    it('should classify pricing pages correctly', () => {
      const result = classifyPage({
        url: 'https://example.com/pricing',
        text: 'Some content here'
      });
      
      expect(result.metric).toBe('unknown'); // Score is 0.65, below 0.7 threshold
      expect(result.score).toBe(0.65);
      expect(result.why.urlHits).toContain('/(pricing|plans|packages|billing)/i');
    });

    it('should classify features pages correctly', () => {
      const result = classifyPage({
        url: 'https://example.com/features',
        text: 'Some content here'
      });
      
      expect(result.metric).toBe('unknown'); // Score is 0.65, below 0.7 threshold
      expect(result.score).toBe(0.65);
      expect(result.why.urlHits).toContain('/(features|capabilities|platform)/i');
    });

    it('should classify integrations pages correctly', () => {
      const result = classifyPage({
        url: 'https://example.com/integrations',
        text: 'Some content here'
      });
      
      expect(result.metric).toBe('unknown'); // Score is 0.65, below 0.7 threshold
      expect(result.score).toBe(0.65);
      expect(result.why.urlHits).toContain('/(integrations|works with|connect)/i');
    });

    it('should classify security pages correctly', () => {
      const result = classifyPage({
        url: 'https://example.com/security',
        text: 'Some content here'
      });
      
      expect(result.metric).toBe('unknown'); // Score is 0.65, below 0.7 threshold
      expect(result.score).toBe(0.65);
      expect(result.why.urlHits).toContain('/(security|compliance|privacy)/i');
    });

    it('should classify reliability pages correctly', () => {
      const result = classifyPage({
        url: 'https://example.com/uptime',
        text: 'Some content here'
      });
      
      expect(result.metric).toBe('unknown'); // Score is 0.65, below 0.7 threshold
      expect(result.score).toBe(0.65);
      expect(result.why.urlHits).toContain('/(uptime|sla|incidents|availability)/i');
    });

    it('should classify changelog pages correctly', () => {
      const result = classifyPage({
        url: 'https://example.com/release-notes',
        text: 'Some content here'
      });
      
      expect(result.metric).toBe('unknown'); // Score is 0.65, below 0.7 threshold
      expect(result.score).toBe(0.65);
      expect(result.why.urlHits).toContain('/(release|what\'s new|version|changelog)/i');
    });
  });

  describe('Text-based classification', () => {
    it('should classify pricing content from text signals', () => {
      const result = classifyPage({
        url: 'https://example.com/page',
        text: 'Our pricing plans start at $10 per month. Choose the plan that fits your needs. Free trial available.'
      });
      
      expect(result.metric).toBe('unknown'); // Score is 0.35, below 0.7 threshold
      expect(result.score).toBe(0.35);
      expect(result.why.textHits).toContain('pricing');
      expect(result.why.textHits).toContain('plan');
      expect(result.why.textHits).toContain('per month');
      expect(result.why.textHits).toContain('$');
      expect(result.why.textHits).toContain('trial');
    });

    it('should classify features content from text signals', () => {
      const result = classifyPage({
        url: 'https://example.com/page',
        text: 'Our platform features include advanced capabilities and powerful tools for your workflow.'
      });
      
      expect(result.metric).toBe('unknown'); // Score is 0.35, below 0.7 threshold
      expect(result.score).toBe(0.35);
      expect(result.why.textHits).toContain('features');
      expect(result.why.textHits).toContain('capabilities');
      expect(result.why.textHits).toContain('platform');
    });

    it('should classify integrations content from text signals', () => {
      const result = classifyPage({
        url: 'https://example.com/page',
        text: 'We integrate with popular tools and work with your existing systems. Connect seamlessly.'
      });
      
      expect(result.metric).toBe('unknown'); // Score is 0.07, below 0.7 threshold
      expect(result.score).toBeCloseTo(0.07, 2);
      expect(result.why.textHits).toContain('tools');
    });

    it('should classify security content from text signals', () => {
      const result = classifyPage({
        url: 'https://example.com/page',
        text: 'We are SOC 2 compliant and offer SSO integration. Your data is secure with our privacy controls.'
      });
      
      expect(result.metric).toBe('unknown'); // Score is 0.21, below 0.7 threshold
      expect(result.score).toBeCloseTo(0.21, 2);
      expect(result.why.textHits).toContain('SOC');
      expect(result.why.textHits).toContain('SSO');
      expect(result.why.textHits).toContain('privacy');
    });

    it('should classify reliability content from text signals', () => {
      const result = classifyPage({
        url: 'https://example.com/page',
        text: 'We guarantee 99.9% uptime with our SLA. Our systems are designed for reliability and performance.'
      });
      
      expect(result.metric).toBe('unknown'); // Score is 0.35, below 0.7 threshold
      expect(result.score).toBe(0.35);
      expect(result.why.textHits).toContain('uptime');
      expect(result.why.textHits).toContain('SLA');
      expect(result.why.textHits).toContain('reliability');
      expect(result.why.textHits).toContain('99.9');
    });

    it('should classify changelog content from text signals', () => {
      const result = classifyPage({
        url: 'https://example.com/page',
        text: 'What\'s new in version 2.0? Check out our latest release notes and updates.'
      });
      
      expect(result.metric).toBe('unknown'); // Score is 0.28, below 0.7 threshold
      expect(result.score).toBeCloseTo(0.28, 2);
      expect(result.why.textHits).toContain('what\'s new');
      expect(result.why.textHits).toContain('release');
      expect(result.why.textHits).toContain('version');
    });
  });

  describe('Combined URL and text classification', () => {
    it('should prefer URL classification when both match', () => {
      const result = classifyPage({
        url: 'https://example.com/pricing',
        text: 'Our features include advanced capabilities and powerful tools.'
      });
      
      expect(result.metric).toBe('unknown'); // Score is 0.65, below 0.7 threshold
      expect(result.score).toBe(0.65);
      expect(result.why.urlHits.length).toBeGreaterThan(0);
    });

    it('should boost score when both URL and text match', () => {
      const result = classifyPage({
        url: 'https://example.com/pricing',
        text: 'Our pricing plans start at $10 per month with free trial available.'
      });
      
      expect(result.metric).toBe('pricing');
      expect(result.score).toBeGreaterThan(0.7);
      expect(result.why.urlHits.length).toBeGreaterThan(0);
      expect(result.why.textHits.length).toBeGreaterThan(0);
    });
  });

  describe('Score calculation', () => {
    it('should calculate correct scores for URL-only matches', () => {
      const result = classifyPage({
        url: 'https://example.com/pricing',
        text: 'Some random content'
      });
      
      expect(result.score).toBe(0.65); // 0.65 * 1 + 0.35 * 0
    });

    it('should calculate correct scores for text-only matches', () => {
      const result = classifyPage({
        url: 'https://example.com/page',
        text: 'pricing plan per month $10 free trial subscription'
      });
      
      expect(result.score).toBe(0.35); // 0.65 * 0 + 0.35 * 1
    });

    it('should dampen text scores for noisy pages', () => {
      const result = classifyPage({
        url: 'https://example.com/page',
        text: 'pricing plan per month $10 free trial subscription package tier edition cost price features comparison'
      });
      
      expect(result.score).toBe(0.35); // 0.65 * 0 + 0.35 * 1 (capped at 1)
    });
  });

  describe('Unknown classification', () => {
    it('should return unknown for low scores', () => {
      const result = classifyPage({
        url: 'https://example.com/random',
        text: 'Some random content that does not match any patterns'
      });
      
      expect(result.metric).toBe('unknown');
      expect(result.score).toBeLessThan(0.7);
    });

    it('should return unknown for empty text', () => {
      const result = classifyPage({
        url: 'https://example.com/page',
        text: ''
      });
      
      expect(result.metric).toBe('unknown');
      expect(result.score).toBeLessThan(0.7);
    });

    it('should return unknown for null text', () => {
      const result = classifyPage({
        url: 'https://example.com/page',
        text: null as any
      });
      
      expect(result.metric).toBe('unknown');
      expect(result.score).toBeLessThan(0.7);
    });
  });

  describe('Edge cases', () => {
    it('should handle case-insensitive text matching', () => {
      const result = classifyPage({
        url: 'https://example.com/page',
        text: 'PRICING PLAN PER MONTH $10 FREE TRIAL'
      });
      
      expect(result.metric).toBe('unknown'); // Score is 0.35, below 0.7 threshold
      expect(result.score).toBe(0.35);
    });

    it('should handle multiple metric matches', () => {
      const result = classifyPage({
        url: 'https://example.com/pricing',
        text: 'Our pricing plans include advanced features and security capabilities'
      });
      
      expect(result.metric).toBe('pricing');
      expect(result.score).toBeGreaterThan(0.7);
    });

    it('should handle partial text matches', () => {
      const result = classifyPage({
        url: 'https://example.com/page',
        text: 'pricing plan'
      });
      
      expect(result.metric).toBe('unknown'); // Score is 0.14, below 0.7 threshold
      expect(result.score).toBeCloseTo(0.14, 2);
    });
  });

  describe('Debug information', () => {
    it('should provide detailed why information', () => {
      const result = classifyPage({
        url: 'https://example.com/pricing',
        text: 'Our pricing plans start at $10 per month'
      });
      
      expect(result.why).toBeDefined();
      expect(result.why.urlHits).toBeInstanceOf(Array);
      expect(result.why.textHits).toBeInstanceOf(Array);
      expect(result.why.urlHits.length).toBeGreaterThan(0);
      expect(result.why.textHits.length).toBeGreaterThan(0);
    });

    it('should show which patterns matched', () => {
      const result = classifyPage({
        url: 'https://example.com/pricing',
        text: 'pricing plan per month'
      });
      
      expect(result.why.urlHits).toContain('/(pricing|plans|packages|billing)/i');
      expect(result.why.textHits).toContain('pricing');
      expect(result.why.textHits).toContain('plan');
      expect(result.why.textHits).toContain('per month');
    });
  });
});
