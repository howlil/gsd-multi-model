/**
 * Cache Module
 *
 * Caching & I/O Optimization (Phase 29).
 * Provides unified caching with multiple strategies and I/O batching.
 */

// CACHE-01 to CACHE-03: Cache strategies (LRU, TTL, LFU)
// CACHE-05, CACHE-06: Read-through and write-behind caching
export { CacheManager } from './cache-manager.js';
export type { CacheStats, CacheStrategy, CacheConfig } from './cache-manager.js';

// CACHE-04: I/O batching
export { IOBatchManager } from './io-batch-manager.js';
export type { IOBatchConfig, IORequest, IOOperationType } from './io-batch-manager.js';
