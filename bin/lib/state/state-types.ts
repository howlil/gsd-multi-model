/**
 * State Types — Type definitions for state conflict resolution
 *
 * Re-exports types from state-conflict-resolver for cleaner imports.
 */

export {
  ResolutionStrategy,
  ConflictPriority,
  ConflictStatus
} from './state-conflict-resolver.js';

export type {
  StateConflict,
  NegotiationProposal,
  NegotiationResult,
  ResolutionStats,
  Operation
} from './state-conflict-resolver.js';
