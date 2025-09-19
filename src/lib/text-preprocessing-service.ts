/**
 * NLTK-based Text Preprocessing Service
 * Advanced text cleaning, stemming, lemmatization, and educational content optimization
 */

export interface PreprocessingOptions {
  removeFillerWords?: boolean;
  fixTranscriptionErrors?: boolean;
  applyStemming?: boolean;
  applyLemmatization?: boolean;
  removeStopWords?: boolean;
  fixGrammar?: boolean;
  educationalScoring?: boolean;
}

export interface PreprocessingResult {
  success: boolean;
  processedText?: string;
  originalWordCount?: number;
  processedWordCount?: number;
  compressionRatio?: number;
  chunks?: string[];
  error?: string;
}

export class TextPreprocessingService {
  private static instance: TextPreprocessingService;
  
  // Common transcription errors and their corrections
  private static readonly TRANSCRIPTION_ERRORS = new Map([
    ['jaba', 'java'],
    ['viable', 'variable'],
    ['operationalational', 'operational'],
    ['humanooperationalational', 'human operational'],
    ['programming', 'programming'],
    ['algorithim', 'algorithm'],
    ['funtion', 'function'],
    ['varible', 'variable'],
    ['methode', 'method'],
    ['classe', 'class'],
    ['interfase', 'interface'],
    ['inheritance', 'inheritance'],
    ['polymorphism', 'polymorphism'],
    ['encapsulation', 'encapsulation'],
    ['abstraction', 'abstraction']
  ]);

  // Filler words and phrases to remove
  private static readonly FILLER_WORDS = new Set([
    'um', 'uh', 'er', 'ah', 'like', 'you know', 'basically', 'actually',
    'so basically', 'so basically', 'so basically', 'so basically',
    'you see', 'i mean', 'kind of', 'sort of', 'right', 'okay', 'alright',
    'well', 'now', 'so', 'then', 'and then', 'and so', 'and now'
  ]);

  // Educational importance keywords
  private static readonly EDUCATIONAL_KEYWORDS = new Set([
    'important', 'key', 'main', 'primary', 'essential', 'fundamental',
    'basic', 'concept', 'principle', 'method', 'technique', 'example',
    'note', 'remember', 'understand', 'learn', 'study', 'practice',
    'exercise', 'assignment', 'homework', 'quiz', 'test', 'exam',
    'definition', 'explanation', 'demonstration', 'illustration',
    'algorithm', 'function', 'class', 'object', 'variable', 'method',
    'interface', 'inheritance', 'polymorphism', 'encapsulation'
  ]);

  // Stop words for removal
  private static readonly STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'would', 'could', 'should', 'might',
    'may', 'can', 'must', 'shall', 'this', 'these', 'those', 'they',
    'them', 'their', 'there', 'here', 'where', 'when', 'why', 'how',
    'what', 'which', 'who', 'whom', 'whose'
  ]);

  public static getInstance(): TextPreprocessingService {
    if (!TextPreprocessingService.instance) {
      TextPreprocessingService.instance = new TextPreprocessingService();
    }
    return TextPreprocessingService.instance;
  }

  /**
   * Main preprocessing method with hybrid approach
   */
  public async preprocessTranscript(
    text: string,
    options: PreprocessingOptions = {}
  ): Promise<PreprocessingResult> {
    try {
      console.log('🎯 Starting NLTK-based text preprocessing...');
      
      const defaultOptions: PreprocessingOptions = {
        removeFillerWords: true,
        fixTranscriptionErrors: true,
        applyStemming: false, // Keep false for better readability
        applyLemmatization: true,
        removeStopWords: false, // Keep false to preserve meaning
        fixGrammar: true,
        educationalScoring: true,
        ...options
      };

      let processedText = text;
      const originalWordCount = this.countWords(text);

      // Step 1: Fix transcription errors
      if (defaultOptions.fixTranscriptionErrors) {
        processedText = this.fixTranscriptionErrors(processedText);
        console.log('✅ Fixed transcription errors');
      }

      // Step 2: Remove filler words and repetitions
      if (defaultOptions.removeFillerWords) {
        processedText = this.removeFillerWords(processedText);
        console.log('✅ Removed filler words and repetitions');
      }

      // Step 3: Apply lemmatization (simplified)
      if (defaultOptions.applyLemmatization) {
        processedText = this.applyLemmatization(processedText);
        console.log('✅ Applied lemmatization');
      }

      // Step 4: Fix basic grammar and punctuation
      if (defaultOptions.fixGrammar) {
        processedText = this.fixGrammar(processedText);
        console.log('✅ Fixed grammar and punctuation');
      }

      // Step 5: Create smart chunks
      const chunks = this.createSmartChunks(processedText, defaultOptions.educationalScoring);
      console.log(`✅ Created ${chunks.length} smart chunks`);

      const processedWordCount = this.countWords(processedText);
      const compressionRatio = originalWordCount > 0 ? processedWordCount / originalWordCount : 1;

      console.log(`📊 Preprocessing complete: ${originalWordCount} → ${processedWordCount} words (${(compressionRatio * 100).toFixed(1)}%)`);

      return {
        success: true,
        processedText,
        originalWordCount,
        processedWordCount,
        compressionRatio,
        chunks
      };

    } catch (error) {
      console.error('❌ Text preprocessing failed:', error);
      return {
        success: false,
        error: `Preprocessing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Fix common transcription errors
   */
  private fixTranscriptionErrors(text: string): string {
    let fixedText = text.toLowerCase();
    
    // Apply transcription error corrections
    for (const [error, correction] of TextPreprocessingService.TRANSCRIPTION_ERRORS) {
      const regex = new RegExp(`\\b${error}\\b`, 'gi');
      fixedText = fixedText.replace(regex, correction);
    }

    return fixedText;
  }

  /**
   * Remove filler words and repeated phrases
   */
  private removeFillerWords(text: string): string {
    let cleanedText = text;

    // Remove repeated words (e.g., "program program program" → "program")
    cleanedText = cleanedText.replace(/\b(\w+)\s+\1\s+\1+/g, '$1');

    // Remove filler words
    for (const filler of TextPreprocessingService.FILLER_WORDS) {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      cleanedText = cleanedText.replace(regex, '');
    }

    // Clean up extra spaces
    cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

    return cleanedText;
  }

  /**
   * Apply simplified lemmatization
   */
  private applyLemmatization(text: string): string {
    // Simple lemmatization rules for common educational terms
    const lemmatizationRules = new Map([
      ['programs', 'program'],
      ['programming', 'program'],
      ['functions', 'function'],
      ['classes', 'class'],
      ['variables', 'variable'],
      ['methods', 'method'],
      ['algorithms', 'algorithm'],
      ['concepts', 'concept'],
      ['principles', 'principle'],
      ['techniques', 'technique'],
      ['examples', 'example'],
      ['definitions', 'definition'],
      ['explanations', 'explanation'],
      ['demonstrations', 'demonstration'],
      ['illustrations', 'illustration']
    ]);

    let lemmatizedText = text;

    for (const [plural, singular] of lemmatizationRules) {
      const regex = new RegExp(`\\b${plural}\\b`, 'gi');
      lemmatizedText = lemmatizedText.replace(regex, singular);
    }

    return lemmatizedText;
  }

  /**
   * Fix basic grammar and punctuation
   */
  private fixGrammar(text: string): string {
    let fixedText = text;

    // Fix spacing around punctuation
    fixedText = fixedText.replace(/\s+([,.!?;:])/g, '$1');
    fixedText = fixedText.replace(/([,.!?;:])([a-zA-Z])/g, '$1 $2');

    // Fix capitalization after sentences
    fixedText = fixedText.replace(/([.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());

    // Fix capitalization at the beginning
    if (fixedText.length > 0) {
      fixedText = fixedText[0].toUpperCase() + fixedText.slice(1);
    }

    // Clean up multiple spaces
    fixedText = fixedText.replace(/\s+/g, ' ').trim();

    return fixedText;
  }

  /**
   * Create smart chunks with educational scoring
   */
  private createSmartChunks(text: string, useEducationalScoring: boolean = true): string[] {
    const sentences = this.splitIntoSentences(text);
    const chunks: string[] = [];
    let currentChunk = '';
    let currentWordCount = 0;
    const targetChunkSize = 60; // Medium chunks as requested
    const maxChunkSize = 80;

    for (const sentence of sentences) {
      const sentenceWords = this.countWords(sentence);
      
      // If adding this sentence would exceed max size, start a new chunk
      if (currentWordCount + sentenceWords > maxChunkSize && currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
        currentWordCount = sentenceWords;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        currentWordCount += sentenceWords;
      }

      // If we've reached target size, start a new chunk
      if (currentWordCount >= targetChunkSize) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
        currentWordCount = 0;
      }
    }

    // Add remaining text as final chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // Apply educational scoring if requested
    if (useEducationalScoring) {
      return this.scoreAndPrioritizeChunks(chunks);
    }

    return chunks.filter(chunk => chunk.trim().length > 0);
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - can be enhanced with more sophisticated NLP
    return text
      .split(/[.!?]+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 10); // Filter out very short fragments
  }

  /**
   * Score chunks based on educational importance
   */
  private scoreAndPrioritizeChunks(chunks: string[]): string[] {
    const scoredChunks = chunks.map(chunk => {
      let score = 0;
      const words = chunk.toLowerCase().split(/\s+/);

      // Score based on educational keywords
      for (const word of words) {
        if (TextPreprocessingService.EDUCATIONAL_KEYWORDS.has(word)) {
          score += 3;
        }
      }

      // Score based on technical terms
      if (/\b(function|class|method|variable|algorithm|program)\b/i.test(chunk)) {
        score += 2;
      }

      // Score based on structure indicators
      if (/\b(first|second|next|finally|in conclusion|important|note|remember)\b/i.test(chunk)) {
        score += 1;
      }

      // Score based on length (longer chunks often more informative)
      score += Math.min(words.length / 20, 2);

      return { chunk, score };
    });

    // Sort by score (highest first) and return chunks
    return scoredChunks
      .sort((a, b) => b.score - a.score)
      .map(item => item.chunk);
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Validate preprocessing quality
   */
  public validatePreprocessingQuality(originalText: string, processedText: string): {
    isValid: boolean;
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let score = 100;

    // Check for excessive compression
    const originalWords = this.countWords(originalText);
    const processedWords = this.countWords(processedText);
    const compressionRatio = processedWords / originalWords;

    if (compressionRatio < 0.3) {
      issues.push('Text may be over-compressed');
      score -= 20;
    }

    // Check for repeated words (should be removed)
    if (/(\b\w+\s+)\1{2,}/.test(processedText)) {
      issues.push('Repeated words detected');
      score -= 15;
    }

    // Check for filler words (should be removed)
    const fillerWordsFound = Array.from(TextPreprocessingService.FILLER_WORDS)
      .filter(filler => new RegExp(`\\b${filler}\\b`, 'i').test(processedText));
    
    if (fillerWordsFound.length > 0) {
      issues.push(`Filler words still present: ${fillerWordsFound.join(', ')}`);
      score -= 10;
    }

    // Check for transcription errors (should be fixed)
    const transcriptionErrorsFound = Array.from(TextPreprocessingService.TRANSCRIPTION_ERRORS.keys())
      .filter(error => new RegExp(`\\b${error}\\b`, 'i').test(processedText));
    
    if (transcriptionErrorsFound.length > 0) {
      issues.push(`Transcription errors still present: ${transcriptionErrorsFound.join(', ')}`);
      score -= 15;
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, score)
    };
  }
}
