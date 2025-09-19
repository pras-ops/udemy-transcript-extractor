// Offscreen Document for AI Processing
// This runs in a hidden document with full WebGPU and network access

console.log('🤖 Offscreen AI Processor: Initializing...');
console.log('🔍 Offscreen: Testing basic functionality...');
console.log('🔍 Offscreen: Navigator.gpu available:', !!navigator.gpu);
console.log('🔍 Offscreen: Chrome runtime available:', !!chrome.runtime);

class OffscreenAIProcessor {
  constructor() {
    this.isWebLLMAvailable = false;
    this.isTransformersAvailable = false;
    this.webLLMEngine = null;
    this.transformersPipeline = null;
    
    this.initializeEngines();
    this.setupMessageListener();
  }

  async initializeEngines() {
    console.log('🔍 Offscreen: Checking engine availability...');
    console.log('🔍 Offscreen: Navigator.gpu available:', !!navigator.gpu);
    console.log('🔍 Offscreen: User agent:', navigator.userAgent);
    
    // Wait a bit for CDN libraries to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check WebGPU availability
    if (navigator.gpu) {
      try {
        console.log('🔍 Offscreen: WebGPU available, checking WebLLM...');
        // Test WebGPU adapter first
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          console.log('✅ Offscreen: WebGPU adapter available');
          
          // Check if WebLLM was loaded via CDN
          if (window.WebLLM && window.WebLLM.MLCEngine) {
            this.isWebLLMAvailable = true;
            console.log('✅ Offscreen: WebLLM support detected via CDN');
          } else {
            console.log('❌ Offscreen: WebLLM not available via CDN');
          }
        } else {
          console.log('❌ Offscreen: WebGPU adapter not available');
        }
      } catch (error) {
        console.log('❌ Offscreen: WebLLM not available:', error);
        console.log('❌ Offscreen: Error details:', error.message);
      }
    } else {
      console.log('❌ Offscreen: WebGPU not available');
    }

    // Check Transformers.js availability
    if (window.Transformers && window.Transformers.pipeline) {
      this.isTransformersAvailable = true;
      console.log('✅ Offscreen: Transformers.js support detected via CDN');
    } else {
      console.log('❌ Offscreen: Transformers.js not available via CDN');
    }

    console.log('🔍 Offscreen: Final engine status:', {
      webllm: this.isWebLLMAvailable,
      transformers: this.isTransformersAvailable
    });
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

  async handleSummarize(data, sendResponse) {
    const { transcript, options } = data;
    console.log('🎯 Offscreen: Starting summarization...');
    console.log('🎯 Offscreen: Options:', options);

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

  async generateWebLLMSummary(transcript, options) {
    try {
      if (!this.webLLMEngine) {
        console.log('🎯 Offscreen: Initializing WebLLM engine...');
        
        if (!window.WebLLM || !window.WebLLM.MLCEngine) {
          throw new Error('WebLLM not available');
        }
        
        this.webLLMEngine = new window.WebLLM.MLCEngine({
          model: 'Llama-3.2-1B-Instruct-q4f16_1',
          modelConfig: {
            temperature: 0.7,
            maxTokens: options.maxLengthCap * 2,
          }
        });
        
        console.log('🎯 Offscreen: WebLLM engine initialized');
      }

      const targetLength = Math.floor((transcript.split(/\s+/).length * options.compressionPercentage) / 100);
      const finalLength = Math.min(targetLength, options.maxLengthCap);

      const prompt = `Please summarize the following transcript in approximately ${finalLength} words, focusing on the key points and main concepts:

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
      return {
        success: false,
        error: 'WebLLM processing failed',
        engine: 'webllm'
      };
    }
  }

  async generateTransformersSummary(transcript, options) {
    try {
      if (!this.transformersPipeline) {
        console.log('🎯 Offscreen: Initializing Transformers.js pipeline...');
        
        if (!window.Transformers || !window.Transformers.pipeline) {
          throw new Error('Transformers.js not available');
        }
        
        this.transformersPipeline = await window.Transformers.pipeline('summarization', 'Xenova/distilbart-cnn-6-6');
        console.log('🎯 Offscreen: Transformers.js pipeline initialized');
      }

      const targetLength = Math.floor((transcript.split(/\s+/).length * options.compressionPercentage) / 100);
      const finalLength = Math.min(targetLength, options.maxLengthCap);

      // Truncate transcript if too long
      const maxInputLength = 1024;
      const truncatedTranscript = transcript.length > maxInputLength 
        ? transcript.substring(0, maxInputLength) + "..."
        : transcript;

      const maxLength = Math.min(finalLength * 2, 150);
      const minLength = Math.max(Math.floor(finalLength * 0.5), 30);

      const result = await this.transformersPipeline(truncatedTranscript, {
        max_length: maxLength,
        min_length: minLength,
        do_sample: false,
      });

      const summary = result[0]?.summary_text || '';

      return {
        success: true,
        summary: summary.trim(),
        engine: 'transformers',
        originalWordCount: transcript.split(/\s+/).length,
        summaryWordCount: summary.split(/\s+/).length,
        targetLength: finalLength,
        compressionRatio: (summary.split(/\s+/).length / transcript.split(/\s+/).length) * 100
      };
    } catch (error) {
      console.error('❌ Offscreen: Transformers.js failed:', error);
      return {
        success: false,
        error: 'Transformers.js processing failed',
        engine: 'transformers'
      };
    }
  }

  async generateEnhancedSummary(transcript, options) {
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
