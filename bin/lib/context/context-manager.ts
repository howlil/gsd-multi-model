/**
 * Context Manager — Unified context management with optimizations
 *
 * OPT-01 to OPT-06: Complete context management optimization
 * - OPT-01: Context deduplication
 * - OPT-02: Lazy loading
 * - OPT-03: Prefetching
 * - OPT-04: Advanced caching
 * - OPT-05: Relevance scoring optimization
 * - OPT-06: Tier management
 *
 * Features:
 * - Unified API for all context operations
 * - Automatic deduplication and caching
 * - Intelligent prefetching based on patterns
 * - Tier-based context organization
 * - Performance statistics tracking
 *
 * Target Metrics:
 * - Token waste reduction: 70%
 * - Time waste reduction: 60%
 * - Cache hit rate: 60%+
 * - Context relevance: 85%+
 */

import { ContextDeduplicator } from './context-deduplicator.js';
import { ContextPrefetcher } from './context-prefetcher.js';
import { ContextLazyLoader, LazyContentEntry } from './context-lazy-loader.js';
import { ContextRelevanceScorer, RelevanceScore } from './context-relevance-scorer-optimized.js';
import { ContextTier, TieredSources } from './context-slicer.js';

/**
 * Context manager configuration
 */
export interface ContextManagerConfig {
  /** Max cache size (default: 100) */
  maxCacheSize?: number;
  /** Cache TTL in ms (default: 300000) */
  cacheTTL?: number;
  /** Max concurrency for loading (default: 5) */
  maxConcurrency?: number;
  /** Token budget (default: 8000) */
  tokenBudget?: number;
  /** Min relevance score (default: 0.3) */
  minRelevanceScore?: number;
}

/**
 * Context manager statistics
 */
export interface ContextManagerStats {
  /** Total files processed */
  totalFiles: number;
  /** Files after deduplication */
  deduplicatedFiles: number;
  /** Files loaded */
  loadedFiles: number;
  /** Cache statistics */
  cacheStats: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  /** Token savings from deduplication */
  tokensSaved: number;
  /** Average relevance score */
  averageRelevanceScore: number;
  /** Tier distribution */
  tierDistribution: {
    hot: number;
    warm: number;
    cold: number;
  };
}

/**
 * Managed context result
 */
export interface ManagedContextResult {
  /** Context string */
  context: string;
  /** Included sources */
  sources: Array<{
    path: string;
    content: string;
    relevanceScore: number;
    tier: ContextTier;
  }>;
  /** Statistics */
  stats: ContextManagerStats;
  /** Warnings */
  warnings: string[];
}

/**
 * Context Manager class
 *
 * Unified context management with all optimizations:
 * - Deduplication (OPT-01)
 * - Lazy loading (OPT-02)
 * - Prefetching (OPT-03)
 * - Caching (OPT-04)
 * - Relevance scoring (OPT-05)
 * - Tier management (OPT-06)
 */
export class ContextManager {
  private readonly deduplicator: ContextDeduplicator;
  private readonly prefetcher: ContextPrefetcher<string>;
  private readonly lazyLoader: ContextLazyLoader;
  private readonly scorer: ContextRelevanceScorer;
  private readonly config: Required<ContextManagerConfig>;
  private readonly tierCache: Map<string, { tier: ContextTier; timestamp: number }>;

  constructor(config: ContextManagerConfig = {}) {
    this.config = {
      maxCacheSize: config.maxCacheSize || 100,
      cacheTTL: config.cacheTTL || 300000,
      maxConcurrency: config.maxConcurrency || 5,
      tokenBudget: config.tokenBudget || 8000,
      minRelevanceScore: config.minRelevanceScore || 0.3
    };

    this.deduplicator = new ContextDeduplicator();
    this.prefetcher = new ContextPrefetcher({
      maxSize: this.config.maxCacheSize,
      ttl: this.config.cacheTTL
    });
    this.lazyLoader = new ContextLazyLoader({
      maxConcurrency: this.config.maxConcurrency
    });
    this.scorer = new ContextRelevanceScorer({
      cacheTTL: this.config.cacheTTL
    });
    this.tierCache = new Map();
  }

  /**
   * Process and optimize context
   * @param files - Array of file paths
   * @param task - Task description
   * @returns Managed context result
   */
  async processContext(
    files: Array<{ path: string; content: string }>,
    task: string
  ): Promise<ManagedContextResult> {
    const warnings: string[] = [];
    const startTime = Date.now();

    // Step 1: Deduplicate content (OPT-01)
    for (const file of files) {
      this.deduplicator.addContent(file.path, file.content);
    }
    const dedupStats = this.deduplicator.getStats();
    
    if (dedupStats.duplicatesRemoved.length > 0) {
      warnings.push(`Removed ${dedupStats.duplicatesRemoved.length} duplicate files`);
    }

    // Step 2: Score relevance (OPT-05)
    const dedupedContent = this.deduplicator.getDeduplicatedContent();
    const scores = new Map<string, RelevanceScore>();
    
    for (const item of dedupedContent) {
      const score = this.scorer.score(item.content, task, item.source);
      scores.set(item.source, score);
    }

    // Step 3: Filter by relevance threshold
    const relevantFiles = dedupedContent.filter(item => {
      const score = scores.get(item.source);
      return score && score.overall >= this.config.minRelevanceScore;
    });

    // Step 4: Classify into tiers (OPT-06)
    const tiered = this.classifyTiers(relevantFiles, task);

    // Step 5: Enforce token budget per tier
    const budgeted = this.enforceTierBudget(tiered, scores);

    // Step 6: Build context string
    const context = this.buildContext(budgeted);

    // Step 7: Calculate statistics
    const stats = this.calculateStats(dedupStats, scores, budgeted);

    return {
      context,
      sources: budgeted.flatMap(tier => 
        tier.sources.map(source => ({
          path: source.source,
          content: source.content,
          relevanceScore: scores.get(source.source)?.overall || 0,
          tier: tier.tier
        }))
      ),
      stats,
      warnings
    };
  }

  /**
   * Request prefetch for patterns
   * @param patterns - Patterns to prefetch
   * @param task - Task description for priority calculation
   */
  requestPrefetch(patterns: string[], task: string): void {
    for (const pattern of patterns) {
      // Calculate priority based on pattern relevance
      const priority = this.calculatePrefetchPriority(pattern, task);
      this.prefetcher.requestPrefetch(pattern, priority, `Task: ${task}`);
    }
  }

  /**
   * Execute prefetch queue
   * @param loader - Content loader function
   * @returns Number of items prefetched
   */
  async executePrefetch(loader: (pattern: string) => Promise<string>): Promise<number> {
    return this.prefetcher.executePrefetch(loader);
  }

  /**
   * Classify sources into tiers based on relevance and recency
   * @param sources - Sources to classify
   * @param task - Task description
   * @returns Tiered sources
   */
  private classifyTiers(
    sources: Array<{ source: string; content: string; tokenCount: number }>,
    task: string
  ): Array<{ tier: ContextTier; sources: typeof sources }> {
    const now = Date.now();
    const tiers: Record<ContextTier, typeof sources> = {
      [ContextTier.HOT]: [],
      [ContextTier.WARM]: [],
      [ContextTier.COLD]: []
    };

    for (const source of sources) {
      const score = this.scorer.score(source.content, task, source.source);
      const cached = this.tierCache.get(source.source);
      
      let tier: ContextTier;
      
      if (cached && Date.now() - cached.timestamp < 300000) {
        tier = cached.tier;
      } else {
        // Classify based on relevance score
        if (score.overall >= 0.7) {
          tier = ContextTier.HOT;
        } else if (score.overall >= 0.4) {
          tier = ContextTier.WARM;
        } else {
          tier = ContextTier.COLD;
        }
        
        this.tierCache.set(source.source, { tier, timestamp: now });
      }
      
      tiers[tier].push(source);
    }

    return [
      { tier: ContextTier.HOT, sources: tiers[ContextTier.HOT] },
      { tier: ContextTier.WARM, sources: tiers[ContextTier.WARM] },
      { tier: ContextTier.COLD, sources: tiers[ContextTier.COLD] }
    ];
  }

  /**
   * Enforce token budget per tier
   * @param tiered - Tiered sources
   * @param scores - Relevance scores
   * @returns Budgeted tiered sources
   */
  private enforceTierBudget(
    tiered: Array<{ tier: ContextTier; sources: Array<{ source: string; content: string; tokenCount: number }> }>,
    scores: Map<string, RelevanceScore>
  ): Array<{ tier: ContextTier; sources: Array<{ source: string; content: string; tokenCount: number }> }> {
    const allocation = { hot: 0.7, warm: 0.2, cold: 0.1 };
    const budgets = {
      hot: Math.floor(this.config.tokenBudget * allocation.hot),
      warm: Math.floor(this.config.tokenBudget * allocation.warm),
      cold: Math.floor(this.config.tokenBudget * allocation.cold)
    };

    return tiered.map(tier => {
      const budget = budgets[tier.tier === ContextTier.HOT ? 'hot' : tier.tier === ContextTier.WARM ? 'warm' : 'cold'];
      let tokens = 0;
      const selected: typeof tier.sources = [];

      // Sort by relevance score
      const sorted = [...tier.sources].sort((a, b) => {
        const scoreA = scores.get(a.source)?.overall || 0;
        const scoreB = scores.get(b.source)?.overall || 0;
        return scoreB - scoreA;
      });

      for (const source of sorted) {
        if (tokens + source.tokenCount <= budget) {
          selected.push(source);
          tokens += source.tokenCount;
        }
      }

      return { tier: tier.tier, sources: selected };
    });
  }

  /**
   * Build context string from tiered sources
   * @param tiered - Tiered sources
   * @returns Context string
   */
  private buildContext(tiered: Array<{ tier: ContextTier; sources: Array<{ source: string; content: string; tokenCount: number }> }>): string {
    const parts: string[] = [];

    const tierEmojis: Record<ContextTier, string> = {
      [ContextTier.HOT]: '🔥',
      [ContextTier.WARM]: '🌡️',
      [ContextTier.COLD]: '🧊'
    };

    const tierLabels: Record<ContextTier, string> = {
      [ContextTier.HOT]: 'Hot Context (Current Task)',
      [ContextTier.WARM]: 'Warm Context (Related Tasks)',
      [ContextTier.COLD]: 'Cold Context (Historical)'
    };

    for (const { tier, sources } of tiered) {
      if (sources.length === 0) continue;

      parts.push(`## ${tierEmojis[tier]} ${tierLabels[tier]}`);
      
      for (const source of sources) {
        parts.push(
          `### ${source.source}\n\n${source.content}`
        );
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Calculate statistics
   * @param dedupStats - Deduplication statistics
   * @param scores - Relevance scores
   * @param budgeted - Budgeted tiered sources
   * @returns Context manager statistics
   */
  private calculateStats(
    dedupStats: { originalCount: number; deduplicatedCount: number; tokensSaved: number },
    scores: Map<string, RelevanceScore>,
    budgeted: Array<{ tier: ContextTier; sources: Array<{ source: string; content: string; tokenCount: number }> }>
  ): ContextManagerStats {
    const cacheStats = this.prefetcher.getStats();
    const loaderStats = this.lazyLoader.getStats();
    const scorerStats = this.scorer.getStats();

    const totalRelevance = Array.from(scores.values()).reduce((sum, s) => sum + s.overall, 0);
    const avgRelevance = scores.size > 0 ? totalRelevance / scores.size : 0;

    const tierDistribution = {
      hot: budgeted.find(t => t.tier === ContextTier.HOT)?.sources.length || 0,
      warm: budgeted.find(t => t.tier === ContextTier.WARM)?.sources.length || 0,
      cold: budgeted.find(t => t.tier === ContextTier.COLD)?.sources.length || 0
    };

    return {
      totalFiles: dedupStats.originalCount,
      deduplicatedFiles: dedupStats.deduplicatedCount,
      loadedFiles: loaderStats.loadedFiles,
      cacheStats: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hitRate
      },
      tokensSaved: dedupStats.tokensSaved,
      averageRelevanceScore: avgRelevance,
      tierDistribution
    };
  }

  /**
   * Calculate prefetch priority based on pattern and task
   * @param pattern - Pattern to prefetch
   * @param task - Task description
   * @returns Priority (0-10)
   */
  private calculatePrefetchPriority(pattern: string, task: string): number {
    // Higher priority for patterns matching task keywords
    const taskKeywords = task.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const patternLower = pattern.toLowerCase();
    
    const matches = taskKeywords.filter(k => patternLower.includes(k)).length;
    
    // Base priority + keyword matches
    return Math.min(10, 5 + matches * 2);
  }

  /**
   * Get manager statistics
   * @returns Context manager statistics
   */
  getStats(): ContextManagerStats {
    const dedupStats = this.deduplicator.getStats();
    const cacheStats = this.prefetcher.getStats();
    const scorerStats = this.scorer.getStats();

    return {
      totalFiles: dedupStats.originalCount,
      deduplicatedFiles: dedupStats.deduplicatedCount,
      loadedFiles: 0,
      cacheStats: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hitRate
      },
      tokensSaved: dedupStats.tokensSaved,
      averageRelevanceScore: 0,
      tierDistribution: { hot: 0, warm: 0, cold: 0 }
    };
  }

  /**
   * Clear all caches and reset state
   */
  clear(): void {
    this.deduplicator.clear();
    this.prefetcher.clear();
    this.lazyLoader.clear();
    this.scorer.clear();
    this.tierCache.clear();
  }
}

export default ContextManager;
