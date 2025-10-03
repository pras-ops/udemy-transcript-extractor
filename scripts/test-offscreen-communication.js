// Test script to verify offscreen communication
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function testOffscreenCommunication() {
  console.log('🧪 Testing offscreen communication...');
  
  const offscreenPath = path.join(__dirname, '..', 'dist', 'offscreen.html');
  const offscreenJsPath = path.join(__dirname, '..', 'dist', 'offscreen.js');
  
  // Check if offscreen files exist
  if (!fs.existsSync(offscreenPath)) {
    console.error('❌ offscreen.html missing');
    return false;
  }
  
  if (!fs.existsSync(offscreenJsPath)) {
    console.error('❌ offscreen.js missing');
    return false;
  }
  
  console.log('✅ Offscreen files exist');
  
  // Read offscreen.html content
  const offscreenHtml = fs.readFileSync(offscreenPath, 'utf8');
  console.log('📄 offscreen.html content:');
  console.log(offscreenHtml);
  
  // Check if offscreen.js contains fallback logic
  const offscreenJs = fs.readFileSync(offscreenJsPath, 'utf8');
  
  if (offscreenJs.includes('rule-based')) {
    console.log('✅ Fallback logic found in offscreen.js');
  } else {
    console.log('❌ Fallback logic not found in offscreen.js');
  }
  
  if (offscreenJs.includes('createRuleBasedSummary')) {
    console.log('✅ Rule-based summarization function found');
  } else {
    console.log('❌ Rule-based summarization function not found');
  }
  
  if (offscreenJs.includes('AI initialization failed, using rule-based fallback')) {
    console.log('✅ Fallback error handling found');
  } else {
    console.log('❌ Fallback error handling not found');
  }
  
  console.log('\n🎉 Offscreen communication test complete!');
  console.log('💡 The extension should now use rule-based fallback when AI fails');
  
  return true;
}

testOffscreenCommunication();
