# Udemy Transcript Extractor Chrome Extension

A powerful Chrome extension that automatically extracts and collects transcripts from educational video platforms. Currently supports Udemy with plans to expand to other major learning platforms.

## 🎯 What It Does

### **Current Features (Udemy)**
- **Single Transcript Extraction** - Extract transcript from any Udemy video with one click
- **Batch Processing** - Automatically collect transcripts from multiple videos in a course
- **Smart Progress Tracking** - Real-time progress with section-based counting
- **Clipboard Management** - Automatic appending to clipboard with Chrome storage
- **Dark Mode** - Modern dark theme for better viewing experience
- **Error Handling** - Comprehensive error handling and user feedback

### **How It Works**
1. **Navigate** to any Udemy course video
2. **Click** the extension icon in your browser
3. **Choose** between single extraction or batch collection
4. **Collect** transcripts automatically with progress tracking
5. **Export** all collected transcripts to clipboard or download

## 🚀 Quick Start

### Installation
1. Clone this repository
2. Run `npm install`
3. Run `npm run build`
4. Load the `dist` folder as an unpacked extension in Chrome

### Usage
1. Go to any Udemy course video
2. Click the extension icon in your browser toolbar
3. Use "Extract" for single transcript or "Batch Collection" for multiple videos
4. Transcripts are automatically copied to your clipboard

## 🔧 Technical Stack

- **Chrome Extension Manifest V3** - Latest extension standards
- **React 18** with TypeScript - Modern, type-safe development
- **Tailwind CSS** - Clean, responsive UI
- **Vite** - Fast build system
- **Chrome Storage API** - Persistent data storage

## 🎯 Future Roadmap

### **Phase 1: Platform Expansion (Q2 2024)**
- **Coursera** - Full transcript extraction support
- **YouTube** - Educational video transcript collection
- **edX** - Course transcript extraction
- **Pluralsight** - Video transcript support

### **Phase 2: Enhanced Features (Q3 2024)**
- **Multi-Platform Batch Processing** - Collect from multiple platforms simultaneously
- **Transcript Formatting** - Custom formatting options (Markdown, PDF, etc.)
- **Search & Filter** - Search within collected transcripts
- **Export Options** - Multiple export formats (TXT, DOCX, PDF)
- **RAG-Based Processing** - AI-enhanced transcript processing for better formatting and organization



## 🎯 Supported Platforms

### **Currently Supported**
- ✅ **Udemy** - Full transcript extraction and batch processing

### **Coming Soon**
- 🔄 **Coursera** - Development in progress
- 🔄 **YouTube** - Educational video support
- 🔄 **edX** - Course transcript extraction
- 🔄 **Pluralsight** - Video transcript support
- 🔄 **Skillshare** - Creative course transcripts
- 🔄 **LinkedIn Learning** - Professional development content

## 🐛 Known Limitations

### **Current Limitations**
- **Udemy Dependency** - Extension may need updates if Udemy changes their UI
- **Storage Limits** - 4.5MB clipboard storage limit per session
- **Platform Specific** - Currently only works with Udemy

### **External Dependencies**
- CORS errors from external services (not extension-related)
- WebSocket connection failures (development environment only)

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### **Development Approach**
1. **User-First** - All features driven by user feedback
2. **Simplicity** - Prefer simple, reliable solutions
3. **Incremental** - Small, safe improvements over major changes

### **How to Contribute**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### **Areas We Need Help**
- **Platform Integration** - Help add support for new educational platforms
- **UI/UX Improvements** - Enhance the user interface
- **Testing** - Improve test coverage and reliability
- **Documentation** - Help improve user guides and documentation

## 📊 Project Status

### **Current Status: Stable Release**
- ✅ All core features working
- ✅ User-tested and refined
- ✅ Clean, maintainable codebase
- ✅ Comprehensive error handling

### **Development Philosophy**
- **Simplicity Over Complexity** - Simple solutions are more reliable
- **User-Driven Development** - All major changes based on user feedback
- **Gradual Improvement** - Small, safe changes over major refactoring

## 🔍 Troubleshooting

### **Common Issues**
1. **Transcript Not Detected** - Ensure transcript panel is open on Udemy
2. **Batch Processing Issues** - Check if batch collection is active
3. **Clipboard Not Working** - Verify clipboard permissions in Chrome
4. **Progress Display Errors** - Refresh the page and try again

### **Getting Help**
- Check the browser console for error messages
- Verify extension permissions in Chrome settings
- Ensure the Udemy page is fully loaded
- Check Chrome storage for data persistence

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with user feedback and iterative development
- Inspired by the need for better educational content accessibility
- Developed with modern web technologies and best practices

---

## 🌟 Why This Extension?

### **For Students**
- **Save Time** - No more manual copying of transcripts
- **Better Notes** - Collect all course content automatically
- **Study Efficiency** - Focus on learning, not transcription

### **For Educators**
- **Content Analysis** - Extract and analyze course content
- **Accessibility** - Make content more accessible to students
- **Research** - Collect educational content for research

### **For Content Creators**
- **Content Repurposing** - Extract transcripts for blog posts, articles
- **SEO Optimization** - Use transcripts for better content optimization
- **Accessibility** - Improve content accessibility

---

*This extension is designed to make educational content more accessible and easier to work with. We believe that learning should be frictionless, and this tool helps achieve that goal.*