#!/usr/bin/env node

/**
 * Error Cache — Track recurring errors for deduplication
 *
 * Stores error fingerprints and counts occurrences to identify
 * recurring issues vs. one-time failures.
 */

import { LogExecution } from './decorators/index.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface ErrorInfo {
  name: string;
  message: string;
  stack?: string;
}

export interface ErrorEntry {
  count: number;
  firstSeen: number;
  lastSeen: number;
  error: ErrorInfo;
  context: Record<string, any>;
}

// ─── ErrorCache Class ────────────────────────────────────────────────────────

export class ErrorCache {
  private cache: Map<string, ErrorEntry>;
  private maxSize: number;

  /**
   * Create an ErrorCache instance
   */
  constructor() {
    this.cache = new Map();
    this.maxSize = 1000;
  }

  /**
   * Generate a fingerprint for an error
   * @param error - The error to fingerprint
   * @returns Error fingerprint
   */
  @LogExecution('ErrorCache.fingerprint', { logParams: false })
  fingerprint(error: Error): string {
    if (!error) return 'unknown';
    const name = error.name || 'Error';
    const message = error.message || '';
    const stack = error.stack || '';
    const firstLine = stack.split('\n')[1] || '';
    return `${name}:${message}:${firstLine}`;
  }

  /**
   * Record an error occurrence
   * @param error - The error to record
   * @param context - Additional context
   * @returns Error fingerprint
   */
  @LogExecution('ErrorCache.record', { logParams: false })
  record(error: Error, context: Record<string, any> = {}): string {
    const fp = this.fingerprint(error);
    const entry = this.cache.get(fp);

    if (entry) {
      entry.count++;
      entry.lastSeen = Date.now();
      entry.context = context;
    } else {
      if (this.cache.size >= this.maxSize) {
        // Remove oldest entry
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) {
          this.cache.delete(oldestKey);
        }
      }

      this.cache.set(fp, {
        count: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        error: {
          name: error.name,
          message: error.message,
          ...(error.stack && { stack: error.stack })
        },
        context
      });
    }

    return fp;
  }

  /**
   * Check if an error is recurring (seen more than once)
   * @param fingerprint - Error fingerprint
   * @returns True if error has been seen before
   */
  @LogExecution('ErrorCache.isRecurring', { logParams: false })
  isRecurring(fingerprint: string): boolean {
    const entry = this.cache.get(fingerprint);
    return entry !== undefined && entry.count > 1;
  }

  /**
   * Get error entry by fingerprint
   * @param fingerprint - Error fingerprint
   * @returns Error entry or undefined
   */
  @LogExecution('ErrorCache.get', { logParams: false })
  get(fingerprint: string): ErrorEntry | undefined {
    return this.cache.get(fingerprint);
  }

  /**
   * Clear the error cache
   */
  @LogExecution('ErrorCache.clear', { logParams: false })
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  @LogExecution('ErrorCache.stats', { logParams: false })
  stats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  /**
   * Get all error entries
   * @returns Array of error entries
   */
  @LogExecution('ErrorCache.getAll', { logParams: false })
  getAll(): ErrorEntry[] {
    return Array.from(this.cache.values());
  }
}

// Default export for backward compatibility
export default ErrorCache;
