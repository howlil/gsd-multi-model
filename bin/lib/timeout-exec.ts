#!/usr/bin/env node

/**
 * EZ Timeout Exec — Command execution with timeout and fallback
 *
 * Provides safe command execution with configurable timeout
 * Logs errors and supports fallback values
 *
 * Usage:
 *   import { execWithTimeout } from './timeout-exec.js';
 *   const result = await execWithTimeout('node', ['script.js'], { timeout: 5000, fallback: 'default' });
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { Logger } from './logger.js';

const execFileAsync = promisify(execFile);
const logger = new Logger();

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface TimeoutExecOptions {
  timeout?: number;
  fallback?: any;
}

export interface TimeoutExecResult {
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT = 5000; // 5 seconds

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Execute a command with timeout
 * @param cmd - Command to execute
 * @param args - Command arguments
 * @param options - Execution options
 * @param options.timeout - Timeout in milliseconds (default: 5000)
 * @param options.fallback - Fallback value if command fails or times out
 * @returns Command stdout or fallback value
 */
export async function execWithTimeout<T = string>(
  cmd: string,
  args: string[] = [],
  options: TimeoutExecOptions = {}
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, fallback = null } = options;
  const hasFallback = Object.prototype.hasOwnProperty.call(options, 'fallback');

  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      logger.error(`Command timed out: ${cmd} ${args.join(' ')}`, { timeout });
      if (hasFallback) {
        logger.info('Using fallback value', { fallback });
        resolve(fallback as T);
      } else {
        reject(new Error(`Command timed out after ${timeout}ms: ${cmd}`));
      }
    }, timeout);

    try {
      const result = await execFileAsync(cmd, args, { timeout });
      clearTimeout(timeoutId);
      resolve((result.stdout.trim() as unknown) as T);
    } catch (err) {
      clearTimeout(timeoutId);
      const error = err as Error & { code?: string };
      logger.error(`Command failed: ${cmd}`, { error: error.message, args });
      if (hasFallback) {
        logger.info('Using fallback value', { fallback });
        resolve(fallback as T);
      } else {
        reject(err);
      }
    }
  });
}
