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
// Import fully dynamic subject detector
import { FullyDynamicDetector } from './fully-dynamic-detector';

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
  engine?: 'webllm' | 'transformers' | 'mock' | 'enhanced' | 'simple' | 'rag-enhanced' | 'dynamic-enhanced' | 'dynamic-transcript-based';
  originalWordCount?: number;
  summaryWordCount?: number;
  targetLength?: number;
  compressionRatio?: number;
  validation?: ValidationResult;
  ragContext?: string[];
  confidence?: number;
  processingTime?: number;
  // Dynamic subject detection results
  subjects?: Array<{name: string, confidence: number, keywords: string[]}>;
  primarySubject?: string;
}

class AISummarizationService {
  private isProcessing = false; // Debouncing flag
  
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
    // Debouncing: Prevent multiple simultaneous requests
    if (this.isProcessing) {
      console.log('⚠️ AI Service: Already processing, ignoring duplicate request');
      return {
        success: false,
        error: 'Already processing another request'
      };
    }
    
    this.isProcessing = true;
    
    try {
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
      result = await this.generateDynamicSummary(processedTranscript, maxLength, minLength, summaryMode);
    }
    
    // Ensure we have a working summary
    if (!result.success) {
      result = await this.generateDynamicSummary(processedTranscript, maxLength, minLength, summaryMode);
      result.engine = 'dynamic-transcript-based';
    }
    
    // Add word count information
    result.originalWordCount = originalWordCount;
    result.summaryWordCount = this.calculateWordCount(result.summary || '');
    result.targetLength = targetLength;
    result.compressionRatio = compressionRatio;
    
    return result;
    } finally {
      this.isProcessing = false; // Reset processing flag
    }
  }

  private async summarizeViaBackground(
    transcript: string, 
    options: SummarizationOptions
  ): Promise<SummarizationResult> {
    try {
      console.log('🎯 AI Service: Sending message to background script...');
      
      // Add timeout mechanism
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI summarization timeout')), 30000); // 30 second timeout
      });
      
      const messagePromise = new Promise<SummarizationResult>((resolve, reject) => {
        const messageId = Date.now().toString();
        
        // Set up response listener
        const responseListener = (response: any) => {
          if (response.type === 'AI_SUMMARIZE_RESPONSE' && response.data.messageId === messageId) {
            chrome.runtime.onMessage.removeListener(responseListener);
            
            if (response.data.success && response.data.summary) {
              resolve(response.data);
            } else {
              reject(new Error(response.data.error || 'Background summarization failed'));
            }
          }
        };
        
        chrome.runtime.onMessage.addListener(responseListener);
        
        // Send the message
        chrome.runtime.sendMessage({
          type: 'AI_SUMMARIZE',
          data: {
            transcript,
            options
          },
          messageId: messageId
        }).catch(reject);
      });
      
      const response = await Promise.race([messagePromise, timeoutPromise]);
      
      if (response.success && response.summary) {
        console.log('✅ AI Service: Background summarization successful');
        return response;
      } else {
        console.log('⚠️ AI Service: Background summarization failed, falling back to local');
        return this.summarizeLocally(transcript, options);
      }
    } catch (error) {
      console.log('⚠️ AI Service: Background communication failed, falling back to local:', error);
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


  private async generateDynamicSummary(
    transcript: string, 
    maxLength: number, 
    minLength: number,
    summaryMode: SummaryMode = SummaryMode.Simple
  ): Promise<SummarizationResult> {
    // Create a truly dynamic summary based purely on transcript content
    console.log('🎯 AI Service: Generating dynamic summary from transcript content...');
    
    // Step 1: Extract key information directly from transcript
    const extractedContent = this.extractContentFromTranscript(transcript);
    
    // Step 2: Create summary using only extracted content
    const summary = this.createTranscriptBasedSummary(extractedContent, maxLength, minLength);
    
    return {
      success: true,
      summary: summary,
      engine: 'dynamic-transcript-based',
      processingTime: Date.now(),
      originalWordCount: transcript.split(/\s+/).length,
      summaryWordCount: summary.split(/\s+/).length,
      compressionRatio: this.calculateCompressionRatio(transcript, summary)
    };
  }

  private extractContentFromTranscript(transcript: string): any {
    // Extract actual content from transcript without hardcoded assumptions
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    return {
      // Extract actual sentences that describe the content
      introductionSentences: this.extractIntroductionSentences(sentences),
      mainContentSentences: this.extractMainContentSentences(sentences),
      conclusionSentences: this.extractConclusionSentences(sentences),
      
      // Extract actual topics mentioned in the transcript
      mentionedTopics: this.extractMentionedTopics(transcript),
      
      // Extract actual learning outcomes mentioned
      mentionedOutcomes: this.extractMentionedOutcomes(transcript),
      
      // Extract actual duration/time references
      timeReferences: this.extractTimeReferences(transcript),
      
      // Extract actual key points and concepts
      keyPoints: this.extractKeyPoints(sentences)
    };
  }

  private extractIntroductionSentences(sentences: string[]): string[] {
    // Get first few sentences that likely introduce the topic
    return sentences.slice(0, 3).filter(s => s.trim().length > 15);
  }

  private extractMainContentSentences(sentences: string[]): string[] {
    // Get middle sentences that contain the main content
    const middleStart = Math.floor(sentences.length * 0.2);
    const middleEnd = Math.floor(sentences.length * 0.8);
    return sentences.slice(middleStart, middleEnd);
  }

  private extractConclusionSentences(sentences: string[]): string[] {
    // Get last few sentences that likely conclude the topic
    return sentences.slice(-3).filter(s => s.trim().length > 15);
  }

  private extractMentionedTopics(transcript: string): string[] {
    // Extract topics that are actually mentioned in the transcript
    const topicPatterns = [
      /(?:we will|you will|this course|this lesson|this video)\s+(?:talk about|discuss|cover|teach|explain|focus on)\s+([^.!?]+)/gi,
      /(?:about|regarding|concerning)\s+([^.!?]+)/gi,
      /(?:the main topic|the subject|the focus)\s+(?:is|will be)\s+([^.!?]+)/gi
    ];
    
    const topics = new Set<string>();
    topicPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(transcript)) !== null) {
        const topic = match[1].trim();
        if (topic.length > 5 && topic.length < 100) {
          topics.add(topic.toLowerCase());
        }
      }
    });
    
    return Array.from(topics);
  }

  private extractMentionedOutcomes(transcript: string): string[] {
    // Extract outcomes that are actually mentioned
    const outcomePatterns = [
      /(?:by the end|at the end|when you finish|after this)\s+([^.!?]+)/gi,
      /(?:you will have|you will be able to|you will learn|you will understand|you will master)\s+([^.!?]+)/gi,
      /(?:the goal|the objective|the aim|the purpose)\s+(?:is|will be)\s+([^.!?]+)/gi
    ];
    
    const outcomes = new Set<string>();
    outcomePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(transcript)) !== null) {
        const outcome = match[1].trim();
        if (outcome.length > 10 && outcome.length < 150) {
          outcomes.add(outcome.toLowerCase());
        }
      }
    });
    
    return Array.from(outcomes);
  }

  private extractTimeReferences(transcript: string): string[] {
    // Extract actual time references mentioned
    const timePatterns = [
      /(\d+)\s*(?:minute|min|hour|hr|second|sec)/gi,
      /(?:about|approximately|around)\s*(\d+)\s*(?:minute|min|hour|hr)/gi,
      /(?:just|only)\s*(\d+)\s*(?:minute|min|hour|hr)/gi,
      /(?:duration|length|time)\s+(?:is|will be)\s+(\d+)\s*(?:minute|min|hour|hr)/gi
    ];
    
    const timeRefs = new Set<string>();
    timePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(transcript)) !== null) {
        timeRefs.add(match[0].trim());
      }
    });
    
    return Array.from(timeRefs);
  }

  private extractKeyPoints(sentences: string[]): string[] {
    // Extract sentences that contain key information
    const keyPointSentences = sentences.filter(sentence => {
      const words = sentence.toLowerCase().split(/\s+/);
      
      // Look for sentences with important keywords
      const importantWords = ['important', 'key', 'main', 'primary', 'essential', 'critical', 'fundamental'];
      const hasImportantWord = importantWords.some(word => words.includes(word));
      
      // Look for sentences with learning indicators
      const learningWords = ['learn', 'understand', 'master', 'develop', 'build', 'create'];
      const hasLearningWord = learningWords.some(word => words.includes(word));
      
      // Look for sentences with explanation indicators
      const explanationWords = ['explain', 'demonstrate', 'show', 'illustrate', 'describe'];
      const hasExplanationWord = explanationWords.some(word => words.includes(word));
      
      return hasImportantWord || hasLearningWord || hasExplanationWord;
    });
    
    return keyPointSentences.slice(0, 5); // Limit to top 5 key points
  }

  private extractDuration(transcript: string): string | null {
    const durationPatterns = [
      /(\d+)\s*(?:minute|min|hour|hr|second|sec)/gi,
      /(?:about|approximately|around)\s*(\d+)\s*(?:minute|min|hour|hr)/gi,
      /(?:just|only)\s*(\d+)\s*(?:minute|min|hour|hr)/gi
    ];
    
    for (const pattern of durationPatterns) {
      const match = pattern.exec(transcript);
      if (match) {
        return match[1] + (match[0].includes('hour') || match[0].includes('hr') ? ' hour' : ' minute');
      }
    }
    return null;
  }

  private extractTargetAudience(transcript: string): string {
    if (/beginner|basic|intro|starting|new/i.test(transcript)) return 'beginners';
    if (/advanced|expert|professional|experienced/i.test(transcript)) return 'advanced';
    if (/intermediate|some experience/i.test(transcript)) return 'intermediate';
    return 'general';
  }

  private extractMainTopics(transcript: string): string[] {
    const topicPatterns = [
      /(?:about|discuss|cover|focus on|teach|explain)\s+([^.!?]+)/gi,
      /(?:this|the)\s+(?:course|lesson|video|tutorial|guide)\s+(?:is about|covers|teaches|explains)\s+([^.!?]+)/gi,
      /(?:we will|you will|students will)\s+([^.!?]+)/gi,
      /(?:learn|understand|master)\s+([^.!?]+)/gi
    ];
    
    const topics = new Set<string>();
    topicPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(transcript)) !== null) {
        const topic = match[1].trim();
        if (topic.length > 5 && topic.length < 100) {
          topics.add(topic.toLowerCase());
        }
      }
    });
    
    return Array.from(topics).slice(0, 5);
  }

  private extractLearningObjectives(transcript: string): string[] {
    const objectivePatterns = [
      /(?:learn|understand|master|develop|build|create|design|implement)\s+([^.!?]+)/gi,
      /(?:you will|students will|we will)\s+(?:be able to\s+)?([^.!?]+)/gi,
      /(?:goal|objective|aim|purpose)\s+(?:is\s+)?([^.!?]+)/gi
    ];
    
    const objectives = new Set<string>();
    objectivePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(transcript)) !== null) {
        const objective = match[1].trim();
        if (objective.length > 10 && objective.length < 150) {
          objectives.add(objective.toLowerCase());
        }
      }
    });
    
    return Array.from(objectives).slice(0, 4);
  }

  private extractKeyConcepts(transcript: string): string[] {
    const conceptKeywords = {
      'concept': 4, 'principle': 4, 'method': 3, 'technique': 3, 'strategy': 3,
      'approach': 2, 'process': 2, 'system': 2, 'framework': 3, 'model': 3,
      'theory': 3, 'formula': 3, 'algorithm': 3, 'function': 3, 'structure': 2
    };
    
    const concepts: string[] = [];
    Object.keys(conceptKeywords).forEach(keyword => {
      if (transcript.includes(keyword)) {
        concepts.push(keyword);
      }
    });
    
    return concepts;
  }

  private extractTechnicalTerms(transcript: string): string[] {
    const technicalTerms = ['algorithm', 'function', 'class', 'variable', 'method', 'program', 'code', 'data', 'structure', 'database', 'api', 'framework', 'library'];
    return technicalTerms.filter(term => transcript.includes(term));
  }

  private extractOutcomes(transcript: string): string[] {
    const outcomePatterns = [
      /(?:result|outcome|benefit|advantage)\s+(?:is|will be)\s+([^.!?]+)/gi,
      /(?:by the end|at the end|finally|ultimately)\s+([^.!?]+)/gi,
      /(?:you will have|students will have)\s+([^.!?]+)/gi
    ];
    
    const outcomes = new Set<string>();
    outcomePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(transcript)) !== null) {
        const outcome = match[1].trim();
        if (outcome.length > 10 && outcome.length < 100) {
          outcomes.add(outcome.toLowerCase());
        }
      }
    });
    
    return Array.from(outcomes).slice(0, 3);
  }

  private extractBenefits(transcript: string): string[] {
    const benefitPatterns = [
      /(?:benefit|advantage|value)\s+(?:of|is)\s+([^.!?]+)/gi,
      /(?:help|enable|allow)\s+([^.!?]+)/gi,
      /(?:improve|enhance|increase)\s+([^.!?]+)/gi
    ];
    
    const benefits = new Set<string>();
    benefitPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(transcript)) !== null) {
        const benefit = match[1].trim();
        if (benefit.length > 10 && benefit.length < 100) {
          benefits.add(benefit.toLowerCase());
        }
      }
    });
    
    return Array.from(benefits).slice(0, 3);
  }

  private createTranscriptBasedSummary(extractedContent: any, maxLength: number, minLength: number): string {
    let summary = '';
    
    // Start with introduction content if available
    if (extractedContent.introductionSentences.length > 0) {
      const introSentence = this.paraphraseSentence(extractedContent.introductionSentences[0]);
      summary += introSentence + ' ';
    }
    
    // Add main topics if mentioned
    if (extractedContent.mentionedTopics.length > 0) {
      const mainTopic = extractedContent.mentionedTopics[0];
      summary += `The content focuses on ${mainTopic}`;
      
      if (extractedContent.mentionedTopics.length > 1) {
        summary += `, covering topics like ${extractedContent.mentionedTopics.slice(1, 3).join(' and ')}`;
      }
      summary += '. ';
    }
    
    // Add key points from the content
    if (extractedContent.keyPoints.length > 0) {
      summary += 'Key points discussed include ';
      const keyPointTexts = extractedContent.keyPoints.slice(0, 3).map(point => 
        this.paraphraseSentence(point)
      );
      summary += keyPointTexts.join(', ') + '. ';
    }
    
    // Add time references if mentioned
    if (extractedContent.timeReferences.length > 0) {
      const timeRef = extractedContent.timeReferences[0];
      summary += `The content duration is ${timeRef}. `;
    }
    
    // Add outcomes if mentioned
    if (extractedContent.mentionedOutcomes.length > 0) {
      const outcome = this.paraphraseSentence(extractedContent.mentionedOutcomes[0]);
      summary += `By the end, ${outcome}.`;
    } else if (extractedContent.conclusionSentences.length > 0) {
      const conclusion = this.paraphraseSentence(extractedContent.conclusionSentences[0]);
      summary += `In conclusion, ${conclusion.toLowerCase()}.`;
    }
    
    // Clean up and ensure proper length
    summary = this.cleanupSummaryText(summary);
    
    // Adjust length if needed
    const currentWords = summary.split(/\s+/).length;
    if (currentWords > maxLength) {
      summary = this.compressSummary(summary, maxLength);
    } else if (currentWords < minLength) {
      summary = this.expandSummaryWithContent(summary, extractedContent, minLength);
    }
    
    return summary;
  }

  private paraphraseSentence(sentence: string): string {
    // Simple paraphrasing by cleaning up the sentence
    let paraphrased = sentence.trim();
    
    // Remove common filler words and clean up
    paraphrased = paraphrased
      .replace(/^(well|so|now|okay|alright|right|um|uh)\s+/i, '')
      .replace(/\s+/g, ' ')
      .replace(/^[a-z]/, (match) => match.toUpperCase())
      .replace(/[.!?]$/, '');
    
    // Ensure proper ending
    if (!/[.!?]$/.test(paraphrased)) {
      paraphrased += '.';
    }
    
    return paraphrased;
  }

  private cleanupSummaryText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Remove extra spaces
      .replace(/,\s*,/g, ',') // Remove double commas
      .replace(/\.\s*\./g, '.') // Remove double periods
      .replace(/\s+([.!?])/g, '$1') // Remove spaces before punctuation
      .trim();
  }

  private compressSummary(summary: string, targetWords: number): string {
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const wordsPerSentence = targetWords / sentences.length;
    
    // Keep the most important sentences and compress others
    return sentences
      .slice(0, Math.max(3, Math.floor(targetWords / 15))) // Keep 3-5 sentences
      .join('. ')
      .trim() + '.';
  }

  private expandSummary(summary: string, analysis: any, targetWords: number): string {
    // Add more details if summary is too short
    if (analysis.keyConcepts.length > 0) {
      summary += ` Key concepts covered include ${analysis.keyConcepts.slice(0, 3).join(', ')}.`;
    }
    
    if (analysis.benefits.length > 0) {
      summary += ` This course helps ${analysis.benefits[0]}.`;
    }
    
    return summary;
  }

  private calculateCompressionRatio(original: string, summary: string): number {
    const originalWords = this.calculateWordCount(original);
    const summaryWords = this.calculateWordCount(summary);
    return originalWords > 0 ? originalWords / summaryWords : 1;
  }

  private expandSummaryWithContent(summary: string, extractedContent: any, targetWords: number): string {
    // Add more details if summary is too short
    if (extractedContent.keyPoints.length > 0) {
      summary += ` Key points discussed include ${extractedContent.keyPoints.slice(0, 2).join(', ')}.`;
    }
    
    if (extractedContent.mentionedTopics.length > 0) {
      summary += ` This content covers ${extractedContent.mentionedTopics.slice(0, 2).join(' and ')}.`;
    }
    
    return summary;
  }

  // Method to check which engines are available
  getAvailableEngines(): { webllm: boolean; transformers: boolean; mock: boolean } {
    return {
      webllm: true, // WebLLM available via offscreen document
      transformers: false, // Transformers not available
      mock: true // Always available as fallback
    };
  }

  // Method to get engine status
  getEngineStatus(): { webllm: string; transformers: string; mock: string } {
    return {
      webllm: 'Available (WebLLM via offscreen document)',
      transformers: 'Not Available',
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

🤖 WebLLM Integration:
   - Advanced AI summarization using WebLLM
   - Local processing in offscreen document
   - No external data transmission
   - Llama-3-2-3B model for high-quality summaries

⚠️ IMPORTANT: WebGPU Setup Required
   - For optimal performance, enable WebGPU in Chrome:
   1. Go to chrome://flags/#enable-unsafe-webgpu
   2. Set "Unsafe WebGPU" to "Enabled"
   3. Restart Chrome
   - Without WebGPU: Slower WebAssembly fallback (still works!)

✅ Current Features:
   - WebLLM-powered AI summarization
   - Smart sentence scoring for educational content
   - Intelligent content filtering and prioritization
   - Multiple summary modes (Simple overview, Study notes)
   - Streaming responses for real-time updates
   - Automatic WebGPU detection and fallback

📚 This extension provides high-quality AI-powered transcript summarization while maintaining privacy through local processing.
    `.trim();
  }

  /**
   * Generate enhanced summary with fully dynamic subject detection
   */
  async generateFullyDynamicSummary(
    transcript: string, 
    videoTitle: string = 'Untitled Video',
    options: SummarizationOptions = {}
  ): Promise<SummarizationResult> {
    try {
      console.log('🚀 Starting fully dynamic summarization with subject detection...');
      
      // Step 1: Generate base summary using existing pipeline
      const baseResult = await this.summarizeTranscript(transcript, options);
      
      if (!baseResult.success || !baseResult.summary) {
        return {
          success: false,
          error: 'Failed to generate base summary',
          engine: 'dynamic-enhanced'
        };
      }

      // Step 2: Detect subjects using fully dynamic approach
      console.log('🔍 Detecting subjects dynamically...');
      const subjectInfo = await FullyDynamicDetector.detectSubjects(baseResult.summary);
      
      // Step 3: Create enhanced summary with dynamic subject context
      const enhancedSummary = this.createDynamicSubjectAwareSummary(
        baseResult.summary, 
        subjectInfo, 
        videoTitle
      );

      console.log('✅ Fully dynamic summarization completed successfully');
      
      return {
        success: true,
        summary: enhancedSummary,
        engine: 'dynamic-enhanced',
        originalWordCount: baseResult.originalWordCount,
        summaryWordCount: enhancedSummary.split(/\s+/).length,
        targetLength: baseResult.targetLength,
        compressionRatio: baseResult.compressionRatio,
        validation: baseResult.validation,
        ragContext: baseResult.ragContext,
        confidence: baseResult.confidence,
        // Dynamic subject detection results
        subjects: subjectInfo.subjects,
        primarySubject: subjectInfo.primarySubject
      };
      
    } catch (error) {
      console.error('❌ Fully dynamic summarization failed:', error);
      return {
        success: false,
        error: `Dynamic summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        engine: 'dynamic-enhanced'
      };
    }
  }

  /**
   * Create subject-aware summary with dynamic context
   */
  private createDynamicSubjectAwareSummary(
    baseSummary: string, 
    subjectInfo: {
      subjects: Array<{name: string, confidence: number, keywords: string[]}>,
      primarySubject: string
    }, 
    videoTitle: string
  ): string {
    const { primarySubject, subjects } = subjectInfo;
    
    // Create dynamic header based on AI-detected subject
    const header = `# ${videoTitle}\n\n**Subject Area:** ${primarySubject}\n\n`;
    
    // Add subject-specific context if confidence is high
    if (subjects[0]?.confidence > 0.6) {
      const context = `**Key Topics:** ${subjects[0].keywords.join(', ')}\n\n`;
      return header + context + baseSummary;
    }
    
    return header + baseSummary;
  }
}

// Export singleton instance
export const aiSummarizationService = new AISummarizationService();
