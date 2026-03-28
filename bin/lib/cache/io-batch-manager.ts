/**
 * I/O Batch Manager — Batched I/O operations
 *
 * Phase 29: CACHE-04 - I/O batching optimization
 *
 * Features:
 * - Read batching (combine multiple reads)
 * - Write batching (combine multiple writes)
 * - Debounced operations
 * - Priority queuing
 *
 * Target Metrics:
 * - I/O operations reduction: 70%+
 * - Throughput improvement: 3x+
 * - Latency reduction: 50%+
 */

import * as fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

/**
 * I/O operation type
 */
export type IOOperationType = 'read' | 'write';

/**
 * I/O operation request
 */
export interface IORequest {
  /** Operation type */
  type: IOOperationType;
  /** File path */
  path: string;
  /** Content (for writes) */
  content?: string;
  /** Priority (higher = processed first) */
  priority: number;
  /** Resolve function */
  resolve: (result?: string) => void;
  /** Reject function */
  reject: (error: Error) => void;
}

/**
 * I/O Batch Manager configuration
 */
export interface IOBatchConfig {
  /** Batch size (default: 50) */
  batchSize?: number;
  /** Batch interval in ms (default: 100) */
  batchInterval?: number;
  /** Max concurrent operations (default: 5) */
  maxConcurrent?: number;
}

/**
 * I/O Batch Manager class
 *
 * Implements batched I/O operations:
 * - Read batching
 * - Write batching
 * - Priority queuing
 * - Concurrency control
 */
export class IOBatchManager {
  private readonly queue: IORequest[];
  private readonly config: Required<IOBatchConfig>;
  private processing: boolean;
  private batchTimer?: NodeJS.Timeout;
  private stats: {
    totalRequests: number;
    batchesProcessed: number;
    readsBatched: number;
    writesBatched: number;
    averageBatchSize: number;
    batchSizes: number[];
  };

  constructor(config: IOBatchConfig = {}) {
    this.queue = [];
    this.config = {
      batchSize: config.batchSize || 50,
      batchInterval: config.batchInterval || 100,
      maxConcurrent: config.maxConcurrent || 5
    };
    this.processing = false;
    this.stats = {
      totalRequests: 0,
      batchesProcessed: 0,
      readsBatched: 0,
      writesBatched: 0,
      averageBatchSize: 0,
      batchSizes: []
    };

    // Start batch timer
    this.startBatchTimer();
  }

  /**
   * Read file with batching
   * @param path - File path
   * @param priority - Priority (0-10)
   * @returns File content
   */
  read(path: string, priority: number = 5): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        type: 'read',
        path,
        priority,
        resolve: (result) => resolve(result || ''),
        reject
      });
      this.stats.totalRequests++;
      this.stats.readsBatched++;

      // Process immediately if queue is full
      if (this.queue.length >= this.config.batchSize) {
        this.processBatch();
      }
    });
  }

  /**
   * Write file with batching
   * @param path - File path
   * @param content - Content to write
   * @param priority - Priority (0-10)
   */
  write(path: string, content: string, priority: number = 5): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        type: 'write',
        path,
        content,
        priority,
        resolve: () => resolve(),
        reject
      });
      this.stats.totalRequests++;
      this.stats.writesBatched++;

      // Process immediately if queue is full
      if (this.queue.length >= this.config.batchSize) {
        this.processBatch();
      }
    });
  }

  /**
   * Start batch timer
   */
  private startBatchTimer(): void {
    this.batchTimer = setInterval(() => {
      if (this.queue.length > 0 && !this.processing) {
        this.processBatch();
      }
    }, this.config.batchInterval);

    this.batchTimer.unref();
  }

  /**
   * Process a batch of I/O operations
   */
  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    // Sort by priority (highest first)
    this.queue.sort((a, b) => b.priority - a.priority);

    // Take batch
    const batch = this.queue.splice(0, this.config.batchSize);
    
    // Update stats
    this.stats.batchesProcessed++;
    this.stats.batchSizes.push(batch.length);
    this.stats.averageBatchSize = 
      this.stats.batchSizes.reduce((a, b) => a + b, 0) / this.stats.batchSizes.length;

    try {
      // Group by type for efficient processing
      const reads = batch.filter(r => r.type === 'read');
      const writes = batch.filter(r => r.type === 'write');

      // Process reads with concurrency control
      const readResults = await this.processWithConcurrency(reads, async (req) => {
        return readFile(req.path, 'utf-8');
      });

      // Process writes with concurrency control
      const writeResults = await this.processWithConcurrency(writes, async (req) => {
        await writeFile(req.path, req.content || '', 'utf-8');
        return undefined;
      });

      // Resolve promises
      readResults.forEach(({ req, result, error }) => {
        if (error) req.reject(error);
        else req.resolve(result);
      });

      writeResults.forEach(({ req, error }) => {
        if (error) req.reject(error);
        else req.resolve();
      });
    } catch (error) {
      // Reject all in batch
      batch.forEach(req => req.reject(error as Error));
    } finally {
      this.processing = false;

      // Continue processing if more items
      if (this.queue.length > 0) {
        this.processBatch();
      }
    }
  }

  /**
   * Process operations with concurrency control
   */
  private async processWithConcurrency<T>(
    items: IORequest[],
    processor: (req: IORequest) => Promise<T>
  ): Promise<Array<{ req: IORequest; result?: T; error?: Error }>> {
    const results: Array<{ req: IORequest; result?: T; error?: Error }> = [];
    const executing: Promise<void>[] = [];

    for (const item of items) {
      const promise = Promise.resolve().then(async () => {
        try {
          const result = await processor(item);
          results.push({ req: item, result });
        } catch (error) {
          results.push({ req: item, error: error as Error });
        } finally {
          executing.splice(executing.indexOf(promise), 1);
        }
      });
      executing.push(promise);

      if (executing.length >= this.config.maxConcurrent) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Get I/O statistics
   */
  getStats(): {
    totalRequests: number;
    batchesProcessed: number;
    readsBatched: number;
    writesBatched: number;
    averageBatchSize: number;
    queueLength: number;
    ioReduction: number;
  } {
    const ioReduction = this.stats.totalRequests > 0
      ? 1 - (this.stats.batchesProcessed * this.stats.averageBatchSize) / this.stats.totalRequests
      : 0;

    return {
      totalRequests: this.stats.totalRequests,
      batchesProcessed: this.stats.batchesProcessed,
      readsBatched: this.stats.readsBatched,
      writesBatched: this.stats.writesBatched,
      averageBatchSize: this.stats.averageBatchSize,
      queueLength: this.queue.length,
      ioReduction
    };
  }

  /**
   * Stop the batch manager and process remaining items
   */
  async stop(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = undefined;
    }

    // Process remaining items
    if (this.queue.length > 0) {
      await this.processBatch();
    }
  }

  /**
   * Clear the queue without processing
   */
  clear(): void {
    this.queue.length = 0;
    this.stats = {
      totalRequests: 0,
      batchesProcessed: 0,
      readsBatched: 0,
      writesBatched: 0,
      averageBatchSize: 0,
      batchSizes: []
    };
  }
}

export default IOBatchManager;
