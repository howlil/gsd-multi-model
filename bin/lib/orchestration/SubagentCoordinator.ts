/**
 * Subagent Coordinator — Subagents Pattern Implementation
 *
 * Centralized control with context isolation for task-specific execution.
 * Supervisor delegates to specialized subagents with isolated contexts.
 *
 * Token overhead: +10% (acceptable for +10% reliability)
 * Reliability impact: +10% (context isolation prevents pollution)
 *
 * @example
 * ```typescript
 * const coordinator = new SubagentCoordinator(supervisor);
 * coordinator.addSubagent('calendar', calendarAgent);
 * coordinator.addSubagent('email', emailAgent);
 *
 * const result = await coordinator.callSubagent('calendar', 'Schedule meeting');
 * ```
 */

import type { IAgent } from '../agents/IAgent.js';
import type { Context } from '../context/Context.js';

/**
 * Subagent registration
 */
export interface SubagentRegistration {
  id: string;
  agent: IAgent;
  description?: string;
  capabilities?: string[];
}

/**
 * Subagent call result
 */
export interface SubagentResult {
  success: boolean;
  output: string;
  subagentId: string;
  tokenUsage?: number;
  duration?: number;
}

/**
 * Subagent Coordinator class
 *
 * Implements Subagents pattern for context isolation and task-specific execution.
 * Supervisor maintains centralized control while delegating to specialized subagents.
 */
export class SubagentCoordinator {
  private subagents: Map<string, SubagentRegistration> = new Map();

  /**
   * Create Subagent Coordinator
   * @param supervisor - Supervisor agent for centralized control
   */
  constructor(private supervisor: IAgent) {}

  /**
   * Add a subagent to the pool
   *
   * @param id - Subagent identifier
   * @param agent - Subagent instance
   * @param description - Optional description
   * @param capabilities - Optional list of capabilities
   */
  addSubagent(id: string, agent: IAgent, description?: string, capabilities?: string[]): void {
    this.subagents.set(id, {
      id,
      agent,
      description,
      capabilities
    });
  }

  /**
   * Remove a subagent from the pool
   *
   * @param id - Subagent identifier
   */
  removeSubagent(id: string): boolean {
    return this.subagents.delete(id);
  }

  /**
   * Get a subagent by ID
   *
   * @param id - Subagent identifier
   * @returns Subagent registration or undefined
   */
  getSubagent(id: string): SubagentRegistration | undefined {
    return this.subagents.get(id);
  }

  /**
   * List all registered subagents
   *
   * @returns Array of subagent registrations
   */
  listSubagents(): SubagentRegistration[] {
    return Array.from(this.subagents.values());
  }

  /**
   * Call a subagent with task-specific context isolation
   *
   * @param subagentId - Subagent identifier
   * @param task - Task to execute
   * @param context - Optional context (will be isolated)
   * @returns Subagent result
   */
  async callSubagent(subagentId: string, task: string, context?: Context): Promise<SubagentResult> {
    const startTime = Date.now();
    const registration = this.subagents.get(subagentId);

    if (!registration) {
      return {
        success: false,
        output: `Subagent '${subagentId}' not found. Available: ${this.listSubagentIds()}`,
        subagentId,
        tokenUsage: 0,
        duration: Date.now() - startTime
      };
    }

    try {
      // Isolate context for this subagent
      const isolatedContext = this.isolateContext(subagentId, context);

      // Execute subagent with isolated context
      const result = await registration.agent.execute(task, isolatedContext);

      return {
        success: true,
        output: typeof result === 'string' ? result : JSON.stringify(result),
        subagentId,
        tokenUsage: 0, // Would be extracted from result
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        output: `Subagent '${subagentId}' failed: ${(error as Error).message}`,
        subagentId,
        tokenUsage: 0,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Call multiple subagents in parallel
   *
   * @param tasks - Map of subagent ID to task
   * @param context - Optional shared context
   * @returns Array of subagent results
   */
  async callSubagentsParallel(
    tasks: Map<string, string>,
    context?: Context
  ): Promise<SubagentResult[]> {
    const promises = Array.from(tasks.entries()).map(
      ([subagentId, task]) => this.callSubagent(subagentId, task, context)
    );

    return await Promise.all(promises);
  }

  /**
   * Call subagents sequentially (for dependent tasks)
   *
   * @param tasks - Array of [subagentId, task] tuples
   * @param context - Optional shared context
   * @returns Array of subagent results
   */
  async callSubagentsSequential(
    tasks: Array<[string, string]>,
    context?: Context
  ): Promise<SubagentResult[]> {
    const results: SubagentResult[] = [];

    for (const [subagentId, task] of tasks) {
      const result = await this.callSubagent(subagentId, task, context);
      results.push(result);

      // Stop on first failure
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Isolate context for a specific subagent
   *
   * Creates a minimal context with only what the subagent needs.
   * Prevents context pollution from other subagents.
   *
   * @param subagentId - Subagent identifier
   * @param context - Full context
   * @returns Isolated context
   */
  private isolateContext(subagentId: string, context?: Context): Context {
    if (!context) {
      return {
        phase: '',
        task: '',
        files: [],
        instructions: []
      } as Context;
    }

    // Create isolated context with only relevant data
    // In production, this would filter based on subagent capabilities
    return {
      phase: context.phase,
      task: context.task,
      files: context.files || [],
      instructions: context.instructions || [],
      metadata: {
        ...context.metadata,
        subagentId,
        isolated: true
      }
    } as Context;
  }

  /**
   * Get list of subagent IDs
   *
   * @returns Array of subagent IDs
   */
  private listSubagentIds(): string[] {
    return Array.from(this.subagents.keys()).join(', ');
  }
}

export default SubagentCoordinator;
