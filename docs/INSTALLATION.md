# 🛠️ Installation Guide

## Installation Options

### **Option 1: Chrome Web Store (Coming Soon)**
- Visit the Chrome Web Store
- Click "Add to Chrome"
- Start extracting transcripts immediately

### **Option 2: Manual Installation (Developer Mode)**
1. **Build** the extension from source (see Option 3 below)
2. **Open Chrome** and go to `chrome://extensions/`
3. **Enable** "Developer mode" (top right toggle)
4. **Click** "Load unpacked" and select the `dist` folder
5. **Pin** the extension to your toolbar for easy access

### **Option 3: Build from Source**
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

## Requirements
- Chrome browser (version 88+)
- Internet connection (for transcript extraction)
- Active account on supported platforms (for course access)

## Troubleshooting

### Common Issues
1. **Extension not loading**: Make sure Developer mode is enabled
2. **Transcript not extracting**: Check if you're on a supported platform
3. **Permission errors**: Ensure the extension has necessary permissions

### Getting Help
- Check the GitHub issues page
- Contact support via email
- Review the documentation in the docs folder
