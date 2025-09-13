// Coursera Extractor for Transcript Extractor Extension
// Handles transcript extraction from Coursera course videos

export interface CourseraVideo {
  title: string;
  videoId: string;
  url: string;
  hasTranscript: boolean;
}

export interface CourseraTranscriptEntry {
  timestamp: string;
  text: string;
}

export class CourseraExtractor {
  /**
   * Check if current page is a Coursera course page
   */
  static isCourseraCoursePage(): boolean {
    try {
      const url = window.location.href;
      const hostname = window.location.hostname;
      const pathname = window.location.pathname;
      
      const isCoursera = hostname.includes('coursera.org');
      const isLearn = pathname.includes('/learn/');
      const isLecture = pathname.includes('/lecture/');
      const isReading = pathname.includes('/reading/');
      
      return isCoursera && (isLearn || isLecture || isReading);
    } catch (error) {
      console.error('Error checking Coursera page:', error);
      return false;
    }
  }

  /**
   * Check if transcript or reading content is available on current page
   */
  static isTranscriptAvailable(): boolean {
    try {
      // Check for video transcript
      const transcriptPanel = document.querySelector('[role="tabpanel"]');
      if (transcriptPanel) {
        const transcriptContent = document.querySelector('.rc-Transcript');
        if (transcriptContent) {
          const phrases = document.querySelectorAll('.rc-Phrase');
          if (phrases.length > 0) return true;
        }
      }

      // Check for reading content
      const readingContent = document.querySelector('.rc-CML, .rc-ReadingItem');
      if (readingContent) {
        const textContent = readingContent.textContent?.trim();
        return textContent && textContent.length > 100; // Ensure substantial content
      }

      return false;
    } catch (error) {
      console.error('Error checking transcript availability:', error);
      return false;
    }
  }

  /**
   * Get current video/reading information
   */
  static getCurrentVideoInfo(): CourseraVideo | null {
    try {
      if (!this.isCourseraCoursePage()) {
        return null;
      }

      // Extract title from page
      const titleElement = document.querySelector('h1, [data-testid="video-title"], .video-title, .reading-title h1');
      const title = titleElement?.textContent?.trim() || 'Coursera Content';

      // Extract content ID from URL
      const url = window.location.href;
      let contentId = 'unknown';
      
      const lectureMatch = url.match(/\/lecture\/([^\/]+)/);
      const readingMatch = url.match(/\/reading\/([^\/]+)/);
      
      if (lectureMatch) {
        contentId = lectureMatch[1];
      } else if (readingMatch) {
        contentId = readingMatch[1];
      }

      return {
        title,
        videoId: contentId,
        url,
        hasTranscript: this.isTranscriptAvailable()
      };
    } catch (error) {
      console.error('Error getting Coursera content info:', error);
      return null;
    }
  }

  /**
   * Extract transcript from Coursera video or reading content
   */
  static async extractTranscript(): Promise<string> {
    try {
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to extract video transcript first
      const transcriptEntries = this.extractTranscriptEntries();
      if (transcriptEntries.length > 0) {
        return this.formatTranscript(transcriptEntries);
      }

      // If no video transcript, try to extract reading content
      const readingContent = this.extractReadingContent();
      if (readingContent) {
        return readingContent;
      }

      throw new Error('No transcript or reading content found. The content may not be available.');

    } catch (error) {
      console.error('Error extracting Coursera content:', error);
      throw new Error(`Failed to extract Coursera content: ${error.message}`);
    }
  }

  /**
   * Extract transcript entries from the page
   */
  private static extractTranscriptEntries(): CourseraTranscriptEntry[] {
    const entries: CourseraTranscriptEntry[] = [];

    try {
      // Look for transcript phrases
      const phrases = document.querySelectorAll('.rc-Phrase');
      
      phrases.forEach((phrase, index) => {
        const text = phrase.textContent?.trim();
        if (text) {
          // Try to find associated timestamp
          const paragraph = phrase.closest('.rc-Paragraph');
          const timestampElement = paragraph?.querySelector('.timestamp');
          const timestamp = timestampElement?.textContent?.trim() || `${index * 5}:00`;

          entries.push({
            timestamp,
            text
          });
        }
      });

      // If no phrases found, try alternative selectors
      if (entries.length === 0) {
        const alternativePhrases = document.querySelectorAll('[data-cue]');
        alternativePhrases.forEach((phrase, index) => {
          const text = phrase.textContent?.trim();
          if (text) {
            entries.push({
              timestamp: `${index * 5}:00`,
              text
            });
          }
        });
      }

    } catch (error) {
      console.error('Error extracting transcript entries:', error);
    }

    return entries;
  }

  /**
   * Extract reading content from Coursera reading sections
   */
  private static extractReadingContent(): string | null {
    try {
      // Look for reading content container
      const readingContainer = document.querySelector('.rc-CML, .rc-ReadingItem');
      if (!readingContainer) {
        return null;
      }

      // Get content info
      const contentInfo = this.getCurrentVideoInfo();
      const title = contentInfo?.title || 'Coursera Reading';

      // Format reading content
      let formattedContent = `# ${title}\n\n`;
      formattedContent += `**Source:** Coursera Reading\n`;
      formattedContent += `**URL:** ${window.location.href}\n`;
      formattedContent += `**Extracted:** ${new Date().toLocaleString()}\n\n`;
      formattedContent += `---\n\n`;

      // Extract and format the content
      const content = this.formatReadingContent(readingContainer);
      formattedContent += content;

      return formattedContent;
    } catch (error) {
      console.error('Error extracting reading content:', error);
      return null;
    }
  }

  /**
   * Format reading content with proper structure
   */
  private static formatReadingContent(container: Element): string {
    let formattedContent = '';

    // Process all child elements
    const processElement = (element: Element, depth = 0): void => {
      const tagName = element.tagName.toLowerCase();
      const text = element.textContent?.trim() || '';

      if (!text) return;

      // Handle different element types
      switch (tagName) {
        case 'h1':
          formattedContent += `\n# ${text}\n\n`;
          break;
        case 'h2':
          formattedContent += `\n## ${text}\n\n`;
          break;
        case 'h3':
          formattedContent += `\n### ${text}\n\n`;
          break;
        case 'h4':
          formattedContent += `\n#### ${text}\n\n`;
          break;
        case 'h5':
          formattedContent += `\n##### ${text}\n\n`;
          break;
        case 'h6':
          formattedContent += `\n###### ${text}\n\n`;
          break;
        case 'p':
          // Check if it's inside a list item
          if (element.closest('li')) {
            formattedContent += `${text}\n`;
          } else {
            formattedContent += `${text}\n\n`;
          }
          break;
        case 'li':
          formattedContent += `- ${text}\n`;
          break;
        case 'ul':
        case 'ol':
          // Lists are handled by their li elements
          break;
        case 'strong':
        case 'b':
          formattedContent += `**${text}**`;
          break;
        case 'em':
        case 'i':
          formattedContent += `*${text}*`;
          break;
        case 'code':
          formattedContent += `\`${text}\``;
          break;
        case 'pre':
          formattedContent += `\n\`\`\`\n${text}\n\`\`\`\n\n`;
          break;
        case 'blockquote':
          formattedContent += `> ${text}\n\n`;
          break;
        default:
          // For other elements, just add the text
          if (element.children.length === 0) {
            formattedContent += text;
          }
          break;
      }

      // Process child elements
      Array.from(element.children).forEach(child => {
        processElement(child, depth + 1);
      });
    };

    // Process the container
    processElement(container);

    return formattedContent;
  }

  /**
   * Format transcript entries into readable text
   */
  private static formatTranscript(entries: CourseraTranscriptEntry[]): string {
    if (entries.length === 0) {
      return '';
    }

    // Get video title
    const videoInfo = this.getCurrentVideoInfo();
    const title = videoInfo?.title || 'Coursera Video';

    // Format transcript
    let formattedTranscript = `# ${title}\n\n`;
    formattedTranscript += `**Source:** Coursera Video\n`;
    formattedTranscript += `**URL:** ${window.location.href}\n`;
    formattedTranscript += `**Extracted:** ${new Date().toLocaleString()}\n\n`;
    formattedTranscript += `---\n\n`;

    // Add transcript content
    entries.forEach(entry => {
      formattedTranscript += `**[${entry.timestamp}]** ${entry.text}\n\n`;
    });

    return formattedTranscript;
  }

  /**
   * Extract course structure (for Coursera, this would be the course modules)
   */
  static extractCourseStructure(): any {
    try {
      if (!this.isCourseraCoursePage()) {
        return null;
      }

      const videoInfo = this.getCurrentVideoInfo();
      if (!videoInfo) {
        return null;
      }

      // For Coursera, return a simple structure with just the current video
      // In a full implementation, you might want to extract the course modules
      return {
        title: videoInfo.title,
        instructor: 'Coursera Instructor',
        sections: [{
          title: 'Current Video',
          lectures: [{
            id: videoInfo.videoId,
            title: videoInfo.title,
            url: videoInfo.url,
            isCompleted: false,
            duration: 'Unknown'
          }]
        }],
        currentLecture: {
          id: videoInfo.videoId,
          title: videoInfo.title,
          url: videoInfo.url,
          isCompleted: false,
          duration: 'Unknown'
        }
      };
    } catch (error) {
      console.error('Error extracting Coursera course structure:', error);
      return null;
    }
  }

  /**
   * Test all selectors for debugging
   */
  static testAllSelectors(): void {
    console.log('🎯 Testing Coursera selectors...');
    
    const selectors = [
      // Video transcript selectors
      '[role="tabpanel"]',
      '.rc-Transcript',
      '.rc-Phrase',
      '[data-cue]',
      '.timestamp',
      '.rc-Paragraph',
      // Reading content selectors
      '.rc-CML',
      '.rc-ReadingItem',
      '.reading-title',
      '[data-testid="cml-viewer"]',
      '.css-g2bbpm',
      'h1, h2, h3, h4, h5, h6',
      'p[data-text-variant="body1"]',
      '.rc-CodeBlock',
      '.monaco-editor'
    ];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`🎯 Selector "${selector}": ${elements.length} elements found`);
      if (elements.length > 0) {
        elements.forEach((el, i) => {
          const text = el.textContent?.substring(0, 50) || '';
          console.log(`  Element ${i + 1}: "${text}..."`);
        });
      }
    });
  }
}
