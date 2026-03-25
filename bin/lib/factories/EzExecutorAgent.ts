/**
 * EzExecutorAgent
 *
 * Agent responsible for executing planned tasks and managing workflow.
 * Implements the IAgent interface for consistent agent behavior.
 */

import { LogExecution } from '../decorators/LogExecution.js';
import { defaultLogger as logger } from '../logger.js';
import type { IAgent, AgentContext, AgentResult, AgentConfig } from './types.js';

/**
 * EzExecutorAgent class
 * Executes planned tasks and manages workflow orchestration.
 */
export class EzExecutorAgent implements IAgent {
  /** The agent's name identifier */
  private name: string;

  /** The agent's configuration */
  private config: AgentConfig;

  /**
   * Create an EzExecutorAgent instance
   * @param config - The agent configuration
   */
  constructor(config: AgentConfig) {
    this.name = config.name || 'ez-executor';
    this.config = config;
  }

  /**
   * Get the agent's name
   * @returns The agent identifier
   */
  public getName(): string {
    return 'ez-executor';
  }

  /**
   * Get the agent's description
   * @returns A description of the executor agent's purpose
   */
  public getDescription(): string {
    return 'Executes planned tasks and manages workflow orchestration with skill-based operations.';
  }

  /**
   * Execute the executor agent's primary function
   * @param context - Execution context with task and configuration
   * @returns Promise resolving to agent execution result
   */
  @LogExecution('EzExecutorAgent.execute', { logParams: true, logDuration: true })
  public async execute(context: AgentContext): Promise<AgentResult> {
    try {
      logger.info('EzExecutorAgent executing workflow task', {
        task: context.task,
        files: context.files,
        phase: context.phase
      });

      // Executor agent executes planned tasks
      // In full implementation, this would invoke the execution workflow with skills
      const fileContext = context.files ? ` with ${context.files.length} file(s)` : '';
      const output = `Execution task: ${context.task}${fileContext}${context.phase ? ` for phase: ${context.phase}` : ''}`;

      logger.info('EzExecutorAgent completed workflow task');

      return {
        success: true,
        output,
        nextAgent: 'ez-verifier'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('EzExecutorAgent execution failed', { error: errorMessage });

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
  @LogExecution('EzExecutorAgent.validate', { logDuration: true })
  public async validate(): Promise<boolean> {
    try {
      // Validate that required configuration is present
      if (!this.config.name) {
        logger.warn('EzExecutorAgent validation warning: missing config.name');
      }

      logger.info('EzExecutorAgent validation successful');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('EzExecutorAgent validation failed', { error: errorMessage });
      return false;
    }
  }
}
