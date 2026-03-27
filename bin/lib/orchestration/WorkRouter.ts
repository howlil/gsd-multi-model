/**
 * WorkRouter — Router Pattern for work classification and agent routing
 * 
 * Research-backed pattern (LangChain top-4) for production multi-agent orchestration.
 * Token overhead: +15% (acceptable)
 * 
 * @see CONTEXT.md Phase 31 — Locked decisions
 * @see RESEARCH.md — Pattern research and evidence
 */

import type { IAgent } from '../types.js';
import type { Context } from '../context-manager.js';

/**
 * Work type classification
 */
export type WorkType = 
  | 'feature'
  | 'bug'
  | 'refactor'
  | 'migration'
  | 'incident';

/**
 * Agent execution result
 */
export interface AgentResult {
  agentId: string;
  result: string;
  success: boolean;
  tokensUsed: number;
}

/**
 * Synthesized result from fan-in
 */
export interface SynthesizedResult {
  summary: string;
  results: AgentResult[];
  recommendations: string[];
}

/**
 * WorkRouter implements the Router Pattern for multi-agent orchestration.
 * 
 * Features:
 * - Keyword-based classification (no ML overhead)
 * - Fan-out/fan-in for parallel execution
 * - Extends Chief Strategist classification
 * 
 * @example
 * ```typescript
 * const router = new WorkRouter(chiefStrategist);
 * const workType = router.classifyWork('Fix login bug');
 * const agent = router.route(workType, context);
 * ```
 */
export class WorkRouter {
  /**
   * Keyword mappings for work classification
   */
  private readonly keywords: Record<WorkType, string[]> = {
    feature: ['implement', 'add', 'create', 'build', 'develop', 'new', 'feature'],
    bug: ['fix', 'bug', 'issue', 'error', 'crash', 'fail', 'broken'],
    refactor: ['refactor', 'restructure', 'clean', 'simplify', 'optimize', 'improve'],
    migration: ['migrate', 'upgrade', 'move', 'convert', 'transform', 'update'],
    incident: ['incident', 'outage', 'emergency', 'critical', 'production', 'down']
  };

  /**
   * Create WorkRouter instance
   * @param chiefStrategist - Chief Strategist agent for integration
   */
  constructor(private chiefStrategist: IAgent) {}

  /**
   * Classify work type using keyword matching
   * 
   * @param task - Task description
   * @returns Work type classification
   * 
   * @example
   * ```typescript
   * router.classifyWork('Add user authentication') // returns 'feature'
   * router.classifyWork('Fix login crash') // returns 'bug'
   * ```
   */
  classifyWork(task: string): WorkType {
    const taskLower = task.toLowerCase();
    
    // Score each work type by keyword matches
    const scores: Record<WorkType, number> = {
      feature: 0,
      bug: 0,
      refactor: 0,
      migration: 0,
      incident: 0
    };

    for (const [workType, keywords] of Object.entries(this.keywords)) {
      for (const keyword of keywords) {
        if (taskLower.includes(keyword)) {
          scores[workType as WorkType]++;
        }
      }
    }

    // Return highest scoring work type
    let highest: WorkType = 'feature';
    let highestScore = 0;

    for (const [workType, score] of Object.entries(scores)) {
      if (score > highestScore) {
        highest = workType as WorkType;
        highestScore = score;
      }
    }

    return highest;
  }

  /**
   * Route work to appropriate specialist agent
   * 
   * @param workType - Classified work type
   * @param context - Execution context
   * @returns Specialist agent for the work type
   * 
   * @example
   * ```typescript
   * const agent = router.route('bug', context);
   * ```
   */
  route(workType: WorkType, context: Context): IAgent {
    // Map work types to specialist agents
    const agentMap: Record<WorkType, string> = {
      feature: 'ez-product-engineer',
      bug: 'ez-debugger',
      refactor: 'ez-architect-agent',
      migration: 'ez-devops-agent',
      incident: 'ez-chief-strategist'
    };

    const agentName = agentMap[workType];
    
    // Return specialist agent (implementation depends on agent spawning system)
    return this.chiefStrategist; // Placeholder - actual implementation spawns specialist
  }

  /**
   * Fan-out: Execute task across multiple agents in parallel
   * 
   * @param task - Task to execute
   * @param agents - List of agent IDs to spawn
   * @returns Array of agent results
   * 
   * @example
   * ```typescript
   * const results = await router.fanOut(
   *   'Review this code',
   *   ['ez-architect-agent', 'ez-qa-agent', 'ez-security-agent']
   * );
   * ```
   */
  async fanOut(task: string, agents: string[]): Promise<AgentResult[]> {
    // Execute all agents in parallel
    const promises = agents.map(async (agentId) => {
      // In actual implementation, this would spawn the agent
      // For now, return placeholder result
      return {
        agentId,
        result: `Agent ${agentId} executed task: ${task}`,
        success: true,
        tokensUsed: 1000 // Placeholder
      };
    });

    return await Promise.all(promises);
  }

  /**
   * Fan-in: Synthesize results from multiple agents
   * 
   * @param results - Array of agent results
   * @returns Synthesized result with summary and recommendations
   * 
   * @example
   * ```typescript
   * const synthesized = router.fanIn(results);
   * console.log(synthesized.summary);
   * ```
   */
  fanIn(results: AgentResult[]): SynthesizedResult {
    // Aggregate results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    // Generate summary
    const summary = `Executed ${results.length} agents: ${successful.length} successful, ${failed.length} failed`;

    // Generate recommendations based on results
    const recommendations: string[] = [];
    
    if (failed.length > 0) {
      recommendations.push(`Review failed agents: ${failed.map(f => f.agentId).join(', ')}`);
    }

    if (successful.length > 1) {
      recommendations.push('Cross-validate results from multiple agents');
    }

    return {
      summary,
      results,
      recommendations
    };
  }
}

/**
 * Type exports for external use
 */
export type { WorkType, AgentResult, SynthesizedResult };
