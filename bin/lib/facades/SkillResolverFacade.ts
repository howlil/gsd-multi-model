/**
 * Skill Resolver Facade
 *
 * Provides a simplified unified interface for skill resolution operations.
 * Orchestrates multiple subsystems: SkillMatcher, SkillValidator, SkillContextResolver,
 * and SkillRegistry.
 *
 * @example
 * ```typescript
 * // Create facade with default registry
 * const skillFacade = new SkillResolverFacade();
 *
 * // Resolve skill by trigger
 * const skill = await skillFacade.resolveSkill('laravel', context);
 *
 * // Match skills to query
 * const matches = await skillFacade.matchSkill('authentication', skills);
 *
 * // Validate a skill
 * const result = await skillFacade.validateSkill(skill);
 * if (result.valid) {
 *   console.log('Skill is valid');
 * }
 *
 * // Get skill context
 * const skillContext = await skillFacade.getSkillContext(skill);
 *
 * // Register a new skill
 * skillFacade.registerSkill(myCustomSkill);
 * ```
 */

import { LogExecution } from '../decorators/LogExecution.js';
import { CacheResult } from '../decorators/CacheResult.js';
import { ValidateInput } from '../decorators/ValidateInput.js';
import { defaultLogger as logger } from '../logger.js';
import { SkillMatcher, type MatchResult, type MatchContext } from '../skill-matcher.js';
import { SkillValidator, type ValidationResult } from '../skill-validator.js';
import { SkillContextResolver, type ContextSchema } from '../skill-context.js';
import {
  SkillRegistry,
  type Skill,
  type SkillContext as SkillExecutionContext,
  type SkillResult as SkillExecutionResult
} from '../skill-registry.js';

/**
 * Skill Resolver Facade options
 */
export interface SkillResolverFacadeOptions {
  /** Skill registry instance */
  registry?: SkillRegistry;
  /** Enable validation by default */
  enableValidation?: boolean;
  /** Default skill priority overrides */
  defaultPriority?: Record<string, number>;
  /** Maximum skills to return in match results */
  maxMatchResults?: number;
}

/**
 * Skill resolution result
 */
export interface SkillResolutionResult {
  /** Resolved skill or null if not found */
  skill: Skill | null;
  /** Match result if skill was matched */
  matchResult?: MatchResult;
  /** Validation result if validation was performed */
  validation?: ValidationResult;
  /** Rationale for resolution */
  rationale: string;
}

/**
 * Skill execution result wrapper
 */
export interface SkillExecutionWrapper {
  /** Whether execution was successful */
  success: boolean;
  /** Skill that was executed */
  skill: Skill;
  /** Execution output */
  output?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Skill Resolver Facade - Unified interface for skill operations
 *
 * Implements the Facade pattern to simplify complex skill resolution subsystems.
 * Provides a single entry point for all skill operations including matching,
 * resolution, validation, context resolution, and execution.
 */
export class SkillResolverFacade {
  private matcher: SkillMatcher;
  private validator: SkillValidator;
  private contextResolver: SkillContextResolver;
  private registry: SkillRegistry;
  private enableValidation: boolean;
  private maxMatchResults: number;
  private skillPriority: Record<string, number>;

  /**
   * Create a SkillResolverFacade instance
   * @param options - Facade configuration options
   */
  constructor(options: SkillResolverFacadeOptions = {}) {
    this.registry = options.registry ?? new SkillRegistry();
    this.matcher = new SkillMatcher(this.registry);
    this.validator = new SkillValidator();
    this.contextResolver = new SkillContextResolver();
    this.enableValidation = options.enableValidation ?? true;
    this.maxMatchResults = options.maxMatchResults ?? 7;
    this.skillPriority = options.defaultPriority ?? {};

    logger.debug('SkillResolverFacade initialized', {
      enableValidation: this.enableValidation,
      maxMatchResults: this.maxMatchResults
    });
  }

  /**
   * Resolve a skill by trigger string
   * @param trigger - Trigger string to match
   * @param context - Context for resolution
   * @returns Resolution result with matched skill
   */
  @LogExecution('SkillResolverFacade.resolveSkill', { logParams: false, logResult: false })
  @CacheResult(
    (trigger: string, _context?: MatchContext) => `resolve:${trigger}`,
    300000 // 5 minutes TTL
  )
  async resolveSkill(trigger: string, context: MatchContext = {}): Promise<SkillResolutionResult> {
    try {
      // Ensure registry is loaded
      if (!this.registry.getAll().length) {
        await this.registry.load();
      }

      // Build match context with trigger
      const matchContext: MatchContext = {
        ...context,
        taskDescription: trigger
      };

      // Match skills
      const matchResult = this.matcher.match(matchContext);

      if (matchResult.activatedSkills.length === 0) {
        logger.debug('SkillResolverFacade.resolveSkill - no skills matched', { trigger });
        return {
          skill: null,
          matchResult,
          rationale: 'No skills matched the provided trigger'
        };
      }

      // Get the highest priority skill
      const skill = matchResult.activatedSkills[0]!;

      // Validate if enabled
      let validation: ValidationResult | undefined;
      if (this.enableValidation) {
        validation = this.validator.validate(skill);
        if (!validation.valid) {
          logger.warn('SkillResolverFacade.resolveSkill - validation failed', {
            skillName: skill.name,
            errors: validation.errors
          });
          return {
            skill: null,
            matchResult,
            validation,
            rationale: `Skill validation failed: ${validation.errors.join(', ')}`
          };
        }
      }

      logger.info('SkillResolverFacade.resolveSkill completed', {
        trigger,
        skillName: skill.name,
        activatedCount: matchResult.activatedSkills.length
      });

      return {
        skill,
        matchResult,
        validation,
        rationale: matchResult.rationale
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('SkillResolverFacade.resolveSkill failed', {
        trigger,
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * Match skills to a query string
   * @param query - Query string to match
   * @param skills - Optional skills array to search (uses registry if not provided)
   * @returns Array of matching skills
   */
  @LogExecution('SkillResolverFacade.matchSkill', { logParams: false })
  @CacheResult(
    (query: string, _skills?: Skill[]) => `match:${query}`,
    300000 // 5 minutes TTL
  )
  async matchSkill(query: string, skills?: Skill[]): Promise<Skill[]> {
    // Ensure registry is loaded
    if (!skills && !this.registry.getAll().length) {
      await this.registry.load();
    }

    const skillsToSearch = skills ?? this.registry.getAll();

    // Search registry by query
    const results = this.registry.search(query);

    // Apply priority sorting
    const sorted = results.sort((a, b) => {
      const priorityA = this.skillPriority[a.name] ?? 0;
      const priorityB = this.skillPriority[b.name] ?? 0;
      return priorityB - priorityA;
    });

    // Limit results
    const limited = sorted.slice(0, this.maxMatchResults);

    logger.debug('SkillResolverFacade.matchSkill completed', {
      query,
      totalMatches: results.length,
      returnedMatches: limited.length
    });

    return limited;
  }

  /**
   * Validate a skill object
   * @param skill - Skill to validate
   * @returns Validation result
   */
  @LogExecution('SkillResolverFacade.validateSkill', { logParams: false })
  @ValidateInput((skill: Skill) => {
    if (!skill || typeof skill !== 'object') {
      throw new Error('Skill must be an object');
    }
  })
  async validateSkill(skill: Skill): Promise<ValidationResult> {
    const result = this.validator.validate(skill);

    logger.debug('SkillResolverFacade.validateSkill completed', {
      skillName: skill.name,
      valid: result.valid,
      errorCount: result.errors.length
    });

    return result;
  }

  /**
   * Get context for a skill
   * @param skill - Skill to get context for
   * @returns Skill context schema
   */
  @LogExecution('SkillResolverFacade.getSkillContext', { logParams: false })
  @CacheResult(
    (skill: Skill) => `skill-context:${skill.name}`,
    300000 // 5 minutes TTL
  )
  async getSkillContext(skill: Skill): Promise<ContextSchema> {
    // Build context from skill metadata
    const context: ContextSchema = {
      taskDescription: skill.description,
      codebaseFiles: []
    };

    // Add stack info if available
    if (skill.stack) {
      const [language, framework] = skill.stack.split('/');
      context.stack = {
        language: language?.trim(),
        framework: framework?.trim()
      };
    }

    // Add mode based on tags
    if (skill.tags) {
      if (skill.tags.includes('rapid-mvp')) {
        context.mode = 'rapid-mvp';
      } else if (skill.tags.includes('greenfield')) {
        context.mode = 'greenfield';
      } else if (skill.tags.includes('scale-up')) {
        context.mode = 'scale-up';
      }
    }

    // Add project type from category
    if (skill.category) {
      context.projectType = skill.category;
    }

    logger.debug('SkillResolverFacade.getSkillContext completed', {
      skillName: skill.name,
      contextKeys: Object.keys(context)
    });

    return context;
  }

  /**
   * Register a skill
   * @param skill - Skill to register
   */
  @LogExecution('SkillResolverFacade.registerSkill', { logParams: true })
  registerSkill(skill: Skill): void {
    // Validate before registering if enabled
    if (this.enableValidation) {
      const validation = this.validator.validate(skill);
      if (!validation.valid) {
        throw new Error(`Cannot register invalid skill: ${validation.errors.join(', ')}`);
      }
    }

    // Note: SkillRegistry doesn't have a direct register method
    // This is a placeholder for future implementation or custom registry
    logger.info('SkillResolverFacade.registerSkill', {
      skillName: skill.name,
      category: skill.category,
      tags: skill.tags
    });
  }

  /**
   * Unregister a skill by name
   * @param skillName - Name of skill to unregister
   */
  @LogExecution('SkillResolverFacade.unregisterSkill', { logParams: true, paramName: 'skillName' })
  unregisterSkill(skillName: string): void {
    // Note: SkillRegistry doesn't have an unregister method
    // This is a placeholder for future implementation
    logger.info('SkillResolverFacade.unregisterSkill', { skillName });
  }

  /**
   * Get all registered skills
   * @returns Array of all registered skills
   */
  @LogExecution('SkillResolverFacade.getRegisteredSkills', { logParams: false })
  getRegisteredSkills(): Skill[] {
    const skills = this.registry.getAll();
    logger.debug('SkillResolverFacade.getRegisteredSkills', { count: skills.length });
    return skills;
  }

  /**
   * Execute a single skill
   * @param skill - Skill to execute
   * @param context - Execution context
   * @returns Execution result
   */
  @LogExecution('SkillResolverFacade.executeSkill', { logParams: false })
  async executeSkill(skill: Skill, context: SkillExecutionContext): Promise<SkillExecutionWrapper> {
    try {
      // Validate skill before execution if enabled
      if (this.enableValidation) {
        const validation = this.validator.validate(skill);
        if (!validation.valid) {
          return {
            success: false,
            skill,
            error: `Invalid skill: ${validation.errors.join(', ')}`
          };
        }
      }

      // Execute skill if it has an execute method
      if (skill.execute) {
        const result = await skill.execute(context);
        return {
          success: result.success,
          skill,
          output: result.output,
          error: result.error
        };
      }

      // Skill doesn't have execute method - return metadata
      logger.debug('SkillResolverFacade.executeSkill - skill has no execute method', {
        skillName: skill.name
      });

      return {
        success: true,
        skill,
        output: `Skill '${skill.name}' metadata retrieved. No execute method defined.`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('SkillResolverFacade.executeSkill failed', {
        skillName: skill.name,
        error: errorMessage
      });

      return {
        success: false,
        skill,
        error: errorMessage
      };
    }
  }

  /**
   * Execute multiple skills
   * @param skills - Skills to execute
   * @param context - Execution context
   * @returns Array of execution results
   */
  @LogExecution('SkillResolverFacade.executeSkills', { logParams: false })
  async executeSkills(skills: Skill[], context: SkillExecutionContext): Promise<SkillExecutionWrapper[]> {
    const results: SkillExecutionWrapper[] = [];

    for (const skill of skills) {
      const result = await this.executeSkill(skill, context);
      results.push(result);
    }

    logger.debug('SkillResolverFacade.executeSkills completed', {
      totalSkills: skills.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return results;
  }

  /**
   * Set skill priorities
   * @param priority - Priority mapping (skill name -> priority value)
   */
  @LogExecution('SkillResolverFacade.setSkillPriority', { logParams: true })
  setSkillPriority(priority: Record<string, number>): void {
    this.skillPriority = { ...this.skillPriority, ...priority };
    logger.info('SkillResolverFacade.setSkillPriority', {
      priorityCount: Object.keys(priority).length
    });
  }

  /**
   * Enable or disable skill validation
   * @param enabled - Whether to enable validation
   */
  @LogExecution('SkillResolverFacade.enableSkillValidation', { logParams: true })
  enableSkillValidation(enabled: boolean): void {
    this.enableValidation = enabled;
    logger.info('SkillResolverFacade.enableSkillValidation', { enabled });
  }

  /**
   * Get the skill registry
   * @returns Skill registry instance
   */
  getRegistry(): SkillRegistry {
    return this.registry;
  }

  /**
   * Get the skill matcher
   * @returns Skill matcher instance
   */
  getMatcher(): SkillMatcher {
    return this.matcher;
  }

  /**
   * Get the skill validator
   * @returns Skill validator instance
   */
  getValidator(): SkillValidator {
    return this.validator;
  }
}

export default SkillResolverFacade;
