/**
 * Consolidated Utilities
 *
 * Phase 27: CODE-02 - Utility consolidation
 *
 * Combines commonly used utility functions into a single module
 * to reduce imports and improve code organization.
 */

import * as path from 'path';
import * as fs from 'fs';
import { createHash } from 'crypto';

/**
 * String utilities
 */
export const stringUtils = {
  /**
   * Convert string to camelCase
   */
  toCamelCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^[A-Z]/, c => c.toLowerCase());
  },

  /**
   * Convert string to kebab-case
   */
  toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  },

  /**
   * Convert string to PascalCase
   */
  toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^[a-z]/, c => c.toUpperCase());
  },

  /**
   * Truncate string to max length
   */
  truncate(str: string, maxLength: number, suffix: string = '...'): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - suffix.length) + suffix;
  },

  /**
   * Escape special regex characters
   */
  escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
};

/**
 * Array utilities
 */
export const arrayUtils = {
  /**
   * Remove duplicates from array
   */
  unique<T>(arr: T[]): T[] {
    return [...new Set(arr)];
  },

  /**
   * Chunk array into smaller arrays
   */
  chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  },

  /**
   * Group array by key
   */
  groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return arr.reduce((acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  },

  /**
   * Flatten nested array
   */
  flatten<T>(arr: T[][]): T[] {
    return arr.flat();
  },

  /**
   * Interleave multiple arrays
   */
  interleave<T>(...arrays: T[][]): T[] {
    const maxLength = Math.max(...arrays.map(a => a.length));
    const result: T[] = [];
    for (let i = 0; i < maxLength; i++) {
      for (const arr of arrays) {
        if (i < arr.length) result.push(arr[i]);
      }
    }
    return result;
  }
};

/**
 * Object utilities
 */
export const objectUtils = {
  /**
   * Deep clone an object
   */
  deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Pick specific keys from object
   */
  pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    for (const key of keys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
    return result;
  },

  /**
   * Omit specific keys from object
   */
  omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj };
    for (const key of keys) {
      delete result[key];
    }
    return result as Omit<T, K>;
  },

  /**
   * Deep merge objects
   */
  deepMerge<T extends Record<string, unknown>>(target: T, ...sources: Partial<T>[]): T {
    const result = { ...target };
    for (const source of sources) {
      for (const key in source) {
        if (source[key] instanceof Object && key in result) {
          result[key] = this.deepMerge(result[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
        } else {
          result[key] = source[key];
        }
      }
    }
    return result;
  },

  /**
   * Check if object is empty
   */
  isEmpty(obj: Record<string, unknown>): boolean {
    return Object.keys(obj).length === 0;
  }
};

/**
 * File utilities
 */
export const fileUtils = {
  /**
   * Ensure directory exists
   */
  ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  },

  /**
   * Read file safely
   */
  readFileSync(filePath: string, encoding: BufferEncoding = 'utf-8'): string | null {
    try {
      return fs.readFileSync(filePath, encoding);
    } catch {
      return null;
    }
  },

  /**
   * Write file safely
   */
  writeFileSync(filePath: string, content: string): boolean {
    try {
      this.ensureDir(path.dirname(filePath));
      fs.writeFileSync(filePath, content);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get file hash
   */
  hashFile(filePath: string): string | null {
    try {
      const content = fs.readFileSync(filePath);
      return createHash('sha256').update(content).digest('hex');
    } catch {
      return null;
    }
  },

  /**
   * Get file extension
   */
  getExtension(filePath: string): string {
    return path.extname(filePath).slice(1);
  },

  /**
   * Get file name without extension
   */
  getBasename(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }
};

/**
 * Promise utilities
 */
export const promiseUtils = {
  /**
   * Sleep for specified milliseconds
   */
  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Retry a function with exponential backoff
   */
  async retry<T>(fn: () => Promise<T>, maxRetries: number = 3, baseDelay: number = 1000): Promise<T> {
    let lastError: Error | undefined;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const delay = baseDelay * Math.pow(2, i);
        await this.sleep(delay);
      }
    }
    throw lastError;
  },

  /**
   * Run promises with concurrency limit
   */
  async mapWithConcurrency<T, R>(
    items: T[],
    fn: (item: T, index: number) => Promise<R>,
    concurrency: number = 5
  ): Promise<R[]> {
    const results: R[] = [];
    const executing: Promise<void>[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const index = i;
      const promise = Promise.resolve().then(async () => {
        results[index] = await fn(item, index);
        executing.splice(executing.indexOf(promise), 1);
      });
      executing.push(promise);
      
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }
    
    await Promise.all(executing);
    return results;
  },

  /**
   * Timeout wrapper for promises
   */
  async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]);
  }
};

/**
 * Number utilities
 */
export const numberUtils = {
  /**
   * Clamp number between min and max
   */
  clamp(num: number, min: number, max: number): number {
    return Math.min(Math.max(num, min), max);
  },

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  },

  /**
   * Format number with commas
   */
  formatNumber(num: number): string {
    return num.toLocaleString();
  },

  /**
   * Calculate percentage
   */
  percentage(part: number, whole: number, decimals: number = 2): number {
    return whole > 0 ? parseFloat(((part / whole) * 100).toFixed(decimals)) : 0;
  },

  /**
   * Round to specified decimals
   */
  round(num: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }
};

/**
 * Combined consolidated utilities export
 */
export const utils = {
  string: stringUtils,
  array: arrayUtils,
  object: objectUtils,
  file: fileUtils,
  promise: promiseUtils,
  number: numberUtils
};

export default utils;
