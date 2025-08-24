// Background script for Transcript Extractor Extension

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
  sendResponse({ success: true });
});
