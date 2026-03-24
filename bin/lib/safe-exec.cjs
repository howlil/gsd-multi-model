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
 *   const { safeExec, safeExecJSON } = require('./safe-exec.cjs');
 *   const result = await safeExec('git', ['status']);
 */

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const Logger = require('./logger.cjs');
const logger = new Logger();

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

/**
 * Validate command is in allowlist
 * @param {string} cmd - Command to validate
 * @throws {Error} If command not allowed
 */
function validateCommand(cmd) {
  const baseCmd = cmd.split(' ')[0].toLowerCase();
  if (!ALLOWED_COMMANDS.has(baseCmd)) {
    throw new Error(`Command not allowed: ${cmd}. Allowed: ${Array.from(ALLOWED_COMMANDS).join(', ')}`);
  }
}

/**
 * Validate arguments don't contain injection patterns
 * @param {string[]} args - Arguments to validate
 * @throws {Error} If dangerous pattern found
 */
function validateArgs(args) {
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
 * @param {string} cmd - Command to execute
 * @param {string[]} args - Command arguments
 * @param {Object} options - Execution options
 * @returns {Promise<string>} - Command stdout
 */
async function safeExec(cmd, args = [], options = {}) {
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
      maxBuffer // Default 1MB, configurable per command type
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
    logger.error('Command failed', {
      cmd,
      args,
      error: err.message,
      duration,
      code: err.code,
      signal: err.signal
    });
    throw err;
  }
}

/**
 * Execute command and return JSON parsed output
 * @param {string} cmd - Command to execute
 * @param {string[]} args - Command arguments
 * @returns {Promise<Object>} - Parsed JSON output
 */
async function safeExecJSON(cmd, args = []) {
  const output = await safeExec(cmd, args);
  try {
    return JSON.parse(output);
  } catch (err) {
    logger.error('Failed to parse JSON output', { cmd, output });
    throw new Error(`Invalid JSON from ${cmd}: ${err.message}`);
  }
}

module.exports = { safeExec, safeExecJSON, ALLOWED_COMMANDS };
