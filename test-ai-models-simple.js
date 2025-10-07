// Simple AI Model Test Script
// Run this in the background script console to test AI model loading

console.log('🧪 Simple AI Model Test');
console.log('========================');

async function testAIModels() {
  console.log('1️⃣ Testing basic offscreen communication...');
  
  try {
    // Test basic communication
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
    
    console.log('✅ Basic communication working');
    
    console.log('2️⃣ Testing AI summarization...');
    
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
      
      // Wait up to 3 minutes for AI models to load
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        reject(new Error('AI test timeout - models may be loading'));
      }, 180000);
    });
    
    console.log('✅ AI summarization completed');
    console.log('Engine used:', aiResponse.engine);
    console.log('Success:', aiResponse.success);
    
    if (aiResponse.success) {
      console.log('Summary:', aiResponse.summary);
      console.log('Word count:', aiResponse.originalWordCount, '→', aiResponse.summaryWordCount);
      
      if (aiResponse.engine === 'webllm') {
        console.log('🎉 WebLLM is working!');
      } else if (aiResponse.engine === 'transformers-cpu') {
        console.log('🎉 Transformers.js is working!');
      } else if (aiResponse.engine === 'rule-based') {
        console.log('⚠️ Using rule-based fallback');
        console.log('💡 AI models failed to load, but fallback is working');
      }
    } else {
      console.log('❌ AI summarization failed:', aiResponse.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('💡 This suggests:');
      console.log('   - AI models are still loading (first time can take 2-5 minutes)');
      console.log('   - Network issues preventing model downloads');
      console.log('   - Browser compatibility problems');
      
      console.log('🔧 Try:');
      console.log('   1. Wait a bit longer (first load takes time)');
      console.log('   2. Check offscreen console for detailed errors');
      console.log('   3. Verify internet connection');
      console.log('   4. Check if WebGPU is enabled in chrome://flags');
    }
  }
}

// Run the test
testAIModels();

console.log('📋 Instructions:');
console.log('1. Open Chrome DevTools (F12)');
console.log('2. Go to Extensions tab');
console.log('3. Find "Transcript Extractor"');
console.log('4. Click "offscreen.html" to view offscreen console');
console.log('5. Watch for AI model loading messages');
console.log('6. Be patient - first load can take 2-5 minutes');
