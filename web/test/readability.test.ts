import { describe, it, expect } from 'vitest';
import { 
  isolateMain, 
  isMainContent, 
  getContentStats 
} from '../src/lib/facts/readability';

describe('Readability Module', () => {
  describe('isolateMain', () => {
    it('should extract title from HTML', () => {
      const html = `
        <html>
          <head><title>Test Page Title</title></head>
          <body>
            <nav>Navigation</nav>
            <main>Main content here</main>
            <footer>Footer</footer>
          </body>
        </html>
      `;
      
      const result = isolateMain(html);
      expect(result.title).toBe('Test Page Title');
    });

    it('should fallback to h1 if no title tag', () => {
      const html = `
        <html>
          <body>
            <h1>Page Heading</h1>
            <main>Main content here</main>
          </body>
        </html>
      `;
      
      const result = isolateMain(html);
      expect(result.title).toBe('Page Heading');
    });

    it('should extract main content from <main> tag', () => {
      const html = `
        <html>
          <body>
            <nav>Navigation menu</nav>
            <main>
              <h2>Main Article</h2>
              <p>This is the main content of the page.</p>
              <p>It should be preserved.</p>
            </main>
            <footer>Footer content</footer>
          </body>
        </html>
      `;
      
      const result = isolateMain(html);
      expect(result.mainHtml).toContain('Main Article');
      expect(result.mainHtml).toContain('This is the main content');
      expect(result.mainHtml).not.toContain('Navigation menu');
      expect(result.mainHtml).not.toContain('Footer content');
    });

    it('should extract content from content ID', () => {
      const html = `
        <html>
          <body>
            <nav>Navigation</nav>
            <div id="content">
              <h2>Article Title</h2>
              <p>Article content here.</p>
            </div>
            <footer>Footer</footer>
          </body>
        </html>
      `;
      
      const result = isolateMain(html);
      expect(result.mainHtml).toContain('Article Title');
      expect(result.text).toContain('Article content here');
      expect(result.mainHtml).not.toContain('Navigation');
      expect(result.mainHtml).not.toContain('Footer');
    });

    it('should extract content from content class', () => {
      const html = `
        <html>
          <body>
            <nav>Navigation</nav>
            <div class="main-content">
              <h2>Article Title</h2>
              <p>Article content here.</p>
            </div>
            <footer>Footer</footer>
          </body>
        </html>
      `;
      
      const result = isolateMain(html);
      expect(result.mainHtml).toContain('Article Title');
      expect(result.text).toContain('Article content here');
    });

    it('should remove noise elements', () => {
      const html = `
        <html>
          <body>
            <nav>Navigation</nav>
            <header>Header</header>
            <aside>Sidebar</aside>
            <main>
              <h2>Article Title</h2>
              <p>Main content here.</p>
            </main>
            <footer>Footer</footer>
            <script>console.log('script');</script>
            <style>body { color: red; }</style>
          </body>
        </html>
      `;
      
      const result = isolateMain(html);
      expect(result.mainHtml).toContain('Article Title');
      expect(result.mainHtml).toContain('Main content here');
      expect(result.mainHtml).not.toContain('Navigation');
      expect(result.mainHtml).not.toContain('Header');
      expect(result.mainHtml).not.toContain('Sidebar');
      expect(result.mainHtml).not.toContain('Footer');
      expect(result.mainHtml).not.toContain('script');
      expect(result.mainHtml).not.toContain('style');
    });

    it('should extract clean text content', () => {
      const html = `
        <html>
          <body>
            <main>
              <h2>Article Title</h2>
              <p>This is the main content.</p>
              <p>Multiple paragraphs here.</p>
            </main>
          </body>
        </html>
      `;
      
      const result = isolateMain(html);
      expect(result.text).toContain('Article Title');
      expect(result.text).toContain('This is the main content');
      expect(result.text).toContain('Multiple paragraphs here');
      expect(result.text).not.toContain('<h2>');
      expect(result.text).not.toContain('<p>');
    });

    it('should collapse whitespace in text', () => {
      const html = `
        <html>
          <body>
            <main>
              <h2>   Article   Title   </h2>
              <p>This    is    the    main    content.</p>
            </main>
          </body>
        </html>
      `;
      
      const result = isolateMain(html);
      expect(result.text).toBe('Article Title This is the main content.');
    });

    it('should handle HTML entities', () => {
      const html = `
        <html>
          <body>
            <main>
              <h2>Article &amp; Title</h2>
              <p>Content with &quot;quotes&quot; and &lt;tags&gt;.</p>
            </main>
          </body>
        </html>
      `;
      
      const result = isolateMain(html);
      expect(result.text).toContain('Article & Title');
      expect(result.text).toContain('Content with "quotes" and <tags>.');
    });

    it('should handle malformed HTML gracefully', () => {
      const html = `
        <html>
          <body>
            <main>
              <h2>Article Title</h2>
              <p>Content with <unclosed tag
              <p>Another paragraph</p>
            </main>
          </body>
        </html>
      `;
      
      const result = isolateMain(html);
      expect(result.title).toBe('Untitled');
      expect(result.text).toContain('Article Title');
      expect(result.text).toContain('Content with');
      expect(result.text).toContain('Another paragraph');
    });
  });

  describe('isMainContent', () => {
    it('should identify main content correctly', () => {
      const html = `
        <html>
          <body>
            <main>
              <h1>Article Title</h1>
              <p>This is substantial content that should be recognized as main content.</p>
              <p>Multiple paragraphs with meaningful information.</p>
            </main>
          </body>
        </html>
      `;
      
      expect(isMainContent(html)).toBe(true);
    });

    it('should reject content that is too short', () => {
      const html = `
        <html>
          <body>
            <main>
              <p>Short</p>
            </main>
          </body>
        </html>
      `;
      
      expect(isMainContent(html)).toBe(false);
    });

    it('should reject content without proper structure', () => {
      const html = `
        <html>
          <body>
            <div>Just some text without proper structure</div>
          </body>
        </html>
      `;
      
      expect(isMainContent(html)).toBe(false);
    });
  });

  describe('getContentStats', () => {
    it('should calculate content statistics', () => {
      const html = `
        <html>
          <head><title>Test</title></head>
          <body>
            <nav>Navigation</nav>
            <header>Header</header>
            <main>
              <h1>Article Title</h1>
              <p>This is the main content of the article.</p>
              <p>Multiple paragraphs with substantial text content.</p>
            </main>
            <footer>Footer</footer>
            <script>console.log('script');</script>
            <style>body { color: red; }</style>
          </body>
        </html>
      `;
      
      const stats = getContentStats(html);
      
      expect(stats.originalLength).toBeGreaterThan(0);
      expect(stats.mainLength).toBeGreaterThan(0);
      expect(stats.textLength).toBeGreaterThan(0);
      expect(stats.compressionRatio).toBeGreaterThan(0);
      expect(stats.compressionRatio).toBeLessThan(1);
      expect(stats.textLength).toBeLessThan(stats.mainLength);
      expect(stats.mainLength).toBeLessThan(stats.originalLength);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty HTML', () => {
      const result = isolateMain('');
      expect(result.title).toBe('Untitled');
      expect(result.mainHtml).toBe('');
      expect(result.text).toBe('');
    });

    it('should handle HTML with no body', () => {
      const html = '<html><head><title>Test</title></head></html>';
      const result = isolateMain(html);
      expect(result.title).toBe('Test');
      expect(result.mainHtml).toBe('');
      expect(result.text).toBe('');
    });

    it('should handle HTML with only scripts and styles', () => {
      const html = `
        <html>
          <head>
            <title>Test</title>
            <script>console.log('test');</script>
            <style>body { color: red; }</style>
          </head>
          <body>
            <script>console.log('body script');</script>
            <style>p { margin: 0; }</style>
          </body>
        </html>
      `;
      
      const result = isolateMain(html);
      expect(result.title).toBe('Test');
      expect(result.mainHtml).toBe('');
      expect(result.text).toBe('');
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(10000);
      const html = `
        <html>
          <body>
            <main>
              <h1>Long Article</h1>
              <p>${longContent}</p>
            </main>
          </body>
        </html>
      `;
      
      const result = isolateMain(html);
      expect(result.title).toBe('Long Article');
      expect(result.text.length).toBeGreaterThan(10000);
      expect(result.text).toContain(longContent);
    });
  });
});
