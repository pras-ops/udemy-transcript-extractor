// Extension Service for communicating with content script
import { UdemyCourse } from './udemy-extractor';

export interface ExtensionServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ExtensionService {
  /**
   * Send message to content script and get response
   */
  private static async sendMessage<T>(message: any): Promise<ExtensionServiceResponse<T>> {
    try {
      // Check if we're in a browser extension context
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        throw new Error('Extension APIs not available');
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        throw new Error('No active tab found');
      }

      console.log('🎯 Sending message to tab:', tab.id, 'Message:', message);
      
      try {
        const response = await chrome.tabs.sendMessage(tab.id, message);
        console.log('🎯 Received response:', response);
        return response;
      } catch (connectionError) {
        // If connection fails, try to inject content script and retry
        if (connectionError.message?.includes('Receiving end does not exist')) {
          console.log('🎯 Content script not found, attempting to inject...');
          
          try {
            // Inject the content script
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content-script.js']
            });
            
            console.log('🎯 Content script injected, waiting for initialization...');
            // Wait a moment for the script to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Retry the message
            console.log('🎯 Retrying message after content script injection...');
            const response = await chrome.tabs.sendMessage(tab.id, message);
            console.log('🎯 Received response after injection:', response);
            return response;
          } catch (injectionError) {
            console.error('🎯 Failed to inject content script:', injectionError);
            throw new Error('Failed to connect to page. Please refresh the page and try again.');
          }
        } else {
          throw connectionError;
        }
      }
    } catch (error) {
      console.error('Error sending message to content script:', error);
      return {
        success: false,
        error: error.message || 'Extension communication failed'
      };
    }
  }

  /**
   * Check if current page supports transcript extraction
   */
  static async checkAvailability(): Promise<ExtensionServiceResponse<{
    platform: string;
    hasTranscript: boolean;
    isCoursePage: boolean;
  }>> {
    return this.sendMessage({ type: 'CHECK_AVAILABILITY' });
  }

  /**
   * Extract course structure from current page
   */
  static async extractCourseStructure(): Promise<ExtensionServiceResponse<UdemyCourse>> {
    return this.sendMessage({ type: 'EXTRACT_COURSE_STRUCTURE' });
  }

  /**
   * Extract transcript from current video
   */
  static async extractTranscript(): Promise<ExtensionServiceResponse<string>> {
    return this.sendMessage({ type: 'EXTRACT_TRANSCRIPT' });
  }

  /**
   * Get current video information
   */
  static async getVideoInfo(): Promise<ExtensionServiceResponse<{
    title: string;
    duration: string;
  }>> {
    return this.sendMessage({ type: 'GET_VIDEO_INFO' });
  }

  /**
   * Copy text to clipboard
   */
  static async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  }

  /**
   * Download file with given content
   */
  static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Format transcript for different export types
   */
  static formatTranscript(transcript: string, format: 'markdown' | 'txt' | 'json', includeTimestamps: boolean = true): string {
    switch (format) {
      case 'markdown':
        return this.formatAsMarkdown(transcript, includeTimestamps);
      case 'json':
        return this.formatAsJSON(transcript, includeTimestamps);
      case 'txt':
      default:
        return this.formatAsText(transcript, includeTimestamps);
    }
  }

  private static formatAsMarkdown(transcript: string, includeTimestamps: boolean): string {
    const lines = transcript.split('\n\n');
    const formattedLines = lines.map(line => {
      if (includeTimestamps) {
        return `- ${line}`;
      } else {
        // Remove timestamp from line
        const textOnly = line.replace(/^\[[^\]]+\]\s*/, '');
        return `- ${textOnly}`;
      }
    });
    
    return `# Transcript\n\n${formattedLines.join('\n')}`;
  }

  private static formatAsJSON(transcript: string, includeTimestamps: boolean): string {
    const lines = transcript.split('\n\n');
    const entries = lines.map(line => {
      if (includeTimestamps) {
        const match = line.match(/^\[([^\]]+)\]\s*(.+)$/);
        if (match) {
          return {
            timestamp: match[1],
            text: match[2]
          };
        }
      }
      return {
        text: line.replace(/^\[[^\]]+\]\s*/, '')
      };
    });
    
    return JSON.stringify({ entries }, null, 2);
  }

  private static formatAsText(transcript: string, includeTimestamps: boolean): string {
    if (includeTimestamps) {
      return transcript;
    } else {
      // Remove timestamps
      return transcript.replace(/^\[[^\]]+\]\s*/gm, '');
    }
  }

  /**
   * Generate filename for download
   */
  static generateFilename(videoTitle: string, format: string): string {
    const sanitizedTitle = videoTitle
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    return `${sanitizedTitle}_${timestamp}.${format}`;
  }

  /**
   * Get MIME type for format
   */
  static getMimeType(format: string): string {
    switch (format) {
      case 'markdown':
      case 'txt':
        return 'text/plain';
      case 'json':
        return 'application/json';
      default:
        return 'text/plain';
    }
  }
}
