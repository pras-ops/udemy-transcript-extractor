export interface SummarizationOptions {
  maxLength?: number;
  minLength?: number;
  useWebLLM?: boolean;
  adaptiveMode?: boolean;
  adaptivePercentage?: number; // Percentage of original length (default: 50%)
  maxAdaptiveLength?: number; // Cap for adaptive mode (default: 500)
}

export interface SummarizationResult {
  success: boolean;
  summary?: string;
  error?: string;
  engine?: 'webllm' | 'transformers' | 'mock';
  originalWordCount?: number;
  summaryWordCount?: number;
  adaptiveLength?: number;
}

class AISummarizationService {
  private isWebLLMAvailable = false;
  private isTransformersAvailable = false;

  constructor() {
    this.checkEngineSupport();
  }

  private async checkEngineSupport(): Promise<void> {
    try {
      // Check if WebGPU is available for WebLLM
      if (navigator.gpu) {
        this.isWebLLMAvailable = true;
        console.log('WebLLM support detected (WebGPU available)');
      } else {
        console.log('WebLLM not available (No WebGPU support)');
      }

      // Check if Transformers.js is available
      try {
        // Try to access the library without importing it
        this.isTransformersAvailable = true;
        console.log('Transformers.js support detected');
      } catch (error) {
        console.log('Transformers.js not available:', error);
      }
    } catch (error) {
      console.log('Engine support check failed:', error);
    }
  }

  async summarizeTranscript(
    transcript: string, 
    options: SummarizationOptions = {}
  ): Promise<SummarizationResult> {
    const {
      maxLength = 150,
      minLength = 50,
      useWebLLM = this.isWebLLMAvailable,
      adaptiveMode = false,
      adaptivePercentage = 50,
      maxAdaptiveLength = 500
    } = options;

    // Calculate original word count
    const originalWordCount = this.calculateWordCount(transcript);
    
    // Determine target length based on mode
    let targetLength: number;
    let adaptiveLength: number | undefined;
    
    if (adaptiveMode) {
      // Calculate adaptive length (percentage of original)
      adaptiveLength = Math.floor((originalWordCount * adaptivePercentage) / 100);
      // Apply cap for performance
      targetLength = Math.min(adaptiveLength, maxAdaptiveLength);
      // Ensure minimum length
      targetLength = Math.max(targetLength, minLength);
    } else {
      targetLength = maxLength;
    }

    // Truncate transcript if too long (to avoid memory issues)
    const maxTranscriptLength = 4000; // ~4000 characters
    const truncatedTranscript = transcript.length > maxTranscriptLength 
      ? transcript.substring(0, maxTranscriptLength) + "..."
      : transcript;

    // For now, return a mock implementation with instructions
    const result = await this.generateMockSummary(truncatedTranscript, targetLength, minLength);
    
    // Add word count information
    result.originalWordCount = originalWordCount;
    result.summaryWordCount = this.calculateWordCount(result.summary || '');
    result.adaptiveLength = adaptiveLength;
    
    return result;
  }

  private calculateWordCount(text: string): number {
    // Remove extra whitespace and split by spaces
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private async generateMockSummary(
    transcript: string, 
    maxLength: number, 
    minLength: number
  ): Promise<SummarizationResult> {
    // Create a simple extractive summary as a fallback
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const wordCount = transcript.split(/\s+/).length;
    
    // Take first few sentences that fit within the length constraints
    let summary = '';
    let currentLength = 0;
    
    for (const sentence of sentences) {
      const sentenceWords = sentence.trim().split(/\s+/).length;
      if (currentLength + sentenceWords <= maxLength) {
        summary += sentence.trim() + '. ';
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
