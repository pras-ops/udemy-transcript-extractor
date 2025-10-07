// Test script based on Bug #16 fix from COMPREHENSIVE_PROJECT_LEARNING_DOCUMENT.md
// This tests the exact communication pattern that was documented as working

console.log('🧪 Testing Bug #16 fix implementation...');

async function testBug16Fix() {
    try {
        console.log('1️⃣ Testing offscreen document communication...');
        
        // Test the exact pattern from Bug #16 fix
        const testTranscript = "This is a test transcript for the Bug #16 fix. It contains educational content about web development and programming concepts that should be summarized by the AI.";
        
        const response = await new Promise((resolve, reject) => {
            const messageId = Date.now().toString();
            
            // Set up a one-time listener for the response (Bug #16 pattern)
            const messageListener = (message, sender, sendResponse) => {
                if (message.type === 'AI_SUMMARIZE_RESPONSE' && message.messageId === messageId) {
                    console.log('✅ Background: Received AI_SUMMARIZE_RESPONSE:', message);
                    chrome.runtime.onMessage.removeListener(messageListener);
                    resolve(message.data);
                }
            };
            
            chrome.runtime.onMessage.addListener(messageListener);
            
            // Send the message to offscreen document
            chrome.runtime.sendMessage({
                type: 'AI_SUMMARIZE',
                data: {
                    transcript: testTranscript,
                    options: {}
                },
                messageId: messageId,
                timestamp: Date.now()
            }).catch(reject);
            
            // Set a timeout to prevent hanging (30 seconds as per Bug #16 fix)
            setTimeout(() => {
                chrome.runtime.onMessage.removeListener(messageListener);
                reject(new Error('Timeout waiting for offscreen response'));
            }, 30000);
        });
        
        console.log('2️⃣ Response received:', response);
        
        if (response.success) {
            console.log('🎉 SUCCESS! Bug #16 fix is working');
            console.log('Engine used:', response.engine);
            console.log('Summary:', response.summary);
            console.log('Word count:', response.originalWordCount, '→', response.summaryWordCount);
            
            // Check if it's using AI engines instead of local processing
            if (response.engine === 'webllm' || response.engine === 'transformers-cpu') {
                console.log('✅ AI engines are working correctly');
            } else if (response.engine === 'rule-based') {
                console.log('⚠️ Using rule-based fallback (AI engines may not be available)');
            } else {
                console.log('❌ Unexpected engine:', response.engine);
            }
        } else {
            console.log('❌ AI summarization failed:', response.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        
        if (error.message.includes('Timeout')) {
            console.log('💡 This indicates the offscreen document is not responding');
            console.log('💡 Check if the offscreen document is properly loaded');
        }
    }
}

// Run the test
testBug16Fix();

console.log('🔧 If you see "SUCCESS!" above, the Bug #16 fix is working correctly!');
console.log('🔧 If you see errors, follow the debug guide in OFFSCREEN_DEBUG_GUIDE.md');
