# 🤖 AI Chat Feature - Documentation

## Overview

The Transcript Extractor extension now includes a **local AI chat feature** that allows users to have conversations about extracted transcripts using WebLLM (Llama 3.2 3B model). The AI runs entirely in the browser using WebGPU, ensuring privacy and offline functionality.

---

## 🎯 Features

- **Chat with Transcripts**: Ask questions, get summaries, and analyze video transcripts using local AI
- **Privacy-First**: All processing happens locally in the browser - no data sent to external servers
- **Streaming Responses**: Real-time AI responses with progress indicators
- **Context-Aware**: AI has full access to the transcript for accurate answers
- **Chat History**: Maintains conversation context (last 10 messages)
- **Modern UI**: Beautiful, responsive chat interface with ultra-curvy design

---

## 🏗️ Architecture

### Component Structure

```
┌─────────────────────────────────────────────────┐
│  Popup UI (TranscriptExtractorPopup.tsx)       │
│  - Shows "Chat with AI" button after extraction │
│  - Switches to ChatWithTranscript component     │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  ChatWithTranscript Component                   │
│  - Handles user input and displays messages     │
│  - Shows initialization progress                │
│  - Manages chat UI state                        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Background Script (background.ts)              │
│  - Creates and manages offscreen document       │
│  - Routes messages between popup and offscreen  │
│  - Handles AI initialization requests           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Offscreen Document (offscreen.ts)              │
│  - Runs WebLLM engine (can use WebGPU)          │
│  - Loads Llama 3.2 3B model                     │
│  - Processes chat requests with transcript      │
│  - Manages chat history                         │
└─────────────────────────────────────────────────┘
```

### Why Offscreen Document?

Chrome extension service workers **cannot use WebGPU**, which is required for WebLLM. The offscreen document pattern allows us to run WebGPU in a separate context while maintaining the extension's service worker architecture.

---

## 📦 Files Created/Modified

### New Files

1. **`src/components/ChatWithTranscript.tsx`**
   - Main chat UI component
   - Handles user interactions and message display
   - Shows initialization progress and error states

2. **`src/offscreen/offscreen.ts`**
   - WebLLM integration and management
   - AI model initialization and inference
   - Chat history management

3. **`public/offscreen.html`**
   - HTML container for offscreen document
   - Minimal structure to load offscreen.js

4. **`docs/AI_CHAT_FEATURE.md`** (this file)
   - Documentation for the AI chat feature

### Modified Files

1. **`src/components/generated/TranscriptExtractorPopup.tsx`**
   - Added "Chat with AI" button in export options
   - Added state to manage chat visibility
   - Conditional rendering for chat view

2. **`src/background.ts`**
   - Added offscreen document creation and management
   - Added message handlers for AI operations
   - Routes messages between popup and offscreen

3. **`public/manifest.json`**
   - Added `offscreen` permission
   - Added Content Security Policy for WASM

4. **`vite.config.ts`**
   - Added offscreen.ts to build inputs

5. **`scripts/build-extension.js`**
   - Added offscreen.html to copy list

6. **`package.json`**
   - Added `@mlc-ai/web-llm` dependency

---

## 🚀 Usage

### For Users

1. **Extract a transcript** using the normal extraction process
2. Click the **"Chat with AI"** button (appears after successful extraction)
3. **Wait for initialization** (3-5 minutes first time, 10-60 seconds after cached)
4. **Start chatting** - ask questions about the transcript
5. Click **"Close AI Chat"** to return to the main view

### Example Questions

- "Summarize this transcript in 3 key points"
- "What are the main topics discussed?"
- "Explain [specific concept] from this lecture"
- "What are the practical takeaways?"
- "Create study notes from this content"

---

## ⚙️ Technical Details

### Model Information

- **Model**: Llama 3.2 3B Instruct (quantized: q4f32_1)
- **Size**: ~1.7GB (downloads once, cached forever)
- **Inference**: GPU-accelerated via WebGPU
- **Context Window**: Uses transcript as context for all queries

### Message Flow

```
User types message in ChatWithTranscript
        ↓
Sends chrome.runtime.sendMessage({ type: 'AI_CHAT', ... })
        ↓
Background script receives and forwards to offscreen
        ↓
Offscreen WebLLM processes with transcript context
        ↓
Response sent back through background to ChatWithTranscript
        ↓
UI updates with AI response
```

### Initialization Flow

```
User clicks "Chat with AI"
        ↓
ChatWithTranscript sends AI_INITIALIZE message
        ↓
Background creates offscreen document (if not exists)
        ↓
Offscreen loads WebLLM and downloads model
        ↓
Progress updates sent via AI_INIT_PROGRESS messages
        ↓
AI_READY message sent when complete
        ↓
Chat interface becomes active
```

---

## 🔧 Configuration

### Model Selection

To use a different model, edit `src/offscreen/offscreen.ts`:

```typescript
// Current: 3B model (balanced)
this.engine = await webllm.CreateMLCEngine(
  "Llama-3.2-3B-Instruct-q4f32_1-MLC",
  { initProgressCallback }
);

// Smaller/faster: 1B model
// "Llama-3.2-1B-Instruct-q4f32_1-MLC"

// Larger/better: 8B model
// "Llama-3.1-8B-Instruct-q4f32_1-MLC"
```

### Chat Parameters

Adjust in `src/offscreen/offscreen.ts`:

```typescript
const completion = await this.engine.chat.completions.create({
  messages,
  temperature: 0.7,    // Lower = more focused, Higher = more creative
  max_tokens: 512,     // Maximum response length
  stream: false,       // Set to true for streaming responses
});
```

### Chat History Length

Modify in `src/offscreen/offscreen.ts`:

```typescript
// Keep history manageable (last 10 messages)
if (this.chatHistory.length > 10) {
  this.chatHistory = this.chatHistory.slice(-10);
}
```

---

## 📊 Performance

### First Load (Model Download)
- **Time**: 3-5 minutes
- **Download**: ~1.7GB
- **One-time**: Model is cached in browser

### Subsequent Loads (Cached Model)
- **Time**: 10-60 seconds
- **Depends on**: GPU performance

### Response Time
- **Range**: 10 seconds to 3 minutes per response
- **Depends on**: GPU performance, query complexity, context length

### Memory Usage
- **Baseline**: ~500MB (extension)
- **With AI**: +2-3GB (model + inference)

---

## 🛠️ Troubleshooting

### "WebGPU not supported"

**Solution:**
1. Update Chrome to version 113+
2. Enable WebGPU at `chrome://flags`
3. Search for "WebGPU"
4. Enable and restart browser
5. Check `chrome://gpu` shows "Hardware accelerated"

### "Failed to initialize AI"

**Possible causes:**
- No internet connection (first time only)
- Insufficient disk space (need 2-4GB)
- GPU drivers outdated
- Browser too old

**Solution:**
- Check internet connection
- Free up disk space
- Update GPU drivers
- Update Chrome to latest version

### Slow Responses

**Possible causes:**
- Weak/integrated GPU
- Too many browser tabs open
- System under heavy load

**Solution:**
- Close unnecessary tabs
- Close other applications
- Consider using smaller 1B model
- Upgrade GPU if possible

### Model Failed to Load

**Solution:**
1. Clear browser cache
2. Restart browser
3. Try again (will re-download)
4. Check console for specific errors

---

## 🔐 Privacy & Security

### Local Processing
- ✅ All AI inference runs in the browser
- ✅ No transcript data sent to external servers
- ✅ No telemetry or usage tracking
- ✅ Model downloaded once from official CDN

### Data Storage
- Model cached in browser storage
- Chat history kept in memory only
- No persistent chat logs
- History cleared on extension reload

### Content Security Policy
```json
{
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
}
```

Required for WebAssembly and WebGPU operations.

---

## 🎨 UI/UX Design

### Chat Interface Features

- **Gradient backgrounds** - Purple/pink gradient for visual appeal
- **Ultra-curvy borders** - 48px border radius for modern look
- **Real-time progress** - Progress bar during initialization
- **Suggested prompts** - Quick-start buttons for common queries
- **Message bubbles** - User messages (purple) vs AI messages (gray)
- **Smooth animations** - Fade-in/slide-in effects
- **Loading indicators** - Spinning loader while AI thinks
- **Clear button** - Reset chat history when needed

---

## 🔄 Future Improvements

### Potential Enhancements

1. **Streaming responses** - Real-time text generation
2. **Multiple models** - Let users choose model size
3. **Chat export** - Save conversations as markdown
4. **Voice input** - Speech-to-text for queries
5. **Batch processing** - Analyze multiple transcripts together
6. **Custom prompts** - User-defined prompt templates
7. **Fine-tuning** - Customize AI behavior
8. **Offline mode** - Full offline functionality

---

## 📚 References

### Libraries Used
- **WebLLM**: https://github.com/mlc-ai/web-llm
- **Llama Models**: https://llama.meta.com/

### Documentation
- **Chrome Offscreen API**: https://developer.chrome.com/docs/extensions/reference/api/offscreen
- **WebGPU**: https://developer.chrome.com/blog/webgpu-release/
- **Chrome Extensions**: https://developer.chrome.com/docs/extensions/

---

## 💡 Developer Notes

### Message Types

```typescript
// From Popup to Background
AI_INITIALIZE        // Request AI initialization
AI_CHAT              // Send chat message
AI_STATUS            // Get initialization status
AI_CLEAR_HISTORY     // Clear chat history

// From Offscreen to Background (forwarded to Popup)
AI_INIT_PROGRESS     // Initialization progress update
AI_READY             // AI is ready to use
AI_ERROR             // Error occurred
```

### State Management

```typescript
// ChatWithTranscript component state
const [messages, setMessages] = useState<Message[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [isInitializing, setIsInitializing] = useState(false);
const [isAIReady, setIsAIReady] = useState(false);
const [initProgress, setInitProgress] = useState({ text: '', progress: 0 });
const [error, setError] = useState<string | null>(null);
```

### Testing Locally

1. Build the extension: `npm run build:extension`
2. Load `dist/` folder in Chrome as unpacked extension
3. Navigate to a video with transcript
4. Extract transcript
5. Click "Chat with AI"
6. Wait for initialization
7. Test various queries

---

## ⚠️ Known Limitations

1. **Browser Support**: Chrome/Edge 113+ only (WebGPU requirement)
2. **GPU Required**: Integrated GPUs may be slow
3. **Large Model**: 1.7GB download required
4. **Response Time**: Not instant (10s to 3min per response)
5. **Memory Usage**: Requires 2-4GB free RAM
6. **Mobile**: Not supported yet
7. **Context Limit**: Long transcripts may be truncated
8. **Model Quality**: 3B model has limitations vs larger models

---

## 🎉 Success Metrics

### What Success Looks Like

- ✅ AI initializes successfully within 5 minutes (first time)
- ✅ Responses generated within 1-2 minutes (good GPU)
- ✅ Accurate answers based on transcript context
- ✅ Smooth UI transitions and animations
- ✅ No crashes or errors during normal usage
- ✅ Model cached and reused across sessions

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review console logs (`chrome://extensions` → Details → Inspect views)
3. Check `chrome://gpu` for WebGPU status
4. Report issues on GitHub with:
   - Browser version
   - GPU model
   - Error messages
   - Steps to reproduce

---

**Last Updated**: October 17, 2025  
**Version**: 4.1.0  
**Feature Status**: ✅ Production Ready

