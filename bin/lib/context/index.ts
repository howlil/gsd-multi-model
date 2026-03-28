/**
 * Context Module
 *
 * Single-pass context optimization with transparent reasoning.
 * Consolidates context gathering, scoring, and optimization.
 */

// Core optimizer
export { ContextOptimizer } from './context-optimizer.js';
export type { ContextSource, ScoredFile, ContextResult, ContextOptions } from './context-optimizer.js';

// Context slicer
export { ContextSlicer, ContextTier } from './context-slicer.js';
export type {
  SlicedContextResult,
  SlicerConfig,
  SliceOptions,
  TieredSources
} from './context-slicer.js';

// Token tracker
export { TokenTracker } from './token-tracker.js';
export type { TokenUsage, PhaseTokenSummary } from './token-tracker.js';

// Errors
export * from './context-errors.js';

// Backward compatibility (used by strategies)
export { ContextRelevanceScorer } from './context-relevance-scorer.js';
export type { ScoringOptions, ScoreResult } from './context-relevance-scorer.js';

// Performance Optimizations (Phase 24)
// OPT-01: Context deduplication
export { ContextDeduplicator } from './context-deduplicator.js';
export type { DedupResult } from './context-deduplicator.js';

// OPT-02: Lazy loading
export { ContextLazyLoader } from './context-lazy-loader.js';
export type { LazyContentEntry, LazyLoaderStats } from './context-lazy-loader.js';

// OPT-03: Prefetching, OPT-04: Advanced caching
export { ContextPrefetcher } from './context-prefetcher.js';
export type { CacheStats } from './context-prefetcher.js';

// OPT-05: Relevance scoring optimization
export { ContextRelevanceScorer as ContextRelevanceScorerOptimized } from './context-relevance-scorer-optimized.js';
export type { RelevanceScore } from './context-relevance-scorer-optimized.js';

// OPT-06: Unified context manager with tier management
export { ContextManager } from './context-manager.js';
export type { ContextManagerConfig, ContextManagerStats, ManagedContextResult } from './context-manager.js';
