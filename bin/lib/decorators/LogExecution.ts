/**
 * LogExecution Decorator
 *
 * Decorator for logging method execution entry, exit, duration, and optional parameters/results.
 * Handles both synchronous and asynchronous methods.
 *
 * @example
 * ```typescript
 * export class ContextManager {
 *   @LogExecution('ContextManager.gather', { logParams: true, level: 'debug' })
 *   async gather(options: ContextOptions): Promise<string> {
 *     // Implementation
 *   }
 * }
 * ```
 */

import { defaultLogger as logger } from '../logger.js';
import type { LogExecutionOptions } from './types.js';

/**
 * LogExecution decorator factory
 *
 * @param methodName - Name of the method for logging identification
 * @param options - Logging options (params, result, duration, level)
 * @returns Method decorator
 */
export function LogExecution(methodName: string, options: LogExecutionOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;

    descriptor.value = function (...args: any[]) {
      const startTime = Date.now();
      const logLevel = options.level || 'debug';

      // Log entry
      logger[logLevel](`[${className}] Entering ${methodName}`, {
        ...(options.logParams && { params: args }),
        ...(options.paramName && { [options.paramName]: args[0] })
      });

      try {
        const result = originalMethod.apply(this, args);

        // Handle both sync and async methods
        if (result instanceof Promise) {
          return result
            .then((resolvedResult: any) => {
              const duration = Date.now() - startTime;
              logger[logLevel](`[${className}] Completed ${methodName}`, {
                ...(options.logDuration && { duration: `${duration}ms` }),
                ...(options.logResult && { result: resolvedResult })
              });
              return resolvedResult;
            })
            .catch((error: Error) => {
              const duration = Date.now() - startTime;
              logger[logLevel](`[${className}] Failed ${methodName}`, {
                ...(options.logDuration && { duration: `${duration}ms` }),
                error: error.message
              });
              throw error;
            });
        }

        // Synchronous method
        const duration = Date.now() - startTime;
        logger[logLevel](`[${className}] Completed ${methodName}`, {
          ...(options.logDuration && { duration: `${duration}ms` }),
          ...(options.logResult && { result })
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger[logLevel](`[${className}] Failed ${methodName}`, {
          ...(options.logDuration && { duration: `${duration}ms` }),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    };

    return descriptor;
  };
}
