# 🎓 Transcript Extractor - Chrome Extension

A powerful Chrome extension that automatically extracts and collects transcripts from educational video platforms. Built for AI enthusiasts who need quick access to educational content for tools like NotebookLLM, ChatGPT, and other AI platforms.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-1.0.1-green.svg)](https://github.com/your-username/transcript-extractor)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🎯 Why I Built This

As someone who heavily uses AI tools like **NotebookLLM**, **ChatGPT**, and other AI platforms for learning and content creation, I found myself constantly wasting time manually copying transcripts from educational videos. 

**The Problem:**
- Spending 10-15 minutes manually copying transcripts from Udemy videos
- Inconsistent formatting when pasting into AI tools
- No easy way to batch collect transcripts from entire courses
- Time-consuming process that interrupted my learning flow

**The Solution:**
Transcript Extractor - a one-click solution that extracts transcripts instantly and formats them perfectly for AI tools, saving hours of manual work.

## ✨ Features

### 🚀 **Core Functionality**
- **One-Click Extraction** - Extract transcript from any Udemy video instantly
- **Batch Processing** - Automatically collect transcripts from multiple videos in a course
- **AI-Optimized Formats** - Support for TXT, Markdown, JSON, and RAG formats perfect for AI tools
- **Smart Progress Tracking** - Real-time progress with section-based counting
- **Automatic Clipboard** - Transcripts copied to clipboard automatically
- **Dark Mode UI** - Modern dark theme for better viewing experience

### 🎯 **Perfect for AI Workflows**
- **NotebookLLM** - Extract and paste transcripts for AI-powered note-taking
- **ChatGPT** - Get clean, formatted text for AI conversations
- **Claude** - Batch collect course content for analysis
- **Custom AI Tools** - RAG format optimized for vector databases

## 📸 Screenshots

### **Single Transcript Extraction**
![Single Extraction](screenshots/single-extraction.png)
*Extract transcripts from individual videos with one click. Supports multiple export formats including RAG for AI tools.*

### **Batch Collection Mode**
![Batch Collection](screenshots/batch-collection.png)
*Automatically collect transcripts from entire course sections. Perfect for comprehensive AI analysis.*

### **Active Batch Processing**
![Batch Processing](screenshots/batch-processing.png)
*Real-time progress tracking shows exactly what's being processed. Navigate through lectures automatically.*

## 🛠️ Installation

### **Option 1: Chrome Web Store (Coming Soon)**
- Visit the Chrome Web Store
- Click "Add to Chrome"
- Start extracting transcripts immediately

### **Option 2: Manual Installation (Developer Mode)**
1. **Download** the extension files
2. **Open Chrome** and go to `chrome://extensions/`
3. **Enable** "Developer mode" (top right toggle)
4. **Click** "Load unpacked" and select the extension folder
5. **Pin** the extension to your toolbar for easy access

## 📖 Usage Guide

### **For AI Tool Integration**

#### **1. Single Video Extraction**
1. Go to any Udemy course video
2. Click the extension icon in your browser toolbar
3. Click "Extract Transcript"
4. Choose your preferred format:
   - **TXT** - Clean text for ChatGPT
   - **Markdown** - Formatted for NotebookLLM
   - **JSON** - Structured data for custom AI tools
   - **RAG** - AI-optimized format for vector databases
5. Transcript is automatically copied to your clipboard
6. Paste directly into your AI tool

#### **2. Batch Collection for Course Analysis**
1. Navigate to a Udemy course
2. Click the extension icon
3. Enable "Batch Collection Mode"
4. Choose your collection preferences
5. Click "Start Collection"
6. The extension automatically navigates through videos
7. Collect all transcripts for comprehensive AI analysis

### **AI Tool Workflows**

#### **NotebookLLM Workflow:**
1. Extract transcript in Markdown format
2. Paste into NotebookLLM
3. Use AI to create summaries, notes, and insights
4. Build comprehensive course knowledge base

#### **ChatGPT Workflow:**
1. Extract transcript in TXT format
2. Paste into ChatGPT
3. Ask questions about the content
4. Get explanations and clarifications

#### **Custom AI Analysis:**
1. Use RAG format for vector database ingestion
2. Build custom AI applications
3. Create searchable knowledge bases
4. Develop educational AI assistants

## 🎯 Supported Platforms

### **Currently Supported**
- ✅ **Udemy** - Full transcript extraction and batch processing

### **Coming Soon**
- 🔄 **Coursera** - Educational course transcripts
- 🔄 **YouTube** - Educational video support
- 🔄 **edX** - Course transcript extraction
- 🔄 **Pluralsight** - Video transcript support
- 🔄 **Skillshare** - Creative course transcripts
- 🔄 **LinkedIn Learning** - Professional development content

## 🔧 Technical Details

### **Built With**
- **Chrome Extension Manifest V3** - Latest extension standards
- **React 19** with TypeScript - Modern, type-safe development
- **Tailwind CSS** - Clean, responsive UI
- **Vite** - Fast build system

### **Requirements**
- Chrome browser (version 88+)
- Internet connection
- Active Udemy account (for course access)

## 🐛 Troubleshooting

### **Common Issues**

#### **Transcript Not Detected**
- Ensure the transcript panel is open on Udemy
- Refresh the page and try again
- Check if the video has captions available

#### **Extension Not Working**
- Verify the extension is enabled in Chrome
- Check browser console for error messages
- Ensure you're on a supported Udemy course page

#### **Batch Collection Issues**
- Make sure you're on a course page (not individual video)
- Check if batch collection is active
- Verify you have access to all course videos

### **Getting Help**
- Check the browser console for error messages
- Verify extension permissions in Chrome settings
- Ensure the Udemy page is fully loaded
- Contact support for additional assistance

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### **Development Approach**
- **User-First** - All features driven by user feedback
- **Simplicity** - Prefer simple, reliable solutions
- **Incremental** - Small, safe improvements over major changes

### **How to Contribute**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### **Areas We Need Help**
- **Platform Integration** - Help add support for new educational platforms
- **AI Tool Integration** - Improve formats for specific AI platforms
- **UI/UX Improvements** - Enhance the user interface
- **Testing** - Improve test coverage and reliability
- **Documentation** - Help improve user guides and documentation

## 📊 Project Status

### **Current Status: Beta Release**
- ✅ All core features working
- ✅ User-tested and refined
- ✅ Clean, maintainable codebase
- ✅ Comprehensive error handling

### **Development Philosophy**
- **Simplicity Over Complexity** - Simple solutions are more reliable
- **User-Driven Development** - All major changes based on user feedback
- **Gradual Improvement** - Small, safe changes over major refactoring

## 🔮 Roadmap

### **Phase 1: Platform Expansion (Q2 2024)**
- **Coursera** - Full transcript extraction support
- **YouTube** - Educational video transcript collection
- **edX** - Course transcript extraction
- **Pluralsight** - Video transcript support

### **Phase 2: Enhanced AI Integration (Q3 2024)**
- **Multi-Platform Batch Processing** - Collect from multiple platforms simultaneously
- **AI Tool Presets** - Pre-configured formats for popular AI tools
- **Direct Integration** - One-click export to specific AI platforms
- **Advanced Formatting** - Custom formatting options for different use cases

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with user feedback and iterative development
- Inspired by the need for better AI tool integration
- Developed with modern web technologies and best practices

## 🌟 Why This Extension?

### **For AI Enthusiasts**
- **Save Time** - No more manual copying of transcripts
- **Better AI Results** - Clean, formatted text for better AI responses
- **Workflow Integration** - Seamless integration with AI tools
- **Batch Processing** - Collect entire courses for comprehensive analysis

### **For Students**
- **Study Efficiency** - Focus on learning, not transcription
- **AI-Powered Notes** - Use AI to create summaries and notes
- **Better Understanding** - Get AI explanations of complex topics

### **For Content Creators**
- **Content Repurposing** - Extract transcripts for blog posts, articles
- **AI-Assisted Writing** - Use AI to expand on educational content
- **SEO Optimization** - Use transcripts for better content optimization

### **For Educators**
- **Content Analysis** - Extract and analyze course content
- **AI-Powered Teaching** - Use AI to create additional materials
- **Accessibility** - Make content more accessible to students

---

## 📞 Support

- **Issues** - Report bugs and request features on GitHub
- **Discussions** - Join community discussions
- **Email** - Contact us directly for support

---

*This extension is designed to bridge the gap between educational content and AI tools, making learning more efficient and AI-powered analysis more accessible.*

**⭐ If you find this extension helpful for your AI workflows, please give it a star on GitHub!**
