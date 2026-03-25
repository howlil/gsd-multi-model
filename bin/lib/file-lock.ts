/**
 * EZ File Lock — File locking utility for concurrent write protection
 *
 * Uses proper-lockfile to prevent concurrent writes to planning files
 * Includes deadlock detection (30s timeout) and automatic lock cleanup
 *
 * Fallback: Uses simple lock file mechanism if proper-lockfile is not available
 *
 * Usage:
 *   import { withLock, isLocked, ifUnlocked } from './file-lock.js';
 *   await withLock('.planning/STATE.md', async () => {
 *     // Safe to write - no other process can modify this file
 *   });
 */

import * as fs from 'fs';
import { defaultLogger as logger } from './logger.js';

// Try to load proper-lockfile, fallback to simple implementation
let properLockfile: any = null;
try {
  properLockfile = require('proper-lockfile');
} catch (err) {
  logger.warn('proper-lockfile not available, using fallback implementation');
}

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface LockOptions {
  staleTime?: number;
  update?: number;
  timeout?: number;
  retries?: {
    retries: number;
    factor: number;
    minTimeout: number;
    maxTimeout: number;
    randomize: boolean;
  };
}

export interface LockRelease {
  (): Promise<void>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_OPTIONS: LockOptions = {
  staleTime: 30000,     // Lock considered stale after 30s
  update: 10000,        // Update lock every 10s to prevent stale
  retries: {
    retries: 10,
    factor: 1.1,
    minTimeout: 100,
    maxTimeout: 1000,
    randomize: true
  }
};

// Simple lock file implementation (fallback)
const LOCK_SUFFIX = '.lock';
const lockHolders = new Map<string, string>(); // Track locks held by this process

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Get lock file path
 * @param filePath - Original file path
 * @returns Lock file path
 */
function getLockPath(filePath: string): string {
  return filePath + LOCK_SUFFIX;
}

/**
 * Simple lock acquisition (fallback when proper-lockfile unavailable)
 */
async function simpleLock(filePath: string, options: LockOptions = {}): Promise<{ release: LockRelease }> {
  const lockPath = getLockPath(filePath);
  const startTime = Date.now();
  const timeout = options.timeout || 30000;
  const staleTime = options.staleTime || 30000;

  while (Date.now() - startTime < timeout) {
    try {
      // Check if lock file exists and is not stale
      if (fs.existsSync(lockPath)) {
        const stats = fs.statSync(lockPath);
        const age = Date.now() - stats.mtimeMs;

        if (age < staleTime) {
          // Lock is held by another process, wait and retry
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        // Lock is stale, remove it
        try {
          fs.unlinkSync(lockPath);
        } catch {
          // Ignore - another process might have removed it
        }
      }

      // Try to create lock file (using 'wx' flag to fail if it exists)
      fs.writeFileSync(lockPath, JSON.stringify({
        pid: process.pid,
        timestamp: Date.now()
      }), { encoding: 'utf-8', flag: 'wx' });

      lockHolders.set(filePath, lockPath);

      return {
        release: async () => {
          try {
            if (fs.existsSync(lockPath)) {
              fs.unlinkSync(lockPath);
            }
            lockHolders.delete(filePath);
          } catch (err) {
            logger.debug('Failed to release lock', { lockPath, error: err instanceof Error ? err.message : 'Unknown' });
          }
        }
      };
    } catch (err) {
      // Lock acquisition failed, wait and retry
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  throw new Error(`Failed to acquire lock for ${filePath} after ${timeout}ms`);
}

// ─── Main Functions ──────────────────────────────────────────────────────────

/**
 * Execute a function while holding a file lock
 * @param filePath - File to lock
 * @param fn - Function to execute
 * @param options - Lock options
 */
export async function withLock<T>(
  filePath: string,
  fn: () => Promise<T>,
  options: LockOptions = {}
): Promise<T> {
  const lockOptions = { ...DEFAULT_OPTIONS, ...options };

  if (properLockfile) {
    // Use proper-lockfile
    const release = await properLockfile.lock(filePath, lockOptions);
    try {
      return await fn();
    } finally {
      await release();
    }
  } else {
    // Use fallback implementation
    const { release } = await simpleLock(filePath, lockOptions);
    try {
      return await fn();
    } finally {
      await release();
    }
  }
}

/**
 * Check if a file is currently locked
 * @param filePath - File to check
 * @returns True if file is locked
 */
export async function isLocked(filePath: string): Promise<boolean> {
  if (properLockfile) {
    try {
      return await properLockfile.check(filePath);
    } catch {
      return false;
    }
  } else {
    const lockPath = getLockPath(filePath);
    if (!fs.existsSync(lockPath)) {
      return false;
    }

    // Check if lock is stale
    try {
      const stats = fs.statSync(lockPath);
      const age = Date.now() - stats.mtimeMs;
      return age < (DEFAULT_OPTIONS.staleTime || 30000);
    } catch {
      return false;
    }
  }
}

/**
 * Execute a function only if the file is not locked
 * @param filePath - File to check
 * @param fn - Function to execute
 * @returns True if function was executed, false if file was locked
 */
export async function ifUnlocked<T>(
  filePath: string,
  fn: () => Promise<T>
): Promise<boolean> {
  const locked = await isLocked(filePath);
  if (locked) {
    logger.debug('File is locked, skipping operation', { filePath });
    return false;
  }

  await fn();
  return true;
}

// Default export for backward compatibility
export default { withLock, isLocked, ifUnlocked };
