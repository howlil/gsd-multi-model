/**
 * Context Prefetcher — Intelligent context prefetching
 *
 * OPT-03: Prefetches likely-needed context based on patterns
 * OPT-04: Advanced context caching with LRU eviction
 *
 * Features:
 * - Pattern-based prefetching
 * - LRU cache with configurable TTL
 * - Priority-based prefetching
 * - Cache hit/miss statistics
 *
 * Target Metrics:
 * - Cache hit rate: 60%+
 * - Prefetch accuracy: 70%+
 * - Latency reduction: 40%
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  priority: number;
}

/**
 * Prefetch request
 */
interface PrefetchRequest {
  pattern: string;
  priority: number;
  reason: string;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  evictions: number;
  prefetchHits: number;
  prefetchMisses: number;
}

/**
 * Context Prefetcher class
 *
 * Implements intelligent prefetching with:
 * - LRU cache management
 * - Pattern-based prediction
 * - Priority-based loading
 */
export class ContextPrefetcher<T = string> {
  private readonly cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  private readonly ttl: number;
  private readonly prefetchQueue: PrefetchRequest[];
  private readonly accessPatterns: Map<string, number>;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
    prefetchHits: number;
    prefetchMisses: number;
  };

  constructor(options: { maxSize?: number; ttl?: number } = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 100;
    this.ttl = options.ttl || 300000; // 5 minutes
    this.prefetchQueue = [];
    this.accessPatterns = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      prefetchHits: 0,
      prefetchMisses: 0
    };
  }

  /**
   * Get value from cache
   * @param key - Cache key
   * @returns Cached value or null
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Update access metadata
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.stats.hits++;
    
    return entry.value;
  }

  /**
   * Set value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param priority - Priority level (0-10)
   */
  set(key: string, value: T, priority: number = 5): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccess: Date.now(),
      priority
    });
  }

  /**
   * Request prefetch for a pattern
   * @param pattern - Pattern to prefetch
   * @param priority - Priority level (0-10)
   * @param reason - Reason for prefetch
   */
  requestPrefetch(pattern: string, priority: number = 5, reason: string = ''): void {
    this.prefetchQueue.push({ pattern, priority, reason });
    
    // Track access pattern
    const count = this.accessPatterns.get(pattern) || 0;
    this.accessPatterns.set(pattern, count + 1);
  }

  /**
   * Execute prefetch queue
   * @param loader - Async loader function
   * @returns Number of items prefetched
   */
  async executePrefetch(loader: (pattern: string) => Promise<T>): Promise<number> {
    // Sort by priority
    this.prefetchQueue.sort((a, b) => b.priority - a.priority);
    
    let prefetched = 0;
    
    for (const request of this.prefetchQueue) {
      const cacheKey = `prefetch:${request.pattern}`;
      
      // Skip if already cached
      if (this.get(cacheKey) !== null) {
        this.stats.prefetchHits++;
        continue;
      }
      
      this.stats.prefetchMisses++;
      
      try {
        const value = await loader(request.pattern);
        this.set(cacheKey, value, request.priority);
        prefetched++;
      } catch (error) {
        console.warn(`[ContextPrefetcher] Prefetch failed for ${request.pattern}:`, error);
      }
    }
    
    this.prefetchQueue.length = 0;
    return prefetched;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      // LRU considers both time and access count
      const score = entry.lastAccess - (entry.accessCount * 1000);
      if (score < oldestTime) {
        oldestTime = score;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.cache.size,
      maxSize: this.maxSize,
      evictions: this.stats.evictions,
      prefetchHits: this.stats.prefetchHits,
      prefetchMisses: this.stats.prefetchMisses
    };
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
    this.prefetchQueue.length = 0;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      prefetchHits: 0,
      prefetchMisses: 0
    };
  }

  /**
   * Get frequently accessed patterns
   * @returns Array of patterns sorted by access count
   */
  getFrequentPatterns(): Array<{ pattern: string; count: number }> {
    return Array.from(this.accessPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pattern, count]) => ({ pattern, count }));
  }
}

export default ContextPrefetcher;
