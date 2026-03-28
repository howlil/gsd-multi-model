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

// Conflict Detection
export {
  ConflictDetector,
  ConflictLog,
  type ConflictConfig,
  type Conflict,
  type ConflictResult
} from './conflict-detector.js';

// Context Sharing
export {
  ContextShareManager,
  type ContextShareConfig,
  type ContextShare,
  type ContextShareResult
} from './context-share-manager.js';

export {
  extractTopics,
  extractTopicsFromPath,
  extractTopicsFromContent,
  extractTopicsFromTask,
  getTopicPriority,
  isValidTopic,
  normalizeTopic,
  type TopicConfig,
  type TopicExtraction
} from './context-topics.js';

// Phase 31: Advanced Orchestration Patterns
// ORCH-01 to ORCH-06: Wave execution, dependency resolution, failure handling
export { AdvancedOrchestrator } from './advanced-orchestrator.js';
export type { Task, TaskStatus, WaveResult, OrchestrationStats, Checkpoint } from './advanced-orchestrator.js';

// Default export
export default {
  WorkRouter: (await import('./WorkRouter.js')).WorkRouter,
  SubagentCoordinator: (await import('./SubagentCoordinator.js')).SubagentCoordinator,
  HandoffManager: (await import('./HandoffManager.js')).HandoffManager,
  AgentMesh: (await import('./AgentMesh.js')).AgentMesh,
  ConflictDetector: (await import('./conflict-detector.js')).ConflictDetector,
  ConflictLog: (await import('./conflict-log.js')).ConflictLog,
  ContextShareManager: (await import('./context-share-manager.js')).ContextShareManager,
  ContextTopics: {
    extractTopics: (await import('./context-topics.js')).extractTopics,
    extractTopicsFromPath: (await import('./context-topics.js')).extractTopicsFromPath,
    extractTopicsFromContent: (await import('./context-topics.js')).extractTopicsFromContent,
    extractTopicsFromTask: (await import('./context-topics.js')).extractTopicsFromTask
  },
  AdvancedOrchestrator: (await import('./advanced-orchestrator.js')).AdvancedOrchestrator
};
