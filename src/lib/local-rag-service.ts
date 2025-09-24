// Local RAG Service for Enhanced AI Accuracy
// Implements retrieval-augmented generation with local vector embeddings

export interface RAGChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    startIndex: number;
    endIndex: number;
    wordCount: number;
    hasEducationalContent: boolean;
    importanceScore: number;
  };
}

export interface RAGQueryResult {
  chunks: RAGChunk[];
  totalSimilarity: number;
  averageSimilarity: number;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  suggestions: string[];
}

class LocalRAGService {
  private chunks: RAGChunk[] = [];
  private embeddings: Map<string, number[]> = new Map();
  private isInitialized = false;
  private embeddingModel: any = null;

  constructor() {
    console.log('🧠 Local RAG Service: Initializing...');
  }

  /**
   * Initialize the embedding model for vector computations
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🧠 RAG: Loading embedding model...');
      
      // Try to use Transformers.js for embeddings
      if (typeof window !== 'undefined' && (window as any).pipeline) {
        this.embeddingModel = await (window as any).pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log('✅ RAG: Transformers.js embedding model loaded');
      } else {
        console.log('⚠️ RAG: No embedding model available, using fallback');
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ RAG: Failed to initialize embedding model:', error);
      this.isInitialized = true; // Continue with fallback methods
    }
  }

  /**
   * Build local knowledge base from transcript
   */
  async buildKnowledgeBase(transcript: string): Promise<void> {
    await this.initialize();
    
    console.log('🧠 RAG: Building knowledge base from transcript...');
    this.chunks = [];
    this.embeddings.clear();

    // Create semantic chunks
    const rawChunks = this.createSemanticChunks(transcript);
    
    // Process each chunk
    for (let i = 0; i < rawChunks.length; i++) {
      const chunk = rawChunks[i];
      
      // Compute embedding
      const embedding = await this.computeEmbedding(chunk);
      
      // Calculate metadata
      const metadata = this.calculateChunkMetadata(chunk, i);
      
      const ragChunk: RAGChunk = {
        id: `chunk_${i}`,
        content: chunk,
        embedding,
        metadata
      };
      
      this.chunks.push(ragChunk);
      this.embeddings.set(ragChunk.id, embedding);
    }
    
    console.log(`✅ RAG: Knowledge base built with ${this.chunks.length} chunks`);
  }

  /**
   * Create semantic chunks from transcript
   */
  private createSemanticChunks(transcript: string, targetChunkSize: number = 200): string[] {
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;
      
      // Check if adding this sentence would exceed target size
      const wordsInSentence = trimmedSentence.split(/\s+/).length;
      const wordsInChunk = currentChunk.split(/\s+/).length;
      
      if (wordsInChunk + wordsInSentence > targetChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      }
    }
    
    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Compute embedding for text using available model
   */
  private async computeEmbedding(text: string): Promise<number[]> {
    try {
      if (this.embeddingModel) {
        // Use Transformers.js model
        const result = await this.embeddingModel(text, { pooling: 'mean', normalize: true });
        return Array.from(result.data);
      }
    } catch (error) {
      console.log('⚠️ RAG: Embedding model failed, using fallback:', error);
    }
    
    // Fallback: Simple TF-IDF-like embedding
    return this.createFallbackEmbedding(text);
  }

  /**
   * Create fallback embedding using word frequency
   */
  private createFallbackEmbedding(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();
    
    // Count word frequencies
    words.forEach(word => {
      if (word.length > 2) { // Skip short words
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });
    
    // Create vector based on educational keywords
    const educationalKeywords = [
      'concept', 'principle', 'method', 'technique', 'example', 'important', 'key', 'main',
      'definition', 'demonstration', 'step', 'process', 'algorithm', 'formula', 'theory',
      'practice', 'application', 'analysis', 'synthesis', 'evaluation', 'understanding'
    ];
    
    const vector = new Array(educationalKeywords.length + 10).fill(0);
    
    // Map educational keywords
    educationalKeywords.forEach((keyword, index) => {
      if (wordFreq.has(keyword)) {
        vector[index] = wordFreq.get(keyword)!;
      }
    });
    
    // Add other features
    vector[educationalKeywords.length] = words.length; // Length
    vector[educationalKeywords.length + 1] = this.countNumbers(text); // Numbers
    vector[educationalKeywords.length + 2] = this.countQuestions(text); // Questions
    vector[educationalKeywords.length + 3] = this.countTechnicalTerms(text); // Technical terms
    vector[educationalKeywords.length + 4] = this.calculateComplexity(text); // Complexity
    
    return vector;
  }

  /**
   * Calculate chunk metadata
   */
  private calculateChunkMetadata(chunk: string, index: number): RAGChunk['metadata'] {
    const words = chunk.split(/\s+/);
    const hasEducationalContent = this.hasEducationalKeywords(chunk);
    const importanceScore = this.calculateImportanceScore(chunk);
    
    return {
      startIndex: index * 200, // Approximate
      endIndex: (index + 1) * 200,
      wordCount: words.length,
      hasEducationalContent,
      importanceScore
    };
  }

  /**
   * Check if chunk contains educational keywords
   */
  private hasEducationalKeywords(text: string): boolean {
    const educationalKeywords = [
      'concept', 'principle', 'method', 'technique', 'example', 'important', 'key',
      'definition', 'step', 'process', 'algorithm', 'learn', 'understand', 'explain'
    ];
    
    const lowerText = text.toLowerCase();
    return educationalKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Calculate importance score for chunk
   */
  private calculateImportanceScore(text: string): number {
    let score = 0;
    const lowerText = text.toLowerCase();
    
    // Educational keywords
    const educationalKeywords = {
      'concept': 4, 'principle': 4, 'definition': 3, 'important': 2, 'key': 2,
      'example': 3, 'method': 3, 'technique': 3, 'step': 2, 'process': 2
    };
    
    Object.entries(educationalKeywords).forEach(([keyword, weight]) => {
      if (lowerText.includes(keyword)) score += weight;
    });
    
    // Technical terms
    if (this.countTechnicalTerms(text) > 0) score += 2;
    
    // Questions (often indicate important concepts)
    if (this.countQuestions(text) > 0) score += 1;
    
    // Numbers (often indicate specific information)
    if (this.countNumbers(text) > 0) score += 1;
    
    return Math.min(score, 10); // Cap at 10
  }

  /**
   * Retrieve relevant context for query
   */
  async retrieveRelevantContext(query: string, topK: number = 5): Promise<RAGQueryResult> {
    await this.initialize();
    
    if (this.chunks.length === 0) {
      return { chunks: [], totalSimilarity: 0, averageSimilarity: 0 };
    }
    
    console.log(`🧠 RAG: Retrieving context for query: "${query}"`);
    
    // Compute query embedding
    const queryEmbedding = await this.computeEmbedding(query);
    
    // Calculate similarities
    const similarities = this.chunks.map(chunk => ({
      chunk,
      similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    // Sort by similarity and take top K
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topChunks = similarities.slice(0, topK);
    
    const totalSimilarity = topChunks.reduce((sum, item) => sum + item.similarity, 0);
    const averageSimilarity = totalSimilarity / topChunks.length;
    
    console.log(`✅ RAG: Retrieved ${topChunks.length} relevant chunks (avg similarity: ${averageSimilarity.toFixed(3)})`);
    
    return {
      chunks: topChunks.map(item => item.chunk),
      totalSimilarity,
      averageSimilarity
    };
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Validate AI output against original transcript
   */
  validateOutput(originalTranscript: string, generatedSummary: string): ValidationResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let confidence = 1.0;
    
    console.log('🔍 RAG: Validating AI output...');
    
    // 1. Fact-checking against transcript
    const summaryClaims = this.extractClaims(generatedSummary);
    const transcriptContent = originalTranscript.toLowerCase();
    
    summaryClaims.forEach(claim => {
      const claimLower = claim.toLowerCase();
      if (!transcriptContent.includes(claimLower)) {
        issues.push(`Claim not found in transcript: "${claim}"`);
        confidence -= 0.2;
      }
    });
    
    // 2. Repetition detection
    const sentences = generatedSummary.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));
    if (sentences.length !== uniqueSentences.size) {
      issues.push("Summary contains repetitive content");
      confidence -= 0.3;
      suggestions.push("Remove duplicate sentences and consolidate similar points");
    }
    
    // 3. Length validation
    const expectedLength = Math.floor(originalTranscript.length * 0.5);
    const actualLength = generatedSummary.length;
    const lengthRatio = actualLength / expectedLength;
    
    if (lengthRatio > 1.5) {
      issues.push("Summary is too long");
      confidence -= 0.1;
      suggestions.push("Reduce summary length to focus on key points");
    } else if (lengthRatio < 0.3) {
      issues.push("Summary is too short");
      confidence -= 0.1;
      suggestions.push("Add more details to provide comprehensive coverage");
    }
    
    // 4. Educational content validation
    const hasEducationalContent = this.hasEducationalKeywords(generatedSummary);
    if (!hasEducationalContent) {
      issues.push("Summary lacks educational focus");
      confidence -= 0.2;
      suggestions.push("Include key concepts, definitions, and examples");
    }
    
    // 5. Hallucination detection (check for external information)
    const externalIndicators = ['according to', 'research shows', 'studies indicate', 'experts say'];
    const hasExternalInfo = externalIndicators.some(indicator => 
      generatedSummary.toLowerCase().includes(indicator)
    );
    
    if (hasExternalInfo) {
      issues.push("Summary contains external information not in transcript");
      confidence -= 0.4;
      suggestions.push("Remove external references and stick to transcript content");
    }
    
    confidence = Math.max(0, confidence);
    
    const result: ValidationResult = {
      isValid: issues.length === 0,
      confidence,
      issues,
      suggestions
    };
    
    console.log(`🔍 RAG: Validation complete - Valid: ${result.isValid}, Confidence: ${confidence.toFixed(2)}`);
    
    return result;
  }

  /**
   * Extract claims from summary text
   */
  private extractClaims(text: string): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.map(s => s.trim());
  }

  /**
   * Helper methods for fallback embedding
   */
  private countNumbers(text: string): number {
    return (text.match(/\d+/g) || []).length;
  }

  private countQuestions(text: string): number {
    return (text.match(/\?/g) || []).length;
  }

  private countTechnicalTerms(text: string): number {
    const technicalTerms = ['algorithm', 'function', 'class', 'variable', 'method', 'program', 'code', 'data', 'structure'];
    const lowerText = text.toLowerCase();
    return technicalTerms.filter(term => lowerText.includes(term)).length;
  }

  private calculateComplexity(text: string): number {
    const words = text.split(/\s+/);
    const longWords = words.filter(word => word.length > 7).length;
    return longWords / words.length;
  }

  /**
   * Get knowledge base statistics
   */
  getStats(): { chunkCount: number; averageImportance: number; hasEmbeddings: boolean } {
    const averageImportance = this.chunks.length > 0 
      ? this.chunks.reduce((sum, chunk) => sum + chunk.metadata.importanceScore, 0) / this.chunks.length
      : 0;
    
    return {
      chunkCount: this.chunks.length,
      averageImportance,
      hasEmbeddings: this.embeddings.size > 0
    };
  }

  /**
   * Clear knowledge base
   */
  clear(): void {
    this.chunks = [];
    this.embeddings.clear();
    console.log('🧠 RAG: Knowledge base cleared');
  }
}

// Export singleton instance
export const localRAGService = new LocalRAGService();
