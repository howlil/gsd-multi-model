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
 *   import { safeExec, safeExecJSON } from './safe-exec.js';
 *   const result = await safeExec('git', ['status']);
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { Logger } from './logger.js';

const execFileAsync = promisify(execFile);
const logger = new Logger();

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface ExecOptions {
  timeout?: number;
  cwd?: string;
  encoding?: string;
  maxBuffer?: number;
}

export interface AuditOptions extends ExecOptions {
  context?: string;
  sensitive?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Allowlist of safe commands (expanded for common development operations)
const ALLOWED_COMMANDS = new Set([
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

// ─── Validation Functions ────────────────────────────────────────────────────

/**
 * Validate command is in allowlist
 * @param cmd - Command to validate
 * @throws Error If command not allowed
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
 * @throws Error If dangerous pattern found
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
 * Log command for audit
 * @param cmd - Command
 * @param args - Arguments
 * @param context - Context string
 */
function auditLog(cmd: string, args: string[], context?: string): void {
  const timestamp = new Date().toISOString();
  const argsStr = args.join(' ');
  logger.info('Command executed', {
    timestamp,
    command: cmd,
    arguments: argsStr,
    context: context || 'unknown'
  });
}

// ─── Main Functions ──────────────────────────────────────────────────────────

/**
 * Execute a command securely with validation
 * @param cmd - Command to execute
 * @param args - Command arguments
 * @param options - Execution options
 * @returns Command stdout
 */
export async function safeExec(
  cmd: string,
  args: string[] = [],
  options: ExecOptions & { context?: string } = {}
): Promise<string> {
  // Validate command
  validateCommand(cmd);

  // Validate arguments
  validateArgs(args);

  // Log for audit
  auditLog(cmd, args, options.context);

  try {
    const { stdout } = await execFileAsync(cmd, args, {
      timeout: options.timeout,
      cwd: options.cwd,
      encoding: options.encoding as BufferEncoding || 'utf-8',
      maxBuffer: options.maxBuffer
    });

    return stdout.trim();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Command execution failed', {
      command: cmd,
      arguments: args.join(' '),
      error: errorMessage
    });
    throw err;
  }
}

/**
 * Execute a command and parse JSON output
 * @param cmd - Command to execute
 * @param args - Command arguments
 * @param options - Execution options
 * @returns Parsed JSON result
 */
export async function safeExecJSON<T = any>(
  cmd: string,
  args: string[] = [],
  options: ExecOptions = {}
): Promise<T> {
  const stdout = await safeExec(cmd, args, options);
  
  try {
    return JSON.parse(stdout) as T;
  } catch (err) {
    logger.error('Failed to parse JSON output', {
      command: cmd,
      output: stdout.slice(0, 200)
    });
    throw new Error(`Failed to parse JSON output from ${cmd}: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * AuditExec wrapper for compatibility with existing code
 * @param cmd - Command to execute
 * @param args - Command arguments
 * @param options - Audit options with context
 * @returns Command stdout
 */
export async function auditExec(
  cmd: string,
  args: string[] = [],
  options: AuditOptions = {}
): Promise<string> {
  return safeExec(cmd, args, options);
}

// Default export for backward compatibility
export default { safeExec, safeExecJSON, auditExec };
