/**
 * Decorator Type Definitions
 *
 * Type definitions for TypeScript decorators used across the codebase.
 * Provides configuration interfaces for LogExecution, CacheResult, and ValidateInput decorators.
 */

/**
 * Options for LogExecution decorator
 */
export interface LogExecutionOptions {
  /** Log method parameters on entry */
  logParams?: boolean;
  /** Log method result on exit */
  logResult?: boolean;
  /** Log execution duration */
  logDuration?: boolean;
  /** Log level for execution logging */
  level?: 'info' | 'debug' | 'trace' | 'warn' | 'error';
  /** Specific parameter name to log */
  paramName?: string;
}

/**
 * Options for CacheResult decorator
 */
export interface CacheResultOptions {
  /** Time-to-live in milliseconds (default: 300000ms / 5 minutes) */
  ttl?: number;
  /** Custom cache key generation function */
  cacheKeyFn?: (...args: any[]) => string;
}

/**
 * Options for ValidateInput decorator
 */
export interface ValidateInputOptions {
  /** Validator function that throws on validation failure */
  validatorFn: (...args: any[]) => void;
}

/**
 * Cache entry for CacheResult decorator
 */
export interface CacheEntry<T = any> {
  /** Cached value */
  value: T;
  /** Expiry timestamp */
  expiry: number;
}
