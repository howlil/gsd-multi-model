/**
 * Assistant Adapter — Adapts AI assistant tool calls to unified format
 */

import { defaultLogger as logger } from './logger.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

export type ToolName = 
  | 'Read' | 'Write' | 'Edit' | 'Bash' | 'Grep' | 'Glob'
  | 'WebSearch' | 'WebFetch' | 'TodoWrite' | 'AskUserQuestion' | 'Task';

export interface ToolCall {
  name: ToolName;
  arguments: Record<string, any>;
}

export interface ToolMapping {
  [key: string]: string;
}

// ─── Tool Name Mappings ─────────────────────────────────────────────────────

/**
 * Tool name mappings between different AI assistants
 */
export const TOOL_MAPPINGS: Record<string, ToolMapping> = {
  // Claude Code → Other assistants
  'claude': {
    'Read': 'read',
    'Write': 'write',
    'Edit': 'edit',
    'Bash': 'bash',
    'Grep': 'grep',
    'Glob': 'glob',
    'WebSearch': 'websearch',
    'WebFetch': 'webfetch',
    'TodoWrite': 'todowrite',
    'AskUserQuestion': 'question',
    'Task': 'task'
  },
  // Gemini CLI mappings
  'gemini': {
    'Read': 'read_file',
    'Write': 'write_file',
    'Edit': 'replace',
    'Bash': 'run_shell_command',
    'Grep': 'search_file_content',
    'Glob': 'glob',
    'WebSearch': 'google_web_search',
    'WebFetch': 'web_fetch',
    'TodoWrite': 'write_todos',
    'AskUserQuestion': 'ask_user'
  },
  // GitHub Copilot mappings
  'copilot': {
    'Read': 'read',
    'Write': 'edit',
    'Edit': 'edit',
    'Bash': 'execute',
    'Grep': 'search',
    'Glob': 'search',
    'WebSearch': 'web',
    'WebFetch': 'web',
    'TodoWrite': 'todo',
    'AskUserQuestion': 'ask_user',
    'Task': 'agent'
  }
};

// ─── Adapter Functions ──────────────────────────────────────────────────────

/**
 * Map tool name from Claude Code to target assistant
 */
export function mapToolName(name: ToolName, targetAssistant: string): string {
  const mapping = TOOL_MAPPINGS[targetAssistant.toLowerCase()];
  if (!mapping) {
    return name.toLowerCase();
  }
  return mapping[name] || name.toLowerCase();
}

/**
 * Parse tool call from assistant response
 */
export function parseToolCall(response: string): ToolCall[] {
  const toolCalls: ToolCall[] = [];
  
  // Simple parsing - in production would use proper JSON/XML parsing
  const toolPattern = /<tool>([\s\S]*?)<\/tool>/g;
  let match;
  
  while ((match = toolPattern.exec(response)) !== null) {
    try {
      const toolData = JSON.parse(match[1]);
      toolCalls.push({
        name: toolData.name,
        arguments: toolData.arguments || {}
      });
    } catch (err) {
      logger.warn('Failed to parse tool call', {
        raw: match[1],
        error: err instanceof Error ? err.message : 'Unknown'
      });
    }
  }
  
  return toolCalls;
}

/**
 * Format tool result for assistant
 */
export function formatToolResult(toolCall: ToolCall, result: any): string {
  return JSON.stringify({
    tool: toolCall.name,
    arguments: toolCall.arguments,
    result
  }, null, 2);
}

/**
 * Check if tool is supported by target assistant
 */
export function isToolSupported(name: ToolName, targetAssistant: string): boolean {
  const mapping = TOOL_MAPPINGS[targetAssistant.toLowerCase()];
  if (!mapping) {
    return true; // Assume supported if no mapping
  }
  return name in mapping || name.toLowerCase() in mapping;
}

// Default export for backward compatibility
export default {
  TOOL_MAPPINGS,
  mapToolName,
  parseToolCall,
  formatToolResult,
  isToolSupported
};
