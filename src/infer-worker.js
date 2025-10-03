// WebLLM Inference Worker for Chrome Extension
// Handles AI model loading and inference in a separate worker thread

import { CreateMLCEngine } from '@mlc-ai/web-llm';

let engine = null;
let isInitialized = false;
let isProcessing = false;

// Progress tracking for model loading
let loadProgress = 0;
let currentModel = null;

// Model configuration - using small quantized model for browser
const MODEL_CONFIG = {
  name: 'Llama-3-2-3B-Instruct-q4f32_1-MLC',
  options: {
    // Enable streaming for real-time output
    stream: true,
    // Use WebGPU if available, fallback to CPU
    useWebGPU: true,
    // Memory management
    maxMemoryUsage: 300 * 1024 * 1024, // 300MB limit
    // Cache settings
    useCache: true,
    cacheSize: 100 * 1024 * 1024, // 100MB cache
  }
};

// Initialize WebLLM engine
async function initializeEngine() {
  if (isInitialized) return;
  
  try {
    console.log('🎯 WebLLM Worker: Starting model initialization...');
    
    engine = await CreateMLCEngine(MODEL_CONFIG.name, {
      initProgressCallback: ({ progress, timeElapsed, text }) => {
        loadProgress = Math.round(progress * 100);
        console.log(`🎯 WebLLM Worker: Loading progress ${loadProgress}% - ${text}`);
        
        // Send progress updates to main thread
        self.postMessage({
          type: 'load-progress',
          progress: loadProgress,
          timeElapsed,
          text
        });
      },
      // Model loading configuration
      useWebGPU: MODEL_CONFIG.options.useWebGPU,
      maxMemoryUsage: MODEL_CONFIG.options.maxMemoryUsage,
      useCache: MODEL_CONFIG.options.useCache,
      cacheSize: MODEL_CONFIG.options.cacheSize
    });
    
    isInitialized = true;
    currentModel = MODEL_CONFIG.name;
    
    console.log('✅ WebLLM Worker: Model initialized successfully');
    self.postMessage({ type: 'ready', model: currentModel });
    
  } catch (error) {
    console.error('❌ WebLLM Worker: Initialization failed:', error);
    self.postMessage({ 
      type: 'error', 
      error: error.message,
      stage: 'initialization'
    });
  }
}

// Create enhanced prompt with RAG context
function createEnhancedPrompt(transcript, ragContext, options = {}) {
  let prompt = `Summarize this educational transcript concisely and accurately:\n\n${transcript}`;

  // Add RAG context if available
  if (ragContext && ragContext.chunks && ragContext.chunks.length > 0) {
    const contextText = ragContext.chunks
      .map(chunk => chunk.content)
      .join('\n\n');
    prompt += `\n\nRelevant educational context to consider:\n${contextText}`;
  }

  // Add mode-specific instructions
  if (options.mode === 'detailed') {
    prompt += '\n\nProvide a detailed summary with key concepts and explanations.';
  } else if (options.mode === 'concise') {
    prompt += '\n\nProvide a concise summary focusing on main points.';
  } else {
    prompt += '\n\nProvide a balanced summary with key concepts and main points.';
  }

  // Add subject-specific guidance if available
  if (options.subject) {
    prompt += `\n\nFocus on ${options.subject} concepts and terminology.`;
  }

  return prompt;
}

// Split transcript into semantic chunks for hierarchical processing
function splitTranscript(transcript, maxTokens = 2000) {
  const words = transcript.split(/\s+/);
  const chunks = [];
  let currentChunk = '';
  let currentTokenCount = 0;
  
  // Rough token estimation: 1 token ≈ 0.75 words
  const tokensPerWord = 0.75;
  
  for (const word of words) {
    const wordTokens = word.length * tokensPerWord;
    
    if (currentTokenCount + wordTokens > maxTokens && currentChunk.trim()) {
      chunks.push(currentChunk.trim());
      currentChunk = word + ' ';
      currentTokenCount = wordTokens;
    } else {
      currentChunk += word + ' ';
      currentTokenCount += wordTokens;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Perform hierarchical summarization for large transcripts
async function hierarchicalSummarize(transcript, ragContext, options) {
  console.log('🎯 WebLLM Worker: Starting hierarchical summarization...');
  
  const chunks = splitTranscript(transcript, 2000);
  console.log(`🎯 WebLLM Worker: Split transcript into ${chunks.length} chunks`);
  
  if (chunks.length === 1) {
    // Single chunk - process directly
    return await summarizeSingleChunk(transcript, ragContext, options);
  }
  
  // Process each chunk
  const chunkSummaries = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`🎯 WebLLM Worker: Processing chunk ${i + 1}/${chunks.length}`);
    
    try {
      const chunkSummary = await summarizeSingleChunk(chunk, ragContext, {
        ...options,
        mode: 'detailed' // Get detailed summaries for chunks
      });
      
      chunkSummaries.push(chunkSummary);
      
      // Send progress update
      self.postMessage({
        type: 'chunk-progress',
        current: i + 1,
        total: chunks.length,
        summary: chunkSummary
      });
      
    } catch (error) {
      console.error(`❌ WebLLM Worker: Chunk ${i + 1} failed:`, error);
      chunkSummaries.push(`[Chunk ${i + 1} processing failed]`);
    }
  }
  
  // Merge chunk summaries into final summary
  console.log('🎯 WebLLM Worker: Merging chunk summaries...');
  const mergedText = chunkSummaries.join('\n\n');
  
  return await summarizeSingleChunk(mergedText, ragContext, {
    ...options,
    mode: 'concise', // Final summary should be concise
    isFinalMerge: true
  });
}

// Summarize a single chunk or transcript
async function summarizeSingleChunk(transcript, ragContext, options = {}) {
  if (!engine) {
    throw new Error('WebLLM engine not initialized');
  }
  
  const prompt = createEnhancedPrompt(transcript, ragContext, options);
  
  try {
    const response = await engine.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: options.isFinalMerge 
            ? 'You are an expert at merging educational summaries into coherent final summaries.'
            : 'You are an expert educational summarizer specializing in clear, accurate transcript summaries.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: options.stream !== false, // Default to streaming
      max_tokens: options.maxTokens || 500,
      temperature: options.temperature || 0.3
    });
    
    if (options.stream !== false) {
      // Handle streaming response
      let fullResponse = '';
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          self.postMessage({
            type: 'chunk',
            data: content,
            fullResponse
          });
        }
      }
      return fullResponse;
    } else {
      // Handle non-streaming response
      return response.choices[0].message.content;
    }
    
  } catch (error) {
    console.error('❌ WebLLM Worker: Summarization failed:', error);
    throw error;
  }
}

// Memory cleanup
function cleanupMemory() {
  try {
    if (engine && typeof engine.dispose === 'function') {
      engine.dispose();
      engine = null;
    }
    isInitialized = false;
    isProcessing = false;
    
    // Force garbage collection if available
    if (typeof gc === 'function') {
      gc();
    }
    
    console.log('🧹 WebLLM Worker: Memory cleaned up');
  } catch (error) {
    console.error('❌ WebLLM Worker: Cleanup failed:', error);
  }
}

// Main message handler
self.onmessage = async (e) => {
  const { cmd, transcript, ragContext, options = {} } = e.data;
  
  try {
    switch (cmd) {
      case 'init':
        await initializeEngine();
        break;
        
      case 'summarize':
        if (!isInitialized) {
          await initializeEngine();
        }
        
        if (isProcessing) {
          self.postMessage({
            type: 'error',
            error: 'Already processing another request',
            stage: 'processing'
          });
          return;
        }
        
        isProcessing = true;
        
        try {
          // Determine if we need hierarchical processing
          const wordCount = transcript.split(/\s+/).length;
          const needsHierarchical = wordCount > 3000; // ~4000 tokens
          
          console.log(`🎯 WebLLM Worker: Processing transcript (${wordCount} words, hierarchical: ${needsHierarchical})`);
          
          let summary;
          if (needsHierarchical) {
            summary = await hierarchicalSummarize(transcript, ragContext, options);
          } else {
            summary = await summarizeSingleChunk(transcript, ragContext, options);
          }
          
          self.postMessage({
            type: 'done',
            summary,
            wordCount,
            hierarchical: needsHierarchical
          });
          
        } finally {
          isProcessing = false;
        }
        break;
        
      case 'cleanup':
        cleanupMemory();
        self.postMessage({ type: 'cleanup-done' });
        break;
        
      case 'status':
        self.postMessage({
          type: 'status',
          isInitialized,
          isProcessing,
          currentModel,
          loadProgress
        });
        break;
        
      default:
        self.postMessage({
          type: 'error',
          error: `Unknown command: ${cmd}`,
          stage: 'command'
        });
    }
    
  } catch (error) {
    console.error('❌ WebLLM Worker: Error processing command:', error);
    isProcessing = false;
    self.postMessage({
      type: 'error',
      error: error.message,
      stage: 'execution'
    });
  }
};

// Handle worker termination
self.addEventListener('beforeunload', () => {
  cleanupMemory();
});

console.log('🎯 WebLLM Worker: Worker initialized and ready');
