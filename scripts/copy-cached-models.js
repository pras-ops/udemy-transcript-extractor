// Script to find and copy cached Transformers.js models
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Possible cache locations
const possibleCacheLocations = [
  path.join(os.homedir(), '.cache', 'huggingface', 'hub'),
  path.join(os.homedir(), '.cache', 'transformers'),
  path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'IndexedDB'),
  path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'IndexedDB'),
  path.join(os.homedir(), 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles'),
  // Browser cache locations
  path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
  path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
];

// Model names to look for
const modelNames = [
  'models--Xenova--distilbart-cnn-6-6',
  'models--Xenova--distilbart-cnn-12-6',
  'distilbart-cnn-6-6',
  'distilbart-cnn-12-6'
];

// Target directory
const targetDir = path.join(__dirname, '..', 'public', 'models');

function findModelCache() {
  console.log('🔍 Searching for cached Transformers.js models...');
  
  for (const cacheLocation of possibleCacheLocations) {
    if (fs.existsSync(cacheLocation)) {
      console.log(`📁 Checking: ${cacheLocation}`);
      
      try {
        const items = fs.readdirSync(cacheLocation);
        
        for (const item of items) {
          for (const modelName of modelNames) {
            if (item.includes(modelName) || item.includes('distilbart')) {
              const fullPath = path.join(cacheLocation, item);
              console.log(`✅ Found potential model: ${fullPath}`);
              
              if (fs.statSync(fullPath).isDirectory()) {
                return fullPath;
              }
            }
          }
        }
      } catch (error) {
        // Skip inaccessible directories
        continue;
      }
    }
  }
  
  return null;
}

function copyModelFiles(sourceDir, targetModelDir) {
  if (!fs.existsSync(targetModelDir)) {
    fs.mkdirSync(targetModelDir, { recursive: true });
  }
  
  try {
    const items = fs.readdirSync(sourceDir);
    
    for (const item of items) {
      const sourcePath = path.join(sourceDir, item);
      const targetPath = path.join(targetModelDir, item);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        // Recursively copy subdirectories
        copyModelFiles(sourcePath, targetPath);
      } else {
        // Copy files
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`📄 Copied: ${item}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error copying from ${sourceDir}:`, error.message);
    return false;
  }
}

async function copyCachedModels() {
  console.log('🚀 Starting cached model copy process...');
  
  // Find cached models
  const cacheLocation = findModelCache();
  
  if (!cacheLocation) {
    console.log('❌ No cached models found in standard locations');
    console.log('💡 Models may be cached in browser IndexedDB or need to be downloaded');
    return;
  }
  
  console.log(`✅ Found cached models at: ${cacheLocation}`);
  
  // Create target directory
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  // Copy models
  const modelDirs = fs.readdirSync(cacheLocation);
  
  for (const modelDir of modelDirs) {
    if (modelDir.includes('distilbart')) {
      const sourcePath = path.join(cacheLocation, modelDir);
      const targetPath = path.join(targetDir, modelDir.replace('models--Xenova--', ''));
      
      console.log(`📦 Copying ${modelDir}...`);
      
      if (copyModelFiles(sourcePath, targetPath)) {
        console.log(`✅ Successfully copied ${modelDir}`);
      } else {
        console.log(`❌ Failed to copy ${modelDir}`);
      }
    }
  }
  
  console.log('🎉 Model copy process completed!');
  console.log('📁 Models are now in:', targetDir);
}

// Run the copy process
copyCachedModels().catch(console.error);
