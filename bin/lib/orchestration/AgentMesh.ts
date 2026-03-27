/**
 * AgentMesh — Peer Mesh Pattern for agent-to-agent communication
 * 
 * Research-backed pattern for production multi-agent orchestration.
 * Token overhead: +20% (acceptable for +25-30% reliability)
 * +25-30% reliability for peer-to-peer workflows
 * 
 * @see CONTEXT.md Phase 31 — Locked decisions
 * @see RESEARCH.md — Pattern research and evidence
 */

import type { Message } from './types.js';

/**
 * Message queue for async communication
 */
export class MessageQueue {
  private readonly messages: Message[] = [];

  /**
   * Enqueue message
   */
  enqueue(message: Message): void {
    this.messages.push(message);
  }

  /**
   * Dequeue message
   */
  dequeue(): Message | undefined {
    return this.messages.shift();
  }

  /**
   * Get queue length
   */
  length(): number {
    return this.messages.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.messages.length === 0;
  }
}

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'claimed' | 'completed' | 'failed';

/**
 * Task for shared delegation
 */
export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  claimedBy?: string;
  createdAt: number;
  completedAt?: number;
  result?: string;
}

/**
 * Shared task pool for agent-to-agent delegation
 */
export class SharedTaskPool {
  /**
   * Task storage
   */
  private readonly tasks: Map<string, Task>;

  constructor() {
    this.tasks = new Map();
  }

  /**
   * Add task to pool
   */
  addTask(task: Task): void {
    this.tasks.set(task.id, task);
  }

  /**
   * Claim task (atomic)
   */
  claim(agentId: string, taskId: string): boolean {
    const task = this.tasks.get(taskId);
    
    if (!task || task.status !== 'pending') {
      return false;
    }

    // Atomic claim
    task.status = 'claimed';
    task.claimedBy = agentId;
    
    return true;
  }

  /**
   * Complete task
   */
  complete(taskId: string, result: string): boolean {
    const task = this.tasks.get(taskId);
    
    if (!task || task.status !== 'claimed') {
      return false;
    }

    task.status = 'completed';
    task.result = result;
    task.completedAt = Date.now();
    
    return true;
  }

  /**
   * Get pending tasks
   */
  getPendingTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'pending');
  }

  /**
   * Get claimed tasks by agent
   */
  getClaimedTasks(agentId: string): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.claimedBy === agentId);
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get task pool size
   */
  size(): number {
    return this.tasks.size;
  }

  /**
   * Clear completed tasks
   */
  clearCompleted(): number {
    let cleared = 0;
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === 'completed') {
        this.tasks.delete(taskId);
        cleared++;
      }
    }
    return cleared;
  }
}

/**
 * AgentMesh implements the Peer Mesh Pattern for multi-agent orchestration.
 * 
 * Features:
 * - Agent-to-agent communication without central orchestrator
 * - Shared task pool with claim-based delegation
 * - Mailbox system for async communication
 * - +25-30% reliability for peer-to-peer workflows
 * 
 * @example
 * ```typescript
 * const mesh = new AgentMesh();
 * mesh.registerAgent('agent-1');
 * mesh.registerAgent('agent-2');
 * mesh.claimTask('agent-1', 'task-123');
 * mesh.broadcast('agent-1', { type: 'notification', content: 'Task complete' });
 * ```
 */
export class AgentMesh {
  /**
   * Shared task pool
   */
  private readonly taskPool: SharedTaskPool;

  /**
   * Agent mailboxes (async communication)
   */
  private readonly mailboxes: Map<string, MessageQueue>;

  /**
   * Registered agent IDs
   */
  private readonly agentIds: Set<string>;

  constructor() {
    this.taskPool = new SharedTaskPool();
    this.mailboxes = new Map();
    this.agentIds = new Set();
  }

  /**
   * Register agent with mesh
   * 
   * @param agentId - Agent identifier
   * 
   * @example
   * ```typescript
   * mesh.registerAgent('agent-1');
   * mesh.registerAgent('agent-2');
   * ```
   */
  registerAgent(agentId: string): void {
    this.agentIds.add(agentId);
    this.mailboxes.set(agentId, new MessageQueue());
  }

  /**
   * Unregister agent from mesh
   */
  unregisterAgent(agentId: string): boolean {
    this.agentIds.delete(agentId);
    return this.mailboxes.delete(agentId);
  }

  /**
   * Claim task from pool
   * 
   * @param agentId - Agent identifier
   * @param taskId - Task identifier
   * @returns True if task was claimed successfully
   * 
   * @example
   * ```typescript
   * const claimed = mesh.claimTask('agent-1', 'task-123');
   * ```
   */
  claimTask(agentId: string, taskId: string): boolean {
    return this.taskPool.claim(agentId, taskId);
  }

  /**
   * Broadcast message to all agents
   * 
   * @param agentId - Sender agent identifier
   * @param message - Message to broadcast
   * 
   * @example
   * ```typescript
   * mesh.broadcast('agent-1', { type: 'notification', content: 'Task complete' });
   * ```
   */
  broadcast(agentId: string, message: Message): void {
    for (const [id, mailbox] of this.mailboxes.entries()) {
      if (id !== agentId) {
        mailbox.enqueue(message);
      }
    }
  }

  /**
   * Subscribe agent to channel
   * 
   * @param agentId - Agent identifier
   * @param channel - Channel name
   * 
   * @example
   * ```typescript
   * mesh.subscribe('agent-1', 'alerts');
   * ```
   */
  subscribe(agentId: string, channel: string): void {
    // Channel-based subscription (simplified for now)
    // In actual implementation, would create channel-specific mailboxes
  }

  /**
   * Get messages for agent
   * 
   * @param agentId - Agent identifier
   * @returns Array of messages
   */
  getMessages(agentId: string): Message[] {
    const mailbox = this.mailboxes.get(agentId);
    if (!mailbox) return [];

    const messages: Message[] = [];
    while (!mailbox.isEmpty()) {
      const message = mailbox.dequeue();
      if (message) messages.push(message);
    }
    return messages;
  }

  /**
   * Add task to pool
   * 
   * @param task - Task to add
   */
  addTask(task: Task): void {
    this.taskPool.addTask(task);
  }

  /**
   * Get pending tasks
   */
  getPendingTasks(): Task[] {
    return this.taskPool.getPendingTasks();
  }

  /**
   * Get registered agent count
   */
  getAgentCount(): number {
    return this.agentIds.size;
  }

  /**
   * Check if agent is registered
   */
  hasAgent(agentId: string): boolean {
    return this.agentIds.has(agentId);
  }

  /**
   * Get task pool size
   */
  getTaskPoolSize(): number {
    return this.taskPool.size();
  }

  /**
   * Clear completed tasks from pool
   */
  clearCompletedTasks(): number {
    return this.taskPool.clearCompleted();
  }
}

/**
 * Type exports for external use
 */
export type { Task, TaskStatus, Message };
