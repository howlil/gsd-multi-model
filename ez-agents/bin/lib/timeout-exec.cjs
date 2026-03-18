#!/usr/bin/env node

/**
 * EZ Timeout Exec — Command execution with timeout and fallback
 * 
 * Provides safe command execution with configurable timeout
 * Logs errors and supports fallback values
 * 
 * Usage:
 *   const { execWithTimeout } = require('./timeout-exec.cjs');
 *   const result = await execWithTimeout('node', ['script.js'], { timeout: 5000, fallback: 'default' });
 */

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const Logger = require('./logger.cjs');
const logger = new Logger();

const DEFAULT_TIMEOUT = 5000; // 5 seconds

/**
 * Execute a command with timeout
 * @param {string} cmd - Command to execute
 * @param {string[]} args - Command arguments
 * @param {Object} options - Execution options
 * @param {number} options.timeout - Timeout in milliseconds (default: 5000)
 * @param {any} options.fallback - Fallback value if command fails or times out
 * @returns {Promise<string>} - Command stdout or fallback value
 */
async function execWithTimeout(cmd, args, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, fallback = null } = options;
  const hasFallback = Object.prototype.hasOwnProperty.call(options, 'fallback');
  
  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      logger.error(`Command timed out: ${cmd} ${args.join(' ')}`, { timeout });
      if (hasFallback) {
        logger.info('Using fallback value', { fallback });
        resolve(fallback);
      } else {
        reject(new Error(`Command timed out after ${timeout}ms: ${cmd}`));
      }
    }, timeout);

    try {
      const result = await execFileAsync(cmd, args, { timeout });
      clearTimeout(timeoutId);
      resolve(result.stdout.trim());
    } catch (err) {
      clearTimeout(timeoutId);
      logger.error(`Command failed: ${cmd}`, { error: err.message, args });
      if (hasFallback) {
        logger.info('Using fallback value', { fallback });
        resolve(fallback);
      } else {
        reject(err);
      }
    }
  });
}

module.exports = { execWithTimeout };
