/**
 * Decorators — Method decorators for cross-cutting concerns
 *
 * Provides method decorators for logging, caching, and validation.
 * All decorators are TypeScript-compatible and work with ES2022 target.
 *
 * @example
 * ```typescript
 * import { LogExecution, CacheResult, ValidateInput } from '@howlil/ez-agents';
 * import { z } from 'zod';
 *
 * class MyService {
 *   // Log method execution with timing
 *   @LogExecution({ level: 'info' })
 *   async processData(data: string): Promise<string> {
 *     return data.toUpperCase();
 *   }
 *
 *   // Cache results for 1 minute
 *   @CacheResult({ ttl: 60000 })
 *   async fetchData(id: string): Promise<Data> {
 *     return await this.api.fetch(id);
 *   }
 *
 *   // Validate input parameters
 *   @ValidateInput({
 *     schema: z.object({
 *       name: z.string().min(1),
 *       email: z.string().email()
 *     })
 *   })
 *   async createUser(data: { name: string; email: string }): Promise<User> {
 *     return this.db.users.create(data);
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Log Execution — Logs method execution with timing and parameters
 *
 * @example
 * ```typescript
 * @LogExecution()
 * async myMethod(param: string) {
 *   // Automatically logs entry, exit, and duration
 * }
 * ```
 */
export { LogExecution } from './LogExecution.js';

/**
 * Cache Result — Caches method results based on parameters
 *
 * @example
 * ```typescript
 * @CacheResult({ ttl: 60000 })
 * async fetchData(id: string) {
 *   // Result cached for 60 seconds
 * }
 * ```
 */
export { CacheResult, clearCache, clearAllCache, getCacheStats } from './CacheResult.js';

/**
 * Validate Input — Validates method parameters using Zod schemas
 *
 * @example
 * ```typescript
 * @ValidateInput({ schema: z.object({ id: z.string() }) })
 * async getUser(data: { id: string }) {
 *   // Parameters validated before method executes
 * }
 * ```
 */
export { ValidateInput } from './ValidateInput.js';

export type {
  LogExecutionOptions,
  CacheResultOptions,
  ValidateInputOptions,
  CacheEntry
} from './types.js';

export { getProfilingResults, exportProfilingResults } from './LogExecution.js'; 
