#!/usr/bin/env node
'use strict';

/**
 * Context Budget Guard - Prevents context budget exhaustion with progressive warnings
 *
 * Monitors token usage and provides warnings at:
 * - 50%: Info - Context degradation begins
 * - 70%: Warning - Efficiency mode engaged
 * - 80%: Error - Hard stop, should stop processing
 *
 * Exports:
 * - checkContextBudget(tokenUsage, modelLimits) - Calculate usage and warnings
 * - getTokenUsage() - Read current token usage from executor context
 * - shouldStop() - Check if usage >= 80%
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────

type WarningLevel = 'none' | 'info' | 'warning' | 'error';

interface ContextBudgetWarning {
  level: WarningLevel;
  message: string;
}

interface ContextBudgetResult {
  percent: number;
  level: WarningLevel;
  message: string | null;
  warnings: ContextBudgetWarning[];
  shouldStop: boolean;
}

interface TokenUsageInfo {
  currentTokens: number;
  maxTokens: number;
  percent: number;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/**
 * Warning thresholds for context budget
 */
export const THRESHOLDS = {
  INFO: 50,      // 50% - Info warning
  WARNING: 70,   // 70% - Warning level
  ERROR: 80      // 80% - Hard stop
} as const;

/**
 * Warning messages for each threshold level
 */
export const WARNING_MESSAGES: Record<number, string> = {
  [THRESHOLDS.INFO]: 'Context usage at {percent}% - quality degradation begins',
  [THRESHOLDS.WARNING]: 'Context usage at {percent}% - efficiency mode engaged',
  [THRESHOLDS.ERROR]: 'Context usage at {percent}% - hard stop'
};

// ─────────────────────────────────────────────
// Main Functions
// ─────────────────────────────────────────────

/**
 * Check context budget and return progressive warnings
 * @param tokenUsage - Current token count
 * @param modelLimits - Maximum token limit for the model
 * @returns Context budget result
 */
export function checkContextBudget(tokenUsage: number, modelLimits: number): ContextBudgetResult {
  if (modelLimits <= 0) {
    return {
      percent: 0,
      level: 'none',
      message: null,
      warnings: [],
      shouldStop: false
    };
  }

  const percent = Math.round((tokenUsage / modelLimits) * 100);
  const warnings: ContextBudgetWarning[] = [];
  let level: WarningLevel = 'none';
  let message: string | null = null;
  let shouldStop = false;

  // Check thresholds and add progressive warnings
  if (percent >= THRESHOLDS.ERROR) {
    level = 'error';
    message = (WARNING_MESSAGES[THRESHOLDS.ERROR] || '').replace('{percent}', percent.toString());
    shouldStop = true;
    warnings.push({
      level: 'error',
      message: (WARNING_MESSAGES[THRESHOLDS.ERROR] || '').replace('{percent}', percent.toString())
    });
  } else if (percent >= THRESHOLDS.WARNING) {
    level = 'warning';
    message = (WARNING_MESSAGES[THRESHOLDS.WARNING] || '').replace('{percent}', percent.toString());
    warnings.push({
      level: 'warning',
      message: (WARNING_MESSAGES[THRESHOLDS.WARNING] || '').replace('{percent}', percent.toString())
    });
    // Also include info warning for context
    if (percent >= THRESHOLDS.INFO) {
      warnings.unshift({
        level: 'info',
        message: (WARNING_MESSAGES[THRESHOLDS.INFO] || '').replace('{percent}', THRESHOLDS.INFO.toString())
      });
    }
  } else if (percent >= THRESHOLDS.INFO) {
    level = 'info';
    message = (WARNING_MESSAGES[THRESHOLDS.INFO] || '').replace('{percent}', percent.toString());
    warnings.push({
      level: 'info',
      message: (WARNING_MESSAGES[THRESHOLDS.INFO] || '').replace('{percent}', percent.toString())
    });
  }

  return {
    percent,
    level,
    message,
    warnings,
    shouldStop
  };
}

/**
 * Get current token usage from executor context file
 * @param contextFile - Path to executor context file (optional)
 * @returns Token usage info or null
 */
export function getTokenUsage(contextFile?: string): TokenUsageInfo | null {
  // Default context file locations
  const possiblePaths = [
    contextFile,
    path.join(process.cwd(), '.planning', 'context.json'),
    path.join(process.cwd(), '.planning', 'executor-context.json'),
    path.join(process.cwd(), 'ez-agents', 'context.json'),
    path.join(process.cwd(), '.qwen', 'context.json')
  ].filter((p): p is string => Boolean(p));

  for (const filePath of possiblePaths) {
    if (filePath && fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
        return {
          currentTokens: (data.tokenUsage as number) || (data.currentTokens as number) || 0,
          maxTokens: (data.modelLimits as number) || (data.maxTokens as number) || 0,
          percent: (data.percent as number) || 0
        };
      } catch {
        // Continue to next file
      }
    }
  }

  return null;
}

/**
 * Check if context budget has reached the hard stop threshold
 * @param tokenUsage - Current token count
 * @param modelLimits - Maximum token limit
 * @returns True if usage >= 80%
 */
export function shouldStop(tokenUsage: number, modelLimits: number): boolean {
  if (!modelLimits || modelLimits <= 0) {
    return false;
  }
  const percent = (tokenUsage / modelLimits) * 100;
  return percent >= THRESHOLDS.ERROR;
}

/**
 * Get the current warning level based on usage percentage
 * @param percent - Usage percentage (0-100)
 * @returns Warning level
 */
export function getWarningLevel(percent: number): WarningLevel {
  if (percent >= THRESHOLDS.ERROR) {
    return 'error';
  } else if (percent >= THRESHOLDS.WARNING) {
    return 'warning';
  } else if (percent >= THRESHOLDS.INFO) {
    return 'info';
  }
  return 'none';
}

/**
 * Get warning message for a specific threshold
 * @param percent - Current percentage
 * @param threshold - Threshold to get message for (default: INFO)
 * @returns Warning message
 */
export function getWarningMessage(percent: number, threshold = THRESHOLDS.INFO): string {
  const template = WARNING_MESSAGES[threshold] || WARNING_MESSAGES[THRESHOLDS.INFO] || '';
  return template.replace('{percent}', percent.toString());
}

// ─────────────────────────────────────────────
// CLI Interface
// ─────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Context Budget Guard - Token usage monitoring with progressive warnings');
    console.log('');
    console.log('Usage:');
    console.log('  node context-budget-guard.ts check <current_tokens> <max_tokens>');
    console.log('  node context-budget-guard.ts status [context-file]');
    console.log('  node context-budget-guard.ts thresholds');
    console.log('');
    console.log('Commands:');
    console.log('  check      - Check budget for specific token values');
    console.log('  status     - Read and display current context status from file');
    console.log('  thresholds - Show warning threshold configuration');
    console.log('');
    console.log('Thresholds:');
    console.log(`  ${THRESHOLDS.INFO}%  - Info warning (quality degradation begins)`);
    console.log(`  ${THRESHOLDS.WARNING}% - Warning (efficiency mode engaged)`);
    console.log(`  ${THRESHOLDS.ERROR}%  - Error (hard stop)`);
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case 'check': {
      const currentTokens = parseInt(args[1] || '0', 10);
      const maxTokens = parseInt(args[2] || '0', 10);

      if (isNaN(currentTokens) || isNaN(maxTokens)) {
        console.error('Error: Both current_tokens and max_tokens must be numbers');
        console.error('Usage: node context-budget-guard.ts check <current_tokens> <max_tokens>');
        process.exit(1);
      }

      const result = checkContextBudget(currentTokens, maxTokens);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.shouldStop ? 1 : 0);
    }

    case 'status': {
      const contextFile = args[1];
      const usage = getTokenUsage(contextFile);

      if (!usage) {
        console.log('No context file found or unable to read token usage');
        process.exit(1);
      }

      const result = checkContextBudget(usage.currentTokens, usage.maxTokens);
      console.log('Context Budget Status:');
      console.log(`  Current: ${usage.currentTokens.toLocaleString()} tokens`);
      console.log(`  Maximum: ${usage.maxTokens.toLocaleString()} tokens`);
      console.log(`  Usage:   ${result.percent}%`);
      console.log(`  Level:   ${result.level.toUpperCase()}`);
      if (result.message) {
        console.log(`  Message: ${result.message}`);
      }
      console.log(`  Stop:    ${result.shouldStop ? 'YES' : 'no'}`);
      process.exit(result.shouldStop ? 1 : 0);
    }

    case 'thresholds': {
      console.log('Context Budget Thresholds:');
      console.log(`  ${THRESHOLDS.INFO}%  - Info:    ${(WARNING_MESSAGES[THRESHOLDS.INFO] || '').replace('{percent}', THRESHOLDS.INFO.toString())}`);
      console.log(`  ${THRESHOLDS.WARNING}% - Warning: ${(WARNING_MESSAGES[THRESHOLDS.WARNING] || '').replace('{percent}', THRESHOLDS.WARNING.toString())}`);
      console.log(`  ${THRESHOLDS.ERROR}%  - Error:   ${(WARNING_MESSAGES[THRESHOLDS.ERROR] || '').replace('{percent}', THRESHOLDS.ERROR.toString())}`);
      process.exit(0);
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Use "node context-budget-guard.ts" for usage information');
      process.exit(1);
  }
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
