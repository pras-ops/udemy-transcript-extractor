// Content Script for Transcript Extractor Extension - v3.0.0
// This script runs in the context of web pages

// Import extractors - these will be bundled into the content script
import { UdemyExtractor } from './udemy-extractor';
import { YouTubeExtractor } from './youtube-extractor';
import { CourseraExtractor } from './coursera-extractor';

// Chrome extension types
declare const chrome: any;

// Fallback: if imports fail, create minimal extractors
if (typeof UdemyExtractor === 'undefined') {
  console.error('🎯 UdemyExtractor import failed, creating fallback');
}
if (typeof YouTubeExtractor === 'undefined') {
  console.error('🎯 YouTubeExtractor import failed, creating fallback');
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    transcriptExtractorContentScript?: ContentScript;
    transcriptExtractorPopup?: {
      handleMessage: (message: any) => void;
    };
  }
}

// Message types for communication with popup
export interface ContentScriptMessage {
  type: 'EXTRACT_COURSE_STRUCTURE' | 'EXTRACT_TRANSCRIPT' | 'GET_VIDEO_INFO' | 'CHECK_AVAILABILITY' | 'START_BATCH_COLLECTION' | 'NAVIGATE_TO_NEXT_LECTURE' | 'COLLECT_CURRENT_TRANSCRIPT' | 'EXPORT_BATCH_TRANSCRIPTS' | 'TEST_COURSE_STRUCTURE';
  data?: any;
}

export interface ContentScriptResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class ContentScript {
  private isInitialized = false;
  private batchState: {
    isActive: boolean;
    lectureIds: string[];
    currentIndex: number;
    collectedTranscripts: {[lectureId: string]: string};
    progress: {[lectureId: string]: 'pending' | 'collecting' | 'completed' | 'failed' | 'skipped'};
  } = {
    isActive: false,
    lectureIds: [],
    currentIndex: 0,
    collectedTranscripts: {},
    progress: {}
  };

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      if (this.isInitialized) return;
      
      console.log('🎯 Initializing NEW Content Script v3.0.0...');
      
      // Listen for messages from popup and background
      chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
        try {
          console.log('🎯 Content script received message:', message);
          
          // Service Worker pattern - no AI message forwarding needed
          // AI summarization is handled directly via ExtensionService.summarizeWithAI()
          
          // Handle other messages (extraction, etc.)
          this.handleMessage(message, sendResponse);
          return true; // Keep message channel open for async response
        } catch (error) {
          console.error('Error handling message:', error);
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          return true;
        }
      });

      this.isInitialized = true;
      console.log('🎯 NEW Transcript Extractor Content Script v3.0.0 initialized on:', window.location.href);
      console.log('🎯 NEW Content script ready to receive messages');
      
      // Override any existing content script
      window.transcriptExtractorContentScript = this;
    } catch (error) {
      console.error('Error initializing content script:', error);
    }
  }

  private async handleMessage(message: ContentScriptMessage, sendResponse: (response: ContentScriptResponse) => void) {
    try {
      
      switch (message.type) {
        case 'EXTRACT_COURSE_STRUCTURE': {
          const courseStructure = await this.extractCourseStructure();
          sendResponse({ success: true, data: courseStructure });
          break;
        }

        case 'EXTRACT_TRANSCRIPT': {
          const transcript = await this.extractTranscript();
          sendResponse({ success: true, data: transcript });
          break;
        }

        case 'TEST_COURSE_STRUCTURE': {
          UdemyExtractor.testCourseStructureSelectors();
          sendResponse({ success: true, data: 'Course structure testing completed - check console' });
          break;
        }

        case 'GET_VIDEO_INFO': {
          const videoInfo = this.getVideoInfo();
          sendResponse({ success: true, data: videoInfo });
          break;
        }

        case 'CHECK_AVAILABILITY': {
          const availability = this.checkAvailability();
          sendResponse({ success: true, data: availability });
          break;
        }

        case 'START_BATCH_COLLECTION': {
          await this.startBatchCollection(message.data?.lectureIds || []);
          sendResponse({ success: true });
          break;
        }

        case 'NAVIGATE_TO_NEXT_LECTURE': {
          const navigationResult = await this.navigateToNextLecture();
          sendResponse({ success: true, data: navigationResult });
          break;
        }

        case 'COLLECT_CURRENT_TRANSCRIPT': {
          const collectionResult = await this.collectCurrentTranscript();
          sendResponse({ success: true, data: collectionResult });
          break;
        }

        case 'EXPORT_BATCH_TRANSCRIPTS': {
          const exportResult = await this.exportBatchTranscripts(message.data?.format || 'txt');
          sendResponse({ success: true, data: exportResult });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async extractCourseStructure() {
    if (UdemyExtractor.isUdemyCoursePage()) {
      return UdemyExtractor.extractCourseStructure();
    }
    
    if (YouTubeExtractor.isYouTubeVideoPage()) {
      // Try to extract playlist first
      const playlist = YouTubeExtractor.extractPlaylist();
      if (playlist && playlist.videos.length > 0) {
        
        // Convert playlist to course structure format
        const lectures = playlist.videos.map(video => ({
          id: video.videoId,
          title: video.title,
          url: video.url,
          isCompleted: false,
          duration: video.duration || 'Unknown',
          isCurrentVideo: video.isCurrentVideo
        }));

        // Find current video
        const currentVideo = playlist.videos.find(video => video.isCurrentVideo) || playlist.videos[0];
        
        return {
          title: playlist.title,
          instructor: 'YouTube Creator',
          sections: [{
            title: 'Playlist Videos',
            lectures: lectures
          }],
          currentLecture: {
            id: currentVideo.videoId,
            title: currentVideo.title,
            url: currentVideo.url,
            isCompleted: false,
            duration: currentVideo.duration || 'Unknown'
          }
        };
      }
      
      // Fallback: if no playlist found, return single video structure
      const videoInfo = YouTubeExtractor.getCurrentVideoInfo();
      if (videoInfo) {
        return {
          title: videoInfo.title,
          instructor: 'YouTube Creator',
          sections: [{
            title: 'Video',
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
      }
    }
    
    if (CourseraExtractor.isCourseraCoursePage()) {
      return CourseraExtractor.extractCourseStructure();
    }
    
    throw new Error('Unsupported platform');
  }

  private async extractTranscript() {
    
    const isUdemy = UdemyExtractor.isUdemyCoursePage();
    const isYouTube = YouTubeExtractor.isYouTubeVideoPage();
    const isCoursera = CourseraExtractor.isCourseraCoursePage();
    
    if (isUdemy) {
      try {
        const result = await UdemyExtractor.extractTranscript();
        
        // Don't auto-copy to clipboard to prevent popup from closing
        // User can manually export if needed
        
        return result;
      } catch (error) {
        console.error('Udemy extractor error:', error);
        throw error;
      }
    }
    
    if (isYouTube) {
      try {
        const result = await YouTubeExtractor.extractTranscript();
        
        // Don't auto-copy to clipboard to prevent popup from closing
        // User can manually export if needed
        
        return result;
      } catch (error) {
        console.error('YouTube extractor error:', error);
        throw error;
      }
    }
    
    if (isCoursera) {
      try {
        const result = await CourseraExtractor.extractTranscript();
        
        // Don't auto-copy to clipboard to prevent popup from closing
        // User can manually export if needed
        
        return result;
      } catch (error) {
        console.error('Coursera extractor error:', error);
        throw error;
      }
    }
    
    throw new Error('Unsupported platform');
  }

  private getVideoInfo() {
    if (UdemyExtractor.isUdemyCoursePage()) {
      return UdemyExtractor.getCurrentVideoInfo();
    }
    
    if (YouTubeExtractor.isYouTubeVideoPage()) {
      return YouTubeExtractor.getCurrentVideoInfo();
    }
    
    if (CourseraExtractor.isCourseraCoursePage()) {
      return CourseraExtractor.getCurrentVideoInfo();
    }
    
    return null;
  }

  private checkAvailability() {
    
    const isUdemy = UdemyExtractor.isUdemyCoursePage();
    
    if (isUdemy) {
      return {
        platform: 'udemy',
        hasTranscript: UdemyExtractor.isTranscriptAvailable(),
        isCoursePage: true
      };
    }
    
    const isYouTube = YouTubeExtractor.isYouTubeVideoPage();
    
    if (isYouTube) {
      return {
        platform: 'youtube',
        hasTranscript: YouTubeExtractor.isTranscriptAvailable(),
        isCoursePage: true
      };
    }
    
    const isCoursera = CourseraExtractor.isCourseraCoursePage();
    
    if (isCoursera) {
      return {
        platform: 'coursera',
        hasTranscript: CourseraExtractor.isTranscriptAvailable(),
        isCoursePage: true
      };
    }
    
    return {
      platform: 'unknown',
      hasTranscript: false,
      isCoursePage: false
    };
  }

  // Batch collection methods
  private async startBatchCollection(lectureIds: string[]) {
    console.log('🎯 Starting batch collection for', lectureIds.length, 'lectures');
    
    this.batchState = {
      isActive: true,
      lectureIds: [...lectureIds],
      currentIndex: 0,
      collectedTranscripts: {},
      progress: {}
    };
    
    // Initialize progress for all lectures
    lectureIds.forEach(id => {
      this.batchState.progress[id] = 'pending';
    });
    
    console.log('🎯 Batch collection initialized:', this.batchState);
  }

  private async navigateToNextLecture(): Promise<boolean> {
    try {
      console.log('🎯 Attempting to navigate to next lecture using Udemy\'s Next button...');
      
      // Find Udemy's built-in "Next" button using multiple approaches
      let nextButton: Element | null = null;
      
      // Approach 1: Try specific selectors
      const selectors = [
        '[data-purpose="go-to-next"]',
        '#go-to-next-item',
        '.next-and-previous--next--8Avih',
        '.next-and-previous--button---fNLz.next-and-previous--next--8Avih'
      ];
      
      for (const selector of selectors) {
        const button = document.querySelector(selector);
        if (button && (button as HTMLElement).offsetParent !== null) { // visible check
          nextButton = button;
          console.log('🎯 Found Next button with selector:', selector);
          break;
        }
      }
      
      // Approach 2: If not found, look for buttons with "next" text or aria-label
      if (!nextButton) {
        const allButtons = document.querySelectorAll('button, [role="button"], .ud-btn');
        for (const button of allButtons) {
          const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
          const textContent = button.textContent?.toLowerCase() || '';
          
          if ((ariaLabel.includes('next') || textContent.includes('next')) && 
              (button as HTMLElement).offsetParent !== null) { // visible check
            nextButton = button;
            console.log('🎯 Found Next button by text/aria-label:', button);
            break;
          }
        }
      }
      
      if (!nextButton) {
        console.log('🎯 No Udemy Next button found');
        return false;
      }

      console.log('🎯 Found Udemy Next button:', nextButton);
      
      // Check if the button is enabled (not disabled)
      const isDisabled = nextButton.hasAttribute('disabled') || 
                        nextButton.classList.contains('disabled') ||
                        nextButton.getAttribute('aria-disabled') === 'true';
      
      if (isDisabled) {
        console.log('🎯 Next button is disabled - reached end of course');
        return false;
      }

      // Store initial state
      const initialUrl = window.location.href;
      const initialLectureId = this.getCurrentLectureId();
      
      // Click the Next button with minimal interference to prevent popup closing
      console.log('🎯 Clicking Next button...');
      
      // Method 1: Direct click (most reliable)
      (nextButton as HTMLElement).click();
      
      // Method 2: Dispatch click event (backup for SPAs)
      nextButton.dispatchEvent(new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      }));
      
      // Give a moment for the click to register (minimal delay)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Wait for navigation to complete with dynamic timing
      await this.waitForLectureChange(3000); // Reduced timeout with faster detection
      
      // Verify that navigation actually happened
      const finalUrl = window.location.href;
      const finalLectureId = this.getCurrentLectureId();
      
      if (finalUrl === initialUrl && finalLectureId === initialLectureId) {
        console.log('🎯 Navigation failed - URL and lecture ID unchanged');
        return false;
      }
      
      console.log('🎯 Navigation completed successfully using Udemy Next button');
      console.log('🎯 URL changed from:', initialUrl, 'to:', finalUrl);
      console.log('🎯 Lecture ID changed from:', initialLectureId, 'to:', finalLectureId);
      return true;
    } catch (error) {
      console.error('🎯 Failed to navigate to next lecture:', error);
      return false;
    }
  }

  private async waitForLectureChange(timeout = 10000): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const initialUrl = window.location.href;
      const initialLectureId = this.getCurrentLectureId();
      
      console.log('🎯 Waiting for lecture change. Initial URL:', initialUrl, 'Initial lecture ID:', initialLectureId);
      
      const checkForChange = () => {
        const currentUrl = window.location.href;
        const currentLectureId = this.getCurrentLectureId();
        
        // Check if URL changed (most reliable for SPA navigation)
        if (currentUrl !== initialUrl) {
          console.log('🎯 URL change detected:', currentUrl);
          resolve();
          return;
        }
        
        // Check if lecture ID changed (backup method)
        if (currentLectureId !== initialLectureId && currentLectureId !== 'unknown') {
          console.log('🎯 Lecture ID change detected:', initialLectureId, '->', currentLectureId);
          resolve();
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          console.log('🎯 Timeout waiting for lecture change. Current URL:', currentUrl, 'Current lecture ID:', currentLectureId);
          resolve();
          return;
        }
        
        setTimeout(checkForChange, 100); // Reduced from 200ms to 100ms for faster detection
      };
      
      checkForChange();
    });
  }

  private async collectCurrentTranscript(): Promise<{lectureId: string; transcript: string}> {
    try {
      // Get current lecture ID from URL
      const lectureId = this.getCurrentLectureId();
      console.log('🎯 Collecting transcript for lecture:', lectureId);
      
      // Memory management check for batch processing
      if (this.batchState.isActive) {
        // Add delay between batch operations to prevent memory buildup
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('🧹 ContentScript: Added delay for batch processing memory management');
      }
      
      // Quick check if page is ready for collection
      const isPageReady = UdemyExtractor.isPageReadyForCollection();
      console.log('🎯 Page ready for collection:', isPageReady);
      
      // Check if transcript is available first
      const isAvailable = await UdemyExtractor.isTranscriptAvailable();
      console.log('🎯 Transcript availability check result:', isAvailable);
      
      if (!isAvailable) {
        console.log('🎯 No transcript available for lecture:', lectureId, '- Skipping');
        // Store as skipped
        this.batchState.collectedTranscripts[lectureId] = 'NO_TRANSCRIPT_AVAILABLE';
        this.batchState.progress[lectureId] = 'skipped';
        
        return { lectureId, transcript: 'NO_TRANSCRIPT_AVAILABLE' };
      }
      
      console.log('🎯 Transcript is available, proceeding with extraction...');
      
      // Extract transcript
      let transcript = await this.extractTranscript();
      console.log('🎯 Extract transcript result:', transcript ? `Length: ${transcript.length} chars` : 'null/empty');
      
      if (transcript && transcript.trim().length > 0) {
        console.log('🎯 Transcript extracted successfully, length:', transcript.length);
        console.log('🎯 First 200 chars of transcript:', transcript.substring(0, 200));
        
        // Memory optimization for batch processing
        if (this.batchState.isActive && transcript.length > 30000) {
          console.log('🧹 ContentScript: Large transcript detected, optimizing for batch processing...');
          // Truncate very long transcripts to prevent memory issues
          transcript = transcript.substring(0, 30000) + '... [truncated for batch processing]';
        }
        
        // Store in batch state
        this.batchState.collectedTranscripts[lectureId] = transcript;
        this.batchState.progress[lectureId] = 'completed';
        
        // Note: Clipboard copying is now handled by the popup to prevent conflicts
        console.log('🎯 Transcript collected successfully - clipboard will be handled by popup');
        
        console.log('🎯 Successfully collected transcript for lecture:', lectureId);
        return { lectureId, transcript };
      } else {
        console.log('🎯 No transcript extracted or transcript is empty');
        throw new Error('No transcript extracted or transcript is empty');
      }
    } catch (error) {
      const lectureId = this.getCurrentLectureId();
      console.error('🎯 Failed to collect transcript:', error instanceof Error ? error.message : String(error));
      
      // Store as failed
      this.batchState.collectedTranscripts[lectureId] = 'EXTRACTION_FAILED';
      this.batchState.progress[lectureId] = 'failed';
      
      return { lectureId, transcript: 'EXTRACTION_FAILED' };
    }
  }

  private async copyToClipboard(text: string): Promise<boolean> {
    try {
      console.log('🎯 Copying to clipboard, text length:', text.length);
      
      // Method 1: Modern Clipboard API (try without clearing first)
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          console.log('🎯 Successfully copied to clipboard using modern API');
          return true;
        } catch (error) {
          console.log('🎯 Modern clipboard API failed:', error instanceof Error ? error.message : String(error));
        }
      }
    } catch (error) {
      console.log('🎯 Modern clipboard API failed, trying fallback...');
    }

    try {
      // Method 2: Legacy execCommand with improved focus handling
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;z-index:9999;pointer-events:none;';
      document.body.appendChild(textarea);
      
      // Try to focus the document first
      if (document.hasFocus && !document.hasFocus()) {
        window.focus();
      }
      
      // Focus the textarea and select text
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      
      // Try to copy
      const success = document.execCommand('copy');
      
      // Clean up
      document.body.removeChild(textarea);
      
      if (success) {
        console.log('🎯 Fallback clipboard copy successful');
        return true;
      } else {
        console.log('🎯 Fallback clipboard copy failed');
        return false;
      }
    } catch (error) {
      console.error('🎯 All clipboard methods failed:', error);
      return false;
    }
  }

  private getCurrentLectureId(): string {
    // Extract lecture ID from URL
    const match = window.location.pathname.match(/\/learn\/lecture\/(\d+)/);
    return match ? match[1] : 'unknown';
  }

  private async exportBatchTranscripts(format: 'markdown' | 'txt' | 'json'): Promise<string> {
    const transcripts = Object.entries(this.batchState.collectedTranscripts);
    
    if (transcripts.length === 0) {
      return 'No transcripts collected';
    }

    switch (format) {
      case 'markdown':
        return this.formatBatchAsMarkdown(transcripts);
      case 'json':
        return this.formatBatchAsJSON(transcripts);
      case 'txt':
      default:
        return this.formatBatchAsText(transcripts);
    }
  }

  private formatBatchAsMarkdown(transcripts: [string, string][]): string {
    let markdown = '# Batch Transcript Collection\n\n';
    markdown += `**Collected:** ${transcripts.length} transcripts\n`;
    markdown += `**Date:** ${new Date().toISOString().slice(0, 10)}\n\n`;
    
    transcripts.forEach(([lectureId, transcript]) => {
      markdown += `## Lecture ${lectureId}\n\n`;
      markdown += transcript.split('\n\n').map(line => `- ${line}`).join('\n');
      markdown += '\n\n---\n\n';
    });
    
    return markdown;
  }

  private formatBatchAsJSON(transcripts: [string, string][]): string {
    const data = {
      metadata: {
        collected: transcripts.length,
        date: new Date().toISOString(),
        format: 'json'
      },
      transcripts: transcripts.map(([lectureId, transcript]) => ({
        lectureId,
        transcript: transcript.split('\n\n').map(line => {
          const match = line.match(/^\[([^\]]+)\]\s*(.+)$/);
          return match ? { timestamp: match[1], text: match[2] } : { text: line };
        })
      }))
    };
    
    return JSON.stringify(data, null, 2);
  }

  private formatBatchAsText(transcripts: [string, string][]): string {
    let text = `BATCH TRANSCRIPT COLLECTION\n`;
    text += `Collected: ${transcripts.length} transcripts\n`;
    text += `Date: ${new Date().toISOString().slice(0, 10)}\n\n`;
    
    transcripts.forEach(([lectureId, transcript]) => {
      text += `=== LECTURE ${lectureId} ===\n\n`;
      text += transcript;
      text += '\n\n---\n\n';
    });
    
    return text;
  }
}

// Prevent duplicate initialization
if (!window.transcriptExtractorContentScript) {
  console.log('🎯 Initializing NEW Content Script v3.0.0...');
  try {
    new ContentScript();
    console.log('🎯 Content Script initialization completed successfully');
  } catch (error) {
    console.error('🎯 Error during Content Script initialization:', error);
  }
} else {
  console.log('🎯 Content Script already initialized, skipping...');
}