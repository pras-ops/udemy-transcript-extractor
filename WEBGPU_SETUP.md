# WebGPU Setup Guide for Transcript Extractor

## 🚨 Important: WebGPU Required for Optimal Performance

This extension uses WebLLM for AI-powered transcript summarization, which requires WebGPU for hardware acceleration. **WebGPU must be manually enabled** in Chrome for the best experience.

## 🔧 How to Enable WebGPU

### Method 1: Chrome Flags (Recommended)

1. **Open Chrome Flags**
   - Navigate to `chrome://flags/` in your Chrome browser
   - Or click: [chrome://flags/#enable-unsafe-webgpu](chrome://flags/#enable-unsafe-webgpu)

2. **Enable WebGPU**
   - Search for "WebGPU" in the flags page
   - Find the flag: **"Unsafe WebGPU"**
   - Set it to **"Enabled"**

3. **Restart Chrome**
   - Click the "Relaunch" button at the bottom of the flags page
   - Chrome will restart with WebGPU enabled

### Method 2: Command Line Launch

```bash
# Windows
chrome.exe --enable-unsafe-webgpu --enable-features=Vulkan

# macOS
open -a "Google Chrome" --args --enable-unsafe-webgpu --enable-features=Vulkan

# Linux
google-chrome --enable-unsafe-webgpu --enable-features=Vulkan
```

## ✅ Verify WebGPU is Working

1. **Open Developer Tools** (F12)
2. **Go to Console**
3. **Type**: `navigator.gpu`
4. **Expected Result**: Should return a GPU object (not undefined)

## 🚀 Performance Impact

| WebGPU Status | Performance | Speed |
|---------------|-------------|-------|
| ✅ **Enabled** | **Optimal** | **~50-100 tokens/sec** |
| ❌ **Disabled** | **Fallback** | **~10-20 tokens/sec** |

## 🔄 Fallback Behavior

If WebGPU is not available, the extension will:
- ✅ **Still work** using WebAssembly fallback
- ⚠️ **Run slower** (~5x slower inference)
- 📱 **Use more CPU** instead of GPU
- 🔋 **Drain more battery** on mobile devices

## 🛠️ Troubleshooting

### "WebGPU not available" Error
- **Solution**: Enable WebGPU using Method 1 above
- **Verify**: Check `navigator.gpu` in console

### "No WebGPU adapter found" Error
- **Cause**: Your GPU may not be compatible
- **Solution**: Update graphics drivers
- **Fallback**: Extension will use WebAssembly

### Slow Performance
- **Check**: Is WebGPU enabled?
- **Verify**: Open `chrome://gpu/` and check WebGPU status
- **Update**: Ensure Chrome is version 113+ (required for WebGPU)

## 📋 System Requirements

### Minimum Requirements
- **Chrome**: Version 113+ (released May 2023)
- **GPU**: DirectX 12, Vulkan, or Metal compatible
- **OS**: Windows 10+, macOS 10.15+, or Linux

### Recommended Requirements
- **Chrome**: Latest version
- **GPU**: Modern NVIDIA/AMD/Intel with dedicated VRAM
- **RAM**: 8GB+ for smooth operation
- **Storage**: 5GB+ free space for model cache

## 🔒 Security Note

Enabling "Unsafe WebGPU" is called "unsafe" because:
- It's an experimental feature
- May have security implications
- Could cause browser instability

However, for this extension:
- ✅ **All processing is local** (no external requests)
- ✅ **No data transmission** to external servers
- ✅ **Privacy-first approach** maintained

## 📞 Need Help?

If you encounter issues:
1. **Check the console** for error messages
2. **Verify WebGPU** is properly enabled
3. **Update Chrome** to the latest version
4. **Restart Chrome** after enabling flags

The extension will automatically detect WebGPU availability and provide appropriate feedback in the console.
