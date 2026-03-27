/**
 * Type definitions for orchestration module
 */

/**
 * Message for agent-to-agent communication
 */
export interface Message {
  type: string;
  content: string;
  fromAgent?: string;
  toAgent?: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Agent interface for orchestration
 */
export interface IAgent {
  agentId: string;
  execute(task: string, context: any): Promise<AgentExecutionResult>;
}

/**
 * Agent execution result
 */
export interface AgentExecutionResult {
  output: string;
  tokensUsed?: number;
  success?: boolean;
}
