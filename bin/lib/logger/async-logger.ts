/**
 * Async Logger — Non-blocking logging with batching
 *
 * LOG-01: Log compression
 * LOG-02: Async logging
 *
 * Features:
 * - Non-blocking log writes
 * - Batch processing for efficiency
 * - Log compression for storage
 * - Priority-based log flushing
 *
 * Target Metrics:
 * - Log write latency: <1ms (async)
 * - Throughput: 1000+ logs/sec
 * - Storage savings: 50%+ (compression)
 */

import { createWriteStream } from 'fs';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipPromise = promisify(gzip);

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  module?: string;
  traceId?: string;
  context?: Record<string, unknown>;
}

/**
 * Async logger configuration
 */
export interface AsyncLoggerConfig {
  /** Batch size for flushing (default: 100) */
  batchSize?: number;
  /** Flush interval in ms (default: 1000) */
  flushInterval?: number;
  /** Enable compression (default: false) */
  compress?: boolean;
  /** Log file path (default: none, console only) */
  logFile?: string;
  /** Max buffer size before forced flush (default: 1000) */
  maxBufferSize?: number;
}

/**
 * Async Logger class
 *
 * Implements non-blocking logging:
 * - In-memory buffering
 * - Batch writes to disk
 * - Optional gzip compression
 * - Priority-based flushing
 */
export class AsyncLogger {
  private readonly buffer: Array<{ entry: LogEntry; priority: number; resolve: () => void }>;
  private readonly config: Required<AsyncLoggerConfig>;
  private writeStream?: ReturnType<typeof createWriteStream>;
  private flushTimer?: NodeJS.Timeout;
  private isFlushing = false;
  private stats: {
    logsWritten: number;
    logsCompressed: number;
    bytesSaved: number;
    flushCount: number;
    averageFlushTime: number;
    flushTimes: number[];
  };

  constructor(config: AsyncLoggerConfig = {}) {
    this.buffer = [];
    this.config = {
      batchSize: config.batchSize || 100,
      flushInterval: config.flushInterval || 1000,
      compress: config.compress || false,
      logFile: config.logFile || '',
      maxBufferSize: config.maxBufferSize || 1000
    };
    this.stats = {
      logsWritten: 0,
      logsCompressed: 0,
      bytesSaved: 0,
      flushCount: 0,
      averageFlushTime: 0,
      flushTimes: []
    };

    // Initialize write stream if log file specified
    if (this.config.logFile) {
      this.writeStream = createWriteStream(this.config.logFile, { flags: 'a' });
    }

    // Start flush timer
    this.startFlushTimer();
  }

  /**
   * Log an entry (async, non-blocking)
   * @param entry - Log entry
   * @param priority - Priority for flushing (higher = flushed first)
   * @returns Promise that resolves when logged
   */
  log(entry: LogEntry, priority: number = 5): Promise<void> {
    return new Promise((resolve) => {
      this.buffer.push({ entry, priority, resolve });

      // Force flush if buffer is full
      if (this.buffer.length >= this.config.maxBufferSize) {
        this.flush();
      }
    });
  }

  /**
   * Log error level
   * @param message - Error message
   * @param context - Additional context
   * @param module - Module name
   */
  error(message: string, context?: Record<string, unknown>, module?: string): Promise<void> {
    return this.log({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      module,
      context
    }, 10); // High priority for errors
  }

  /**
   * Log warn level
   * @param message - Warning message
   * @param context - Additional context
   * @param module - Module name
   */
  warn(message: string, context?: Record<string, unknown>, module?: string): Promise<void> {
    return this.log({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      module,
      context
    }, 7);
  }

  /**
   * Log info level
   * @param message - Info message
   * @param context - Additional context
   * @param module - Module name
   */
  info(message: string, context?: Record<string, unknown>, module?: string): Promise<void> {
    return this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      module,
      context
    }, 5);
  }

  /**
   * Log debug level
   * @param message - Debug message
   * @param context - Additional context
   * @param module - Module name
   */
  debug(message: string, context?: Record<string, unknown>, module?: string): Promise<void> {
    return this.log({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      module,
      context
    }, 3); // Low priority for debug
  }

  /**
   * Flush the buffer to disk
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }

    this.isFlushing = true;
    const startTime = Date.now();

    // Sort by priority (highest first)
    this.buffer.sort((a, b) => b.priority - a.priority);

    // Take batch
    const batch = this.buffer.splice(0, this.config.batchSize);
    const entries = batch.map(({ entry }) => entry);

    try {
      // Format logs
      let logData = entries.map(e => JSON.stringify(e)).join('\n') + '\n';

      // Compress if enabled
      if (this.config.compress && logData.length > 1024) {
        const originalSize = Buffer.byteLength(logData);
        const compressed = await gzipPromise(logData);
        logData = compressed.toString('base64');
        
        this.stats.logsCompressed += entries.length;
        this.stats.bytesSaved += originalSize - compressed.length;
      }

      // Write to file
      if (this.writeStream) {
        await this.writeToStream(logData);
      }

      // Update stats
      this.stats.logsWritten += entries.length;
      this.stats.flushCount++;
      const flushTime = Date.now() - startTime;
      this.stats.flushTimes.push(flushTime);
      this.stats.averageFlushTime = this.stats.flushTimes.reduce((a, b) => a + b, 0) / this.stats.flushTimes.length;

      // Resolve promises
      batch.forEach(({ resolve }) => resolve());
    } catch (error) {
      console.error('[AsyncLogger] Flush error:', error);
      // Still resolve to prevent blocking
      batch.forEach(({ resolve }) => resolve());
    } finally {
      this.isFlushing = false;

      // Continue flushing if more items in buffer
      if (this.buffer.length > 0) {
        this.flush();
      }
    }
  }

  /**
   * Write to stream with promise
   * @param data - Data to write
   */
  private writeToStream(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.writeStream) {
        resolve();
        return;
      }

      const canContinue = this.writeStream.write(data);
      if (canContinue) {
        resolve();
      } else {
        this.writeStream.once('drain', resolve);
        this.writeStream.once('error', reject);
      }
    });
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);

    // Unref to allow process to exit
    this.flushTimer.unref();
  }

  /**
   * Stop the logger and flush remaining logs
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Flush remaining
    await this.flush();

    // Close write stream
    if (this.writeStream) {
      await new Promise<void>((resolve) => {
        this.writeStream?.end(() => resolve());
      });
    }
  }

  /**
   * Get logger statistics
   * @returns Statistics object
   */
  getStats(): {
    logsWritten: number;
    logsCompressed: number;
    bytesSaved: number;
    flushCount: number;
    averageFlushTime: number;
    bufferSize: number;
  } {
    return {
      logsWritten: this.stats.logsWritten,
      logsCompressed: this.stats.logsCompressed,
      bytesSaved: this.stats.bytesSaved,
      flushCount: this.stats.flushCount,
      averageFlushTime: this.stats.averageFlushTime,
      bufferSize: this.buffer.length
    };
  }

  /**
   * Clear statistics
   */
  clearStats(): void {
    this.stats = {
      logsWritten: 0,
      logsCompressed: 0,
      bytesSaved: 0,
      flushCount: 0,
      averageFlushTime: 0,
      flushTimes: []
    };
  }
}

export default AsyncLogger;
