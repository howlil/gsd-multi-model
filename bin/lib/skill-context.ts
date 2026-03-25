#!/usr/bin/env node

/**
 * Skill Context — Context schema validation for skill matcher
 *
 * Validates and normalizes matcher context:
 * - stack: object with language, framework, version
 * - scope: enum [new-feature, bugfix, refactor, migration, maintenance]
 * - projectType: string (optional)
 * - mode: enum [greenfield, existing, rapid-mvp, scale-up, maintenance]
 * - constraints: object with deadline, teamSize, compliance, legacySystems
 * - taskDescription: string (for keyword matching)
 * - codebaseFiles: array of strings (for file pattern matching)
 * - executedCommands: array of strings (for command matching)
 *
 * Usage:
 *   import { SkillContextResolver, validateContext, CONTEXT_SCHEMA } from './skill-context.js';
 *   const resolver = new SkillContextResolver();
 *   const { valid, errors, normalizedContext } = resolver.validate(context);
 */

import { defaultLogger as logger } from './logger.js';

/**
 * Valid scope values
 */
export type ScopeValue = 'new-feature' | 'bugfix' | 'refactor' | 'migration' | 'maintenance';

/**
 * Valid mode values
 */
export type ModeValue = 'greenfield' | 'existing' | 'rapid-mvp' | 'scale-up' | 'maintenance';

/**
 * Stack configuration
 */
export interface StackConfig {
  language?: string;
  framework?: string;
  version?: string;
}

/**
 * Constraints configuration
 */
export interface ConstraintsConfig {
  deadline?: string;
  teamSize?: number;
  compliance?: string[];
  legacySystems?: string[];
}

/**
 * Context schema structure
 */
export interface ContextSchema {
  stack?: StackConfig;
  scope?: ScopeValue;
  projectType?: string;
  mode?: ModeValue;
  constraints?: ConstraintsConfig;
  taskDescription?: string;
  codebaseFiles?: string[];
  executedCommands?: string[];
  [key: string]: unknown;
}

/**
 * Validation result structure
 */
export interface ContextValidationResult {
  valid: boolean;
  errors: string[];
  normalizedContext: ContextSchema | null;
}

/**
 * Context schema definition
 */
export const CONTEXT_SCHEMA = {
  stack: {
    type: 'object',
    optional: true,
    properties: {
      language: { type: 'string', optional: false },
      framework: { type: 'string', optional: true },
      version: { type: 'string', optional: true }
    }
  },
  scope: {
    type: 'enum',
    values: ['new-feature', 'bugfix', 'refactor', 'migration', 'maintenance'] as ScopeValue[],
    optional: true
  },
  projectType: {
    type: 'string',
    optional: true
  },
  mode: {
    type: 'enum',
    values: ['greenfield', 'existing', 'rapid-mvp', 'scale-up', 'maintenance'] as ModeValue[],
    optional: true,
    normalize: (value: string): ModeValue => {
      const mappings: Record<string, ModeValue> = {
        mvp: 'rapid-mvp',
        'green-field': 'greenfield',
        brownfield: 'existing',
        scale: 'scale-up',
        maint: 'maintenance'
      };
      return (mappings[value] as ModeValue | undefined) || (value as ModeValue);
    }
  },
  constraints: {
    type: 'object',
    optional: true,
    properties: {
      deadline: { type: 'string', optional: true },
      teamSize: { type: 'number', optional: true },
      compliance: { type: 'array', optional: true },
      legacySystems: { type: 'array', optional: true }
    }
  },
  taskDescription: { type: 'string', optional: true },
  codebaseFiles: { type: 'array', optional: true },
  executedCommands: { type: 'array', optional: true }
} as const;

/**
 * SkillContextResolver class for validating and resolving skill context
 */
export class SkillContextResolver {
  /**
   * Validate and normalize context object
   * @param context - Context object to validate
   * @returns Validation result: { valid, errors, normalizedContext }
   */
  validate(context: ContextSchema): ContextValidationResult {
    const errors: string[] = [];
    const normalized: ContextSchema = { ...context };

    if (!context || typeof context !== 'object') {
      return {
        valid: false,
        errors: ['Context must be an object'],
        normalizedContext: null
      };
    }

    // Validate and normalize mode
    if (context.mode) {
      const modeSchema = CONTEXT_SCHEMA.mode;
      if (!modeSchema.values.includes(context.mode)) {
        const normalizedMode = modeSchema.normalize?.(context.mode);
        if (normalizedMode && modeSchema.values.includes(normalizedMode)) {
          normalized.mode = normalizedMode;
        } else {
          errors.push(
            `Invalid mode: ${context.mode}. Valid: ${modeSchema.values.join(', ')}`
          );
        }
      }
    }

    // Validate scope
    if (context.scope) {
      const scopeSchema = CONTEXT_SCHEMA.scope;
      if (!scopeSchema.values.includes(context.scope)) {
        errors.push(
          `Invalid scope: ${context.scope}. Valid: ${scopeSchema.values.join(', ')}`
        );
      }
    }

    // Validate stack structure
    if (context.stack) {
      if (!context.stack.language && !context.stack.framework) {
        errors.push('Stack must have at least language or framework');
      }
    }

    // Validate constraints structure
    if (context.constraints) {
      if (
        context.constraints.teamSize &&
        typeof context.constraints.teamSize !== 'number'
      ) {
        errors.push('teamSize must be a number');
      }
      if (
        context.constraints.compliance &&
        !Array.isArray(context.constraints.compliance)
      ) {
        errors.push('compliance must be an array');
      }
    }

    if (errors.length > 0) {
      logger.warn('Context validation failed', {
        errorCount: errors.length,
        errors
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      normalizedContext: errors.length === 0 ? normalized : null
    };
  }

  /**
   * Resolve context from raw input
   * @param rawContext - Raw context input
   * @returns Resolved context or null if invalid
   */
  resolve(rawContext: Record<string, unknown>): ContextSchema | null {
    const result = this.validate(rawContext as ContextSchema);
    return result.normalizedContext;
  }

  /**
   * Resolve context with defaults
   * @param rawContext - Raw context input
   * @param defaults - Default values to apply
   * @returns Resolved context with defaults applied
   */
  resolveWithDefaults(
    rawContext: Record<string, unknown>,
    defaults: Partial<ContextSchema>
  ): ContextSchema {
    const resolved = this.resolve(rawContext);
    return resolved ? { ...defaults, ...resolved } : (defaults as ContextSchema);
  }
}

/**
 * Validate and normalize context object (backward compatibility)
 * @param context - Context object to validate
 * @returns Validation result: { valid, errors, normalizedContext }
 * @deprecated Use SkillContextResolver.validate() instead
 */
export function validateContext(context: ContextSchema): ContextValidationResult {
  const resolver = new SkillContextResolver();
  return resolver.validate(context);
}
