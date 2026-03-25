/**
 * EzRoadmapperAgent
 *
 * Agent responsible for creating and maintaining project roadmaps.
 * Implements the IAgent interface for consistent agent behavior.
 */

import { LogExecution } from '../decorators/LogExecution.js';
import { defaultLogger as logger } from '../logger.js';
import type { IAgent, AgentContext, AgentResult, AgentConfig } from './types.js';

/**
 * EzRoadmapperAgent class
 * Creates and maintains project roadmaps with milestones and phases.
 */
export class EzRoadmapperAgent implements IAgent {
  /** The agent's name identifier */
  private name: string;

  /** The agent's configuration */
  private config: AgentConfig;

  /**
   * Create an EzRoadmapperAgent instance
   * @param config - The agent configuration
   */
  constructor(config: AgentConfig) {
    this.name = config.name || 'ez-roadmapper';
    this.config = config;
  }

  /**
   * Get the agent's name
   * @returns The agent identifier
   */
  public getName(): string {
    return 'ez-roadmapper';
  }

  /**
   * Get the agent's description
   * @returns A description of the roadmapper agent's purpose
   */
  public getDescription(): string {
    return 'Creates and maintains project roadmaps with milestones, phases, and execution plans.';
  }

  /**
   * Execute the roadmapper agent's primary function
   * @param context - Execution context with task and configuration
   * @returns Promise resolving to agent execution result
   */
  @LogExecution('EzRoadmapperAgent.execute', { logParams: true, logDuration: true })
  public async execute(context: AgentContext): Promise<AgentResult> {
    try {
      logger.info('EzRoadmapperAgent executing roadmap task', {
        task: context.task,
        phase: context.phase
      });

      // Roadmapper agent creates project roadmaps
      // In full implementation, this would invoke the roadmap creation workflow
      const output = `Roadmap task: ${context.task}${context.phase ? ` for phase: ${context.phase}` : ''}`;

      logger.info('EzRoadmapperAgent completed roadmap task');

      return {
        success: true,
        output,
        nextAgent: 'ez-executor'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('EzRoadmapperAgent execution failed', { error: errorMessage });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Validate the agent's configuration and readiness
   * @returns Promise resolving to validation status
   */
  @LogExecution('EzRoadmapperAgent.validate', { logDuration: true })
  public async validate(): Promise<boolean> {
    try {
      // Validate that required configuration is present
      if (!this.config.name) {
        logger.warn('EzRoadmapperAgent validation warning: missing config.name');
      }

      logger.info('EzRoadmapperAgent validation successful');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('EzRoadmapperAgent validation failed', { error: errorMessage });
      return false;
    }
  }
}
