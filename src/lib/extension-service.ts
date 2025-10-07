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
  static formatTranscript(transcript: string, format: 'markdown' | 'txt' | 'json' | 'rag', includeTimestamps: boolean = true, videoTitle?: string): string {
    // Sanitize input first
    const cleanTranscript = this.sanitizeText(transcript);
    
    switch (format) {
      case 'markdown':
        return this.formatAsMarkdown(cleanTranscript, includeTimestamps);
      case 'json':
        return this.formatAsJSON(cleanTranscript, includeTimestamps);
      case 'rag':
        return this.formatAsRAG(cleanTranscript, includeTimestamps, videoTitle);
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

  private static formatAsRAG(transcript: string, includeTimestamps: boolean, videoTitle?: string): string {
    const lines = transcript.split('\n\n');
    
    // Clean and prepare transcript lines
    const cleanLines: string[] = [];
    
    lines.forEach((line) => {
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
      
      // Skip empty or very short lines, but keep meaningful content
      if (text && text.length >= 3 && /[a-zA-Z]/.test(text)) {
        cleanLines.push(text);
      }
    });
    
    // Smart chunking: merge lines until we reach target word count (50-60 words)
    const chunks = this.createSmartChunks(cleanLines, 55); // Target 55 words per chunk
    
    // Create RAG format with optimized chunks
    const ragChunks = chunks.map((chunk, index) => ({
      id: `chunk_${index + 1}`,
      content: chunk,
      metadata: {
        chunk_index: index + 1,
        source: 'video_transcript',
        type: 'educational_content',
        video_title: videoTitle || 'Unknown Video',
        word_count: chunk.split(/\s+/).length
      }
    }));
    
    return JSON.stringify({
      document_type: 'video_transcript',
      total_chunks: ragChunks.length,
      chunks: ragChunks,
      metadata: {
        extraction_date: new Date().toISOString(),
        format_version: '2.2',
        rag_optimized: true,
        chunking_strategy: 'smart_word_based',
        target_words_per_chunk: 55,
        total_words: cleanLines.join(' ').split(/\s+/).length,
        video_title: videoTitle || 'Unknown Video',
        video_info: {
          title: videoTitle || 'Unknown Video',
          platform: 'udemy',
          content_type: 'educational_video'
        }
      }
    }, null, 2);
  }

  /**
   * Create smart chunks based on word count, not line count
   * Merges small transcript segments into coherent 50-60 word chunks
   */
  private static createSmartChunks(lines: string[], targetWords: number): string[] {
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentWordCount = 0;
    
    for (const line of lines) {
      const words = line.split(/\s+/);
      const lineWordCount = words.length;
      
      // If adding this line would exceed target, finalize current chunk
      if (currentWordCount + lineWordCount > targetWords && currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [line];
        currentWordCount = lineWordCount;
      } else {
        // Add line to current chunk
        currentChunk.push(line);
        currentWordCount += lineWordCount;
      }
    }
    
    // Add final chunk if it has content
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }
    
    // Post-process: merge very small chunks with previous ones
    const finalChunks: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const wordCount = chunk.split(/\s+/).length;
      
      // If chunk is too small (less than 20 words) and not the last chunk
      if (wordCount < 20 && i < chunks.length - 1) {
        // Merge with next chunk
        if (i + 1 < chunks.length) {
          finalChunks.push(chunk + ' ' + chunks[i + 1]);
          i++; // Skip next chunk since we merged it
        } else {
          finalChunks.push(chunk);
        }
      } else {
        finalChunks.push(chunk);
      }
    }
    
    return finalChunks;
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

  /**
   * Summarize transcript using WebLLM AI
   */
  static async summarizeWithAI(transcript: string, options: {
    mode?: 'balanced' | 'detailed' | 'concise';
    outputFormat?: 'paragraph' | 'bullet-points' | 'numbered-list';
    useWebLLM?: boolean;
    includeTimestamps?: boolean;
  } = {}): Promise<ExtensionServiceResponse<{
    summary: string;
    engine: string;
    wordCount?: number;
    hierarchical?: boolean;
  }>> {
    try {
      console.log('🎯 ExtensionService: Starting WebLLM AI summarization...');
      
      // Sanitize transcript
      const sanitizedTranscript = this.sanitizeText(transcript);
      
      if (!sanitizedTranscript || sanitizedTranscript.trim().length === 0) {
        throw new Error('No transcript provided for AI summarization');
      }
      
      console.log('🎯 ExtensionService: Sending AI summarization request to background script...');
      
      // Send message to background script to process with offscreen document
      return new Promise((resolve, reject) => {
        const messageId = Date.now().toString();
        
        // Set up response listener and storage polling
        const handleResponse = (message: any) => {
          // Check for both direct responses and forwarded responses with messageId
          if ((message.type === 'AI_SUMMARIZE_RESPONSE' && message.messageId === messageId) ||
              (message.messageId === messageId)) {
            chrome.runtime.onMessage.removeListener(handleResponse);
            
            if (message.success) {
              resolve({
                success: true,
                data: {
                  summary: message.summary,
                  engine: message.engine,
                  wordCount: message.wordCount,
                  hierarchical: message.hierarchical
                }
              });
            } else {
              resolve({
                success: false,
                error: message.error || 'AI summarization failed'
              });
            }
          }
        };
        
        chrome.runtime.onMessage.addListener(handleResponse);
        
        // Also poll storage for response (in case popup closes)
        const pollStorage = async () => {
          try {
            const result = await chrome.storage.local.get(`ai_summary_${messageId}`);
            if (result[`ai_summary_${messageId}`]) {
              const storedResponse = result[`ai_summary_${messageId}`];
              chrome.runtime.onMessage.removeListener(handleResponse);
              
              // Clean up storage
              chrome.storage.local.remove(`ai_summary_${messageId}`);
              
              if (storedResponse.success) {
                resolve({
                  success: true,
                  data: {
                    summary: storedResponse.summary,
                    engine: storedResponse.engine,
                    wordCount: storedResponse.wordCount,
                    hierarchical: storedResponse.hierarchical
                  }
                });
              } else {
                resolve({
                  success: false,
                  error: storedResponse.error || 'AI summarization failed'
                });
              }
            }
          } catch (error) {
            // Ignore storage errors, continue polling
          }
        };
        
        // Poll storage every 1 second
        const intervalId = setInterval(pollStorage, 1000);
        
        // Store interval ID for cleanup
        (handleResponse as any).intervalId = intervalId;
        
        // Send request to background script
        chrome.runtime.sendMessage({
          type: 'AI_SUMMARIZE',
          messageId,
          data: {
            transcript: sanitizedTranscript,
            options: {
              mode: options.mode || 'balanced',
              outputFormat: options.outputFormat || 'paragraph',
              useWebLLM: options.useWebLLM !== false, // Default to true
              includeTimestamps: options.includeTimestamps || false
            }
          }
        });
        
        // Timeout after 60 seconds
        setTimeout(() => {
          chrome.runtime.onMessage.removeListener(handleResponse);
          if ((handleResponse as any).intervalId) {
            clearInterval((handleResponse as any).intervalId);
          }
          reject(new Error('AI summarization timeout'));
        }, 60000);
      });
      
    } catch (error) {
      console.error('❌ ExtensionService: AI summarization error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AI summarization failed'
      };
    }
  }
}
