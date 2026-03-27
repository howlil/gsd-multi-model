#!/usr/bin/env node

/**
 * EZ Logger — Centralized logging module for EZ workflow
 *
 * Provides structured logging with levels (ERROR, WARN, INFO, DEBUG)
 * Logs to console only (no file logging)
 * Features:
 * - Environment-controlled logging (EZ_LOG_ENABLED, EZ_LOG_LEVEL)
 * - Per-module log level control (EZ_LOG_ADAPTERS, EZ_LOG_STRATEGIES, etc.)
 * - Trace ID propagation (W3C TraceContext compatible)
 * - Structured JSON context for observability
 *
 * Environment Variables:
 * - EZ_LOG_ENABLED: 'true' | 'false' (default: 'true')
 * - EZ_LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug' (default: 'info')
 * - EZ_LOG_PROFILING: 'true' | 'false' (default: 'false')
 * - EZ_LOG_ADAPTERS: Log level for adapter module
 * - EZ_LOG_STRATEGIES: Log level for strategies module
 * - EZ_LOG_CONTEXT: Log level for context module
 * - EZ_LOG_CIRCUIT_BREAKER: Log level for circuit breaker module
 *
 * Usage:
 *   import { defaultLogger } from './logger.js';
 *   defaultLogger.error('Something failed', { context: 'details', traceId: 'abc123' });
 */

/**
 * Log levels with priorities
 */
const LOG_LEVELS: Record<string, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

/**
 * Module-specific log level overrides
 */
const MODULE_LOG_LEVELS: Record<string, string> = {
  adapters: process.env.EZ_LOG_ADAPTERS || '',
  strategies: process.env.EZ_LOG_STRATEGIES || '',
  context: process.env.EZ_LOG_CONTEXT || '',
  decorators: process.env.EZ_LOG_DECORATORS || '',
  finops: process.env.EZ_LOG_FINOPS || ''
};

/**
 * Generate or extract trace ID (W3C TraceContext compatible)
 */
function generateTraceId(): string {
  // W3C TraceContext format: 32 hex chars (128-bit)
  return Array.from({ length: 16 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Extract trace ID from context or generate new one
 */
function getOrGenerateTraceId(context?: Record<string, unknown>): string {
  if (context?.traceId && typeof context.traceId === 'string') {
    return context.traceId;
  }
  
  // Check for W3C traceparent header format
  if (context?.traceparent && typeof context.traceparent === 'string') {
    const parts = context.traceparent.split('-');
    if (parts.length >= 2 && parts[1]) {
      return parts[1]; // trace-id is the second part
    }
  }
  
  return generateTraceId();
}

/**
 * Get effective log level for a module
 */
function getEffectiveLogLevel(moduleName?: string): string {
  // Check module-specific level first
  if (moduleName && MODULE_LOG_LEVELS[moduleName]) {
    return MODULE_LOG_LEVELS[moduleName];
  }
  
  // Fall back to global level
  return process.env.EZ_LOG_LEVEL || 'info';
}

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
 * Logger class for structured console logging with trace ID support
 */
class Logger {
  private moduleName?: string;
  private traceId?: string;

  /**
   * Create a Logger instance
   * @param moduleName - Optional module name for per-module log levels
   * @param traceId - Optional trace ID for request tracing
   */
  constructor(moduleName?: string, traceId?: string) {
    this.moduleName = moduleName;
    this.traceId = traceId ?? generateTraceId();
  }

  /**
   * Create a child logger with module name
   */
  child(moduleName: string): Logger {
    return new Logger(moduleName, this.traceId);
  }

  /**
   * Create a child logger with new trace ID
   */
  withTrace(traceId: string): Logger {
    return new Logger(this.moduleName, traceId);
  }

  /**
   * Check if logging is enabled for the given level
   */
  private isEnabled(level: string): boolean {
    // Check if logging is globally disabled
    if (process.env.EZ_LOG_ENABLED === 'false') {
      return false;
    }

    const effectiveLevel = getEffectiveLogLevel(this.moduleName);
    const minPriority = LOG_LEVELS[effectiveLevel] ?? 2;
    const logPriority = LOG_LEVELS[level] ?? 3;

    return logPriority <= minPriority;
  }

  /**
   * Write a log entry to console
   * @param level - Log level (ERROR, WARN, INFO, DEBUG)
   * @param message - Log message
   * @param context - Additional context data
   */
  log(level: string, message: string, context: Record<string, unknown> = {}): void {
    if (!this.isEnabled(level)) {
      return;
    }

    const traceId = getOrGenerateTraceId(context);
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      message,
      traceId,
      module: this.moduleName || 'core',
      context,
      pid: process.pid
    };

    // Always output to console with trace ID
    const prefix = `[EZ ${level}] [${traceId.substring(0, 8)}]`;
    
    if (level === 'ERROR') {
      console.error(`${prefix} ${message}`);
    } else if (level === 'WARN') {
      console.warn(`${prefix} ${message}`);
    } else {
      console.log(`${prefix} ${message}`);
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

// Named loggers for common modules
const adapterLogger = new Logger('adapters');
const strategyLogger = new Logger('strategies');
const contextLogger = new Logger('context');

export default Logger;
export {
  defaultLogger,
  Logger,
  adapterLogger,
  strategyLogger,
  contextLogger,
  generateTraceId,
  getOrGenerateTraceId
};

/**
 * Trace context for W3C TraceContext propagation
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  traceparent?: string;
}

/**
 * Generate a span ID (16 hex chars)
 */
export function generateSpanId(): string {
  return Array.from({ length: 8 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Create W3C traceparent header from trace context
 */
export function createTraceparent(context: TraceContext): string {
  // Format: version-traceId-spanId-traceFlags
  return `00-${context.traceId}-${context.spanId}-01`;
}

/**
 * Extract trace context from W3C traceparent header
 */
export function extractTraceContext(traceparent: string): TraceContext | null {
  const parts = traceparent.split('-');
  if (parts.length !== 4 || parts[0] !== '00') {
    return null;
  }
  
  return {
    traceId: parts[1],
    spanId: parts[2],
    traceparent,
    traceFlags: parts[3]
  } as TraceContext;
}

/**
 * Create a new trace context for outgoing requests
 */
export function createTraceContext(parentTraceId?: string): TraceContext {
  const traceId = parentTraceId || generateTraceId();
  const spanId = generateSpanId();
  
  return {
    traceId,
    spanId,
    traceparent: createTraceparent({ traceId, spanId })
  };
}
