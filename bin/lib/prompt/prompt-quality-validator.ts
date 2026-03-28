/**
 * Prompt Quality Validator — Compression quality validation
 *
 * COMP-06: Compression quality validation
 *
 * Features:
 * - Entity preservation checking
 * - Keyword preservation checking
 * - Semantic similarity scoring
 * - Structure preservation validation
 *
 * Target Metrics:
 * - Quality score accuracy: 90%+
 * - Validation speed: <20ms
 * - False positive rate: <5%
 */

/**
 * Quality validation result
 */
export interface QualityValidationResult {
  /** Overall quality score (0-1) */
  overallScore: number;
  /** Entity preservation score (0-1) */
  entityScore: number;
  /** Keyword preservation score (0-1) */
  keywordScore: number;
  /** Semantic similarity score (0-1) */
  semanticScore: number;
  /** Structure preservation score (0-1) */
  structureScore: number;
  /** Passed validation threshold */
  passed: boolean;
  /** Validation warnings */
  warnings: string[];
  /** Missing entities */
  missingEntities: string[];
  /** Missing keywords */
  missingKeywords: string[];
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Minimum quality threshold (default: 0.7) */
  minScore?: number;
  /** Entity weight (default: 0.3) */
  entityWeight?: number;
  /** Keyword weight (default: 0.3) */
  keywordWeight?: number;
  /** Semantic weight (default: 0.2) */
  semanticWeight?: number;
  /** Structure weight (default: 0.2) */
  structureWeight?: number;
  /** Required entities (must be preserved) */
  requiredEntities?: string[];
  /** Required keywords (must be preserved) */
  requiredKeywords?: string[];
}

/**
 * Prompt Quality Validator class
 *
 * Implements comprehensive quality validation:
 * - Entity preservation (function names, classes, etc.)
 * - Keyword preservation (task keywords)
 * - Semantic similarity (TF-IDF cosine similarity)
 * - Structure preservation (sections, formatting)
 */
export class PromptQualityValidator {
  private readonly stats: {
    validationsPerformed: number;
    averageScore: number;
    passRate: number;
    scores: number[];
  };

  constructor() {
    this.stats = {
      validationsPerformed: 0,
      averageScore: 0,
      passRate: 0,
      scores: []
    };
  }

  /**
   * Validate compression quality
   * @param original - Original prompt
   * @param compressed - Compressed prompt
   * @param options - Validation options
   * @returns Quality validation result
   */
  validate(original: string, compressed: string, options: ValidationOptions = {}): QualityValidationResult {
    const warnings: string[] = [];
    const missingEntities: string[] = [];
    const missingKeywords: string[] = [];

    // Extract entities and keywords
    const originalEntities = this.extractEntities(original);
    const compressedEntities = this.extractEntities(compressed);
    const originalKeywords = this.extractKeywords(original);
    const compressedKeywords = this.extractKeywords(compressed);

    // Calculate entity preservation
    const preservedEntities = originalEntities.filter(e => 
      compressedEntities.includes(e)
    );
    const missingEntityList = originalEntities.filter(e => 
      !compressedEntities.includes(e)
    );
    
    // Check required entities
    if (options.requiredEntities) {
      for (const required of options.requiredEntities) {
        if (!compressedEntities.includes(required)) {
          missingEntities.push(required);
          warnings.push(`Required entity missing: ${required}`);
        }
      }
    }
    
    const entityScore = originalEntities.length > 0
      ? preservedEntities.length / originalEntities.length
      : 1;

    // Calculate keyword preservation
    const preservedKeywords = originalKeywords.filter(k =>
      compressedKeywords.includes(k)
    );
    const missingKeywordList = originalKeywords.filter(k =>
      !compressedKeywords.includes(k)
    );
    
    // Check required keywords
    if (options.requiredKeywords) {
      for (const required of options.requiredKeywords) {
        if (!compressedKeywords.includes(required)) {
          missingKeywords.push(required);
          warnings.push(`Required keyword missing: ${required}`);
        }
      }
    }
    
    const keywordScore = originalKeywords.length > 0
      ? preservedKeywords.length / originalKeywords.length
      : 1;

    // Calculate semantic similarity
    const semanticScore = this.semanticSimilarity(original, compressed);

    // Calculate structure preservation
    const structureScore = this.structurePreservation(original, compressed);

    // Calculate weighted overall score
    const weights = {
      entity: options.entityWeight || 0.3,
      keyword: options.keywordWeight || 0.3,
      semantic: options.semanticWeight || 0.2,
      structure: options.structureWeight || 0.2
    };

    const overallScore = (
      entityScore * weights.entity +
      keywordScore * weights.keyword +
      semanticScore * weights.semantic +
      structureScore * weights.structure
    );

    // Determine if passed
    const minScore = options.minScore || 0.7;
    const passed = overallScore >= minScore && missingEntities.length === 0;

    // Add warnings for low scores
    if (entityScore < 0.8) {
      warnings.push(`Low entity preservation: ${(entityScore * 100).toFixed(1)}%`);
    }
    if (keywordScore < 0.8) {
      warnings.push(`Low keyword preservation: ${(keywordScore * 100).toFixed(1)}%`);
    }
    if (semanticScore < 0.7) {
      warnings.push(`Low semantic similarity: ${(semanticScore * 100).toFixed(1)}%`);
    }
    if (structureScore < 0.7) {
      warnings.push(`Low structure preservation: ${(structureScore * 100).toFixed(1)}%`);
    }

    // Update stats
    this.stats.validationsPerformed++;
    this.stats.scores.push(overallScore);
    this.stats.averageScore = this.stats.scores.reduce((a, b) => a + b, 0) / this.stats.scores.length;
    this.stats.passRate = (this.stats.passRate * (this.stats.validationsPerformed - 1) + (passed ? 1 : 0)) / this.stats.validationsPerformed;

    return {
      overallScore,
      entityScore,
      keywordScore,
      semanticScore,
      structureScore,
      passed,
      warnings,
      missingEntities: [...missingEntityList, ...missingEntities],
      missingKeywords: [...missingKeywordList, ...missingKeywords]
    };
  }

  /**
   * Extract entities from text (function names, class names, etc.)
   * @param text - Text to extract from
   * @returns Array of entities
   */
  private extractEntities(text: string): string[] {
    const entities: string[] = [];

    // Function names
    const funcMatches = text.match(/function\s+(\w+)/g) || [];
    entities.push(...funcMatches.map(m => m.replace('function ', '')));

    // Class names
    const classMatches = text.match(/class\s+(\w+)/g) || [];
    entities.push(...classMatches.map(m => m.replace('class ', '')));

    // Interface names
    const interfaceMatches = text.match(/interface\s+(\w+)/g) || [];
    entities.push(...interfaceMatches.map(m => m.replace('interface ', '')));

    // Type names
    const typeMatches = text.match(/type\s+(\w+)/g) || [];
    entities.push(...typeMatches.map(m => m.replace('type ', '')));

    // Method names (object methods)
    const methodMatches = text.match(/(\w+)\s*[:=]\s*(?:async\s*)?\([^)]*\)/g) || [];
    entities.push(...methodMatches.map(m => {
      const match = m.match(/(\w+)\s*[:=]/);
      return match ? match[1] : '';
    }).filter(Boolean));

    // Variable names (const/let/var declarations)
    const varMatches = text.match(/(?:const|let|var)\s+(\w+)/g) || [];
    entities.push(...varMatches.map(m => {
      const match = m.match(/(?:const|let|var)\s+(\w+)/);
      return match ? match[1] : '';
    }));

    // Return unique entities (case-insensitive)
    const seen = new Set<string>();
    return entities.filter(e => {
      const lower = e.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  }

  /**
   * Extract keywords from text
   * @param text - Text to extract from
   * @returns Array of keywords
   */
  private extractKeywords(text: string): string[] {
    // Extract words longer than 4 characters (significant keywords)
    const words = text.toLowerCase().match(/\b[a-z]{5,}\b/g) || [];
    
    // Remove common stop words
    const stopWords = new Set([
      'about', 'after', 'again', 'below', 'could', 'every', 'first', 'from',
      'further', 'hereby', 'herein', 'hereon', 'however', 'into', 'itself',
      'might', 'myself', 'oneself', 'otherwise', 'should', 'thereby', 'therein',
      'thereon', 'therefore', 'through', 'throughout', 'whereby', 'wherein',
      'whereon', 'whether', 'without', 'would', 'yourself', 'being', 'have',
      'having', 'been', 'were', 'will', 'with', 'this', 'that', 'these', 'those',
      'which', 'what', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
      'both', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'then', 'once'
    ]);

    return words.filter(w => !stopWords.has(w));
  }

  /**
   * Calculate semantic similarity using TF-IDF cosine similarity
   * @param text1 - First text
   * @param text2 - Second text
   * @returns Similarity score (0-1)
   */
  private semanticSimilarity(text1: string, text2: string): number {
    const vector1 = this.computeTFVector(text1);
    const vector2 = this.computeTFVector(text2);
    
    return this.cosineSimilarity(vector1, vector2);
  }

  /**
   * Compute TF vector for text
   * @param text - Text to vectorize
   * @returns TF vector as Map
   */
  private computeTFVector(text: string): Map<string, number> {
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const tf = new Map<string, number>();
    
    for (const word of words) {
      tf.set(word, (tf.get(word) || 0) + 1);
    }
    
    // Normalize
    const total = words.length;
    if (total > 0) {
      for (const [word, count] of tf.entries()) {
        tf.set(word, count / total);
      }
    }
    
    return tf;
  }

  /**
   * Calculate cosine similarity between vectors
   * @param vec1 - First vector
   * @param vec2 - Second vector
   * @returns Cosine similarity
   */
  private cosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
    const allWords = new Set([...vec1.keys(), ...vec2.keys()]);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (const word of allWords) {
      const v1 = vec1.get(word) || 0;
      const v2 = vec2.get(word) || 0;
      dotProduct += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    }
    
    return norm1 > 0 && norm2 > 0
      ? dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
      : 0;
  }

  /**
   * Calculate structure preservation score
   * @param original - Original text
   * @param compressed - Compressed text
   * @returns Structure score (0-1)
   */
  private structurePreservation(original: string, compressed: string): number {
    // Compare section counts
    const originalSections = original.split(/\n\n+/).length;
    const compressedSections = compressed.split(/\n\n+/).length;
    const sectionRatio = Math.min(1, compressedSections / originalSections);

    // Compare list counts
    const originalLists = (original.match(/^[ \t]*[-•*]\s+/gm) || []).length;
    const compressedLists = (compressed.match(/^[ \t]*[-•*]\s+/gm) || []).length;
    const listRatio = originalLists === 0 ? 1 : Math.min(1, compressedLists / originalLists);

    // Compare code block counts
    const originalCodeBlocks = (original.match(/```[\s\S]*?```/g) || []).length;
    const compressedCodeBlocks = (compressed.match(/```[\s\S]*?```/g) || []).length;
    const codeBlockRatio = originalCodeBlocks === 0 ? 1 : Math.min(1, compressedCodeBlocks / originalCodeBlocks);

    // Compare header counts
    const originalHeaders = (original.match(/^#{1,6}\s+/gm) || []).length;
    const compressedHeaders = (compressed.match(/^#{1,6}\s+/gm) || []).length;
    const headerRatio = originalHeaders === 0 ? 1 : Math.min(1, compressedHeaders / originalHeaders);

    // Weighted average
    return (sectionRatio * 0.4) + (listRatio * 0.2) + (codeBlockRatio * 0.2) + (headerRatio * 0.2);
  }

  /**
   * Get validation statistics
   * @returns Statistics object
   */
  getStats(): {
    validationsPerformed: number;
    averageScore: number;
    passRate: number;
  } {
    return { ...this.stats };
  }

  /**
   * Clear statistics
   */
  clearStats(): void {
    this.stats.validationsPerformed = 0;
    this.stats.averageScore = 0;
    this.stats.passRate = 0;
    this.stats.scores = [];
  }
}

export default PromptQualityValidator;
