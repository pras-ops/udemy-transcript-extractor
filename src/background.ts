// Background script for Chrome Extension
// Handles WebLLM AI processing messages and manages offscreen document

declare const chrome: any;

class BackgroundService {
  private offscreenDocumentId: string | null = null;
  private messageQueue: Map<string, any> = new Map();

  constructor() {
    this.setupMessageHandlers();
    this.ensureOffscreenDocument();
  }

  private setupMessageHandlers() {
    console.log('🎯 Background: Setting up message handlers...');
    
    chrome.runtime.onMessage.addListener(async (message: any, sender: any, sendResponse: any) => {
      console.log('🎯 Background: Received message:', message.type);
      
      try {
        // Handle messages from offscreen document
        if (sender.contextType === 'OFFSCREEN_DOCUMENT') {
          this.handleOffscreenResponse(message);
          return false; // Don't keep channel open for offscreen responses
        }
        
        // Handle all message types including responses from offscreen
        switch (message.type) {
          case 'AI_SUMMARIZE':
            await this.handleAISummarize(message, sendResponse);
            break;
            
          case 'AI_SUMMARIZE_RESPONSE':
            this.handleOffscreenResponse(message);
            break;
            
          case 'AI_SUMMARIZE_CHUNK':
            this.handleOffscreenResponse(message);
            break;
            
          case 'WEBLLM_LOAD_PROGRESS':
          case 'WEBLLM_CHUNK_PROGRESS':
          case 'WEBLLM_WARNING':
          case 'WEBLLM_ERROR':
            this.handleOffscreenResponse(message);
            break;
            
          case 'TRANSFORMERS_LOAD_PROGRESS':
            // Forward to UI for progress display
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, message);
              }
            });
            break;
            
          case 'CHECK_ENGINES':
            await this.handleCheckEngines(message, sendResponse);
            break;
            
          case 'TEST_COMMUNICATION':
            await this.handleTestCommunication(message, sendResponse);
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

  private async ensureOffscreenDocument() {
    try {
      console.log('🎯 Background: Ensuring offscreen document exists...');
      
      // Check if offscreen document already exists
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
      });
      
      if (existingContexts.length > 0) {
        console.log('✅ Background: Offscreen document already exists');
        this.offscreenDocumentId = existingContexts[0].documentId;
        return;
      }
      
      // Create offscreen document
      console.log('🎯 Background: Creating offscreen document...');
      try {
        await chrome.offscreen.createDocument({
          url: 'offscreen.html',
          reasons: ['WORKERS'],
          justification: 'WebLLM AI processing for transcript summarization'
        });
        
        console.log('✅ Background: Offscreen document created successfully');
        
        // Get the document ID
        const contexts = await chrome.runtime.getContexts({
          contextTypes: ['OFFSCREEN_DOCUMENT']
        });
        
        if (contexts.length > 0) {
          this.offscreenDocumentId = contexts[0].documentId;
          console.log('🎯 Background: Offscreen document ID:', this.offscreenDocumentId);
        }
        
      } catch (createError) {
        if (createError.message?.includes('Only a single offscreen document may be created')) {
          console.log('✅ Background: Offscreen document already exists (caught duplicate error)');
          // Try to get the existing document ID
          const contexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT']
          });
          
          if (contexts.length > 0) {
            this.offscreenDocumentId = contexts[0].documentId;
            console.log('🎯 Background: Found existing offscreen document ID:', this.offscreenDocumentId);
          }
        } else {
          throw createError;
        }
      }
      
    } catch (error) {
      console.error('❌ Background: Failed to create offscreen document:', error);
    }
  }

  private async handleAISummarize(message: any, sendResponse: any) {
    try {
      console.log('🎯 Background: Handling AI summarize request...');
      console.log('🎯 Background: Message data:', message.data);
      
      if (!this.offscreenDocumentId) {
        await this.ensureOffscreenDocument();
      }
      
      // Store the response handler for async response
      if (message.messageId) {
        this.messageQueue.set(message.messageId, sendResponse);
      }
      
      // Forward message to offscreen document via runtime messaging
      try {
        chrome.runtime.sendMessage({
          type: 'AI_SUMMARIZE',
          data: message.data,
          messageId: message.messageId
        });
        console.log('🎯 Background: Message forwarded to offscreen document');
        
        // Send immediate acknowledgment
        sendResponse({
          success: true,
          message: 'Processing started',
          streaming: true
        });
        
      } catch (forwardError) {
        console.error('❌ Background: Failed to forward message to offscreen:', forwardError);
        sendResponse({
          success: false,
          error: 'Failed to start AI processing'
        });
      }
      
    } catch (error) {
      console.error('❌ Background: AI summarize error:', error);
      
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'AI processing failed'
      });
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
        // Forward to popup if there's a pending request
        if (message.messageId && this.messageQueue.has(message.messageId)) {
          const sendResponse = this.messageQueue.get(message.messageId);
          this.messageQueue.delete(message.messageId);
          
          if (sendResponse) {
            try {
              sendResponse(message.data);
            } catch (error) {
              console.error('❌ Background: Failed to send response:', error);
            }
          }
        }
        
        // Also broadcast to all tabs for popup updates
        chrome.tabs.query({}, (tabs: any[]) => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, message).catch(() => {
                // Ignore errors for tabs without content script
              });
            }
          });
        });
        break;
        
      case 'AI_SUMMARIZE_CHUNK':
        // Broadcast streaming chunks to all tabs
        chrome.tabs.query({}, (tabs: any[]) => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, message).catch(() => {
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
              chrome.tabs.sendMessage(tab.id, message).catch(() => {
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

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🎯 Background: Extension startup');
  backgroundService.ensureOffscreenDocument();
});

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details: any) => {
  console.log('🎯 Background: Extension installed/updated:', details.reason);
  backgroundService.ensureOffscreenDocument();
});

console.log('🎯 Background: Background script initialized');
