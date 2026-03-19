#!/usr/bin/env node

/**
 * Context Cache (Session-Only)
 *
 * Provides temporary, session-only caching for fetched content.
 * Cache is stored in system temp directory and auto-cleared on process exit.
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

class ContextCache {
  constructor() {
    // Cache stored in system temp directory with PID for isolation
    this.cacheDir = path.join(os.tmpdir(), `ez-agents-context-${process.pid}`);
    this.cache = new Map();
    
    // Register process exit handlers
    this._registerExitHandlers();
  }

  /**
   * Register process exit handlers to clean up cache
   * @private
   */
  _registerExitHandlers() {
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
   * @param {string} key - The cache key (usually URL or file path)
   * @returns {{content: string, timestamp: number, type: string, contentType?: string}|undefined}
   */
  get(key) {
    return this.cache.get(key);
  }

  /**
   * Store content in cache
   * @param {string} key - The cache key
   * @param {string} content - The content to cache
   * @param {Object} metadata - Additional metadata (type, contentType, etc.)
   */
  set(key, content, metadata = {}) {
    this.cache.set(key, {
      content,
      ...metadata,
      timestamp: Date.now()
    });
  }

  /**
   * Check if key exists in cache
   * @param {string} key - The cache key
   * @returns {boolean} - True if key exists
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Remove item from cache
   * @param {string} key - The cache key
   * @returns {boolean} - True if item was removed
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Get the size of the cache
   * @returns {number} - Number of items in cache
   */
  size() {
    return this.cache.size;
  }

  /**
   * Clear all cached content and remove temp directory
   */
  clear() {
    // Clear the in-memory cache
    this.cache.clear();

    // Remove temp directory if it exists
    if (fs.existsSync(this.cacheDir)) {
      try {
        fs.rmSync(this.cacheDir, { recursive: true, force: true });
      } catch (err) {
        // Ignore errors during cleanup (directory may already be gone)
      }
    }
  }

  /**
   * Get cache directory path
   * @returns {string} - Path to cache directory
   */
  getCacheDir() {
    return this.cacheDir;
  }

  /**
   * Get all cache keys
   * @returns {Array<string>} - Array of cache keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all cached entries
   * @returns {Array<{key: string, value: Object}>} - Array of key-value pairs
   */
  entries() {
    return Array.from(this.cache.entries()).map(([key, value]) => ({ key, value }));
  }

  /**
   * Get cache statistics
   * @returns {{size: number, keys: Array<string>}} - Cache statistics
   */
  stats() {
    return {
      size: this.cache.size,
      keys: this.keys()
    };
  }
}

module.exports = ContextCache;
