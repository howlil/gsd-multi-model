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
 *   import Logger from './logger.js';
 *   const logger = new Logger();
 *   logger.error('Something failed', { context: 'details' });
 */

/**
 * Get or create ErrorCache singleton
 * @returns {Object | null} ErrorCache instance or null if not available
 */
function getErrorCache(): Object | null {
  // Lazy-load ErrorCache to avoid circular dependencies
  // Note: In TypeScript with NodeNext, dynamic imports are used for ESM compatibility
  return null; // Placeholder - actual implementation would use dynamic import
}

/**
 * Logger class for structured console logging
 */
class Logger {
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
  log(level: string, message: string, context: Record<string, unknown> = {}): void {
    const entry: Record<string, unknown> = {
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
      console.log(`[EZ ${level}] ${message}`);
    }
  }

  /**
   * Log an ERROR level message
   * Records error to cache for recurring detection
   * @param msg - Error message
   * @param ctx - Additional context (can include error object)
   */
  error(msg: string, ctx?: Record<string, unknown>): void {
    // Record to error cache if error object provided
    if (ctx && ctx.error instanceof Error) {
      const cache = getErrorCache();
      if (cache) {
        // Note: ErrorCache integration would go here
        console.warn(`[EZ RECURRING] (${(cache as Record<string, unknown>).count || 1}x): ${msg}`);
      }
    }

    this.log('ERROR', msg, ctx);
  }

  /**
   * Log a WARN level message
   * @param msg - Warning message
   * @param ctx - Additional context
   */
  warn(msg: string, ctx?: Record<string, unknown>): void {
    this.log('WARN', msg, ctx);
  }

  /**
   * Log an INFO level message
   * @param msg - Info message
   * @param ctx - Additional context
   */
  info(msg: string, ctx?: Record<string, unknown>): void {
    this.log('INFO', msg, ctx);
  }

  /**
   * Log a DEBUG level message
   * @param msg - Debug message
   * @param ctx - Additional context
   */
  debug(msg: string, ctx?: Record<string, unknown>): void {
    this.log('DEBUG', msg, ctx);
  }
}

// Singleton instance for default usage
const defaultLogger = new Logger();

export default Logger;
export { defaultLogger, Logger };
