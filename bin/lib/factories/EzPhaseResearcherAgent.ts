/**
 * EzPhaseResearcherAgent
 *
 * Agent responsible for researching and gathering context for specific phases.
 * Implements the IAgent interface for consistent agent behavior.
 */

import { LogExecution } from '../decorators/LogExecution.js';
import { defaultLogger as logger } from '../logger.js';
import type { IAgent, AgentContext, AgentResult, AgentConfig } from './types.js';

/**
 * EzPhaseResearcherAgent class
 * Researches and gathers context for specific phases.
 */
export class EzPhaseResearcherAgent implements IAgent {
  /** The agent's name identifier */
  private name: string;

  /** The agent's configuration */
  private config: AgentConfig;

  /**
   * Create an EzPhaseResearcherAgent instance
   * @param config - The agent configuration
   */
  constructor(config: AgentConfig) {
    this.name = config.name || 'ez-phase-researcher';
    this.config = config;
  }

  /**
   * Get the agent's name
   * @returns The agent identifier
   */
  public getName(): string {
    return 'ez-phase-researcher';
  }

  /**
   * Get the agent's description
   * @returns A description of the phase researcher agent's purpose
   */
  public getDescription(): string {
    return 'Researches and gathers context for specific phases including codebase analysis and requirements.';
  }

  /**
   * Execute the phase researcher agent's primary function
   * @param context - Execution context with task and configuration
   * @returns Promise resolving to agent execution result
   */
  @LogExecution('EzPhaseResearcherAgent.execute', { logParams: true, logDuration: true })
  public async execute(context: AgentContext): Promise<AgentResult> {
    try {
      logger.info('EzPhaseResearcherAgent executing research task', {
        task: context.task,
        phase: context.phase
      });

      // Phase researcher gathers context for specific phases
      // In full implementation, this would invoke the research workflow
      const output = `Phase research task: ${context.task}${context.phase ? ` for phase: ${context.phase}` : ''}`;

      logger.info('EzPhaseResearcherAgent completed research task');

      return {
        success: true,
        output,
        nextAgent: 'ez-planner'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('EzPhaseResearcherAgent execution failed', { error: errorMessage });

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
  @LogExecution('EzPhaseResearcherAgent.validate', { logDuration: true })
  public async validate(): Promise<boolean> {
    try {
      // Validate that required configuration is present
      if (!this.config.name) {
        logger.warn('EzPhaseResearcherAgent validation warning: missing config.name');
      }

      logger.info('EzPhaseResearcherAgent validation successful');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('EzPhaseResearcherAgent validation failed', { error: errorMessage });
      return false;
    }
  }
}
