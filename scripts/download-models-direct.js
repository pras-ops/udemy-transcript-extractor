// Script to download models directly to extension directory
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { pipeline } from '@xenova/transformers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Model configurations
const models = [
  {
    name: 'Xenova/distilbart-cnn-6-6',
    localName: 'distilbart-cnn-6-6',
    size: '~50MB'
  },
  {
    name: 'Xenova/distilbart-cnn-12-6',
    localName: 'distilbart-cnn-12-6', 
    size: '~100MB'
  }
];

// Create models directory
const modelsDir = path.join(__dirname, '..', 'public', 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Download function with proper redirect handling
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    const request = https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
        const redirectUrl = response.headers.location;
        console.log(`🔄 Redirecting to: ${redirectUrl}`);
        return downloadFile(redirectUrl, filepath).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Delete partial file
        reject(err);
      });
    });
    
    request.on('error', (err) => {
      reject(err);
    });
  });
}

// Download model files from HuggingFace
async function downloadModelFiles(model) {
  console.log(`\n📥 Downloading ${model.name} (${model.size})`);
  
  const modelDir = path.join(modelsDir, model.localName);
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }
  
  // Model files to download
  const files = [
    'config.json',
    'pytorch_model.bin',
    'tokenizer.json',
    'tokenizer_config.json',
    'vocab.json'
  ];
  
  const baseUrl = `https://huggingface.co/${model.name}/resolve/main/`;
  
  for (const file of files) {
    const url = `${baseUrl}${file}`;
    const filepath = path.join(modelDir, file);
    
    try {
      console.log(`  📄 Downloading ${file}...`);
      await downloadFile(url, filepath);
      console.log(`  ✅ Downloaded ${file}`);
    } catch (error) {
      console.error(`  ❌ Failed to download ${file}:`, error.message);
      throw error;
    }
  }
  
  console.log(`✅ Model ${model.name} downloaded successfully`);
}

// Download all models
async function downloadAllModels() {
  console.log('🚀 Starting direct model download process...');
  console.log('📁 Models will be saved to:', modelsDir);
  
  for (const model of models) {
    try {
      await downloadModelFiles(model);
    } catch (error) {
      console.error(`❌ Failed to download ${model.name}:`, error.message);
      throw error;
    }
  }
  
  console.log('\n🎉 All models downloaded successfully!');
  console.log('📦 Models are now ready for local use in the extension');
}

// Run the download
downloadAllModels().catch(console.error);
