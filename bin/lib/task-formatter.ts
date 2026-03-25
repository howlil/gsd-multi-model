#!/usr/bin/env node

/**
 * Task Formatter - Convert Task() pseudo-code to JSON for Qwen Code
 *
 * Qwen Code requires tool arguments in strict JSON format.
 * This utility parses Task() markdown syntax and converts it to proper JSON.
 *
 * Usage:
 *   import { formatTaskForQwen, TaskArgs, ExtractedTask } from './task-formatter.js';
 *   const jsonArgs = formatTaskForQwen(taskMarkdown);
 */

import Logger from './logger.js';

const logger = new Logger();

/**
 * Parsed task arguments
 */
export interface TaskArgs {
  subagent_type?: string;
  description?: string;
  prompt?: string;
  model?: string;
  run_in_background?: boolean | string;
  [key: string]: string | boolean | undefined;
}

/**
 * Task extraction result
 */
export interface ExtractedTask {
  full: string;
  args: TaskArgs;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Parse Task() pseudo-code from markdown and extract arguments
 * @param taskMarkdown - Task() call in markdown format
 * @returns Parsed arguments or null if invalid
 */
function parseTaskMarkdown(taskMarkdown: string | null | undefined): TaskArgs | null {
  if (!taskMarkdown || typeof taskMarkdown !== 'string') {
    return null;
  }

  // Match Task( ... ) pattern, handling multiline
  const taskMatch = taskMarkdown.match(/Task\(\s*([\s\S]*?)\s*\)/);
  if (!taskMatch) {
    return null;
  }

  const argsString = taskMatch[1];
  const args: TaskArgs = {};

  // Match key="value" or key=value patterns
  const argPattern = /(\w+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^,\s\n]+))/g;
  let match: RegExpExecArray | null;

  while ((match = argPattern.exec(argsString)) !== null) {
    const [, key, doubleQuoted, singleQuoted, unquoted] = match;
    // Use whichever quote style matched, or unquoted value
    const value = doubleQuoted !== undefined ? doubleQuoted
      : singleQuoted !== undefined ? singleQuoted
      : unquoted;
    if (value !== undefined) {
      args[key] = value;
    }
  }

  // Handle nested prompt content (multiline strings in quotes)
  const promptMatch = taskMarkdown.match(/prompt\s*=\s*"([\s\S]*?)"/);
  if (promptMatch) {
    args.prompt = promptMatch[1];
  }

  return Object.keys(args).length > 0 ? args : null;
}

/**
 * Format Task arguments for Qwen Code function calling
 * Converts Task() pseudo-code to strict JSON format
 *
 * @param taskInput - Task() markdown string or argument object
 * @returns JSON string formatted for Qwen Code, or null if invalid
 */
export function formatTaskForQwen(taskInput: string | TaskArgs): string | null {
  let args: TaskArgs | null;

  if (typeof taskInput === 'string') {
    args = parseTaskMarkdown(taskInput);
    if (!args) {
      logger.warn('Failed to parse Task() markdown', { input: taskInput?.substring(0, 100) });
      return null;
    }
  } else if (typeof taskInput === 'object' && taskInput !== null) {
    args = taskInput;
  } else {
    logger.error('Invalid task input type', { type: typeof taskInput });
    return null;
  }

  // Validate required fields
  if (!args.subagent_type) {
    logger.error('Task missing required field: subagent_type', { args });
    return null;
  }

  // Build JSON arguments for Qwen Code
  const qwenArgs: Record<string, unknown> = {
    subagent_type: args.subagent_type,
    description: args.description || `Execute ${args.subagent_type}`,
    prompt: args.prompt || ''
  };

  // Add optional fields if present
  if (args.model) {
    qwenArgs.model = args.model;
  }

  if (args.run_in_background === 'true' || args.run_in_background === true) {
    qwenArgs.run_in_background = true;
  }

  // Convert to strict JSON
  try {
    const jsonStr = JSON.stringify(qwenArgs, null, 2);
    logger.debug('Formatted Task for Qwen Code', { subagent_type: args.subagent_type });
    return jsonStr;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to stringify Task arguments', { error: errorMessage, args });
    return null;
  }
}

/**
 * Format Task arguments for Kimi Code function calling
 * Similar to Qwen but with slight format differences
 *
 * @param taskInput - Task() markdown string or argument object
 * @returns JSON string formatted for Kimi Code, or null if invalid
 */
export function formatTaskForKimi(taskInput: string | TaskArgs): string | null {
  // Kimi uses similar format to Qwen
  return formatTaskForQwen(taskInput);
}

/**
 * Validate Task arguments structure
 * @param args - Task arguments
 * @returns Validation result with valid flag and errors array
 */
export function validateTaskArgs(args: TaskArgs | null | undefined): ValidationResult {
  const errors: string[] = [];

  if (!args || typeof args !== 'object') {
    errors.push('Task arguments must be an object');
    return { valid: false, errors };
  }

  if (!args.subagent_type) {
    errors.push('Missing required field: subagent_type');
  }

  if (!args.prompt || typeof args.prompt !== 'string') {
    errors.push('Missing or invalid field: prompt (must be a string)');
  }

  if (args.model && typeof args.model !== 'string') {
    errors.push('Invalid field: model (must be a string if provided)');
  }

  if (args.run_in_background !== undefined && typeof args.run_in_background !== 'boolean') {
    errors.push('Invalid field: run_in_background (must be boolean if provided)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Extract Task() calls from markdown content
 * @param markdown - Full markdown content
 * @returns Array of Task calls with parsed args
 */
export function extractTasksFromMarkdown(markdown: string | null | undefined): ExtractedTask[] {
  if (!markdown || typeof markdown !== 'string') {
    return [];
  }

  const tasks: ExtractedTask[] = [];

  // Match Task blocks - handle both code blocks and inline
  // First try matching code block format
  const codeBlockRegex = /```\s*\n?Task\(\s*([\s\S]*?)\s*\)\n?\s*```/g;
  // Then try inline format (not in code blocks)
  const inlineRegex = /(?<!```\s*\n)Task\(\s*([\s\S]{1,500}?)\s*\)(?!\s*\n```)/g;

  let match: RegExpExecArray | null;
  const processedPositions = new Set<number>();

  // Try code block format first
  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    const full = match[0];
    const argsString = match[1];
    const position = match.index;

    if (!processedPositions.has(position)) {
      processedPositions.add(position);
      const args = parseArgsString(argsString);
      if (Object.keys(args).length > 0) {
        tasks.push({ full, args });
      }
    }
  }

  // Try inline format - only match Task() not inside code blocks
  // Reset regex lastIndex
  inlineRegex.lastIndex = 0;
  while ((match = inlineRegex.exec(markdown)) !== null) {
    const full = match[0];
    const argsString = match[1];
    const position = match.index;

    // Check if this position is inside a code block
    const beforeText = markdown.substring(0, position);
    const backtickCount = (beforeText.match(/```/g) || []).length;

    // If odd number of backticks before, we're inside a code block - skip
    if (backtickCount % 2 === 1) {
      continue;
    }

    if (!processedPositions.has(position)) {
      processedPositions.add(position);
      const args = parseArgsString(argsString);
      if (Object.keys(args).length > 0) {
        tasks.push({ full, args });
      }
    }
  }

  return tasks;
}

/**
 * Parse argument string from Task() call
 * @param argsString - The arguments string inside Task(...)
 * @returns Parsed arguments
 */
function parseArgsString(argsString: string): TaskArgs {
  const args: TaskArgs = {};
  // Match key="value", key='value', or key=value patterns
  const argPattern = /(\w+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^,\s\n\)]+))/g;
  let argMatch: RegExpExecArray | null;

  while ((argMatch = argPattern.exec(argsString)) !== null) {
    const [, key, doubleQuoted, singleQuoted, unquoted] = argMatch;
    args[key] = doubleQuoted !== undefined ? doubleQuoted
      : singleQuoted !== undefined ? singleQuoted
      : unquoted?.trim();
  }

  return args;
}

export default {
  formatTaskForQwen,
  formatTaskForKimi,
  parseTaskMarkdown,
  validateTaskArgs,
  extractTasksFromMarkdown
};
