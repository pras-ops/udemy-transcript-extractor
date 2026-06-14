// Universal Extractor for Captions and Web Documents
// Scrapes visible subtitles from HTML5 video players or main article content from any webpage.

export class UniversalExtractor {
  /**
   * Extract content from any webpage, prioritizing video captions first, then article/document text.
   */
  static async extract(): Promise<string> {
    console.log('🔮 Universal Extractor: Initiating extraction...');

    // 1. Try to find captions or subtitles first
    const captions = this.extractVideoCaptions();
    if (captions && captions.trim().length > 100) {
      console.log('🔮 Universal Extractor: Found video captions track');
      return captions;
    }

    // 2. Try to find structured reading content/document text
    const article = this.extractArticleText();
    if (article && article.trim().length > 100) {
      console.log('🔮 Universal Extractor: Found webpage article text');
      return article;
    }

    // 3. Fallback: extract visible text paragraphs
    const paragraphs = this.extractFallbackParagraphs();
    if (paragraphs && paragraphs.trim().length > 0) {
      console.log('🔮 Universal Extractor: Fallback text extraction');
      return paragraphs;
    }

    throw new Error('Could not find extractable video captions or document text on this page.');
  }

  /**
   * Scrapes captions/subtitles from common video player DOM overlays
   */
  private static extractVideoCaptions(): string {
    const captionSelectors = [
      '.vjs-text-track-display',
      '.mejs-captions-layer',
      '.jw-captions',
      '.plyr__captions',
      '.caption-window',
      '.subtitles-player',
      '[class*="caption-text"]',
      '[class*="subtitle-text"]',
      '[class*="-captions"]',
      '[class*="-subtitles"]',
      '.captions-text',
      '.ytp-caption-segment'
    ];

    const foundElements: string[] = [];

    // Search for visible elements matching standard video player caption cues
    captionSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent?.trim();
          // Filter out hidden or empty elements
          if (text && (el as HTMLElement).offsetParent !== null) {
            foundElements.push(text);
          }
        });
      } catch (e) {
        // Skip invalid selectors
      }
    });

    if (foundElements.length > 0) {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `[${timestamp}] ${Array.from(new Set(foundElements)).join(' ')}`;
    }

    return '';
  }

  /**
   * Extract article structure or readable document content (like reading tasks, code, documentation)
   */
  private static extractArticleText(): string {
    const mainSelectors = [
      'article',
      'main',
      '[role="main"]',
      '#content',
      '.content',
      '#main',
      '.main',
      '#article',
      '.article',
      '.post-content',
      '.entry-content',
      '.docs-content'
    ];

    let mainElement: Element | null = null;

    // Find the first matching main content container
    for (const selector of mainSelectors) {
      try {
        const el = document.querySelector(selector);
        if (el && (el as HTMLElement).offsetParent !== null && el.textContent && el.textContent.trim().length > 200) {
          mainElement = el;
          break;
        }
      } catch (e) {
        // Skip invalid selectors
      }
    }

    // Fall back to body if no structured container found
    const root = mainElement || document.body;
    
    // Extract headers and paragraphs
    const contentNodes = root.querySelectorAll('h1, h2, h3, h4, p, li, pre code');
    const resultLines: string[] = [];
    let currentSection = '';

    contentNodes.forEach(node => {
      const text = node.textContent?.trim();
      if (!text || text.length < 5) return;
      if (!(node as HTMLElement).offsetParent) return; // Ignore invisible elements

      const tagName = node.tagName.toLowerCase();

      // Format markdown structure dynamically
      if (tagName.startsWith('h')) {
        const level = tagName.charAt(1);
        const hashes = '#'.repeat(parseInt(level));
        resultLines.push(`\n${hashes} ${text}\n`);
        currentSection = text;
      } else if (tagName === 'pre' || node.parentElement?.tagName.toLowerCase() === 'pre') {
        resultLines.push(`\n\`\`\`\n${text}\n\`\`\`\n`);
      } else if (tagName === 'li') {
        resultLines.push(`- ${text}`);
      } else {
        // Paragraph text
        resultLines.push(text);
      }
    });

    if (resultLines.length > 0) {
      const title = document.title || 'Untitled Document';
      return `# ${title}\n\nSource: ${window.location.hostname}\n\n${resultLines.join('\n\n')}`;
    }

    return '';
  }

  /**
   * Simple paragraph fallback if main article extraction fails
   */
  private static extractFallbackParagraphs(): string {
    const paragraphs = document.querySelectorAll('p');
    const lines: string[] = [];

    paragraphs.forEach(p => {
      const text = p.textContent?.trim();
      if (text && text.length > 20 && (p as HTMLElement).offsetParent !== null) {
        lines.push(text);
      }
    });

    if (lines.length > 0) {
      return `# ${document.title}\n\n${lines.join('\n\n')}`;
    }

    return '';
  }

  /**
   * Scrapes metadata for general video info mapping
   */
  static getVideoInfo(): { title: string; duration: string } {
    // Attempt to scrape page title, video title, or heading
    const title = document.querySelector('h1')?.textContent?.trim() || document.title || 'Web Document';
    
    // Check if there is an HTML5 video and get its duration
    const video = document.querySelector('video');
    let duration = '0:00';
    if (video && video.duration) {
      const totalSec = Math.floor(video.duration);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      duration = `${min}:${sec < 10 ? '0' : ''}${sec}`;
    } else {
      duration = 'Document Page';
    }

    return { title, duration };
  }
}
