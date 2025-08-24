// Content Script for Transcript Extractor Extension - v3.0.0
// This script runs in the context of web pages

console.log('🎯 NEW Content Script v3.0.0 starting to load...');
import { UdemyExtractor } from './udemy-extractor';

// Extend window interface for TypeScript
declare global {
  interface Window {
    transcriptExtractorContentScript?: ContentScript;
  }
}

// Message types for communication with popup
export interface ContentScriptMessage {
  type: 'EXTRACT_COURSE_STRUCTURE' | 'EXTRACT_TRANSCRIPT' | 'GET_VIDEO_INFO' | 'CHECK_AVAILABILITY';
  data?: any;
}

export interface ContentScriptResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class ContentScript {
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.isInitialized) return;
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message: ContentScriptMessage, sender, sendResponse) => {
      console.log('🎯 Content script received message:', message);
      this.handleMessage(message, sendResponse);
      return true; // Keep message channel open for async response
    });

    this.isInitialized = true;
    console.log('🎯 NEW Transcript Extractor Content Script v3.0.0 initialized on:', window.location.href);
    console.log('🎯 NEW Content script ready to receive messages');
    
    // Override any existing content script
    window.transcriptExtractorContentScript = this;
  }

  private async handleMessage(message: ContentScriptMessage, sendResponse: (response: ContentScriptResponse) => void) {
    try {
      switch (message.type) {
        case 'EXTRACT_COURSE_STRUCTURE':
          const courseStructure = await this.extractCourseStructure();
          sendResponse({ success: true, data: courseStructure });
          break;

        case 'EXTRACT_TRANSCRIPT':
          const transcript = await this.extractTranscript();
          sendResponse({ success: true, data: transcript });
          break;

        case 'GET_VIDEO_INFO':
          const videoInfo = this.getVideoInfo();
          sendResponse({ success: true, data: videoInfo });
          break;

        case 'CHECK_AVAILABILITY':
          const availability = this.checkAvailability();
          sendResponse({ success: true, data: availability });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  private async extractCourseStructure() {
    if (UdemyExtractor.isUdemyCoursePage()) {
      return UdemyExtractor.extractCourseStructure();
    }
    
    // Add support for other platforms here
    throw new Error('Unsupported platform');
  }

  private async extractTranscript() {
    if (UdemyExtractor.isUdemyCoursePage()) {
      return await UdemyExtractor.extractTranscript();
    }
    
    // Add support for other platforms here
    throw new Error('Unsupported platform');
  }

  private getVideoInfo() {
    if (UdemyExtractor.isUdemyCoursePage()) {
      return UdemyExtractor.getCurrentVideoInfo();
    }
    
    return null;
  }

  private checkAvailability() {
    if (UdemyExtractor.isUdemyCoursePage()) {
      return {
        platform: 'udemy',
        hasTranscript: UdemyExtractor.isTranscriptAvailable(),
        isCoursePage: true
      };
    }
    
    return {
      platform: 'unknown',
      hasTranscript: false,
      isCoursePage: false
    };
  }
}

// Prevent duplicate initialization
if (!window.transcriptExtractorContentScript) {
  console.log('🎯 Initializing NEW Content Script v3.0.0...');
  new ContentScript();
} else {
  console.log('🎯 Content Script already initialized, skipping...');
}
