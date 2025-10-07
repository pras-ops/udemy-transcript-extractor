// Background script for Chrome Extension
// Handles WebLLM AI processing messages and manages offscreen document

declare const chrome: any;

class BackgroundService {
  private offscreenDocumentId: string | null = null;
  private messageQueue: Map<string, any> = new Map();
  private offscreenReady = false;
  private readonly OFFSCREEN_URL = 'offscreen.html';
  private offscreenCreationPromise: Promise<void> | null = null;
  private isAISummarizing: boolean = false;

  constructor() {
    this.setupMessageHandlers();
    // Don't initialize offscreen document in constructor to prevent duplicates
  }

  private setupMessageHandlers() {
    console.log('🎯 Background: Setting up message handlers...');
    
    chrome.runtime.onMessage.addListener(async (message: any, sender: any, sendResponse: any) => {
      console.log('🎯 Background: Received message:', message.type, 'from:', sender.contextType || 'unknown');
      
      try {
        // Handle messages from offscreen document
        if (sender.contextType === 'OFFSCREEN_DOCUMENT') {
          console.log('🎯 Background: Message from offscreen document, forwarding...');
          this.handleOffscreenResponse(message);
          sendResponse({ success: true }); // Always respond
          return false; // Don't keep channel open for offscreen responses
        }
        
        // Handle all message types including responses from offscreen
        switch (message.type) {
          case 'AI_SUMMARIZE':
            await this.handleAISummarize(message, sendResponse);
            break;
            
          case 'AI_SUMMARIZE_RESPONSE':
            console.log('🎯 Background: AI_SUMMARIZE_RESPONSE received, handling...');
            this.handleOffscreenResponse(message);
            sendResponse({ success: true });
            break;
            
          case 'AI_SUMMARIZE_CHUNK':
            this.handleOffscreenResponse(message);
            sendResponse({ success: true });
            break;
            
          case 'WEBLLM_LOAD_PROGRESS':
          case 'WEBLLM_CHUNK_PROGRESS':
          case 'WEBLLM_WARNING':
          case 'WEBLLM_ERROR':
            this.handleOffscreenResponse(message);
            sendResponse({ success: true });
            break;
            
          case 'TRANSFORMERS_LOAD_PROGRESS':
            // Forward to UI for progress display
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]?.id) {
                try {
                  chrome.tabs.sendMessage(tabs[0].id, message).catch((error) => {
                    // Ignore errors for tabs without content script or popup
                    console.log('Background: Progress forward failed (expected):', error.message);
                  });
                } catch (error) {
                  console.log('Background: Failed to forward progress:', error);
                }
              }
            });
            break;
            
          case 'CHECK_ENGINES':
            await this.handleCheckEngines(message, sendResponse);
            break;
            
          case 'TEST_COMMUNICATION':
            await this.handleTestCommunication(message, sendResponse);
            break;
            
          case 'OFFSCREEN_READY':
            console.log('✅ Background: Offscreen document is ready');
            sendResponse({ success: true });
            break;
            
          default:
            console.log('🎯 Background: Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('❌ Background: Message handling error:', error);
        if (sendResponse) {
          try {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          } catch (responseError) {
            console.error('❌ Background: Failed to send error response:', responseError);
          }
        }
      }
      
      return true; // Keep message channel open for async responses
    });
  }

  // Initialize offscreen document once during service worker startup
  private async initializeOffscreenDocument() {
    console.log('🎯 Background: Background script initialized');
    await this.ensureOffscreenDocument();
  }

  // Ensure offscreen document exists with promise-based idempotent creation
  private async ensureOffscreenDocument() {
    // Use global flag to prevent repeated initialization
    if (this.offscreenReady) {
      console.log('✅ Background: Offscreen document already ready (cached)');
      return;
    }

    // If creation is already in progress, wait for it
    if (this.offscreenCreationPromise) {
      console.log('🔄 Background: Offscreen document creation already in progress, waiting...');
      await this.offscreenCreationPromise;
      return;
    }

    // Start creation process
    this.offscreenCreationPromise = this.createOffscreenDocument();
    
    try {
      await this.offscreenCreationPromise;
    } finally {
      this.offscreenCreationPromise = null;
    }
  }

  private async createOffscreenDocument() {
    try {
      console.log('🎯 Background: Ensuring offscreen document exists...');
      
      // Use chrome.offscreen.hasDocument() for clean detection
      const hasDocument = await chrome.offscreen.hasDocument?.();
      
      if (hasDocument) {
        console.log('✅ Background: Offscreen document already exists');
        this.offscreenReady = true;
        this.getOffscreenDocumentId();
        return;
      }
      
      console.log('🎯 Background: Creating offscreen document...');
      
      // Create offscreen document
      await chrome.offscreen.createDocument({
        url: this.OFFSCREEN_URL,
        reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
        justification: 'WebLLM AI processing for transcript summarization'
      });
      
      console.log('✅ Background: Offscreen document created successfully');
      this.offscreenReady = true;
      this.getOffscreenDocumentId();
      
    } catch (error) {
      if (error.message?.includes('Only a single offscreen document may be created')) {
        console.log('✅ Background: Offscreen document already exists (caught duplicate error)');
        this.offscreenReady = true;
        this.getOffscreenDocumentId();
      } else {
        console.error('❌ Background: Failed to create offscreen document:', error);
        throw error;
      }
    }
  }

  // Get the offscreen document ID
  private async getOffscreenDocumentId() {
    try {
      const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
      });
      
      if (contexts.length > 0) {
        this.offscreenDocumentId = contexts[0].documentId;
        console.log('🎯 Background: Offscreen document ID:', this.offscreenDocumentId);
      }
    } catch (error) {
      console.error('❌ Background: Failed to get offscreen document ID:', error);
    }
  }

  private async handleAISummarize(message: any, sendResponse: any) {
    try {
      console.log('🎯 Background: Handling AI summarize request...');
      console.log('🎯 Background: Message data:', message.data);
      
      // Check if already processing AI request
      if (this.isAISummarizing) {
        console.log('⚠️ Background: AI summarization already in progress, rejecting duplicate request');
        sendResponse({
          success: false,
          error: 'Already processing another request'
        });
        return;
      }

      // Set flag to prevent duplicate requests
      this.isAISummarizing = true;

      try {
        // Ensure offscreen document exists (with timeout)
        await Promise.race([
          this.ensureOffscreenDocument(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Offscreen initialization timeout')), 10000)
          )
        ]);
      
      // Store the response handler for async response
      if (message.messageId) {
        this.messageQueue.set(message.messageId, sendResponse);
        console.log('🎯 Background: Stored response handler for messageId:', message.messageId);
      }
      
           // Implement proper bidirectional communication pattern from Bug #16 fix
           const response = await new Promise((resolve, reject) => {
             // Set up a one-time listener for the response
             const messageListener = (responseMessage: any, sender: any, responseSender: any) => {
               if (responseMessage.type === 'AI_SUMMARIZE_RESPONSE' && responseMessage.messageId === message.messageId) {
                 console.log('🎯 Background: Received AI_SUMMARIZE_RESPONSE:', responseMessage);
                 chrome.runtime.onMessage.removeListener(messageListener);
                 resolve(responseMessage.data);
               }
             };
             
             chrome.runtime.onMessage.addListener(messageListener);
             
      // Send the message to offscreen document
      chrome.runtime.sendMessage({
        type: 'AI_SUMMARIZE',
        data: message.data,
        messageId: message.messageId,
        timestamp: Date.now()
      }).catch(reject);
      
      // Set a reasonable timeout for AI response (5 minutes)
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(messageListener);
        reject(new Error('AI processing timeout after 5 minutes'));
      }, 300000);
           });
      
      console.log('🎯 Background: Received response from offscreen:', response);
      
      // Send the response back to the popup
      if (message.messageId && this.messageQueue.has(message.messageId)) {
        const popupResponse = this.messageQueue.get(message.messageId);
        this.messageQueue.delete(message.messageId);
        
        if (popupResponse) {
          try {
            popupResponse(response);
          } catch (error) {
            console.error('❌ Background: Failed to send response to popup:', error);
          }
        }
      }
      
        // Send immediate acknowledgment to the original request
        sendResponse({
          success: true,
          message: 'Processing completed',
          data: response
        });
        
      } catch (error) {
        console.error('❌ Background: AI summarize error:', error);
        
        // Clean up message queue
        if (message.messageId) {
          this.messageQueue.delete(message.messageId);
        }
        
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'AI processing failed'
        });
      } finally {
        // Always reset the processing flag
        this.isAISummarizing = false;
      }
    } catch (error) {
      console.error('❌ Background: AI summarize error:', error);
      
      // Clean up message queue
      if (message.messageId) {
        this.messageQueue.delete(message.messageId);
      }
      
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'AI processing failed'
      });
      
      // Always reset the processing flag
      this.isAISummarizing = false;
    }
  }

  private async handleCheckEngines(message: any, sendResponse: any) {
    try {
      console.log('🎯 Background: Checking AI engines...');
      
      if (!this.offscreenDocumentId) {
        await this.ensureOffscreenDocument();
      }
      
      // Send immediate response with default engines
      sendResponse({
        success: true,
        engines: { webllm: true, transformers: false, mock: true }
      });
      
      // Also forward to offscreen document for detailed check
      try {
        chrome.runtime.sendMessage({
          type: 'CHECK_ENGINES'
        });
      } catch (forwardError) {
        console.log('🎯 Background: Could not forward to offscreen:', forwardError);
      }
      
    } catch (error) {
      console.error('❌ Background: Engine check error:', error);
      
      sendResponse({
        success: false,
        engines: { webllm: false, transformers: false, mock: true },
        error: error instanceof Error ? error.message : 'Engine check failed'
      });
    }
  }

  private async handleTestCommunication(message: any, sendResponse: any) {
    try {
      console.log('🎯 Background: Testing communication...');
      
      if (!this.offscreenDocumentId) {
        await this.ensureOffscreenDocument();
      }
      
      // Forward to offscreen document
      const response = await chrome.runtime.sendMessage({
        type: 'TEST_COMMUNICATION'
      });
      
      console.log('🎯 Background: Test communication response:', response);
      sendResponse(response);
      
    } catch (error) {
      console.error('❌ Background: Test communication error:', error);
      
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Communication test failed'
      });
    }
  }

  // Handle responses from offscreen document
  public handleOffscreenResponse(message: any) {
    console.log('🎯 Background: Received offscreen response:', message.type);
    
    switch (message.type) {
      case 'AI_SUMMARIZE_RESPONSE':
        console.log('🎯 Background: Processing AI_SUMMARIZE_RESPONSE');
        console.log('🎯 Background: Message data:', message.data);
        console.log('🎯 Background: Message ID:', message.messageId);
        
        // Handle both direct message format and nested data format
        const responseData = message.data || message;
        const messageId = message.messageId || responseData.messageId;
        
        // Store in chrome.storage for popup polling
        if (messageId) {
          console.log('🎯 Background: Storing response in chrome.storage for messageId:', messageId);
          try {
            chrome.storage.local.set({
              [`ai_summary_${messageId}`]: {
                ...responseData,
                messageId: messageId,
                timestamp: Date.now()
              }
            }, () => {
              console.log('✅ Background: Response stored in storage');
              
              // Auto-cleanup after 10 minutes to prevent storage bloat
              setTimeout(() => {
                chrome.storage.local.remove([`ai_summary_${messageId}`], () => {
                  console.log('🧹 Background: Cleaned up old summary from storage:', messageId);
                });
              }, 10 * 60 * 1000); // 10 minutes
            });
          } catch (storageError) {
            console.error('❌ Background: Failed to store response:', storageError);
          }
        }
        
        // Forward to popup if there's a pending request
        if (messageId && this.messageQueue.has(messageId)) {
          console.log('🎯 Background: Found matching message ID in queue');
          const sendResponse = this.messageQueue.get(messageId);
          this.messageQueue.delete(messageId);
          
          if (sendResponse) {
            try {
              console.log('🎯 Background: Sending response to popup:', responseData);
              // Include messageId in the response for popup matching
              sendResponse({
                ...responseData,
                messageId: messageId
              });
            } catch (error) {
              console.error('❌ Background: Failed to send response:', error);
            }
          }
        } else {
          console.log('🎯 Background: No matching message ID found in queue, response will be available via storage polling');
        }
        
        // Also broadcast to all tabs for popup updates
        chrome.tabs.query({}, (tabs: any[]) => {
          tabs.forEach(tab => {
            if (tab.id) {
              try {
                chrome.tabs.sendMessage(tab.id, {
                  type: 'AI_SUMMARIZE_RESPONSE',
                  data: responseData,
                  messageId: messageId
                }).catch((error) => {
                  // Ignore errors for tabs without content script or popup
                  console.log('Background: Tab message failed (expected for some tabs):', error.message);
                });
              } catch (error) {
                console.log('Background: Failed to send message to tab:', error);
              }
            }
          });
        });
        break;
        
      case 'AI_SUMMARIZE_CHUNK':
        // Broadcast streaming chunks to all tabs
        chrome.tabs.query({}, (tabs: any[]) => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                type: 'AI_SUMMARIZE_CHUNK',
                data: message.data
              }).catch(() => {
                // Ignore errors for tabs without content script
              });
            }
          });
        });
        break;
        
      case 'WEBLLM_LOAD_PROGRESS':
      case 'WEBLLM_CHUNK_PROGRESS':
        // Broadcast progress updates to all tabs
        chrome.tabs.query({}, (tabs: any[]) => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                type: message.type,
                data: message.data || message
              }).catch(() => {
                // Ignore errors for tabs without content script
              });
            }
          });
        });
        break;
        
      case 'WEBLLM_WARNING':
        // Handle WebGPU warnings - show user notification
        console.warn('⚠️ WebLLM Warning:', message.warning);
        // You could add notification system here
        break;
        
      case 'WEBLLM_ERROR':
        // Handle WebLLM errors
        console.error('❌ WebLLM Error:', message.error);
        console.log('💡 Suggestion:', message.suggestion);
        break;
        
      case 'CHECK_ENGINES_RESPONSE':
      case 'TEST_COMMUNICATION_RESPONSE':
        // These are handled by the specific request handlers
        break;
        
      default:
        console.log('🎯 Background: Unknown offscreen message type:', message.type);
    }
  }
}

// Initialize background service
const backgroundService = new BackgroundService();

// Handle extension startup - only initialize once
chrome.runtime.onStartup.addListener(() => {
  console.log('🎯 Background: Extension startup');
  backgroundService.ensureOffscreenDocument();
});

// Handle extension installation/update - only initialize once
chrome.runtime.onInstalled.addListener((details: any) => {
  console.log('🎯 Background: Extension installed/updated:', details.reason);
  backgroundService.ensureOffscreenDocument();
});

console.log('🎯 Background: Background script loaded');
