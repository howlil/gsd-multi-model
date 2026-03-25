/**
 * Factory Pattern Barrel Export
 *
 * Central export for all factory pattern classes, interfaces, and functions.
 * Provides access to Agent Factory pattern implementation.
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
export { AgentFactoryRegistry } from './AgentFactory.js';

// Agent Classes
export { EzPlannerAgent } from './EzPlannerAgent.js';
export { EzRoadmapperAgent } from './EzRoadmapperAgent.js';
export { EzExecutorAgent } from './EzExecutorAgent.js';
export { EzPhaseResearcherAgent } from './EzPhaseResearcherAgent.js';
export { EzProjectResearcherAgent } from './EzProjectResearcherAgent.js';
export { EzVerifierAgent } from './EzVerifierAgent.js';

// Registration Functions
export {
  registerDefaultAgents,
  getRegisteredAgents,
  isAgentRegistered
} from './registerAgents.js';
