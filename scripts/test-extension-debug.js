// Debug script to test extension functionality
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function testExtensionDebug() {
  console.log('🧪 Testing extension debug...');
  
  const distDir = path.join(__dirname, '..', 'dist');
  
  // Check if dist directory exists
  if (!fs.existsSync(distDir)) {
    console.error('❌ Dist directory does not exist');
    return false;
  }
  
  console.log('✅ Dist directory exists');
  
  // Check key files
  const keyFiles = [
    'manifest.json',
    'background.js',
    'offscreen.js',
    'offscreen.html'
  ];
  
  console.log('\n📋 Checking key files...');
  for (const file of keyFiles) {
    const filepath = path.join(distDir, file);
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      console.log(`✅ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    } else {
      console.error(`❌ ${file} - MISSING`);
    }
  }
  
  // Check model files
  const modelDir = path.join(distDir, 'models', 'Xenova', 'distilbart-cnn-6-6');
  console.log('\n📋 Checking model files...');
  if (fs.existsSync(modelDir)) {
    const files = fs.readdirSync(modelDir);
    console.log(`✅ Model directory exists with ${files.length} items`);
    files.forEach(file => {
      const filepath = path.join(modelDir, file);
      const stats = fs.statSync(filepath);
      if (stats.isDirectory()) {
        console.log(`  📁 ${file}/ (directory)`);
      } else {
        console.log(`  📄 ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      }
    });
  } else {
    console.log('⚠️ Model directory does not exist - will use fallback');
  }
  
  // Check WASM files
  const wasmDir = path.join(distDir, 'wasm');
  console.log('\n📋 Checking WASM files...');
  if (fs.existsSync(wasmDir)) {
    const files = fs.readdirSync(wasmDir);
    console.log(`✅ WASM directory exists with ${files.length} files`);
    files.forEach(file => {
      const filepath = path.join(wasmDir, file);
      const stats = fs.statSync(filepath);
      console.log(`  📄 ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    });
  } else {
    console.log('❌ WASM directory does not exist');
  }
  
  // Check manifest.json content
  console.log('\n📋 Checking manifest.json...');
  try {
    const manifestPath = path.join(distDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`✅ Manifest version: ${manifest.version}`);
    console.log(`✅ Manifest name: ${manifest.name}`);
    
    if (manifest.content_security_policy) {
      console.log(`✅ CSP configured: ${manifest.content_security_policy.extension_pages}`);
    }
  } catch (error) {
    console.error('❌ Error reading manifest:', error.message);
  }
  
  console.log('\n🎉 Extension debug complete!');
  console.log('💡 If model files are missing, the extension will use rule-based fallback');
  console.log('💡 If WASM files are missing, the extension may not work properly');
  
  return true;
}

testExtensionDebug();
