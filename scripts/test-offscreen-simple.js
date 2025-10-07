// Simple offscreen communication test
// Copy and paste this into the background script console

console.log('🧪 Starting simple offscreen test...');

async function simpleTest() {
    try {
        // Test 1: Check if we can access offscreen documents
        console.log('1️⃣ Checking offscreen documents...');
        const contexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT']
        });
        
        if (contexts.length === 0) {
            console.log('❌ No offscreen documents found. Creating one...');
            
            try {
                await chrome.offscreen.createDocument({
                    url: 'offscreen.html',
                    reasons: ['WORKERS'],
                    justification: 'WebLLM AI processing for transcript summarization'
                });
                console.log('✅ Offscreen document created');
                
                // Check again
                const newContexts = await chrome.runtime.getContexts({
                    contextTypes: ['OFFSCREEN_DOCUMENT']
                });
                console.log('✅ Offscreen document confirmed:', newContexts[0].documentId);
                
            } catch (createError) {
                console.error('❌ Failed to create offscreen document:', createError);
                return;
            }
        } else {
            console.log('✅ Offscreen document exists:', contexts[0].documentId);
        }
        
        // Test 2: Send a simple message
        console.log('2️⃣ Testing message communication...');
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'CHECK_ENGINES'
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
        
        console.log('✅ Message response:', response);
        
        // Test 3: Test AI summarization
        console.log('3️⃣ Testing AI summarization...');
        const testTranscript = "This is a simple test transcript. It contains some educational content about web development and programming concepts.";
        
        const aiResponse = await new Promise((resolve, reject) => {
            const messageId = Date.now().toString();
            
            // Set up response listener
            const responseListener = (message) => {
                if (message.type === 'AI_SUMMARIZE_RESPONSE' && message.messageId === messageId) {
                    chrome.runtime.onMessage.removeListener(responseListener);
                    resolve(message);
                }
            };
            
            chrome.runtime.onMessage.addListener(responseListener);
            
            // Send AI request
            chrome.runtime.sendMessage({
                type: 'AI_SUMMARIZE',
                data: {
                    transcript: testTranscript,
                    options: {}
                },
                messageId: messageId
            }, (response) => {
                if (chrome.runtime.lastError) {
                    chrome.runtime.onMessage.removeListener(responseListener);
                    reject(new Error(chrome.runtime.lastError.message));
                }
            });
            
            // Timeout after 30 seconds
            setTimeout(() => {
                chrome.runtime.onMessage.removeListener(responseListener);
                reject(new Error('AI summarization timeout'));
            }, 30000);
        });
        
        console.log('✅ AI summarization response:', aiResponse);
        
        if (aiResponse.data && aiResponse.data.success) {
            console.log('🎉 SUCCESS! AI summarization is working');
            console.log('Engine used:', aiResponse.data.engine);
            console.log('Summary:', aiResponse.data.summary);
        } else {
            console.log('❌ AI summarization failed:', aiResponse.data?.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
simpleTest();
