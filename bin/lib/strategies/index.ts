/**
 * Strategy Pattern Barrel Export
 *
 * Central export for all compression strategy classes and utilities.
 * The Strategy pattern enables interchangeable compression algorithms
 * to optimize token consumption based on different approaches.
 *
 * @example
 * ```typescript
 * import {
 *   createStrategy,
 *   getAvailableStrategies,
 *   SummarizeStrategy,
 *   TruncateStrategy,
 *   RankByRelevanceStrategy,
 *   HybridStrategy
 * } from './strategies/index.js';
 *
 * // Use factory
 * const strategy = createStrategy('summarize', { modelName: 'claude-sonnet' });
 *
 * // Or instantiate directly
 * const strategy = new HybridStrategy({ scorer, modelName: 'claude-sonnet' });
 * ```
 */

// Strategy interface and types
export type {
  CompressionStrategy,
  CompressionOptions,
  CompressionResult
} from './CompressionStrategy.js';

// Strategy implementations
export { SummarizeStrategy } from './SummarizeStrategy.js';
export { TruncateStrategy } from './TruncateStrategy.js';
export { RankByRelevanceStrategy } from './RankByRelevanceStrategy.js';
export { HybridStrategy } from './HybridStrategy.js';
export type { HybridStrategyOptions } from './HybridStrategy.js';

// Factory functions
export {
  createStrategy,
  createStrategies,
  getAvailableStrategies,
  isStrategyAvailable,
  type StrategyConfig,
  type StrategyType
} from './StrategyFactory.js';
