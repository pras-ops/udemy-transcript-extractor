# 🎓 Transcript Extractor - Chrome Extension

A powerful Chrome extension that automatically extracts and collects transcripts from educational video platforms. Built for content creators, students, and professionals who need quick access to educational content.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-4.2.0-green.svg)](https://github.com/pras-ops/udemy-transcript-extractor)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🎯 Why I Built This

As someone who frequently works with educational content, I found myself constantly wasting time manually copying transcripts from videos. 

**The Problem:**
- Spending 10-15 minutes manually copying transcripts from video lectures
- Inconsistent formatting when pasting into documents or AI tools
- No easy way to batch collect transcripts from entire courses
- Time-consuming process that interrupted workflow

**The Solution:**
Transcript Extractor - a one-click solution that extracts transcripts instantly, formats them perfectly, and supports batch collection of entire courses, saving hours of manual work.

## ✨ Features

### 🚀 **Core Functionality**
- **One-Click Extraction** - Extract transcript from any video instantly
- **Works on any video site** - Dedicated support for Udemy, Coursera and YouTube, plus a generic
  extractor that reads captions from any standard HTML5 player (Panopto, Kaltura, Echo360, Moodle,
  edX and most self-hosted lecture players)
- **Seven export formats** - Markdown, plain text, retrieval chunks, SRT, WebVTT, CSV and JSON
- **Search this lecture** - Ask a question in your own words and jump to the moment it was answered.
  Runs entirely on your machine, on CPU, with no GPU and no network
- **Batch Processing** - Automatically collect transcripts from multiple videos in a course
- **Automatic Clipboard** - Transcripts copied to clipboard automatically
- **Dark Mode UI** - Modern dark theme for better viewing experience

### 🎯 **Perfect for Many Use Cases**
- **Content Creators** - Extract transcripts for blog posts, articles, and content repurposing
- **Students** - Save time with automated transcript collection and formatting
- **Researchers** - Batch collect course content for analysis and study
- **AI Workflows** - Clean, formatted text ready for AI tools like ChatGPT, Claude, or NotebookLLM
- **Accessibility** - Make video content more accessible with text versions

## 🏗️ Architecture Overview

### **System Architecture**
```mermaid
graph TB
    A[User] --> B[Chrome Extension]
    B --> C[Content Scripts]
    B --> D[Popup Interface]
    B --> E[Background Script]
    
    C --> F[Udemy Extractor]
    C --> G[Coursera Extractor]
    C --> H[YouTube Extractor]
    
    D --> I[Transcript Viewer]
    D --> J[Export Options]
    D --> K[Batch Collection]
    
    E --> L[Storage Service]
    E --> M[Extension Service]
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#fff3e0
```

## 📸 Screenshots

### **Modern Ultra-Curvy Design**
![Modern UI](screenshots/modern-ui.png)
*Clean, modern interface with ultra-curvy 48px border radius and professional styling.*

### **Smart Button Functionality**
![Smart Button](screenshots/smart-button.png)
*Intelligent button that adapts: "Extract Transcript" → "Next Lecture & Extract" after successful extraction.*

### **Export Options**
![Export Options](screenshots/export-options.png)
*Multiple export formats: TXT, Markdown, JSON, and RAG formats with elegant UI.*

## 🛠️ Quick Installation

### **Option 1: Chrome Web Store (Coming Soon)**
- Visit the Chrome Web Store
- Click "Add to Chrome"
- Start extracting transcripts immediately

### **Option 2: Manual Installation**
1. **Download** the latest release zip file
2. **Extract** the zip file
3. **Open Chrome** and go to `chrome://extensions/`
4. **Enable** "Developer mode" (top right toggle)
5. **Click** "Load unpacked" and select the extracted folder
6. **Pin** the extension to your toolbar for easy access

### **Option 3: Build from Source**
```bash
# Clone the repository
git clone https://github.com/pras-ops/udemy-transcript-extractor.git
cd transcript-extractor

# Install dependencies
npm install

# Fetch the bundled search model (~23 MB, one time).
# The weights are a build input and are not committed to the repo.
npm run fetch:model

# Typecheck, lint and test
npm run verify

# Build the extension and check it against Chrome Web Store rules
npm run deploy

# Load the dist folder in Chrome extensions
```

| Script | What it does |
| --- | --- |
| `npm run fetch:model` | Downloads the search model into `public/models/` |
| `npm run verify` | Typecheck + lint + tests |
| `npm run build:extension` | Production build plus manifest, model and WASM assets |
| `npm run check:store` | Fails the build if anything would be rejected by the store |
| `npm run deploy` | `build:extension` then `check:store` |

📖 **For detailed installation instructions, see [docs/INSTALLATION.md](docs/INSTALLATION.md)**

## 📖 Quick Usage

### **Basic Workflow**
1. **Visit** any page with a video that has captions
2. **Click** the extension icon in your browser toolbar
3. **Click** "Extract Transcript" (smart button)
4. **Choose** your export format
5. **Copy** to clipboard or download as file

### **Smart Button Feature**
- After extracting a transcript, the button changes to "Next Lecture & Extract"
- Click to automatically navigate to the next video and extract its transcript
- Perfect for collecting transcripts from entire courses

### **Export Formats**

| Format | Best for |
| --- | --- |
| **Markdown** (`.md`) | Readable notes with clickable timestamps — Obsidian, Notion, ChatGPT, Claude |
| **Plain text** (`.txt`) | Anywhere |
| **Retrieval chunks** (`.json`) | Vector stores and NotebookLM — pre-chunked with context headers and timestamps |
| **SubRip** (`.srt`) | Video editors and players |
| **WebVTT** (`.vtt`) | HTML5 players, re-upload |
| **CSV** (`.csv`) | Excel, Google Sheets, Anki, Quizlet |
| **JSON** (`.json`) | Your own scripts |

📖 **For detailed usage instructions, see [docs/USAGE.md](docs/USAGE.md)**

## 🎯 Supported Platforms

### **Dedicated extractors**
- ✅ **Udemy** - Full transcript extraction and batch processing
- ✅ **Coursera** - Educational course transcripts
- ✅ **YouTube** - Educational video support

### **Everything else**
A generic extractor reads caption data directly rather than scraping any particular site's markup,
using the browser's own `TextTrack` API, `<track>` elements, and caption files the player fetches.
That covers most lecture-capture and LMS players — Panopto, Kaltura, Echo360, Canvas Studio, Moodle,
edX and self-hosted HTML5 players — with **no extra permissions**: the extension uses `activeTab`,
so it only ever sees the page you invoke it on.

If a platform serves captions through a protected endpoint, the extension says so explicitly rather
than failing silently.

## 🔒 Privacy and local AI

Everything runs on your machine. The lecture search feature uses a ~23 MB embedding model that is
**bundled with the extension** — it is not downloaded, and no transcript, query or page content is
ever sent anywhere.

Search returns passages from the lecture with timestamps, rather than generating an answer, so it
cannot invent something that was never said.

> **Note on remotely hosted code.** An earlier version shipped a WebLLM chat feature that fetched a
> compiled `.wasm` model library from a CDN at runtime. Manifest V3 forbids remotely hosted code and
> the Chrome Web Store counts WASM as code, so that feature was removed to make the extension
> publishable. `npm run check:store` enforces this on every build.

## 🔧 Technical Stack

- **Frontend**: React 19 + TypeScript, Tailwind CSS, Lucide Icons
- **Extension**: Chrome Manifest V3, Content Scripts, Background Scripts  
- **Storage**: Chrome Storage API, Local Data Persistence
- **Build**: Vite, TypeScript Compiler, Asset Bundling

### **Requirements**
- Chrome browser (version 88+)
- Internet connection (for transcript extraction)
- Active account on supported platforms (for course access)

📖 **For detailed technical information, see [docs/TECHNICAL.md](docs/TECHNICAL.md)**

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### **How to Contribute**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### **Areas We Need Help**
- **Platform Integration** - Help add support for new educational platforms
- **Export Formats** - Improve formats for specific use cases
- **UI/UX Improvements** - Enhance the user interface
- **Testing** - Improve test coverage and reliability
- **Documentation** - Help improve user guides and documentation
- **Performance Optimization** - Improve processing speed and efficiency

📖 **For architecture and development setup, see [docs/TECHNICAL.md](docs/TECHNICAL.md)**

## 📊 Project Status

### **Current Status: v4.2.0**
- ✅ All core features working
- ✅ Clean, focused codebase
- ✅ User-tested and refined
- ✅ Comprehensive error handling
- ✅ Multi-platform support
- ✅ Batch collection with progress tracking
- ✅ Multiple export formats

### **Development Philosophy**
- **Simplicity Over Complexity** - Simple solutions are more reliable
- **User-Driven Development** - All major changes based on user feedback
- **Gradual Improvement** - Small, safe changes over major refactoring
- **Privacy-First** - All processing happens locally

## 🔮 Roadmap

### **Feature Evolution**
```mermaid
graph TD
    A[v4.0 Current] --> B[Core Transcript Extraction]
    A --> C[Multi-Platform Support]
    A --> D[Batch Processing]
    
    B --> E[v4.1 Enhanced Features]
    C --> E
    D --> E
    
    E --> F[Advanced Search]
    E --> G[Better Formatting]
    
    F --> H[v5.0 Platform Expansion]
    G --> H
    
    H --> I[More Platforms]
    H --> J[Advanced Export Options]
    H --> K[Cloud Sync]
    
    style A fill:#e8f5e8
    style E fill:#e3f2fd
    style H fill:#fff3e0
```

### **Phase 1: Enhanced Features (Q1 2025)**
- **Advanced Search** - Search within collected transcripts
- **Better Formatting** - Improved formatting options
- **Keyboard Shortcuts** - Quick access to common functions
- **Export Templates** - Customizable export templates

### **Phase 2: Platform Expansion (Q2 2025)**
- **LinkedIn Learning** - Professional course support
- **Khan Academy** - Educational content support
- **Additional Platforms** - Based on user requests

### **Phase 3: Advanced Features (Q3 2025)**
- **Cloud Sync** - Optional cloud storage for transcripts
- **Cross-Device** - Access transcripts on multiple devices
- **Advanced Analytics** - Track your learning progress
- **Team Features** - Share transcripts with your team

## 🚀 Deployment

### **Ready-to-Deploy Package**
- **Build Command**: `npm run build`
- **Output**: `dist/` folder with complete extension
- **Size**: ~15MB (significantly reduced from v3.x)
- **Zip File**: `transcript-extractor-v4.2.0.zip` (ready for Chrome Web Store)

### **Quick Deployment**
1. **Build**: `npm run build`
2. **Zip**: Contents of `dist/` folder
3. **Upload**: To Chrome Web Store Developer Dashboard
4. **Submit**: For review

📖 **For detailed deployment instructions, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with user feedback and iterative development
- Inspired by the need for better content extraction tools
- Developed with modern web technologies and best practices

## 🌟 Why This Extension?

### **For Content Creators**
- **Save Time** - No more manual copying of transcripts
- **Content Repurposing** - Extract transcripts for blog posts and articles
- **SEO Optimization** - Use transcripts for better content optimization
- **Workflow Integration** - Seamless integration with content creation tools

### **For Students**
- **Study Efficiency** - Focus on learning, not transcription
- **Better Notes** - Use transcripts to create comprehensive notes
- **Quick Review** - Review content without rewatching videos
- **Accessibility** - Make learning more accessible

### **For Researchers**
- **Data Collection** - Batch collect course content for analysis
- **Content Analysis** - Analyze educational content efficiently
- **Research Tools** - Extract data for research projects
- **Time Savings** - Spend time on analysis, not data collection

### **For AI Enthusiasts**
- **AI Workflows** - Clean, formatted text ready for AI tools
- **Better AI Results** - Structured format improves AI processing
- **Batch Processing** - Collect entire courses for comprehensive analysis
- **Multiple Formats** - Choose the best format for your AI tools

---

## 📞 Support

- **Issues** - Report bugs and request features on GitHub
- **Email** - Contact us directly for support

---

*This extension is designed to make educational content more accessible and easier to work with. Whether you're a student, educator, content creator, or researcher, Transcript Extractor helps you work more efficiently with video content.*

**⭐ If you find this extension helpful, please give it a star on GitHub!**

---

## 📝 Changelog

Release history lives in **[CHANGELOG.md](CHANGELOG.md)**.

The short version of where this is now: v4.2 replaced the browser-based LLM
with static embeddings, which removed the GPU requirement, the multi-gigabyte
model download and the whole inference runtime. Search is instant, runs on CPU,
and works the same on every machine.

---

**Ready to extract transcripts efficiently? Install the extension and start saving time today!**
