/**
 * Orchestration Patterns
 *
 * Advanced orchestration patterns for agent coordination.
 * Implements Router, Subagents, Handoff, and Peer Mesh patterns.
 */

// Router Pattern
export { WorkRouter, type WorkType, type AgentResult, type SynthesizedResult } from './WorkRouter.js';

// Subagents Pattern
export { SubagentCoordinator, type SubagentRegistration, type SubagentResult } from './SubagentCoordinator.js';

// Handoff Pattern
export { HandoffManager, type AgentState, type HandoffStep, type Workflow, type HandoffContext, type WorkflowResult } from './HandoffManager.js';

// Peer Mesh Pattern
export { AgentMesh, type Task, type Message, type MeshAgent } from './AgentMesh.js';

// Default export
export default {
  WorkRouter: (await import('./WorkRouter.js')).WorkRouter,
  SubagentCoordinator: (await import('./SubagentCoordinator.js')).SubagentCoordinator,
  HandoffManager: (await import('./HandoffManager.js')).HandoffManager,
  AgentMesh: (await import('./AgentMesh.js')).AgentMesh
};
