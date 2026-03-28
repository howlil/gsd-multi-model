/**
 * Cache Manager — Unified caching with multiple strategies
 *
 * Phase 29: Caching & I/O Optimization (CACHE-01 to CACHE-06)
 * - CACHE-01: LRU cache strategy
 * - CACHE-02: TTL cache strategy
 * - CACHE-03: LFU cache strategy
 * - CACHE-04: I/O batching
 * - CACHE-05: Read-through caching
 * - CACHE-06: Write-behind caching
 *
 * Target Metrics:
 * - Cache hit rate: 80%+
 * - I/O reduction: 60%+
 * - Latency reduction: 70%+
 */

import { createHash } from 'crypto';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  ttl?: number;
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
  sets: number;
  deletes: number;
}

/**
 * Cache strategy type
 */
export type CacheStrategy = 'lru' | 'ttl' | 'lfu';

/**
 * Cache configuration
 */
export interface CacheConfig<T = unknown> {
  /** Max cache size (default: 1000) */
  maxSize?: number;
  /** Default TTL in ms (default: 300000 = 5min) */
  defaultTTL?: number;
  /** Cache strategy (default: 'lru') */
  strategy?: CacheStrategy;
  /** Async loader for read-through caching */
  loader?: (key: string) => Promise<T>;
  /** Async writer for write-behind caching */
  writer?: (key: string, value: T) => Promise<void>;
  /** Write-behind batch interval in ms (default: 1000) */
  writeInterval?: number;
}

/**
 * Cache Manager class
 *
 * Implements multiple caching strategies:
 * - LRU (Least Recently Used)
 * - TTL (Time To Live)
 * - LFU (Least Frequently Used)
 *
 * Features:
 * - Read-through caching
 * - Write-behind caching
 * - I/O batching
 * - Statistics tracking
 */
export class CacheManager<T = unknown> {
  private readonly cache: Map<string, CacheEntry<T>>;
  private readonly config: Required<CacheConfig<T>>;
  private readonly writeQueue: Array<{ key: string; value: T; timestamp: number }>;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
    sets: number;
    deletes: number;
  };
  private writeTimer?: NodeJS.Timeout;

  constructor(config: CacheConfig<T> = {}) {
    this.cache = new Map();
    this.writeQueue = [];
    this.config = {
      maxSize: config.maxSize || 1000,
      defaultTTL: config.defaultTTL || 300000,
      strategy: config.strategy || 'lru',
      loader: config.loader || (async () => { throw new Error('No loader configured'); }),
      writer: config.writer || (async () => {}),
      writeInterval: config.writeInterval || 1000
    };
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0,
      deletes: 0
    };

    // Start write-behind timer
    this.startWriteTimer();
  }

  /**
   * Get value from cache
   * @param key - Cache key
   * @returns Cached value or undefined
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }
    
    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return undefined;
    }
    
    // Update access metadata
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.stats.hits++;
    
    return entry.value;
  }

  /**
   * Get value from cache or load if missing (read-through)
   * @param key - Cache key
   * @returns Cached or loaded value
   */
  async getOrLoad(key: string): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }
    
    // Load from source
    const value = await this.config.loader(key);
    this.set(key, value);
    return value;
  }

  /**
   * Set value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional TTL override
   */
  set(key: string, value: T, ttl?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.config.maxSize) {
      this.evict();
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccess: Date.now(),
      ttl: ttl ?? this.config.defaultTTL
    });
    this.stats.sets++;
    
    // Queue for write-behind
    if (this.config.writer) {
      this.writeQueue.push({ key, value, timestamp: Date.now() });
    }
  }

  /**
   * Delete value from cache
   * @param key - Cache key
   * @returns True if deleted
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * Check if key exists in cache
   * @param key - Cache key
   * @returns True if exists
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.writeQueue.length = 0;
    this.stats = { hits: 0, misses: 0, evictions: 0, sets: 0, deletes: 0 };
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
      maxSize: this.config.maxSize,
      evictions: this.stats.evictions,
      sets: this.stats.sets,
      deletes: this.stats.deletes
    };
  }

  /**
   * Evict entry based on strategy
   */
  private evict(): void {
    let keyToEvict: string | null = null;
    
    switch (this.config.strategy) {
      case 'lru':
        keyToEvict = this.findLRU();
        break;
      case 'lfu':
        keyToEvict = this.findLFU();
        break;
      case 'ttl':
        keyToEvict = this.findExpiring();
        break;
    }
    
    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.stats.evictions++;
    }
  }

  /**
   * Find least recently used entry
   */
  private findLRU(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }

  /**
   * Find least frequently used entry
   */
  private findLFU(): string | null {
    let leastUsedKey: string | null = null;
    let leastUsed = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < leastUsed) {
        leastUsed = entry.accessCount;
        leastUsedKey = key;
      }
    }
    
    return leastUsedKey;
  }

  /**
   * Find entry closest to expiry
   */
  private findExpiring(): string | null {
    let expiringKey: string | null = null;
    let oldestTimestamp = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        expiringKey = key;
      }
    }
    
    return expiringKey;
  }

  /**
   * Start write-behind timer
   */
  private startWriteTimer(): void {
    this.writeTimer = setInterval(() => {
      this.flushWriteQueue();
    }, this.config.writeInterval);
    
    this.writeTimer.unref();
  }

  /**
   * Flush write queue (I/O batching)
   */
  private async flushWriteQueue(): Promise<void> {
    if (this.writeQueue.length === 0) return;
    
    const batch = [...this.writeQueue];
    this.writeQueue.length = 0;
    
    // Batch write operations
    const writes = batch.map(({ key, value }) => this.config.writer(key, value));
    await Promise.all(writes).catch(err => {
      console.warn('[CacheManager] Write-behind error:', err);
    });
  }

  /**
   * Stop the cache manager and flush pending writes
   */
  async stop(): Promise<void> {
    if (this.writeTimer) {
      clearInterval(this.writeTimer);
      this.writeTimer = undefined;
    }
    
    await this.flushWriteQueue();
  }

  /**
   * Get all keys in cache
   * @returns Array of keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values in cache
   * @returns Array of values
   */
  values(): T[] {
    return Array.from(this.cache.values()).map(e => e.value);
  }

  /**
   * Get cache entries as array
   * @returns Array of {key, value} pairs
   */
  entries(): Array<{ key: string; value: T }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({ key, value: entry.value }));
  }

  /**
   * Generate hash key for complex objects
   * @param obj - Object to hash
   * @returns Hash string
   */
  static hashKey(obj: unknown): string {
    return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
  }
}

export default CacheManager;
