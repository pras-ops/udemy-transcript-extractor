// Script to check what's happening in the offscreen document
// Run this in the background script console

console.log('🔍 Offscreen Console Diagnostic');
console.log('=================================');

// Function to check offscreen document status
async function checkOffscreenStatus() {
  try {
    console.log('1️⃣ Checking offscreen document contexts...');
    
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    
    console.log('📋 Offscreen contexts found:', contexts.length);
    contexts.forEach((context, index) => {
      console.log(`   ${index + 1}. Context ID: ${context.contextId}`);
      console.log(`      Document URL: ${context.documentUrl}`);
    });
    
    console.log('2️⃣ Sending test message to offscreen document...');
    
    // Send a test message to see if offscreen is responding
    const testResponse = await new Promise((resolve, reject) => {
      const messageId = 'status-test-' + Date.now();
      
      const listener = (message, sender, sendResponse) => {
        if (message.type === 'OFFSCREEN_STATUS' && message.messageId === messageId) {
          chrome.runtime.onMessage.removeListener(listener);
          resolve(message.data);
        }
      };
      
      chrome.runtime.onMessage.addListener(listener);
      
      chrome.runtime.sendMessage({
        type: 'OFFSCREEN_STATUS_REQUEST',
        messageId: messageId
      }).catch(reject);
      
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        reject(new Error('Status check timeout'));
      }, 10000);
    });
    
    console.log('✅ Offscreen status response:', testResponse);
    
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('💡 This suggests the offscreen document is not responding');
      console.log('💡 The AI models might be stuck in loading or failed silently');
    }
  }
}

// Function to monitor progress messages
function monitorProgress() {
  console.log('3️⃣ Setting up progress monitor...');
  
  let progressCount = 0;
  const progressListener = (message, sender, sendResponse) => {
    if (message.type === 'TRANSFORMERS_LOAD_PROGRESS') {
      progressCount++;
      console.log(`📊 Progress message ${progressCount}:`, message.progress);
      
      // Stop monitoring after 10 progress messages
      if (progressCount >= 10) {
        chrome.runtime.onMessage.removeListener(progressListener);
        console.log('✅ Progress monitoring completed (10 messages received)');
      }
    }
  };
  
  chrome.runtime.onMessage.addListener(progressListener);
  
  // Stop monitoring after 30 seconds
  setTimeout(() => {
    chrome.runtime.onMessage.removeListener(progressListener);
    console.log(`📊 Progress monitoring stopped. Total messages: ${progressCount}`);
    
    if (progressCount === 0) {
      console.log('⚠️ No progress messages received - AI models may not be loading');
    } else if (progressCount < 5) {
      console.log('⚠️ Few progress messages - AI models may be loading slowly');
    } else {
      console.log('✅ Good progress - AI models are loading normally');
    }
  }, 30000);
}

// Run the diagnostic
checkOffscreenStatus();
monitorProgress();

console.log('📋 Next Steps:');
console.log('1. Watch for progress messages above');
console.log('2. Open Chrome DevTools (F12)');
console.log('3. Go to Extensions tab');
console.log('4. Find "Transcript Extractor"');
console.log('5. Click on "offscreen.html" link');
console.log('6. Check the console there for detailed AI loading messages');
console.log('7. Look for any error messages or warnings');

console.log('🔧 If AI models are still not working:');
console.log('   - Check if WebGPU is enabled in chrome://flags');
console.log('   - Verify internet connection is stable');
console.log('   - Try refreshing the extension');
console.log('   - Check browser console for any errors');
