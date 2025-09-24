// Background script for Transcript Extractor Extension

// Track active tabs to clean up data when they're closed
let activeTabs = new Set();
let offscreenDocumentId = null;

// State flags to prevent concurrent execution and re-entry
let isProcessing = false;
let isClearingData = false;
let lastCleanupTime = 0;

// Request queue system
let requestQueue = [];
let currentRequest = null;

// Manual reset function for debugging
function resetProcessingFlag() {
  console.log('🔄 Background: Manually resetting processing flag');
  isProcessing = false;
  isClearingData = false;
  requestQueue = [];
  currentRequest = null;
}

// Removed duplicate - handled below with alarm setup

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.url);
});

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
  
  // Handle manual reset of processing flag
  if (message.type === 'RESET_PROCESSING_FLAG') {
    resetProcessingFlag();
    sendResponse({ success: true, message: 'Processing flag reset' });
    return;
  }
  
  // Handle debug status check
  if (message.type === 'DEBUG_STATUS') {
    sendResponse({ 
      success: true, 
      status: {
        isProcessing,
        isClearingData,
        activeTabs: Array.from(activeTabs),
        offscreenDocumentId,
        lastCleanupTime,
        requestQueue: requestQueue.length,
        currentRequest: currentRequest?.id || null
      }
    });
    return;
  }
  
  sendResponse({ success: true });
});

// AI Summarization Handler with Queue System
async function handleAISummarization(data, sendResponse) {
  console.log('🤖 Background: AI summarization request received');
  console.log('🤖 Background: Current processing status:', isProcessing);
  console.log('🤖 Background: Queue length:', requestQueue.length);
  
  // Add request to queue
  const requestId = Date.now() + Math.random();
  const request = {
    id: requestId,
    data,
    sendResponse,
    timestamp: Date.now()
  };
  
  requestQueue.push(request);
  console.log('🤖 Background: Request added to queue:', requestId);
  
  // Process queue if not already processing
  if (!isProcessing) {
    processNextRequest();
  } else {
    console.log('🤖 Background: Already processing, request queued');
  }
}

// Process the next request in the queue
async function processNextRequest() {
  if (requestQueue.length === 0 || isProcessing) {
    return;
  }
  
  const request = requestQueue.shift();
  currentRequest = request;
  isProcessing = true;
  
  console.log('🤖 Background: Processing request:', request.id);
  console.log('🤖 Background: Processing flag set to true');
  
  // No timeout - let AI processing take as long as needed
  
  try {
    console.log('🤖 Background: Handling AI summarization request');
    console.log('🤖 Background: Data received:', request.data);
    
    // Ensure offscreen document is available
    console.log('🤖 Background: Ensuring offscreen document...');
    await ensureOffscreenDocument();
    console.log('🤖 Background: Offscreen document ensured');
    
    // Send request to offscreen document
    console.log('🤖 Background: Sending message to offscreen document...');
    
    // Create a promise to handle the response from offscreen document
    const response = await new Promise((resolve, reject) => {
      let ackReceived = false;
      
      // Set up a one-time listener for the response
      const messageListener = (message, sender, sendResponse) => {
        if (message.type === 'AI_SUMMARIZE_ACK') {
          ackReceived = true;
          console.log('✅ Background: Received acknowledgment from offscreen:', message.data);
        } else if (message.type === 'AI_SUMMARIZE_RESPONSE') {
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve(message.data);
        }
      };
      
      chrome.runtime.onMessage.addListener(messageListener);
      
      // Send the message to offscreen document
      chrome.runtime.sendMessage({
        type: 'AI_SUMMARIZE',
        data: request.data
      }).catch(reject);
      
      // No timeout - let AI models take as long as needed
    });
    
    console.log('🤖 Background: Received response from offscreen:', response);
    console.log('🔍 Background: Response success:', response.success);
    console.log('🔍 Background: Response engine:', response.engine);
    console.log('🔍 Background: Response summary length:', response.summary?.length);
    
    // Log debug information if available
    if (response.debug) {
      console.log('🔍 Background: Debug info from offscreen:', response.debug);
    }
    
    // Send response to the current request
    request.sendResponse(response);
  } catch (error) {
    console.error('❌ Background: AI summarization error:', error);
    request.sendResponse({
      success: false,
      error: error.message,
      engine: 'error'
    });
  } finally {
    isProcessing = false;
    currentRequest = null;
    console.log('🤖 Background: Processing flag reset to false');
    console.log('🤖 Background: Processing next request in queue...');
    // Process next request in queue
    processNextRequest();
  }
}

// Handle engine availability check
async function handleEngineCheck(sendResponse) {
  try {
    console.log('🤖 Background: Handling engine check request');
    
    // Ensure offscreen document is available
    await ensureOffscreenDocument();
    
    // Send check request to offscreen document
    const response = await new Promise((resolve, reject) => {
      // Set up a one-time listener for the response
      const messageListener = (message, sender, sendResponse) => {
        if (message.type === 'CHECK_ENGINES_RESPONSE') {
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve(message.data);
        }
      };
      
      chrome.runtime.onMessage.addListener(messageListener);
      
      // Send the message to offscreen document
      chrome.runtime.sendMessage({
        type: 'CHECK_ENGINES'
      }).catch(reject);
      
      // Set a timeout to prevent hanging
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(messageListener);
        reject(new Error('Timeout waiting for engine check response'));
      }, 10000); // 10 second timeout
    });
    
    console.log('🤖 Background: Engine check response:', response);
    sendResponse(response);
  } catch (error) {
    console.error('❌ Background: Engine check error:', error);
    sendResponse({
      success: false,
      engines: { webllm: false, transformers: false }
    });
  }
}

// Function to ensure offscreen document is available
async function ensureOffscreenDocument() {
  try {
    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    
    if (existingContexts.length > 0) {
      console.log('🔄 Chrome already has an offscreen document, using existing one...');
      offscreenDocumentId = existingContexts[0].documentId;
      console.log('✅ Successfully connected to existing offscreen document');
      return;
    }
    
    // Create new offscreen document
    console.log('🔄 Creating new offscreen document...');
    offscreenDocumentId = await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['WORKERS'],
      justification: 'AI processing for transcript summarization'
    });
    console.log('✅ Offscreen document created:', offscreenDocumentId);
    
    // Test communication
    console.log('🔍 Testing offscreen document communication...');
    const testResponse = await new Promise((resolve, reject) => {
      // Set up a one-time listener for the response
      const messageListener = (message, sender, sendResponse) => {
        if (message.type === 'TEST_COMMUNICATION_RESPONSE') {
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve(message.data);
        }
      };
      
      chrome.runtime.onMessage.addListener(messageListener);
      
      // Send the message to offscreen document
      chrome.runtime.sendMessage({
        type: 'TEST_COMMUNICATION'
      }).catch(reject);
      
      // Set a timeout to prevent hanging
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(messageListener);
        reject(new Error('Timeout waiting for communication test response'));
      }, 5000); // 5 second timeout
    });
    console.log('✅ Offscreen document communication test:', testResponse);
    
  } catch (error) {
    console.error('❌ Error ensuring offscreen document:', error);
    throw error;
  }
}

// Monitor tab updates to detect when user switches tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only process complete status updates with valid URLs
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    // Check if this is a supported platform (Udemy, YouTube, Coursera)
    const isSupportedPlatform = tab.url.includes('udemy.com') || 
                               tab.url.includes('youtube.com') || 
                               tab.url.includes('coursera.org');
    
    if (isSupportedPlatform && !activeTabs.has(tabId)) {
      activeTabs.add(tabId);
      console.log('🎯 Tab updated - tracking:', tabId, tab.url);
    }
  }
});

// Monitor tab activation (simplified - less aggressive)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('🎯 Tab activated:', activeInfo.tabId);
  
  try {
    const activeTab = await chrome.tabs.get(activeInfo.tabId);
    
    // Skip if tab doesn't have a valid URL or is a chrome:// page
    if (!activeTab.url || activeTab.url.startsWith('chrome://')) {
      return;
    }
    
    const isSupportedPlatform = activeTab.url.includes('udemy.com') || 
                               activeTab.url.includes('youtube.com') || 
                               activeTab.url.includes('coursera.org');
    
    if (isSupportedPlatform && !activeTabs.has(activeInfo.tabId)) {
      // Add to active tabs if supported and not already tracked
      activeTabs.add(activeInfo.tabId);
      console.log('🎯 Added supported tab to tracking:', activeInfo.tabId);
    }
    // Don't clear data when switching to non-supported tabs - too aggressive
  } catch (error) {
    console.error('Error handling tab activation:', error);
    // Don't clear data on error - too aggressive
  }
});

// Monitor tab removal (simplified - less aggressive)
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  console.log('🎯 Tab removed:', tabId);
  
  if (activeTabs.has(tabId)) {
    activeTabs.delete(tabId);
    console.log('🎯 Removed tracked tab:', tabId);
    
    // Only clear data if no supported tabs remain
    if (activeTabs.size === 0) {
      console.log('🎯 No supported tabs remaining, clearing extension data...');
      await clearAllExtensionData();
    }
  }
});

// Monitor window focus changes (disabled - too aggressive)
// chrome.windows.onFocusChanged.addListener(async (windowId) => {
//   if (windowId === chrome.windows.WINDOW_ID_NONE) {
//     // Browser lost focus, clear data
//     console.log('🎯 Browser lost focus, clearing extension data...');
//     await clearAllExtensionData();
//   }
// });

// Function to clear all extension data
async function clearAllExtensionData() {
  // Prevent concurrent clearing operations
  if (isClearingData) {
    console.log('🎯 Already clearing data, skipping...');
    return;
  }

  isClearingData = true;
  
  try {
    console.log('🎯 Auto-clearing all extension data...');
    
    // Clear all storage data
    await chrome.storage.local.clear();
    
    // Clear any runtime data
    activeTabs.clear();
    
    // Update last cleanup time
    lastCleanupTime = Date.now();
    
    console.log('🎯 All extension data auto-cleared');
  } catch (error) {
    console.error('Error auto-clearing extension data:', error);
  } finally {
    isClearingData = false;
  }
}


// Setup periodic cleanup using chrome.alarms API (more efficient than setInterval)
chrome.runtime.onInstalled.addListener(() => {
  console.log('Transcript Extractor Extension installed');
  
  // Create alarm for periodic cleanup
  chrome.alarms.create('periodicCleanup', {
    delayInMinutes: 5,
    periodInMinutes: 5
  });
});

// Handle periodic cleanup alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'periodicCleanup') {
    // Prevent too frequent cleanup operations
    const now = Date.now();
    if (now - lastCleanupTime < 300000) { // 5 minutes
      console.log('🎯 Periodic cleanup: Skipping, too soon since last cleanup');
      return;
    }

    try {
      const tabs = await chrome.tabs.query({});
      const supportedTabs = tabs.filter(tab => 
        tab.url && (
          tab.url.includes('udemy.com') || 
          tab.url.includes('youtube.com') || 
          tab.url.includes('coursera.org')
        )
      );
      
      // Only clear data if no supported tabs exist AND we have tracked tabs
      if (supportedTabs.length === 0 && activeTabs.size > 0) {
        console.log('🎯 Periodic cleanup: No supported tabs found, clearing tracked tabs...');
        activeTabs.clear();
        
        // Only clear storage if it's been a while since last use
        const storageData = await chrome.storage.local.get();
        if (Object.keys(storageData).length > 0) {
          console.log('🎯 Periodic cleanup: Clearing old storage data...');
          await clearAllExtensionData();
        }
      }
    } catch (error) {
      console.error('Error in periodic cleanup:', error);
    }
  }
});

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
