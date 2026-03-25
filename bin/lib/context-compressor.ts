/**
 * Context Compressor — Compress context to reduce token usage
 *
 * Uses the Strategy pattern to enable interchangeable compression algorithms.
 * Supports multiple strategies: summarize, truncate, rank-by-relevance, and hybrid.
 *
 * @example
 * ```typescript
 * // Use with strategy pattern
 * const compressor = new ContextCompressor();
 * const strategy = new SummarizeStrategy('claude-sonnet');
 * compressor.setStrategy(strategy);
 * const result = await compressor.compress(content, { maxTokens: 4000 });
 *
 * // Or use convenience method
 * const result = await compressor.compressWithStrategy(content, 'hybrid', {
 *   scorer,
 *   modelName: 'claude-sonnet',
 *   maxTokens: 4000
 * });
 * ```
 */

import { CacheResult } from './decorators/CacheResult.js';
import { LogExecution } from './decorators/LogExecution.js';
import { defaultLogger as logger } from './logger.js';
import type { CompressionStrategy, CompressionOptions, CompressionResult } from './strategies/CompressionStrategy.js';
import { createStrategy } from './strategies/StrategyFactory.js';
import { SummarizeStrategy } from './strategies/SummarizeStrategy.js';
import { TruncateStrategy } from './strategies/TruncateStrategy.js';
import { RankByRelevanceStrategy } from './strategies/RankByRelevanceStrategy.js';
import { HybridStrategy } from './strategies/HybridStrategy.js';
import { ContextRelevanceScorer } from './context-relevance-scorer.js';

// Re-export types for backward compatibility
export type { CompressionResult, CompressionOptions };

/**
 * Compression statistics
 */
export interface CompressionStats {
  original: number;
  compressed: number;
  saved: number;
  ratio: number;
}

/**
 * ContextCompressor class for compressing context content
 *
 * Uses the Strategy pattern to enable interchangeable compression algorithms.
 * Supports strategy registration, selection, and delegation.
 */
export class ContextCompressor {
  private strategy: CompressionStrategy | null;
  private strategies: Map<string, CompressionStrategy>;
  private compressionThreshold: number;
  private defaultLimit: number;

  /**
   * Create a ContextCompressor instance
   * @param defaultStrategy - Optional default compression strategy
   */
  constructor(defaultStrategy?: CompressionStrategy) {
    this.strategy = defaultStrategy ?? null;
    this.strategies = new Map();
    this.compressionThreshold = 0.8; // Compress if over 80% of limit
    this.defaultLimit = 100000; // Default token limit

    // Register default strategies
    this.registerDefaultStrategies();
  }

  /**
   * Register default compression strategies
   * @private
   */
  private registerDefaultStrategies(): void {
    this.strategies.set('summarize', new SummarizeStrategy());
    this.strategies.set('truncate', new TruncateStrategy());
    // Note: rank-by-relevance and hybrid require scorer, created on-demand
  }

  /**
   * Set the compression strategy
   * @param strategy - Compression strategy to use
   */
  setStrategy(strategy: CompressionStrategy): void {
    this.strategy = strategy;
    logger.debug('ContextCompressor strategy set', { strategy: strategy.getName() });
  }

  /**
   * Register a named strategy for later use
   * @param name - Strategy name
   * @param strategy - Compression strategy instance
   */
  registerStrategy(name: string, strategy: CompressionStrategy): void {
    this.strategies.set(name, strategy);
    logger.debug('ContextCompressor strategy registered', { name });
  }

  /**
   * Get a registered strategy by name
   * @param name - Strategy name
   * @returns Strategy instance or null if not found
   */
  getStrategy(name: string): CompressionStrategy | null {
    return this.strategies.get(name) ?? null;
  }

  /**
   * Get list of registered strategy names
   * @returns Array of strategy names
   */
  getRegisteredStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Get the current strategy
   * @returns Current compression strategy or null
   */
  getCurrentStrategy(): CompressionStrategy | null {
    return this.strategy;
  }

  /**
   * Compress context content using the current strategy
   * @param content - Content to compress
   * @param options - Compression options
   * @returns Compression result with metadata
   * @throws Error if no strategy is set
   */
  @LogExecution('ContextCompressor.compress', { logParams: false, logResult: false, level: 'debug' })
  @CacheResult(
    (content, options) => `compress:${options?.maxTokens ?? 'default'}:${content.length}:${content.slice(0, 50).replace(/\s/g, '_')}`,
    300000 // 5 minutes TTL
  )
  async compress(content: string, options: CompressionOptions = {}): Promise<CompressionResult> {
    if (!this.strategy) {
      // Use default truncate strategy if none set
      logger.warn('ContextCompressor: No strategy set, using default truncate strategy');
      this.strategy = new TruncateStrategy(options.maxTokens ?? this.defaultLimit / 4);
    }

    return this.strategy.compress(content, options);
  }

  /**
   * Compress content using a named registered strategy
   * @param content - Content to compress
   * @param strategyName - Name of registered strategy to use
   * @param options - Compression options
   * @returns Compression result with metadata
   * @throws Error if strategy not found
   */
  async compressWith(strategyName: string, content: string, options: CompressionOptions = {}): Promise<CompressionResult> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Strategy '${strategyName}' not found. Available: ${this.getRegisteredStrategies().join(', ')}`);
    }

    logger.debug('ContextCompressor using named strategy', { strategy: strategyName });
    return strategy.compress(content, options);
  }

  /**
   * Compress content using a strategy created with factory
   * @param content - Content to compress
   * @param strategyName - Strategy type name (summarize, truncate, rank-by-relevance, hybrid)
   * @param options - Compression options including strategy-specific config
   * @returns Compression result with metadata
   */
  async compressWithStrategy(content: string, strategyName: string, options: CompressionOptions = {}): Promise<CompressionResult> {
    const strategy = createStrategy(strategyName, options);
    logger.debug('ContextCompressor using factory-created strategy', { strategy: strategyName });
    return strategy.compress(content, options);
  }

  /**
   * Compress a file content with path tracking
   * @param _filePath - Path to the file
   * @param content - Content to compress
   * @param options - Compression options
   * @returns Compression result with metadata
   */
  compressFile(_filePath: string, content: string, options: CompressionOptions = {}): Promise<CompressionResult> {
    return this.compress(content, options);
  }

  /**
   * Get compression statistics
   * @param original - Original content
   * @param compressed - Compressed content
   * @returns Compression statistics
   */
  getStats(original: string | undefined, compressed: string | undefined): CompressionStats {
    const originalLength = original?.length ?? 0;
    const compressedLength = compressed?.length ?? 0;
    const saved = originalLength - compressedLength;
    const ratio = originalLength > 0 ? (saved / originalLength) * 100 : 0;

    return {
      original: originalLength,
      compressed: compressedLength,
      saved,
      ratio: Math.round(ratio * 100) / 100
    };
  }

  /**
   * Create a compressor with a specific strategy
   * @param strategyType - Strategy type (summarize, truncate, rank-by-relevance, hybrid)
   * @param config - Strategy configuration
   * @returns ContextCompressor instance with strategy set
   *
   * @example
   * ```typescript
   * const compressor = ContextCompressor.withStrategy('hybrid', {
   *   scorer: new ContextRelevanceScorer('task'),
   *   modelName: 'claude-sonnet',
   *   maxTokens: 4000
   * });
   * const result = await compressor.compress(content);
   * ```
   */
  static withStrategy(strategyType: string, config: CompressionOptions = {}): ContextCompressor {
    const strategy = createStrategy(strategyType, config);
    return new ContextCompressor(strategy);
  }

  /**
   * Create a compressor with a custom strategy instance
   * @param strategy - Custom strategy instance
   * @returns ContextCompressor instance with strategy set
   */
  static withCustomStrategy(strategy: CompressionStrategy): ContextCompressor {
    return new ContextCompressor(strategy);
  }
}

export default ContextCompressor;
