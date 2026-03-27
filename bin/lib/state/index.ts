/**
 * State Management Module
 *
 * Provides centralized state synchronization for parallel agent execution:
 * - StateManager: Main state manager with vector clocks and conflict detection
 * - StateValidator: Schema validation for state objects
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

// StateValidator class
export { StateValidator, type ValidationResult } from './state-validator.js';

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
