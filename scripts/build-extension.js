import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build script for Chrome Extension
async function buildExtension() {
  console.log('Building Chrome Extension...');

  // Create dist directory if it doesn't exist
  const distDir = path.join(__dirname, '../dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Copy manifest.json
  const manifestPath = path.join(__dirname, '../public/manifest.json');
  const distManifestPath = path.join(distDir, 'manifest.json');
  fs.copyFileSync(manifestPath, distManifestPath);
  console.log('✓ Copied manifest.json');

  // Background script will be built by vite from src/background.ts
  console.log('✓ background.js will be built by vite from src/background.ts');

  // Copy service worker for WebLLM
  const swPath = path.join(__dirname, '../public/sw.ts');
  const distSwPath = path.join(distDir, 'sw.js');
  if (fs.existsSync(swPath)) {
    fs.copyFileSync(swPath, distSwPath);
    console.log('✓ Copied service worker (sw.js)');
  }

  // Copy offscreen document HTML (JavaScript will be built by vite)
  const offscreenHtmlPath = path.join(__dirname, '../public/offscreen.html');
  const distOffscreenHtmlPath = path.join(distDir, 'offscreen.html');
  if (fs.existsSync(offscreenHtmlPath)) {
    fs.copyFileSync(offscreenHtmlPath, distOffscreenHtmlPath);
    console.log('✓ Copied offscreen.html');
  }
  
  console.log('✓ offscreen.js will be built by vite from src/offscreen.ts');

  // Copy icons (if they exist)
  const iconsDir = path.join(__dirname, '../public/icons');
  const distIconsDir = path.join(distDir, 'icons');
  if (fs.existsSync(iconsDir)) {
    if (!fs.existsSync(distIconsDir)) {
      fs.mkdirSync(distIconsDir, { recursive: true });
    }
    fs.readdirSync(iconsDir).forEach(file => {
      fs.copyFileSync(
        path.join(iconsDir, file),
        path.join(distIconsDir, file)
      );
    });
    console.log('✓ Copied icons');
  }

  // Copy AI models (if they exist)
  const modelsDir = path.join(__dirname, '../public/models');
  const distModelsDir = path.join(distDir, 'models');
  if (fs.existsSync(modelsDir)) {
    if (!fs.existsSync(distModelsDir)) {
      fs.mkdirSync(distModelsDir, { recursive: true });
    }
    
    // Copy all model directories
    fs.readdirSync(modelsDir).forEach(modelName => {
      const modelPath = path.join(modelsDir, modelName);
      const distModelPath = path.join(distModelsDir, modelName);
      
      if (fs.statSync(modelPath).isDirectory()) {
        if (!fs.existsSync(distModelPath)) {
          fs.mkdirSync(distModelPath, { recursive: true });
        }
        
        // Copy all files and subdirectories in the model directory recursively
        function copyRecursive(src, dest) {
          if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
          }
          
          fs.readdirSync(src).forEach(item => {
            const srcPath = path.join(src, item);
            const destPath = path.join(dest, item);
            
            if (fs.statSync(srcPath).isDirectory()) {
              copyRecursive(srcPath, destPath);
            } else {
              fs.copyFileSync(srcPath, destPath);
            }
          });
        }
        
        copyRecursive(modelPath, distModelPath);
        
        console.log(`✓ Copied model: ${modelName}`);
      }
    });
  } else {
    console.log('⚠️ No models found - run "npm run download-models" first');
  }

  // Copy WASM files for Transformers.js
  const wasmDir = path.join(__dirname, '../public/wasm');
  const distWasmDir = path.join(distDir, 'wasm');
  if (fs.existsSync(wasmDir)) {
    if (!fs.existsSync(distWasmDir)) {
      fs.mkdirSync(distWasmDir, { recursive: true });
    }
    
    // Copy all WASM files
    fs.readdirSync(wasmDir).forEach(file => {
      fs.copyFileSync(
        path.join(wasmDir, file),
        path.join(distWasmDir, file)
      );
    });
    
    console.log('✓ Copied WASM files for Transformers.js');
  } else {
    console.log('⚠️ No WASM files found - Transformers.js may not work');
  }

  console.log('✓ Extension build complete!');
  console.log('📁 Extension files are in the dist/ directory');
  console.log('🔧 Load the dist/ folder as an unpacked extension in Chrome');
}

buildExtension().catch(console.error);
