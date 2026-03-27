/**
 * SubagentCoordinator — Subagents Pattern for context isolation
 * 
 * Research-backed pattern (LangChain top-4) for production multi-agent orchestration.
 * Token overhead: +10% (acceptable)
 * 67% fewer tokens than Skills pattern in large-context domains
 * 
 * @see CONTEXT.md Phase 31 — Locked decisions
 * @see RESEARCH.md — Pattern research and evidence
 */

import type { IAgent } from '../types.js';
import type { Context } from '../context-manager.js';

/**
 * Subagent execution result
 */
export interface SubagentResult {
  subagentId: string;
  result: string;
  success: boolean;
  tokensUsed: number;
  contextIsolated: boolean;
}

/**
 * SubagentCoordinator implements the Subagents Pattern for multi-agent orchestration.
 * 
 * Features:
 * - Centralized control with context isolation
 * - Stateless subagents (no shared state)
 * - Tool-based calling (subagent as tool)
 * - 67% fewer tokens than Skills pattern
 * 
 * @example
 * ```typescript
 * const coordinator = new SubagentCoordinator(chiefStrategist);
 * coordinator.registerSubagent('backend', backendAgent);
 * const result = await coordinator.callSubagent('backend', 'Implement API endpoint');
 * ```
 */
export class SubagentCoordinator {
  /**
   * Subagent pool (stateless, isolated context)
   */
  private readonly subagents: Map<string, IAgent>;

  /**
   * Create SubagentCoordinator instance
   * @param supervisor - Supervisor agent for centralized control
   */
  constructor(private supervisor: IAgent) {
    this.subagents = new Map();
  }

  /**
   * Register subagent with coordinator
   * 
   * @param name - Subagent identifier
   * @param agent - Subagent instance
   * 
   * @example
   * ```typescript
   * coordinator.registerSubagent('backend', backendAgent);
   * coordinator.registerSubagent('frontend', frontendAgent);
   * ```
   */
  registerSubagent(name: string, agent: IAgent): void {
    this.subagents.set(name, agent);
  }

  /**
   * Call subagent as tool with isolated context
   * 
   * @param name - Subagent identifier
   * @param task - Task to execute
   * @returns Subagent execution result
   * 
   * @example
   * ```typescript
   * const result = await coordinator.callSubagent('backend', 'Implement API endpoint');
   * ```
   */
  async callSubagent(name: string, task: string): Promise<SubagentResult> {
    const subagent = this.subagents.get(name);
    
    if (!subagent) {
      throw new Error(`Subagent ${name} not found`);
    }

    // Isolate context (no leakage from other subagents)
    const isolatedContext = this.isolateContext(name);

    try {
      // Execute task with isolated context
      const result = await subagent.execute(task, isolatedContext);

      return {
        subagentId: name,
        result: result.output,
        success: true,
        tokensUsed: result.tokensUsed || 0,
        contextIsolated: true
      };
    } catch (error) {
      return {
        subagentId: name,
        result: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false,
        tokensUsed: 0,
        contextIsolated: true
      };
    }
  }

  /**
   * Isolate context for subagent (no leakage)
   * 
   * Creates minimal context for subagent execution.
   * Prevents context leakage between subagents.
   * 
   * @param subagentId - Subagent identifier
   * @returns Isolated context
   * 
   * @example
   * ```typescript
   * const context = coordinator.isolateContext('backend');
   * ```
   */
  isolateContext(subagentId: string): Context {
    // Create minimal context for subagent
    // Only includes essential information, no leakage from other subagents
    
    return {
      taskId: `subagent:${subagentId}:${Date.now()}`,
      scope: 'isolated',
      files: [],
      urls: [],
      task: 'Subagent task execution',
      enableScoring: false, // No scoring needed for isolated context
      enableCompression: false, // No compression needed
      enableDeduplication: false // No deduplication needed
    };
  }

  /**
   * Get registered subagent names
   * 
   * @returns Array of subagent names
   * 
   * @example
   * ```typescript
   * const names = coordinator.getSubagentNames();
   * ```
   */
  getSubagentNames(): string[] {
    return Array.from(this.subagents.keys());
  }

  /**
   * Get subagent count
   * 
   * @returns Number of registered subagents
   */
  getSubagentCount(): number {
    return this.subagents.size;
  }

  /**
   * Unregister subagent
   * 
   * @param name - Subagent identifier
   * @returns True if subagent was unregistered
   */
  unregisterSubagent(name: string): boolean {
    return this.subagents.delete(name);
  }

  /**
   * Check if subagent is registered
   * 
   * @param name - Subagent identifier
   * @returns True if subagent is registered
   */
  hasSubagent(name: string): boolean {
    return this.subagents.has(name);
  }
}

/**
 * Type exports for external use
 */
export type { SubagentResult };
