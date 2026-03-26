/**
 * LogExecution Decorator
 *
 * Environment-controlled logging for method execution.
 * Zero overhead when disabled via environment variables.
 *
 * Environment variables:
 * - EZ_LOG_ENABLED: 'true' | 'false' (default: 'true')
 * - EZ_LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug' (default: 'info')
 *
 * @example
 * ```typescript
 * @LogExecution('ContextManager.gather', { logParams: true, level: 'debug' })
 * async gather(options: ContextOptions): Promise<string> { }
 * ```
 */

import { defaultLogger as logger } from '../logger.js';
import type { LogExecutionOptions } from './types.js';

/**
 * Log level priorities for comparison
 */
const LOG_LEVELS: Record<string, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

/**
 * Check if logging is enabled and at appropriate level
 */
function shouldLog(level: string): boolean {
  const enabled = process.env.EZ_LOG_ENABLED !== 'false';
  if (!enabled) return false;

  const minLevel = process.env.EZ_LOG_LEVEL || 'info';
  const minPriority = LOG_LEVELS[minLevel] ?? 2;
  const logPriority = LOG_LEVELS[level] ?? 3;

  return logPriority <= minPriority;
}

/**
 * LogExecution decorator factory with environment control
 *
 * @param methodName - Name of the method for logging identification
 * @param options - Logging options (params, result, duration, level)
 * @returns Method decorator (NO-OP if disabled)
 */
export function LogExecution(methodName: string, options: LogExecutionOptions = {}) {
  const logLevel = options.level || 'debug';
  const enabled = shouldLog(logLevel);

  // Return NO-OP decorator if logging is disabled (zero overhead)
  if (!enabled) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      return descriptor;
    };
  }

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;

    descriptor.value = function (...args: any[]) {
      // Lazy param evaluation (only if logParams is true)
      const paramsObj = options.logParams ? { params: args } : {};
      const namedParam = options.paramName ? { [options.paramName]: args[0] } : {};
      logger[logLevel](`[${className}] Entering ${methodName}`, { ...paramsObj, ...namedParam });

      const startTime = Date.now();
      try {
        const result = originalMethod.apply(this, args);

        // Handle both sync and async methods
        if (result instanceof Promise) {
          return result
            .then((resolvedResult: any) => {
              if (options.logDuration || options.logResult) {
                const duration = Date.now() - startTime;
                logger[logLevel](`[${className}] Completed ${methodName}`, {
                  ...(options.logDuration && { duration: `${duration}ms` }),
                  ...(options.logResult && { result: resolvedResult })
                });
              }
              return resolvedResult;
            })
            .catch((error: Error) => {
              const duration = Date.now() - startTime;
              logger.error(`[${className}] Failed ${methodName}`, {
                ...(options.logDuration && { duration: `${duration}ms` }),
                error: error.message
              });
              throw error;
            });
        }

        // Synchronous method
        if (options.logDuration || options.logResult) {
          const duration = Date.now() - startTime;
          logger[logLevel](`[${className}] Completed ${methodName}`, {
            ...(options.logDuration && { duration: `${duration}ms` }),
            ...(options.logResult && { result })
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`[${className}] Failed ${methodName}`, {
          ...(options.logDuration && { duration: `${duration}ms` }),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    };

    return descriptor;
  };
}
