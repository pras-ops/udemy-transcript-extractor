export interface SummarizationOptions {
  maxLength?: number;
  minLength?: number;
  useWebLLM?: boolean;
  compressionPercentage?: number; // How much of original to retain (default: 60%)
  maxLengthCap?: number; // Maximum length cap (default: 1000)
  outputFormat?: 'paragraph' | 'bullet-points' | 'numbered-list'; // Output format
  targetWordCount?: number; // Specific target word count
  includeExamples?: boolean; // Include examples in summary
  includeDefinitions?: boolean; // Include key definitions
  focusAreas?: string[]; // Specific areas to focus on
}

export interface SummarizationResult {
  success: boolean;
  summary?: string;
  error?: string;
  engine?: 'webllm' | 'transformers' | 'mock' | 'enhanced';
  originalWordCount?: number;
  summaryWordCount?: number;
  targetLength?: number;
  compressionRatio?: number;
}

class AISummarizationService {
  private isWebLLMAvailable = false;
  private isTransformersAvailable = false;

  constructor() {
    console.log('🤖 AI Summarization Service: Initializing...');
    this.checkEngineSupport();
  }

  private async checkEngineSupport(): Promise<void> {
    try {
      console.log('🔍 AI Service: Checking engine support...');
      console.log('🔍 Chrome extension context:', this.isChromeExtensionContext());
      console.log('🔍 WebGPU available:', !!navigator.gpu);
      
      // Check WebLLM availability
      if (navigator.gpu && !this.isChromeExtensionContext()) {
        try {
          console.log('🔍 Trying to import WebLLM...');
          // Try to import WebLLM to verify it's available
          await import('@mlc-ai/web-llm');
          this.isWebLLMAvailable = true;
          console.log('✅ WebLLM support detected (WebGPU + library available)');
        } catch (error) {
          console.log('❌ WebLLM library not available:', error);
        }
      } else {
        if (this.isChromeExtensionContext()) {
          console.log('❌ WebLLM not available (Chrome extension context limitations)');
        } else {
          console.log('❌ WebLLM not available (No WebGPU support)');
        }
      }

      // Check if Transformers.js is available
      try {
        console.log('🔍 Trying to import Transformers.js...');
        // Try to import Transformers.js to verify it's available
        await import('@xenova/transformers');
        this.isTransformersAvailable = true;
        console.log('✅ Transformers.js support detected');
      } catch (error) {
        console.log('❌ Transformers.js not available:', error);
      }
      
      console.log('🔍 Final engine status:', {
        webllm: this.isWebLLMAvailable,
        transformers: this.isTransformersAvailable,
        mock: true
      });
    } catch (error) {
      console.log('❌ Engine support check failed:', error);
    }
  }

  private isChromeExtensionContext(): boolean {
    return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  }

  private isPopupContext(): boolean {
    // Check if we're in a popup context (which can't create offscreen documents)
    return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && 
           typeof window !== 'undefined' && window.location && 
           window.location.href.includes('chrome-extension://') &&
           window.location.href.includes('index.html');
  }

  private async summarizeViaBackground(
    transcript: string, 
    options: SummarizationOptions
  ): Promise<SummarizationResult> {
    try {
      console.log('🎯 Sending request to background script...');
      
      const response = await chrome.runtime.sendMessage({
        type: 'AI_SUMMARIZE',
        data: {
          transcript,
          options
        }
      });

      if (response.success && response.result) {
        console.log('✅ Background processing successful:', response.result);
        return response.result;
      } else {
        console.error('❌ Background processing failed:', response.error);
        // Fallback to local processing if background fails
        console.log('🔄 Falling back to local processing...');
        return this.summarizeLocally(transcript, options);
      }
    } catch (error) {
      console.error('❌ Background communication failed:', error);
      // Fallback to local processing if background communication fails
      console.log('🔄 Background communication failed, falling back to local processing...');
      return this.summarizeLocally(transcript, options);
    }
  }

  private async summarizeViaOffscreen(
    transcript: string, 
    options: SummarizationOptions
  ): Promise<SummarizationResult> {
    try {
      console.log('🎯 Sending request to offscreen document...');
      
      const response = await chrome.runtime.sendMessage({
        type: 'AI_SUMMARIZE',
        data: {
          transcript,
          options
        }
      });

      if (response.success && response.result) {
        console.log('✅ Offscreen processing successful:', response.result);
        return response.result;
      } else {
        console.error('❌ Offscreen processing failed:', response.error);
        // Fallback to local processing if offscreen fails
        console.log('🔄 Falling back to local processing...');
        return this.summarizeLocally(transcript, options);
      }
    } catch (error) {
      console.error('❌ Offscreen communication failed:', error);
      // Fallback to local processing if offscreen communication fails
      console.log('🔄 Offscreen communication failed, falling back to local processing...');
      return this.summarizeLocally(transcript, options);
    }
  }

  private async summarizeLocally(
    transcript: string, 
    options: SummarizationOptions
  ): Promise<SummarizationResult> {
    console.log('🎯 Using local processing fallback...');
    
    const {
      maxLength = 150,
      minLength = 50,
      compressionPercentage = 60,
      maxLengthCap = 1000
    } = options;

    // Calculate original word count
    const originalWordCount = this.calculateWordCount(transcript);
    
    // Calculate target length based on compression percentage
    const targetLength = Math.floor((originalWordCount * compressionPercentage) / 100);
    const finalLength = Math.min(targetLength, maxLengthCap);

    // Use enhanced basic summary as fallback
    const result = await this.generateMockSummary(transcript, finalLength, minLength);
    
    // Add word count information
    result.originalWordCount = originalWordCount;
    result.summaryWordCount = this.calculateWordCount(result.summary || '');
    result.targetLength = finalLength;
    result.compressionRatio = result.summaryWordCount / originalWordCount * 100;
    result.engine = 'enhanced';

    return result;
  }

  async summarizeTranscript(
    transcript: string, 
    options: SummarizationOptions = {}
  ): Promise<SummarizationResult> {
    console.log('🎯 Starting transcript summarization...');
    console.log('🎯 Options:', options);
    console.log('🎯 Available engines:', this.getAvailableEngines());
    console.log('🎯 Transcript length:', transcript.length);
    
    // Always use background script for Chrome extension contexts
    if (this.isChromeExtensionContext()) {
      console.log('🎯 Chrome extension context detected, communicating with background script...');
      return this.summarizeViaBackground(transcript, options);
    }
    
    const {
      maxLength = 150,
      minLength = 50,
      useWebLLM = false, // Only use default if not explicitly set
      compressionPercentage = 60, // Default: retain 60% of original
      maxLengthCap = 1000
    } = options;

    // Calculate original word count
    const originalWordCount = this.calculateWordCount(transcript);
    
    // Calculate target length based on compression percentage
    // compressionPercentage = how much of original to retain
    const targetLength = Math.floor((originalWordCount * compressionPercentage) / 100);
    
    // Apply maximum cap for performance
    const finalTargetLength = Math.min(targetLength, maxLengthCap);
    
    // Ensure minimum length
    const finalLength = Math.max(finalTargetLength, minLength);

    // Truncate transcript if too long (to avoid memory issues)
    const maxTranscriptLength = 4000; // ~4000 characters
    const truncatedTranscript = transcript.length > maxTranscriptLength 
      ? transcript.substring(0, maxTranscriptLength) + "..."
      : transcript;

    // Try to use real AI engines, fallback to mock if not available
    let result: SummarizationResult;
    
    console.log('🎯 Engine selection logic:');
    console.log('🎯 useWebLLM:', useWebLLM);
    console.log('🎯 isWebLLMAvailable:', this.isWebLLMAvailable);
    console.log('🎯 isTransformersAvailable:', this.isTransformersAvailable);
    
    if (useWebLLM && this.isWebLLMAvailable) {
      console.log('🎯 Using WebLLM...');
      result = await this.generateWebLLMSummary(truncatedTranscript, finalLength);
      // If WebLLM fails, try Transformers.js as fallback
      if (!result.success && this.isTransformersAvailable) {
        console.log('🎯 WebLLM failed, trying Transformers.js as fallback');
        result = await this.generateTransformersSummary(truncatedTranscript, finalLength);
      }
    } else if (this.isTransformersAvailable) {
      console.log('🎯 Using Transformers.js...');
      result = await this.generateTransformersSummary(truncatedTranscript, finalLength);
    } else {
      console.log('🎯 Using Mock/Basic summary...');
      result = await this.generateMockSummary(truncatedTranscript, finalLength, minLength);
    }
    
    // If all AI engines fail, ensure we have a working summary
    if (!result.success) {
      console.log('All AI engines failed, using enhanced basic summary');
      result = await this.generateMockSummary(truncatedTranscript, finalLength, minLength);
      result.engine = 'mock';
    }
    
    // Add word count information
    result.originalWordCount = originalWordCount;
    result.summaryWordCount = this.calculateWordCount(result.summary || '');
    result.targetLength = finalLength;
    result.compressionRatio = compressionPercentage;
    
    return result;
  }

  private calculateWordCount(text: string): number {
    // Remove extra whitespace and split by spaces
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private async generateWebLLMSummary(
    transcript: string, 
    targetLength: number
  ): Promise<SummarizationResult> {
    try {
      // Check if we're in a Chrome extension context
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        console.log('WebLLM not suitable for Chrome extension popup context');
        return {
          success: false,
          error: 'WebLLM requires full browser context. Chrome extension popups have limited WebGPU and service worker access.',
          engine: 'webllm'
        };
      }

      // Check WebGPU availability
      if (!navigator.gpu) {
        console.log('WebGPU not available for WebLLM');
        return {
          success: false,
          error: 'WebGPU not available. WebLLM requires WebGPU support.',
          engine: 'webllm'
        };
      }

      // Dynamic import to avoid bundling issues
      const { MLCEngine } = await import('@mlc-ai/web-llm');
      
      // Create a summarization prompt
      const prompt = `Please summarize the following transcript in approximately ${targetLength} words, focusing on the key points and main concepts:

${transcript}

Summary:`;

      // Initialize the engine with a small model for summarization
      const engine = new MLCEngine({
        model: 'Llama-3.2-1B-Instruct-q4f16_1', // Small model for faster processing
        modelConfig: {
          temperature: 0.7,
          maxTokens: targetLength * 2, // Allow some flexibility
        }
      });

      // Generate the summary
      const response = await engine.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: targetLength * 2,
      });

      const summary = response.choices[0]?.message?.content || '';

      return {
        success: true,
        summary: summary.trim(),
        engine: 'webllm'
      };
    } catch (error) {
      console.error('WebLLM summarization failed:', error);
      return {
        success: false,
        error: 'WebLLM failed to initialize. This may be due to WebGPU limitations or model loading issues.',
        engine: 'webllm'
      };
    }
  }

  private async generateTransformersSummary(
    transcript: string, 
    targetLength: number
  ): Promise<SummarizationResult> {
    try {
      // Dynamic import to avoid bundling issues
      const { pipeline } = await import('@xenova/transformers');
      
      // Load a summarization model (use a smaller, faster model for extension context)
      const summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6');
      
      // Prepare the text for summarization
      const maxLength = Math.min(targetLength * 2, 150); // Transformers.js max_length
      const minLength = Math.max(Math.floor(targetLength * 0.5), 30);
      
      // Truncate transcript if too long for the model
      const maxInputLength = 1024; // Most models have input limits
      const truncatedTranscript = transcript.length > maxInputLength 
        ? transcript.substring(0, maxInputLength) + "..."
        : transcript;
      
      // Generate summary
      const result = await summarizer(truncatedTranscript, {
        max_length: maxLength,
        min_length: minLength,
        do_sample: false,
      });

      const summary = result[0]?.summary_text || '';

      return {
        success: true,
        summary: summary.trim(),
        engine: 'transformers'
      };
    } catch (error) {
      console.error('Transformers.js summarization failed:', error);
      return {
        success: false,
        error: 'Transformers.js failed to load or process. This may be due to memory limitations or model loading issues.',
        engine: 'transformers'
      };
    }
  }

  private async generateMockSummary(
    transcript: string, 
    maxLength: number, 
    minLength: number
  ): Promise<SummarizationResult> {
    // Create an intelligent extractive summary as a fallback
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const wordCount = transcript.split(/\s+/).length;
    
    // Score sentences by importance (simple heuristic)
    const scoredSentences = sentences.map(sentence => {
      const words = sentence.toLowerCase().split(/\s+/);
      let score = 0;
      
      // Higher score for sentences with important keywords
      const importantWords = ['important', 'key', 'main', 'primary', 'essential', 'fundamental', 'basic', 'concept', 'principle', 'method', 'technique', 'example', 'note', 'remember', 'understand'];
      importantWords.forEach(word => {
        if (words.includes(word)) score += 2;
      });
      
      // Higher score for longer sentences (usually more informative)
      score += Math.min(words.length / 10, 3);
      
      // Higher score for sentences with numbers or specific terms
      if (/\d+/.test(sentence)) score += 1;
      if (/[A-Z]{2,}/.test(sentence)) score += 1; // Acronyms
      
      return { sentence: sentence.trim(), score };
    });
    
    // Sort by score and take the best sentences
    scoredSentences.sort((a, b) => b.score - a.score);
    
    let summary = '';
    let currentLength = 0;
    
    for (const { sentence } of scoredSentences) {
      const sentenceWords = sentence.split(/\s+/).length;
      if (currentLength + sentenceWords <= maxLength) {
        summary += sentence + '. ';
        currentLength += sentenceWords;
      } else {
        break;
      }
    }

    // If no summary was created, create a basic one
    if (!summary.trim()) {
      const words = transcript.split(/\s+/);
      const targetWords = Math.min(maxLength, Math.max(minLength, Math.floor(words.length * 0.1)));
      summary = words.slice(0, targetWords).join(' ') + '...';
    }

    return {
      success: true,
      summary: summary.trim(),
      engine: 'mock'
    };
  }

  // Method to check which engines are available
  getAvailableEngines(): { webllm: boolean; transformers: boolean; mock: boolean } {
    return {
      webllm: this.isWebLLMAvailable,
      transformers: this.isTransformersAvailable,
      mock: true // Always available as fallback
    };
  }

  // Method to get engine status
  getEngineStatus(): { webllm: string; transformers: string; mock: string } {
    return {
      webllm: this.isWebLLMAvailable ? 'Available (WebGPU detected)' : 'Not Available (No WebGPU)',
      transformers: this.isTransformersAvailable ? 'Available' : 'Not Available (Library not loaded)',
      mock: 'Available (Basic extractive summary)'
    };
  }

  // Method to get setup instructions
  getSetupInstructions(): string {
    return `
AI Summarization Setup Instructions:

🔧 To enable full AI summarization, you need to:

1. Install AI libraries:
   npm install @xenova/transformers @mlc-ai/web-llm

2. For WebLLM (GPU acceleration):
   - Requires Chrome/Edge with WebGPU support
   - Needs 2-4GB RAM for model loading
   - Faster and more accurate summaries

3. For Transformers.js (CPU):
   - Works on all browsers
   - Requires 200-400MB for model loading
   - Slower but universal compatibility

4. Current Status:
   - Using basic extractive summarization
   - Limited to first few sentences
   - No AI model inference

📚 For detailed setup instructions, see the README.md file.
    `.trim();
  }
}

// Export singleton instance
export const aiSummarizationService = new AISummarizationService();
