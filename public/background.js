// Background script for Transcript Extractor Extension

// Track active tabs to clean up data when they're closed
let activeTabs = new Set();
let offscreenDocumentId = null;

chrome.runtime.onInstalled.addListener(() => {
  console.log('Transcript Extractor Extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.url);
});

// AI Summarization Handler
async function handleAISummarization(data, sendResponse) {
  try {
    console.log('🤖 Background: Handling AI summarization request');
    console.log('🤖 Background: Data received:', data);
    
    // Ensure offscreen document is available
    console.log('🤖 Background: Ensuring offscreen document...');
    await ensureOffscreenDocument();
    console.log('🤖 Background: Offscreen document ensured');
    
    // Send request to offscreen document
    console.log('🤖 Background: Sending message to offscreen document...');
    const response = await chrome.runtime.sendMessage({
      type: 'SUMMARIZE_TRANSCRIPT',
      data: data
    });
    
    console.log('🤖 Background: Received response from offscreen:', response);
    sendResponse(response);
  } catch (error) {
    console.error('❌ Background: AI summarization failed:', error);
    sendResponse({
      success: false,
      error: error.message || 'AI processing failed'
    });
  }
}

// Ensure offscreen document is created
async function ensureOffscreenDocument() {
  // Check if we already have an offscreen document
  if (offscreenDocumentId) {
    try {
      // Try to ping the existing offscreen document
      await chrome.runtime.sendMessage({ type: 'CHECK_ENGINES' });
      console.log('✅ Offscreen document already exists and is responsive');
      return;
    } catch (error) {
      console.log('🔄 Existing offscreen document is not responsive, will recreate...');
      offscreenDocumentId = null;
    }
  }
  
  // Check if there's already an offscreen document created by Chrome
  try {
    const existingDocuments = await chrome.offscreen.hasDocument();
    if (existingDocuments) {
      console.log('🔄 Chrome already has an offscreen document, using existing one...');
      // Try to communicate with the existing document
      try {
        await chrome.runtime.sendMessage({ type: 'CHECK_ENGINES' });
        console.log('✅ Successfully connected to existing offscreen document');
        return;
      } catch (error) {
        console.log('🔄 Existing offscreen document is not responsive, will close and recreate...');
        await chrome.offscreen.closeDocument();
      }
    }
  } catch (error) {
    console.log('🔄 Error checking existing offscreen documents:', error);
  }
  
  try {
    console.log('🔄 Creating new offscreen document...');
    offscreenDocumentId = await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['WORKERS'],
      justification: 'AI processing with WebGPU and model downloads'
    });
    console.log('✅ Offscreen document created:', offscreenDocumentId);
    
    // Test communication with offscreen document
    setTimeout(async () => {
      try {
        console.log('🔍 Testing offscreen document communication...');
        const testResponse = await chrome.runtime.sendMessage({ type: 'CHECK_ENGINES' });
        console.log('✅ Offscreen document communication test:', testResponse);
      } catch (error) {
        console.log('❌ Offscreen document communication test failed:', error);
      }
    }, 1000);
  } catch (error) {
    console.error('❌ Failed to create offscreen document:', error);
    throw error;
  }
}

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);
  
  // Track tab when content script sends a message
  if (sender.tab && sender.tab.id) {
    activeTabs.add(sender.tab.id);
    console.log('🎯 Tracking active tab:', sender.tab.id);
  }
  
  // Handle AI summarization requests
  if (message.type === 'AI_SUMMARIZE') {
    handleAISummarization(message.data, sendResponse);
    return true; // Keep message channel open for async response
  }
  
  // Handle engine availability check
  if (message.type === 'CHECK_ENGINES') {
    handleEngineCheck(sendResponse);
    return true; // Keep message channel open for async response
  }
  
  sendResponse({ success: true });
});

// Handle engine availability check
async function handleEngineCheck(sendResponse) {
  try {
    console.log('🤖 Background: Handling engine check request');
    
    // Ensure offscreen document is available
    await ensureOffscreenDocument();
    
    // Send request to offscreen document
    const response = await chrome.runtime.sendMessage({
      type: 'CHECK_ENGINES'
    });
    
    console.log('🤖 Background: Engine check response:', response);
    sendResponse(response);
  } catch (error) {
    console.error('❌ Background: Engine check failed:', error);
    sendResponse({
      success: false,
      error: error.message || 'Engine check failed'
    });
  }
}

// Monitor tab updates to detect when user switches tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if this is a supported platform (Udemy, YouTube, Coursera)
    const isSupportedPlatform = tab.url.includes('udemy.com') || 
                               tab.url.includes('youtube.com') || 
                               tab.url.includes('coursera.org');
    
    if (isSupportedPlatform) {
      activeTabs.add(tabId);
      console.log('🎯 Tab updated - tracking:', tabId, tab.url);
    }
  }
});

// Monitor tab activation to clean up data when switching away from supported tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('🎯 Tab activated:', activeInfo.tabId);
  
  try {
    const activeTab = await chrome.tabs.get(activeInfo.tabId);
    const isSupportedPlatform = activeTab.url && (
      activeTab.url.includes('udemy.com') || 
      activeTab.url.includes('youtube.com') || 
      activeTab.url.includes('coursera.org')
    );
    
    if (!isSupportedPlatform) {
      // User switched to non-supported tab, clear all data immediately
      console.log('🎯 Switched to non-supported tab, auto-clearing extension data...');
      await clearAllExtensionData();
    }
  } catch (error) {
    console.error('Error handling tab activation:', error);
    // If we can't check the tab, clear data as precaution
    await clearAllExtensionData();
  }
});

// Monitor tab removal to clean up data when tabs are closed
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  console.log('🎯 Tab removed:', tabId);
  
  if (activeTabs.has(tabId)) {
    activeTabs.delete(tabId);
    console.log('🎯 Removed tracked tab:', tabId);
    
    // Always clear data when any tracked tab is removed (more aggressive)
    console.log('🎯 Tracked tab closed, auto-clearing extension data...');
    await clearAllExtensionData();
  }
});

// Monitor window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus, clear data
    console.log('🎯 Browser lost focus, clearing extension data...');
    await clearAllExtensionData();
  }
});

// Function to clear all extension data
async function clearAllExtensionData() {
  try {
    console.log('🎯 Auto-clearing all extension data...');
    
    // Clear all storage data
    await chrome.storage.local.clear();
    
    // Clear any runtime data
    activeTabs.clear();
    
    // Close offscreen document if it exists
    await closeOffscreenDocument();
    
    console.log('🎯 All extension data auto-cleared');
  } catch (error) {
    console.error('Error auto-clearing extension data:', error);
  }
}

// Function to close offscreen document
async function closeOffscreenDocument() {
  try {
    if (offscreenDocumentId) {
      console.log('🔄 Closing offscreen document...');
      await chrome.offscreen.closeDocument();
      offscreenDocumentId = null;
      console.log('✅ Offscreen document closed');
    }
  } catch (error) {
    console.log('🔄 Error closing offscreen document:', error);
    offscreenDocumentId = null;
  }
}

// Periodic cleanup check to ensure data is cleared (backup mechanism)
setInterval(async () => {
  try {
    const tabs = await chrome.tabs.query({});
    const supportedTabs = tabs.filter(tab => 
      tab.url && (
        tab.url.includes('udemy.com') || 
        tab.url.includes('youtube.com') || 
        tab.url.includes('coursera.org')
      )
    );
    
    // If no supported tabs exist but we have data, clear it
    if (supportedTabs.length === 0 && activeTabs.size === 0) {
      const storageData = await chrome.storage.local.get();
      if (Object.keys(storageData).length > 0) {
        console.log('🎯 Periodic cleanup: No supported tabs found, auto-clearing data...');
        await clearAllExtensionData();
      }
    }
  } catch (error) {
    console.error('Error in periodic cleanup:', error);
  }
}, 30000); // Check every 30 seconds

// Handle extension startup - clear data if no active supported tabs
chrome.runtime.onStartup.addListener(async () => {
  console.log('🎯 Extension startup - checking for active tabs...');
  
  try {
    const tabs = await chrome.tabs.query({});
    const supportedTabs = tabs.filter(tab => 
      tab.url && (
        tab.url.includes('udemy.com') || 
        tab.url.includes('youtube.com') || 
        tab.url.includes('coursera.org')
      )
    );
    
    if (supportedTabs.length === 0) {
      console.log('🎯 No supported tabs found on startup, clearing data...');
      await clearAllExtensionData();
    } else {
      // Track existing supported tabs
      supportedTabs.forEach(tab => {
        if (tab.id) {
          activeTabs.add(tab.id);
        }
      });
      console.log('🎯 Tracking', supportedTabs.length, 'existing supported tabs');
    }
  } catch (error) {
    console.error('Error checking tabs on startup:', error);
  }
});
