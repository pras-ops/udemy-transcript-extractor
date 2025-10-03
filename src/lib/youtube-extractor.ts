// YouTube Extractor for Transcript Extractor Extension - v3.0.0
// Handles YouTube video transcript extraction

export interface YouTubeVideo {
  title: string;
  videoId: string;
  url: string;
  hasTranscript: boolean;
}

export interface YouTubeTranscriptEntry {
  timestamp: string;
  text: string;
}

export interface YouTubePlaylistVideo {
  title: string;
  videoId: string;
  url: string;
  duration: string;
  index: number;
  isCurrentVideo: boolean;
}

export interface YouTubePlaylist {
  title: string;
  videos: YouTubePlaylistVideo[];
  totalVideos: number;
}

export class YouTubeExtractor {
  /**
   * Check if current page is a YouTube video page
   */
  static isYouTubeVideoPage(): boolean {
    try {
      const url = window.location.href;
      const hostname = window.location.hostname;
      const pathname = window.location.pathname;
      
      const isYouTube = hostname.includes('youtube.com');
      const isWatch = pathname.includes('/watch');
      const isYoutuBe = url.includes('youtu.be/');
      const result = url.includes('youtube.com/watch') || url.includes('youtu.be/');
      
      // Debug logging removed for production
      
      return result;
    } catch (error) {
      console.error('Error checking YouTube page:', error);
      return false;
    }
  }

  /**
   * Get current video information
   */
  static getCurrentVideoInfo(): YouTubeVideo | null {
    try {
      if (!this.isYouTubeVideoPage()) {
        return null;
      }

      const videoId = this.getVideoId();
      if (!videoId) {
        return null;
      }

      const title = this.getVideoTitle();
      const hasTranscript = this.isTranscriptAvailable();

      return {
        title: title || 'Unknown Video',
        videoId,
        url: window.location.href,
        hasTranscript
      };
    } catch (error) {
      console.error('Error getting YouTube video info:', error);
      return null;
    }
  }

  /**
   * Extract video ID from URL
   */
  private static getVideoId(): string | null {
    try {
      const url = window.location.href;
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      return match ? match[1] : null;
    } catch (error) {
      console.error('Error extracting video ID:', error);
      return null;
    }
  }

  /**
   * Get video title from page
   */
  private static getVideoTitle(): string | null {
    try {
      // Try multiple selectors for video title
      const titleSelectors = [
        'h1.ytd-watch-metadata yt-formatted-string',
        'h1.style-scope.ytd-watch-metadata yt-formatted-string',
        'yt-formatted-string[force-default-style].style-scope.ytd-watch-metadata',
        'h1[class*="title"]',
        '.ytd-video-primary-info-renderer h1',
        '#title h1',
        'h1.ytd-video-primary-info-renderer yt-formatted-string',
        '.ytd-video-primary-info-renderer h1 yt-formatted-string',
        'yt-formatted-string[title]',
        'h1 yt-formatted-string[title]'
      ];

      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          // Try to get title attribute first
          const titleAttr = element.getAttribute('title');
          if (titleAttr && titleAttr.trim()) {
            return titleAttr.trim();
          }
          
          // Fallback to text content
          const textContent = element.textContent?.trim();
          if (textContent) {
            return textContent;
          }
        }
      }

      // Try to find any yt-formatted-string with title attribute
      const titleElements = document.querySelectorAll('yt-formatted-string[title]');
      for (const element of titleElements) {
        const title = element.getAttribute('title');
        if (title && title.trim() && title.length > 5) {
          return title.trim();
        }
      }

      // Fallback: try to get from page title
      const pageTitle = document.title;
      if (pageTitle && pageTitle !== 'YouTube') {
        return pageTitle.replace(' - YouTube', '').trim();
      }

      return null;
    } catch (error) {
      console.error('Error getting video title:', error);
      return null;
    }
  }

  /**
   * Test and verify all selectors work correctly
   */
  static testSelectors(): void {
    console.log('🎯 ===== SELECTOR VERIFICATION TEST =====');
    console.log('🎯 Current URL:', window.location.href);
    
    // Test Show Transcript Button
    console.log('🎯 Testing Show Transcript Button selectors...');
    const showButtonSelectors = [
      'button[aria-label="Show transcript"]',
      'ytd-video-description-transcript-section-renderer button[aria-label="Show transcript"]',
      'ytd-button-renderer button[aria-label="Show transcript"]'
    ];
    
    for (const selector of showButtonSelectors) {
      const element = document.querySelector(selector);
      console.log(`🎯 "${selector}":`, element ? '✅ FOUND' : '❌ NOT FOUND');
      if (element) {
        console.log('🎯 Element details:', {
          visible: (element as HTMLElement).offsetParent !== null,
          disabled: (element as HTMLElement).disabled,
          text: element.textContent?.trim(),
          ariaLabel: element.getAttribute('aria-label')
        });
      }
    }
    
    // Test Transcript Panel
    console.log('🎯 Testing Transcript Panel selectors...');
    const panelSelectors = [
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]',
      '#segments-container',
      'ytd-transcript-segment-list-renderer',
      'ytd-transcript-renderer'
    ];
    
    for (const selector of panelSelectors) {
      const element = document.querySelector(selector);
      console.log(`🎯 "${selector}":`, element ? '✅ FOUND' : '❌ NOT FOUND');
      if (element) {
        console.log('🎯 Panel details:', {
          height: element.offsetHeight,
          visible: (element as HTMLElement).offsetParent !== null,
          hasContent: element.textContent?.trim().length > 0
        });
      }
    }
    
    // Test Transcript Segments
    console.log('🎯 Testing Transcript Segment selectors...');
    const segmentSelectors = [
      'ytd-transcript-segment-renderer',
      '#segments-container ytd-transcript-segment-renderer',
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"] ytd-transcript-segment-renderer'
    ];
    
    for (const selector of segmentSelectors) {
      const elements = document.querySelectorAll(selector);
      console.log(`🎯 "${selector}":`, elements.length > 0 ? `✅ FOUND ${elements.length} segments` : '❌ NOT FOUND');
      if (elements.length > 0) {
        console.log('🎯 First segment details:', {
          html: elements[0].outerHTML.substring(0, 200),
          text: elements[0].textContent?.trim().substring(0, 100),
          ariaLabel: elements[0].getAttribute('aria-label')
        });
      }
    }
    
    console.log('🎯 ===== END SELECTOR VERIFICATION =====');
  }

  /**
   * Check if transcript is available for current video
   */
  static isTranscriptAvailable(): boolean {
    try {
      console.log('🎯 YouTubeExtractor.isTranscriptAvailable: Starting check...');
      
      // Check if transcript panel is already open with actual content
      const transcriptPanel = document.querySelector('#segments-container, ytd-transcript-segment-list-renderer, ytd-transcript-renderer');
      console.log('🎯 Transcript panel found:', !!transcriptPanel);
      if (transcriptPanel) {
        // Check if there are actual transcript segments
        const segments = transcriptPanel.querySelectorAll('ytd-transcript-segment-renderer');
        console.log('🎯 Transcript segments found:', segments.length);
        if (segments.length > 0) {
          console.log('🎯 Transcript available: YES (panel with segments)');
          return true;
        }
      }

      // Check if transcript button exists
      const transcriptButton = document.querySelector('[aria-label*="transcript"], [aria-label*="Transcript"], [title*="transcript"], [title*="Transcript"]');
      console.log('🎯 Transcript button found:', !!transcriptButton);
      if (transcriptButton) {
        console.log('🎯 Transcript available: YES (transcript button)');
        return true;
      }

      // Check for closed captions button
      const ccButton = document.querySelector('.ytp-subtitles-button, [aria-label*="captions"], [aria-label*="Captions"]');
      console.log('🎯 CC button found:', !!ccButton);
      if (ccButton) {
        console.log('🎯 Transcript available: YES (CC button)');
        return true;
      }

      // Check for engagement panel with transcript
      const engagementPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[panel-target-id="engagement-panel-searchable-transcript"]');
      console.log('🎯 Engagement panel found:', !!engagementPanel);
      if (engagementPanel) {
        console.log('🎯 Transcript available: YES (engagement panel)');
        return true;
      }

      console.log('🎯 Transcript available: NO');
      return false;
    } catch (error) {
      console.error('Error checking transcript availability:', error);
      return false;
    }
  }

  /**
   * Extract transcript from YouTube video
   */
  static async extractTranscript(): Promise<string> {
    try {
      // Starting YouTube transcript extraction

      // Clear any existing transcript data from storage
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          await chrome.storage.local.remove(['transcript', 'cached_transcript', 'last_transcript']);
          console.log('🎯 Cleared cached transcript data');
        }
      } catch (storageError) {
        console.log('🎯 Could not clear storage (not available):', storageError);
      }

      // Handle any expand buttons that might be hiding the transcript button
      await this.handleExpandButtons();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to open transcript panel if it's not already open
      await this.ensureTranscriptPanelOpen();

      // Wait a moment for the panel to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Handle any expand buttons that might be hiding content
      await this.handleExpandButtons();

      // Wait a bit more for content to expand
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract transcript entries
      const transcriptEntries = this.extractTranscriptEntries();
      
      if (transcriptEntries.length === 0) {
        // Try one more time with expand buttons
        await this.handleExpandButtons();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const retryEntries = this.extractTranscriptEntries();
        
        if (retryEntries.length === 0) {
          // Try alternative extraction methods
          console.log('🎯 Trying alternative extraction methods...');
          const alternativeEntries = this.extractTranscriptAlternative();
          console.log('🎯 Alternative extraction - entries found:', alternativeEntries.length);
          
          if (alternativeEntries.length === 0) {
            throw new Error('No transcript content found. The video may not have captions/transcript available.');
          }
          
          const formattedTranscript = this.formatTranscript(alternativeEntries);
          return formattedTranscript;
        }
        
        const formattedTranscript = this.formatTranscript(retryEntries);
        return formattedTranscript;
      }

      // Format transcript
      const formattedTranscript = this.formatTranscript(transcriptEntries);
      return formattedTranscript;

    } catch (error) {
      console.error('Error extracting YouTube transcript:', error);
      throw new Error(`Failed to extract YouTube transcript: ${error.message}`);
    }
  }

  /**
   * Ensure transcript panel is open
   */
  private static async ensureTranscriptPanelOpen(): Promise<void> {
    try {
      // Check if transcript panel is already visible with actual content
      // Use EXACT selector from HTML analysis
      const panelSelectors = [
        'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]',
        '#segments-container', 
        'ytd-transcript-segment-list-renderer', 
        'ytd-transcript-renderer'
      ];
      
      let existingPanel = null;
      for (const selector of panelSelectors) {
        existingPanel = document.querySelector(selector);
        if (existingPanel) {
          console.log('🎯 Found existing panel with selector:', selector);
          console.log('🎯 Panel element:', existingPanel);
          console.log('🎯 Panel height:', existingPanel.offsetHeight);
          console.log('🎯 Panel visible:', (existingPanel as HTMLElement).offsetParent !== null);
          
          if (existingPanel.offsetHeight > 0) {
            const segments = existingPanel.querySelectorAll('ytd-transcript-segment-renderer');
            console.log('🎯 Found segments in existing panel:', segments.length);
            if (segments.length > 0) {
              console.log('🎯 Transcript panel already open with content');
              return;
            }
          }
        }
      }

      // Try to find and click transcript button
      const transcriptButton = this.findTranscriptButton();
      if (transcriptButton) {
        console.log('🎯 Clicking transcript button...');
        (transcriptButton as HTMLElement).click();
        
        // Wait for panel to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check for expand buttons and click them
        await this.handleExpandButtons();
        return;
      }

      // Try to find and click closed captions button
      const ccButton = document.querySelector('.ytp-subtitles-button, [aria-label*="captions"], [aria-label*="Captions"]');
      if (ccButton) {
        console.log('🎯 Clicking closed captions button...');
        (ccButton as HTMLElement).click();
        
        // Wait and then try to find transcript option
        await new Promise(resolve => setTimeout(resolve, 1000));
        const transcriptOption = this.findTranscriptButton();
        if (transcriptOption) {
          (transcriptOption as HTMLElement).click();
          await new Promise(resolve => setTimeout(resolve, 3000));
          await this.handleExpandButtons();
        }
      }

      // Try to find engagement panel transcript button
      const engagementButton = document.querySelector('[panel-target-id="engagement-panel-searchable-transcript"]');
      if (engagementButton) {
        console.log('🎯 Clicking engagement panel transcript button...');
        (engagementButton as HTMLElement).click();
        await new Promise(resolve => setTimeout(resolve, 3000));
        await this.handleExpandButtons();
      }

    } catch (error) {
      console.error('Error opening transcript panel:', error);
    }
  }

  /**
   * Handle expand buttons that might hide transcript content
   */
  private static async handleExpandButtons(): Promise<void> {
    try {
      console.log('🎯 Checking for expand buttons...');
      
      // Look for expand buttons with various selectors - prioritize the specific one you mentioned
      const expandSelectors = [
        'tp-yt-paper-button#expand',  // EXACT selector from user's example
        'tp-yt-paper-button.button.style-scope.ytd-text-inline-expander',  // Full class selector
        '.ytd-text-inline-expander button',
        'button[id="expand"]',
        '[id="expand"]',
        'button[aria-label*="expand"]',
        'button[aria-label*="more"]',
        'button[aria-label*="show more"]'
      ];

      for (const selector of expandSelectors) {
        const expandButtons = document.querySelectorAll(selector);
        console.log(`🎯 Found ${expandButtons.length} expand buttons with selector: ${selector}`);
        
        for (const button of expandButtons) {
          const element = button as HTMLElement;
          console.log('🎯 Checking expand button:', {
            selector: selector,
            element: element,
            visible: element && element.offsetHeight > 0 && element.offsetWidth > 0,
            height: element?.offsetHeight,
            width: element?.offsetWidth,
            text: element?.textContent?.trim(),
            id: element?.id,
            classes: element?.className
          });
          
          if (element && element.offsetHeight > 0 && element.offsetWidth > 0) {
            console.log('🎯 Clicking expand button with selector:', selector);
            element.click();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      // Also look for any buttons with "..." or "more" text
      const allButtons = document.querySelectorAll('button, tp-yt-paper-button');
      for (const button of allButtons) {
        const text = button.textContent?.trim().toLowerCase();
        if (text && (text.includes('...') || text.includes('more') || text.includes('expand'))) {
          const element = button as HTMLElement;
          if (element && element.offsetHeight > 0 && element.offsetWidth > 0) {
            console.log('🎯 Clicking button with text:', text);
            element.click();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

    } catch (error) {
      console.error('Error handling expand buttons:', error);
    }
  }

  /**
   * Find transcript button on the page
   */
  private static findTranscriptButton(): Element | null {
    console.log('🎯 YouTubeExtractor.findTranscriptButton: Starting search...');
    
    const buttonSelectors = [
      // EXACT selectors from HTML analysis - these should work!
      'button[aria-label="Show transcript"]',
      
      // Container-specific selectors
      'ytd-video-description-transcript-section-renderer button[aria-label="Show transcript"]',
      'ytd-button-renderer button[aria-label="Show transcript"]',
      
      // Alternative selectors
      'button[aria-label*="Show transcript" i]',
      'button[aria-label*="transcript" i]',
      'button[aria-label*="captions" i]',
      'button[aria-label*="CC" i]',
      
      // Panel target selectors
      '[panel-target-id="engagement-panel-searchable-transcript"]',
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"] button',
      
      // Legacy fallback selectors
      '.ytd-transcript-button-renderer',
      'ytd-transcript-button-renderer',
      'button[data-tooltip-text*="transcript"]'
    ];

    for (const selector of buttonSelectors) {
      const button = document.querySelector(selector);
      console.log(`🎯 Checking selector "${selector}":`, !!button);
      if (button) {
        console.log('🎯 Found transcript button with selector:', selector);
        console.log('🎯 Button element:', button);
        console.log('🎯 Button visible:', (button as HTMLElement).offsetParent !== null);
        console.log('🎯 Button text:', button.textContent?.trim());
        console.log('🎯 Button aria-label:', button.getAttribute('aria-label'));
        return button;
      }
    }

    console.log('🎯 No transcript button found with any selector');
    return null;
  }

  /**
   * Alternative extraction method for when primary method fails
   */
  private static extractTranscriptAlternative(): YouTubeTranscriptEntry[] {
    console.log('🎯 Trying alternative transcript extraction methods...');
    const entries: YouTubeTranscriptEntry[] = [];

    try {
      // Look for any text content that might be transcript
      const possibleTranscriptElements = document.querySelectorAll([
        'ytd-transcript-renderer',
        'ytd-transcript-segment-list-renderer',
        '#segments-container',
        '.transcript-content',
        '[id*="transcript"]',
        '[class*="transcript"]'
      ].join(','));

      console.log('🎯 Found possible transcript elements:', possibleTranscriptElements.length);

      for (const element of possibleTranscriptElements) {
        const text = element.textContent?.trim();
        if (text && text.length > 10) {
          console.log('🎯 Found transcript text:', text.substring(0, 100));
          // Try to parse as transcript entries
          const lines = text.split('\n').filter(line => line.trim().length > 0);
          let currentTime = '0:00';
          
          for (const line of lines) {
            // Look for timestamp patterns
            const timeMatch = line.match(/(\d+:\d+)/);
            if (timeMatch) {
              currentTime = timeMatch[1];
            }
            
            // If line has substantial content, treat as transcript entry
            if (line.length > 10 && !line.match(/^\d+:\d+$/)) {
              entries.push({
                timestamp: currentTime,
                text: line.trim()
              });
            }
          }
        }
      }

      console.log('🎯 Alternative extraction found entries:', entries.length);
      return entries;
    } catch (error) {
      console.error('🎯 Alternative extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract transcript entries from the page
   */
  private static extractTranscriptEntries(): YouTubeTranscriptEntry[] {
    const entries: YouTubeTranscriptEntry[] = [];

    try {
      console.log('🎯 extractTranscriptEntries: Starting extraction...');
      
      // Try multiple selectors for transcript segments - updated with EXACT selectors from HTML analysis
      const segmentSelectors = [
        // Primary selectors from HTML analysis
        'ytd-transcript-segment-renderer',
        '#segments-container ytd-transcript-segment-renderer',
        'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"] ytd-transcript-segment-renderer',
        
        // Alternative selectors
        '.ytd-transcript-segment-renderer',
        '.ytd-transcript-segment-list-renderer ytd-transcript-segment-renderer',
        '.ytd-transcript-body-renderer .ytd-transcript-segment-renderer',
        '[id*="transcript-segment"]',
        '.transcript-segment'
      ];

      let segments: NodeListOf<Element> | null = null;
      let usedSelector = '';

      console.log('🎯 Checking segment selectors...');
      for (const selector of segmentSelectors) {
        segments = document.querySelectorAll(selector);
        console.log(`🎯 Selector "${selector}": found ${segments.length} elements`);
        if (segments.length > 0) {
          usedSelector = selector;
          console.log('🎯 Using selector:', usedSelector);
          break;
        }
      }

      console.log('🎯 Found transcript segments:', segments?.length || 0, 'using selector:', usedSelector);

      if (segments && segments.length > 0) {
        console.log('🎯 Processing segments...');
        segments.forEach((segment, index) => {
          console.log(`🎯 Processing segment ${index + 1}/${segments.length}:`, segment);
          console.log(`🎯 Segment HTML:`, segment.outerHTML.substring(0, 200));
          try {
            const entry = this.extractEntryFromSegment(segment);
            if (entry && entry.text.trim().length > 0) {
              console.log(`🎯 Extracted entry ${index + 1}:`, entry);
              entries.push(entry);
            } else {
              console.log(`🎯 Failed to extract entry from segment ${index + 1}`);
            }
          } catch (error) {
            console.warn(`Error extracting entry ${index}:`, error);
          }
        });
        console.log('🎯 Total entries extracted:', entries.length);
      }

      // If no segments found, try alternative method
      if (entries.length === 0) {
        console.log('🎯 No segments found, trying alternative extraction...');
        const alternativeEntries = this.extractTranscriptAlternative();
        entries.push(...alternativeEntries);
      }

    } catch (error) {
      console.error('Error extracting transcript entries:', error);
    }

    return entries;
  }

  /**
   * Extract entry from a transcript segment
   */
  private static extractEntryFromSegment(segment: Element): YouTubeTranscriptEntry | null {
    try {
      console.log('🎯 extractEntryFromSegment: Processing segment...');
      console.log('🎯 Segment element:', segment);
      console.log('🎯 Segment HTML:', segment.outerHTML.substring(0, 300));
      
      // Try to find timestamp - updated with actual YouTube structure
      const timestampSelectors = [
        '.segment-timestamp.style-scope.ytd-transcript-segment-renderer',
        '.segment-timestamp',
        '.segment-start-offset .segment-timestamp',
        '[class*="timestamp"]'
      ];
      
      let timestamp = '';
      console.log('🎯 Looking for timestamp...');
      for (const selector of timestampSelectors) {
        const timestampElement = segment.querySelector(selector);
        console.log(`🎯 Timestamp selector "${selector}":`, timestampElement);
        if (timestampElement) {
          timestamp = timestampElement.textContent?.trim() || '';
          console.log(`🎯 Found timestamp: "${timestamp}"`);
          if (timestamp) break;
        }
      }

      // Try to find text content - the text is in the aria-label of the segment div
      let text = '';
      
      console.log('🎯 Looking for text content...');
      
      // First try to get from aria-label (this contains the full text)
      const ariaLabel = segment.getAttribute('aria-label');
      console.log('🎯 aria-label:', ariaLabel);
      if (ariaLabel) {
        // Remove timestamp from aria-label if present
        const timestampMatch = ariaLabel.match(/^(\d+)\s+seconds?\s+(.*)/);
        if (timestampMatch) {
          text = timestampMatch[2];
          console.log('🎯 Extracted text from aria-label (removed timestamp):', text.substring(0, 100));
        } else {
          text = ariaLabel;
          console.log('🎯 Using full aria-label as text:', text.substring(0, 100));
        }
      }
      
      // If no aria-label, try to find text in child elements
      if (!text) {
        const textSelectors = [
          '.segment-text',
          '[class*="text"]',
          '.segment-content'
        ];
        
        for (const selector of textSelectors) {
          const textElement = segment.querySelector(selector);
          if (textElement) {
            text = textElement.textContent?.trim() || '';
            if (text) break;
          }
        }
      }
      
      // Fallback: get all text content and try to separate timestamp
      if (!text) {
        const fullText = segment.textContent?.trim() || '';
        const timestampMatch = fullText.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*(.*)/);
        if (timestampMatch) {
          timestamp = timestampMatch[1];
          text = timestampMatch[2];
        } else {
          text = fullText;
        }
      }

      // Clean up the text
      if (text) {
        text = text.trim();
        // Remove any remaining timestamp patterns
        text = text.replace(/^\d+:\d{2}\s*/, '');
        text = text.replace(/^\d+\s+seconds?\s+/, '');
        
        // Clean up extra whitespace and normalize
        text = text.replace(/\s+/g, ' ');
        
        // Remove common artifacts
        text = text.replace(/^\[.*?\]\s*/, ''); // Remove any remaining [timestamp] patterns
        text = text.replace(/\s*\[.*?\]\s*$/, ''); // Remove trailing [anything] patterns
        
        // Only return if we have meaningful content
        if (text.length < 3 || !/[a-zA-Z]/.test(text)) {
          return null;
        }
      }

      if (text && text.length > 0) {
        return { timestamp, text };
      }

      return null;
    } catch (error) {
      console.error('Error extracting entry from segment:', error);
      return null;
    }
  }


  /**
   * Format transcript entries into readable text
   */
  private static formatTranscript(entries: YouTubeTranscriptEntry[]): string {
    try {
      // Sort entries by timestamp to ensure proper chronological order
      const sortedEntries = entries.sort((a, b) => {
        const timeA = this.parseTimeToSeconds(a.timestamp);
        const timeB = this.parseTimeToSeconds(b.timestamp);
        return timeA - timeB;
      });

      const formattedLines = sortedEntries.map(entry => {
        if (entry.timestamp && entry.text.trim()) {
          return `[${entry.timestamp}] ${entry.text.trim()}`;
        } else if (entry.text.trim()) {
          return entry.text.trim();
        }
        return '';
      }).filter(line => line.length > 0);

      return formattedLines.join('\n\n');
    } catch (error) {
      console.error('Error formatting transcript:', error);
      return entries.map(entry => entry.text.trim()).filter(text => text.length > 0).join('\n\n');
    }
  }

  /**
   * Parse timestamp string to seconds for sorting
   */
  private static parseTimeToSeconds(timeStr: string): number {
    if (!timeStr) return 0;
    
    try {
      const parts = timeStr.split(':');
      if (parts.length === 2) {
        // Format: MM:SS
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      } else if (parts.length === 3) {
        // Format: HH:MM:SS
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Extract playlist information from YouTube page
   */
  static extractPlaylist(): YouTubePlaylist | null {
    try {
      console.log('🎯 Starting YouTube playlist extraction...');
      
      // Check if we're on a YouTube page with playlist
      if (!this.isYouTubeVideoPage()) {
        console.log('🎯 Not on a YouTube video page');
        return null;
      }

      // Look for playlist panel
      const playlistPanel = this.findPlaylistPanel();
      if (!playlistPanel) {
        console.log('🎯 No playlist panel found');
        return null;
      }

      // Extract playlist videos
      const videos = this.extractPlaylistVideos(playlistPanel);
      console.log('🎯 Extracted playlist videos:', videos.length);

      if (videos.length === 0) {
        console.log('🎯 No videos found in playlist');
        return null;
      }

      // Get playlist title
      const playlistTitle = this.getPlaylistTitle() || 'YouTube Playlist';

      const playlist: YouTubePlaylist = {
        title: playlistTitle,
        videos: videos,
        totalVideos: videos.length
      };

      console.log('🎯 Playlist extraction completed:', {
        title: playlist.title,
        totalVideos: playlist.totalVideos
      });

      return playlist;

    } catch (error) {
      console.error('Error extracting YouTube playlist:', error);
      return null;
    }
  }

  /**
   * Find the playlist panel on the page
   */
  private static findPlaylistPanel(): Element | null {
    try {
      console.log('🎯 Looking for playlist panel...');
      
      const playlistSelectors = [
        // Main playlist panel selectors
        'ytd-playlist-panel-renderer',
        '#playlist-items',
        '.playlist-items',
        'ytd-playlist-panel-video-renderer',
        
        // Alternative selectors
        '[id*="playlist"]',
        '[class*="playlist"]',
        'ytd-item-section-renderer[lockup-container-type="3"]'
      ];

      for (const selector of playlistSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          console.log('🎯 Found playlist panel with selector:', selector);
          console.log('🎯 Panel element:', element);
          return element;
        }
      }

      // Look for any container with playlist video renderers
      const videoRenderers = document.querySelectorAll('ytd-playlist-panel-video-renderer');
      if (videoRenderers.length > 0) {
        console.log('🎯 Found playlist video renderers:', videoRenderers.length);
        return videoRenderers[0].closest('ytd-playlist-panel-renderer') || videoRenderers[0].parentElement;
      }

      console.log('🎯 No playlist panel found');
      return null;
    } catch (error) {
      console.error('Error finding playlist panel:', error);
      return null;
    }
  }

  /**
   * Extract videos from playlist panel
   */
  private static extractPlaylistVideos(playlistPanel: Element): YouTubePlaylistVideo[] {
    const videos: YouTubePlaylistVideo[] = [];

    try {
      console.log('🎯 Extracting videos from playlist panel...');
      
      // Find all playlist video renderers
      const videoSelectors = [
        'ytd-playlist-panel-video-renderer',
        '.playlist-items ytd-playlist-panel-video-renderer',
        '#playlist-items ytd-playlist-panel-video-renderer'
      ];

      let videoElements: NodeListOf<Element> | null = null;
      for (const selector of videoSelectors) {
        videoElements = playlistPanel.querySelectorAll(selector);
        if (videoElements.length > 0) {
          console.log('🎯 Found videos with selector:', selector);
          break;
        }
      }

      if (!videoElements || videoElements.length === 0) {
        console.log('🎯 No video elements found in playlist panel');
        return videos;
      }

      console.log('🎯 Processing', videoElements.length, 'playlist videos...');

      videoElements.forEach((videoElement, index) => {
        try {
          const video = this.extractVideoFromPlaylistElement(videoElement, index + 1);
          if (video) {
            videos.push(video);
            console.log(`🎯 Extracted video ${index + 1}:`, video.title);
          }
        } catch (error) {
          console.warn(`Error extracting video ${index + 1}:`, error);
        }
      });

      console.log('🎯 Successfully extracted', videos.length, 'videos from playlist');
      return videos;

    } catch (error) {
      console.error('Error extracting playlist videos:', error);
      return videos;
    }
  }

  /**
   * Extract video information from a playlist video element
   */
  private static extractVideoFromPlaylistElement(videoElement: Element, index: number): YouTubePlaylistVideo | null {
    try {
      console.log(`🎯 Extracting video ${index} from playlist element...`);
      
      // Extract video title
      const titleSelectors = [
        '#video-title',
        '.video-title',
        'span#video-title',
        'h4 span#video-title',
        'yt-formatted-string[title]'
      ];

      let title = '';
      for (const selector of titleSelectors) {
        const titleElement = videoElement.querySelector(selector);
        if (titleElement) {
          // Try to get title attribute first
          title = titleElement.getAttribute('title') || titleElement.textContent?.trim() || '';
          if (title) break;
        }
      }

      if (!title) {
        console.log(`🎯 Could not extract title for video ${index}`);
        return null;
      }

      // Extract video URL and ID
      const linkElement = videoElement.querySelector('a[href*="/watch"]');
      let url = '';
      let videoId = '';
      
      if (linkElement) {
        url = linkElement.getAttribute('href') || '';
        if (url.startsWith('/')) {
          url = 'https://www.youtube.com' + url;
        }
        
        // Extract video ID from URL
        const videoIdMatch = url.match(/[?&]v=([^&]+)/);
        if (videoIdMatch) {
          videoId = videoIdMatch[1];
        }
      }

      // Extract duration
      const durationSelectors = [
        '.yt-badge-shape__text',
        '.thumbnail-overlay-badge-shape .yt-badge-shape__text',
        'ytd-thumbnail-overlay-time-status-renderer .yt-badge-shape__text',
        '[aria-label*="seconds"]',
        '[aria-label*="minutes"]'
      ];

      let duration = '';
      for (const selector of durationSelectors) {
        const durationElement = videoElement.querySelector(selector);
        if (durationElement) {
          duration = durationElement.textContent?.trim() || durationElement.getAttribute('aria-label') || '';
          if (duration) break;
        }
      }

      // Check if this is the current video
      const currentVideoId = this.getVideoId();
      const isCurrentVideo = currentVideoId === videoId;

      const video: YouTubePlaylistVideo = {
        title: title.trim(),
        videoId: videoId,
        url: url,
        duration: duration.trim(),
        index: index,
        isCurrentVideo: isCurrentVideo
      };

      console.log(`🎯 Extracted video ${index}:`, {
        title: video.title,
        videoId: video.videoId,
        duration: video.duration,
        isCurrent: video.isCurrentVideo
      });

      return video;

    } catch (error) {
      console.error(`Error extracting video ${index} from playlist element:`, error);
      return null;
    }
  }

  /**
   * Get playlist title
   */
  private static getPlaylistTitle(): string | null {
    try {
      const titleSelectors = [
        'h1.ytd-playlist-header-renderer',
        '.ytd-playlist-header-renderer h1',
        'yt-formatted-string[title]',
        'h1[title]'
      ];

      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const title = element.getAttribute('title') || element.textContent?.trim();
          if (title) {
            return title;
          }
        }
      }

      // Fallback: try to get from page title
      const pageTitle = document.title;
      if (pageTitle && pageTitle.includes(' - YouTube')) {
        return pageTitle.replace(' - YouTube', '').trim();
      }

      return null;
    } catch (error) {
      console.error('Error getting playlist title:', error);
      return null;
    }
  }

  /**
   * Test all selectors for debugging
   */
  static testAllSelectors(): void {
    console.log('🎯 Testing YouTube selectors...');
    
    const selectors = [
      'h1.ytd-watch-metadata yt-formatted-string',
      'h1.style-scope.ytd-watch-metadata yt-formatted-string',
      'yt-formatted-string[force-default-style].style-scope.ytd-watch-metadata',
      '.ytd-transcript-segment-renderer',
      '[id*="transcript-segment"]',
      '.transcript-segment',
      '[aria-label*="transcript"]',
      '[aria-label*="Transcript"]'
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
