/**
 * CLI Performance Optimizer
 *
 * Phase 30: CLI Performance & Reliability (CLI-PERF-01 to CLI-PERF-07)
 * - CLI-PERF-01: Command caching
 * - CLI-PERF-02: Parallel command execution
 * - CLI-PERF-03: Timeout handling
 * - CLI-PERF-04: Memory optimization
 * - CLI-PERF-05: Progress tracking
 * - CLI-PERF-06: Error recovery
 * - CLI-PERF-07: Output buffering
 *
 * Target Metrics:
 * - Command execution time: -50%
 * - Memory usage: -40%
 * - Timeout handling: 100%
 * - Error recovery: 90%+
 */

import { spawn } from 'child_process';
import { createHash } from 'crypto';

/**
 * CLI command result
 */
export interface CLIResult {
  /** Exit code */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Execution time in ms */
  executionTime: number;
  /** Command that was executed */
  command: string;
  /** Whether command was cached */
  cached: boolean;
}

/**
 * CLI execution options
 */
export interface CLIOptions {
  /** Timeout in ms (default: 30000) */
  timeout?: number;
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Enable caching (default: false) */
  cache?: boolean;
  /** Cache TTL in ms (default: 300000) */
  cacheTTL?: number;
  /** Retry count (default: 0) */
  retries?: number;
  /** Retry delay in ms (default: 1000) */
  retryDelay?: number;
  /** Max memory in MB (default: 512) */
  maxMemory?: number;
  /** Enable progress tracking (default: false) */
  progress?: boolean;
}

/**
 * Progress event
 */
export interface ProgressEvent {
  /** Current line number */
  line: number;
  /** Total lines (if known) */
  total?: number;
  /** Percentage complete */
  percentage: number;
  /** Current output line */
  output: string;
}

/**
 * CLI Performance Optimizer class
 *
 * Implements CLI performance optimizations:
 * - Command caching
 * - Parallel execution
 * - Timeout handling
 * - Memory optimization
 * - Progress tracking
 * - Error recovery
 * - Output buffering
 */
export class CLIPerformanceOptimizer {
  private readonly cache: Map<string, { result: CLIResult; timestamp: number }>;
  private readonly defaultTTL: number;
  private readonly maxMemory: number;
  private stats: {
    commandsExecuted: number;
    cacheHits: number;
    cacheMisses: number;
    timeouts: number;
    retries: number;
    errors: number;
    totalExecutionTime: number;
  };

  constructor(options: { defaultTTL?: number; maxMemory?: number } = {}) {
    this.cache = new Map();
    this.defaultTTL = options.defaultTTL || 300000; // 5 min
    this.maxMemory = options.maxMemory || 512; // 512 MB
    this.stats = {
      commandsExecuted: 0,
      cacheHits: 0,
      cacheMisses: 0,
      timeouts: 0,
      retries: 0,
      errors: 0,
      totalExecutionTime: 0
    };
  }

  /**
   * Execute CLI command with optimizations
   * @param command - Command to execute
   * @param options - Execution options
   * @returns Command result
   */
  async execute(command: string, options: CLIOptions = {}): Promise<CLIResult> {
    const startTime = Date.now();
    this.stats.commandsExecuted++;

    // Check cache
    const cacheKey = this.generateCacheKey(command, options);
    if (options.cache !== false) {
      const cached = this.getFromCache(cacheKey, options.cacheTTL);
      if (cached) {
        this.stats.cacheHits++;
        return { ...cached, cached: true };
      }
    }
    this.stats.cacheMisses++;

    // Execute with retries
    let lastError: Error | undefined;
    const maxRetries = options.retries || 0;
    const retryDelay = options.retryDelay || 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeWithTimeout(command, options);
        const executionTime = Date.now() - startTime;
        
        this.stats.totalExecutionTime += executionTime;

        // Cache result
        if (options.cache !== false && result.exitCode === 0) {
          this.addToCache(cacheKey, { ...result, executionTime });
        }

        return { ...result, executionTime, cached: false };
      } catch (error) {
        lastError = error as Error;
        this.stats.errors++;
        
        if (attempt < maxRetries) {
          this.stats.retries++;
          await this.sleep(retryDelay * (attempt + 1)); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  /**
   * Execute multiple commands in parallel
   * @param commands - Commands to execute
   * @param options - Execution options
   * @param concurrency - Max concurrent commands (default: 5)
   * @returns Array of results
   */
  async executeParallel(
    commands: string[],
    options: CLIOptions = {},
    concurrency: number = 5
  ): Promise<CLIResult[]> {
    const results: CLIResult[] = [];
    const executing: Promise<void>[] = [];

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const index = i;
      
      const promise = Promise.resolve().then(async () => {
        results[index] = await this.execute(command, options);
        executing.splice(executing.indexOf(promise), 1);
      });
      
      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Execute command with timeout
   * @param command - Command to execute
   * @param options - Execution options
   * @returns Command result
   */
  private async executeWithTimeout(command: string, options: CLIOptions): Promise<CLIResult> {
    const timeout = options.timeout || 30000;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        maxBuffer: options.maxMemory ? options.maxMemory * 1024 * 1024 : 512 * 1024 * 1024
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Set timeout
      const timeoutId = setTimeout(() => {
        timedOut = true;
        this.stats.timeouts++;
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 5000); // Force kill after 5s
      }, timeout);

      // Collect output
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle completion
      child.on('close', (code) => {
        clearTimeout(timeoutId);
        
        if (timedOut) {
          reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
          return;
        }

        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
          executionTime: Date.now() - startTime,
          command,
          cached: false
        });
      });

      // Handle errors
      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  /**
   * Execute command with progress tracking
   * @param command - Command to execute
   * @param options - Execution options
   * @param onProgress - Progress callback
   * @returns Command result
   */
  async executeWithProgress(
    command: string,
    options: CLIOptions = {},
    onProgress: (event: ProgressEvent) => void
  ): Promise<CLIResult> {
    const startTime = Date.now();
    let lineCount = 0;

    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env }
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        const lines = data.toString().split('\n');
        lineCount += lines.length;
        stdout += data.toString();
        
        onProgress({
          line: lineCount,
          percentage: 0, // Unknown total
          output: lines[lines.length - 1]
        });
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
          executionTime: Date.now() - startTime,
          command,
          cached: false
        });
      });

      child.on('error', reject);
    });
  }

  /**
   * Get cached result
   * @param key - Cache key
   * @param ttl - TTL override
   * @returns Cached result or null
   */
  private getFromCache(key: string, ttl?: number): CLIResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const cacheTTL = ttl ?? this.defaultTTL;
    if (Date.now() - entry.timestamp > cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * Add result to cache
   * @param key - Cache key
   * @param result - Result to cache
   */
  private addToCache(key: string, result: CLIResult): void {
    // Limit cache size
    if (this.cache.size >= 1000) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Generate cache key
   * @param command - Command
   * @param options - Options
   * @returns Cache key
   */
  private generateCacheKey(command: string, options: CLIOptions): string {
    const keyData = JSON.stringify({ command, options });
    return createHash('sha256').update(keyData).digest('hex');
  }

  /**
   * Sleep for specified milliseconds
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get statistics
   * @returns Statistics object
   */
  getStats(): {
    commandsExecuted: number;
    cacheHits: number;
    cacheMisses: number;
    cacheHitRate: number;
    timeouts: number;
    retries: number;
    errors: number;
    averageExecutionTime: number;
  } {
    const total = this.stats.cacheHits + this.stats.cacheMisses;
    return {
      commandsExecuted: this.stats.commandsExecuted,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      cacheHitRate: total > 0 ? this.stats.cacheHits / total : 0,
      timeouts: this.stats.timeouts,
      retries: this.stats.retries,
      errors: this.stats.errors,
      averageExecutionTime: this.stats.commandsExecuted > 0
        ? this.stats.totalExecutionTime / this.stats.commandsExecuted
        : 0
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear statistics
   */
  clearStats(): void {
    this.stats = {
      commandsExecuted: 0,
      cacheHits: 0,
      cacheMisses: 0,
      timeouts: 0,
      retries: 0,
      errors: 0,
      totalExecutionTime: 0
    };
  }
}

export default CLIPerformanceOptimizer;
