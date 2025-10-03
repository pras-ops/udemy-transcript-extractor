// Script to setup local AI models for Chrome extension
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from '@xenova/transformers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Model configurations
const models = [
  {
    name: 'Xenova/distilbart-cnn-6-6',
    size: '~50MB',
    description: 'Fast summarization model'
  },
  {
    name: 'Xenova/distilbart-cnn-12-6', 
    size: '~100MB',
    description: 'Balanced summarization model'
  }
];

// Create models directory
const modelsDir = path.join(__dirname, '..', 'public', 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Download and cache models
async function setupModels() {
  console.log('🚀 Setting up local AI models for Chrome extension...');
  console.log('📁 Models will be cached in:', modelsDir);
  
  for (const model of models) {
    console.log(`\n📥 Setting up model: ${model.name} (${model.size})`);
    console.log(`📝 Description: ${model.description}`);
    
    try {
      console.log(`⏱️ Loading ${model.name}...`);
      
      // This will download and cache the model
      const summarizer = await pipeline('summarization', model.name, {
        quantized: true,
        use_cache: true,
        use_worker: false,
        local_files_only: false, // Allow download for initial setup
        allow_remote: true,
        use_cdn: false,
        use_shared_array_buffer: false,
        use_webgl: false,
        use_tensorflow: false,
        use_onnx: true,
        onnx_execution_providers: ['cpu']
      });
      
      console.log(`✅ ${model.name} loaded and cached successfully`);
      
      // Test the model with a simple example
      const testText = "This is a test transcript for model validation. The model should be able to summarize this text effectively.";
      const result = await summarizer(testText, {
        max_length: 50,
        min_length: 10,
        do_sample: false
      });
      
      console.log(`🧪 Test summary: ${result[0].summary_text}`);
      console.log(`✅ ${model.name} test passed`);
      
    } catch (error) {
      console.error(`❌ Failed to setup ${model.name}:`, error.message);
      throw error;
    }
  }
  
  console.log('\n🎉 All models setup successfully!');
  console.log('📦 Models are now cached and ready for local use');
  console.log('🔧 Next: Run "npm run build:extension" to bundle the extension');
}

// Run the setup
setupModels().catch(console.error);
