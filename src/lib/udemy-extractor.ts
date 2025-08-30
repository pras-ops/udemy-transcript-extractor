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
   */
  static async extractTranscript(): Promise<string> {
    try {
      console.log('🎯 Starting transcript extraction...');
      
      // First simulate mouse hover to make controls visible
      console.log('🎯 Making video controls visible for transcript access...');
      const videoContainer = document.querySelector('.video-viewer--video-viewer--0IkCW') || 
                            document.querySelector('[data-purpose="video-display"]') ||
                            document.querySelector('.video-js') ||
                            document.querySelector('video');
      
      if (videoContainer) {
        // Simulate mouse hover to show controls
        const hoverEvent = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: 400,
          clientY: 300
        });
        
        videoContainer.dispatchEvent(hoverEvent);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Always ensure transcript is active first
      console.log('🎯 Ensuring transcript is active...');
      await this.ensureTranscriptActive();
      
      // Debug: Find all buttons that might be transcript buttons
      const allButtons = document.querySelectorAll('button');
      console.log('🎯 All buttons found:', allButtons.length);
      allButtons.forEach((btn, i) => {
        const ariaLabel = btn.getAttribute('aria-label');
        const dataPurpose = btn.getAttribute('data-purpose');
        const className = btn.className;
        const textContent = btn.textContent?.trim();
        if (ariaLabel || dataPurpose || textContent) {
          console.log(`🎯 Button ${i}: aria-label="${ariaLabel}", data-purpose="${dataPurpose}", class="${className}", text="${textContent}"`);
        }
      });
      
      // Also check for any elements that might be transcript-related
      const transcriptElements = document.querySelectorAll('[class*="transcript"], [class*="captions"], [class*="subtitles"], [class*="cc"]');
      console.log('🎯 Transcript-related elements found:', transcriptElements.length);
      transcriptElements.forEach((el, i) => {
        const className = el.className;
        const textContent = el.textContent?.trim().substring(0, 50);
        console.log(`🎯 Transcript element ${i}: class="${className}", text="${textContent}..."`);
      });
      
      // Keep mouse hovering to maintain control visibility throughout extraction
      const keepHoverActive = async () => {
        if (videoContainer) {
          const hoverEvent = new MouseEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: 400 + Math.random() * 50, // Slight variation to keep it "alive"
            clientY: 300 + Math.random() * 50
          });
          videoContainer.dispatchEvent(hoverEvent);
        }
      };
      
      // Set up periodic hover events to keep controls visible
      let hoverInterval: NodeJS.Timeout | undefined = setInterval(keepHoverActive, 1000); // Every 1 second
      this.cleanupIntervals.push(hoverInterval); // Track for cleanup
      
      // Method 1: Try sidebar transcript panel (current UI)
      console.log('🎯 Method 1: Trying sidebar transcript panel...');
      let transcriptPanel = document.querySelector(SELECTORS.TRANSCRIPT_PANEL);
      console.log('🎯 Initial transcript panel found:', !!transcriptPanel);
 
      let transcriptParts: string[] = [];
      
      if (transcriptPanel) {
        // Try multiple approaches to find transcript entries
        const entrySelectors = [
          '[data-purpose="transcript-cue"]',
          '.transcript--cue-container--Vuwj6',
          '.transcript--underline-cue---xybZ',
          '.transcript-cue',
          '[data-timestamp]',
          '.timestamp-item',
          '.transcript-line',
          'div[role="button"]', // New Udemy UI uses divs with role="button"
          'button[data-purpose*="transcript"]'
        ];
        
        let transcriptEntries: NodeListOf<Element> | null = null;
        let usedSelector = '';
        
        for (const selector of entrySelectors) {
          transcriptEntries = transcriptPanel.querySelectorAll(selector);
          if (transcriptEntries.length > 0) {
            usedSelector = selector;
            break;
          }
        }
        
        console.log('🎯 Found transcript entries in panel:', transcriptEntries?.length || 0, 'using selector:', usedSelector);
        
        if (transcriptEntries && transcriptEntries.length > 0) {
          // SIMPLIFIED: Just filter out empty or meaningless content
          transcriptEntries.forEach((entry, index) => {
            // Get the full text content of the entry
            const fullText = entry.textContent?.trim() || '';
            
            // Skip empty, placeholder, or very short text
            if (!fullText || fullText === '...' || fullText.length < 3) {
              console.log(`🎯 Skipping entry ${index}: too short or empty`);
              return;
            }
            
            // Try to extract timestamp from the beginning (format: MM:SS or HH:MM:SS)
            const timestampMatch = fullText.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*(.*)/);
            let timestamp = '';
            let text = fullText;
            
            if (timestampMatch) {
              timestamp = timestampMatch[1];
              text = timestampMatch[2];
            }
            
            console.log(`🎯 Entry ${index}: timestamp="${timestamp}", text="${text.substring(0, 50)}..."`);
            
            // Only add if text is meaningful (not just punctuation or numbers)
            if (text && text.length > 3 && /[a-zA-Z]/.test(text)) {
              transcriptParts.push(`[${timestamp}] ${text}`);
            } else {
              console.log(`🎯 Skipping entry ${index}: no meaningful text`);
            }
          });
        }
      }

      // Method 2: Try HTML5 text tracks (new UI) if panel is empty
      if (transcriptParts.length === 0) {
        console.log('🎯 Method 2: No entries in transcript panel. Trying HTML5 text tracks...');
        const trackLines = await this.extractFromTextTracks();
        if (trackLines.length > 0) {
          transcriptParts = trackLines;
          console.log('🎯 Successfully extracted from HTML5 text tracks!');
        }
      }

      console.log('🎯 Total transcript parts:', transcriptParts.length);
      
      // Clean up the hover interval
      clearInterval(hoverInterval);
      // Remove from tracking array
      this.cleanupIntervals = this.cleanupIntervals.filter(interval => interval !== hoverInterval);
      
      if (transcriptParts.length === 0) {
        throw new Error('No transcript content extracted - video may not have captions');
      }

      return transcriptParts.join('\n\n');
    } catch (error) {
      console.error('Error extracting transcript:', error);
      throw new Error(`Failed to extract transcript: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fallback extraction via HTML5 text tracks (new UI method)
   */
  private static async extractFromTextTracks(): Promise<string[]> {
    const lines: string[] = [];
    try {
      const video = document.querySelector(SELECTORS.VIDEO) as HTMLVideoElement | null;
      if (!video) {
        console.log('🎯 No <video> element found for textTracks fallback');
        return lines;
      }

      console.log('🎯 Video element found, checking textTracks...');
      
      // Check if textTracks exist
      const tracks = Array.from(video.textTracks || []);
      console.log('🎯 Total textTracks found:', tracks.length);
      
      if (!tracks.length) {
        console.log('🎯 No textTracks found on video');
        return lines;
      }

      // Log all available tracks
      tracks.forEach((track, i) => {
        console.log(`🎯 Track ${i}: kind="${track.kind}", label="${track.label}", mode="${track.mode}", language="${track.language}"`);
      });

      // Try to find the best track (prefer captions/subtitles, then any available)
      let preferredTrack = tracks.find(t => t.kind === 'captions') || 
                          tracks.find(t => t.kind === 'subtitles') || 
                          tracks[0];
      
      console.log(`🎯 Using track: kind="${preferredTrack.kind}", label="${preferredTrack.label}"`);

      // Set track to showing mode to ensure cues are loaded
      preferredTrack.mode = 'showing';
      
      // Wait for cues to populate (Udemy might need time to load)
      await new Promise(res => setTimeout(res, 1000));

      // Check if cues are available
      if (!preferredTrack.cues || preferredTrack.cues.length === 0) {
        console.log('🎯 No cues found in track, trying to wait longer...');
        await new Promise(res => setTimeout(res, 2000));
      }

      const cues = preferredTrack.cues ? Array.from(preferredTrack.cues as any) as TextTrackCue[] : [];
      console.log('🎯 Found cues in textTracks:', cues.length);
      
      if (cues.length === 0) {
        console.log('🎯 No cues available in textTracks');
        return lines;
      }

      // Extract text from cues
      cues.forEach((cue: any, index) => {
        const start = this.formatTime(cue.startTime || 0);
        const end = this.formatTime(cue.endTime || 0);
        const text = (cue.text || '').replace(/\s+/g, ' ').trim();
        
        console.log(`🎯 Cue ${index}: [${start}-${end}] "${text.substring(0, 50)}..."`);
        
        if (text) {
          lines.push(`[${start}] ${text}`);
        }
      });

      console.log('🎯 Successfully extracted', lines.length, 'lines from textTracks');
      
    } catch (err) {
      console.log('🎯 textTracks fallback failed:', err);
    }
    return lines;
  }

  /**
   * Ensure transcript/captions are active for the current video
   */
  private static async ensureTranscriptActive(): Promise<void> {
    console.log('🎯 Ensuring transcript/captions are active...');
    
    // DO NOT confuse captions display with transcript panel
    console.log('🎯 Checking for actual transcript panel (not live captions display)...');
    
    // Check ONLY for the actual transcript panel, not captions display
    const actualTranscriptPanel = document.querySelector('[data-purpose="transcript-panel"]');
    
    if (actualTranscriptPanel && (actualTranscriptPanel as HTMLElement).offsetParent !== null) {
      // Check if this panel has transcript entries
      const hasTranscriptEntries = actualTranscriptPanel.querySelector('[data-purpose="transcript-cue"]');
      
      if (hasTranscriptEntries) {
        console.log(`🎯 Real transcript panel found with entries - skipping button click`);
        return;
      }
    }
    
    console.log(`🎯 No real transcript panel found - will click transcript button to open it`);
    
    // First, simulate mouse hover over the video area to make controls visible
    console.log('🎯 Simulating mouse hover over video area to show controls...');
    const videoContainer = document.querySelector('.video-viewer--video-viewer--0IkCW') || 
                          document.querySelector('[data-purpose="video-display"]') ||
                          document.querySelector('.video-js') ||
                          document.querySelector('video');
    
    if (videoContainer) {
      // Simulate mouse enter events to show controls
      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: 400,
        clientY: 300
      });
      
      const mouseMoveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: 400,
        clientY: 300
      });
      
      const mouseOverEvent = new MouseEvent('mouseover', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: 400,
        clientY: 300
      });
      
      console.log('🎯 Dispatching hover events on video container...');
      videoContainer.dispatchEvent(mouseEnterEvent);
      videoContainer.dispatchEvent(mouseMoveEvent);
      videoContainer.dispatchEvent(mouseOverEvent);
      
      // Wait for controls to appear
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('🎯 Video container not found for hover simulation');
    }
    
    // Now look for the transcript button
    const transcriptButton = document.querySelector(SELECTORS.TRANSCRIPT_BUTTON) as HTMLElement;
    
    if (transcriptButton) {
      console.log('🎯 Found transcript toggle button!');
      console.log('🎯 Button element:', transcriptButton);
      console.log('🎯 Button visible:', !!transcriptButton.offsetParent);
      console.log('🎯 Button disabled:', (transcriptButton as HTMLButtonElement).disabled);
      
      // Keep mouse hovering to maintain control visibility
      if (videoContainer) {
        const keepHoverEvent = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: 400,
          clientY: 300
        });
        videoContainer.dispatchEvent(keepHoverEvent);
      }
      
      // Click the button to open transcript
      console.log('🎯 Clicking transcript button to open transcript...');
      transcriptButton.click();
      
      // Also try triggering other events
      transcriptButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      transcriptButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      transcriptButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      // Wait for transcript panel to load while keeping controls visible
      console.log('🎯 Waiting for transcript panel to load...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Keep controls visible during the wait
      if (videoContainer) {
        const keepHoverEvent2 = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: 450,
          clientY: 350
        });
        videoContainer.dispatchEvent(keepHoverEvent2);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if transcript panel appeared
      let transcriptPanel = document.querySelector(SELECTORS.TRANSCRIPT_PANEL);
      if (transcriptPanel) {
        console.log('🎯 Transcript panel successfully opened!');
        return;
      }
      
      // If still no panel, wait a bit more
      console.log('🎯 Transcript panel not found yet, waiting more...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      transcriptPanel = document.querySelector(SELECTORS.TRANSCRIPT_PANEL);
      if (transcriptPanel) {
        console.log('🎯 Transcript panel found after additional wait!');
        return;
      }
      
      // Try multiple approaches to enable captions
      let captionsEnabled = false;
      
      // Approach 1: Click captions dropdown and select English
      const captionsDropdown = document.querySelector('[data-purpose="captions-dropdown-button"]');
      if (captionsDropdown) {
        console.log('🎯 Found captions dropdown, clicking to enable English captions...');
        (captionsDropdown as HTMLElement).click();
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Try to find and click English captions
        const englishButtons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(btn => 
          btn.textContent?.includes('English') && (btn.textContent?.includes('[Auto]') || btn.textContent?.includes('Auto'))
        );
        
        for (const englishButton of englishButtons) {
          console.log('🎯 Clicking English captions option:', englishButton.textContent);
          (englishButton as HTMLElement).click();
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if captions are now active
          const activeCaption = document.querySelector('.captions-display--captions-cue-text--TQ0DQ');
          if (activeCaption) {
            console.log('🎯 Captions successfully activated!');
            captionsEnabled = true;
            break;
          }
        }
        
        // Close dropdown if still open
        (captionsDropdown as HTMLElement).click();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Approach 2: If captions still not enabled, try video element text tracks
      if (!captionsEnabled) {
        console.log('🎯 Trying to enable captions via video textTracks...');
        const video = document.querySelector(SELECTORS.VIDEO) as HTMLVideoElement;
        if (video && video.textTracks) {
          for (let i = 0; i < video.textTracks.length; i++) {
            const track = video.textTracks[i];
            if (track.language === 'en' || track.label.includes('English') || track.label.includes('Auto')) {
              console.log('🎯 Enabling text track:', track.label);
              track.mode = 'showing';
              await new Promise(resolve => setTimeout(resolve, 1000));
              captionsEnabled = true;
              break;
            }
          }
        }
      }
      
      // Now check for transcript panel
      const panel = document.querySelector('.captions-display--captions-container--PqdGQ');
      if (panel) {
        console.log('🎯 Transcript panel found after clicking!');
      } else {
        console.log('🎯 Transcript panel still not populated after clicking');
      }
    } else {
      console.log('🎯 Transcript toggle button not found!');
    }
    
    // Fallback: try other methods only if no transcript panel is visible
    console.log('🎯 Trying fallback button detection...');
    const allButtons = document.querySelectorAll('button');
    
    for (let i = 0; i < allButtons.length; i++) {
      const button = allButtons[i];
      const dataPurpose = button.getAttribute('data-purpose');
      
      if (dataPurpose && (dataPurpose.includes('transcript') || dataPurpose.includes('captions'))) {
        console.log(`🎯 Trying button ${i} with data-purpose="${dataPurpose}"`);
        (button as HTMLElement).click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const panel = document.querySelector('.captions-display--captions-container--PqdGQ');
        if (panel && panel.textContent && panel.textContent.trim()) {
          console.log('🎯 Success! Panel populated after clicking button', i);
          break;
        }
      }
    }
    
    console.log('🎯 Finished ensuring transcript/captions are active');
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
   */
  static isTranscriptAvailable(): boolean {
    console.log('🎯 Checking transcript availability...');
    
    // Check for transcript button with multiple selectors
    const buttonSelectors = [
      'button[data-purpose="transcript-toggle"]',
      '[data-purpose="transcript-toggle"]',
      'button[aria-label*="transcript" i]',
      'button[aria-label*="captions" i]',
      'button[aria-label*="subtitles" i]',
      '.transcript-toggle',
      '.captions-button'
    ];
    
    let transcriptButton: Element | null = null;
    for (const selector of buttonSelectors) {
      const button = document.querySelector(selector);
      if (button && (button as HTMLElement).offsetParent !== null) {
        transcriptButton = button;
        console.log(`🎯 Transcript button found with selector: ${selector}`);
        break;
      }
    }
    
    // Check for existing transcript panel with multiple selectors
    const panelSelectors = [
      '[data-purpose="transcript-panel"]',
      '.transcript-panel',
      '[data-test="transcript-panel"]',
      '.captions-display--captions-container--PqdGQ'
    ];
    
    let transcriptPanel: Element | null = null;
    let hasTranscriptContent = false;
    for (const selector of panelSelectors) {
      const panel = document.querySelector(selector);
      if (panel && (panel as HTMLElement).offsetParent !== null) {
        transcriptPanel = panel;
        console.log(`🎯 Transcript panel found with selector: ${selector}`);
        
        // Check if panel has actual content
        const entries = panel.querySelectorAll('.transcript-entry, .captions-display--cue-text--TQ0DQ, [data-testid="transcript-entry"]');
        if (entries.length > 0) {
          hasTranscriptContent = true;
          console.log(`🎯 Transcript panel has ${entries.length} entries`);
        }
        break;
      }
    }
    
    // Check for video element with text tracks
    let hasValidTextTracks = false;
    const video = document.querySelector(SELECTORS.VIDEO) as HTMLVideoElement | null;
    if (video) {
      const tracks = Array.from(video.textTracks || []);
      console.log('🎯 Video text tracks found:', tracks.length);
      
      tracks.forEach((track, i) => {
        console.log(`🎯 Track ${i}: kind="${track.kind}", label="${track.label}", mode="${track.mode}"`);
        if ((track.kind === 'captions' || track.kind === 'subtitles') && track.cues && track.cues.length > 0) {
          hasValidTextTracks = true;
          console.log(`🎯 Track ${i} has ${track.cues.length} cues`);
        }
      });
    }
    
    // Check if captions are available in the dropdown
    let hasCaptionOptions = false;
    const captionButtons = Array.from(document.querySelectorAll('button'));
    const englishCaptions = captionButtons.find(btn => 
      btn.textContent && (
        btn.textContent.includes('English [Auto]') ||
        btn.textContent.includes('English [CC]') ||
        (btn.textContent.includes('English') && btn.textContent.includes('['))
      )
    );
    
    if (englishCaptions) {
      hasCaptionOptions = true;
      console.log('🎯 Found English caption option:', englishCaptions.textContent);
    }
    
    // Improved logic: transcript is available if we have:
    // 1. Actual content already visible, OR
    // 2. Valid text tracks ready, OR  
    // 3. Both a transcript button AND panel (means captions can be activated)
    const hasTranscriptInfrastructure = !!(transcriptButton && transcriptPanel);
    const hasTranscript = hasTranscriptContent || hasValidTextTracks || hasTranscriptInfrastructure;
    
    console.log('🎯 Transcript available:', hasTranscript, {
      hasTranscriptContent,
      hasValidTextTracks,
      hasTranscriptInfrastructure,
      hasCaptionOptions,
      hasButton: !!transcriptButton,
      hasPanel: !!transcriptPanel
    });
    
    return hasTranscript;
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
