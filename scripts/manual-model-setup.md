# 🤖 Manual Model Setup Guide

## 📋 **Quick Setup Instructions**

Since the automatic model download had issues, here's how to manually set up the models:

### **Step 1: Create Model Directories**
```bash
mkdir public\models\distilbart-cnn-6-6
mkdir public\models\distilbart-cnn-12-6
```

### **Step 2: Download Model Files**

For each model, download these files to the respective directory:

#### **distilbart-cnn-6-6** (Fast Model - ~50MB)
Download from: `https://huggingface.co/Xenova/distilbart-cnn-6-6/resolve/main/`

Files needed:
- `config.json`
- `pytorch_model.bin`
- `tokenizer.json`
- `tokenizer_config.json`
- `vocab.json`

#### **distilbart-cnn-12-6** (Balanced Model - ~100MB)
Download from: `https://huggingface.co/Xenova/distilbart-cnn-12-6/resolve/main/`

Files needed:
- `config.json`
- `pytorch_model.bin`
- `tokenizer.json`
- `tokenizer_config.json`
- `vocab.json`

### **Step 3: Verify File Structure**
```
public/
├── models/
│   ├── distilbart-cnn-6-6/
│   │   ├── config.json
│   │   ├── pytorch_model.bin
│   │   ├── tokenizer.json
│   │   ├── tokenizer_config.json
│   │   └── vocab.json
│   └── distilbart-cnn-12-6/
│       ├── config.json
│       ├── pytorch_model.bin
│       ├── tokenizer.json
│       ├── tokenizer_config.json
│       └── vocab.json
```

### **Step 4: Build Extension**
```bash
npm run build:extension
```

### **Step 5: Test Extension**
Load the `dist/` folder as an unpacked extension in Chrome and test the AI summarization.

## 🎯 **Alternative: Use Browser Cache**

If manual download is not feasible, the extension will automatically use the browser's cached models from the setup process. The models are already cached and ready to use.

## 📊 **Model Performance**

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| `distilbart-cnn-6-6` | 50MB | Fast | Good | Low-end devices |
| `distilbart-cnn-12-6` | 100MB | Balanced | Better | Mid-range devices |

## 🔧 **Troubleshooting**

- **Models not loading**: Check file permissions and ensure all files are downloaded
- **Empty model files**: Re-download the files (they should be several MB each)
- **Extension errors**: Check browser console for specific error messages
- **Performance issues**: Try the smaller model first

---

**Ready to use!** Your extension will now have powerful AI capabilities bundled locally. 🚀
