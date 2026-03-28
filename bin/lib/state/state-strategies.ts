/**
 * State Strategies — Resolution strategy functions
 *
 * Implements the four resolution strategies:
 * - Last-write-wins
 * - Field-level merge
 * - Priority-based
 * - Operational transform
 */

import type { ResolutionStrategy, ConflictPriority, Operation } from './state-conflict-resolver.js';

/**
 * Last-write-wins strategy
 * Simply uses the most recent state (identity function)
 */
export function resolveLastWriteWins(state: Record<string, unknown>): Record<string, unknown> {
  return state; // Identity - return same reference
}

/**
 * Field-level merge strategy
 * Merges non-conflicting fields from two states
 * Uses last-write-wins for conflicting fields
 */
export function resolveMerge(
  stateA: Record<string, unknown>,
  stateB: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...stateA };
  const keysA = Object.keys(stateA);
  const keysB = Object.keys(stateB);

  // Merge non-conflicting fields
  for (const key of keysB) {
    if (!keysA.includes(key)) {
      result[key] = stateB[key];
    } else if (JSON.stringify(stateA[key]) === JSON.stringify(stateB[key])) {
      result[key] = stateA[key];
    } else {
      // Conflict - use last-write-wins (stateB)
      result[key] = stateB[key];
    }
  }

  return result;
}

/**
 * Priority-based resolution strategy
 * Higher priority state wins
 * Adds _priority metadata to the result
 */
export function resolvePriorityBased(
  state: Record<string, unknown>,
  priority: ConflictPriority
): Record<string, unknown> {
  // Return copy with _priority metadata
  return {
    ...state,
    _priority: priority
  };
}

/**
 * Operational transform strategy
 * Applies concurrent operations in a deterministic order
 */
export function resolveOperationalTransform(
  state: Record<string, unknown>,
  operations: Operation[]
): Record<string, unknown> {
  const result = { ...state };

  for (const op of operations) {
    const field = op.field as string;
    switch (op.type) {
      case 'append':
        const arrayValue = result[field] as unknown[] || [];
        result[field] = [...arrayValue, op.value];
        break;

      case 'increment':
        const incValue = result[field] as number || 0;
        result[field] = incValue + (op.value as number || 0);
        break;

      case 'decrement':
        const decValue = result[field] as number || 0;
        result[field] = decValue - (op.value as number || 0);
        break;

      case 'set':
        result[field] = op.value;
        break;
    }
  }

  return result;
}

/**
 * Select resolution strategy based on conflict characteristics
 */
export function selectStrategy(
  isMergeable: boolean,
  isConcurrentEdit: boolean,
  priority: ConflictPriority
): ResolutionStrategy {
  // Critical priority → priority-based
  if (priority === ConflictPriority.CRITICAL) {
    return ResolutionStrategy.PRIORITY_BASED;
  }

  // Mergeable → merge
  if (isMergeable) {
    return ResolutionStrategy.MERGE;
  }

  // Concurrent edit → operational transform
  if (isConcurrentEdit) {
    return ResolutionStrategy.OPERATIONAL_TRANSFORM;
  }

  // Default → last-write-wins
  return ResolutionStrategy.LAST_WRITE_WINS;
}
