/**
 * Context Lazy Loader — On-demand context loading
 *
 * OPT-02: Lazy loading of context sources
 * OPT-05: Optimized relevance scoring
 *
 * Features:
 * - On-demand file loading
 * - Streaming content retrieval
 * - Relevance-based early termination
 * - Parallel loading with concurrency control
 *
 * Target Metrics:
 * - Initial load time: 50% reduction
 * - Memory usage: 40% reduction
 * - Unnecessary reads avoided: 60%
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import micromatch from 'micromatch';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

/**
 * Lazy loaded content entry
 */
export interface LazyContentEntry {
  path: string;
  size: number;
  loaded: boolean;
  content?: string;
  loadTime?: number;
  relevanceScore?: number;
}

/**
 * Lazy loader statistics
 */
export interface LazyLoaderStats {
  totalFiles: number;
  loadedFiles: number;
  skippedFiles: number;
  totalBytes: number;
  loadedBytes: number;
  averageLoadTime: number;
}

/**
 * Context Lazy Loader class
 *
 * Implements on-demand loading with:
 * - Deferred file reads
 * - Relevance-based filtering
 * - Parallel loading with limits
 */
export class ContextLazyLoader {
  private readonly entries: Map<string, LazyContentEntry>;
  private readonly maxConcurrency: number;
  private stats: {
    totalFiles: number;
    loadedFiles: number;
    skippedFiles: number;
    totalBytes: number;
    loadedBytes: number;
    loadTimes: number[];
  };

  constructor(options: { maxConcurrency?: number } = {}) {
    this.entries = new Map();
    this.maxConcurrency = options.maxConcurrency || 5;
    this.stats = {
      totalFiles: 0,
      loadedFiles: 0,
      skippedFiles: 0,
      totalBytes: 0,
      loadedBytes: 0,
      loadTimes: []
    };
  }

  /**
   * Scan directory for matching files (metadata only)
   * @param dir - Directory to scan
   * @param patterns - Glob patterns to match
   */
  async scanDirectory(dir: string, patterns: string[]): Promise<void> {
    const scan = async (currentDir: string): Promise<void> => {
      try {
        const items = await readdir(currentDir);
        
        for (const item of items) {
          if (item.startsWith('.') && item !== '.git') {
            continue;
          }
          
          const fullPath = path.join(currentDir, item);
          const stats = await stat(fullPath);
          
          if (stats.isDirectory()) {
            await scan(fullPath);
          } else if (stats.isFile()) {
            const relativePath = path.relative(dir, fullPath);
            
            if (micromatch.isMatch(relativePath, patterns)) {
              this.entries.set(fullPath, {
                path: fullPath,
                size: stats.size,
                loaded: false
              });
              this.stats.totalFiles++;
              this.stats.totalBytes += stats.size;
            }
          }
        }
      } catch (error) {
        console.warn(`[ContextLazyLoader] Scan error for ${currentDir}:`, error);
      }
    };
    
    await scan(dir);
  }

  /**
   * Load content for a specific file
   * @param filePath - Path to file
   * @returns Content entry
   */
  async loadFile(filePath: string): Promise<LazyContentEntry> {
    const entry = this.entries.get(filePath);
    
    if (!entry) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    if (entry.loaded) {
      return entry;
    }
    
    const startTime = Date.now();
    
    try {
      const content = await readFile(filePath, 'utf-8');
      const loadTime = Date.now() - startTime;
      
      entry.content = content;
      entry.loaded = true;
      entry.loadTime = loadTime;
      
      this.stats.loadedFiles++;
      this.stats.loadedBytes += content.length;
      this.stats.loadTimes.push(loadTime);
      
      return entry;
    } catch (error) {
      console.warn(`[ContextLazyLoader] Load error for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Load multiple files with concurrency control
   * @param filePaths - Paths to load
   * @returns Loaded content entries
   */
  async loadFiles(filePaths: string[]): Promise<LazyContentEntry[]> {
    const results: LazyContentEntry[] = [];
    
    // Process in batches
    for (let i = 0; i < filePaths.length; i += this.maxConcurrency) {
      const batch = filePaths.slice(i, i + this.maxConcurrency);
      const batchResults = await Promise.all(
        batch.map(path => this.loadFile(path).catch(() => null))
      );
      results.push(...batchResults.filter(Boolean) as LazyContentEntry[]);
    }
    
    return results;
  }

  /**
   * Load files by relevance score (highest first)
   * @param scores - Map of file paths to relevance scores
   * @param maxFiles - Maximum files to load
   * @returns Loaded content entries
   */
  async loadByRelevance(
    scores: Map<string, number>,
    maxFiles: number = 10
  ): Promise<LazyContentEntry[]> {
    // Sort by relevance score
    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxFiles)
      .map(([path]) => path);
    
    // Update relevance scores in entries
    for (const [filePath, score] of scores.entries()) {
      const entry = this.entries.get(filePath);
      if (entry) {
        entry.relevanceScore = score;
      }
    }
    
    return this.loadFiles(sorted);
  }

  /**
   * Get all entries (loaded and unloaded)
   * @returns Array of content entries
   */
  getAllEntries(): LazyContentEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Get only loaded entries
   * @returns Array of loaded content entries
   */
  getLoadedEntries(): LazyContentEntry[] {
    return Array.from(this.entries.values()).filter(e => e.loaded);
  }

  /**
   * Get loader statistics
   * @returns Loader statistics
   */
  getStats(): LazyLoaderStats {
    const avgLoadTime = this.stats.loadTimes.length > 0
      ? this.stats.loadTimes.reduce((a, b) => a + b, 0) / this.stats.loadTimes.length
      : 0;
    
    return {
      totalFiles: this.stats.totalFiles,
      loadedFiles: this.stats.loadedFiles,
      skippedFiles: this.stats.totalFiles - this.stats.loadedFiles,
      totalBytes: this.stats.totalBytes,
      loadedBytes: this.stats.loadedBytes,
      averageLoadTime: avgLoadTime
    };
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
    this.stats = {
      totalFiles: 0,
      loadedFiles: 0,
      skippedFiles: 0,
      totalBytes: 0,
      loadedBytes: 0,
      loadTimes: []
    };
  }

  /**
   * Unload specific file to free memory
   * @param filePath - Path to unload
   */
  unloadFile(filePath: string): void {
    const entry = this.entries.get(filePath);
    if (entry && entry.loaded) {
      entry.content = undefined;
      entry.loaded = false;
      this.stats.loadedFiles--;
      this.stats.loadedBytes -= entry.size;
    }
  }

  /**
   * Unload least relevant files to free memory
   * @param targetBytes - Target bytes to free
   */
  unloadLeastRelevant(targetBytes: number): number {
    const unloaded = Array.from(this.entries.values())
      .filter(e => e.loaded && e.content)
      .sort((a, b) => (a.relevanceScore || 0) - (b.relevanceScore || 0));
    
    let freedBytes = 0;
    
    for (const entry of unloaded) {
      if (freedBytes >= targetBytes) break;
      
      freedBytes += entry.content?.length || 0;
      entry.content = undefined;
      entry.loaded = false;
      this.stats.loadedFiles--;
    }
    
    return freedBytes;
  }
}

export default ContextLazyLoader;
