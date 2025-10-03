// Test script to verify model files are accessible
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function testModelAccess() {
  console.log('🧪 Testing model file access...');
  
  const modelDir = path.join(__dirname, '..', 'dist', 'models', 'Xenova', 'distilbart-cnn-6-6');
  const onnxDir = path.join(modelDir, 'onnx');
  
  console.log('📁 Model directory:', modelDir);
  console.log('📁 ONNX directory:', onnxDir);
  
  // Check if directories exist
  if (!fs.existsSync(modelDir)) {
    console.error('❌ Model directory does not exist:', modelDir);
    return false;
  }
  
  if (!fs.existsSync(onnxDir)) {
    console.error('❌ ONNX directory does not exist:', onnxDir);
    return false;
  }
  
  // Check required files
  const requiredFiles = [
    'config.json',
    'tokenizer.json',
    'tokenizer_config.json',
    'vocab.json',
    'merges.txt',
    'generation_config.json'
  ];
  
  const requiredOnnxFiles = [
    'encoder_model_quantized.onnx',
    'decoder_model_merged_quantized.onnx'
  ];
  
  console.log('\n📋 Checking model files...');
  let allFilesPresent = true;
  
  for (const file of requiredFiles) {
    const filepath = path.join(modelDir, file);
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      console.log(`✅ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    } else {
      console.error(`❌ ${file} - MISSING`);
      allFilesPresent = false;
    }
  }
  
  console.log('\n📋 Checking ONNX files...');
  for (const file of requiredOnnxFiles) {
    const filepath = path.join(onnxDir, file);
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      console.log(`✅ ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      console.error(`❌ ${file} - MISSING`);
      allFilesPresent = false;
    }
  }
  
  // Check WASM files
  const wasmDir = path.join(__dirname, '..', 'dist', 'wasm');
  const wasmFiles = [
    'ort-wasm.wasm',
    'ort-wasm-threaded.wasm',
    'ort-wasm-simd.wasm',
    'ort-wasm-simd-threaded.wasm'
  ];
  
  console.log('\n📋 Checking WASM files...');
  for (const file of wasmFiles) {
    const filepath = path.join(wasmDir, file);
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      console.log(`✅ ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      console.error(`❌ ${file} - MISSING`);
      allFilesPresent = false;
    }
  }
  
  if (allFilesPresent) {
    console.log('\n🎉 All required files are present!');
    return true;
  } else {
    console.log('\n❌ Some files are missing. Please run the build process again.');
    return false;
  }
}

testModelAccess();
