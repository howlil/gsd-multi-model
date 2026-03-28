/**
 * State Management Module
 *
 * Provides centralized state synchronization for parallel agent execution:
 * - StateManager: Main state manager with vector clocks and conflict detection
 * - StateValidator: Schema validation for state objects
 * - StateConflictResolver: Advanced conflict resolution with multi-strategy approach
 * - StateConflictLog: Audit logging with 90-day retention
 * - StateJournal: Append-only journal for state changes (audit trail, replay)
 * - State types: TaskState, GlobalState, PhaseState, etc.
 */

// State types from state-manager
export type {
  StateVersion,
  TaskState,
  PhaseState,
  RequirementState,
  GlobalState,
  SyncStats
} from './state-manager.js';

// StateManager class
export { StateManager } from './state-manager.js';

// StateJournal class (Phase 42.7)
export { StateJournal } from './state-journal.js';
export type { JournalEntry, JournalConfig, JournalFilter, JournalStats, JournalEntryType } from './state-journal.js';

// StateValidator class
export { StateValidator, type ValidationResult } from './state-validator.js';

// State conflict resolution (Phase 41)
export { StateConflictResolver } from './state-conflict-resolver.js';
export { StateConflictLog } from './state-conflict-log.js';
export {
  resolveLastWriteWins,
  resolveMerge,
  resolvePriorityBased,
  resolveOperationalTransform
} from './state-strategies.js';

// Conflict resolution types
export {
  ResolutionStrategy,
  ConflictPriority,
  ConflictStatus
} from './state-types.js';
export type {
  StateConflict,
  NegotiationProposal,
  NegotiationResult,
  ResolutionStats,
  Operation
} from './state-types.js';

// Legacy exports for backward compatibility
export { StateData, MetricOptions as StateMetricOptions } from './state.js';
export {
  stateLoad,
  stateGet,
  statePatch,
  stateUpdate,
  stateAdvancePlan,
  stateRecordMetric,
  writeStateMd
} from './state.js';

export { LockState, type LockInfo } from './lock-state.js';
