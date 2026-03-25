/**
 * Strategy Factory
 *
 * Factory function for creating compression strategy instances.
 * Provides a centralized way to instantiate strategies by name
 * with optional configuration.
 *
 * @example
 * ```typescript
 * const strategy = createStrategy('summarize', { modelName: 'claude-sonnet' });
 * const strategy = createStrategy('truncate', { maxTokens: 4000 });
 * const strategy = createStrategy('rank-by-relevance', { scorer });
 * const strategy = createStrategy('hybrid', { scorer, modelName: 'claude-sonnet' });
 * ```
 */

import type { CompressionStrategy } from './CompressionStrategy.js';
import { SummarizeStrategy } from './SummarizeStrategy.js';
import { TruncateStrategy } from './TruncateStrategy.js';
import { RankByRelevanceStrategy } from './RankByRelevanceStrategy.js';
import { HybridStrategy, type HybridStrategyOptions } from './HybridStrategy.js';
import { ContextRelevanceScorer } from '../context-relevance-scorer.js';

/**
 * Strategy configuration options
 */
export interface StrategyConfig {
  /** Model name for summarization strategies */
  modelName?: string;
  /** Maximum tokens for truncation strategies */
  maxTokens?: number;
  /** Scorer for relevance-based strategies */
  scorer?: ContextRelevanceScorer;
  /** Query string for relevance scoring */
  query?: string;
  /** Preserve code blocks */
  preserveCodeBlocks?: boolean;
  /** Enable ranking step (hybrid only) */
  enableRanking?: boolean;
  /** Enable summarization step (hybrid only) */
  enableSummarization?: boolean;
  /** Enable truncation step (hybrid only) */
  enableTruncation?: boolean;
  /** Additional strategy-specific options */
  [key: string]: unknown;
}

/**
 * Available strategy types
 */
export type StrategyType = 'summarize' | 'truncate' | 'rank-by-relevance' | 'hybrid';

/**
 * Create a compression strategy instance
 *
 * @param name - Strategy name or type
 * @param config - Strategy configuration options
 * @returns Compression strategy instance
 * @throws Error if strategy name is unknown
 *
 * @example
 * ```typescript
 * // Create summarize strategy
 * const summarize = createStrategy('summarize', { modelName: 'claude-sonnet' });
 *
 * // Create truncate strategy
 * const truncate = createStrategy('truncate', { maxTokens: 4000 });
 *
 * // Create rank-by-relevance strategy
 * const scorer = new ContextRelevanceScorer('my task');
 * const rank = createStrategy('rank-by-relevance', { scorer });
 *
 * // Create hybrid strategy
 * const hybrid = createStrategy('hybrid', {
 *   scorer,
 *   modelName: 'claude-sonnet',
 *   maxTokens: 4000
 * });
 * ```
 */
export function createStrategy(name: string, config: StrategyConfig = {}): CompressionStrategy {
  switch (name) {
    case 'summarize':
      return new SummarizeStrategy(config.modelName);

    case 'truncate':
      return new TruncateStrategy(config.maxTokens);

    case 'rank-by-relevance':
      if (!config.scorer) {
        throw new Error('RankByRelevanceStrategy requires a scorer instance');
      }
      return new RankByRelevanceStrategy(config.scorer);

    case 'hybrid': {
      const hybridOptions: HybridStrategyOptions = {
        scorer: config.scorer,
        modelName: config.modelName,
        maxTokens: config.maxTokens,
        enableRanking: config.enableRanking ?? true,
        enableSummarization: config.enableSummarization ?? true,
        enableTruncation: config.enableTruncation ?? true
      };
      return new HybridStrategy(hybridOptions);
    }

    default:
      throw new Error(`Unknown compression strategy: ${name}. Available strategies: ${getAvailableStrategies().join(', ')}`);
  }
}

/**
 * Get list of available strategy names
 *
 * @returns Array of available strategy names
 *
 * @example
 * ```typescript
 * const strategies = getAvailableStrategies();
 * console.log(strategies); // ['summarize', 'truncate', 'rank-by-relevance', 'hybrid']
 * ```
 */
export function getAvailableStrategies(): string[] {
  return ['summarize', 'truncate', 'rank-by-relevance', 'hybrid'];
}

/**
 * Check if a strategy is available
 *
 * @param name - Strategy name to check
 * @returns True if strategy is available
 */
export function isStrategyAvailable(name: string): boolean {
  return getAvailableStrategies().includes(name);
}

/**
 * Create multiple strategies at once
 *
 * @param names - Array of strategy names
 * @param config - Configuration to apply to all strategies
 * @returns Map of strategy name to instance
 *
 * @example
 * ```typescript
 * const strategies = createStrategies(['summarize', 'truncate'], { maxTokens: 4000 });
 * const summarize = strategies.get('summarize');
 * const truncate = strategies.get('truncate');
 * ```
 */
export function createStrategies(names: string[], config: StrategyConfig = {}): Map<string, CompressionStrategy> {
  const strategies = new Map<string, CompressionStrategy>();

  for (const name of names) {
    try {
      strategies.set(name, createStrategy(name, config));
    } catch (error) {
      // Skip strategies that fail to create
      console.warn(`Failed to create strategy '${name}':`, error instanceof Error ? error.message : error);
    }
  }

  return strategies;
}

export default createStrategy;
