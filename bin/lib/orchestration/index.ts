/**
 * Orchestration Module — Advanced multi-agent orchestration patterns
 * 
 * Research-backed patterns for production multi-agent orchestration:
 * - Router Pattern (LangChain top-4)
 * - Subagents Pattern (LangChain top-4)
 * - Handoff Manager (LangChain top-4)
 * - Peer Mesh (High-impact pattern)
 * 
 * Token efficiency: 1.55x overhead (64% savings vs 7 patterns)
 * 
 * @see CONTEXT.md Phase 31 — Locked decisions
 * @see RESEARCH.md — Pattern research and evidence
 */

// Router Pattern
export { WorkRouter } from './WorkRouter.js';
export type { WorkType, AgentResult, SynthesizedResult } from './WorkRouter.js';

// Subagents Pattern
export { SubagentCoordinator } from './SubagentCoordinator.js';
export type { SubagentResult } from './SubagentCoordinator.js';

// Handoff Manager
export { HandoffManager } from './HandoffManager.js';
export type { AgentState, HandoffContext, HandoffStep, Workflow } from './HandoffManager.js';

// Peer Mesh
export { AgentMesh, SharedTaskPool, MessageQueue } from './AgentMesh.js';
export type { Task, TaskStatus, Message } from './AgentMesh.js';

// Type definitions
export type { IAgent, AgentExecutionResult } from './types.js';
