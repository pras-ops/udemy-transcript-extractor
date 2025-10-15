# 🔧 Technical Details

## Technology Stack

### **Frontend Layer**
- **React 19** with TypeScript - Modern, type-safe development
- **Tailwind CSS** - Clean, responsive UI
- **Lucide Icons** - Consistent icon system

### **Extension Layer**
- **Chrome Manifest V3** - Latest extension standards
- **Content Scripts** - Page interaction and transcript extraction
- **Background Scripts** - Service worker for extension management

### **Storage Layer**
- **Chrome Storage API** - Secure local data storage
- **Local Data Persistence** - All data stays on your device

### **Build Layer**
- **Vite** - Fast build system
- **TypeScript Compiler** - Type checking and compilation
- **Asset Bundling** - Optimized file packaging

## Architecture Overview

### **System Architecture**
```
User → Chrome Extension → Content Scripts → Platform Extractors
                    ↓
              Popup Interface → Export Options → Local Storage
                    ↓
              Background Script → Extension Service
```

## Requirements
- Chrome browser (version 88+)
- Internet connection (for transcript extraction)
- Active account on supported platforms (for course access)

## Development Setup

### **Prerequisites**
- Node.js (version 18+)
- npm or yarn
- Chrome browser

### **Development Commands**
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

## File Structure
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

## Security Features
- **Local Processing** - All data stays on your device
- **No External APIs** - No data sent to third-party services
- **No Tracking** - No telemetry or usage analytics
- **Secure** - Following Chrome extension best practices

## Performance Optimizations
- **Lazy Loading** - Components loaded on demand
- **Code Splitting** - Optimized bundle sizes
- **Tree Shaking** - Removed unused code
- **Minification** - Compressed production builds
