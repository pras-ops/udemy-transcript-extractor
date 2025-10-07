// WebLLM Offscreen Document for Chrome Extension
// Handles AI model loading and inference in offscreen context with WebLLM and Transformers.js fallback

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

// Import WebLLM and Transformers.js
import * as webllm from '@mlc-ai/web-llm';
import { pipeline, env } from '@xenova/transformers';
import * as ort from 'onnxruntime-web';

// AI Engine state
let aiEngine: any = null;
let aiInitialized = false;
let summarizer: any = null;
let transformersInitialized = false;
let progressCallbackActive = true;
let isProcessing = false;
let useFallback = false;
let isInitializing = false; // Prevent multiple concurrent initializations

// Also set the paths after import as backup
ort.env.wasm.wasmPaths = {
  'ort-wasm.wasm': chrome.runtime.getURL('wasm/ort-wasm.wasm'),
  'ort-wasm-threaded.wasm': chrome.runtime.getURL('wasm/ort-wasm-threaded.wasm'),
  'ort-wasm-simd.wasm': chrome.runtime.getURL('wasm/ort-wasm-simd.wasm'),
  'ort-wasm-simd-threaded.wasm': chrome.runtime.getURL('wasm/ort-wasm-simd-threaded.wasm'),
} as any;

// Configure Transformers.js for local WASM with remote fallback
env.allowRemoteModels = true;  // Allow remote models as fallback
env.allowLocalModels = true;
env.useBrowserCache = true;  // Enable browser cache for better performance
env.localModelPath = chrome.runtime.getURL('models/');
env.backends.onnx.wasm.numThreads = navigator.hardwareConcurrency || 4;  // Use all available CPU cores for better performance
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

// Initialize AI engines with WebLLM as primary, Transformers.js as fallback
async function initializeAI() {
  if (aiInitialized || transformersInitialized) {
    console.log('⚠️ Offscreen: AI already initialized, skipping...');
    return;
  }

  if (isInitializing) {
    console.log('⚠️ Offscreen: AI initialization already in progress, skipping...');
    return;
  }

  isInitializing = true;
  console.log('🔄 Offscreen: Initializing AI engines...');
  
  // Check WebGPU support
  if (!navigator.gpu) {
    console.log('⚠️ Offscreen: WebGPU not supported, using CPU-only mode');
  }

  try {
    // Try WebLLM first (GPU accelerated if available)
    console.log('🔄 Offscreen: Initializing WebLLM with Phi-3.5-mini...');
    
    if (!navigator.gpu) {
      console.warn('⚠️ Offscreen: WebGPU not supported, falling back to CPU');
    }
    
    // Create WebLLM engine with proper configuration
    const engine = await webllm.CreateMLCEngine({
      model: 'Llama-3-2-3B-Instruct-q4f32_1-MLC', // Use recommended model
      // Basic configuration for Chrome extension
      useIndexedDBCache: true,
      // Let WebLLM handle WebGPU detection automatically
      // Don't force useWebGPU or useWorker settings
    });
    
    aiEngine = engine;
    aiInitialized = true;
    console.log('✅ Offscreen: WebLLM initialized with Llama-3-2-3B-Instruct');

  } catch (webllmError) {
    console.log('⚠️ Offscreen: WebLLM initialization failed, trying Transformers.js fallback');
    console.log('⚠️ Offscreen: WebLLM error:', webllmError.message);
    
      try {
        // Fallback to Transformers.js (CPU-only)
        console.log('🔄 Offscreen: Initializing Transformers.js DistilBART...');
        console.log('🔄 Offscreen: CPU-only mode (optimized for Intel i5/i7 8th gen)');
        
        // Reset progress callback flag for Transformers.js
        progressCallbackActive = true;

        // Log paths for debugging
        const localModelPath = chrome.runtime.getURL('models/');
        console.log('🔄 Offscreen: WASM path:', chrome.runtime.getURL('wasm/ort-wasm.wasm'));
        console.log('🔄 Offscreen: Model path:', localModelPath);
    
    // Check if local model files exist by trying to access them
        let useLocalModel = false;
        try {
          const response = await fetch(localModelPath + 'Xenova/distilbart-cnn-6-6/config.json');
          if (response.ok) {
            console.log('✅ Offscreen: Local model files found');
            useLocalModel = true;
          } else {
        throw new Error('Local model files not found');
      }
    } catch (fetchError) {
          console.log('⚠️ Offscreen: Local model files not found, using remote model');
          useLocalModel = false;
        }
        
        // No timeout - let models load naturally
        
        // Create a single progress callback to avoid duplication
        const transformersProgressCallback = (progress: any) => {
          // Stop progress callback if we're already done
          if (!progressCallbackActive) {
            return;
          }
          
          console.log(`🎯 Offscreen: Transformers.js progress: ${JSON.stringify(progress)}`);
          
          // Send progress message only if status indicates progress
          if (progress.status && (progress.status === 'loading' || progress.status === 'downloading' || progress.status === 'ready' || progress.status === 'loaded')) {
            chrome.runtime.sendMessage({
              type: 'TRANSFORMERS_LOAD_PROGRESS',
              progress: progress,
            });
          }
              
          // Check if model is ready and stop progress spam
          if (progress.status === 'ready' || progress.status === 'loaded') {
            console.log('✅ Offscreen: Transformers.js model ready');
            progressCallbackActive = false;
            return;
          }
        };

        // Initialize with local or remote model - simplified configuration
        const initPromise = pipeline('summarization', 'Xenova/distilbart-cnn-6-6', {
          quantized: true, // CPU-friendly quantized model
          progress_callback: transformersProgressCallback,
          // Basic configuration for Chrome extension
          use_cache: true,
          local_files_only: false, // Allow remote model downloads
          allow_remote: true
        });

        // Initialize model without timeout
        summarizer = await initPromise;

      transformersInitialized = true;
      console.log('✅ Offscreen: Transformers.js initialized on CPU');

    } catch (transformersError) {
      console.error('❌ Offscreen: Transformers.js initialization failed:', transformersError);
      console.error('❌ Offscreen: Error details:', {
        message: transformersError.message,
        stack: transformersError.stack,
        name: transformersError.name
      });
      
        // Try fallback model if primary fails
        try {
          console.log('🔄 Offscreen: Trying fallback model: Xenova/distilbart-cnn-6-6...');
          const fallbackPromise = pipeline('summarization', 'Xenova/distilbart-cnn-6-6', {
            quantized: true,
            progress_callback: transformersProgressCallback,
            use_cache: true,
            local_files_only: false,
            allow_remote: true
          });
        
        summarizer = await fallbackPromise;
        transformersInitialized = true;
        console.log('✅ Offscreen: Fallback model loaded successfully');
      } catch (fallbackError) {
        console.error('❌ Offscreen: Fallback model also failed:', fallbackError);
        transformersInitialized = false;
        useFallback = true;
        console.log('⚠️ Offscreen: Using rule-based fallback only');
      }
    }
  } finally {
    // Always reset initialization flag
    isInitializing = false;
  }
}

// Preprocess transcript to clean up raw video data
function preprocessTranscript(transcript: string): string {
  console.log('🔄 Offscreen: Preprocessing transcript...');
  
  // Remove empty markers and clean up text
  let cleaned = transcript
    // Remove empty [] markers
    .replace(/\[\]/g, '')
    // Remove timestamp markers like [00:01:23]
    .replace(/\[\d{2}:\d{2}:\d{2}\]/g, '')
    // Remove standalone [] 
    .replace(/\[\s*\]/g, '')
    // Fix broken sentences that end with dots
    .replace(/([a-z])\.\s*([A-Z])/g, '$1. $2')
    // Fix double spaces
    .replace(/\s+/g, ' ')
    // Fix broken words that got split
    .replace(/\b(\w+)\s+\1\b/g, '$1')
    // Remove extra whitespace
    .trim();

  // Split into sentences and clean each one
  const sentences = cleaned.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  
  // Rejoin with proper punctuation
  cleaned = sentences.join('. ') + (sentences.length > 0 ? '.' : '');
  
  console.log('✅ Offscreen: Transcript cleaned. Original length:', transcript.length, 'Cleaned length:', cleaned.length);
  console.log('📝 Offscreen: First 200 chars of cleaned transcript:', cleaned.substring(0, 200) + '...');
  
  return cleaned;
}

// Create enhanced prompt for WebLLM
function createEnhancedPrompt(transcript: string, options: any = {}): string {
  const mode = options.mode || 'balanced';
  const maxLength = options.maxTokens || 500;
  
  // Preprocess the transcript first
  const cleanedTranscript = preprocessTranscript(transcript);
  
  return `Please provide a concise summary of the following educational video transcript in approximately ${maxLength} words.

Focus on:
- Main topics and key concepts explained
- Important definitions and formulas
- Key examples and practical applications
- Learning outcomes and takeaways

Educational Transcript:
${cleanedTranscript}

Summary:`;
}

// Summarize transcript using WebLLM
async function summarizeWithWebLLM(transcript: string, options: any = {}): Promise<string> {
  if (!aiEngine) {
    throw new Error('WebLLM not initialized');
  }

  console.log('🔄 Offscreen: Using WebLLM for summarization...');
  console.log('📝 Offscreen: WebLLM input transcript length:', transcript.length);

  try {
    const prompt = createEnhancedPrompt(transcript, options);
    console.log('📝 Offscreen: WebLLM prompt length:', prompt.length);
    
    // Use WebLLM chat completions API (recommended approach)
    const response = await aiEngine.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: options.maxTokens || 256,
      temperature: options.temperature || 0.7
    });

    const summary = response.choices[0].message.content;

    console.log('✅ Offscreen: WebLLM response received');
    console.log('📝 Offscreen: WebLLM response length:', summary.length);
    console.log('📝 Offscreen: WebLLM response preview:', summary.substring(0, 200) + '...');

    return summary;

  } catch (error) {
    console.error('❌ Offscreen: WebLLM summarization failed:', error);
    throw error;
  }
}

// Summarize transcript using Transformers.js
async function summarizeWithTransformers(transcript: string, options: any = {}): Promise<string> {
  if (!summarizer) {
    throw new Error('Transformers.js not initialized');
  }

  console.log('🔄 Offscreen: Using Transformers.js for summarization...');
  console.log('📝 Offscreen: Transformers.js input transcript length:', transcript.length);

  try {
    // Preprocess transcript before summarization
    const cleanedTranscript = preprocessTranscript(transcript);
    console.log('📝 Offscreen: Transformers.js cleaned transcript length:', cleanedTranscript.length);
    
    const result = await summarizer(cleanedTranscript, {
      max_length: options.maxTokens || 500,
      min_length: 100,
      do_sample: false, // Deterministic output
      temperature: options.temperature || 0.3,
    });

    console.log('✅ Offscreen: Transformers.js response received');
    console.log('📝 Offscreen: Transformers.js response length:', result[0].summary_text.length);
    console.log('📝 Offscreen: Transformers.js response preview:', result[0].summary_text.substring(0, 200) + '...');

    return result[0].summary_text;

  } catch (error) {
    console.error('❌ Offscreen: Transformers.js summarization failed:', error);
    throw error;
  }
}

// Enhanced rule-based summarization fallback
function createRuleBasedSummary(transcript: string, options: any = {}): string {
  console.log('🔄 Offscreen: Using enhanced rule-based summarization fallback...');
  
  // Preprocess transcript first
  const cleanedTranscript = preprocessTranscript(transcript);
  
  // Split transcript into sentences and paragraphs
  const sentences = cleanedTranscript.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const paragraphs = cleanedTranscript.split(/\n\s*\n/).filter(p => p.trim().length > 50);
  
  // Extract key information using multiple strategies
  let summary = '';
  
  // Strategy 1: Extract educational keywords and concepts
  const educationalKeywords = [
    'learn', 'understand', 'explain', 'demonstrate', 'example', 'concept', 'principle',
    'method', 'technique', 'important', 'key', 'main', 'definition', 'process',
    'step', 'algorithm', 'formula', 'theory', 'practice', 'application'
  ];
  
  const importantSentences = sentences.filter(sentence => {
    const lowerSentence = sentence.toLowerCase();
    return educationalKeywords.some(keyword => lowerSentence.includes(keyword)) ||
           lowerSentence.includes('this video') ||
           lowerSentence.includes('in this lesson') ||
           lowerSentence.includes('we will') ||
           lowerSentence.includes('you will');
  });
  
  // Strategy 2: Extract sentences with numbers, lists, or structured content
  const structuredSentences = sentences.filter(sentence => {
    return /\d+\.|\d+\)|first|second|third|next|then|finally|step|point/.test(sentence.toLowerCase());
  });
  
  // Strategy 3: Extract longer, more informative sentences
  const informativeSentences = sentences
    .filter(s => s.length > 50 && s.length < 200)
    .sort((a, b) => b.length - a.length)
    .slice(0, 3);
  
  // Combine strategies with priority
  let selectedSentences = [];
  
  // Add important educational sentences first
  selectedSentences.push(...importantSentences.slice(0, 2));
  
  // Add structured sentences
  selectedSentences.push(...structuredSentences.slice(0, 2));
  
  // Fill remaining with informative sentences
  const remaining = Math.max(0, (options.mode === 'detailed' ? 5 : 4) - selectedSentences.length);
  selectedSentences.push(...informativeSentences.slice(0, remaining));
  
  // Remove duplicates and ensure good flow
  const uniqueSentences = [...new Set(selectedSentences)]
    .filter(s => s.trim().length > 20)
    .slice(0, options.mode === 'detailed' ? 6 : 4);
  
  if (uniqueSentences.length > 0) {
    summary = uniqueSentences.join('. ').trim();
    
    // Ensure proper sentence ending
    if (!summary.endsWith('.') && !summary.endsWith('!') && !summary.endsWith('?')) {
      summary += '.';
    }
  } else {
    // Fallback: use first few sentences but make them more meaningful
    const fallbackSentences = sentences
      .filter(s => s.length > 30)
      .slice(0, options.mode === 'detailed' ? 4 : 3);
    
    summary = fallbackSentences.join('. ').trim();
    if (!summary.endsWith('.') && !summary.endsWith('!') && !summary.endsWith('?')) {
      summary += '.';
    }
  }
  
  // Post-process summary for better readability
  summary = summary
    .replace(/\s+/g, ' ') // Remove extra whitespace
    .replace(/\.\s*\./g, '.') // Remove double periods
    .trim();
  
  console.log('📝 Offscreen: Enhanced rule-based summary generated:', summary.substring(0, 200) + '...');
  
  return summary;
}

// Handle AI summarization request
async function handleAISummarize(message: any) {
  try {
    console.log('🎯 Offscreen: Received AI_SUMMARIZE request');
    console.log('🎯 Offscreen: Message ID:', message.messageId);
    
    const { transcript, options = {} } = message.data;

    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript provided');
    }

    // Check if already processing (debouncing)
    if (isProcessing) {
      console.log('⚠️ Offscreen: Already processing, ignoring duplicate request');
      // Send response for duplicate request
      chrome.runtime.sendMessage({
        type: 'AI_SUMMARIZE_RESPONSE',
        messageId: message.messageId,
        data: {
          success: false,
          error: 'Already processing another request',
          engine: 'busy'
        }
      });
      return;
    }

    console.log('🎯 Offscreen: Processing transcript...');
    console.log('📝 Offscreen: Original transcript length:', transcript.length);
    console.log('📝 Offscreen: First 300 chars of original transcript:', transcript.substring(0, 300) + '...');

    isProcessing = true;

    try {
      // Initialize AI engines
      console.log('🔄 Offscreen: Initializing AI engines...');
      await initializeAI();
      console.log('✅ Offscreen: AI engines initialized');

      // Check initialization status
      console.log('🔍 Offscreen: AI Status Check:', {
        aiInitialized,
        transformersInitialized,
        useFallback
      });

      // Try AI summarization with fallback order: WebLLM -> Transformers.js -> Rule-based
      let summary: string;
      let engineUsed: string;
      let modeUsed: string;

      try {
        if (aiInitialized && aiEngine) {
          console.log('🔄 Offscreen: Attempting WebLLM summarization...');
          // Use WebLLM (preferred)
          summary = await summarizeWithWebLLM(transcript, options);
          engineUsed = 'webllm';
          modeUsed = 'WebLLM (Phi-3.5-mini)';
          console.log('✅ Offscreen: WebLLM summarization completed');
        } else if (transformersInitialized && summarizer) {
          console.log('🔄 Offscreen: Attempting Transformers.js summarization...');
          // Use Transformers.js fallback
          summary = await summarizeWithTransformers(transcript, options);
          engineUsed = 'transformers-cpu';
          modeUsed = 'Transformers.js (CPU)';
          console.log('✅ Offscreen: Transformers.js summarization completed');
        } else {
          console.log('⚠️ Offscreen: No AI engines available, using rule-based fallback');
          throw new Error('No AI engines available');
        }
      } catch (aiError) {
        console.log('⚠️ Offscreen: AI summarization failed, using rule-based fallback');
        console.log('⚠️ Offscreen: AI error:', aiError.message);
        console.log('⚠️ Offscreen: AI error details:', {
          message: aiError.message,
          stack: aiError.stack,
          aiInitialized,
          transformersInitialized
        });
        
        // Use rule-based fallback
        summary = createRuleBasedSummary(transcript, options);
        engineUsed = 'rule-based';
        modeUsed = 'Rule-based (Fallback)';
        console.log('✅ Offscreen: Rule-based summarization completed');
      }

      // Log final summary for debugging
      console.log('✅ Offscreen: Summary generated successfully');
      console.log('🤖 Offscreen: Engine used:', engineUsed);
      console.log('📊 Offscreen: Original word count:', transcript.split(/\s+/).length);
      console.log('📊 Offscreen: Summary word count:', summary.split(/\s+/).length);
      console.log('📝 Offscreen: Generated summary:', summary);

      // Send result back to background script (Bug #16 fix pattern)
      const result = {
        success: true,
        summary: summary,
        engine: engineUsed,
        mode: modeUsed,
        originalWordCount: transcript.split(/\s+/).length,
        summaryWordCount: summary.split(/\s+/).length,
        processingTime: Date.now() - (message.timestamp || Date.now())
      };

      console.log('🎯 Offscreen: Sending result:', result);
      
      chrome.runtime.sendMessage({
        type: 'AI_SUMMARIZE_RESPONSE',
        messageId: message.messageId,
        data: result
      });

  } catch (error) {
      console.error('❌ Offscreen: Summarization failed:', error);
      console.error('❌ Offscreen: Error details:', {
        message: error.message,
        stack: error.stack,
        aiInitialized,
        transformersInitialized,
        isProcessing,
        useFallback
      });

    const errorResult = {
      success: false,
      error: error.message,
      engine: 'error'
    };

    console.log('❌ Offscreen: Sending error result:', errorResult);
    
    chrome.runtime.sendMessage({
      type: 'AI_SUMMARIZE_RESPONSE',
      messageId: message.messageId,
      data: errorResult
    });
    }

    isProcessing = false;

  } catch (error) {
    console.error('❌ Offscreen: Message handling failed:', error);
    isProcessing = false;
  }
}

// Message listener
chrome.runtime.onMessage.addListener(async (message: any, sender: any, sendResponse: any) => {
  console.log('🎯 Offscreen: Received message:', message.type);

  try {
    switch (message.type) {
      case 'AI_SUMMARIZE':
        await handleAISummarize(message);
        sendResponse({ success: true }); // Always respond
        break;

      case 'CHECK_ENGINES':
        sendResponse({
          webllm: aiInitialized,
          transformers: transformersInitialized,
          fallback: useFallback
        });
        break;

      case 'TEST_COMMUNICATION':
        console.log('🎯 Offscreen: Test communication received');
        sendResponse({
          success: true,
          message: 'Offscreen document is responding',
          timestamp: Date.now(),
          engines: {
            webllm: aiInitialized,
            transformers: transformersInitialized,
            fallback: useFallback
          }
        });
        break;

      case 'OFFSCREEN_STATUS_REQUEST':
        console.log('🎯 Offscreen: Status request received');
        chrome.runtime.sendMessage({
          type: 'OFFSCREEN_STATUS',
          messageId: message.messageId,
          data: {
            success: true,
            aiInitialized,
            transformersInitialized,
            useFallback,
            isInitializing,
            timestamp: Date.now()
          }
        });
        break;

      default:
        console.log('⚠️ Offscreen: Unknown message type:', message.type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('❌ Offscreen: Message handling error:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }

  return false; // Don't keep channel open since we always respond
});

// Initialize offscreen document
async function initializeOffscreenDocument() {
  try {
    console.log('🎯 Offscreen: Initializing offscreen document...');
    console.log('🔍 Offscreen: Document URL:', window.location.href);
    console.log('🔍 Offscreen: Document ready state:', document.readyState);
    console.log('🔍 Offscreen: Chrome runtime available:', !!chrome.runtime);
    
    // Send ready signal to background script
    chrome.runtime.sendMessage({
      type: 'OFFSCREEN_READY',
      timestamp: Date.now()
    }).catch(error => {
      console.log('⚠️ Offscreen: Could not send ready signal:', error.message);
    });
    
    console.log('✅ Offscreen: AI offscreen document loaded and ready');
    
  } catch (error) {
    console.error('❌ Offscreen: Failed to initialize:', error);
  }
}

// Initialize when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOffscreenDocument);
} else {
  initializeOffscreenDocument();
}