// Background script for Transcript Extractor Extension

// Track active tabs to clean up data when they're closed
let activeTabs = new Set();

chrome.runtime.onInstalled.addListener(() => {
  console.log('Transcript Extractor Extension installed');
});

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
  
  sendResponse({ success: true });
});

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
    
    console.log('🎯 All extension data auto-cleared');
  } catch (error) {
    console.error('Error auto-clearing extension data:', error);
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
