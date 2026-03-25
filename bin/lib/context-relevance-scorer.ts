/**
 * Context Relevance Scorer — Score context items by relevance
 *
 * Analyzes context items and assigns relevance scores based on:
 * - Recency
 * - Frequency of access
 * - Relationship to current task
 */

/**
 * Scoring weights configuration
 */
export interface ScoringWeights {
  recency?: number;
  frequency?: number;
  relevance?: number;
}

/**
 * Scoring options
 */
export interface ScoringOptions {
  weights?: ScoringWeights;
  maxAge?: number;
  maxCount?: number;
  minScore?: number;
  maxFiles?: number;
}

/**
 * Scored file result
 */
export interface ScoredFile {
  path: string;
  score: number;
  breakdown: {
    recency: number;
    frequency: number;
    relevance: number;
  } | null;
}

/**
 * Score result with reason
 */
export interface ScoreResult {
  score: number;
  reason: string;
}

/**
 * Context item for scoring
 */
export interface ContextItem {
  recency?: number;
  frequency?: number;
  relevance?: number;
  path?: string;
  content?: string;
  [key: string]: unknown;
}

/**
 * ContextRelevanceScorer class for scoring context relevance
 */
export class ContextRelevanceScorer {
  private defaultWeights: ScoringWeights;
  private task: string;

  /**
   * Create a ContextRelevanceScorer instance
   * @param task - Current task description for relevance scoring
   * @param _options - Scoring options
   */
  constructor(task: string, _options: ScoringOptions = {}) {
    this.defaultWeights = {
      recency: 0.4,
      frequency: 0.3,
      relevance: 0.3
    };
    this.task = task;
  }

  /**
   * Score a context item
   * @param item - Context item to score
   * @param options - Scoring options
   * @returns Relevance score (0-100)
   */
  score(item: ContextItem, options: ScoringOptions = {}): number {
    const { recency = 0, frequency = 0, relevance = 0 } = item;
    const weights = { ...this.defaultWeights, ...options.weights };

    const recencyScore = this._scoreRecency(recency, options);
    const frequencyScore = this._scoreFrequency(frequency, options);
    const relevanceScore = this._scoreRelevance(relevance, options);

    return Math.round(
      recencyScore * (weights.recency ?? 0.4) +
      frequencyScore * (weights.frequency ?? 0.3) +
      relevanceScore * (weights.relevance ?? 0.3)
    );
  }

  /**
   * Score based on recency
   * @param lastAccessed - Timestamp of last access
   * @param options - Options
   * @returns Score (0-100)
   */
  private _scoreRecency(lastAccessed: number, options: ScoringOptions = {}): number {
    if (!lastAccessed) return 50;
    const now = Date.now();
    const age = now - lastAccessed;
    const maxAge = options.maxAge ?? 3600000; // 1 hour default

    return Math.max(0, Math.min(100, 100 - (age / maxAge) * 100));
  }

  /**
   * Score based on access frequency
   * @param accessCount - Number of accesses
   * @param options - Options
   * @returns Score (0-100)
   */
  private _scoreFrequency(accessCount: number, options: ScoringOptions = {}): number {
    if (!accessCount) return 0;
    const maxCount = options.maxCount ?? 100;
    return Math.min(100, (accessCount / maxCount) * 100);
  }

  /**
   * Score based on content relevance
   * @param relevance - Pre-computed relevance value
   * @param _options - Options
   * @returns Score (0-100)
   */
  private _scoreRelevance(relevance: number | null | undefined, _options: ScoringOptions = {}): number {
    if (relevance === undefined || relevance === null) return 50;
    return Math.max(0, Math.min(100, relevance));
  }

  /**
   * Score multiple items and sort by relevance
   * @param items - Context items to score
   * @param options - Scoring options
   * @returns Items with scores, sorted by relevance
   */
  scoreAll(items: ContextItem[], options: ScoringOptions = {}): Array<ContextItem & { relevanceScore: number }> {
    return items
      .map((item) => ({
        ...item,
        relevanceScore: this.score(item, options)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Score a file based on content relevance to task
   * @param _filePath - Path to the file
   * @param content - File content
   * @returns Score result with score and reason
   */
  scoreFile(_filePath: string, content: string): ScoreResult {
    const scores: ScoreResult[] = [];

    // Score based on keyword matching with task
    const taskKeywords = this.task.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
    const contentLower = content.toLowerCase();

    let matchCount = 0;
    const matchedKeywords: string[] = [];

    for (const keyword of taskKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = contentLower.match(regex);
      if (matches && matches.length > 0) {
        matchCount += matches.length;
        matchedKeywords.push(keyword);
      }
    }

    // Calculate relevance score based on keyword density
    const wordCount = content.split(/\s+/).length;
    const keywordDensity = wordCount > 0 ? (matchCount / wordCount) * 100 : 0;
    const relevanceScore = Math.min(100, keywordDensity * 10);

    const reason = matchedKeywords.length > 0
      ? `Matched ${matchedKeywords.length} keywords: ${matchedKeywords.slice(0, 5).join(', ')}`
      : 'No relevant keywords matched';

    scores.push({
      score: Math.round(relevanceScore * 100) / 100,
      reason
    });

    // Return the primary score
    return scores[0] ?? { score: 0, reason: 'Unable to score file' };
  }

  /**
   * Score multiple files and return scored results
   * @param filePaths - Array of file paths to score
   * @returns Array of scored files
   */
  scoreFiles(filePaths: string[]): ScoredFile[] {
    // For backward compatibility, score based on path relevance
    return filePaths.map((path) => ({
      path,
      score: this._scorePathRelevance(path),
      breakdown: null
    }));
  }

  /**
   * Score file path relevance to task
   * @param filePath - File path to score
   * @returns Score (0-100)
   * @private
   */
  private _scorePathRelevance(filePath: string): number {
    const pathLower = filePath.toLowerCase();
    const taskLower = this.task.toLowerCase();

    // Check if path contains task-related keywords
    const taskKeywords = taskLower.split(/\s+/).filter((word) => word.length > 3);
    let score = 50; // Base score

    for (const keyword of taskKeywords) {
      if (pathLower.includes(keyword)) {
        score += 10;
      }
    }

    // Boost score for relevant file types
    if (pathLower.endsWith('.ts') || pathLower.endsWith('.js')) {
      score += 5;
    }
    if (pathLower.includes('src') || pathLower.includes('lib')) {
      score += 5;
    }

    return Math.min(100, score);
  }
}

export default ContextRelevanceScorer;
