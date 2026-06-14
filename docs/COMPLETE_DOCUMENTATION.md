# 📚 Complete Documentation - Transcript Extractor v4.2.0

## Table of Contents
1. [Overview](#overview)
2. [Installation](#installation)
3. [Usage Guide](#usage-guide)
4. [Technical Details](#technical-details)
5. [Deployment](#deployment)
6. [Troubleshooting](#troubleshooting)
7. [Contributing](#contributing)

---

## Overview

### What is Transcript Extractor?
A powerful Chrome extension that automatically extracts and collects transcripts from educational video platforms. Built for content creators, students, and professionals who need quick access to educational content.

### Key Features
- **One-Click Extraction** - Extract transcript from any video instantly
- **Smart Button Logic** - "Extract Transcript" → "Next Lecture & Extract" after success
- **Multiple Export Formats** - TXT, Markdown, JSON, and RAG formats
- **Universal Extractor** - Captures video captions or readable article/document text from *any* webpage
- **Modern UI/UX** - Ultra-curvy design with 48px border radius
- **Dark Mode Support** - Beautiful dark theme with proper contrast
- **Sequential Processing** - Streamlined workflow for multiple video extraction

### Supported Platforms
- ✅ **Udemy** - Full transcript extraction and batch processing
- ✅ **Coursera** - Course transcripts and reading materials
- ✅ **YouTube** - Video transcript extraction and playlist batch processing
- ✅ **Universal Page Extractor** - Captures subtitles from HTML5 video players or readable article/document text from *any* website!

---

## Installation

### Option 1: Chrome Web Store (Coming Soon)
- Visit the Chrome Web Store
- Click "Add to Chrome"
- Start extracting transcripts immediately

### Option 2: Manual Installation (Developer Mode)
1. **Build** the extension from source (see Option 3 below)
2. **Open Chrome** and go to `chrome://extensions/`
3. **Enable** "Developer mode" (top right toggle)
4. **Click** "Load unpacked" and select the `dist` folder
5. **Pin** the extension to your toolbar for easy access

### Option 3: Build from Source
```bash
# Clone the repository
git clone https://github.com/your-username/transcript-extractor.git
cd transcript-extractor

# Install dependencies
npm install

# Build the extension
npm run build

# Load the dist folder in Chrome extensions
```

### Requirements
- Chrome browser (version 88+)
- Internet connection (for transcript extraction)
- Active account on supported platforms (for course access)

---

## Usage Guide

### For Single Video Extraction

#### Basic Extraction
1. Go to any Udemy, Coursera, YouTube video, or other webpage / web article
2. Click the extension icon in your browser toolbar
3. Click "Extract Transcript" (smart button)
4. Choose your preferred format:
   - **TXT** - Clean text for general use
   - **Markdown** - Formatted for documentation
   - **JSON** - Structured data for developers
   - **RAG** - Optimized format for AI tools
5. Transcript is automatically copied to your clipboard
6. Or download as a file

#### Sequential Extraction (Smart Button)
1. After extracting a transcript, the button changes to "Next Lecture & Extract"
2. Click the button to automatically navigate to the next video
3. The extension will:
   - Navigate to the next lecture
   - Extract the transcript automatically
   - Show progress and success indicators
4. Continue this process for multiple videos in a course
5. Export all collected transcripts at once

### Export Formats Explained
- **TXT Format**: Plain text, perfect for general use
- **Markdown Format**: Formatted with headers and timestamps, great for documentation
- **JSON Format**: Structured data with metadata, ideal for developers
- **RAG Format**: AI-optimized format with video title and metadata, perfect for AI tools

### Tips for Best Results
1. **Ensure transcript/content exists**: Not all videos have transcripts, and not all web pages have readable articles.
2. **Wait for page load**: Make sure the target page is fully loaded before extracting.
3. **Check permissions**: Ensure the extension has access to the page.
4. **Use supported layouts**: Works seamlessly on Udemy, Coursera, YouTube, and standard web document layouts.

---

## Technical Details

### Technology Stack
- **Frontend**: React 19 with TypeScript, Tailwind CSS, Lucide Icons
- **Extension**: Chrome Manifest V3, Content Scripts, Background Scripts
- **Storage**: Chrome Storage API, Local Data Persistence
- **Build**: Vite, TypeScript Compiler, Asset Bundling

### Architecture
```
User → Chrome Extension → Content Scripts → Platform Extractors
                    ↓
              Popup Interface → Export Options → Local Storage
                    ↓
              Background Script → Extension Service
```

### File Structure
```
src/
├── components/          # React components
├── lib/                # Utility functions
├── background.ts       # Background script
├── content-script.ts   # Content script
└── popup.tsx          # Main popup component

dist/                   # Built extension files
├── manifest.json      # Extension manifest
├── background.js      # Background service worker
├── content-script.js  # Content script for page interaction
├── main.js           # Main extension bundle
├── ui.js             # UI components
├── main.css          # Styling
└── index.html        # Extension popup
```

### Security Features
- **Local Processing** - All data stays on your device
- **No External APIs** - No data sent to third-party services
- **No Tracking** - No telemetry or usage analytics
- **Secure** - Following Chrome extension best practices

### Performance Optimizations
- **Lazy Loading** - Components loaded on demand
- **Code Splitting** - Optimized bundle sizes
- **Tree Shaking** - Removed unused code
- **Minification** - Compressed production builds

---

## Deployment

### Ready-to-Deploy Package
- **Build Command**: `npm run build`
- **Output**: `dist/` folder with complete extension
- **Size**: ~15MB (significantly reduced from v3.x)
- **Contents**: Complete extension with all features

### For Chrome Web Store
1. Build the extension: `npm run build`
2. Zip the `dist/` folder contents
3. Upload to Chrome Web Store Developer Dashboard
4. Fill in store listing details
5. Submit for review

### For Enterprise/Internal Use
1. Build the extension: `npm run build`
2. Distribute the `dist/` folder to users
3. Users can load via Developer Mode
4. Or package as zip for IT deployment tools

### Package Contents
```
dist/
├── manifest.json          # Extension manifest
├── background.js          # Background service worker
├── content-script.js      # Content script for page interaction
├── main.js              # Main extension bundle
├── ui.js                # UI components
├── main.css             # Styling
├── index.html           # Extension popup
└── icons/               # Extension icons
```

---

## Troubleshooting

### Common Issues
1. **Extension not loading**: Make sure Developer mode is enabled
2. **Transcript not extracting**: Check if you're on a supported platform
3. **Permission errors**: Ensure the extension has necessary permissions
4. **No transcript available**: Some videos don't have transcripts
5. **Extraction failed**: Try refreshing the page and trying again
6. **Button not working**: Check if you're on a supported platform

### Getting Help
- Check the GitHub issues page
- Contact support via email
- Review the documentation in the docs folder

---

## Contributing

### Development Approach
- **User-First** - All features driven by user feedback
- **Simplicity** - Prefer simple, reliable solutions
- **Incremental** - Small, safe improvements over major changes

### How to Contribute
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Areas We Need Help
- **Platform Integration** - Help add support for new educational platforms
- **Export Formats** - Improve formats for specific use cases
- **UI/UX Improvements** - Enhance the user interface
- **Testing** - Improve test coverage and reliability
- **Documentation** - Help improve user guides and documentation
- **Performance Optimization** - Improve processing speed and efficiency

### Development Setup
```bash
# Install dependencies
npm install

# Development build
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## What's New in v4.2.0

### 🔮 Universal Page Extractor
- **HTML5 Video Captions**: Scrapes text track overlays/cues from any HTML5 video player.
- **Article & Document Extraction**: Automatically pulls structured reading tasks, code blocks, headers, and text from standard articles/documentation.
- **Dynamic Fallbacks**: Safely falls back to body text and paragraphs when structured containers are not present.

### 📚 Multi-Platform Expansion
- **Coursera Support**: Added complete transcript extraction and reading material capturing.
- **YouTube Playlists**: Extract structures and compile transcripts from full playlists.
- **Udemy Support**: Robust batch extraction and course structure scraping.

### 🧹 Clean Architecture & Reliability
- **Removed Heavy WebLLM Dependencies**: Simplified codebase by removing large local model requirements, resulting in a lightweight unpacked package (~5.5MB).
- **Vite Bundler**: Optimized entry chunks for backgrounds, popups, and utility views.
- **Automatic Deployment Checks**: Included a deployment validation script to verify package builds before release.
- **Secure Permissions**: Restructured manifest permissions to follow Chrome extension best practices.

### 🎨 Modern Ultra-Curvy Design
- **48px Border Radius** - Ultra-smooth, pill-like appearance
- **Professional UI/UX** - Clean, modern interface with elegant styling
- **Smart Button** - Intelligent button that adapts based on extraction status ("Extract Transcript" → "Next Lecture & Extract")
- **Enhanced Animations** - Smooth micro-interactions and hover effects
- **Dark Mode Support** - Beautiful dark theme with proper contrast

---

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- Built with user feedback and iterative development
- Inspired by the need for better content extraction tools
- Developed with modern web technologies and best practices

---

**Ready to extract transcripts efficiently? Install the extension and start saving time today!**

**⭐ If you find this extension helpful, please give it a star on GitHub!**
