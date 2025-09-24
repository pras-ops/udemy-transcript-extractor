// src/lib/fully-dynamic-detector.ts
import { pipeline } from '@xenova/transformers';
import nlp from 'compromise';

export class FullyDynamicDetector {
  private static embeddingPipeline: any = null;
  private static textGenerationPipeline: any = null;
  
  static async initialize() {
    if (!this.embeddingPipeline) {
      this.embeddingPipeline = await pipeline(
        'feature-extraction', 
        'Xenova/all-MiniLM-L6-v2'
      );
    }
    
    // Skip text generation model for now - use fallback approach
    // This reduces loading time significantly
  }
  
  /**
   * Main method: Fully dynamic subject detection
   */
  static async detectSubjects(summary: string): Promise<{
    subjects: Array<{name: string, confidence: number, keywords: string[]}>,
    primarySubject: string
  }> {
    await this.initialize();
    
    // Step 1: Create semantic chunks (reduced size for faster processing)
    const chunks = this.createSemanticChunks(summary, 150);
    
    // Step 2: Generate embeddings
    const embeddings = await this.generateEmbeddings(chunks);
    
    // Step 3: Calculate dynamic threshold
    const dynamicThreshold = this.calculateDynamicThreshold(embeddings);
    
    // Step 4: Cluster with dynamic threshold
    const clusters = this.clusterBySimilarity(embeddings, chunks, dynamicThreshold);
    
    // Step 5: Extract subjects with fully dynamic naming
    const subjects = await this.extractSubjectsFullyDynamic(clusters);
    
    return {
      subjects,
      primarySubject: subjects[0]?.name || "General Education"
    };
  }
  
  /**
   * DYNAMIC: Calculate threshold based on embedding similarity
   */
  private static calculateDynamicThreshold(embeddings: number[][]): number {
    if (embeddings.length <= 1) return 0.7;
    
    let totalSimilarity = 0;
    let comparisons = 0;
    
    // Calculate average pairwise similarity
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        totalSimilarity += this.cosineSimilarity(embeddings[i], embeddings[j]);
        comparisons++;
      }
    }
    
    const avgSimilarity = totalSimilarity / comparisons;
    
    // Dynamic threshold: slightly above average similarity
    return Math.min(0.9, Math.max(0.5, avgSimilarity * 1.1));
  }
  
  /**
   * DYNAMIC: Extract keywords using POS tagging (no hardcoded lists)
   */
  private static extractKeywordsDynamic(text: string): string[] {
    try {
      // Use compromise.js for automatic POS tagging
      const doc = nlp(text);
      
      // Extract only content words (nouns, verbs, adjectives)
      const nouns = doc.nouns().out('array');
      const verbs = doc.verbs().out('array');
      const adjectives = doc.adjectives().out('array');
      
      // Combine and filter
      const contentWords = [...nouns, ...verbs, ...adjectives]
        .map(word => word.toLowerCase().replace(/[^\w]/g, ''))
        .filter(word => word.length > 3); // Filter short words
      
      // Count frequency
      const wordCount: { [key: string]: number } = {};
      contentWords.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
      
      // Return top keywords by frequency
      return Object.entries(wordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word);
        
    } catch (error) {
      console.log('POS tagging failed, using fallback:', error);
      // Fallback to simple word frequency
      return this.extractKeywordsFallback(text);
    }
  }
  
  /**
   * Fallback keyword extraction
   */
  private static extractKeywordsFallback(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }
  
  /**
   * OPTIMIZED: Generate subject names using smart keyword analysis
   */
  private static async generateDynamicSubjectName(clusterText: string): Promise<string> {
    try {
      // Use smart keyword analysis instead of heavy AI model
      const keywords = this.extractKeywordsDynamic(clusterText);
      
      // Create intelligent subject names from keywords
      const subjectName = this.createIntelligentSubjectName(keywords, clusterText);
      
      return subjectName || this.generateFallbackSubjectName(clusterText);
      
    } catch (error) {
      console.log('Dynamic naming failed, using fallback:', error);
      return this.generateFallbackSubjectName(clusterText);
    }
  }
  
  /**
   * Create intelligent subject names from keywords
   */
  private static createIntelligentSubjectName(keywords: string[], context: string): string {
    // Smart subject name generation based on keyword patterns
    const patterns = {
      'Machine Learning': ['machine', 'learning', 'ml', 'model', 'training', 'algorithm', 'neural', 'deep'],
      'Data Science': ['data', 'science', 'analysis', 'dataset', 'statistics', 'analytics', 'visualization'],
      'Programming': ['programming', 'code', 'coding', 'development', 'software', 'application', 'function'],
      'Web Development': ['web', 'html', 'css', 'javascript', 'react', 'angular', 'vue', 'frontend', 'backend'],
      'Mathematics': ['math', 'mathematics', 'calculus', 'algebra', 'geometry', 'statistics', 'equation'],
      'Business': ['business', 'marketing', 'finance', 'management', 'strategy', 'economics', 'revenue'],
      'Science': ['science', 'physics', 'chemistry', 'biology', 'research', 'experiment', 'theory'],
      'Art': ['art', 'design', 'creative', 'painting', 'drawing', 'aesthetic', 'visual'],
      'History': ['history', 'historical', 'ancient', 'century', 'war', 'revolution', 'culture']
    };
    
    // Find best matching pattern
    for (const [subject, terms] of Object.entries(patterns)) {
      const matches = keywords.filter(kw => 
        terms.some(term => kw.toLowerCase().includes(term) || term.includes(kw.toLowerCase()))
      ).length;
      
      if (matches >= 2) {
        return subject;
      }
    }
    
    // Fallback: use top keywords
    return keywords.slice(0, 2)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * Fallback subject name generation
   */
  private static generateFallbackSubjectName(text: string): string {
    const keywords = this.extractKeywordsDynamic(text);
    const topKeywords = keywords.slice(0, 2);
    
    return topKeywords
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * FULLY DYNAMIC: Extract subjects with AI-generated names
   */
  private static async extractSubjectsFullyDynamic(clusters: Array<{
    chunks: string[],
    embeddings: number[][],
    centroid: number[],
    intraClusterSimilarity: number
  }>): Promise<Array<{name: string, confidence: number, keywords: string[]}>> {
    
    const subjects = await Promise.all(
      clusters.map(async (cluster, index) => {
        // Combine all chunks in cluster
        const combinedText = cluster.chunks.join(' ');
        
        // DYNAMIC: Extract keywords using POS tagging
        const keywords = this.extractKeywordsDynamic(combinedText);
        
        // DYNAMIC: Generate subject name using AI
        const subjectName = await this.generateDynamicSubjectName(combinedText);
        
        // Calculate confidence
        const confidence = this.calculateDynamicConfidence(cluster, keywords);
        
        return {
          name: subjectName,
          confidence,
          keywords: keywords.slice(0, 5)
        };
      })
    );
    
    // Sort by confidence and return top subjects
    return subjects.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * DYNAMIC: Calculate confidence based on cluster coherence
   */
  private static calculateDynamicConfidence(cluster: any, keywords: string[]): number {
    const chunkCount = cluster.chunks.length;
    const keywordCount = keywords.length;
    const intraSimilarity = cluster.intraClusterSimilarity;
    
    // Base score
    const baseScore = 0.2;
    
    // Size score (more chunks = higher confidence)
    const sizeScore = Math.min(0.3, chunkCount * 0.05);
    
    // Keyword score (more keywords = higher confidence)
    const keywordScore = Math.min(0.2, keywordCount * 0.03);
    
    // Intra-cluster similarity score
    const similarityScore = Math.min(0.3, intraSimilarity * 0.3);
    
    return baseScore + sizeScore + keywordScore + similarityScore;
  }
  
  /**
   * Create semantic chunks
   */
  private static createSemanticChunks(text: string, targetWordCount: number): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = '';
    let currentWordCount = 0;
    
    for (const sentence of sentences) {
      const sentenceWords = sentence.trim().split(/\s+/).length;
      
      if (currentWordCount + sentenceWords > targetWordCount && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
        currentWordCount = sentenceWords;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        currentWordCount += sentenceWords;
      }
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.slice(0, 5); // Limit chunks for faster processing
  }
  
  /**
   * Generate embeddings
   */
  private static async generateEmbeddings(chunks: string[]): Promise<number[][]> {
    const embeddings = await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const result = await this.embeddingPipeline(chunk, { 
            pooling: 'mean', 
            normalize: true 
          });
          
          if (result && result.data) {
            return Array.from(result.data);
          } else if (Array.isArray(result)) {
            return result;
          } else {
            throw new Error('Unexpected embedding format');
          }
        } catch (error) {
          console.error('Embedding generation failed:', error);
          return new Array(384).fill(0);
        }
      })
    );
    
    return embeddings;
  }
  
  /**
   * Cluster by similarity with dynamic threshold
   */
  private static clusterBySimilarity(embeddings: number[][], chunks: string[], threshold: number): Array<{
    chunks: string[],
    embeddings: number[][],
    centroid: number[],
    intraClusterSimilarity: number
  }> {
    const clusters: Array<{
      chunks: string[],
      embeddings: number[][],
      centroid: number[],
      intraClusterSimilarity: number
    }> = [];
    
    for (let i = 0; i < embeddings.length; i++) {
      let assigned = false;
      
      for (const cluster of clusters) {
        const similarity = this.cosineSimilarity(embeddings[i], cluster.centroid);
        if (similarity > threshold) {
          cluster.chunks.push(chunks[i]);
          cluster.embeddings.push(embeddings[i]);
          cluster.centroid = this.calculateCentroid(cluster.embeddings);
          cluster.intraClusterSimilarity = this.calculateIntraClusterSimilarity(cluster.embeddings);
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        clusters.push({
          chunks: [chunks[i]],
          embeddings: [embeddings[i]],
          centroid: embeddings[i],
          intraClusterSimilarity: 1.0
        });
      }
    }
    
    return clusters.filter(cluster => cluster.chunks.length >= 2);
  }
  
  /**
   * Calculate cosine similarity
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }
  
  /**
   * Calculate centroid
   */
  private static calculateCentroid(embeddings: number[][]): number[] {
    const dimensions = embeddings[0].length;
    const centroid = new Array(dimensions).fill(0);
    
    embeddings.forEach(embedding => {
      embedding.forEach((val, i) => {
        centroid[i] += val;
      });
    });
    
    return centroid.map(val => val / embeddings.length);
  }
  
  /**
   * Calculate intra-cluster similarity
   */
  private static calculateIntraClusterSimilarity(embeddings: number[][]): number {
    if (embeddings.length <= 1) return 1.0;
    
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        totalSimilarity += this.cosineSimilarity(embeddings[i], embeddings[j]);
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }
}
