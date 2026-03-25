/**
 * Hybrid Strategy
 *
 * Combines multiple compression strategies for optimal token reduction.
 * Applies strategies in sequence: rank-by-relevance → summarize → truncate
 * to achieve maximum compression while preserving the most relevant content.
 *
 * @example
 * ```typescript
 * const scorer = new ContextRelevanceScorer('implement feature X');
 * const strategy = new HybridStrategy({
 *   scorer,
 *   modelName: 'claude-sonnet',
 *   maxTokens: 4000
 * });
 * const result = await strategy.compress(content, { maxTokens: 4000 });
 * ```
 */

import { LogExecution } from '../decorators/LogExecution.js';
import { defaultLogger as logger } from '../logger.js';
import type { CompressionStrategy, CompressionOptions, CompressionResult } from './CompressionStrategy.js';
import { SummarizeStrategy } from './SummarizeStrategy.js';
import { TruncateStrategy } from './TruncateStrategy.js';
import { RankByRelevanceStrategy } from './RankByRelevanceStrategy.js';
import { ContextRelevanceScorer } from '../context-relevance-scorer.js';

/**
 * Options for configuring HybridStrategy
 */
export interface HybridStrategyOptions {
  /** Scorer for relevance-based filtering */
  scorer?: ContextRelevanceScorer;
  /** Model name for summarization */
  modelName?: string;
  /** Default max tokens for truncation */
  maxTokens?: number;
  /** Enable relevance ranking step */
  enableRanking?: boolean;
  /** Enable summarization step */
  enableSummarization?: boolean;
  /** Enable truncation as final safety check */
  enableTruncation?: boolean;
}

/**
 * HybridStrategy implementation
 *
 * Combines three compression approaches in sequence:
 * 1. Rank-by-relevance: Filter content by query relevance
 * 2. Summarization: AI-powered summarization of retained content
 * 3. Truncation: Final safety check to ensure token limit
 *
 * Each step can be enabled/disabled via configuration.
 */
export class HybridStrategy implements CompressionStrategy {
  private rankingStrategy?: RankByRelevanceStrategy;
  private summarizeStrategy: SummarizeStrategy;
  private truncateStrategy: TruncateStrategy;
  private options: Required<HybridStrategyOptions>;

  /**
   * Create a HybridStrategy instance
   * @param hybridOptions - Configuration options for hybrid strategy
   */
  constructor(hybridOptions: HybridStrategyOptions = {}) {
    const {
      scorer,
      modelName,
      maxTokens = 4000,
      enableRanking = true,
      enableSummarization = true,
      enableTruncation = true
    } = hybridOptions;

    this.options = {
      scorer,
      modelName,
      maxTokens,
      enableRanking,
      enableSummarization,
      enableTruncation
    };

    // Initialize strategies
    if (scorer) {
      this.rankingStrategy = new RankByRelevanceStrategy(scorer);
    }
    this.summarizeStrategy = new SummarizeStrategy(modelName);
    this.truncateStrategy = new TruncateStrategy(maxTokens);
  }

  /**
   * Get the strategy name
   * @returns Strategy identifier
   */
  getName(): string {
    return 'hybrid';
  }

  /**
   * Compress content using hybrid approach
   * @param content - Content to compress
   * @param options - Compression options
   * @returns Compression result with metadata
   */
  @LogExecution('HybridStrategy.compress', { logParams: false, logResult: false, level: 'debug' })
  async compress(content: string, options: CompressionOptions = {}): Promise<CompressionResult> {
    const originalSize = content.length;

    if (!content || content.length === 0) {
      return {
        content: '',
        originalSize: 0,
        compressedSize: 0,
        reduction: 0,
        method: 'hybrid'
      };
    }

    const maxTokens = options.maxTokens ?? this.options.maxTokens;
    let currentContent = content;
    const steps: string[] = [];
    const stepResults: Record<string, number> = {};

    // Step 1: Rank by relevance (if enabled and query provided)
    if (this.options.enableRanking && this.rankingStrategy && options.query) {
      const rankingOptions: CompressionOptions = { ...options, maxTokens: maxTokens * 2 }; // Allow more tokens for ranking
      const rankingResult = await this.rankingStrategy.compress(currentContent, rankingOptions);
      currentContent = rankingResult.content;
      steps.push('ranking');
      stepResults.rankingSize = rankingResult.compressedSize;
      stepResults.rankingReduction = rankingResult.reduction;

      logger.debug('HybridStrategy: ranking step complete', {
        size: rankingResult.compressedSize,
        reduction: rankingResult.reduction
      });
    }

    // Step 2: Summarize (if enabled)
    if (this.options.enableSummarization) {
      const summarizeOptions: CompressionOptions = {
        ...options,
        preserveCodeBlocks: options.preserveCodeBlocks ?? true
      };
      const summarizeResult = await this.summarizeStrategy.compress(currentContent, summarizeOptions);
      currentContent = summarizeResult.content;
      steps.push('summarization');
      stepResults.summarizationSize = summarizeResult.compressedSize;
      stepResults.summarizationReduction = summarizeResult.reduction;

      logger.debug('HybridStrategy: summarization step complete', {
        size: summarizeResult.compressedSize,
        reduction: summarizeResult.reduction
      });
    }

    // Step 3: Truncate as final safety check (if enabled)
    if (this.options.enableTruncation) {
      const truncateOptions: CompressionOptions = { maxTokens };
      const truncateResult = await this.truncateStrategy.compress(currentContent, truncateOptions);
      currentContent = truncateResult.content;
      steps.push('truncation');
      stepResults.truncationSize = truncateResult.compressedSize;
      stepResults.truncationReduction = truncateResult.reduction;

      logger.debug('HybridStrategy: truncation step complete', {
        size: truncateResult.compressedSize,
        reduction: truncateResult.reduction
      });
    }

    const compressedSize = currentContent.length;
    const reduction = originalSize - compressedSize;

    logger.info('HybridStrategy compression complete', {
      originalSize,
      compressedSize,
      reduction,
      ratio: originalSize > 0 ? ((reduction / originalSize) * 100).toFixed(2) + '%' : '0%',
      steps: steps.join(' → ')
    });

    return {
      content: currentContent,
      originalSize,
      compressedSize,
      reduction,
      method: 'hybrid',
      breakdown: stepResults,
      metadata: {
        steps,
        maxTokens,
        rankingEnabled: this.options.enableRanking && !!options.query,
        summarizationEnabled: this.options.enableSummarization,
        truncationEnabled: this.options.enableTruncation
      }
    };
  }

  /**
   * Get the enabled steps in the hybrid pipeline
   * @returns Array of enabled step names
   */
  getEnabledSteps(): string[] {
    const steps: string[] = [];
    if (this.options.enableRanking) steps.push('ranking');
    if (this.options.enableSummarization) steps.push('summarization');
    if (this.options.enableTruncation) steps.push('truncation');
    return steps;
  }

  /**
   * Get strategy configuration
   * @returns Current configuration
   */
  getConfig(): HybridStrategyOptions {
    return {
      scorer: this.options.scorer,
      modelName: this.options.modelName,
      maxTokens: this.options.maxTokens,
      enableRanking: this.options.enableRanking,
      enableSummarization: this.options.enableSummarization,
      enableTruncation: this.options.enableTruncation
    };
  }
}

export default HybridStrategy;
