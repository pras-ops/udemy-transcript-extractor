// Background script for Chrome Extension
// Handles basic extension lifecycle and communication

declare const chrome: any;

class BackgroundService {
  constructor() {
    this.setupMessageHandlers();
  }

  private setupMessageHandlers() {
    console.log('🎯 Background: Setting up message handlers...');
    
    chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
      console.log('🎯 Background: Received message:', message.type);
      
      try {
        switch (message.type) {
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
