/**
 * ValidateInput Decorator
 *
 * Decorator for validating method inputs before execution.
 * Executes validator function before method, throws if validator throws.
 *
 * @example
 * ```typescript
 * export class SkillResolver {
 *   @ValidateInput((skills, context) => {
 *     if (!Array.isArray(skills)) throw new Error('Skills must be an array');
 *     if (!context) throw new Error('Context is required');
 *   })
 *   resolve(skills: Skill[], context: Context): ResolveResult {
 *     // Implementation
 *   }
 * }
 * ```
 */

import type { ValidateInputOptions } from './types.js';

/**
 * ValidateInput decorator factory
 *
 * @param validatorFn - Validator function that throws on validation failure
 * @returns Method decorator
 */
export function ValidateInput(validatorFn: (...args: any[]) => void) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      // Execute validator before method
      validatorFn(...args);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
