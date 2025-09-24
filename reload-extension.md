# How to Reload the Extension

The extension has been updated to remove all AI functionality and fix the CSP violations. To apply these changes:

## Steps to Reload the Extension:

1. **Open Chrome Extensions Page:**
   - Go to `chrome://extensions/`
   - Or click the three dots menu → More tools → Extensions

2. **Enable Developer Mode:**
   - Toggle the "Developer mode" switch in the top right corner

3. **Reload the Extension:**
   - Find "Transcript Extractor Extension" in the list
   - Click the "Reload" button (circular arrow icon) next to the extension

4. **Verify the Changes:**
   - The extension should now work without CSP violations
   - No more AI-related errors in the console
   - Only local processing will be available

## What Was Fixed:

✅ **Removed AI Dependencies:**
- Removed `@mlc-ai/web-llm` and `@xenova/transformers` from package.json
- Deleted offscreen.html and offscreen.js files
- Removed offscreen.ts source file

✅ **Updated Manifest:**
- Removed `offscreen` permission
- Removed `'wasm-unsafe-eval'` from CSP
- Removed AI-related host permissions
- Cleaned up web accessible resources

✅ **Cleaned Background Script:**
- Removed all AI processing code
- Removed offscreen document creation
- Simplified to only handle basic extension functionality

✅ **Updated AI Service:**
- Simplified to only use local fallback processing
- Removed all AI engine checks
- Updated UI to show privacy-first messaging

✅ **Fixed Build Configuration:**
- Removed offscreen entry from vite.config.ts
- Cleaned up external dependencies

## Expected Behavior:

- ✅ No more CSP violations
- ✅ No more blob script errors
- ✅ No more AI-related console errors
- ✅ Extension works with local processing only
- ✅ Privacy-first approach with no external AI calls

The extension should now work smoothly without any AI-related errors!
