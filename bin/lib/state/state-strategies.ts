/**
 * State Conflict Resolution Strategies
 *
 * Provides pure functions for resolving state conflicts using different strategies:
 * - Last-write-wins: Default strategy, uses latest state
 * - Merge: Combines non-conflicting field updates
 * - Priority-based: Resolves based on priority level
 * - Operational transform: Transforms concurrent operations
 *
 * All functions are pure (no side effects) and can be used independently.
 *
 * @example
 * ```typescript
 * import {
 *   resolveLastWriteWins,
 *   resolveMerge,
 *   resolvePriorityBased,
 *   resolveOperationalTransform
 * } from './state-strategies.js';
 *
 * const merged = resolveMerge(stateA, stateB);
 * const transformed = resolveOperationalTransform(state, operations);
 * ```
 */

import { ConflictPriority, type Operation } from './state-types.js';

/**
 * Last-write-wins resolution
 *
 * Returns the state unchanged. The StateManager's vector clock determines
 * which state is the "last write", so this function simply returns the
 * provided state as-is.
 *
 * @param state - The state to resolve
 * @returns The state unchanged
 *
 * @example
 * ```typescript
 * const state = { status: 'completed', version: 5 };
 * const result = resolveLastWriteWins(state);
 * // result === state
 * ```
 */
export function resolveLastWriteWins(state: Record<string, unknown>): Record<string, unknown> {
  // Identity function - vector clock already determined the winner
  return state;
}

/**
 * Merge resolution for non-conflicting field updates
 *
 * Combines both states, keeping all non-conflicting changes.
 * For conflicting fields, stateB wins (last-write-wins for conflicts).
 *
 * @param stateA - First state
 * @param stateB - Second state
 * @returns Merged state
 *
 * @example
 * ```typescript
 * const stateA = { status: 'completed', metadata: { version: 5 } };
 * const stateB = { result: 'success', metadata: { version: 6 } };
 * const merged = resolveMerge(stateA, stateB);
 * // merged = { status: 'completed', result: 'success', metadata: { version: 6 } }
 * ```
 */
export function resolveMerge(
  stateA: Record<string, unknown>,
  stateB: Record<string, unknown>
): Record<string, unknown> {
  // Merge both states: spread operator combines all fields
  // For conflicts, stateB wins (rightmost in spread)
  const merged = { ...stateA, ...stateB };
  return merged;
}

/**
 * Priority-based resolution
 *
 * Returns the state with priority metadata. Priority levels:
 * - CRITICAL (1): System state, health status - always wins
 * - HIGH (2): Task state, execution status
 * - NORMAL (3): Metadata, analytics
 *
 * @param state - The state to resolve
 * @param priority - The priority level
 * @returns State with priority metadata
 *
 * @example
 * ```typescript
 * const state = { health: 'critical', status: 'degraded' };
 * const result = resolvePriorityBased(state, ConflictPriority.CRITICAL);
 * // result includes priority metadata
 * ```
 */
export function resolvePriorityBased(
  state: Record<string, unknown>,
  priority: ConflictPriority
): Record<string, unknown> {
  // Add priority metadata to state
  // In a full implementation, this would compare priorities between agents
  return {
    ...state,
    _priority: priority
  };
}

/**
 * Operational transform resolution for concurrent edits
 *
 * Transforms concurrent operations to preserve intent:
 * - append: Array push operations - all appends preserved
 * - increment: Counter increments - summed together
 * - decrement: Counter decrements - summed together
 *
 * @param state - Current state
 * @param operations - Operations to apply
 * @returns Transformed state
 *
 * @example
 * ```typescript
 * // Append example
 * const state1 = { items: ['a'] };
 * const ops1 = [
 *   { type: 'append', field: 'items', value: 'b' },
 *   { type: 'append', field: 'items', value: 'c' }
 * ];
 * const result1 = resolveOperationalTransform(state1, ops1);
 * // result1.items = ['a', 'b', 'c']
 *
 * // Increment example
 * const state2 = { counter: 5 };
 * const ops2 = [
 *   { type: 'increment', field: 'counter', value: 1 },
 *   { type: 'increment', field: 'counter', value: 2 }
 * ];
 * const result2 = resolveOperationalTransform(state2, ops2);
 * // result2.counter = 8
 * ```
 */
export function resolveOperationalTransform(
  state: Record<string, unknown>,
  operations: Operation[]
): Record<string, unknown> {
  const result = { ...state };

  // Group operations by field for efficient processing
  const opsByField = new Map<string, Operation[]>();
  for (const op of operations) {
    const fieldOps = opsByField.get(op.field) || [];
    fieldOps.push(op);
    opsByField.set(op.field, fieldOps);
  }

  // Apply operations per field
  for (const [field, fieldOps] of opsByField.entries()) {
    const currentValue = result[field];
    const firstOp = fieldOps[0];

    if (!firstOp) {
      continue;
    }

    // Handle append operations (array concatenation)
    if (firstOp.type === 'append' && Array.isArray(currentValue)) {
      const values = fieldOps
        .map((op) => op.value)
        .filter((v): v is NonNullable<typeof v> => v !== undefined);
      result[field] = [...(currentValue as unknown[]), ...values];
    }
    // Handle numeric operations (increment/decrement)
    else if (typeof currentValue === 'number') {
      let delta = 0;
      for (const op of fieldOps) {
        if (op.type === 'increment' && typeof op.value === 'number') {
          delta += op.value;
        } else if (op.type === 'decrement' && typeof op.value === 'number') {
          delta -= op.value;
        }
      }
      result[field] = currentValue + delta;
    }
  }

  return result;
}

/**
 * Default export with all strategy functions
 */
export default {
  resolveLastWriteWins,
  resolveMerge,
  resolvePriorityBased,
  resolveOperationalTransform
};
