// Background script for Chrome Extension
// Handles basic extension lifecycle and communication

declare const chrome: any;

class BackgroundService {
  private offscreenDocumentReady: boolean = false;
  private aiInitialized: boolean = false;

  constructor() {
    this.setupMessageHandlers();
    this.setupOffscreenDocument();
  }

  // Create offscreen document for WebLLM
  private async setupOffscreenDocument(): Promise<void> {
    try {
      // Check if offscreen document already exists
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
      });

      if (existingContexts.length > 0) {
        console.log('🤖 Background: Offscreen document already exists');
        this.offscreenDocumentReady = true;
        return;
      }

      // Create new offscreen document
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['WORKERS' as chrome.offscreen.Reason],
        justification: 'Run WebLLM for AI chat with transcripts',
      });

      this.offscreenDocumentReady = true;
      console.log('✅ Background: Offscreen document created');
    } catch (error) {
      console.error('❌ Background: Failed to create offscreen document:', error);
      this.offscreenDocumentReady = false;
    }
  }

  private setupMessageHandlers() {
    console.log('🎯 Background: Setting up message handlers...');
    
    chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
      console.log('🎯 Background: Received message:', message.type);
      
      try {
        switch (message.type) {
          // AI-related messages
          case 'AI_INITIALIZE':
            this.handleAIInitialize(sendResponse);
            return true;

          case 'AI_CHAT':
            this.handleAIChat(message, sendResponse);
            return true;

          case 'AI_STATUS':
            this.handleAIStatus(sendResponse);
            return true;

          case 'AI_CLEAR_HISTORY':
            this.handleAIClearHistory(sendResponse);
            return true;

          // Progress updates from offscreen document
          case 'AI_INIT_PROGRESS':
            // Forward to popup if open
            chrome.runtime.sendMessage(message).catch(() => {
              // Popup might not be open, that's okay
            });
            break;

          case 'AI_READY':
            this.aiInitialized = true;
            // Forward to popup if open
            chrome.runtime.sendMessage(message).catch(() => {
              // Popup might not be open, that's okay
            });
            break;

          case 'AI_ERROR':
            // Forward to popup if open
            chrome.runtime.sendMessage(message).catch(() => {
              // Popup might not be open, that's okay
            });
            break;

          default:
            console.log('🎯 Background: Unknown message type:', message.type);
            sendResponse({ success: false, error: 'Unknown message type' });
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

  private async handleAIInitialize(sendResponse: any): Promise<void> {
    if (!this.offscreenDocumentReady) {
      await this.setupOffscreenDocument();
    }

    if (!this.offscreenDocumentReady) {
      sendResponse({ success: false, error: 'Offscreen document not ready' });
      return;
    }

    // Forward to offscreen document
    chrome.runtime.sendMessage(
      { type: 'AI_INITIALIZE' },
      (response: any) => {
        sendResponse(response);
      }
    );
  }

  private async handleAIChat(message: any, sendResponse: any): Promise<void> {
    if (!this.offscreenDocumentReady) {
      sendResponse({ success: false, error: 'AI not initialized' });
      return;
    }

    // Forward to offscreen document
    chrome.runtime.sendMessage(
      {
        type: 'AI_CHAT',
        userMessage: message.userMessage,
        transcriptContext: message.transcriptContext,
      },
      (response: any) => {
        sendResponse(response);
      }
    );
  }

  private async handleAIStatus(sendResponse: any): Promise<void> {
    if (!this.offscreenDocumentReady) {
      sendResponse({ 
        success: true, 
        status: { isInitialized: false, isInitializing: false } 
      });
      return;
    }

    // Forward to offscreen document
    chrome.runtime.sendMessage(
      { type: 'AI_STATUS' },
      (response: any) => {
        sendResponse(response);
      }
    );
  }

  private async handleAIClearHistory(sendResponse: any): Promise<void> {
    if (!this.offscreenDocumentReady) {
      sendResponse({ success: true });
      return;
    }

    // Forward to offscreen document
    chrome.runtime.sendMessage(
      { type: 'AI_CLEAR_HISTORY' },
      (response: any) => {
        sendResponse(response);
      }
    );
  }
}

// Initialize background service
const backgroundService = new BackgroundService();

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🎯 Background: Extension startup');
});

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details: any) => {
  console.log('🎯 Background: Extension installed/updated:', details.reason);
});

console.log('🎯 Background: Background Service Worker loaded');
