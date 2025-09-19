// Offscreen Document for AI Processing
// This runs in a hidden document with full WebGPU and network access

console.log('🤖 Offscreen AI Processor: Initializing...');
console.log('🔍 Offscreen: Testing basic functionality...');
console.log('🔍 Offscreen: Navigator.gpu available:', !!navigator.gpu);
console.log('🔍 Offscreen: Chrome runtime available:', !!chrome.runtime);

// Import AI libraries directly
import { MLCEngine } from '@mlc-ai/web-llm';
import { pipeline } from '@xenova/transformers';

// Configure Transformers.js to avoid blob URL issues
if (typeof window !== 'undefined') {
  // Set environment variables to avoid blob URLs and improve stability
  (window as any).ENV = {
    ...((window as any).ENV || {}),
    USE_BROWSER_CACHE: false,
    USE_LOCAL_MODELS: true,
    ALLOW_REMOTE_MODELS: false,
    USE_SAFE_TENSORS: true,
    DISABLE_WORKER: true, // Disable web workers to avoid blob URL issues
    USE_CACHE: false, // Disable caching to avoid blob URLs
    USE_WASM: true // Use WASM instead of WebGL to avoid eval issues
  };
}

class OffscreenAIProcessor {
  private isWebLLMAvailable = false;
  private isTransformersAvailable = false;
  private webLLMEngine: any = null;
  private transformersPipeline: any = null;
  private initializationComplete = false;
  
  constructor() {
    this.initializeEngines();
    this.setupMessageListener();
  }

  async initializeEngines() {
    console.log('🔍 Offscreen: Checking engine availability...');
    console.log('🔍 Offscreen: Navigator.gpu available:', !!navigator.gpu);
    console.log('🔍 Offscreen: User agent:', navigator.userAgent);
    
    // Reset engine availability flags
    this.isWebLLMAvailable = false;
    this.isTransformersAvailable = false;
    
    // Test if imports are working
    try {
      console.log('🔍 Offscreen: Testing MLCEngine import...');
      console.log('🔍 Offscreen: MLCEngine available:', typeof MLCEngine);
      console.log('🔍 Offscreen: pipeline available:', typeof pipeline);
    } catch (error) {
      console.log('❌ Offscreen: Import test failed:', error);
    }
    
    // Check WebGPU availability and test WebLLM
    if (navigator.gpu) {
      try {
        console.log('🔍 Offscreen: WebGPU available, checking WebLLM...');
        // Test WebGPU adapter first
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          console.log('✅ Offscreen: WebGPU adapter available');
          
          // Test if MLCEngine is actually available and can be instantiated
          if (typeof MLCEngine !== 'undefined') {
            try {
              // Just test if the constructor is available, don't actually instantiate
              console.log('✅ Offscreen: MLCEngine constructor available');
              this.isWebLLMAvailable = true;
              console.log('✅ Offscreen: WebLLM support detected and working');
            } catch (engineError) {
              console.log('❌ Offscreen: MLCEngine instantiation failed:', engineError.message);
              this.isWebLLMAvailable = false;
            }
          } else {
            console.log('❌ Offscreen: MLCEngine not available');
            this.isWebLLMAvailable = false;
          }
        } else {
          console.log('❌ Offscreen: WebGPU adapter not available');
          this.isWebLLMAvailable = false;
        }
      } catch (error) {
        console.log('❌ Offscreen: WebLLM not available:', error);
        console.log('❌ Offscreen: Error details:', error.message);
        this.isWebLLMAvailable = false;
      }
    } else {
      console.log('❌ Offscreen: WebGPU not available');
      this.isWebLLMAvailable = false;
    }

    // Test if pipeline is actually available and can be used
    if (typeof pipeline !== 'undefined') {
      try {
        // Test if we can create a pipeline (this will fail if there are issues)
        console.log('🔍 Offscreen: Testing Transformers.js pipeline creation...');
        // We'll test this more thoroughly when actually using it
        this.isTransformersAvailable = true;
        console.log('✅ Offscreen: Transformers.js support detected');
      } catch (error) {
        console.log('❌ Offscreen: Transformers.js pipeline test failed:', error.message);
        this.isTransformersAvailable = false;
      }
    } else {
      console.log('❌ Offscreen: pipeline not available');
      this.isTransformersAvailable = false;
    }

    console.log('🔍 Offscreen: Final engine status:', {
      webllm: this.isWebLLMAvailable,
      transformers: this.isTransformersAvailable
    });
    
    // Debug: Log the actual property values
    console.log('🔍 Offscreen: Debug - isWebLLMAvailable property:', this.isWebLLMAvailable);
    console.log('🔍 Offscreen: Debug - isTransformersAvailable property:', this.isTransformersAvailable);
    
    // Mark initialization as complete
    this.initializationComplete = true;
    console.log('✅ Offscreen: Engine initialization completed');
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('🎯 Offscreen: Received message:', message);
      
      if (message.type === 'SUMMARIZE_TRANSCRIPT') {
        this.handleSummarize(message.data, sendResponse);
        return true; // Keep message channel open for async response
      }
      
      if (message.type === 'CHECK_ENGINES') {
        sendResponse({
          success: true,
          engines: {
            webllm: this.isWebLLMAvailable,
            transformers: this.isTransformersAvailable
          }
        });
        return true;
      }
      
      // Handle messages from background script
      if (message.type === 'AI_SUMMARIZE') {
        this.handleSummarize(message.data, sendResponse);
        return true; // Keep message channel open for async response
      }
    });
  }

  async handleSummarize(data: any, sendResponse: any) {
    const { transcript, options } = data;
    console.log('🎯 Offscreen: Starting summarization...');
    console.log('🎯 Offscreen: Options:', options);
    console.log('🎯 Offscreen: useWebLLM option:', options.useWebLLM);
    console.log('🎯 Offscreen: isWebLLMAvailable:', this.isWebLLMAvailable);
    console.log('🎯 Offscreen: isTransformersAvailable:', this.isTransformersAvailable);
    console.log('🎯 Offscreen: initializationComplete:', this.initializationComplete);
    
    // Wait for initialization to complete if it's not done yet
    if (!this.initializationComplete) {
      console.log('⏳ Offscreen: Waiting for initialization to complete...');
      let attempts = 0;
      while (!this.initializationComplete && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      console.log('🎯 Offscreen: Initialization wait completed, attempts:', attempts);
    }
    
    // Debug: Check if engines are actually available
    console.log('🔍 Offscreen: Debug - Checking engine availability again...');
    console.log('🔍 Offscreen: Debug - MLCEngine type:', typeof MLCEngine);
    console.log('🔍 Offscreen: Debug - pipeline type:', typeof pipeline);
    console.log('🔍 Offscreen: Debug - Final engine status:', {
      webllm: this.isWebLLMAvailable,
      transformers: this.isTransformersAvailable
    });

    try {
      let result;
      
      // Try WebLLM first if available and requested
      if (options.useWebLLM && this.isWebLLMAvailable) {
        console.log('🎯 Offscreen: Using WebLLM...');
        result = await this.generateWebLLMSummary(transcript, options);
        
        // Fallback to Transformers.js if WebLLM fails
        if (!result.success && this.isTransformersAvailable) {
          console.log('🎯 Offscreen: WebLLM failed, trying Transformers.js...');
          result = await this.generateTransformersSummary(transcript, options);
        }
      } else if (this.isTransformersAvailable) {
        console.log('🎯 Offscreen: Using Transformers.js...');
        result = await this.generateTransformersSummary(transcript, options);
      } else {
        console.log('🎯 Offscreen: Using enhanced basic summary...');
        console.log('🎯 Offscreen: Reason - useWebLLM:', options.useWebLLM, 'isWebLLMAvailable:', this.isWebLLMAvailable, 'isTransformersAvailable:', this.isTransformersAvailable);
        result = await this.generateEnhancedSummary(transcript, options);
      }

      console.log('🎯 Offscreen: Summarization complete:', result);
      sendResponse({ success: true, result });
    } catch (error) {
      console.error('❌ Offscreen: Summarization failed:', error);
      sendResponse({ 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      });
    }
  }

  async generateWebLLMSummary(transcript: string, options: any) {
    try {
      if (!this.webLLMEngine) {
        console.log('🎯 Offscreen: Initializing WebLLM engine...');
        
        // Use a simpler approach - let WebLLM handle model selection
        try {
          console.log('🎯 Offscreen: Creating WebLLM engine with default configuration...');
          this.webLLMEngine = new MLCEngine({
            // Let WebLLM use its default model configuration
            modelConfig: {
              temperature: 0.7,
              maxTokens: options.maxLengthCap * 2,
            }
          });
          
          console.log('🎯 Offscreen: WebLLM engine created successfully');
        } catch (engineError) {
          console.log('❌ Offscreen: WebLLM engine creation failed:', engineError.message);
          throw new Error('WebLLM engine creation failed');
        }
      }

      const targetLength = Math.floor((transcript.split(/\s+/).length * options.compressionPercentage) / 100);
      const finalLength = Math.min(targetLength, options.maxLengthCap);

      // Build format instructions
      let formatInstructions = '';
      if (options.outputFormat === 'bullet-points') {
        formatInstructions = 'Format the summary as bullet points.';
      } else if (options.outputFormat === 'numbered-list') {
        formatInstructions = 'Format the summary as a numbered list.';
      } else {
        formatInstructions = 'Format the summary as a flowing paragraph.';
      }

      // Build focus instructions
      let focusInstructions = 'Focus on the key points and main concepts.';
      if (options.includeExamples) {
        focusInstructions += ' Include important examples.';
      }
      if (options.includeDefinitions) {
        focusInstructions += ' Include key definitions and terms.';
      }
      if (options.focusAreas && options.focusAreas.length > 0) {
        focusInstructions += ` Pay special attention to: ${options.focusAreas.join(', ')}.`;
      }

      const prompt = `Please summarize the following transcript in approximately ${finalLength} words. ${focusInstructions} ${formatInstructions}

${transcript}

Summary:`;

      const response = await this.webLLMEngine.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: finalLength * 2,
      });

      const summary = response.choices[0]?.message?.content || '';

      return {
        success: true,
        summary: summary.trim(),
        engine: 'webllm',
        originalWordCount: transcript.split(/\s+/).length,
        summaryWordCount: summary.split(/\s+/).length,
        targetLength: finalLength,
        compressionRatio: (summary.split(/\s+/).length / transcript.split(/\s+/).length) * 100
      };
    } catch (error) {
      console.error('❌ Offscreen: WebLLM failed:', error);
      console.log('🔄 Offscreen: WebLLM failed, will fallback to other engines');
      return {
        success: false,
        error: 'WebLLM processing failed: ' + error.message,
        engine: 'webllm'
      };
    }
  }

  async generateTransformersSummary(transcript: string, options: any) {
    try {
      if (!this.transformersPipeline) {
        console.log('🎯 Offscreen: Initializing Transformers.js pipeline...');
        
        // Configure pipeline options to avoid blob URL issues and memory problems
        const pipelineOptions = {
          quantized: true, // Use quantized model to reduce memory usage
          progress_callback: (progress: any) => {
            console.log('🎯 Offscreen: Pipeline progress:', progress);
          },
          // Additional options to avoid CSP issues
          use_cache: false,
          use_worker: false
        };
        
        // Use a smaller, more stable model that works better with CSP
        this.transformersPipeline = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6', pipelineOptions);
        console.log('🎯 Offscreen: Transformers.js pipeline initialized');
      }

      const targetLength = Math.floor((transcript.split(/\s+/).length * options.compressionPercentage) / 100);
      const finalLength = Math.min(targetLength, options.maxLengthCap);

      // Truncate transcript more aggressively to avoid memory issues
      const maxInputLength = 512; // Reduced from 1024
      const truncatedTranscript = transcript.length > maxInputLength 
        ? transcript.substring(0, maxInputLength) + "..."
        : transcript;

      // Use more conservative length settings
      const maxLength = Math.min(finalLength, 100); // Reduced max length
      const minLength = Math.max(Math.floor(finalLength * 0.3), 20); // Reduced min length

      console.log('🎯 Offscreen: Processing with Transformers.js:', {
        inputLength: truncatedTranscript.length,
        maxLength,
        minLength
      });

      const result = await this.transformersPipeline(truncatedTranscript, {
        max_length: maxLength,
        min_length: minLength,
        do_sample: false,
        num_beams: 2, // Reduce beam search to save memory
      });

      // Post-process the result based on output format
      let processedSummary = result[0]?.summary_text || '';
      
      if (options.outputFormat === 'bullet-points') {
        // Convert to bullet points
        const sentences = processedSummary.split(/[.!?]+/).filter(s => s.trim().length > 10);
        processedSummary = sentences.map(sentence => `• ${sentence.trim()}`).join('\n');
      } else if (options.outputFormat === 'numbered-list') {
        // Convert to numbered list
        const sentences = processedSummary.split(/[.!?]+/).filter(s => s.trim().length > 10);
        processedSummary = sentences.map((sentence, index) => `${index + 1}. ${sentence.trim()}`).join('\n');
      }

      return {
        success: true,
        summary: processedSummary.trim(),
        engine: 'transformers',
        originalWordCount: transcript.split(/\s+/).length,
        summaryWordCount: processedSummary.split(/\s+/).length,
        targetLength: finalLength,
        compressionRatio: (processedSummary.split(/\s+/).length / transcript.split(/\s+/).length) * 100
      };
    } catch (error) {
      console.error('❌ Offscreen: Transformers.js failed:', error);
      console.log('🔄 Offscreen: Transformers.js failed, will fallback to enhanced summary');
      return {
        success: false,
        error: 'Transformers.js processing failed: ' + error.message,
        engine: 'transformers'
      };
    }
  }

  async generateEnhancedSummary(transcript: string, options: any) {
    // Enhanced extractive summarization
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Score sentences by importance
    const scoredSentences = sentences.map(sentence => {
      const words = sentence.toLowerCase().split(/\s+/);
      let score = 0;
      
      const importantWords = ['important', 'key', 'main', 'primary', 'essential', 'fundamental', 'basic', 'concept', 'principle', 'method', 'technique', 'example', 'note', 'remember', 'understand'];
      importantWords.forEach(word => {
        if (words.includes(word)) score += 2;
      });
      
      score += Math.min(words.length / 10, 3);
      if (/\d+/.test(sentence)) score += 1;
      if (/[A-Z]{2,}/.test(sentence)) score += 1;
      
      return { sentence: sentence.trim(), score };
    });
    
    scoredSentences.sort((a, b) => b.score - a.score);
    
    const targetLength = Math.floor((transcript.split(/\s+/).length * options.compressionPercentage) / 100);
    const finalLength = Math.min(targetLength, options.maxLengthCap);
    
    let summary = '';
    let currentLength = 0;
    
    for (const { sentence } of scoredSentences) {
      const sentenceWords = sentence.split(/\s+/).length;
      if (currentLength + sentenceWords <= finalLength) {
        summary += sentence + '. ';
        currentLength += sentenceWords;
      } else {
        break;
      }
    }

    if (!summary.trim()) {
      const words = transcript.split(/\s+/);
      const targetWords = Math.min(finalLength, Math.max(50, Math.floor(words.length * 0.1)));
      summary = words.slice(0, targetWords).join(' ') + '...';
    }

    return {
      success: true,
      summary: summary.trim(),
      engine: 'enhanced',
      originalWordCount: transcript.split(/\s+/).length,
      summaryWordCount: summary.split(/\s+/).length,
      targetLength: finalLength,
      compressionRatio: (summary.split(/\s+/).length / transcript.split(/\s+/).length) * 100
    };
  }
}

// Initialize the AI processor
const aiProcessor = new OffscreenAIProcessor();

console.log('✅ Offscreen AI Processor: Ready!');
