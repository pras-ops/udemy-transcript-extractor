// Debug script to test offscreen document response
// Run this in the background script console to diagnose why offscreen isn't responding

console.log('🔍 Offscreen Response Debug');
console.log('============================');

async function debugOffscreenResponse() {
  try {
    console.log('1️⃣ Testing basic offscreen communication...');
    
    // Test basic communication first
    const testResponse = await new Promise((resolve, reject) => {
      const messageId = 'test-' + Date.now();
      
      const listener = (message, sender, sendResponse) => {
        if (message.type === 'TEST_COMMUNICATION' && message.messageId === messageId) {
          chrome.runtime.onMessage.removeListener(listener);
          resolve(message.data);
        }
      };
      
      chrome.runtime.onMessage.addListener(listener);
      
      chrome.runtime.sendMessage({
        type: 'TEST_COMMUNICATION',
        messageId: messageId
      }).catch(reject);
      
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        reject(new Error('Test communication timeout'));
      }, 10000);
    });
    
    console.log('✅ Basic communication working:', testResponse);
    
    console.log('2️⃣ Testing offscreen status...');
    
    // Test offscreen status
    const statusResponse = await new Promise((resolve, reject) => {
      const messageId = 'status-' + Date.now();
      
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
        reject(new Error('Status request timeout'));
      }, 10000);
    });
    
    console.log('✅ Offscreen status:', statusResponse);
    
    console.log('3️⃣ Testing AI summarization with monitoring...');
    
    // Test AI summarization with detailed monitoring
    const testTranscript = "This is a test transcript about programming. We will learn about JavaScript, HTML, and CSS. The first step is to understand variables and functions. Next, we will cover DOM manipulation. Finally, we will learn about event handling.";
    
    // Monitor all messages during AI test
    const messageMonitor = (message, sender, sendResponse) => {
      console.log('📨 Message received during AI test:', message.type, 'from:', sender.contextType || 'unknown');
      
      if (message.type === 'AI_SUMMARIZE_RESPONSE') {
        console.log('🎯 AI Response received:', message.data);
      } else if (message.type === 'TRANSFORMERS_LOAD_PROGRESS') {
        console.log('📊 Transformers progress:', message.progress);
      }
    };
    
    chrome.runtime.onMessage.addListener(messageMonitor);
    
    const aiResponse = await new Promise((resolve, reject) => {
      const messageId = 'ai-test-' + Date.now();
      
      const listener = (message, sender, sendResponse) => {
        if (message.type === 'AI_SUMMARIZE_RESPONSE' && message.messageId === messageId) {
          chrome.runtime.onMessage.removeListener(listener);
          chrome.runtime.onMessage.removeListener(messageMonitor);
          resolve(message.data);
        }
      };
      
      chrome.runtime.onMessage.addListener(listener);
      
      chrome.runtime.sendMessage({
        type: 'AI_SUMMARIZE',
        data: {
          transcript: testTranscript,
          options: {}
        },
        messageId: messageId
      }).catch(reject);
      
      // Wait up to 2 minutes for AI response
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        chrome.runtime.onMessage.removeListener(messageMonitor);
        reject(new Error('AI test timeout after 2 minutes'));
      }, 120000);
    });
    
    console.log('✅ AI summarization completed:', aiResponse);
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('💡 This suggests:');
      console.log('   - Offscreen document is not responding to requests');
      console.log('   - AI models are stuck in loading');
      console.log('   - Message passing is broken');
      
      console.log('🔧 Next steps:');
      console.log('   1. Open Chrome DevTools (F12)');
      console.log('   2. Go to Extensions tab');
      console.log('   3. Find "Transcript Extractor"');
      console.log('   4. Click "offscreen.html" to view offscreen console');
      console.log('   5. Look for error messages or stuck processes');
    }
  }
}

// Run the debug
debugOffscreenResponse();

console.log('📋 Instructions:');
console.log('1. Watch the console output above');
console.log('2. Check if offscreen document responds to basic communication');
console.log('3. Monitor AI processing messages');
console.log('4. If timeouts occur, check offscreen console for errors');
console.log('5. Look for any stuck AI model loading processes');
