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

export class UdemyExtractor {
  private static readonly SELECTORS = {
    // Course structure selectors
    SECTIONS: '[data-purpose^="section-panel"], .accordion-panel-module--panel--Eb0it',
    SECTION_TITLE: '.ud-accordion-panel-title, [data-purpose="section-heading"] h3',
    SECTION_DURATION: '[data-purpose="section-duration"]',
    LECTURES: '.curriculum-item-link--curriculum-item--OVP5S, [data-purpose^="curriculum-item"]',
    LECTURE_TITLE: '[data-purpose="item-title"]',
    LECTURE_DURATION: '.curriculum-item-link--metadata--XK804 span:last-child, .ud-text-xs span:last-child',
    CURRENT_LECTURE: '.curriculum-item-link--is-current--2mKk4, [aria-current="true"]',
    
    // Transcript selectors - Based on working Udemy transcript downloader
    TRANSCRIPT_BUTTON: 'button[data-purpose="transcript-toggle"], [data-purpose="transcript-toggle"], button:has-text("Transcript"), .transcript-toggle, [aria-label*="transcript" i], button[aria-label*="transcript" i]',
    TRANSCRIPT_PANEL: '[data-purpose="transcript-panel"], .transcript-panel, [data-test="transcript-panel"]',
    TRANSCRIPT_ENTRIES: '[data-purpose="transcript-cue"], .transcript-cue, [data-timestamp], .timestamp-item, .transcript-line, .transcript--cue-container--Vuwj6, .transcript--underline-cue---xybZ',
    TRANSCRIPT_TEXT: '[data-purpose="transcript-cue-text"], .transcript-cue-text, .transcript-text, .transcript--cue-container--Vuwj6, .transcript--underline-cue---xybZ',
    TRANSCRIPT_TIMESTAMP: '[data-purpose="transcript-cue-timestamp"], .transcript-cue-timestamp, .transcript-timestamp, [data-timestamp], .timestamp',
    
    // Video player selectors
    VIDEO_PLAYER: '.video-player--video-player--1dD8O, [data-purpose*="video-player"], video',
    VIDEO_TITLE: '.video-player--video-title--1dD8O, [data-purpose*="lecture-title"], h1',
    
    // Course info selectors
    COURSE_TITLE: 'h1[data-purpose="course-title"], h1.ud-heading-xl, h1',
    INSTRUCTOR_NAME: '[data-purpose="instructor-name"], .instructor-name'
  };

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
    const sectionElements = document.querySelectorAll(this.SELECTORS.SECTIONS);

    sectionElements.forEach((sectionEl, index) => {
      const title = this.extractSectionTitle(sectionEl);
      const duration = this.extractSectionDuration(sectionEl);
      const lectures = this.extractLectures(sectionEl);

      sections.push({
        id: `section-${index}`,
        title: title,
        duration: duration,
        lectures: lectures
      });
    });

    return sections;
  }

  /**
   * Extract section title
   */
  private static extractSectionTitle(sectionEl: Element): string {
    const titleEl = sectionEl.querySelector(this.SELECTORS.SECTION_TITLE);
    return titleEl?.textContent?.trim() || 'Untitled Section';
  }

  /**
   * Extract section duration
   */
  private static extractSectionDuration(sectionEl: Element): string {
    const durationEl = sectionEl.querySelector(this.SELECTORS.SECTION_DURATION);
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
    const lectureElements = sectionEl.querySelectorAll(this.SELECTORS.LECTURES);

    lectureElements.forEach((lectureEl, index) => {
      const title = this.extractLectureTitle(lectureEl);
      const duration = this.extractLectureDuration(lectureEl);
      const isCurrent = lectureEl.classList.contains('curriculum-item-link--is-current--2mKk4');

      lectures.push({
        id: `lecture-${index}`,
        title: title,
        duration: duration,
        isCurrent: isCurrent
      });
    });

    return lectures;
  }

  /**
   * Extract lecture title
   */
  private static extractLectureTitle(lectureEl: Element): string {
    const titleEl = lectureEl.querySelector(this.SELECTORS.LECTURE_TITLE);
    return titleEl?.textContent?.trim() || 'Untitled Lecture';
  }

  /**
   * Extract lecture duration
   */
  private static extractLectureDuration(lectureEl: Element): string {
    const durationEl = lectureEl.querySelector(this.SELECTORS.LECTURE_DURATION);
    return durationEl?.textContent?.trim() || '';
  }

  /**
   * Get current lecture
   */
  private static getCurrentLecture(): UdemyLecture | undefined {
    const currentEl = document.querySelector(this.SELECTORS.CURRENT_LECTURE);
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
    const titleEl = document.querySelector(this.SELECTORS.COURSE_TITLE);
    return titleEl?.textContent?.trim() || 'Untitled Course';
  }

  /**
   * Get instructor name
   */
  private static getInstructorName(): string {
    const instructorEl = document.querySelector(this.SELECTORS.INSTRUCTOR_NAME);
    return instructorEl?.textContent?.trim() || 'Unknown Instructor';
  }

  /**
   * Extract transcript for current video
   */
  static async extractTranscript(): Promise<string> {
    try {
      console.log('🎯 Starting transcript extraction...');
      
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
      
      // Method 1: Try sidebar transcript panel (old UI)
      console.log('🎯 Method 1: Trying sidebar transcript panel...');
      let transcriptPanel = document.querySelector(this.SELECTORS.TRANSCRIPT_PANEL);
      console.log('🎯 Initial transcript panel found:', !!transcriptPanel);
 
      let transcriptParts: string[] = [];
      
      if (transcriptPanel) {
        const transcriptEntries = transcriptPanel.querySelectorAll(this.SELECTORS.TRANSCRIPT_ENTRIES);
        console.log('🎯 Found transcript entries in panel:', transcriptEntries.length);
        
        if (transcriptEntries.length > 0) {
          transcriptEntries.forEach((entry, index) => {
            // Try to find separate timestamp and text elements first
            const timestampEl = entry.querySelector(this.SELECTORS.TRANSCRIPT_TIMESTAMP);
            const textEl = entry.querySelector(this.SELECTORS.TRANSCRIPT_TEXT);
            
            let timestamp = timestampEl?.textContent?.trim() || '';
            let text = textEl?.textContent?.trim() || '';
            
            // If no separate elements found, try to extract from the entry itself
            if (!text && entry.textContent) {
              const fullText = entry.textContent.trim();
              
              // Try to extract timestamp from the beginning (format: MM:SS or HH:MM:SS)
              const timestampMatch = fullText.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*(.*)/);
              if (timestampMatch) {
                timestamp = timestampMatch[1];
                text = timestampMatch[2];
              } else {
                // No timestamp found, use the full text
                text = fullText;
              }
            }
            
            console.log(`🎯 Entry ${index}: timestamp="${timestamp}", text="${text.substring(0, 50)}..."`);
            
            if (text && text !== '...') {
              transcriptParts.push(`[${timestamp}] ${text}`);
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
      
      if (transcriptParts.length === 0) {
        throw new Error('No transcript content extracted - video may not have captions');
      }

      return transcriptParts.join('\n\n');
    } catch (error) {
      console.error('Error extracting transcript:', error);
      throw new Error(`Failed to extract transcript: ${error.message}`);
    }
  }

  /**
   * Fallback extraction via HTML5 text tracks (new UI method)
   */
  private static async extractFromTextTracks(): Promise<string[]> {
    const lines: string[] = [];
    try {
      const video = document.querySelector('video') as HTMLVideoElement | null;
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
    
    // First, check if transcript panel is already visible and populated
    const existingPanel = document.querySelector('.captions-display--captions-container--PqdGQ');
    if (existingPanel && existingPanel.textContent && existingPanel.textContent.trim()) {
      console.log('🎯 Transcript panel already visible and populated - skipping button click');
      return;
    }
    
    // Check for other transcript panels that might already be visible
    const panelSelectors = [
      '[data-purpose="transcript-panel"]',
      '.transcript-panel',
      '[data-test="transcript-panel"]'
    ];
    
    for (const selector of panelSelectors) {
      const panel = document.querySelector(selector);
      if (panel && panel.offsetParent !== null && panel.textContent && panel.textContent.trim()) {
        console.log(`🎯 Transcript panel already visible with selector: ${selector} - skipping button click`);
        return;
      }
    }
    
    // If no transcript panel is visible, proceed with clicking the button
    const transcriptButton = document.querySelector('button[data-purpose="transcript-toggle"]') as HTMLElement;
    
    if (transcriptButton) {
      console.log('🎯 Found transcript toggle button!');
      console.log('🎯 Button element:', transcriptButton);
      console.log('🎯 Button visible:', !!transcriptButton.offsetParent);
      console.log('🎯 Button disabled:', transcriptButton.disabled);
      
      // Click the button to open transcript
      console.log('🎯 Clicking transcript button to open transcript...');
      transcriptButton.click();
      
      // Also try triggering other events
      transcriptButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      transcriptButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      transcriptButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      // Wait for captions to load
      console.log('🎯 Waiting for captions to load...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if captions dropdown appeared
      const captionsDropdown = document.querySelector('[data-purpose="captions-dropdown-button"]');
      if (captionsDropdown) {
        console.log('🎯 Found captions dropdown, clicking to enable English captions...');
        (captionsDropdown as HTMLElement).click();
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to find and click English captions
        const englishButton = Array.from(document.querySelectorAll('button')).find(btn => 
          btn.textContent?.includes('English') || btn.textContent?.includes('[Auto]') || btn.textContent?.includes('Auto')
        ) || 
        Array.from(document.querySelectorAll('[data-purpose]')).find(el => 
          el.textContent?.includes('English') || el.textContent?.includes('[Auto]')
        );
        
        if (englishButton) {
          console.log('🎯 Clicking English captions option...');
          (englishButton as HTMLElement).click();
          await new Promise(resolve => setTimeout(resolve, 1500));
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
    
    let transcriptButton = null;
    for (const selector of buttonSelectors) {
      const button = document.querySelector(selector);
      if (button && button.offsetParent !== null) {
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
    
    let transcriptPanel = null;
    for (const selector of panelSelectors) {
      const panel = document.querySelector(selector);
      if (panel && panel.offsetParent !== null) {
        transcriptPanel = panel;
        console.log(`🎯 Transcript panel found with selector: ${selector}`);
        break;
      }
    }
    
    // Check for video element with text tracks
    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (video) {
      const tracks = Array.from(video.textTracks || []);
      console.log('🎯 Video text tracks found:', tracks.length);
      tracks.forEach((track, i) => {
        console.log(`🎯 Track ${i}: kind="${track.kind}", label="${track.label}", mode="${track.mode}"`);
      });
    }
    
    // Return true if any of these are available
    const hasTranscript = transcriptButton !== null || transcriptPanel !== null || (video && video.textTracks && video.textTracks.length > 0);
    console.log('🎯 Transcript available:', hasTranscript);
    
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
      this.SELECTORS.VIDEO_TITLE,
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
