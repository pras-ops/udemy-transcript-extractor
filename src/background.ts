// Background script for Chrome Extension
// Handles basic extension lifecycle and communication

declare const chrome: any;

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🎯 Background: Extension startup');
});

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details: any) => {
  console.log('🎯 Background: Extension installed/updated:', details.reason);
});

console.log('🎯 Background: Background Service Worker loaded');
