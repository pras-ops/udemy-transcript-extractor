// Type declarations for Chrome extension APIs
declare const chrome: any;

// Type declarations for WebGPU
declare global {
  interface Navigator {
    gpu?: any;
  }
}

// Import enhanced RAG service
import { localRAGService, ValidationResult } from './local-rag-service';

export enum SummaryMode {
  Simple = 'simple',      // Always 2-3 sentence overview
  StudyNotes = 'study-notes'  // Structured, detailed notes
}

export interface SummarizationOptions {
  summaryMode?: SummaryMode; // Mode of summary generation
  useWebLLM?: boolean;
  outputFormat?: 'paragraph' | 'bullet-points' | 'numbered-list'; // Output format
  includeExamples?: boolean; // Include examples in summary
  includeDefinitions?: boolean; // Include key definitions
  focusAreas?: string[]; // Specific areas to focus on
}

export interface SummarizationResult {
  success: boolean;
  summary?: string;
  error?: string;
  engine?: 'webllm' | 'transformers' | 'mock' | 'enhanced' | 'simple' | 'rag-enhanced';
  originalWordCount?: number;
  summaryWordCount?: number;
  targetLength?: number;
  compressionRatio?: number;
  validation?: ValidationResult;
  ragContext?: string[];
  confidence?: number;
}

class AISummarizationService {
  constructor() {
    // Privacy-first: All processing happens locally - no external requests
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


  private async summarizeLocally(
    transcript: string, 
    options: SummarizationOptions
  ): Promise<SummarizationResult> {
    
    const {
      summaryMode = SummaryMode.Simple // Default to Simple overview
    } = options;

    // Calculate target parameters based on summary mode
    const targetParams = this.calculateTargetParameters(transcript, summaryMode);
    const { targetLength, maxLength, minLength, compressionRatio } = targetParams;

    // Calculate original word count
    const originalWordCount = this.calculateWordCount(transcript);


    // Get RAG context for enhanced processing
    const ragResult = await localRAGService.retrieveRelevantContext(
      "key concepts main points educational content examples definitions"
    );

    // Use enhanced RAG-based summary
    const result = await this.generateRAGEnhancedSummary(
      transcript, 
      maxLength, 
      minLength, 
      summaryMode, 
      ragResult.chunks.map(chunk => chunk.content)
    );
    
    // Add word count information
    result.originalWordCount = originalWordCount;
    result.summaryWordCount = this.calculateWordCount(result.summary || '');
    result.targetLength = targetLength;
    result.compressionRatio = compressionRatio;
    result.engine = 'rag-enhanced';
    result.ragContext = ragResult.chunks.map(chunk => chunk.content);
    result.confidence = ragResult.averageSimilarity;

    // Validate output
    const validation = localRAGService.validateOutput(transcript, result.summary || '');
    result.validation = validation;

    if (!validation.isValid) {
      result.confidence = (result.confidence || 1) * validation.confidence;
    }

    return result;
  }

  async summarizeTranscript(
    transcript: string, 
    options: SummarizationOptions = {}
  ): Promise<SummarizationResult> {
    // Build RAG knowledge base first
    await localRAGService.buildKnowledgeBase(transcript);
    
    // Retrieve relevant context
    const ragResult = await localRAGService.retrieveRelevantContext(
      "key concepts main points educational content examples definitions"
    );
    
    // Always use background script for Chrome extension contexts
    if (this.isChromeExtensionContext()) {
      const result = await this.summarizeViaBackground(transcript, options);
      
      // Add RAG context to result
      if (result.success) {
        result.ragContext = ragResult.chunks.map(chunk => chunk.content);
        result.confidence = ragResult.averageSimilarity;
        
        // Validate output
        const validation = localRAGService.validateOutput(transcript, result.summary || '');
        result.validation = validation;
        
        if (!validation.isValid) {
          result.confidence = (result.confidence || 1) * validation.confidence;
        }
      }
      
      return result;
    }
    
    const {
      summaryMode = SummaryMode.Simple // Default to Simple overview
    } = options;

    // Calculate target parameters based on summary mode
    const targetParams = this.calculateTargetParameters(transcript, summaryMode);
    const { targetLength, maxLength, minLength, maxTranscriptLength, compressionRatio } = targetParams;

    // Calculate original word count
    const originalWordCount = this.calculateWordCount(transcript);
    
    // Smart transcript truncation - keep the most important parts
    let processedTranscript = transcript;
    
    if (transcript.length > maxTranscriptLength) {
      // Instead of just cutting off, try to keep important sections
      const sentences = transcript.split(/[.!?]+/);
      const importantSentences = sentences.filter(sentence => {
        const lowerSentence = sentence.toLowerCase();
        return lowerSentence.includes('important') || 
               lowerSentence.includes('key') || 
               lowerSentence.includes('main') ||
               lowerSentence.includes('concept') ||
               lowerSentence.includes('principle') ||
               lowerSentence.includes('example');
      });
      
      // If we have important sentences, prioritize them
      if (importantSentences.length > 0) {
        const remainingSpace = maxTranscriptLength - importantSentences.join('. ').length;
        if (remainingSpace > 500) {
          // Add other sentences to fill remaining space
          const otherSentences = sentences.filter(s => !importantSentences.includes(s));
          let result = importantSentences.join('. ');
          for (const sentence of otherSentences) {
            if (result.length + sentence.length < maxTranscriptLength) {
              result += '. ' + sentence;
            } else {
              break;
            }
          }
          processedTranscript = result;
        } else {
          processedTranscript = importantSentences.join('. ');
        }
      } else {
        // Fallback to simple truncation
        processedTranscript = transcript.substring(0, maxTranscriptLength) + "...";
      }
    }

    // Use local processing only
    let result: SummarizationResult;
    
    // For Simple mode, always use reliable extractive approach first
    if (summaryMode === SummaryMode.Simple) {
      result = await this.generateSimpleOverview(processedTranscript, maxLength, minLength);
    } else {
      result = await this.generateMockSummary(processedTranscript, maxLength, minLength, summaryMode);
    }
    
    // Ensure we have a working summary
    if (!result.success) {
      result = await this.generateMockSummary(processedTranscript, maxLength, minLength, summaryMode);
      result.engine = 'enhanced';
    }
    
    // Add word count information
    result.originalWordCount = originalWordCount;
    result.summaryWordCount = this.calculateWordCount(result.summary || '');
    result.targetLength = targetLength;
    result.compressionRatio = compressionRatio;
    
    return result;
  }

  private async summarizeViaBackground(
    transcript: string, 
    options: SummarizationOptions
  ): Promise<SummarizationResult> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'AI_SUMMARIZE',
        data: {
          transcript,
          options
        }
      });
      
      if (response.success && response.summary) {
        return response;
      } else {
        // Fallback to local processing if background fails
        return this.summarizeLocally(transcript, options);
      }
    } catch (error) {
      // Fallback to local processing if communication fails
      return this.summarizeLocally(transcript, options);
    }
  }


  private calculateWordCount(text: string): number {
    // Remove extra whitespace and split by spaces
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Calculate target parameters based on summary mode
   */
  private calculateTargetParameters(transcript: string, summaryMode: SummaryMode): {
    targetLength: number;
    maxLength: number;
    minLength: number;
    maxTranscriptLength: number;
    compressionRatio: number;
  } {
    const originalWordCount = this.calculateWordCount(transcript);
    
    switch (summaryMode) {
      case SummaryMode.Simple:
        // Simple overview: 2-3 sentences, very concise
        return {
          targetLength: Math.min(50, Math.floor(originalWordCount * 0.02)), // 2% of original, max 50 words
          maxLength: Math.min(75, Math.floor(originalWordCount * 0.03)), // Max 3% or 75 words
          minLength: Math.max(25, Math.floor(originalWordCount * 0.01)), // Min 1% or 25 words
          maxTranscriptLength: 2000, // Process minimal content for simple overview
          compressionRatio: 2
        };
      
      case SummaryMode.StudyNotes:
        // Study notes: comprehensive, detailed content
        return {
          targetLength: Math.floor(originalWordCount * 0.40), // 40% of original
          maxLength: Math.min(Math.floor(originalWordCount * 0.60), 2000), // Max 60% or 2000 words
          minLength: Math.max(Math.floor(originalWordCount * 0.30), 150), // Min 30% or 150 words
          maxTranscriptLength: 8000, // Process most content for study notes
          compressionRatio: 40
        };
      
      default:
        // Default to Simple
        return this.calculateTargetParameters(transcript, SummaryMode.Simple);
    }
  }

  /**
   * Generate RAG-enhanced summary with chain-of-thought prompting
   */
  private async generateRAGEnhancedSummary(
    transcript: string,
    maxLength: number,
    minLength: number,
    summaryMode: SummaryMode,
    ragContext: string[]
  ): Promise<SummarizationResult> {
    
    try {
      // Step 1: Chain-of-thought analysis
      const analysisSteps = this.performChainOfThoughtAnalysis(transcript, ragContext);
      
      // Step 2: Enhanced extractive summarization with RAG context
      const summary = this.extractSummaryWithRAGContext(
        transcript, 
        maxLength, 
        minLength, 
        summaryMode, 
        ragContext,
        analysisSteps
      );
      
      return {
        success: true,
        summary: summary,
        engine: 'rag-enhanced'
      };
    } catch (error) {
      return {
        success: false,
        error: 'RAG-enhanced summary generation failed',
        engine: 'rag-enhanced'
      };
    }
  }

  /**
   * Perform chain-of-thought analysis
   */
  private performChainOfThoughtAnalysis(transcript: string, ragContext: string[]): {
    mainTopics: string[];
    keyConcepts: string[];
    examples: string[];
    processes: string[];
  } {
    
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Step 1: Identify main topics
    const mainTopics: string[] = [];
    const topicKeywords = ['topic', 'subject', 'about', 'covers', 'discusses', 'explains'];
    
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      if (topicKeywords.some(keyword => lowerSentence.includes(keyword))) {
        mainTopics.push(sentence.trim());
      }
    });
    
    // Step 2: Extract key concepts
    const keyConcepts: string[] = [];
    const conceptKeywords = ['concept', 'principle', 'definition', 'term', 'idea', 'theory'];
    
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      if (conceptKeywords.some(keyword => lowerSentence.includes(keyword))) {
        keyConcepts.push(sentence.trim());
      }
    });
    
    // Step 3: Find examples
    const examples: string[] = [];
    const exampleKeywords = ['example', 'for instance', 'such as', 'like', 'case', 'demonstration'];
    
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      if (exampleKeywords.some(keyword => lowerSentence.includes(keyword))) {
        examples.push(sentence.trim());
      }
    });
    
    // Step 4: Identify processes
    const processes: string[] = [];
    const processKeywords = ['step', 'process', 'procedure', 'method', 'technique', 'algorithm'];
    
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      if (processKeywords.some(keyword => lowerSentence.includes(keyword))) {
        processes.push(sentence.trim());
      }
    });
    
    return { mainTopics, keyConcepts, examples, processes };
  }

  /**
   * Extract summary with RAG context
   */
  private extractSummaryWithRAGContext(
    transcript: string,
    maxLength: number,
    minLength: number,
    summaryMode: SummaryMode,
    ragContext: string[],
    analysisSteps: any
  ): string {
    
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const wordCount = transcript.split(/\s+/).length;
    
    // Enhanced scoring with RAG context
    const scoredSentences = sentences.map(sentence => {
      const words = sentence.toLowerCase().split(/\s+/);
      let score = 0;
      
      // Base educational scoring
      const educationalKeywords = {
        'concept': 4, 'principle': 4, 'definition': 3, 'important': 2, 'key': 2,
        'example': 3, 'method': 3, 'technique': 3, 'step': 2, 'process': 2,
        'algorithm': 3, 'formula': 3, 'theory': 3, 'practice': 2
      };
      
      Object.entries(educationalKeywords).forEach(([keyword, weight]) => {
        if (words.includes(keyword)) score += weight;
      });
      
      // RAG context bonus - boost sentences similar to RAG chunks
      ragContext.forEach(ragChunk => {
        const similarity = this.calculateTextSimilarity(sentence, ragChunk);
        if (similarity > 0.3) {
          score += similarity * 3; // Boost similar content
        }
      });
      
      // Chain-of-thought bonus
      if (analysisSteps.mainTopics.includes(sentence)) score += 4;
      if (analysisSteps.keyConcepts.includes(sentence)) score += 3;
      if (analysisSteps.examples.includes(sentence)) score += 2;
      if (analysisSteps.processes.includes(sentence)) score += 2;
      
      // Position bonus (first sentences often important)
      const sentenceIndex = sentences.indexOf(sentence);
      if (sentenceIndex < 3) score += 3;
      else if (sentenceIndex < 5) score += 2;
      
      // Length bonus
      score += Math.min(words.length / 15, 2);
      
      return { sentence: sentence.trim(), score };
    });
    
    // Sort by score and build summary
    scoredSentences.sort((a, b) => b.score - a.score);
    
    let summary = '';
    let currentLength = 0;
    
    for (const { sentence } of scoredSentences) {
      const sentenceWords = sentence.split(/\s+/).length;
      
      if (currentLength + sentenceWords > maxLength && currentLength >= minLength) {
        break;
      }
      
      summary += (summary ? ' ' : '') + sentence + '.';
      currentLength += sentenceWords;
    }
    
    // Ensure minimum length
    if (currentLength < minLength) {
      const remainingSentences = scoredSentences.slice(summary.split(/[.!?]+/).length - 1);
      for (const { sentence } of remainingSentences) {
        const sentenceWords = sentence.split(/\s+/).length;
        if (currentLength + sentenceWords <= maxLength * 1.2) {
          summary += ' ' + sentence + '.';
          currentLength += sentenceWords;
        }
        if (currentLength >= minLength) break;
      }
    }
    
    return summary.trim();
  }

  /**
   * Calculate text similarity (simple word overlap)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Generate a simple 2-3 sentence overview (reliable extractive approach)
   */
  private async generateSimpleOverview(
    transcript: string, 
    maxLength: number, 
    minLength: number
  ): Promise<SummarizationResult> {
    
    try {
      // Extract key sentences for overview
      const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const wordCount = transcript.split(/\s+/).length;
    
    // Find the most important sentences for overview
    const scoredSentences = sentences.map(sentence => {
      const words = sentence.toLowerCase().split(/\s+/);
      let score = 0;
      
      // Overview-specific scoring
      const overviewKeywords = {
        'introduces': 5, 'introduction': 5, 'about': 4, 'overview': 4, 'topic': 4,
        'subject': 4, 'learn': 3, 'understand': 3, 'purpose': 3, 'objective': 3,
        'goal': 3, 'audience': 3, 'level': 2, 'difficulty': 2, 'beginner': 2,
        'advanced': 2, 'covers': 3, 'explains': 3, 'discusses': 3
      };
      
      // Score based on overview keywords
      Object.entries(overviewKeywords).forEach(([keyword, weight]) => {
        if (words.includes(keyword)) score += weight;
      });
      
      // Prioritize first few sentences (usually contain overview)
      const sentenceIndex = sentences.indexOf(sentence);
      if (sentenceIndex < 3) score += 4;
      else if (sentenceIndex < 5) score += 2;
      
      // Length bonus (prefer medium-length sentences for overview)
      score += Math.min(words.length / 15, 2);
      
      return { sentence: sentence.trim(), score };
    });
    
    // Sort by score and take top sentences
    scoredSentences.sort((a, b) => b.score - a.score);
    
    let overview = '';
    let currentLength = 0;
    let sentenceCount = 0;
    const maxSentences = 3; // Limit to 2-3 sentences
    
    // Build overview with top sentences
    for (const { sentence } of scoredSentences) {
      if (sentenceCount >= maxSentences) break;
      
      const sentenceWords = sentence.split(/\s+/).length;
      
      // Check if adding this sentence would exceed limits
      if (currentLength + sentenceWords > maxLength && currentLength >= minLength) {
        break;
      }
      
      overview += (overview ? ' ' : '') + sentence + '.';
      currentLength += sentenceWords;
      sentenceCount++;
    }
    
    // If no overview was created, create a basic one
    if (!overview.trim()) {
      const words = transcript.split(/\s+/);
      const targetWords = Math.min(maxLength, Math.max(minLength, 30));
      overview = words.slice(0, targetWords).join(' ') + '...';
    }
    
    const finalWordCount = overview.split(/\s+/).length;

      return {
        success: true,
        summary: overview.trim(),
        engine: 'enhanced'
      };
    } catch (error) {
      // Fallback to basic summary if simple overview fails
      return {
        success: false,
        error: 'Simple overview generation failed',
        engine: 'enhanced'
      };
    }
  }


  private async generateMockSummary(
    transcript: string, 
    maxLength: number, 
    minLength: number,
    summaryMode: SummaryMode = SummaryMode.Simple
  ): Promise<SummarizationResult> {
    // Create an intelligent extractive summary as a fallback
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const wordCount = transcript.split(/\s+/).length;
    
    // Enhanced sentence scoring for educational content based on summary type
    const scoredSentences = sentences.map(sentence => {
      const words = sentence.toLowerCase().split(/\s+/);
      let score = 0;
      
      // Adjust scoring based on summary mode
      if (summaryMode === SummaryMode.Simple) {
        // For simple overviews, prioritize overview and introduction sentences
        const overviewKeywords = {
          'topic': 5, 'subject': 5, 'about': 4, 'overview': 4, 'introduction': 4,
          'learn': 3, 'understand': 3, 'purpose': 3, 'objective': 3, 'goal': 3,
          'audience': 3, 'level': 2, 'difficulty': 2, 'beginner': 2, 'advanced': 2,
          'introduces': 5, 'covers': 3, 'explains': 3, 'discusses': 3
        };
        
        Object.entries(overviewKeywords).forEach(([keyword, weight]) => {
          if (words.includes(keyword)) score += weight;
        });
        
        // Prioritize first few sentences
        const sentenceIndex = sentences.indexOf(sentence);
        if (sentenceIndex < 3) score += 4;
        else if (sentenceIndex < 5) score += 2;
        
      } else if (summaryMode === SummaryMode.StudyNotes) {
        // For study notes, include comprehensive educational content
        const educationalKeywords = {
          'concept': 4, 'principle': 4, 'method': 3, 'technique': 3, 'example': 3,
          'important': 2, 'key': 2, 'main': 2, 'primary': 2, 'essential': 2, 
          'fundamental': 3, 'basic': 2, 'learn': 2, 'understand': 2, 'explain': 2,
          'definition': 3, 'demonstration': 2, 'illustration': 2, 'note': 2, 'remember': 2,
          'step': 3, 'process': 3, 'procedure': 3, 'algorithm': 3, 'formula': 3
        };
        
        Object.entries(educationalKeywords).forEach(([keyword, weight]) => {
          if (words.includes(keyword)) score += weight;
        });
        
        // Include more sentences for study notes
        score += Math.min(words.length / 20, 3);
      }
      
      // Technical terms scoring (universal)
      const technicalTerms = ['algorithm', 'function', 'class', 'variable', 'method', 'program', 'code', 'data', 'structure'];
      technicalTerms.forEach(term => {
        if (words.includes(term)) score += 3;
      });
      
      // Process indicators (step-by-step content)
      const processWords = ['first', 'second', 'next', 'then', 'finally', 'step', 'process', 'procedure'];
      processWords.forEach(word => {
        if (words.includes(word)) score += 2;
      });
      
      // Length bonus (adjust based on summary mode)
      if (summaryMode === SummaryMode.StudyNotes) {
        score += Math.min(words.length / 20, 3); // More length bonus for study notes
      } else {
        score += Math.min(words.length / 15, 2); // Standard length bonus for simple overview
      }
      
      // Numbers and specific terms
      if (/\d+/.test(sentence)) score += 1;
      if (/[A-Z]{2,}/.test(sentence)) score += 1; // Acronyms
      
      // Question sentences often contain key concepts
      if (sentence.includes('?')) score += 1;
      
      return { sentence: sentence.trim(), score };
    });
    
    // Sort by score and take the best sentences
    scoredSentences.sort((a, b) => b.score - a.score);
    
    let summary = '';
    let currentLength = 0;
    
    // FIXED: Try to meet the target length more accurately
    for (const { sentence } of scoredSentences) {
      const sentenceWords = sentence.split(/\s+/).length;
      
      // If adding this sentence would exceed maxLength, check if we're close enough
      if (currentLength + sentenceWords > maxLength) {
        // If we're within 20% of target and have at least minLength, we're good
        if (currentLength >= minLength && currentLength >= maxLength * 0.8) {
          break;
        }
        // If we're still too short, try to add a partial sentence or continue
        if (currentLength < minLength) {
          // Add partial sentence to meet minimum
          const remainingWords = minLength - currentLength;
          const words = sentence.split(/\s+/);
          if (words.length > remainingWords) {
            summary += words.slice(0, remainingWords).join(' ') + '... ';
            currentLength += remainingWords;
          } else {
            summary += sentence + '. ';
            currentLength += sentenceWords;
          }
        }
        break;
      } else {
        summary += sentence + '. ';
        currentLength += sentenceWords;
      }
    }

    // If we still haven't reached a reasonable length, add more sentences
    if (currentLength < minLength) {
      // Add more sentences from the remaining ones
      const remainingSentences = scoredSentences.slice(summary.split(/[.!?]+/).length - 1);
      for (const { sentence } of remainingSentences) {
        const sentenceWords = sentence.split(/\s+/).length;
        if (currentLength + sentenceWords <= maxLength * 1.2) { // Allow 20% over target
          summary += sentence + '. ';
          currentLength += sentenceWords;
        }
        if (currentLength >= minLength) break;
      }
    }

    // If no summary was created, create a basic one
    if (!summary.trim()) {
      const words = transcript.split(/\s+/);
      const targetWords = Math.min(maxLength, Math.max(minLength, Math.floor(words.length * 0.1)));
      summary = words.slice(0, targetWords).join(' ') + '...';
    }
    
    // Apply output formatting if specified (options parameter not available in this context)
    // Formatting will be handled by the calling method

    const finalWordCount = summary.split(/\s+/).length;

    return {
      success: true,
      summary: summary.trim(),
      engine: 'enhanced'
    };
  }

  // Method to check which engines are available
  getAvailableEngines(): { webllm: boolean; transformers: boolean; mock: boolean } {
    return {
      webllm: false, // AI engines removed for privacy-first approach
      transformers: false, // AI engines removed for privacy-first approach
      mock: true // Always available as fallback
    };
  }

  // Method to get engine status
  getEngineStatus(): { webllm: string; transformers: string; mock: string } {
    return {
      webllm: 'Not Available (Removed for privacy-first approach)',
      transformers: 'Not Available (Removed for privacy-first approach)',
      mock: 'Available (Enhanced local extractive summary)'
    };
  }

  // Format summary as bullet points
  private formatAsBulletPoints(summary: string): string {
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.map(sentence => `• ${sentence.trim()}`).join('\n');
  }

  // Format summary as numbered list
  private formatAsNumberedList(summary: string): string {
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.map((sentence, index) => `${index + 1}. ${sentence.trim()}`).join('\n');
  }

  /**
   * Create dynamic educational prompts based on content analysis
   */
  private createEducationalPrompt(transcript: string, targetLength: number, summaryMode: SummaryMode, options: SummarizationOptions): string {
    // Analyze content to determine subject area and focus
    const contentAnalysis = this.analyzeContentType(transcript);
    const focusInstructions = this.generateFocusInstructions(contentAnalysis, options);
    const formatInstructions = this.generateFormatInstructions(options);
    
    // Generate summary mode specific instructions
    const summaryModeInstructions = this.generateSummaryModeInstructions(summaryMode, targetLength);
    
    return `You are an expert educational content summarizer specializing in ${contentAnalysis.subjectArea}.

${summaryModeInstructions}

${focusInstructions}

${formatInstructions}

Transcript:
${transcript}

Educational Summary:`;
  }

  /**
   * Analyze content to determine subject area and type (no hard-coding)
   */
  private analyzeContentType(transcript: string): { subjectArea: string; contentType: string; keyTopics: string[] } {
    const lowerTranscript = transcript.toLowerCase();
    
    // Dynamic subject area detection
    const subjectAreas = {
      'Data Science & Statistics': ['statistics', 'data', 'analysis', 'regression', 'correlation', 'variance', 'mean', 'standard deviation'],
      'Programming & Software': ['programming', 'code', 'function', 'class', 'algorithm', 'software', 'development'],
      'Mathematics': ['calculus', 'algebra', 'geometry', 'equation', 'formula', 'derivative', 'integral'],
      'Business & Economics': ['business', 'economics', 'market', 'finance', 'strategy', 'management'],
      'Science & Engineering': ['physics', 'chemistry', 'engineering', 'experiment', 'theory', 'hypothesis'],
      'General Education': ['concept', 'principle', 'example', 'definition', 'explanation', 'learning']
    };
    
    // Find the most relevant subject area
    let bestMatch = 'General Education';
    let maxScore = 0;
    
    Object.entries(subjectAreas).forEach(([area, keywords]) => {
      const score = keywords.reduce((acc, keyword) => {
        return acc + (lowerTranscript.includes(keyword) ? 1 : 0);
      }, 0);
      
      if (score > maxScore) {
        maxScore = score;
        bestMatch = area;
      }
    });
    
    // Determine content type
    const contentType = this.determineContentType(lowerTranscript);
    
    // Extract key topics
    const keyTopics = this.extractKeyTopics(lowerTranscript);
    
    return {
      subjectArea: bestMatch,
      contentType,
      keyTopics
    };
  }

  /**
   * Determine content type based on patterns
   */
  private determineContentType(transcript: string): string {
    if (transcript.includes('definition') || transcript.includes('what is')) {
      return 'definition-focused lecture';
    } else if (transcript.includes('example') || transcript.includes('for instance')) {
      return 'example-driven tutorial';
    } else if (transcript.includes('step') || transcript.includes('process')) {
      return 'step-by-step guide';
    } else if (transcript.includes('formula') || transcript.includes('equation')) {
      return 'mathematical concept explanation';
    } else if (transcript.includes('compare') || transcript.includes('difference')) {
      return 'comparative analysis';
    } else {
      return 'general educational content';
    }
  }

  /**
   * Extract key topics from transcript
   */
  private extractKeyTopics(transcript: string): string[] {
    // Extract capitalized words and phrases (likely proper nouns/concepts)
    const capitalizedWords = transcript.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    
    // Extract quoted terms (likely important concepts)
    const quotedTerms = transcript.match(/"([^"]+)"/g) || [];
    
    // Combine and deduplicate
    const topics = [...new Set([...capitalizedWords, ...quotedTerms])]
      .filter(topic => topic.length > 2 && topic.length < 50)
      .slice(0, 10); // Limit to top 10 topics
    
    return topics;
  }

  /**
   * Generate focus instructions based on content analysis
   */
  private generateFocusInstructions(analysis: any, options: SummarizationOptions): string {
    const baseInstructions = [
      'Focus on key concepts and main learning objectives',
      'Include important examples and explanations',
      'Highlight step-by-step processes or procedures',
      'Preserve definitions of technical terms',
      'Note practical applications or use cases'
    ];
    
    // Add subject-specific instructions
    if (analysis.subjectArea.includes('Data Science')) {
      baseInstructions.push('Emphasize statistical concepts and data analysis methods');
    } else if (analysis.subjectArea.includes('Programming')) {
      baseInstructions.push('Focus on code examples and programming concepts');
    } else if (analysis.subjectArea.includes('Mathematics')) {
      baseInstructions.push('Preserve mathematical notation and formulas');
    }
    
    // Add content-type specific instructions
    if (analysis.contentType.includes('definition')) {
      baseInstructions.push('Prioritize clear definitions and explanations');
    } else if (analysis.contentType.includes('example')) {
      baseInstructions.push('Include concrete examples and use cases');
    } else if (analysis.contentType.includes('step-by-step')) {
      baseInstructions.push('Maintain the logical sequence of steps');
    }
    
    return baseInstructions.map(instruction => `- ${instruction}`).join('\n');
  }

  /**
   * Generate format instructions based on options
   */
  private generateFormatInstructions(options: SummarizationOptions): string {
    if (options.outputFormat === 'bullet-points') {
      return 'Format the summary as clear bullet points with descriptive headers.';
    } else if (options.outputFormat === 'numbered-list') {
      return 'Format the summary as a numbered list with logical progression.';
    } else {
      return 'Format the summary as flowing paragraphs with clear topic transitions.';
    }
  }

  /**
   * Generate summary mode specific instructions
   */
  private generateSummaryModeInstructions(summaryMode: SummaryMode, targetLength: number): string {
    switch (summaryMode) {
      case SummaryMode.Simple:
        return `Create a SIMPLE OVERVIEW summary in approximately ${targetLength} words that tells the user what this video is about.

Focus on:
- Main topic and subject matter (what is this about?)
- Overall purpose and learning objectives (what will I learn?)
- Brief overview of what will be covered (what topics?)
- Target audience and difficulty level (who is this for?)

This should be like a concise "video description" that helps users quickly understand what they're about to learn. Keep it to 2-3 clear, informative sentences.`;
      
      case SummaryMode.StudyNotes:
        return `Create COMPREHENSIVE STUDY NOTES in approximately ${targetLength} words that serve as detailed learning material.

Focus on:
- Complete explanations of all key concepts
- Step-by-step processes and procedures
- Detailed examples and applications
- Important formulas, definitions, and technical details
- Related topics and connections
- Practical use cases and real-world applications

This should be like comprehensive lecture notes that can be used for deep study, exam preparation, and reference. Structure the content with clear headings and logical flow.`;
      
      default:
        return `Create a comprehensive summary in approximately ${targetLength} words.`;
    }
  }

  // Method to get setup instructions
  getSetupInstructions(): string {
    return `
AI Summarization Status:

🔒 Privacy-First Approach:
   - All processing happens locally in your browser
   - No external requests or data transmission
   - No AI model downloads or CDN usage
   - Enhanced extractive summarization with educational focus

✅ Current Features:
   - Smart sentence scoring for educational content
   - Intelligent content filtering and prioritization
   - Multiple summary modes (Simple overview, Study notes)
   - Privacy-protected local processing

📚 This extension prioritizes your privacy while providing high-quality transcript summarization.
    `.trim();
  }
}

// Export singleton instance
export const aiSummarizationService = new AISummarizationService();
