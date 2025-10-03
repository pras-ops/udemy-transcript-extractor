// Script to download and bundle AI models for Chrome extension
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Model configurations - Simplified for WebLLM (models downloaded automatically)
const models = [
  {
    name: 'webllm-models',
    description: 'WebLLM models are downloaded automatically when first used',
    files: [],
    size: '~2GB (downloaded on first use)',
    note: 'WebLLM handles model downloading automatically via MLC CDN'
  }
];

// Create models directory
const modelsDir = path.join(__dirname, '..', 'public', 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

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
    request.setTimeout(30000, () => {
      request.destroy();
      file.close();
      fs.unlink(filepath, () => {}); // Delete partial file
      reject(new Error(`Download timeout for ${url}`));
    });
  });
}

// Download all models
async function downloadModels() {
  console.log('🚀 WebLLM Model Setup...');
  console.log('📁 Models will be cached in browser storage');
  
  for (const model of models) {
    console.log(`\n📥 Model: ${model.name}`);
    console.log(`  📝 Description: ${model.description}`);
    console.log(`  📊 Size: ${model.size}`);
    console.log(`  💡 Note: ${model.note}`);
    
    if (model.files.length === 0) {
      console.log(`  ✅ No manual download needed - WebLLM handles this automatically`);
    }
  }
  
  console.log('\n🎉 WebLLM setup complete!');
  console.log('📦 Models will be downloaded automatically on first use');
  console.log('🔧 Load the extension and try AI summarization to trigger model download');
}

// Run the download
downloadModels().catch(console.error);
