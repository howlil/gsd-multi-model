/**
 * Context Cache (Session-Only)
 *
 * Provides temporary, session-only caching for fetched content.
 * Cache is stored in system temp directory and auto-cleared on process exit.
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Cache entry metadata
 */
export interface CacheEntry {
  content: string;
  type: string;
  contentType?: string;
  timestamp: number;
  [key: string]: unknown;
}

/**
 * Cache entry input (without required type for flexibility)
 */
export interface CacheEntryInput {
  type?: string;
  contentType?: string;
  timestamp?: number;
  [key: string]: unknown;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number;
  keys: string[];
}

/**
 * ContextCache class for session-only caching
 */
export class ContextCache {
  private cacheDir: string;
  private cache: Map<string, CacheEntry>;

  constructor() {
    // Cache stored in system temp directory with PID for isolation
    this.cacheDir = path.join(os.tmpdir(), `ez-agents-context-${process.pid}`);
    this.cache = new Map<string, CacheEntry>();

    // Register process exit handlers
    this._registerExitHandlers();
  }

  /**
   * Register process exit handlers to clean up cache
   * @private
   */
  private _registerExitHandlers(): void {
    // Clean up on normal exit
    process.on('exit', () => {
      this.clear();
    });

    // Clean up on SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      this.clear();
      process.exit(130);
    });

    // Clean up on SIGTERM
    process.on('SIGTERM', () => {
      this.clear();
      process.exit(143);
    });

    // Clean up on uncaught exceptions
    process.on('uncaughtException', () => {
      this.clear();
    });
  }

  /**
   * Get cached content by key
   * @param key - The cache key (usually URL or file path)
   * @returns Cached entry or undefined
   */
  get(key: string): CacheEntry | undefined {
    return this.cache.get(key);
  }

  /**
   * Store content in cache
   * @param key - The cache key
   * @param content - The content to cache
   * @param metadata - Additional metadata (type, contentType, etc.)
   */
  set(key: string, content: string, metadata: CacheEntryInput = {}): void {
    const entry: CacheEntry = {
      content,
      type: metadata.type ?? 'unknown',
      timestamp: metadata.timestamp ?? Date.now()
    };
    
    if (metadata.contentType !== undefined) {
      entry.contentType = metadata.contentType;
    }
    
    // Copy any additional metadata properties
    Object.assign(entry, metadata);
    
    this.cache.set(key, entry);
  }

  /**
   * Check if key exists in cache
   * @param key - The cache key
   * @returns True if key exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove item from cache
   * @param key - The cache key
   * @returns True if item was removed
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Get the size of the cache
   * @returns Number of items in cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clear all cached content and remove temp directory
   */
  clear(): void {
    // Clear the in-memory cache
    this.cache.clear();

    // Remove temp directory if it exists
    if (fs.existsSync(this.cacheDir)) {
      try {
        fs.rmSync(this.cacheDir, { recursive: true, force: true });
      } catch (_err) {
        // Ignore errors during cleanup (directory may already be gone)
      }
    }
  }

  /**
   * Get cache directory path
   * @returns Path to cache directory
   */
  getCacheDir(): string {
    return this.cacheDir;
  }

  /**
   * Get all cache keys
   * @returns Array of cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all cached entries
   * @returns Array of key-value pairs
   */
  entries(): Array<{ key: string; value: CacheEntry }> {
    return Array.from(this.cache.entries()).map(([key, value]) => ({ key, value }));
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  stats(): CacheStats {
    return {
      size: this.cache.size,
      keys: this.keys()
    };
  }
}

export default ContextCache;
