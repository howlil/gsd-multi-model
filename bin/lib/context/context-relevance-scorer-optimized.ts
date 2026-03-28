/**
 * Context Relevance Scorer — Optimized relevance scoring
 *
 * OPT-05: Fast relevance scoring with caching
 *
 * Features:
 * - Multi-factor scoring (keyword, semantic, path)
 * - Cached scoring results
 * - Batch scoring optimization
 * - Adaptive threshold adjustment
 *
 * Target Metrics:
 * - Scoring accuracy: 85%+
 * - Scoring speed: <10ms per file
 * - Cache hit rate: 70%+
 */

import { createHash } from 'crypto';

/**
 * Relevance score breakdown
 */
export interface RelevanceScore {
  /** Overall score (0.0-1.0) */
  overall: number;
  /** Keyword match score (0.0-1.0) */
  keyword: number;
  /** Semantic similarity score (0.0-1.0) */
  semantic: number;
  /** Path relevance score (0.0-1.0) */
  path: number;
  /** Recency bonus (0.0-0.2) */
  recency: number;
}

/**
 * Scoring options
 */
export interface ScoringOptions {
  /** Keyword weight (default: 0.4) */
  keywordWeight?: number;
  /** Semantic weight (default: 0.4) */
  semanticWeight?: number;
  /** Path weight (default: 0.2) */
  pathWeight?: number;
  /** Include recency bonus (default: false) */
  includeRecency?: boolean;
  /** Minimum score threshold (default: 0.0) */
  minScore?: number;
}

/**
 * Cached score entry
 */
interface CachedScore {
  score: RelevanceScore;
  timestamp: number;
  taskHash: string;
}

/**
 * Context Relevance Scorer class
 *
 * Implements multi-factor relevance scoring with:
 * - Keyword matching (40% weight)
 * - Semantic similarity (40% weight)
 * - Path relevance (20% weight)
 * - Recency bonus (optional)
 */
export class ContextRelevanceScorer {
  private readonly scoreCache: Map<string, CachedScore>;
  private readonly cacheTTL: number;
  private readonly weights: {
    keyword: number;
    semantic: number;
    path: number;
  };
  private stats: {
    scoresCalculated: number;
    cacheHits: number;
    cacheMisses: number;
    averageTime: number;
    times: number[];
  };

  constructor(options: { cacheTTL?: number; weights?: Partial<ScoringOptions> } = {}) {
    this.scoreCache = new Map();
    this.cacheTTL = options.cacheTTL || 300000; // 5 minutes
    this.weights = {
      keyword: options.weights?.keywordWeight || 0.4,
      semantic: options.weights?.semanticWeight || 0.4,
      path: options.weights?.pathWeight || 0.2
    };
    this.stats = {
      scoresCalculated: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageTime: 0,
      times: []
    };
  }

  /**
   * Score content relevance for a task
   * @param content - Content to score
   * @param task - Task description
   * @param filePath - Optional file path for path scoring
   * @param timestamp - Optional timestamp for recency bonus
   * @returns Relevance score breakdown
   */
  score(
    content: string,
    task: string,
    filePath?: string,
    timestamp?: number
  ): RelevanceScore {
    const startTime = Date.now();
    
    // Check cache
    const cacheKey = this.getCacheKey(content, task, filePath);
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }
    
    this.stats.cacheMisses++;
    
    // Calculate individual scores
    const keywordScore = this.keywordScore(content, task);
    const semanticScore = this.semanticScore(content, task);
    const pathScore = filePath ? this.pathScore(filePath, task) : 0;
    
    // Calculate weighted overall
    let overall = (
      keywordScore * this.weights.keyword +
      semanticScore * this.weights.semantic +
      pathScore * this.weights.path
    );
    
    // Add recency bonus if requested
    let recency = 0;
    if (timestamp) {
      recency = this.recencyBonus(timestamp);
      overall = Math.min(1.0, overall + recency);
    }
    
    const score: RelevanceScore = {
      overall,
      keyword: keywordScore,
      semantic: semanticScore,
      path: pathScore,
      recency
    };
    
    // Cache result
    this.addToCache(cacheKey, score, task);
    
    // Update stats
    const elapsed = Date.now() - startTime;
    this.stats.scoresCalculated++;
    this.stats.times.push(elapsed);
    this.stats.averageTime = this.stats.times.reduce((a, b) => a + b, 0) / this.stats.times.length;
    
    return score;
  }

  /**
   * Batch score multiple contents
   * @param items - Array of {content, path, timestamp}
   * @param task - Task description
   * @returns Array of scores
   */
  batchScore(
    items: Array<{ content: string; path?: string; timestamp?: number }>,
    task: string
  ): RelevanceScore[] {
    return items.map(item => this.score(item.content, task, item.path, item.timestamp));
  }

  /**
   * Keyword-based scoring using term frequency
   * @param content - Content to score
   * @param task - Task description
   * @returns Keyword score (0.0-1.0)
   */
  private keywordScore(content: string, task: string): number {
    const taskKeywords = this.extractKeywords(task);
    const contentLower = content.toLowerCase();
    
    let matches = 0;
    for (const keyword of taskKeywords) {
      const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi');
      const keywordMatches = contentLower.match(regex);
      if (keywordMatches) {
        matches += keywordMatches.length;
      }
    }
    
    // Normalize by content length and keyword count
    const maxExpected = taskKeywords.length * 5; // Expect ~5 matches per keyword
    return Math.min(1.0, matches / maxExpected);
  }

  /**
   * Semantic scoring using TF-IDF cosine similarity
   * @param content - Content to score
   * @param task - Task description
   * @returns Semantic score (0.0-1.0)
   */
  private semanticScore(content: string, task: string): number {
    const contentVector = this.computeTFVector(content);
    const taskVector = this.computeTFVector(task);
    return this.cosineSimilarity(contentVector, taskVector);
  }

  /**
   * Path-based scoring
   * @param filePath - File path
   * @param task - Task description
   * @returns Path score (0.0-1.0)
   */
  private pathScore(filePath: string, task: string): number {
    const taskKeywords = this.extractKeywords(task);
    const pathLower = filePath.toLowerCase();
    
    const matches = taskKeywords.filter(k => pathLower.includes(k)).length;
    return taskKeywords.length > 0 ? Math.min(1.0, matches / taskKeywords.length) : 0;
  }

  /**
   * Recency bonus calculation
   * @param timestamp - Content timestamp
   * @returns Recency bonus (0.0-0.2)
   */
  private recencyBonus(timestamp: number): number {
    const age = Date.now() - timestamp;
    const minutes = age / (1000 * 60);
    
    if (minutes < 5) return 0.2;      // < 5 min: max bonus
    if (minutes < 30) return 0.15;    // < 30 min
    if (minutes < 60) return 0.1;     // < 1 hour
    if (minutes < 240) return 0.05;   // < 4 hours
    return 0;                          // > 4 hours: no bonus
  }

  /**
   * Extract keywords from text
   * @param text - Text to extract from
   * @returns Array of keywords
   */
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .match(/\b[a-z]{4,}\b/g) || [];
  }

  /**
   * Compute term frequency vector
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
   * Escape regex special characters
   * @param string - String to escape
   * @returns Escaped string
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generate cache key
   * @param content - Content
   * @param task - Task
   * @param filePath - File path
   * @returns Cache key
   */
  private getCacheKey(content: string, task: string, filePath?: string): string {
    const hash = createHash('sha256');
    hash.update(content.substring(0, 1000)); // Hash first 1000 chars
    hash.update(task);
    if (filePath) hash.update(filePath);
    return hash.digest('hex');
  }

  /**
   * Get score from cache
   * @param key - Cache key
   * @returns Cached score or null
   */
  private getFromCache(key: string): RelevanceScore | null {
    const cached = this.scoreCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.scoreCache.delete(key);
      return null;
    }
    
    return cached.score;
  }

  /**
   * Add score to cache
   * @param key - Cache key
   * @param score - Score to cache
   * @param task - Task description for hash
   */
  private addToCache(key: string, score: RelevanceScore, task: string): void {
    this.scoreCache.set(key, {
      score,
      timestamp: Date.now(),
      taskHash: createHash('sha256').update(task).digest('hex')
    });
    
    // Limit cache size
    if (this.scoreCache.size > 1000) {
      const oldestKey = this.scoreCache.keys().next().value;
      if (oldestKey) {
        this.scoreCache.delete(oldestKey);
      }
    }
  }

  /**
   * Get scoring statistics
   * @returns Scoring statistics
   */
  getStats(): {
    scoresCalculated: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    averageTime: number;
  } {
    const total = this.stats.cacheHits + this.stats.cacheMisses;
    return {
      scoresCalculated: this.stats.scoresCalculated,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      hitRate: total > 0 ? this.stats.cacheHits / total : 0,
      averageTime: this.stats.averageTime
    };
  }

  /**
   * Clear the score cache
   */
  clear(): void {
    this.scoreCache.clear();
    this.stats = {
      scoresCalculated: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageTime: 0,
      times: []
    };
  }
}

export default ContextRelevanceScorer;
