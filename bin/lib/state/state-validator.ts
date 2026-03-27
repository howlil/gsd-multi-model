/**
 * State Validator - Schema validation for state objects
 *
 * Provides validation for TaskState, PhaseState, and RequirementState objects.
 * Catches errors early to prevent state corruption.
 *
 * @example
 * ```typescript
 * const validator = new StateValidator();
 *
 * const result = validator.validateTaskState(state);
 * if (!result.valid) {
 *   console.error('Invalid state:', result.errors);
 * }
 * ```
 */

import type { TaskState, PhaseState, RequirementState, StateVersion } from './state-manager.js';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * State Validator class
 *
 * Validates state objects against expected schemas.
 */
export class StateValidator {
  /**
   * Valid task status values
   */
  private static readonly VALID_TASK_STATUSES = ['pending', 'in-progress', 'completed', 'failed'] as const;

  /**
   * Valid phase status values
   */
  private static readonly VALID_PHASE_STATUSES = ['not-started', 'in-progress', 'completed'] as const;

  /**
   * Valid requirement status values
   */
  private static readonly VALID_REQUIREMENT_STATUSES = ['pending', 'in-progress', 'completed', 'failed'] as const;

  /**
   * Validate task state structure
   *
   * @param state - State object to validate
   * @returns Validation result with errors if invalid
   *
   * @example
   * ```typescript
   * const result = validator.validateTaskState({
   *   taskId: '01-01',
   *   phase: 36,
   *   plan: 1,
   *   status: 'in-progress',
   *   version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'abc' },
   *   createdAt: Date.now(),
   *   updatedAt: Date.now()
   * });
   *
   * if (!result.valid) {
   *   console.error('Validation errors:', result.errors);
   * }
   * ```
   */
  validateTaskState(state: unknown): ValidationResult {
    const errors: string[] = [];

    if (!state || typeof state !== 'object') {
      return { valid: false, errors: ['State must be an object'] };
    }

    const s = state as Record<string, unknown>;

    // Required fields
    if (typeof s.taskId !== 'string') {
      errors.push('taskId must be a string');
    }
    if (typeof s.phase !== 'number') {
      errors.push('phase must be a number');
    }
    if (typeof s.plan !== 'number') {
      errors.push('plan must be a number');
    }
    if (
      typeof s.status !== 'string' ||
      !StateValidator.VALID_TASK_STATUSES.includes(s.status as typeof StateValidator.VALID_TASK_STATUSES[number])
    ) {
      errors.push('status must be one of: pending, in-progress, completed, failed');
    }
    if (typeof s.createdAt !== 'number') {
      errors.push('createdAt must be a number');
    }
    if (typeof s.updatedAt !== 'number') {
      errors.push('updatedAt must be a number');
    }

    // Version validation
    if (!s.version || typeof s.version !== 'object') {
      errors.push('version must be an object');
    } else {
      const v = s.version as Record<string, unknown>;
      if (!v.vectorClock) {
        errors.push('version.vectorClock is required');
      } else {
        // Validate vectorClock is Map or object with string keys and number values
        const vectorClock = v.vectorClock;
        if (!(vectorClock instanceof Map) && typeof vectorClock !== 'object') {
          errors.push('version.vectorClock must be a Map or object');
        } else {
          const entries = vectorClock instanceof Map
            ? Array.from(vectorClock.entries())
            : Object.entries(vectorClock);
          for (const [key, value] of entries) {
            if (typeof key !== 'string') {
              errors.push('version.vectorClock keys must be strings');
              break;
            }
            if (typeof value !== 'number') {
              errors.push('version.vectorClock values must be numbers');
              break;
            }
          }
        }
      }
      if (typeof v.timestamp !== 'number') {
        errors.push('version.timestamp must be a number');
      }
      if (typeof v.checksum !== 'string') {
        errors.push('version.checksum must be a string');
      }
    }

    // Optional fields type checks
    if (s.agent !== undefined && typeof s.agent !== 'string') {
      errors.push('agent must be a string');
    }
    if (s.output !== undefined && typeof s.output !== 'string') {
      errors.push('output must be a string');
    }
    if (s.context !== undefined && !Array.isArray(s.context)) {
      errors.push('context must be an array');
    }
    if (s.metadata !== undefined && typeof s.metadata !== 'object') {
      errors.push('metadata must be an object');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate phase state structure
   *
   * @param state - State object to validate
   * @returns Validation result with errors if invalid
   *
   * @example
   * ```typescript
   * const result = validator.validatePhaseState({
   *   phase: 36,
   *   status: 'in-progress',
   *   currentPlan: 1,
   *   completedPlans: []
   * });
   * ```
   */
  validatePhaseState(state: unknown): ValidationResult {
    const errors: string[] = [];

    if (!state || typeof state !== 'object') {
      return { valid: false, errors: ['State must be an object'] };
    }

    const s = state as Record<string, unknown>;

    if (typeof s.phase !== 'number') {
      errors.push('phase must be a number');
    }
    if (
      typeof s.status !== 'string' ||
      !StateValidator.VALID_PHASE_STATUSES.includes(s.status as typeof StateValidator.VALID_PHASE_STATUSES[number])
    ) {
      errors.push('status must be one of: not-started, in-progress, completed');
    }
    if (typeof s.currentPlan !== 'number') {
      errors.push('currentPlan must be a number');
    }
    if (!Array.isArray(s.completedPlans)) {
      errors.push('completedPlans must be an array');
    } else if (s.completedPlans.some((p: unknown) => typeof p !== 'number')) {
      errors.push('completedPlans must contain only numbers');
    }

    // Optional requirements field
    if (s.requirements !== undefined) {
      if (!(s.requirements instanceof Map) && typeof s.requirements !== 'object') {
        errors.push('requirements must be a Map or object');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate requirement state structure
   *
   * @param state - State object to validate
   * @returns Validation result with errors if invalid
   *
   * @example
   * ```typescript
   * const result = validator.validateRequirementState({
   *   id: 'STATE-01',
   *   status: 'completed'
   * });
   * ```
   */
  validateRequirementState(state: unknown): ValidationResult {
    const errors: string[] = [];

    if (!state || typeof state !== 'object') {
      return { valid: false, errors: ['State must be an object'] };
    }

    const s = state as Record<string, unknown>;

    if (typeof s.id !== 'string') {
      errors.push('id must be a string');
    }
    if (
      typeof s.status !== 'string' ||
      !StateValidator.VALID_REQUIREMENT_STATUSES.includes(s.status as typeof StateValidator.VALID_REQUIREMENT_STATUSES[number])
    ) {
      errors.push('status must be one of: pending, in-progress, completed, failed');
    }

    // Optional fields
    if (s.agent !== undefined && typeof s.agent !== 'string') {
      errors.push('agent must be a string');
    }
    if (s.output !== undefined && typeof s.output !== 'string') {
      errors.push('output must be a string');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate state version
   *
   * @param version - Version object to validate
   * @returns Validation result with errors if invalid
   */
  validateStateVersion(version: unknown): ValidationResult {
    const errors: string[] = [];

    if (!version || typeof version !== 'object') {
      return { valid: false, errors: ['Version must be an object'] };
    }

    const v = version as Record<string, unknown>;

    if (!v.vectorClock) {
      errors.push('vectorClock is required');
    } else {
      const vectorClock = v.vectorClock;
      if (!(vectorClock instanceof Map) && typeof vectorClock !== 'object') {
        errors.push('vectorClock must be a Map or object');
      } else {
        const entries = vectorClock instanceof Map
          ? Array.from(vectorClock.entries())
          : Object.entries(vectorClock);
        for (const [key, value] of entries) {
          if (typeof key !== 'string') {
            errors.push('vectorClock keys must be strings');
            break;
          }
          if (typeof value !== 'number') {
            errors.push('vectorClock values must be numbers');
            break;
          }
        }
      }
    }
    if (typeof v.timestamp !== 'number') {
      errors.push('timestamp must be a number');
    }
    if (typeof v.checksum !== 'string') {
      errors.push('checksum must be a string');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate global state structure
   *
   * @param state - Global state object to validate
   * @returns Validation result with errors if invalid
   */
  validateGlobalState(state: unknown): ValidationResult {
    const errors: string[] = [];

    if (!state || typeof state !== 'object') {
      return { valid: false, errors: ['Global state must be an object'] };
    }

    const g = state as Record<string, unknown>;

    // Validate version
    if (!g.version) {
      errors.push('version is required');
    } else {
      const versionResult = this.validateStateVersion(g.version);
      if (!versionResult.valid) {
        errors.push(...versionResult.errors.map((e) => `version.${e}`));
      }
    }

    // Validate taskStates
    if (!g.taskStates) {
      errors.push('taskStates is required');
    } else if (!(g.taskStates instanceof Map) && typeof g.taskStates !== 'object') {
      errors.push('taskStates must be a Map or object');
    } else {
      const entries = g.taskStates instanceof Map
        ? Array.from(g.taskStates.entries())
        : Object.entries(g.taskStates);
      for (const [taskId, taskState] of entries) {
        const result = this.validateTaskState(taskState);
        if (!result.valid) {
          errors.push(`taskStates[${taskId}]: ${result.errors.join(', ')}`);
        }
      }
    }

    // Validate phaseState
    if (!g.phaseState) {
      errors.push('phaseState is required');
    } else if (!(g.phaseState instanceof Map) && typeof g.phaseState !== 'object') {
      errors.push('phaseState must be a Map or object');
    } else {
      const entries = g.phaseState instanceof Map
        ? Array.from(g.phaseState.entries())
        : Object.entries(g.phaseState);
      for (const [phaseId, phaseState] of entries) {
        const result = this.validatePhaseState(phaseState);
        if (!result.valid) {
          errors.push(`phaseState[${phaseId}]: ${result.errors.join(', ')}`);
        }
      }
    }

    // Optional checkpointId
    if (g.checkpointId !== undefined && typeof g.checkpointId !== 'string') {
      errors.push('checkpointId must be a string');
    }

    return { valid: errors.length === 0, errors };
  }
}

export default StateValidator;
