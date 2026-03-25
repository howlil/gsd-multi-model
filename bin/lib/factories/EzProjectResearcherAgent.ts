/**
 * EzProjectResearcherAgent
 *
 * Agent responsible for researching and gathering context for entire projects.
 * Implements the IAgent interface for consistent agent behavior.
 */

import { LogExecution } from '../decorators/LogExecution.js';
import { defaultLogger as logger } from '../logger.js';
import type { IAgent, AgentContext, AgentResult, AgentConfig } from './types.js';

/**
 * EzProjectResearcherAgent class
 * Researches and gathers context for entire projects.
 */
export class EzProjectResearcherAgent implements IAgent {
  /** The agent's name identifier */
  private name: string;

  /** The agent's configuration */
  private config: AgentConfig;

  /**
   * Create an EzProjectResearcherAgent instance
   * @param config - The agent configuration
   */
  constructor(config: AgentConfig) {
    this.name = config.name || 'ez-project-researcher';
    this.config = config;
  }

  /**
   * Get the agent's name
   * @returns The agent identifier
   */
  public getName(): string {
    return 'ez-project-researcher';
  }

  /**
   * Get the agent's description
   * @returns A description of the project researcher agent's purpose
   */
  public getDescription(): string {
    return 'Researches and gathers context for entire projects including architecture, dependencies, and requirements.';
  }

  /**
   * Execute the project researcher agent's primary function
   * @param context - Execution context with task and configuration
   * @returns Promise resolving to agent execution result
   */
  @LogExecution('EzProjectResearcherAgent.execute', { logParams: true, logDuration: true })
  public async execute(context: AgentContext): Promise<AgentResult> {
    try {
      logger.info('EzProjectResearcherAgent executing project research task', {
        task: context.task,
        files: context.files
      });

      // Project researcher gathers context for entire projects
      // In full implementation, this would invoke the project research workflow
      const fileContext = context.files ? ` with ${context.files.length} file(s)` : '';
      const output = `Project research task: ${context.task}${fileContext}`;

      logger.info('EzProjectResearcherAgent completed project research task');

      return {
        success: true,
        output,
        nextAgent: 'ez-roadmapper'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('EzProjectResearcherAgent execution failed', { error: errorMessage });

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
  @LogExecution('EzProjectResearcherAgent.validate', { logDuration: true })
  public async validate(): Promise<boolean> {
    try {
      // Validate that required configuration is present
      if (!this.config.name) {
        logger.warn('EzProjectResearcherAgent validation warning: missing config.name');
      }

      logger.info('EzProjectResearcherAgent validation successful');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('EzProjectResearcherAgent validation failed', { error: errorMessage });
      return false;
    }
  }
}
