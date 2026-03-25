#!/usr/bin/env node

/**
 * EZ Crash Recovery — PID-stamped lock file management
 * Detects orphaned operations and enables safe concurrent execution gates.
 *
 * Usage:
 *   import CrashRecovery from './crash-recovery.js';
 *   const cr = new CrashRecovery(cwd);
 *   cr.acquire('phase-30-plan');
 *   // ... later ...
 *   cr.release('phase-30-plan');
 */

import * as fs from 'fs';
import * as path from 'path';
import { defaultLogger as logger } from './logger.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const HEARTBEAT_INTERVAL_MS = 10000;
const STALE_HEARTBEAT_MS = 60000;

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface LockData {
  pid: number;
  started: string;
  heartbeat: string;
  operation: string;
}

export interface LockStatus {
  locked: boolean;
  pid?: number;
  started?: string;
  heartbeat?: string;
}

export interface ActiveLock {
  operation: string;
  pid: number;
  started: string;
  heartbeat: string;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Check if a process is alive by sending signal 0.
 * @param pid - Process ID to check
 * @returns True if process is alive
 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'ESRCH') return false; // No such process
    if (err.code === 'EPERM') return true;  // Process exists, no permission
    return false;
  }
}

// ─── CrashRecovery Class ─────────────────────────────────────────────────────

export class CrashRecovery {
  private cwd: string;
  private locksDir: string;
  private _intervals: Record<string, NodeJS.Timeout>;
  private _exitHandlers: Record<string, () => void>;

  /**
   * Create a CrashRecovery instance
   * @param cwd - Root directory containing .planning/
   */
  constructor(cwd: string) {
    this.cwd = cwd || process.cwd();
    this.locksDir = path.join(this.cwd, '.planning', 'locks');
    this._intervals = {};
    this._exitHandlers = {};
  }

  /**
   * Sanitize an operation name to be a safe file name component.
   * @param operation - Operation name to sanitize
   * @returns Sanitized operation name
   */
  slugifyOperation(operation: string): string {
    return String(operation).replace(/[^a-zA-Z0-9-_]/g, '_');
  }

  /**
   * Return the full path to the lock file for an operation.
   * @param operation - Operation name
   * @returns Full path to lock file
   */
  getLockPath(operation: string): string {
    return path.join(this.locksDir, this.slugifyOperation(operation) + '.lock.json');
  }

  /**
   * Acquire a lock for the given operation.
   * Creates a PID-stamped JSON lock file and starts a heartbeat interval.
   * @param operation - Operation name
   */
  acquire(operation: string): void {
    if (!fs.existsSync(this.locksDir)) {
      fs.mkdirSync(this.locksDir, { recursive: true });
    }

    const lockPath = this.getLockPath(operation);
    const now = new Date().toISOString();
    const data: LockData = { pid: process.pid, started: now, heartbeat: now, operation };
    fs.writeFileSync(lockPath, JSON.stringify(data, null, 2), 'utf8');
    logger.debug('Lock acquired: ' + operation);

    // Heartbeat interval — keeps heartbeat timestamp fresh every 10s
    const intervalId = setInterval(() => {
      try {
        if (fs.existsSync(lockPath)) {
          const current = JSON.parse(fs.readFileSync(lockPath, 'utf8')) as LockData;
          current.heartbeat = new Date().toISOString();
          fs.writeFileSync(lockPath, JSON.stringify(current, null, 2), 'utf8');
        }
      } catch (e) {
        // Ignore heartbeat write errors (process may be exiting)
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Allow process to exit naturally even with active interval
    if ('unref' in intervalId) {
      (intervalId as NodeJS.Timeout).unref();
    }
    this._intervals[operation] = intervalId;

    // Release on process exit to avoid orphaned lock files
    const exitHandler = () => this.release(operation);
    this._exitHandlers[operation] = exitHandler;
    process.on('exit', exitHandler as () => void);
  }

  /**
   * Check whether a lock is orphaned (process is dead or heartbeat is stale).
   * @param operation - Operation name
   * @returns True if lock is orphaned
   */
  isOrphan(operation: string): boolean {
    const lockPath = this.getLockPath(operation);
    if (!fs.existsSync(lockPath)) return false;

    let data: LockData;
    try {
      data = JSON.parse(fs.readFileSync(lockPath, 'utf8')) as LockData;
    } catch (e) {
      return true; // Corrupt lock file treated as orphan
    }

    if (!isProcessAlive(data.pid)) return true;

    // Stale heartbeat check — lock is orphaned if heartbeat is too old
    const heartbeatAge = Date.now() - new Date(data.heartbeat).getTime();
    if (heartbeatAge > STALE_HEARTBEAT_MS) return true;

    return false;
  }

  /**
   * Release a lock for the given operation.
   * Clears the heartbeat interval and removes the lock file.
   * @param operation - Operation name
   */
  release(operation: string): void {
    if (this._intervals[operation]) {
      clearInterval(this._intervals[operation]);
      delete this._intervals[operation];
    }

    if (this._exitHandlers[operation]) {
      process.off('exit', this._exitHandlers[operation]!);
      delete this._exitHandlers[operation];
    }

    const lockPath = this.getLockPath(operation);
    if (fs.existsSync(lockPath)) {
      try {
        fs.unlinkSync(lockPath);
      } catch (e) {
        // Ignore unlink errors (file may already be removed)
      }
    }

    logger.debug('Lock released: ' + operation);
  }

  /**
   * Return a list of operation slugs whose lock files are orphaned.
   * @returns Array of orphaned operation names
   */
  listOrphans(): string[] {
    if (!fs.existsSync(this.locksDir)) return [];
    return fs.readdirSync(this.locksDir)
      .filter(f => f.endsWith('.lock.json'))
      .map(f => f.replace(/\.lock\.json$/, ''))
      .filter(op => this.isOrphan(op));
  }

  /**
   * Return a list of all active locks with their metadata.
   * @returns Array of active lock information
   */
  listLocks(): ActiveLock[] {
    if (!fs.existsSync(this.locksDir)) return [];
    return fs.readdirSync(this.locksDir)
      .filter(f => f.endsWith('.lock.json'))
      .map(f => {
        const lockPath = path.join(this.locksDir, f);
        try {
          const data = JSON.parse(fs.readFileSync(lockPath, 'utf8')) as LockData;
          return {
            operation: data.operation,
            pid: data.pid,
            started: data.started,
            heartbeat: data.heartbeat
          };
        } catch (e) {
          return null;
        }
      })
      .filter((lock): lock is ActiveLock => lock !== null);
  }

  /**
   * Get the status of a specific lock.
   * @param operation - Operation name
   * @returns Lock status information
   */
  getLockStatus(operation: string): LockStatus {
    const lockPath = this.getLockPath(operation);
    if (!fs.existsSync(lockPath)) {
      return { locked: false };
    }
    try {
      const data = JSON.parse(fs.readFileSync(lockPath, 'utf8')) as LockData;
      return {
        locked: true,
        pid: data.pid,
        started: data.started,
        heartbeat: data.heartbeat
      };
    } catch (e) {
      return { locked: false };
    }
  }
}

// Default export for backward compatibility
export default CrashRecovery;
