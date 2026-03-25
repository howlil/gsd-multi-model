#!/usr/bin/env node

/**
 * EZ Lock Logger
 *
 * Dedicated logging for phase lock operations.
 * Logs to console only (no file logging).
 *
 * Features:
 * - Structured logging
 * - Log levels: INFO, WARN, ERROR
 * - Automatic timestamp and context
 *
 * Usage:
 *   import LockLogger from './lock-logger.js';
 *   const lockLogger = new LockLogger();
 *   lockLogger.log('INFO', 'acquire', { phase: '47', agent_id: 'agent-1', result: 'success' });
 */

interface LockData {
  phase: string;
  agent_id: string;
  result?: string;
  message?: string;
  holder_agent?: string;
  holder_name?: string;
  expires_at?: string;
  held_duration_ms?: number;
  previous_agent?: string;
  previous_name?: string;
  reason?: string;
  action?: string;
  expired_at?: string;
  lock_count?: number;
  error?: string;
  [key: string]: unknown;
}

interface LockResult {
  acquired?: boolean;
  conflict?: boolean;
  released?: boolean;
  success?: boolean;
  updated?: boolean;
  message?: string;
  lockInfo?: Record<string, unknown>;
  expiresAt?: string;
}

/**
 * LockLogger class for lock operation logging.
 */
class LockLogger {
  /**
   * Creates a new LockLogger instance.
   */
  constructor() {
    // Console only - no file logging
  }

  /**
   * Log a lock operation.
   * @param level - Log level: INFO, WARN, ERROR
   * @param operation - Operation type: acquire, release, heartbeat, conflict, stale
   * @param data - Operation data
   */
  log(level: string, operation: string, data: LockData = { phase: '', agent_id: '' }): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      operation,
      ...data
    };

    // Log to console
    if (level === 'ERROR') {
      console.error(`[EZ LOCK] ${JSON.stringify(entry)}`);
    } else if (level === 'WARN') {
      console.warn(`[EZ LOCK] ${JSON.stringify(entry)}`);
    } else if (process.env.DEBUG === 'ez-agents') {
      console.log(`[EZ LOCK] ${JSON.stringify(entry)}`);
    }
  }

  /**
   * Log lock acquire.
   * @param phase - Phase number
   * @param agentId - Agent identifier
   * @param result - Acquire result
   */
  logAcquire(phase: string, agentId: string, result: LockResult): void {
    const data: LockData = {
      phase,
      agent_id: agentId,
      result: result.acquired ? 'success' : (result.conflict ? 'conflict' : 'error')
    };

    if (result.message) data.message = result.message;

    if (result.lockInfo) {
      data.holder_agent = result.lockInfo.agent_id as string;
      data.holder_name = result.lockInfo.agent_name as string;
      if (result.expiresAt) data.expires_at = result.expiresAt;
    }

    const level = result.acquired ? 'INFO' : (result.conflict ? 'WARN' : 'ERROR');
    this.log(level, 'acquire', data);
  }

  /**
   * Log lock release.
   * @param phase - Phase number
   * @param agentId - Agent identifier
   * @param result - Release result
   */
  logRelease(phase: string, agentId: string, result: LockResult): void {
    const data: LockData = {
      phase,
      agent_id: agentId,
      result: result.released ? 'success' : 'error'
    };

    if (result.message) data.message = result.message;

    if (result.lockInfo) {
      data.held_duration_ms = Date.now() - new Date(result.lockInfo.acquired_at as string).getTime();
    }

    const level = result.released ? 'INFO' : 'ERROR';
    this.log(level, 'release', data);
  }

  /**
   * Log heartbeat.
   * @param phase - Phase number
   * @param agentId - Agent identifier
   * @param result - Heartbeat result
   */
  logHeartbeat(phase: string, agentId: string, result: LockResult): void {
    const data: LockData = {
      phase,
      agent_id: agentId,
      result: result.success ? 'success' : 'error'
    };

    if (result.message) data.message = result.message;

    if (result.lockInfo) {
      data.expires_at = result.lockInfo.expires_at as string;
    }

    const level = result.success ? 'INFO' : 'WARN';
    this.log(level, 'heartbeat', data);
  }

  /**
   * Log stale lock detection.
   * @param phase - Phase number
   * @param lockInfo - Stale lock info
   */
  logStale(phase: string, lockInfo: Record<string, unknown>): void {
    const data: LockData = {
      phase,
      agent_id: '',
      previous_agent: lockInfo.agent_id as string,
      previous_name: lockInfo.agent_name as string,
      reason: 'expired',
      action: 'auto-release'
    };

    if (lockInfo.expires_at) {
      data.expired_at = lockInfo.expires_at as string;
    }

    this.log('WARN', 'stale', data);
  }

  /**
   * Log lock status update.
   * @param lockCount - Number of active locks
   * @param result - Update result
   */
  logStateUpdate(lockCount: number, result: LockResult): void {
    const data: LockData = {
      phase: '',
      agent_id: '',
      lock_count: lockCount,
      result: result.updated ? 'success' : 'error'
    };

    if ((result as Record<string, unknown>).error) {
      data.error = (result as Record<string, unknown>).error as string;
    }

    const level = result.updated ? 'INFO' : 'WARN';
    this.log(level, 'state_update', data);
  }

  /**
   * Get log file path (returns null - no file logging).
   * @returns Always null
   */
  getLogPath(): null {
    return null;
  }

  /**
   * Read recent log entries (returns empty array - no file logging).
   * @param limit - Number of entries to read
   * @returns Empty array
   */
  readRecent(limit = 100): Record<string, unknown>[] {
    return [];
  }

  /**
   * Clear log file (no-op - no file logging).
   * @returns Always true
   */
  clear(): boolean {
    return true;
  }
}

export default LockLogger;

export type { LockData, LockResult };
