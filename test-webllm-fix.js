// Test script for WebLLM fixes
// Run this in the background script console to test the updated WebLLM implementation

console.log('🧪 WebLLM Fix Test');
console.log('==================');

async function testWebLLMFix() {
  console.log('1️⃣ Testing offscreen communication...');
  
  try {
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
        reject(new Error('Test timeout'));
      }, 10000);
    });
    
    console.log('✅ Basic communication working:', testResponse);
    
    console.log('2️⃣ Testing AI summarization with updated WebLLM...');
    
    // Test with a simple transcript
    const testTranscript = "This is a test transcript about programming. We will learn about JavaScript, HTML, and CSS. The first step is to understand variables and functions. Next, we will cover DOM manipulation. Finally, we will learn about event handling.";
    
    const aiResponse = await new Promise((resolve, reject) => {
      const messageId = 'ai-test-' + Date.now();
      
      const listener = (message, sender, sendResponse) => {
        if (message.type === 'AI_SUMMARIZE_RESPONSE' && message.messageId === messageId) {
          chrome.runtime.onMessage.removeListener(listener);
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
      
      // Wait up to 5 minutes for AI models to load (first time can take longer)
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        reject(new Error('AI test timeout - models may still be loading'));
      }, 300000); // 5 minutes
    });
    
    console.log('✅ AI summarization completed');
    console.log('Engine used:', aiResponse.engine);
    console.log('Success:', aiResponse.success);
    
    if (aiResponse.success) {
      console.log('Summary:', aiResponse.summary);
      console.log('Word count:', aiResponse.originalWordCount, '→', aiResponse.summaryWordCount);
      
      if (aiResponse.engine === 'webllm') {
        console.log('🎉 WebLLM is working with updated implementation!');
        console.log('✅ Using Llama-3-2-3B-Instruct model');
      } else if (aiResponse.engine === 'transformers-cpu') {
        console.log('🎉 Transformers.js is working as fallback!');
      } else if (aiResponse.engine === 'rule-based') {
        console.log('⚠️ Using enhanced rule-based fallback');
        console.log('💡 AI models failed to load, but fallback is working');
      }
    } else {
      console.log('❌ AI summarization failed:', aiResponse.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('💡 This suggests:');
      console.log('   - AI models are still loading (first time can take 3-5 minutes)');
      console.log('   - Network issues preventing model downloads');
      console.log('   - Browser compatibility problems');
      
      console.log('🔧 Troubleshooting steps:');
      console.log('   1. Wait longer (first load takes time)');
      console.log('   2. Check offscreen console for detailed errors');
      console.log('   3. Verify internet connection');
      console.log('   4. Check if WebGPU is enabled in chrome://flags');
      console.log('   5. Try refreshing the extension');
    }
  }
}

// Run the test
testWebLLMFix();

console.log('📋 What was fixed:');
console.log('1. Updated WebLLM model to Llama-3-2-3B-Instruct (recommended)');
console.log('2. Fixed WebLLM API usage (chat.completions.create)');
console.log('3. Simplified configuration for better compatibility');
console.log('4. Removed problematic settings that caused failures');
console.log('5. Enhanced error handling and fallbacks');

console.log('📋 Instructions:');
console.log('1. Open Chrome DevTools (F12)');
console.log('2. Go to Extensions tab');
console.log('3. Find "Transcript Extractor"');
console.log('4. Click "offscreen.html" to view offscreen console');
console.log('5. Watch for AI model loading messages');
console.log('6. Be patient - first load can take 3-5 minutes');
