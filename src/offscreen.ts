// Transformers.js Offscreen Document for Chrome Extension
// Handles AI model loading and inference in offscreen context (CPU-only for Intel i5)

declare const chrome: any;

// Configure ONNX Runtime Web WASM paths at the global level BEFORE any imports
// This must be done before any ONNX Runtime Web modules are loaded
if (typeof window !== 'undefined' && window.chrome && window.chrome.runtime) {
  // Set global WASM paths for ONNX Runtime Web
  (window as any).ort = (window as any).ort || {};
  (window as any).ort.env = (window as any).ort.env || {};
  (window as any).ort.env.wasm = (window as any).ort.env.wasm || {};
  (window as any).ort.env.wasm.wasmPaths = {
    'ort-wasm.wasm': chrome.runtime.getURL('wasm/ort-wasm.wasm'),
    'ort-wasm-threaded.wasm': chrome.runtime.getURL('wasm/ort-wasm-threaded.wasm'),
    'ort-wasm-simd.wasm': chrome.runtime.getURL('wasm/ort-wasm-simd.wasm'),
    'ort-wasm-simd-threaded.wasm': chrome.runtime.getURL('wasm/ort-wasm-simd-threaded.wasm'),
  };
}

// Import Transformers.js only (CPU-only mode for Intel i5)
import { pipeline, env } from '@xenova/transformers';
import * as ort from 'onnxruntime-web';

let summarizer: any = null;
let isInitialized = false;
let isProcessing = false;
let currentModel: string | null = null;

// Also set the paths after import as backup
ort.env.wasm.wasmPaths = {
  'ort-wasm.wasm': chrome.runtime.getURL('wasm/ort-wasm.wasm'),
  'ort-wasm-threaded.wasm': chrome.runtime.getURL('wasm/ort-wasm-threaded.wasm'),
  'ort-wasm-simd.wasm': chrome.runtime.getURL('wasm/ort-wasm-simd.wasm'),
  'ort-wasm-simd-threaded.wasm': chrome.runtime.getURL('wasm/ort-wasm-simd-threaded.wasm'),
} as any;

// Configure Transformers.js for local WASM with remote fallback
env.allowRemoteModels = true;  // Allow remote model downloads as fallback
env.allowLocalModels = true;
env.useBrowserCache = true;  // Enable browser cache for better performance
env.localModelPath = chrome.runtime.getURL('models/Xenova/distilbart-cnn-6-6/');
env.backends.onnx.wasm.numThreads = 1;  // CPU-only, single-thread for Intel i5 stability
env.backends.onnx.wasm.proxy = false;  // No proxy, direct CPU execution

// Force local WASM usage and disable CDN fetches
env.backends.onnx.wasm.wasmPaths = {
  'ort-wasm.wasm': chrome.runtime.getURL('wasm/ort-wasm.wasm'),
  'ort-wasm-threaded.wasm': chrome.runtime.getURL('wasm/ort-wasm-threaded.wasm'),
  'ort-wasm-simd.wasm': chrome.runtime.getURL('wasm/ort-wasm-simd.wasm'),
  'ort-wasm-simd-threaded.wasm': chrome.runtime.getURL('wasm/ort-wasm-simd-threaded.wasm'),
};

// Additional configuration to prevent CDN fetches
env.remoteModelPath = '';  // Disable remote model path
env.remotePath = '';  // Disable remote path
env.remoteURL = '';  // Disable remote URL

// Initialize Transformers.js (CPU-only for Intel i5)
async function initializeSummarizer() {
  if (summarizer) return summarizer;
  
  console.log('🔄 Offscreen: Initializing Transformers.js DistilBART locally...');
  console.log('🔄 Offscreen: CPU-only mode for Intel i5 8th gen (slow but compatible)');
  
  try {
    // First try local model path
    const localModelPath = chrome.runtime.getURL('models/Xenova/distilbart-cnn-6-6/');
    console.log('🔄 Offscreen: Using local model at:', localModelPath);
    
    // Check if local model files exist by trying to access them
    try {
      const response = await fetch(localModelPath + 'config.json');
      if (!response.ok) {
        throw new Error('Local model files not found');
      }
      console.log('✅ Offscreen: Local model files found');
    } catch (fetchError) {
      console.log('⚠️ Offscreen: Local model files not found, trying remote model');
      // Fallback to remote model if local files not available
      summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6', {
        quantized: true,
        progress_callback: (progress: any) => {
          console.log(`🎯 Offscreen: Transformers.js progress: ${JSON.stringify(progress)}`);
          chrome.runtime.sendMessage({
            type: 'TRANSFORMERS_LOAD_PROGRESS',
            progress: progress,
          });
        },
      });
    }
    
    // If we get here, try local model
    if (!summarizer) {
      summarizer = await pipeline('summarization', localModelPath, {
        quantized: true, // CPU-friendly quantized model
        progress_callback: (progress: any) => {
          console.log(`🎯 Offscreen: Transformers.js progress: ${JSON.stringify(progress)}`);
          chrome.runtime.sendMessage({
            type: 'TRANSFORMERS_LOAD_PROGRESS',
            progress: progress,
          });
        },
      });
    }
    
    console.log('✅ Offscreen: Transformers.js initialized on CPU (slow but compatible)');
    isInitialized = true;
    currentModel = 'distilbart-cnn-6-6';
    
    return summarizer;
    
  } catch (error) {
    console.error('❌ Offscreen: Transformers.js initialization failed:', error);
    console.error('❌ Offscreen: Error details:', error.message);
    console.error('❌ Offscreen: This may be due to missing model files or hardware compatibility issues.');
    throw new Error('System not compatible: AI model initialization failed. Please ensure all model files are downloaded and your hardware supports WebAssembly.');
  }
}

// Create enhanced prompt
function createEnhancedPrompt(transcript: string, options: any = {}): string {
  let prompt = `Summarize this educational transcript concisely and accurately:\n\n${transcript}`;

  if (options.mode === 'detailed') {
    prompt += '\n\nProvide a detailed summary with key concepts and explanations.';
  } else if (options.mode === 'concise') {
    prompt += '\n\nProvide a concise summary focusing on main points.';
  } else {
    prompt += '\n\nProvide a balanced summary with key concepts and main points.';
  }

  if (options.subject) {
    prompt += `\n\nFocus on ${options.subject} concepts and terminology.`;
  }

  return prompt;
}

// Summarize transcript using Transformers.js
async function summarizeTranscript(transcript: string, options: any = {}): Promise<string> {
  if (!summarizer) {
    throw new Error('System not compatible: No AI engines available. Your hardware may not support AI processing.');
  }

  console.log('🔄 Offscreen: Using Transformers.js for CPU-only summarization...');

  try {
    const result = await summarizer(transcript, {
      max_length: options.maxTokens || 500,
      min_length: 100,
      do_sample: false, // Deterministic output
      temperature: options.temperature || 0.3,
    });

    return result[0].summary_text;

  } catch (error) {
    console.error('❌ Offscreen: Transformers.js summarization failed:', error);
    throw error;
  }
}

// Simple rule-based summarization fallback
function createRuleBasedSummary(transcript: string, options: any = {}): string {
  console.log('🔄 Offscreen: Using rule-based summarization fallback...');
  
  // Split transcript into sentences
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Take first few sentences as summary (simple approach)
  const summaryLength = options.mode === 'detailed' ? 5 : 3;
  const summary = sentences.slice(0, summaryLength).join('. ').trim();
  
  return summary + (summary.endsWith('.') ? '' : '.');
}

// Handle AI summarization request
async function handleAISummarize(message: any) {
  try {
    const { transcript, options = {} } = message.data;

    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript provided');
    }

    // Check if already processing (debouncing)
    if (isProcessing) {
      console.log('⚠️ Offscreen: Already processing, ignoring duplicate request');
      return;
    }

    console.log('🎯 Offscreen: Processing transcript...');

    isProcessing = true;

    try {
      // Try AI initialization first, but fallback to rule-based if it fails
      let summary: string;
      let engineUsed: string;
      let modeUsed: string;

      try {
        if (!isInitialized) {
          await initializeSummarizer();
        }
        
        if (summarizer && isInitialized) {
          // Use AI summarization
          summary = await summarizeTranscript(transcript, options);
          engineUsed = 'transformers-cpu';
          modeUsed = 'Transformers.js (CPU)';
          console.log('✅ Offscreen: AI summarization completed');
        } else {
          throw new Error('AI model not available');
        }
      } catch (aiError) {
        console.log('⚠️ Offscreen: AI initialization failed, using rule-based fallback');
        console.log('⚠️ Offscreen: AI error:', aiError.message);
        
        // Use rule-based fallback
        summary = createRuleBasedSummary(transcript, options);
        engineUsed = 'rule-based';
        modeUsed = 'Rule-based (Fallback)';
        console.log('✅ Offscreen: Rule-based summarization completed');
      }

      chrome.runtime.sendMessage({
        type: 'AI_SUMMARIZE_RESPONSE',
        messageId: message.messageId,
        data: {
          success: true,
          summary: summary,
          engine: engineUsed,
          wordCount: summary.split(/\s+/).length,
          hierarchical: false,
          metadata: {
            processingTime: Date.now(),
            originalWordCount: transcript.split(/\s+/).length,
            summaryWordCount: summary.split(/\s+/).length,
            model: currentModel || 'rule-based',
            mode: modeUsed
          }
        }
      });

      console.log('✅ Offscreen: Summarization completed successfully');

    } finally {
      isProcessing = false;
    }

  } catch (error) {
    console.error('❌ Offscreen: AI summarize error:', error);
    isProcessing = false;

    chrome.runtime.sendMessage({
      type: 'AI_SUMMARIZE_RESPONSE',
      messageId: message.messageId,
      data: {
        success: false,
        error: error instanceof Error ? error.message : 'System not compatible: Unknown error occurred'
      }
    });
  }
}

// Handle check engines request
async function handleCheckEngines(message: any) {
  try {
    console.log('🔍 Offscreen: Checking available AI engines...');

    const engines = {
      transformers: false,
      webllm: false,
      fallback: true
    };

    // Test Transformers.js availability
    try {
      if (!isInitialized) {
        await initializeSummarizer();
      }
      engines.transformers = true;
      console.log('✅ Offscreen: Transformers.js is available');
    } catch (error) {
      console.log('❌ Offscreen: Transformers.js not available:', error);
    }

    chrome.runtime.sendMessage({
      type: 'CHECK_ENGINES_RESPONSE',
      messageId: message.messageId,
      data: {
        success: true,
        engines: engines,
        recommended: engines.transformers ? 'transformers' : 'fallback'
      }
    });

  } catch (error) {
    console.error('❌ Offscreen: Check engines error:', error);
    chrome.runtime.sendMessage({
      type: 'CHECK_ENGINES_RESPONSE',
      messageId: message.messageId,
      data: {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check engines'
      }
    });
  }
}

// Handle test communication
async function handleTestCommunication(message: any) {
  console.log('🧪 Offscreen: Test communication received');
  
  chrome.runtime.sendMessage({
    type: 'TEST_COMMUNICATION_RESPONSE',
    messageId: message.messageId,
    data: {
      success: true,
      message: 'Offscreen document is working correctly',
      timestamp: Date.now()
    }
  });
}

// Set up message listeners
chrome.runtime.onMessage.addListener(async (message: any, sender: any, sendResponse: any) => {
  console.log('📨 Offscreen: Received message:', message.type);

  try {
    switch (message.type) {
      case 'AI_SUMMARIZE':
        await handleAISummarize(message);
        break;

      case 'CHECK_ENGINES':
        await handleCheckEngines(message);
        break;

      case 'TEST_COMMUNICATION':
        await handleTestCommunication(message);
        break;

      default:
        console.log('⚠️ Offscreen: Unknown message type:', message.type);
    }
  } catch (error) {
    console.error('❌ Offscreen: Message handling error:', error);
  }

  return true; // Keep message channel open for async responses
});

console.log('🚀 Offscreen: Transformers.js offscreen document loaded (CPU-only mode)');