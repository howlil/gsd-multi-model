/**
 * Factory Pattern Types
 *
 * Type definitions for the Agent Factory pattern implementation.
 * Provides interfaces for agent contracts, configuration, and factory functions.
 *
 * @packageDocumentation
 */

/**
 * Agent contract interface
 * Defines the standard interface that all agents must implement.
 */
export interface IAgent {
  /**
   * Get the agent's name
   * @returns The agent identifier
   */
  getName(): string;

  /**
   * Get the agent's description
   * @returns A description of the agent's purpose
   */
  getDescription(): string;

  /**
   * Execute the agent's primary function
   * @param context - Execution context with task and configuration
   * @returns Promise resolving to agent execution result
   */
  execute(context: AgentContext): Promise<AgentResult>;

  /**
   * Validate the agent's configuration and readiness
   * @returns Promise resolving to validation status
   */
  validate(): Promise<boolean>;
}

/**
 * Agent execution context
 * Provides the necessary information for agent execution.
 */
export interface AgentContext {
  /** The task or instruction for the agent to execute */
  task: string;

  /** Optional list of files to process */
  files?: string[];

  /** Optional variables for template substitution or configuration */
  variables?: Record<string, string>;

  /** Optional phase identifier for phase-aware agents */
  phase?: string;
}

/**
 * Agent execution result
 * Represents the outcome of an agent's execution.
 */
export interface AgentResult {
  /** Whether the agent execution was successful */
  success: boolean;

  /** Optional output from the agent */
  output?: string;

  /** Optional error message if execution failed */
  error?: string;

  /** Optional identifier for the next agent in a chain */
  nextAgent?: string;
}

/**
 * Agent configuration
 * Configuration options for agent instantiation.
 */
export interface AgentConfig {
  /** The agent's name/identifier */
  name: string;

  /** Optional model profile to use (quality, balanced, budget) */
  modelProfile?: string;

  /** Optional variables for agent configuration */
  variables?: Record<string, string>;

  /** Additional configuration options (extensible) */
  [key: string]: any;
}

/**
 * Agent factory function type
 * Function signature for creating agent instances.
 */
export type AgentFactory = (config: AgentConfig) => IAgent;
