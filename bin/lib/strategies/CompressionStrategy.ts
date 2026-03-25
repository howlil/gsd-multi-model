/**
 * Compression Strategy Interface
 *
 * Defines the contract for context compression strategies.
 * The Strategy pattern enables interchangeable compression algorithms
 * to optimize token consumption based on different approaches.
 *
 * @example
 * ```typescript
 * const strategy = new SummarizeStrategy('claude-sonnet');
 * const compressor = new ContextCompressor();
 * compressor.setStrategy(strategy);
 * const result = await compressor.compress(content, { maxTokens: 4000 });
 * ```
 */

/**
 * Compression options for strategy execution
 */
export interface CompressionOptions {
  /** Maximum tokens to retain after compression */
  maxTokens?: number;
  /** Target compression ratio (0-1, e.g., 0.5 for 50% reduction) */
  targetCompressionRatio?: number;
  /** Preserve code blocks in the content */
  preserveCodeBlocks?: boolean;
  /** Query string for relevance-based strategies */
  query?: string;
  /** Additional strategy-specific options */
  [key: string]: unknown;
}

/**
 * Result of compression operation with metadata
 */
export interface CompressionResult {
  /** Compressed content */
  content: string;
  /** Original content size in characters */
  originalSize: number;
  /** Compressed content size in characters */
  compressedSize: number;
  /** Size reduction in characters */
  reduction: number;
  /** Compression method/strategy name */
  method: string;
  /** Optional breakdown of compression by section */
  breakdown?: Record<string, number>;
  /** Optional metadata about the compression */
  metadata?: Record<string, unknown>;
}

/**
 * Strategy interface for context compression algorithms
 *
 * Implementations provide different compression approaches:
 * - SummarizeStrategy: AI-powered summarization
 * - TruncateStrategy: Simple length-based truncation
 * - RankByRelevanceStrategy: Keep highest-scored content
 * - HybridStrategy: Combine multiple approaches
 */
export interface CompressionStrategy {
  /**
   * Get the strategy name
   * @returns Strategy identifier name
   */
  getName(): string;

  /**
   * Compress content using this strategy
   * @param content - Content to compress
   * @param options - Compression options
   * @returns Compression result with metadata
   */
  compress(content: string, options: CompressionOptions): Promise<CompressionResult>;
}
