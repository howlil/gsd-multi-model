/**
 * EzVerifierAgent
 *
 * Agent responsible for verifying completed work and validating quality.
 * Implements the IAgent interface for consistent agent behavior.
 */

import { LogExecution } from '../decorators/LogExecution.js';
import { defaultLogger as logger } from '../logger.js';
import type { IAgent, AgentContext, AgentResult, AgentConfig } from './types.js';

/**
 * EzVerifierAgent class
 * Verifies completed work and validates quality standards.
 */
export class EzVerifierAgent implements IAgent {
  /** The agent's name identifier */
  private name: string;

  /** The agent's configuration */
  private config: AgentConfig;

  /**
   * Create an EzVerifierAgent instance
   * @param config - The agent configuration
   */
  constructor(config: AgentConfig) {
    this.name = config.name || 'ez-verifier';
    this.config = config;
  }

  /**
   * Get the agent's name
   * @returns The agent identifier
   */
  public getName(): string {
    return 'ez-verifier';
  }

  /**
   * Get the agent's description
   * @returns A description of the verifier agent's purpose
   */
  public getDescription(): string {
    return 'Verifies completed work and validates quality standards including tests and documentation.';
  }

  /**
   * Execute the verifier agent's primary function
   * @param context - Execution context with task and configuration
   * @returns Promise resolving to agent execution result
   */
  @LogExecution('EzVerifierAgent.execute', { logParams: true, logDuration: true })
  public async execute(context: AgentContext): Promise<AgentResult> {
    try {
      logger.info('EzVerifierAgent executing verification task', {
        task: context.task,
        files: context.files,
        phase: context.phase
      });

      // Verifier agent validates completed work
      // In full implementation, this would invoke the verification workflow
      const fileContext = context.files ? ` with ${context.files.length} file(s)` : '';
      const output = `Verification task: ${context.task}${fileContext}${context.phase ? ` for phase: ${context.phase}` : ''}`;

      logger.info('EzVerifierAgent completed verification task');

      return {
        success: true,
        output
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('EzVerifierAgent execution failed', { error: errorMessage });

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
  @LogExecution('EzVerifierAgent.validate', { logDuration: true })
  public async validate(): Promise<boolean> {
    try {
      // Validate that required configuration is present
      if (!this.config.name) {
        logger.warn('EzVerifierAgent validation warning: missing config.name');
      }

      logger.info('EzVerifierAgent validation successful');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('EzVerifierAgent validation failed', { error: errorMessage });
      return false;
    }
  }
}
