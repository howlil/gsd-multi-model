/**
 * Facades Module
 *
 * Provides unified simplified interfaces for complex subsystems.
 * Implements the Facade design pattern for context management and skill resolution.
 *
 * @module facades
 */

// Context Manager Facade
export {
  ContextManagerFacade,
  type ContextManagerFacadeOptions,
  type FacadeCompressionStats,
  type FacadeScoringStats
} from './ContextManagerFacade.js';

// Skill Resolver Facade
export {
  SkillResolverFacade,
  type SkillResolverFacadeOptions,
  type SkillResolutionResult,
  type SkillExecutionWrapper
} from './SkillResolverFacade.js';
