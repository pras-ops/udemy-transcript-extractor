// Test script for duplicate request fix
// Run this in the background script console to test the duplicate request handling

console.log('🧪 Duplicate Request Fix Test');
console.log('==============================');

async function testDuplicateFix() {
  try {
    console.log('1️⃣ Testing single AI request...');
    
    // Test with a simple transcript
    const testTranscript = "This is a test transcript about programming. We will learn about JavaScript, HTML, and CSS. The first step is to understand variables and functions. Next, we will cover DOM manipulation. Finally, we will learn about event handling.";
    
    const singleResponse = await new Promise((resolve, reject) => {
      const messageId = 'single-test-' + Date.now();
      
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
      
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        reject(new Error('Single request timeout'));
      }, 300000); // 5 minutes
    });
    
    console.log('✅ Single request completed:', singleResponse.success);
    
    console.log('2️⃣ Testing duplicate requests...');
    
    // Test multiple rapid requests to trigger duplicate handling
    const duplicateRequests = [];
    
    for (let i = 0; i < 3; i++) {
      const duplicateResponse = new Promise((resolve, reject) => {
        const messageId = 'duplicate-test-' + Date.now() + '-' + i;
        
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
        
        setTimeout(() => {
          chrome.runtime.onMessage.removeListener(listener);
          reject(new Error('Duplicate request timeout'));
        }, 30000); // 30 seconds
      });
      
      duplicateRequests.push(duplicateResponse);
    }
    
    // Wait for all duplicate requests
    const duplicateResults = await Promise.allSettled(duplicateRequests);
    
    console.log('📊 Duplicate request results:');
    duplicateResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`   Request ${index + 1}:`, result.value.success ? 'Success' : 'Failed - ' + result.value.error);
      } else {
        console.log(`   Request ${index + 1}:`, 'Timeout/Error');
      }
    });
    
    // Count successes and duplicates
    const successes = duplicateResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const duplicates = duplicateResults.filter(r => r.status === 'fulfilled' && !r.value.success && r.value.error === 'Already processing another request').length;
    
    console.log('📈 Results summary:');
    console.log(`   Successful requests: ${successes}`);
    console.log(`   Duplicate rejections: ${duplicates}`);
    console.log(`   Timeouts/Errors: ${duplicateResults.length - successes - duplicates}`);
    
    if (successes === 1 && duplicates >= 1) {
      console.log('🎉 SUCCESS! Duplicate request handling is working correctly');
      console.log('✅ Only one request was processed, others were properly rejected');
    } else if (successes > 1) {
      console.log('⚠️ WARNING: Multiple requests were processed simultaneously');
      console.log('💡 This suggests the duplicate handling may not be working properly');
    } else {
      console.log('❌ No successful requests - check for other issues');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('💡 This suggests:');
      console.log('   - AI models are still loading (first time can take 3-5 minutes)');
      console.log('   - Background script is not responding');
      console.log('   - Offscreen document communication is broken');
    }
  }
}

// Run the test
testDuplicateFix();

console.log('📋 What this test does:');
console.log('1. Sends a single AI request to test basic functionality');
console.log('2. Sends 3 rapid duplicate requests to test duplicate handling');
console.log('3. Verifies that only one request is processed');
console.log('4. Confirms that duplicate requests are properly rejected');

console.log('📋 Expected results:');
console.log('- Single request: Should succeed');
console.log('- Duplicate requests: Should have 1 success + 2 rejections');
console.log('- All rejections should show "Already processing another request"');
