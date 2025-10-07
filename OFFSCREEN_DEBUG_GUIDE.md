# 🔧 Offscreen Communication Debug Guide

## 🚨 **Current Issue**
The offscreen document communication is still failing after the fixes. Follow this guide to diagnose and resolve the issue.

## 📋 **Step-by-Step Debugging**

### **Step 1: Load the Updated Extension**
1. Go to `chrome://extensions/`
2. Find "Transcript Extractor" extension
3. Click the **reload/refresh** button (🔄) to load the updated version
4. Make sure the extension is **enabled**

### **Step 2: Check Background Script**
1. Open Chrome DevTools (`F12`)
2. Go to **Extensions** tab in DevTools
3. Find "Transcript Extractor" in the list
4. Click **"background page"** link
5. Check the console for these messages:
   ```
   ✅ Background: Background script initialized
   ✅ Background: Setting up message handlers...
   ✅ Background: Ensuring offscreen document exists...
   ```

### **Step 3: Check Offscreen Document**
1. In the background script console, look for:
   ```
   ✅ Background: Offscreen document already exists
   ✅ Background: Offscreen document created successfully
   ✅ Background: Offscreen document is ready
   ```
2. If you see errors, note them down

### **Step 4: Test Communication**
1. Go to any Udemy course page
2. Open the extension popup
3. Open DevTools (`F12`) and go to **Console** tab
4. Try to extract a transcript with AI summarization
5. Watch for these messages:
   ```
   🎯 AI Service: Sending message to background script...
   🎯 Background: Handling AI summarize request...
   🎯 Offscreen: Received message: AI_SUMMARIZE
   ```

### **Step 5: Manual Test**
If the automatic test fails, try this manual test in the background script console:

```javascript
// Test 1: Check extension context
console.log('Extension ID:', chrome.runtime.id);

// Test 2: Check offscreen documents
chrome.runtime.getContexts({contextTypes: ['OFFSCREEN_DOCUMENT']}).then(contexts => {
  console.log('Offscreen contexts:', contexts);
});

// Test 3: Send test message
chrome.runtime.sendMessage({type: 'TEST_COMMUNICATION'}, response => {
  console.log('Test response:', response);
});

// Test 4: Try AI summarization
chrome.runtime.sendMessage({
  type: 'AI_SUMMARIZE',
  data: {
    transcript: 'This is a test transcript for debugging.',
    options: {}
  },
  messageId: Date.now().toString()
}, response => {
  console.log('AI response:', response);
});
```

## 🔍 **Common Issues and Solutions**

### **Issue 1: "Offscreen document not available"**
**Cause**: Offscreen document failed to create or was closed
**Solution**: 
1. Check if `offscreen.html` exists in the `dist/` folder
2. Verify manifest permissions include `"offscreen"`
3. Reload the extension

### **Issue 2: "Message passing failed"**
**Cause**: Communication between background and offscreen is broken
**Solution**:
1. Check background script console for errors
2. Verify offscreen document is loaded
3. Check for CSP (Content Security Policy) violations

### **Issue 3: "AI summarization timeout"**
**Cause**: Offscreen document is not responding to AI requests
**Solution**:
1. Check if WebLLM/Transformers.js models are loading
2. Verify WASM files are accessible
3. Check for memory/resource constraints

### **Issue 4: "Extension context not available"**
**Cause**: Code is running outside extension context
**Solution**:
1. Ensure code is running in extension popup or content script
2. Check if `chrome.runtime.id` is available

## 🛠️ **Advanced Debugging**

### **Check File Structure**
Ensure these files exist in `dist/`:
```
dist/
├── offscreen.html
├── offscreen.js
├── background.js
├── manifest.json
├── wasm/
│   ├── ort-wasm.wasm
│   ├── ort-wasm-threaded.wasm
│   ├── ort-wasm-simd.wasm
│   └── ort-wasm-simd-threaded.wasm
└── models/
    └── Xenova/
        └── distilbart-cnn-6-6/
            ├── config.json
            └── ...
```

### **Check Manifest Permissions**
Verify `manifest.json` includes:
```json
{
  "permissions": [
    "activeTab",
    "storage",
    "scripting",
    "offscreen",
    "alarms",
    "unlimitedStorage"
  ],
  "offscreen": {
    "reasons": ["WORKERS"],
    "justification": "WebLLM AI processing for transcript summarization"
  }
}
```

### **Check Content Security Policy**
Verify CSP allows necessary resources:
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; object-src 'self'; connect-src 'self' ...;"
  }
}
```

## 📞 **Getting Help**

If the issue persists:

1. **Collect Debug Information**:
   - Screenshot of background script console
   - Screenshot of extension popup console
   - List of error messages

2. **Test Environment**:
   - Chrome version
   - Operating system
   - Extension version

3. **Reproduction Steps**:
   - Exact steps to reproduce the issue
   - What you expected to happen
   - What actually happened

## 🔧 **Quick Fixes to Try**

1. **Reload Extension**: Click reload button in `chrome://extensions/`
2. **Restart Chrome**: Close and reopen Chrome completely
3. **Clear Extension Data**: Go to `chrome://extensions/` → Extension details → Storage → Clear
4. **Disable/Enable**: Toggle the extension off and on
5. **Check WebGPU**: Go to `chrome://flags/#enable-unsafe-webgpu` and enable it

## 📝 **Expected Behavior After Fix**

When working correctly, you should see:
1. Background script loads without errors
2. Offscreen document creates successfully
3. AI summarization completes within 30 seconds
4. Summary appears in the extension popup
5. Console shows success messages

---

**Note**: This guide assumes you're testing on a Udemy course page with the extension loaded and enabled.
