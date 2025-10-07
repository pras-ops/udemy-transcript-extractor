// Diagnostic script for offscreen communication issues
// Run this in the Chrome extension console or as a content script

console.log('🔧 Starting offscreen communication diagnostics...');

async function diagnoseOffscreenCommunication() {
    const results = {
        extensionContext: false,
        backgroundScript: false,
        offscreenDocument: false,
        messagePassing: false,
        errors: []
    };

    try {
        // Test 1: Extension Context
        console.log('1️⃣ Testing extension context...');
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
            results.extensionContext = true;
            console.log('✅ Extension context valid:', chrome.runtime.id);
        } else {
            results.errors.push('Extension context not available');
            console.log('❌ Extension context invalid');
        }

        // Test 2: Background Script
        console.log('2️⃣ Testing background script...');
        try {
            const bgResponse = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ type: 'TEST_COMMUNICATION' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
            
            if (bgResponse) {
                results.backgroundScript = true;
                console.log('✅ Background script responding:', bgResponse);
            }
        } catch (error) {
            results.errors.push(`Background script error: ${error.message}`);
            console.log('❌ Background script failed:', error.message);
        }

        // Test 3: Offscreen Document
        console.log('3️⃣ Testing offscreen document...');
        try {
            const contexts = await chrome.runtime.getContexts({
                contextTypes: ['OFFSCREEN_DOCUMENT']
            });
            
            if (contexts.length > 0) {
                results.offscreenDocument = true;
                console.log('✅ Offscreen document exists:', contexts[0].documentId);
                
                // Test communication with offscreen document
                const offscreenResponse = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({ type: 'CHECK_ENGINES' }, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    });
                });
                
                if (offscreenResponse) {
                    results.messagePassing = true;
                    console.log('✅ Offscreen communication working:', offscreenResponse);
                }
                
            } else {
                results.errors.push('No offscreen document found');
                console.log('❌ No offscreen document found');
                
                // Try to create one
                try {
                    console.log('🔄 Attempting to create offscreen document...');
                    await chrome.offscreen.createDocument({
                        url: 'offscreen.html',
                        reasons: ['WORKERS'],
                        justification: 'WebLLM AI processing for transcript summarization'
                    });
                    
                    const newContexts = await chrome.runtime.getContexts({
                        contextTypes: ['OFFSCREEN_DOCUMENT']
                    });
                    
                    if (newContexts.length > 0) {
                        results.offscreenDocument = true;
                        console.log('✅ Offscreen document created successfully:', newContexts[0].documentId);
                    }
                    
                } catch (createError) {
                    results.errors.push(`Failed to create offscreen document: ${createError.message}`);
                    console.log('❌ Failed to create offscreen document:', createError.message);
                }
            }
        } catch (error) {
            results.errors.push(`Offscreen document error: ${error.message}`);
            console.log('❌ Offscreen document test failed:', error.message);
        }

        // Test 4: AI Summarization
        console.log('4️⃣ Testing AI summarization...');
        if (results.extensionContext && results.backgroundScript && results.offscreenDocument) {
            try {
                const testTranscript = "This is a test transcript for AI summarization. It contains educational content about web development and programming concepts.";
                
                const aiResponse = await new Promise((resolve, reject) => {
                    const messageId = Date.now().toString();
                    
                    const responseListener = (message) => {
                        if (message.type === 'AI_SUMMARIZE_RESPONSE' && message.messageId === messageId) {
                            chrome.runtime.onMessage.removeListener(responseListener);
                            resolve(message);
                        }
                    };
                    
                    chrome.runtime.onMessage.addListener(responseListener);
                    
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
                    
                    setTimeout(() => {
                        chrome.runtime.onMessage.removeListener(responseListener);
                        reject(new Error('AI summarization timeout'));
                    }, 30000);
                });
                
                console.log('✅ AI summarization successful:', aiResponse);
                
            } catch (error) {
                results.errors.push(`AI summarization error: ${error.message}`);
                console.log('❌ AI summarization failed:', error.message);
            }
        }

        // Summary
        console.log('\n📊 DIAGNOSTIC SUMMARY:');
        console.log('Extension Context:', results.extensionContext ? '✅' : '❌');
        console.log('Background Script:', results.backgroundScript ? '✅' : '❌');
        console.log('Offscreen Document:', results.offscreenDocument ? '✅' : '❌');
        console.log('Message Passing:', results.messagePassing ? '✅' : '❌');
        
        if (results.errors.length > 0) {
            console.log('\n❌ ERRORS FOUND:');
            results.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        } else {
            console.log('\n✅ All tests passed!');
        }

        return results;

    } catch (error) {
        console.error('❌ Diagnostic failed:', error);
        results.errors.push(`Diagnostic error: ${error.message}`);
        return results;
    }
}

// Run diagnostics
diagnoseOffscreenCommunication().then(results => {
    console.log('🔧 Diagnostics complete:', results);
    
    // Store results for external access
    window.offscreenDiagnosticResults = results;
});
