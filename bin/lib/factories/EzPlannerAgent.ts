/**
 * EzPlannerAgent
 *
 * Agent responsible for planning and task breakdown.
 * Implements the IAgent interface for consistent agent behavior.
 */

import { LogExecution } from '../decorators/LogExecution.js';
import { defaultLogger as logger } from '../logger.js';
import type { IAgent, AgentContext, AgentResult, AgentConfig } from './types.js';

/**
 * EzPlannerAgent class
 * Plans and breaks down tasks into actionable steps.
 */
export class EzPlannerAgent implements IAgent {
  /** The agent's name identifier */
  private name: string;

  /** The agent's configuration */
  private config: AgentConfig;

  /**
   * Create an EzPlannerAgent instance
   * @param config - The agent configuration
   */
  constructor(config: AgentConfig) {
    this.name = config.name || 'ez-planner';
    this.config = config;
  }

  /**
   * Get the agent's name
   * @returns The agent identifier
   */
  public getName(): string {
    return 'ez-planner';
  }

  /**
   * Get the agent's description
   * @returns A description of the planner agent's purpose
   */
  public getDescription(): string {
    return 'Plans and breaks down tasks into actionable steps with detailed workflow templates.';
  }

  /**
   * Execute the planner agent's primary function
   * @param context - Execution context with task and configuration
   * @returns Promise resolving to agent execution result
   */
  @LogExecution('EzPlannerAgent.execute', { logParams: true, logDuration: true })
  public async execute(context: AgentContext): Promise<AgentResult> {
    try {
      logger.info('EzPlannerAgent executing planning task', {
        task: context.task,
        phase: context.phase
      });

      // Planner agent creates detailed plans for phases
      // In full implementation, this would invoke the planning workflow
      const output = `Planning task: ${context.task}${context.phase ? ` for phase: ${context.phase}` : ''}`;

      logger.info('EzPlannerAgent completed planning task');

      return {
        success: true,
        output,
        nextAgent: 'ez-roadmapper'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('EzPlannerAgent execution failed', { error: errorMessage });

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
  @LogExecution('EzPlannerAgent.validate', { logDuration: true })
  public async validate(): Promise<boolean> {
    try {
      // Validate that required configuration is present
      if (!this.config.name) {
        logger.warn('EzPlannerAgent validation warning: missing config.name');
      }

      logger.info('EzPlannerAgent validation successful');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('EzPlannerAgent validation failed', { error: errorMessage });
      return false;
    }
  }
}
