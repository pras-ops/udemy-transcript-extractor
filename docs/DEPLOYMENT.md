# 🚀 Deployment Guide

## Ready-to-Deploy Package

The extension is ready for deployment by building from source:
- **Build Command**: `npm run build`
- **Output**: `dist/` folder with complete extension
- **Size**: ~15MB (significantly reduced from v3.x)
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
├── index.html             # Popup
├── main.js                # Popup entry
├── ui.js                  # UI bundle
├── vendor.js              # Third-party bundle
├── extension-service.js   # Export formats
├── main.css               # Styling
├── models/search/         # Static embedding table + vocabulary
└── icons/                 # 16, 32, 48, 128px
```

There is no `background.js`. The service worker and the offscreen document were
removed in 4.2.0 along with the model runtime they hosted.

`models/search/` is the bulk of the package. It is the embedding lookup table,
shipped with the extension so search never makes a network call — which is also
why the package jumped from ~90 KB to ~29 MB between 4.1 and 4.2. Worth
mentioning in the submission notes, since it is a large and conspicuous change.

## Chrome Web Store Requirements

### **Store Listing**
- **Name**: Transcript Extractor
- **Description**: Extract transcripts from educational videos
- **Category**: Productivity
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

### **Current Version**: v4.0.0
- Modern ultra-curvy design
- Smart button functionality
- Improved user experience
- Clean architecture

## Quality Assurance

### **Testing Checklist**
- [ ] Extension loads without errors
- [ ] Transcript extraction works on all supported platforms
- [ ] Export formats work correctly
- [ ] Dark mode functions properly
- [ ] Smart button logic works as expected
- [ ] No console errors
- [ ] Proper error handling

### **Performance Metrics**
- **Load Time**: < 2 seconds
- **Memory Usage**: < 50MB
- **Bundle Size**: ~15MB
- **Startup Time**: < 1 second

## Support and Maintenance

### **User Support**
- GitHub issues for bug reports
- Email support for technical issues
- Documentation in docs folder

### **Maintenance Schedule**
- **Monthly**: Security updates and bug fixes
- **Quarterly**: Feature updates and improvements
- **As needed**: Critical bug fixes
