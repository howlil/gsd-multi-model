#!/usr/bin/env node

/**
 * EZ Logger — Centralized logging module for EZ workflow
 *
 * Provides structured logging with levels (ERROR, WARN, INFO, DEBUG)
 * Logs to console only (no file logging)
 * Replaces silent catch {} blocks with proper error logging
 * Integrated with ErrorCache for recurring error detection
 *
 * Usage:
 *   import { Logger, defaultLogger } from './logger.js';
 *   const logger = new Logger();
 *   logger.error('Something failed', { context: 'details' });
 */

import { ErrorCache } from './error-cache.js';

// Lazy-load ErrorCache to avoid circular dependencies
let ErrorCacheInstance: ErrorCache | null = null;

/**
 * Get or create ErrorCache singleton
 * @returns ErrorCache instance or null
 */
function getErrorCache(): ErrorCache | null {
  if (!ErrorCacheInstance) {
    try {
      ErrorCacheInstance = new ErrorCache();
    } catch {
      // ErrorCache not available - continue without it
      ErrorCacheInstance = null;
    }
  }
  return ErrorCacheInstance;
}

export class Logger {
  /**
   * Create a Logger instance
   */
  constructor() {
    // No file logging - console only
  }

  /**
   * Write a log entry to console
   * @param level - Log level (ERROR, WARN, INFO, DEBUG)
   * @param message - Log message
   * @param context - Additional context data
   */
  log(level: string, message: string, context: Record<string, any> = {}): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      pid: process.pid
    };

    // Always output to console
    if (level === 'ERROR') {
      console.error(`[EZ ${level}] ${message}`);
    } else if (level === 'WARN') {
      console.warn(`[EZ ${level}] ${message}`);
    } else if (process.env.DEBUG === 'ez-agents') {
      // Only output INFO/DEBUG in debug mode
      console.log(`[EZ ${level}] ${message}`, entry);
    }
  }

  /**
   * Log an ERROR level message
   * Records error to cache for recurring detection
   * @param msg - Error message
   * @param ctx - Additional context (can include error object)
   */
  error(msg: string, ctx: Record<string, any> = {}): void {
    // Record to error cache if error object provided
    if (ctx && ctx.error instanceof Error) {
      const cache = getErrorCache();
      if (cache) {
        const fingerprint = cache.record(ctx.error, ctx);
        if (cache.isRecurring(fingerprint)) {
          const entry = cache.get(fingerprint);
          console.warn(`[EZ RECURRING] (${entry.count}x): ${msg}`);
        }
      }
    }

    this.log('ERROR', msg, ctx);
  }

  /**
   * Log a WARN level message
   * @param msg - Warning message
   * @param ctx - Additional context
   */
  warn(msg: string, ctx: Record<string, any> = {}): void {
    this.log('WARN', msg, ctx);
  }

  /**
   * Log an INFO level message
   * @param msg - Info message
   * @param ctx - Additional context
   */
  info(msg: string, ctx: Record<string, any> = {}): void {
    this.log('INFO', msg, ctx);
  }

  /**
   * Log a DEBUG level message (only shown in debug mode)
   * @param msg - Debug message
   * @param ctx - Additional context
   */
  debug(msg: string, ctx: Record<string, any> = {}): void {
    this.log('DEBUG', msg, ctx);
  }
}

// Default logger instance for convenience
export const defaultLogger = new Logger();

export default Logger;
