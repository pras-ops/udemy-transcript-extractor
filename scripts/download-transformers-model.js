// Script to download DistilBART model for Transformers.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DistilBART model files from Hugging Face
const modelFiles = [
  {
    name: 'config.json',
    url: 'https://huggingface.co/Xenova/distilbart-cnn-6-6/resolve/main/config.json'
  },
  {
    name: 'tokenizer.json',
    url: 'https://huggingface.co/Xenova/distilbart-cnn-6-6/resolve/main/tokenizer.json'
  },
  {
    name: 'tokenizer_config.json',
    url: 'https://huggingface.co/Xenova/distilbart-cnn-6-6/resolve/main/tokenizer_config.json'
  },
  {
    name: 'vocab.json',
    url: 'https://huggingface.co/Xenova/distilbart-cnn-6-6/resolve/main/vocab.json'
  },
  {
    name: 'merges.txt',
    url: 'https://huggingface.co/Xenova/distilbart-cnn-6-6/resolve/main/merges.txt'
  },
  {
    name: 'generation_config.json',
    url: 'https://huggingface.co/Xenova/distilbart-cnn-6-6/resolve/main/generation_config.json'
  },
  {
    name: 'onnx/encoder_model_quantized.onnx',
    url: 'https://huggingface.co/Xenova/distilbart-cnn-6-6/resolve/main/onnx/encoder_model_quantized.onnx'
  },
  {
    name: 'onnx/decoder_model_merged_quantized.onnx',
    url: 'https://huggingface.co/Xenova/distilbart-cnn-6-6/resolve/main/onnx/decoder_model_merged_quantized.onnx'
  }
];

// Download function with redirect handling
function downloadFile(url, filepath, retries = 3) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    const request = https.get(url, (response) => {
      // Handle redirects (301, 302, 307, 308)
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        console.log(`  🔄 Redirecting to: ${response.headers.location}`);
        file.close();
        fs.unlink(filepath, () => {}); // Delete partial file
        
        if (retries <= 0) {
          reject(new Error('Too many redirects'));
          return;
        }
        
        // Handle relative URLs by making them absolute
        let redirectUrl = response.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = 'https://huggingface.co' + redirectUrl;
        }
        
        // Follow redirect recursively
        return downloadFile(redirectUrl, filepath, retries - 1)
          .then(resolve)
          .catch(reject);
      }
      
      // Handle successful response
      if (response.statusCode === 200) {
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve();
        });
        
        file.on('error', (err) => {
          fs.unlink(filepath, () => {}); // Delete partial file
          reject(err);
        });
      } else {
        // Handle other status codes
        file.close();
        fs.unlink(filepath, () => {}); // Delete partial file
        reject(new Error(`Failed to download ${url}: ${response.statusCode} ${response.statusMessage}`));
      }
    });
    
    request.on('error', (err) => {
      file.close();
      fs.unlink(filepath, () => {}); // Delete partial file
      reject(err);
    });
    
    // Set timeout for requests
    request.setTimeout(60000, () => {
      request.destroy();
      file.close();
      fs.unlink(filepath, () => {}); // Delete partial file
      reject(new Error(`Download timeout for ${url}`));
    });
  });
}

// Download all model files
async function downloadDistilBARTModel() {
  console.log('🚀 Downloading DistilBART model for Transformers.js...');
  console.log('📁 Target directory: public/models/Xenova/distilbart-cnn-6-6/');
  
  const modelDir = path.join(__dirname, '..', 'public', 'models', 'Xenova', 'distilbart-cnn-6-6');
  const onnxDir = path.join(modelDir, 'onnx');
  
  // Create directories
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }
  if (!fs.existsSync(onnxDir)) {
    fs.mkdirSync(onnxDir, { recursive: true });
  }
  
  console.log(`📂 Created model directory: ${modelDir}`);
  console.log(`📂 Created ONNX directory: ${onnxDir}`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const file of modelFiles) {
    const filepath = path.join(modelDir, file.name);
    console.log(`\n📥 Downloading: ${file.name}`);
    console.log(`  🔗 URL: ${file.url}`);
    console.log(`  📁 Path: ${filepath}`);
    
    try {
      await downloadFile(file.url, filepath);
      const stats = fs.statSync(filepath);
      console.log(`  ✅ Downloaded (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
      failCount++;
    }
  }
  
  console.log(`\n📊 Download Summary:`);
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  
  if (failCount === 0) {
    console.log('\n🎉 DistilBART model download complete!');
    console.log('🔧 You can now build the extension with: npm run build:extension');
  } else {
    console.log('\n⚠️ Some files failed to download. Please check your internet connection and try again.');
  }
}

// Run the download
downloadDistilBARTModel().catch(console.error);
