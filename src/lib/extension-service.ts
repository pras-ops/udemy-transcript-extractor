// Extension Service for communicating with content script
import { UdemyCourse } from './udemy-extractor';

export interface ExtensionServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ExtensionService {
  /**
   * Simple text sanitization to prevent XSS
   */
  private static sanitizeText(text: string): string {
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/javascript:/gi, '') // Remove javascript: links
      .trim();
  }

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
            console.log('🎯 Attempting to inject content script...');
            
            // Inject the content script
            const injectionResult = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content-script.js']
            });
            
            // Also try injecting the script directly if file injection fails
            if (!injectionResult || injectionResult.length === 0) {
              console.log('🎯 File injection failed, trying direct script injection...');
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                  // This will be executed in the page context
                  console.log('🎯 Direct script injection executed');
                }
              });
            }
            
            console.log('🎯 Content script injection result:', injectionResult);
            console.log('🎯 Content script injected, waiting for initialization...');
            
            // Wait a moment for the script to initialize
            await new Promise(resolve => setTimeout(resolve, 2000));
            
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
   * Test all selectors to find which ones work
   */
  static async testSelectors(): Promise<ExtensionServiceResponse<string>> {
    return this.sendMessage({ type: 'TEST_SELECTORS' });
  }

  static async testCourseStructure(): Promise<ExtensionServiceResponse<string>> {
    return this.sendMessage({ type: 'TEST_COURSE_STRUCTURE' });
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
  static formatTranscript(transcript: string, format: 'markdown' | 'txt' | 'json' | 'rag', includeTimestamps: boolean = true): string {
    // Sanitize input first
    const cleanTranscript = this.sanitizeText(transcript);
    
    switch (format) {
      case 'markdown':
        return this.formatAsMarkdown(cleanTranscript, includeTimestamps);
      case 'json':
        return this.formatAsJSON(cleanTranscript, includeTimestamps);
      case 'rag':
        return this.formatAsRAG(cleanTranscript, includeTimestamps);
      case 'txt':
      default:
        return this.formatAsText(cleanTranscript, includeTimestamps);
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

  private static formatAsRAG(transcript: string, includeTimestamps: boolean): string {
    const lines = transcript.split('\n\n');
    
    // Clean and merge lines into larger chunks (3-5 lines per chunk)
    const chunks: string[] = [];
    let currentChunk = '';
    let chunkCount = 0;
    const maxLinesPerChunk = 4; // Keep it simple - 4 lines per chunk
    
    lines.forEach((line, index) => {
      let text = line;
      let timestamp = '';
      
      if (includeTimestamps) {
        // Handle timestamp formats
        const timestampMatch = line.match(/^\[([^\]]*)\]\s*(.+)$/);
        if (timestampMatch) {
          const bracketContent = timestampMatch[1];
          text = timestampMatch[2];
          
          // Check if bracket content looks like a timestamp
          if (bracketContent && /^\d{1,2}:\d{2}(:\d{2})?$/.test(bracketContent)) {
            timestamp = bracketContent;
          } else {
            // Other content in brackets - treat as part of text
            text = line;
            timestamp = '';
          }
        } else {
          text = line;
          timestamp = '';
        }
      } else {
        // Remove any timestamp-like content from line
        text = line.replace(/^\[[^\]]*\]\s*/, '');
      }
      
      // Clean text (remove artifacts, extra spaces)
      text = text.trim().replace(/\s+/g, ' ');
      
      // Skip empty or very short lines
      if (!text || text.length < 10) return;
      
      // Add to current chunk
      if (currentChunk) {
        currentChunk += ' ' + text;
      } else {
        currentChunk = text;
      }
      
      // Create chunk when we have enough lines or reach end
      if ((index + 1) % maxLinesPerChunk === 0 || index === lines.length - 1) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          chunkCount++;
        }
        currentChunk = '';
      }
    });
    
    // Create simple RAG format with fewer, larger chunks
    const ragChunks = chunks.map((chunk, index) => ({
      id: `chunk_${index + 1}`,
      content: chunk,
      metadata: {
        chunk_index: index + 1,
        source: 'video_transcript',
        type: 'educational_content'
      }
    }));
    
    return JSON.stringify({
      document_type: 'video_transcript',
      total_chunks: ragChunks.length,
      chunks: ragChunks,
      metadata: {
        extraction_date: new Date().toISOString(),
        format_version: '2.0',
        rag_optimized: true,
        chunking_strategy: 'simple_merge'
      }
    }, null, 2);
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
      case 'rag':
        return 'application/json';
      default:
        return 'text/plain';
    }
  }

  /**
   * Start batch collection for multiple lectures
   */
  static async startBatchCollection(lectureIds: string[]): Promise<ExtensionServiceResponse<void>> {
    return this.sendMessage({ 
      type: 'START_BATCH_COLLECTION', 
      data: { lectureIds } 
    });
  }

  /**
   * Navigate to next lecture in batch
   */
  static async navigateToNextLecture(): Promise<ExtensionServiceResponse<boolean>> {
    return this.sendMessage({ type: 'NAVIGATE_TO_NEXT_LECTURE' });
  }

  /**
   * Collect transcript from current lecture
   */
  static async collectCurrentTranscript(): Promise<ExtensionServiceResponse<{
    lectureId: string;
    transcript: string;
  }>> {
    return this.sendMessage({ type: 'COLLECT_CURRENT_TRANSCRIPT' });
  }

  /**
   * Export all collected batch transcripts
   */
  static async exportBatchTranscripts(format: 'markdown' | 'txt' | 'json'): Promise<ExtensionServiceResponse<string>> {
    return this.sendMessage({ 
      type: 'EXPORT_BATCH_TRANSCRIPTS', 
      data: { format } 
    });
  }
}
