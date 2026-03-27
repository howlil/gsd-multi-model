/**
 * Context Share Manager - Cross-agent context sharing (Phase 39)
 *
 * Provides context-aware sharing between agents for coordinated execution.
 */

import { AgentMesh } from './AgentMesh.js';

/**
 * Context item for sharing
 */
export interface ContextItem {
  type: 'decision' | 'observation' | 'result' | 'error';
  agent: string;
  task: string;
  content: unknown;
  metadata: {
    timestamp: string;
    relevance: string[];
    priority: 'low' | 'normal' | 'high';
  };
}

/**
 * Context Share Manager
 *
 * Enables agents to share context information for better coordination.
 */
export class ContextShareManager {
  private readonly mesh: AgentMesh;
  private readonly contextHistory: Map<string, ContextItem[]>;
  private readonly agentSubscriptions: Map<string, Set<string>>;

  constructor(mesh: AgentMesh) {
    this.mesh = mesh;
    this.contextHistory = new Map();
    this.agentSubscriptions = new Map();
  }

  /**
   * Share context with other agents
   */
  async shareContext(context: ContextItem): Promise<void> {
    const taskId = context.task;

    // Store in history
    if (!this.contextHistory.has(taskId)) {
      this.contextHistory.set(taskId, []);
    }
    this.contextHistory.get(taskId)!.push(context);

    // Broadcast via mesh
    const message = {
      type: 'context-share',
      context,
      timestamp: Date.now()
    };

    this.mesh.broadcast('context-share-manager', 'context-updates', JSON.stringify(message));
  }

  /**
   * Get context for a task
   */
  getContext(taskId: string): ContextItem[] {
    return this.contextHistory.get(taskId) || [];
  }

  /**
   * Subscribe an agent to context updates
   */
  subscribe(agentId: string, taskId: string): void {
    if (!this.agentSubscriptions.has(agentId)) {
      this.agentSubscriptions.set(agentId, new Set());
    }
    this.agentSubscriptions.get(agentId)!.add(taskId);
  }

  /**
   * Unsubscribe an agent from context updates
   */
  unsubscribe(agentId: string, taskId: string): void {
    const subscriptions = this.agentSubscriptions.get(agentId);
    if (subscriptions) {
      subscriptions.delete(taskId);
    }
  }
}

export default ContextShareManager;
