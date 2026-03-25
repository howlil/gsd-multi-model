/**
 * Agent Registration
 *
 * Functions for registering default agents with the AgentFactoryRegistry.
 * Provides convenient setup for standard agent types.
 */

import { AgentFactoryRegistry } from './AgentFactory.js';
import { EzPlannerAgent } from './EzPlannerAgent.js';
import { EzRoadmapperAgent } from './EzRoadmapperAgent.js';
import { EzExecutorAgent } from './EzExecutorAgent.js';
import { EzPhaseResearcherAgent } from './EzPhaseResearcherAgent.js';
import { EzProjectResearcherAgent } from './EzProjectResearcherAgent.js';
import { EzVerifierAgent } from './EzVerifierAgent.js';
import { defaultLogger as logger } from '../logger.js';

/**
 * Register all default agent types with the registry
 * This function should be called once at application startup.
 */
export function registerDefaultAgents(): void {
  const registry = AgentFactoryRegistry.getInstance();

  // Register ez-planner agent
  registry.registerAgent('ez-planner', (config) => new EzPlannerAgent(config));

  // Register ez-roadmapper agent
  registry.registerAgent('ez-roadmapper', (config) => new EzRoadmapperAgent(config));

  // Register ez-executor agent
  registry.registerAgent('ez-executor', (config) => new EzExecutorAgent(config));

  // Register ez-phase-researcher agent
  registry.registerAgent('ez-phase-researcher', (config) => new EzPhaseResearcherAgent(config));

  // Register ez-project-researcher agent
  registry.registerAgent('ez-project-researcher', (config) => new EzProjectResearcherAgent(config));

  // Register ez-verifier agent
  registry.registerAgent('ez-verifier', (config) => new EzVerifierAgent(config));

  logger.info('All default agents registered successfully', {
    count: registry.getRegisteredTypes().length,
    types: registry.getRegisteredTypes()
  });
}

/**
 * Get a list of all registered agent types
 * @returns Array of registered agent type identifiers
 */
export function getRegisteredAgents(): string[] {
  const registry = AgentFactoryRegistry.getInstance();
  return registry.getRegisteredTypes();
}

/**
 * Check if a specific agent type is registered
 * @param type - The agent type to check
 * @returns True if the agent type is registered
 */
export function isAgentRegistered(type: string): boolean {
  const registry = AgentFactoryRegistry.getInstance();
  return registry.hasAgent(type);
}
