/**
 * CacheResult Decorator
 *
 * Decorator for caching method results with configurable TTL.
 * Returns cached value if not expired, otherwise executes method and caches result.
 *
 * @example
 * ```typescript
 * export class ContextCompressor {
 *   @CacheResult(
 *     (content, options) => `compress:${hash(content)}`,
 *     600000 // 10 minutes
 *   )
 *   async compress(content: string, options: CompressionOptions): Promise<CompressionResult> {
 *     // Implementation
 *   }
 * }
 * ```
 */

import { defaultLogger as logger } from '../logger.js';
import type { CacheResultOptions, CacheEntry } from './types.js';

/**
 * Internal cache storage
 */
const cacheStorage = new Map<string, CacheEntry<any>>();

/**
 * CacheResult decorator factory
 *
 * @param cacheKeyFn - Function to generate cache key from method arguments
 * @param ttl - Time-to-live in milliseconds (default: 300000ms / 5 minutes)
 * @returns Method decorator
 */
export function CacheResult(cacheKeyFn: (...args: any[]) => string, ttl: number = 300000) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;

    descriptor.value = function (...args: any[]) {
      const key = cacheKeyFn(...args);
      const cached = cacheStorage.get(key);

      // Check cache hit
      if (cached && cached.expiry > Date.now()) {
        logger.debug(`[${className}] CacheResult hit for ${key}`);
        return cached.value;
      }

      // Cache miss - execute method
      const result = originalMethod.apply(this, args);

      // Handle both sync and async methods
      if (result instanceof Promise) {
        return result.then((resolvedResult: any) => {
          cacheStorage.set(key, {
            value: resolvedResult,
            expiry: Date.now() + ttl
          });
          logger.debug(`[${className}] CacheResult miss for ${key}, cached result`);
          return resolvedResult;
        });
      }

      // Synchronous method
      cacheStorage.set(key, {
        value: result,
        expiry: Date.now() + ttl
      });
      logger.debug(`[${className}] CacheResult miss for ${key}, cached result`);

      return result;
    };

    return descriptor;
  };
}

/**
 * Clear cache entry by key
 *
 * @param key - Cache key to clear
 * @returns True if entry was cleared
 */
export function clearCache(key: string): boolean {
  return cacheStorage.delete(key);
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  cacheStorage.clear();
}

/**
 * Get cache statistics
 *
 * @returns Cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cacheStorage.size,
    keys: Array.from(cacheStorage.keys())
  };
}
