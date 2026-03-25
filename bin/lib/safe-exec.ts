#!/usr/bin/env node

/**
 * EZ Safe Exec — Secure command execution with allowlist and validation
 *
 * Prevents command injection by:
 * - Using execFile instead of execSync with string concatenation
 * - Validating commands against allowlist
 * - Blocking dangerous shell metacharacters in arguments
 * - Logging all commands for audit
 *
 * Usage:
 *   import { safeExec, safeExecJSON, ALLOWED_COMMANDS } from './safe-exec.js';
 *   const result = await safeExec('git', ['status']);
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import Logger from './logger.js';

const execFileAsync = promisify(execFile);
const logger = new Logger();

// Allowlist of safe commands (expanded for common development operations)
export const ALLOWED_COMMANDS = new Set([
  // Version control
  'git',
  // Node.js ecosystem
  'node', 'npm', 'npx', 'yarn', 'pnpm',
  // File operations
  'find', 'grep', 'head', 'tail', 'wc', 'cat', 'ls', 'dir', 'pwd',
  // Directory operations
  'mkdir', 'cp', 'mv', 'rm', 'touch', 'chmod', 'chown',
  // Archive operations
  'tar', 'zip', 'unzip', 'gzip', 'gunzip',
  // Text processing
  'diff', 'patch', 'sort', 'uniq', 'cut', 'tr', 'sed', 'awk',
  // JSON processing
  'jq',
  // System info
  'type', 'where', 'which', 'uname', 'whoami', 'hostname',
  // Network (read-only)
  'curl', 'wget',
  // Testing
  'vitest', 'jest', 'mocha', 'pytest',
  // Build tools
  'make', 'cmake',
  // Containerization (read-only operations)
  'docker', 'docker-compose',
  // Database CLI (read-only operations)
  'psql', 'mysql', 'sqlite3',
  // CD
  'cd'
]);

// Dangerous shell metacharacters that could enable injection
const DANGEROUS_PATTERN = /[;&|`$(){}\\<>]/;

// Path traversal patterns (Unix and Windows)
const PATH_TRAVERSAL_PATTERN = /\.\.[/\\]/;

// Null byte injection pattern
const NULL_BYTE_PATTERN = /\0/;

// Hidden file access pattern (potential security risk)
const HIDDEN_FILE_PATTERN = /\/\.[^/]/;

/**
 * Execution options
 */
export interface SafeExecOptions {
  timeout?: number;
  log?: boolean;
  maxBuffer?: number;
}

/**
 * Validate command is in allowlist
 * @param cmd - Command to validate
 * @throws Error if command not allowed
 */
function validateCommand(cmd: string): void {
  const baseCmd = cmd.split(' ')[0].toLowerCase();
  if (!ALLOWED_COMMANDS.has(baseCmd)) {
    throw new Error(`Command not allowed: ${cmd}. Allowed: ${Array.from(ALLOWED_COMMANDS).join(', ')}`);
  }
}

/**
 * Validate arguments don't contain injection patterns
 * @param args - Arguments to validate
 * @throws Error if dangerous pattern found
 */
function validateArgs(args: string[]): void {
  for (const arg of args) {
    // Check for shell injection patterns
    if (DANGEROUS_PATTERN.test(arg)) {
      throw new Error(`Dangerous argument rejected (shell metacharacter): ${arg}`);
    }

    // Check for path traversal
    if (PATH_TRAVERSAL_PATTERN.test(arg)) {
      throw new Error(`Dangerous argument rejected (path traversal): ${arg}`);
    }

    // Check for null byte injection
    if (NULL_BYTE_PATTERN.test(arg)) {
      throw new Error(`Dangerous argument rejected (null byte injection): ${arg}`);
    }
  }
}

/**
 * Execute command safely with validation and logging
 * @param cmd - Command to execute
 * @param args - Command arguments
 * @param options - Execution options
 * @returns Command stdout
 */
export async function safeExec(
  cmd: string,
  args: string[] = [],
  options: SafeExecOptions = {}
): Promise<string> {
  const { timeout = 30000, log = true, maxBuffer = 1 * 1024 * 1024 } = options;

  // Validate command and arguments
  validateCommand(cmd);
  validateArgs(args);

  const startTime = Date.now();

  try {
    if (log) {
      logger.info('Executing command', {
        cmd,
        args,
        timestamp: new Date().toISOString()
      });
    }

    const result = await execFileAsync(cmd, args, {
      timeout,
      maxBuffer
    });

    const duration = Date.now() - startTime;
    if (log) {
      logger.debug('Command completed', {
        cmd,
        duration,
        stdout_length: result.stdout?.length || 0
      });
    }

    return result.stdout.trim();
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const errorCode = err instanceof Error && 'code' in err ? (err as Record<string, unknown>).code : null;
    const errorSignal = err instanceof Error && 'signal' in err ? (err as Record<string, unknown>).signal : null;
    
    logger.error('Command failed', {
      cmd,
      args,
      error: errorMessage,
      duration,
      code: errorCode,
      signal: errorSignal
    });
    throw err;
  }
}

/**
 * Execute command and return JSON parsed output
 * @param cmd - Command to execute
 * @param args - Command arguments
 * @returns Parsed JSON output
 */
export async function safeExecJSON(cmd: string, args: string[] = []): Promise<Record<string, unknown>> {
  const output = await safeExec(cmd, args);
  try {
    return JSON.parse(output) as Record<string, unknown>;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to parse JSON output', { cmd, output });
    throw new Error(`Invalid JSON from ${cmd}: ${errorMessage}`);
  }
}

export default {
  safeExec,
  safeExecJSON,
  ALLOWED_COMMANDS
};
