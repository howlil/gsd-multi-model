/**
 * Factory Pattern — Agent creation and registration
 *
 * Provides factory pattern implementation for creating agent instances.
 * Supports 6+ agent types: Planner, Roadmapper, Executor, Phase Researcher,
 * Project Researcher, and Verifier.
 *
 * @example
 * ```typescript
 * import { AgentFactoryRegistry, EzPlannerAgent } from '@howlil/ez-agents';
 *
 * // Register agent
 * AgentFactoryRegistry.register('planner', EzPlannerAgent);
 *
 * // Create agent instance
 * const planner = AgentFactoryRegistry.create('planner', {
 *   model: 'qwen',
 *   temperature: 0.7
 * });
 *
 * // Execute task
 * const result = await planner.execute({
 *   task: 'Create project roadmap',
 *   context: [...]
 * });
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  IAgent,
  AgentConfig,
  AgentContext,
  AgentResult,
  AgentFactory
} from './types.js';

// Factory Registry
/**
 * Agent Factory Registry — Central registry for agent factories
 *
 * @see {@link AgentFactoryRegistry.register} for registering agents
 * @see {@link AgentFactoryRegistry.create} for creating agent instances
 */
export { AgentFactoryRegistry } from './AgentFactory.js';

// Agent Classes
/**
 * Planner Agent — Analyzes tasks and creates execution plans
 */
export { EzPlannerAgent } from './EzPlannerAgent.js';

/**
 * Roadmapper Agent — Creates project roadmaps and milestones
 */
export { EzRoadmapperAgent } from './EzRoadmapperAgent.js';

/**
 * Executor Agent — Executes plans and writes code
 */
export { EzExecutorAgent } from './EzExecutorAgent.js';

/**
 * Phase Researcher Agent — Researches specific phases
 */
export { EzPhaseResearcherAgent } from './EzPhaseResearcherAgent.js';

/**
 * Project Researcher Agent — Researches entire projects
 */
export { EzProjectResearcherAgent } from './EzProjectResearcherAgent.js';

/**
 * Verifier Agent — Validates work and runs tests
 */
export { EzVerifierAgent } from './EzVerifierAgent.js';

// Registration Functions
/**
 * Register default agents in the factory registry
 */
export {
  registerDefaultAgents,
  getRegisteredAgents,
  isAgentRegistered
} from './registerAgents.js';
