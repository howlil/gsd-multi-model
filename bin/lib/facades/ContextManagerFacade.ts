/**
 * Context Manager Facade
 *
 * Provides a simplified unified interface for context management operations.
 * Orchestrates multiple subsystems: ContextManager, ContextCompressor, ContextRelevanceScorer,
 * ContextDeduplicator, and ContextCache.
 */

import { LogExecution } from '../decorators/LogExecution.js';
import { CacheResult } from '../decorators/CacheResult.js';
import { defaultLogger as logger } from '../logger.js';
import { ContextManager, type ContextOptions, type ContextResult } from '../context-manager.js';
import { ContextCompressor, type CompressionResult, type CompressionOptions } from '../context-compressor.js';
import { ContextRelevanceScorer, type ScoredFile, type ScoringOptions } from '../context-relevance-scorer.js';
import { ContextDeduplicator, type DedupStats } from '../context-deduplicator.js';
import { ContextCache, type CacheEntry } from '../context-cache.js';
import type { CompressionStrategy } from '../strategies/CompressionStrategy.js';

/**
 * Context Manager Facade options
 */
export interface ContextManagerFacadeOptions {
  /** Current working directory */
  cwd?: string;
  /** Default compression strategy */
  defaultCompressionStrategy?: CompressionStrategy;
  /** Enable scoring by default */
  enableScoring?: boolean;
  /** Enable deduplication by default */
  enableDeduplication?: boolean;
  /** Enable compression by default */
  enableCompression?: boolean;
  /** Minimum score threshold for relevance scoring */
  minScore?: number;
  /** Maximum files to include */
  maxFiles?: number;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
}

/**
 * Compression statistics
 */
export interface FacadeCompressionStats {
  original: number;
  compressed: number;
  saved: number;
  ratio: number;
}

/**
 * Scoring statistics
 */
export interface FacadeScoringStats {
  enabled: boolean;
  minScore: number;
  avgScore: number;
  filteredCount: number;
}

/**
 * Context Manager Facade - Unified interface for context operations
 *
 * Implements the Facade pattern to simplify complex context management subsystems.
 * Provides a single entry point for all context operations including gathering,
 * compression, deduplication, scoring, and caching.
 */
export class ContextManagerFacade {
  private cwd: string;
  private cache: ContextCache;
  private compressor: ContextCompressor;
  private scorer: ContextRelevanceScorer | null;
  private deduplicator: ContextDeduplicator;
  private enableScoring: boolean;
  private enableDeduplication: boolean;
  private enableCompression: boolean;
  private minScore: number;
  private maxFiles: number;
  private cacheTTL: number;
  private currentTask: string | null;

  /**
   * Create a ContextManagerFacade instance
   * @param options - Facade configuration options
   */
  constructor(options: ContextManagerFacadeOptions = {}) {
    this.cwd = options.cwd ?? process.cwd();
    this.cache = new ContextCache();
    this.compressor = new ContextCompressor(options.defaultCompressionStrategy);
    this.scorer = null;
    this.deduplicator = new ContextDeduplicator({ enableFuzzyMatch: true });
    this.enableScoring = options.enableScoring ?? false;
    this.enableDeduplication = options.enableDeduplication ?? false;
    this.enableCompression = options.enableCompression ?? false;
    this.minScore = options.minScore ?? 0.1;
    this.maxFiles = options.maxFiles ?? 20;
    this.cacheTTL = options.cacheTTL ?? 300000; // 5 minutes default
    this.currentTask = null;

    logger.debug('ContextManagerFacade initialized', {
      cwd: this.cwd,
      enableScoring: this.enableScoring,
      enableDeduplication: this.enableDeduplication,
      enableCompression: this.enableCompression
    });
  }

  /**
   * Gather context from files and URLs with optional optimization
   * @param options - Context gathering options
   * @returns Aggregated context result
   */
  @LogExecution('ContextManagerFacade.gather', { logParams: false, logResult: false })
  @CacheResult(
    (options: ContextOptions) => `gather:${JSON.stringify(options)}`,
    60000 // 1 minute TTL for gather results
  )
  async gather(options: ContextOptions = {}): Promise<ContextResult> {
    const {
      files = [],
      urls = [],
      task,
      enableScoring = this.enableScoring,
      minScore = this.minScore,
      maxFiles = this.maxFiles,
      enableCompression = this.enableCompression,
      enableDeduplication = this.enableDeduplication,
      taskId
    } = options;

    // Update current task for scoring
    this.currentTask = task ?? this.currentTask;

    // Create context manager for this request
    const contextManager = new ContextManager(this.cwd);

    // Gather context with all optimizations
    const result = await contextManager.requestContext({
      files,
      urls,
      task: task ?? '',
      enableScoring,
      minScore,
      maxFiles,
      enableCompression,
      enableDeduplication,
      taskId
    });

    logger.info('ContextManagerFacade.gather completed', {
      filesCount: files.length,
      urlsCount: urls.length,
      contextLength: result.context.length,
      sourcesCount: result.sources.length,
      errorsCount: result.errors.length
    });

    return result;
  }

  /**
   * Compress content using the configured strategy
   * @param content - Content to compress
   * @param strategy - Optional strategy override
   * @returns Compression result
   */
  @LogExecution('ContextManagerFacade.compress', { logParams: false, logResult: false })
  @CacheResult(
    (content: string, _strategy?: CompressionStrategy) => `compress:${content.length}:${content.slice(0, 50).replace(/\s/g, '_')}`,
    300000 // 5 minutes TTL
  )
  async compress(content: string, strategy?: CompressionStrategy): Promise<CompressionResult> {
    if (strategy) {
      this.compressor.setStrategy(strategy);
    }

    const result = await this.compressor.compress(content);

    logger.debug('ContextManagerFacade.compress completed', {
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      reduction: result.reduction
    });

    return result;
  }

  /**
   * Remove duplicate content
   * @param content - Content to deduplicate
   * @returns Deduplicated content
   */
  @LogExecution('ContextManagerFacade.deduplicate', { logParams: false })
  deduplicate(content: string): string {
    // Split content into sections (assuming markdown-style sections)
    const sections = content.split('\n---\n');
    
    // Deduplicate sections
    const uniqueSections = this.deduplicator.deduplicate(
      sections.map((section, index) => ({
        content: section,
        index
      })),
      'content'
    );

    const result = uniqueSections.map(s => s.content).join('\n---\n');

    logger.debug('ContextManagerFacade.deduplicate completed', {
      originalSections: sections.length,
      uniqueSections: uniqueSections.length,
      removed: sections.length - uniqueSections.length
    });

    return result;
  }

  /**
   * Score content relevance against a query
   * @param content - Content to score
   * @param query - Query for relevance scoring
   * @returns Relevance score (0-100)
   */
  @LogExecution('ContextManagerFacade.score', { logParams: false })
  @CacheResult(
    (content: string, query: string) => `score:${query}:${content.length}:${content.slice(0, 30).replace(/\s/g, '_')}`,
    300000 // 5 minutes TTL
  )
  async score(content: string, query: string): Promise<number> {
    const scorer = new ContextRelevanceScorer(query);
    
    // Create a temporary file representation for scoring
    const scoreResult = scorer.scoreFile('content', content);
    
    logger.debug('ContextManagerFacade.score completed', {
      query,
      score: scoreResult.score,
      reason: scoreResult.reason
    });

    return scoreResult.score;
  }

  /**
   * Get cached content by key
   * @param key - Cache key
   * @returns Cached content or null if not found
   */
  @LogExecution('ContextManagerFacade.getCached', { logParams: true, paramName: 'key' })
  getCached(key: string): string | null {
    const entry = this.cache.get(key);
    if (entry) {
      logger.debug('ContextManagerFacade.getCached - cache hit', { key });
      return entry.content;
    }
    logger.debug('ContextManagerFacade.getCached - cache miss', { key });
    return null;
  }

  /**
   * Store content in cache
   * @param key - Cache key
   * @param content - Content to cache
   * @param ttl - Optional TTL override
   */
  @LogExecution('ContextManagerFacade.setCached', { logParams: true })
  setCached(key: string, content: string, ttl?: number): void {
    this.cache.set(key, content, {
      timestamp: Date.now(),
      ttl: ttl ?? this.cacheTTL
    });
    logger.debug('ContextManagerFacade.setCached completed', { key, ttl: ttl ?? this.cacheTTL });
  }

  /**
   * Set the default compression strategy
   * @param strategy - Compression strategy to use
   */
  @LogExecution('ContextManagerFacade.setCompressionStrategy', { logParams: false })
  setCompressionStrategy(strategy: CompressionStrategy): void {
    this.compressor.setStrategy(strategy);
    logger.info('ContextManagerFacade.setCompressionStrategy', {
      strategy: strategy.getName()
    });
  }

  /**
   * Enable or disable relevance scoring
   * @param enabled - Whether to enable scoring
   */
  @LogExecution('ContextManagerFacade.setScoringEnabled', { logParams: true })
  setScoringEnabled(enabled: boolean): void {
    this.enableScoring = enabled;
    logger.info('ContextManagerFacade.setScoringEnabled', { enabled });
  }

  /**
   * Enable or disable deduplication
   * @param enabled - Whether to enable deduplication
   */
  @LogExecution('ContextManagerFacade.setDeduplicationEnabled', { logParams: true })
  setDeduplicationEnabled(enabled: boolean): void {
    this.enableDeduplication = enabled;
    logger.info('ContextManagerFacade.setDeduplicationEnabled', { enabled });
  }

  /**
   * Get compression statistics
   * @param original - Original content
   * @param compressed - Compressed content
   * @returns Compression statistics
   */
  getCompressionStats(original: string, compressed: string): FacadeCompressionStats {
    const stats = this.compressor.getStats(original, compressed);
    return {
      original: stats.original,
      compressed: stats.compressed,
      saved: stats.saved,
      ratio: stats.ratio
    };
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return this.cache.stats();
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('ContextManagerFacade.clearCache completed');
  }

  /**
   * Get the current task being processed
   * @returns Current task description or null
   */
  getCurrentTask(): string | null {
    return this.currentTask;
  }

  /**
   * Get deduplication statistics
   * @param original - Original items count
   * @param deduplicated - Deduplicated items count
   * @returns Deduplication statistics
   */
  getDedupStats(original: number, deduplicated: number): DedupStats {
    const removed = original - deduplicated;
    const ratio = original > 0 ? (removed / original) * 100 : 0;
    return {
      original,
      deduplicated,
      removed,
      ratio: Math.round(ratio * 100) / 100
    };
  }
}

export default ContextManagerFacade;
