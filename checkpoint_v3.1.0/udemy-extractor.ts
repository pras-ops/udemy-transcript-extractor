// Udemy Transcript Extractor
// Based on the provided HTML structure from Udemy course pages

export interface UdemySection {
  id: string;
  title: string;
  duration: string;
  lectures: UdemyLecture[];
}

export interface UdemyLecture {
  id: string;
  title: string;
  duration: string;
  isCurrent: boolean;
  transcript?: string;
}

export interface UdemyCourse {
  title: string;
  instructor: string;
  sections: UdemySection[];
  currentLecture?: UdemyLecture;
}

const SELECTORS = {
  // Most reliable selectors based on testing
  TRANSCRIPT_PANEL: '[data-purpose="transcript-panel"]',
  TRANSCRIPT_ENTRIES: '[data-purpose="transcript-cue"]',
  TRANSCRIPT_BUTTON: 'button[data-purpose="transcript-toggle"]',
  
  // Video element for text tracks
  VIDEO: 'video',
  
  // Course structure selectors - Updated based on actual HTML structure
  COURSE_TITLE: 'h1[data-purpose="course-title"]',
  LECTURE_TITLE: '[data-purpose="lecture-title"]',
  SECTION_TITLE: '.ud-accordion-panel-title',
  SIDEBAR_SECTIONS: '[data-purpose^="section-panel-"]',
  SIDEBAR_LECTURES: '[data-purpose^="curriculum-item-"]',
  LECTURE_ITEM_TITLE: '[data-purpose="item-title"]'
} as const;

export class UdemyExtractor {
  // Simple cleanup tracking for intervals
  private static cleanupIntervals: NodeJS.Timeout[] = [];

  /**
   * Cleanup all intervals to prevent memory leaks
   */
  static cleanup() {
    this.cleanupIntervals.forEach(interval => clearInterval(interval));
    this.cleanupIntervals = [];
  }

  /**
   * Extract course structure from Udemy page
   */
  static extractCourseStructure(): UdemyCourse | null {
    try {
      const courseTitle = this.getCourseTitle();
      const instructor = this.getInstructorName();
      const sections = this.extractSections();
      const currentLecture = this.getCurrentLecture();

      return {
        title: courseTitle,
        instructor: instructor,
        sections: sections,
        currentLecture: currentLecture
      };
    } catch (error) {
      console.error('Error extracting course structure:', error);
      return null;
    }
  }

  /**
   * Extract all sections and lectures
   */
  private static extractSections(): UdemySection[] {
    const sections: UdemySection[] = [];
    let sectionElements = document.querySelectorAll(SELECTORS.SIDEBAR_SECTIONS);
    
    console.log('🎯 Course structure debug - Found section elements:', sectionElements.length);
    console.log('🎯 Course structure debug - Section selector used:', SELECTORS.SIDEBAR_SECTIONS);

    // If no sections found with current selector, try alternative selectors
    if (sectionElements.length === 0) {
      console.log('🎯 Course structure debug - No sections found, trying alternative selectors...');
      const alternativeSelectors = [
        '[data-purpose="curriculum-section"]',
        '.ud-accordion-panel',
        '.curriculum-section',
        '[data-purpose*="section"]'
      ];

      for (const selector of alternativeSelectors) {
        const altElements = document.querySelectorAll(selector);
        console.log(`🎯 Course structure debug - Alternative selector "${selector}": ${altElements.length} elements`);
        if (altElements.length > 0) {
          sectionElements = altElements;
          break;
        }
      }
    }

    sectionElements.forEach((sectionEl, index) => {
      const title = this.extractSectionTitle(sectionEl);
      const duration = this.extractSectionDuration(sectionEl);
      const lectures = this.extractLectures(sectionEl);

      console.log(`🎯 Course structure debug - Section ${index}:`, { 
        title, 
        duration, 
        lectureCount: lectures.length,
        sectionElementClasses: sectionEl.className
      });

      sections.push({
        id: `section-${index}`,
        title: title,
        duration: duration,
        lectures: lectures
      });
    });

    console.log('🎯 Course structure debug - Total sections extracted:', sections.length);
    return sections;
  }

  /**
   * Extract section title
   */
  private static extractSectionTitle(sectionEl: Element): string {
    const titleEl = sectionEl.querySelector(SELECTORS.SECTION_TITLE);
    return titleEl?.textContent?.trim() || 'Untitled Section';
  }

  /**
   * Extract section duration
   */
  private static extractSectionDuration(sectionEl: Element): string {
    const durationEl = sectionEl.querySelector('[data-purpose="section-duration"]');
    const durationText = durationEl?.textContent?.trim() || '';
    // Extract duration from format like "0 / 2 | 38min"
    const match = durationText.match(/\|\s*(\d+min|\d+hr\s*\d+min)/);
    return match ? match[1] : '';
  }

  /**
   * Extract lectures from a section
   */
  private static extractLectures(sectionEl: Element): UdemyLecture[] {
    const lectures: UdemyLecture[] = [];
    
    // Try multiple selectors to find lectures
    const lectureSelectors = [
      SELECTORS.SIDEBAR_LECTURES,
      '[data-purpose^="curriculum-item-"]',
      '.curriculum-item-link',
      '[data-purpose*="curriculum-item"]',
      'a[href*="/learn/lecture/"]',
      '.ud-accordion-panel-content a[href*="/learn/lecture/"]'
    ];

    let lectureElements: NodeListOf<Element> | null = null;
    let usedSelector = '';

    // Try each selector until we find lectures
    for (const selector of lectureSelectors) {
      lectureElements = sectionEl.querySelectorAll(selector);
      if (lectureElements.length > 0) {
        usedSelector = selector;
        break;
      }
    }

    console.log(`🎯 Course structure debug - Section lectures found:`, {
      sectionTitle: this.extractSectionTitle(sectionEl),
      lectureCount: lectureElements?.length || 0,
      usedSelector: usedSelector
    });

    if (!lectureElements || lectureElements.length === 0) {
      // Fallback: look for any links that might be lectures
      const allLinks = sectionEl.querySelectorAll('a[href*="/learn/lecture/"]');
      console.log(`🎯 Course structure debug - Fallback: found ${allLinks.length} lecture links`);
      
      allLinks.forEach((linkEl, index) => {
        const title = linkEl.textContent?.trim() || 'Untitled Lecture';
        const duration = this.extractLectureDuration(linkEl);
        const isCurrent = linkEl.classList.contains('curriculum-item-link--is-current--2mKk4') || 
                         linkEl.classList.contains('is-current');

        lectures.push({
          id: `lecture-${index}`,
          title: title,
          duration: duration,
          isCurrent: isCurrent
        });
      });
    } else {
      lectureElements.forEach((lectureEl, index) => {
        const title = this.extractLectureTitle(lectureEl);
        const duration = this.extractLectureDuration(lectureEl);
        const isCurrent = lectureEl.classList.contains('curriculum-item-link--is-current--2mKk4') ||
                         lectureEl.classList.contains('is-current');

        lectures.push({
          id: `lecture-${index}`,
          title: title,
          duration: duration,
          isCurrent: isCurrent
        });
      });
    }

    return lectures;
  }

  /**
   * Extract lecture title
   */
  private static extractLectureTitle(lectureEl: Element): string {
    // Try multiple selectors for lecture title
    const titleSelectors = [
      SELECTORS.LECTURE_ITEM_TITLE,
      '[data-purpose="item-title"]',
      '.curriculum-item-link--item-title--3Qj8Y',
      '.ud-heading-sm',
      '.ud-text-sm',
      'span[data-purpose="item-title"]',
      'a[data-purpose="item-title"]'
    ];

    for (const selector of titleSelectors) {
      const titleEl = lectureEl.querySelector(selector);
      if (titleEl && titleEl.textContent?.trim()) {
        return titleEl.textContent.trim();
      }
    }

    // Fallback: use the element's own text content
    const ownText = lectureEl.textContent?.trim();
    if (ownText && ownText.length > 0 && ownText.length < 200) {
      return ownText;
    }

    return 'Untitled Lecture';
  }

  /**
   * Extract lecture duration
   */
  private static extractLectureDuration(lectureEl: Element): string {
    const durationEl = lectureEl.querySelector('.curriculum-item-link--metadata--XK804 span:last-child, .ud-text-xs span:last-child');
    return durationEl?.textContent?.trim() || '';
  }

  /**
   * Get current lecture
   */
  private static getCurrentLecture(): UdemyLecture | undefined {
    const currentEl = document.querySelector('.curriculum-item-link--is-current--2mKk4');
    if (!currentEl) return undefined;

    return {
      id: 'current-lecture',
      title: this.extractLectureTitle(currentEl),
      duration: this.extractLectureDuration(currentEl),
      isCurrent: true
    };
  }

  /**
   * Get course title
   */
  private static getCourseTitle(): string {
    const titleEl = document.querySelector(SELECTORS.COURSE_TITLE);
    return titleEl?.textContent?.trim() || 'Untitled Course';
  }

  /**
   * Get instructor name
   */
  private static getInstructorName(): string {
    const instructorEl = document.querySelector('[data-purpose="instructor-name"], .instructor-name');
    return instructorEl?.textContent?.trim() || 'Unknown Instructor';
  }

  /**
   * Test course structure selectors specifically
   */
  static testCourseStructureSelectors(): void {
    console.log('🎯 === COURSE STRUCTURE SELECTORS TEST ===');
    
    // Test section selectors
    const sectionSelectors = [
      SELECTORS.SIDEBAR_SECTIONS,
      '[data-purpose="curriculum-section"]',
      '.ud-accordion-panel',
      '.curriculum-section',
      '[data-purpose*="section"]'
    ];

    console.log('🎯 Section Selectors Test:');
    sectionSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`  ${selector}: ${elements.length} elements found`);
      if (elements.length > 0) {
        console.log(`    First element classes: "${elements[0].className}"`);
        console.log(`    First element text: "${elements[0].textContent?.substring(0, 100)}..."`);
      }
    });

    // Test lecture selectors
    const lectureSelectors = [
      SELECTORS.SIDEBAR_LECTURES,
      '[data-purpose^="curriculum-item-"]',
      '.curriculum-item-link',
      '[data-purpose*="curriculum-item"]',
      'a[href*="/learn/lecture/"]'
    ];

    console.log('🎯 Lecture Selectors Test:');
    lectureSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`  ${selector}: ${elements.length} elements found`);
      if (elements.length > 0) {
        console.log(`    First element classes: "${elements[0].className}"`);
        console.log(`    First element text: "${elements[0].textContent?.substring(0, 100)}..."`);
      }
    });

    // Test title selectors
    const titleSelectors = [
      SELECTORS.LECTURE_ITEM_TITLE,
      '[data-purpose="item-title"]',
      '.curriculum-item-link--item-title--3Qj8Y',
      '.ud-heading-sm',
      '.ud-text-sm'
    ];

    console.log('🎯 Title Selectors Test:');
    titleSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`  ${selector}: ${elements.length} elements found`);
      if (elements.length > 0) {
        console.log(`    First element text: "${elements[0].textContent?.trim()}"`);
      }
    });

    // Test all links that might be lectures
    const allLectureLinks = document.querySelectorAll('a[href*="/learn/lecture/"]');
    console.log(`🎯 All lecture links found: ${allLectureLinks.length}`);
    if (allLectureLinks.length > 0) {
      console.log('  Sample lecture links:');
      const sampleCount = Math.min(5, allLectureLinks.length);
      for (let i = 0; i < sampleCount; i++) {
        const link = allLectureLinks[i];
        console.log(`    ${i + 1}. "${link.textContent?.trim()}" (${link.getAttribute('href')})`);
      }
    }
  }

  /**
   * Test all selectors to find the most reliable ones
   */
  static testAllSelectors(): void {
    console.log('🎯 === COMPREHENSIVE SELECTOR TESTING STARTED ===');
    
    // Test transcript panel selectors
    const panelSelectors = [
      '[data-purpose="transcript-panel"]',
      '.transcript-panel',
      '[data-test="transcript-panel"]',
      '.transcript--transcript-panel--JLceZ',
      '.captions-display--captions-container--PqdGQ',
      '[class*="transcript"]',
      '[class*="captions"]',
      '[class*="subtitles"]'
    ];
    
    console.log('🎯 === PANEL SELECTORS TEST ===');
    panelSelectors.forEach(selector => {
      const element = document.querySelector(selector);
      console.log(`  ${selector}: ${element ? '✅ FOUND' : '❌ NOT FOUND'}`);
      if (element) {
        console.log(`    Text content: "${element.textContent?.substring(0, 100)}..."`);
        console.log(`    Children count: ${element.children.length}`);
        console.log(`    Classes: "${element.className}"`);
        console.log(`    Visible: ${(element as HTMLElement).offsetParent !== null}`);
        console.log(`    Dimensions: ${(element as HTMLElement).offsetWidth}x${(element as HTMLElement).offsetHeight}`);
      }
    });
    
    // Test entry selectors with detailed analysis
    const entrySelectors = [
      '[data-purpose="transcript-cue"]',
      '.transcript--cue-container--Vuwj6',
      '.transcript--underline-cue---xybZ',
      '.transcript-cue',
      '[data-timestamp]',
      '.timestamp-item',
      '.transcript-line',
      'div[role="button"]',
      'button[data-purpose*="transcript"]',
      '.captions-display--captions-cue-text--TQ0DQ',
      '[class*="cue"]',
      '[class*="timestamp"]'
    ];
    
    console.log('🎯 === ENTRY SELECTORS TEST ===');
    entrySelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`  ${selector}: ${elements.length} elements found`);
      if (elements.length > 0) {
        console.log(`    First element text: "${elements[0].textContent?.substring(0, 50)}..."`);
        console.log(`    First element classes: "${elements[0].className}"`);
        console.log(`    First element tag: "${elements[0].tagName}"`);
        
        // Show sample of first few elements
        const sampleCount = Math.min(3, elements.length);
        for (let i = 0; i < sampleCount; i++) {
          const text = elements[i].textContent?.trim();
          if (text) {
            console.log(`    Sample ${i + 1}: "${text.substring(0, 80)}..."`);
          }
        }
      }
    });
    
    // Test button selectors
    const buttonSelectors = [
      'button[data-purpose="transcript-toggle"]',
      '[data-purpose="transcript-toggle"]',
      '.transcript-toggle',
      '[aria-label*="transcript" i]',
      'button[aria-label*="transcript" i]',
      '[aria-label*="captions" i]',
      'button[aria-label*="captions" i]',
      '[aria-label*="subtitles" i]',
      'button[aria-label*="subtitles" i]'
    ];
    
    console.log('🎯 === BUTTON SELECTORS TEST ===');
    buttonSelectors.forEach(selector => {
      const element = document.querySelector(selector);
      console.log(`  ${selector}: ${element ? '✅ FOUND' : '❌ NOT FOUND'}`);
      if (element) {
        console.log(`    Button text: "${element.textContent?.trim()}"`);
        console.log(`    Button classes: "${element.className}"`);
        console.log(`    Button visible: ${(element as HTMLElement).offsetParent !== null}`);
        console.log(`    Button disabled: ${(element as HTMLButtonElement).disabled}`);
        console.log(`    Aria-label: "${element.getAttribute('aria-label')}"`);
        console.log(`    Data-purpose: "${element.getAttribute('data-purpose')}"`);
      }
    });
    
    // Test all buttons on page for transcript-related content
    console.log('🎯 === ALL BUTTONS ANALYSIS ===');
    const allButtons = document.querySelectorAll('button');
    console.log(`  Total buttons found: ${allButtons.length}`);
    
    const transcriptButtons = Array.from(allButtons).filter(btn => {
      const text = btn.textContent?.toLowerCase() || '';
      const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
      const dataPurpose = btn.getAttribute('data-purpose')?.toLowerCase() || '';
      const className = btn.className.toLowerCase();
      
      return text.includes('transcript') || text.includes('captions') || text.includes('subtitles') ||
             ariaLabel.includes('transcript') || ariaLabel.includes('captions') || ariaLabel.includes('subtitles') ||
             dataPurpose.includes('transcript') || dataPurpose.includes('captions') || dataPurpose.includes('subtitles') ||
             className.includes('transcript') || className.includes('captions') || className.includes('subtitles');
    });
    
    console.log(`  Transcript-related buttons found: ${transcriptButtons.length}`);
    transcriptButtons.forEach((btn, i) => {
      console.log(`    Button ${i + 1}:`);
      console.log(`      Text: "${btn.textContent?.trim()}"`);
      console.log(`      Aria-label: "${btn.getAttribute('aria-label')}"`);
      console.log(`      Data-purpose: "${btn.getAttribute('data-purpose')}"`);
      console.log(`      Classes: "${btn.className}"`);
      console.log(`      Visible: ${(btn as HTMLElement).offsetParent !== null}`);
      console.log(`      Disabled: ${btn.disabled}`);
    });
    
    // Test video element and text tracks
    console.log('🎯 === VIDEO ELEMENT TEST ===');
    const video = document.querySelector('video');
    if (video) {
      console.log(`  Video element found: ${video.tagName}`);
      console.log(`  Video src: "${video.src}"`);
      console.log(`  Video currentTime: ${video.currentTime}`);
      console.log(`  Video duration: ${video.duration}`);
      
      const tracks = Array.from(video.textTracks || []);
      console.log(`  Text tracks found: ${tracks.length}`);
      tracks.forEach((track, i) => {
        console.log(`    Track ${i + 1}:`);
        console.log(`      Kind: "${track.kind}"`);
        console.log(`      Label: "${track.label}"`);
        console.log(`      Language: "${track.language}"`);
        console.log(`      Mode: "${track.mode}"`);
        console.log(`      Cues count: ${track.cues?.length || 0}`);
      });
    } else {
      console.log('  No video element found');
    }
    
    // Test for any transcript-related elements by class name
    console.log('🎯 === TRANSCRIPT-RELATED ELEMENTS BY CLASS ===');
    const transcriptElements = document.querySelectorAll('[class*="transcript"], [class*="captions"], [class*="subtitles"], [class*="cc"]');
    console.log(`  Total transcript-related elements: ${transcriptElements.length}`);
    
    const classGroups: { [key: string]: Element[] } = {};
          transcriptElements.forEach(el => {
        // Check if className is a string (SVG elements might have DOMTokenList)
        const className = typeof el.className === 'string' ? el.className : (el.className as any).baseVal || '';
        if (className) {
          const classes = className.split(' ').filter(cls => 
            cls.includes('transcript') || cls.includes('captions') || cls.includes('subtitles') || cls.includes('cc')
          );
          classes.forEach(cls => {
            if (!classGroups[cls]) classGroups[cls] = [];
            classGroups[cls].push(el);
          });
        }
      });
    
    Object.entries(classGroups).forEach(([className, elements]) => {
      console.log(`    Class "${className}": ${elements.length} elements`);
      if (elements.length <= 3) {
        elements.forEach((el, i) => {
          const text = el.textContent?.trim().substring(0, 50);
          console.log(`      Element ${i + 1}: "${text}..."`);
        });
      }
    });
    
    console.log('🎯 === SELECTOR TESTING COMPLETED ===');
  }

  /**
   * Extract transcript for current video
   * Optimized version with reduced delays and better error handling
   */
  static async extractTranscript(): Promise<string> {
    try {
      console.log('🎯 Starting transcript extraction...');
      
      // Quick hover to show controls (reduced delay)
      const videoContainer = document.querySelector('.video-viewer--video-viewer--0IkCW') || 
                            document.querySelector('[data-purpose="video-display"]') ||
                            document.querySelector('video');
      
      if (videoContainer) {
        const hoverEvent = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: 400,
          clientY: 300
        });
        videoContainer.dispatchEvent(hoverEvent);
        await new Promise(resolve => setTimeout(resolve, 200)); // Reduced from 500ms
      }
      
      // Ensure transcript is active (optimized version)
      console.log('🎯 Ensuring transcript is active...');
      await this.ensureTranscriptActive();
      
      let transcriptParts: string[] = [];
      
      // Method 1: Try transcript panel first (fastest)
      console.log('🎯 Method 1: Trying transcript panel...');
      const transcriptPanel = document.querySelector('[data-purpose="transcript-panel"]');
      
      if (transcriptPanel) {
        const entrySelectors = [
          '[data-purpose="transcript-cue"]',
          '.transcript--cue-container--Vuwj6',
          '.transcript-cue',
          'div[role="button"]'
        ];
        
        let transcriptEntries: NodeListOf<Element> | null = null;
        for (const selector of entrySelectors) {
          transcriptEntries = transcriptPanel.querySelectorAll(selector);
          if (transcriptEntries.length > 0) break;
        }
        
        if (transcriptEntries && transcriptEntries.length > 0) {
          console.log('🎯 Found transcript entries:', transcriptEntries.length);
          
          transcriptEntries.forEach((entry, index) => {
            const fullText = entry.textContent?.trim() || '';
            
            if (!fullText || fullText === '...' || fullText.length < 3) return;
            
            // Extract timestamp and text
            const timestampMatch = fullText.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*(.*)/);
            let timestamp = '';
            let text = fullText;
            
            if (timestampMatch) {
              timestamp = timestampMatch[1];
              text = timestampMatch[2];
            }
            
            if (text && text.length > 3 && /[a-zA-Z]/.test(text)) {
              transcriptParts.push(`[${timestamp}] ${text}`);
            }
          });
        }
      }

      // Method 2: Try HTML5 text tracks if panel method failed
      if (transcriptParts.length === 0) {
        console.log('🎯 Method 2: Trying HTML5 text tracks...');
        const trackLines = await this.extractFromTextTracks();
        if (trackLines.length > 0) {
          transcriptParts = trackLines;
          console.log('🎯 Successfully extracted from text tracks!');
        }
      }
      
      if (transcriptParts.length === 0) {
        throw new Error('No transcript content found - video may not have captions');
      }

      console.log('🎯 Transcript extraction completed:', transcriptParts.length, 'parts');
      return transcriptParts.join('\n\n');
    } catch (error) {
      console.error('Error extracting transcript:', error);
      throw new Error(`Failed to extract transcript: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fallback extraction via HTML5 text tracks (optimized version)
   */
  private static async extractFromTextTracks(): Promise<string[]> {
    const lines: string[] = [];
    try {
      const video = document.querySelector('video') as HTMLVideoElement | null;
      if (!video || !video.textTracks) {
        console.log('🎯 No video element or textTracks found');
        return lines;
      }

      const tracks = Array.from(video.textTracks);
      if (!tracks.length) {
        console.log('🎯 No text tracks available');
        return lines;
      }

      // Find best track (captions/subtitles preferred)
      let preferredTrack = tracks.find(t => t.kind === 'captions') || 
                          tracks.find(t => t.kind === 'subtitles') || 
                          tracks[0];
      
      console.log(`🎯 Using track: "${preferredTrack.label}"`);

      // Set track to showing mode
      preferredTrack.mode = 'showing';
      
      // Reduced wait time for cues to load
      await new Promise(res => setTimeout(res, 500)); // Reduced from 1000ms

      const cues = preferredTrack.cues ? Array.from(preferredTrack.cues as any) : [];
      if (cues.length === 0) {
        console.log('🎯 No cues found in track');
        return lines;
      }

      // Extract text from cues
      cues.forEach((cue: any) => {
        const start = this.formatTime(cue.startTime || 0);
        const text = (cue.text || '').replace(/\s+/g, ' ').trim();
        
        if (text && text.length > 3) {
          lines.push(`[${start}] ${text}`);
        }
      });

      console.log('🎯 Extracted', lines.length, 'lines from text tracks');
      
    } catch (err) {
      console.log('🎯 Text tracks extraction failed:', err);
    }
    return lines;
  }

  /**
   * Ensure transcript/captions are active for the current video
   * Optimized version with reduced delays and better error handling
   */
  private static async ensureTranscriptActive(): Promise<void> {
    console.log('🎯 Ensuring transcript/captions are active...');
    
    // Check if transcript panel is already visible and has content
    const existingPanel = document.querySelector('[data-purpose="transcript-panel"]');
    if (existingPanel && (existingPanel as HTMLElement).offsetParent !== null) {
      const hasEntries = existingPanel.querySelector('[data-purpose="transcript-cue"]');
      if (hasEntries) {
        console.log('🎯 Transcript panel already active with content');
        return;
      }
    }
    
    // Quick hover simulation to show controls (reduced delay)
    const videoContainer = document.querySelector('.video-viewer--video-viewer--0IkCW') || 
                          document.querySelector('[data-purpose="video-display"]') ||
                          document.querySelector('.video-js') ||
                          document.querySelector('video');
    
    if (videoContainer) {
      const hoverEvent = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: 400,
        clientY: 300
      });
      videoContainer.dispatchEvent(hoverEvent);
      await new Promise(resolve => setTimeout(resolve, 300)); // Reduced from 1000ms
    }
    
    // Look for transcript button with multiple selectors
    const transcriptButtonSelectors = [
      'button[data-purpose="transcript-toggle"]',
      '[data-purpose="transcript-toggle"]',
      'button[aria-label*="transcript" i]',
      'button[aria-label*="captions" i]'
    ];
    
    let transcriptButton: HTMLElement | null = null;
    for (const selector of transcriptButtonSelectors) {
      const button = document.querySelector(selector) as HTMLElement;
      if (button && button.offsetParent !== null && !(button as HTMLButtonElement).disabled) {
        transcriptButton = button;
        console.log(`🎯 Found transcript button with selector: ${selector}`);
        break;
      }
    }
    
    if (transcriptButton) {
      console.log('🎯 Clicking transcript button...');
      
      // Simple click without excessive event simulation
      transcriptButton.click();
      
      // Reduced wait time for panel to appear
      await new Promise(resolve => setTimeout(resolve, 800)); // Reduced from 2000ms
      
      // Check if panel appeared
      const panel = document.querySelector('[data-purpose="transcript-panel"]');
      if (panel) {
        console.log('🎯 Transcript panel opened successfully');
        return;
      }
      
      // Try enabling captions if transcript panel didn't work
      console.log('🎯 Trying captions activation...');
      await this.enableCaptions();
    } else {
      console.log('🎯 No transcript button found, trying direct captions activation...');
      await this.enableCaptions();
    }
  }
  
  /**
   * Enable captions through various methods
   */
  private static async enableCaptions(): Promise<void> {
    // Method 1: Try captions dropdown
    const captionsDropdown = document.querySelector('[data-purpose="captions-dropdown-button"]');
    if (captionsDropdown) {
      console.log('🎯 Trying captions dropdown...');
      (captionsDropdown as HTMLElement).click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Look for English captions
      const englishButtons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(btn => 
        btn.textContent?.includes('English') && btn.textContent?.includes('[')
      );
      
      if (englishButtons.length > 0) {
        (englishButtons[0] as HTMLElement).click();
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('🎯 English captions activated');
        return;
      }
    }
    
    // Method 2: Try video text tracks directly
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video && video.textTracks) {
      console.log('🎯 Trying video text tracks...');
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        if (track.language === 'en' || track.label.includes('English')) {
          track.mode = 'showing';
          console.log('🎯 Text track enabled:', track.label);
          return;
        }
      }
    }
  }

  private static formatTime(totalSeconds: number): string {
    const sec = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    const min = Math.floor((totalSeconds / 60) % 60).toString().padStart(2, '0');
    const hrs = Math.floor(totalSeconds / 3600);
    return hrs > 0 ? `${hrs}:${min}:${sec}` : `${min}:${sec}`;
  }

  /**
   * Wait for an element to appear in the DOM
   */
  private static async waitForElement(selector: string, timeout: number = 5000): Promise<Element | null> {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations) => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  /**
   * Check if we're on a Udemy course page
   */
  static isUdemyCoursePage(): boolean {
    const isUdemy = window.location.hostname.includes('udemy.com');
    const isCourse = window.location.pathname.includes('/course/');
    const result = isUdemy && isCourse;
    
    console.log('UdemyExtractor.isUdemyCoursePage:', {
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      isUdemy,
      isCourse,
      result
    });
    
    return result;
  }

  /**
   * Check if transcript is available for current video
   * Improved version that works regardless of transcript panel state
   */
  static isTranscriptAvailable(): boolean {
    console.log('🎯 Checking transcript availability...');
    
    // Method 1: Check for existing transcript content (already visible)
    const existingContent = document.querySelector('[data-purpose="transcript-cue"]');
    if (existingContent) {
      console.log('🎯 Transcript content already visible');
      return true;
    }
    
    // Method 2: Check for video text tracks (most reliable)
    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (video && video.textTracks) {
      const tracks = Array.from(video.textTracks);
      console.log('🎯 Video text tracks found:', tracks.length);
      
      for (const track of tracks) {
        if (track.kind === 'captions' || track.kind === 'subtitles') {
          console.log(`🎯 Found ${track.kind} track: "${track.label}"`);
          return true; // If track exists, transcript is available
        }
      }
    }
    
    // Method 3: Check for transcript button (means transcript can be activated)
    const buttonSelectors = [
      'button[data-purpose="transcript-toggle"]',
      '[data-purpose="transcript-toggle"]',
      'button[aria-label*="transcript" i]',
      'button[aria-label*="captions" i]'
    ];
    
    for (const selector of buttonSelectors) {
      const button = document.querySelector(selector);
      if (button && (button as HTMLElement).offsetParent !== null) {
        console.log(`🎯 Transcript button found: ${selector}`);
        return true;
      }
    }
    
    // Method 4: Check for captions dropdown (alternative access)
    const captionsDropdown = document.querySelector('[data-purpose="captions-dropdown-button"]');
    if (captionsDropdown && (captionsDropdown as HTMLElement).offsetParent !== null) {
      console.log('🎯 Captions dropdown found');
      return true;
    }
    
    // Method 5: Check for any transcript-related elements
    const transcriptElements = document.querySelectorAll('[class*="transcript"], [class*="captions"], [class*="subtitles"]');
    if (transcriptElements.length > 0) {
      console.log('🎯 Transcript-related elements found:', transcriptElements.length);
      return true;
    }
    
    console.log('🎯 No transcript availability detected');
    return false;
  }

  /**
   * Get current video information
   */
  static getCurrentVideoInfo(): { title: string; duration: string } | null {
    try {
      // Try to get current lecture first
      const currentLecture = this.getCurrentLecture();
      if (currentLecture) {
        return {
          title: currentLecture.title,
          duration: currentLecture.duration
        };
      }

      // Fallback: try to get video title from page
      const videoTitle = this.getVideoTitleFromPage();
      if (videoTitle) {
        return {
          title: videoTitle,
          duration: 'Unknown'
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting current video info:', error);
      return null;
    }
  }

  /**
   * Get video title from page
   */
  private static getVideoTitleFromPage(): string | null {
    // Try multiple selectors for video title
    const titleSelectors = [
      '[data-purpose="lecture-title"]',
      'h1[data-purpose*="title"]',
      '.lecture-title',
      '.video-title',
      'h1',
      '.ud-heading-xl'
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    // Try to get from page title as fallback
    const pageTitle = document.title;
    if (pageTitle && pageTitle.includes('|')) {
      return pageTitle.split('|')[0].trim();
    }

    return null;
  }
}
