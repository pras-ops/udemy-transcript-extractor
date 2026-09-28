# 🚀 Deployment Guide

## Ready-to-Deploy Package

The extension is ready for deployment by building from source:
- **Build Command**: `npm run deploy` (build, copy assets, then the store gates)
- **Output**: `dist/` folder with complete extension
- **Size**: ~30 MB, almost entirely the bundled embedding table
- **Contents**: Complete extension with all features

## Deployment Instructions

### **For Chrome Web Store**
1. Build the extension: `npm run build`
2. Zip the `dist/` folder contents
3. Upload to Chrome Web Store Developer Dashboard
4. Fill in store listing details
5. Submit for review

### **For Enterprise/Internal Use**
1. Build the extension: `npm run build`
2. Distribute the `dist/` folder to users
3. Users can load via Developer Mode
4. Or package as zip for IT deployment tools

### **For Testing/Development**
1. Build the extension: `npm run build`
2. Load in Chrome via `chrome://extensions/`
3. Enable Developer Mode
4. Click "Load unpacked" and select `dist/` folder

## Package Contents
```
dist/
├── manifest.json          # Extension manifest
├── content-script.js      # Injected into the page — classic IIFE, not ESM
├── background.js          # Service worker — classic IIFE, not ESM
├── index.html             # Popup
├── main.js                # Popup entry
├── dashboard.html         # The library, as a full tab
├── dashboard.js           # Dashboard entry
├── ui.js                  # Shared UI bundle
├── vendor.js              # Third-party bundle
├── extension-service.js   # Export formats, messaging, seek
├── search-service.js      # Indexing and query orchestration
├── search-service.css     # Styling
├── models/                # Static embedding table + vocabulary
└── icons/                 # 16, 32, 48, 128px
```

`background.js` is back as of 4.3.0, at around 6 KB. The worker removed in 4.2.0
hosted the model runtime; this one exists for a single job — receiving the
`Alt+Shift+S` capture command, because `chrome.tabs.captureVisibleTab` is
unreachable from a content script and the `activeTab` grant it needs is only
given when the user invokes the extension. Both it and the content script are
built as IIFE; `check:store` fails the build if the content script regresses to
ESM.

`models/search/` is the bulk of the package. It is the embedding lookup table,
shipped with the extension so search never makes a network call — which is also
why the package jumped from ~90 KB to ~29 MB between 4.1 and 4.2. Worth
mentioning in the submission notes, since it is a large and conspicuous change.

## Chrome Web Store Requirements

### **Store Listing**
- **Name**: Transcript Extractor
- **Description**: Extract transcripts from educational videos
- **Category**: Education (keep this consistent with `STORE_LISTING.md`)
- **Screenshots**: Include screenshots of the extension in action
- **Privacy Policy**: Required for Chrome Web Store

### **Technical Requirements**
- **Manifest V3**: ✅ Compliant
- **Permissions**: Minimal required permissions
- **Content Security Policy**: Properly configured
- **Icons**: Multiple sizes provided

## Version Management

### **Versioning Strategy**
- **Major versions**: Breaking changes or major feature additions
- **Minor versions**: New features or improvements
- **Patch versions**: Bug fixes and small improvements

### **Current Version**: v4.3.0
- The dashboard: library, reader, cross-course search, highlights and notes
- Study-notes export, per lecture and per course
- Click any timestamp to send the lecture's player back to that moment
- `Alt+Shift+N` notes and `Alt+Shift+S` capture, without leaving the video
- One screenshot store, shared by the popup and the dashboard

## Quality Assurance

### **Testing Checklist**

Automated — `npm run verify` covers these:
- [ ] Typecheck, lint and the full test suite pass
- [ ] `npm run check:store` passes all eight gates

By hand, because nothing below is covered by a test:
- [ ] Extension loads without errors, and the service worker registers
- [ ] Transcript extraction works on Udemy, Coursera and YouTube
- [ ] `Alt+Shift+N` opens the composer; the note reaches the dashboard on open
- [ ] `Alt+Shift+S` captures with the popup **closed**, and the still appears in
      the dashboard's Screenshots tab
- [ ] Frames captured before this build still appear (the legacy import)
- [ ] Clicking a timestamp focuses the lecture tab and seeks
- [ ] Lecture and course export open correctly, with highlights and notes in them
- [ ] Export formats work correctly
- [ ] Dark mode functions properly
- [ ] No console errors, in the page or the worker

### **Performance Metrics**
- **Bundle Size**: ~30 MB, of which the embedding table is ~30 MB — the code is
  under 500 KB
- **Load Time**: the popup opens immediately; keyword search is usable at once
  and the embedding tier loads behind it

## Support and Maintenance

### **User Support**
- GitHub issues for bug reports
- Email support for technical issues
- Documentation in docs folder

### **Maintenance Schedule**
- **Monthly**: Security updates and bug fixes
- **Quarterly**: Feature updates and improvements
- **As needed**: Critical bug fixes
