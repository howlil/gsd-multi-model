#!/usr/bin/env node

/**
 * GSD Safe Exec — Secure command execution with allowlist and validation
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

// Allowlist of safe commands
const ALLOWED_COMMANDS = new Set([
  'git', 'node', 'npm', 'npx', 'find', 'grep', 'head', 'tail', 'wc',
  'mkdir', 'cp', 'mv', 'rm', 'cat', 'echo', 'test', 'ls', 'dir',
  'pwd', 'cd', 'type', 'where', 'which', 'chmod', 'touch'
]);

// Dangerous shell metacharacters that could enable injection
const DANGEROUS_PATTERN = /[;&|`$(){}\\<>]/;

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
    if (DANGEROUS_PATTERN.test(arg)) {
      throw new Error(`Dangerous argument rejected: ${arg}`);
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
  const { timeout = 30000, log = true } = options;
  
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
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
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
