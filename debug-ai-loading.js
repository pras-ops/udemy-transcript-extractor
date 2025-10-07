// Debug script to test AI model loading in offscreen document
// Run this in the background script console to diagnose AI loading issues

console.log('🔍 AI Loading Debug Script');
console.log('============================');

async function debugAILoading() {
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
      
      // Timeout for test
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        reject(new Error('Test communication timeout'));
      }, 5000);
    });
    
    console.log('✅ Basic communication working:', testResponse);
    
    console.log('2️⃣ Testing AI model initialization...');
    
    // Test AI summarization with a simple transcript
    const testTranscript = "This is a test transcript about web development. In this lesson, we will learn about HTML, CSS, and JavaScript. The first step is to understand the basics of HTML markup. Next, we will cover CSS styling techniques. Finally, we will learn JavaScript programming concepts.";
    
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
      
      // Longer timeout for AI initialization
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        reject(new Error('AI initialization timeout after 2 minutes'));
      }, 120000); // 2 minutes
    });
    
    console.log('✅ AI summarization completed:', aiResponse);
    
    if (aiResponse.success) {
      console.log('🎉 SUCCESS! AI models are working');
      console.log('Engine used:', aiResponse.engine);
      console.log('Summary:', aiResponse.summary);
      console.log('Word count:', aiResponse.originalWordCount, '→', aiResponse.summaryWordCount);
      
      if (aiResponse.engine === 'webllm') {
        console.log('🚀 WebLLM is working (GPU accelerated)');
      } else if (aiResponse.engine === 'transformers-cpu') {
        console.log('💻 Transformers.js is working (CPU)');
      } else if (aiResponse.engine === 'rule-based') {
        console.log('⚠️ Using rule-based fallback (AI models failed)');
        console.log('💡 This means AI models are not loading properly');
      }
    } else {
      console.log('❌ AI summarization failed:', aiResponse.error);
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    
    if (error.message.includes('timeout')) {
      console.log('💡 This indicates:');
      console.log('   - Offscreen document is not responding');
      console.log('   - AI models are taking too long to initialize');
      console.log('   - Network issues preventing model downloads');
      console.log('   - Browser compatibility issues');
      
      console.log('🔧 Troubleshooting steps:');
      console.log('   1. Check offscreen document console for errors');
      console.log('   2. Verify internet connection for model downloads');
      console.log('   3. Check if WebGPU is enabled in chrome://flags');
      console.log('   4. Try refreshing the extension');
    }
  }
}

// Run the debug test
debugAILoading();

console.log('📋 Debug instructions:');
console.log('1. Open Chrome DevTools (F12)');
console.log('2. Go to Extensions tab');
console.log('3. Find "Transcript Extractor"');
console.log('4. Click "offscreen.html" to view offscreen console');
console.log('5. Look for AI model loading messages there');
console.log('6. Check for any error messages during initialization');
