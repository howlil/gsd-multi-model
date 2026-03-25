#!/usr/bin/env node

/**
 * EZ Lock State
 *
 * Integrates lock state into STATE.md and provides lock status reporting.
 * Updates STATE.md automatically on lock acquire/release.
 *
 * Features:
 * - Scan all active locks
 * - Format lock status as markdown table
 * - Update STATE.md lock status section
 * - Auto-reconcile stale entries
 */

import * as fs from 'fs';
import * as path from 'path';
import { defaultLogger as logger } from './logger.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface LockConfig {
  locksDir: string;
  statePath: string;
  staleThresholdMinutes: number;
}

export interface LockStatus {
  phase: string;
  agentId: string;
  agentName: string;
  expiresAt: string;
  acquiredAt: string;
  durationMin: number;
  sessionId: string;
  milestone: string;
}

export interface LockInfo {
  expires_at: string;
  last_heartbeat: string;
  acquired_at: string;
  phase: string;
  agent_id: string;
  agent_name: string;
  session_id: string;
  milestone: string;
}

export interface UpdateResult {
  updated: boolean;
  error?: string;
  lockCount?: number;
}

export interface ReconcileResult {
  reconciled: boolean;
  error?: string;
  lockCount?: number;
}

// ─── Default Configuration ──────────────────────────────────────────────────

const DEFAULT_CONFIG: LockConfig = {
  locksDir: path.join(process.cwd(), '.planning', 'locks'),
  statePath: path.join(process.cwd(), '.planning', 'STATE.md'),
  staleThresholdMinutes: 90
};

// ─── LockState Class ────────────────────────────────────────────────────────

/**
 * LockState class for managing lock state integration
 */
export class LockState {
  private config: LockConfig;

  /**
   * Creates a new LockState instance
   * @param options - Configuration options
   */
  constructor(options: Partial<LockConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...options
    };
  }

  /**
   * Get status of all active locks
   * @returns Array of lock status objects
   */
  async getLockStatus(): Promise<LockStatus[]> {
    try {
      if (!fs.existsSync(this.config.locksDir)) {
        return [];
      }

      const files = fs.readdirSync(this.config.locksDir)
        .filter(f => f.endsWith('.lock.json'));

      const activeLocks: LockStatus[] = [];
      const now = new Date();

      for (const file of files) {
        const filePath = path.join(this.config.locksDir, file);
        try {
          const lockInfo = JSON.parse(fs.readFileSync(filePath, 'utf8')) as LockInfo;

          // Check if lock is stale
          const expiresAt = new Date(lockInfo.expires_at);
          const lastHeartbeat = new Date(lockInfo.last_heartbeat);
          const staleThreshold = new Date(now.getTime() - this.config.staleThresholdMinutes * 60000);

          const isStale = now > expiresAt || lastHeartbeat < staleThreshold;

          if (!isStale) {
            const acquiredAt = new Date(lockInfo.acquired_at);
            const durationMs = now.getTime() - acquiredAt.getTime();
            const durationMin = Math.round(durationMs / 60000);

            activeLocks.push({
              phase: lockInfo.phase,
              agentId: lockInfo.agent_id,
              agentName: lockInfo.agent_name,
              expiresAt: lockInfo.expires_at,
              acquiredAt: lockInfo.acquired_at,
              durationMin,
              sessionId: lockInfo.session_id,
              milestone: lockInfo.milestone
            });
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown';
          logger.warn('Failed to read lock file', { file, error: errorMessage });
        }
      }

      // Sort by phase number
      activeLocks.sort((a, b) => parseInt(a.phase) - parseInt(b.phase));

      return activeLocks;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown';
      logger.error('Failed to get lock status', { error: errorMessage });
      return [];
    }
  }

  /**
   * Format lock status as markdown table
   * @param locks - Lock status objects
   * @returns Markdown table string
   */
  formatLockStatusTable(locks: LockStatus[]): string {
    if (!locks || locks.length === 0) {
      return 'No active locks.\n';
    }

    let table = '| Phase | Agent | Expires | Duration |\n';
    table += '|-------|-------|---------|----------|\n';

    for (const lock of locks) {
      const expiresDate = new Date(lock.expiresAt);
      const expiresStr = expiresDate.toISOString().replace('T', ' ').substring(0, 16);
      const durationStr = this._formatDuration(lock.durationMin);

      table += `| ${lock.phase} | ${lock.agentId} | ${expiresStr} | ${durationStr} |\n`;
    }

    return table;
  }

  /**
   * Update STATE.md with lock status section
   * @param table - Markdown table to insert
   * @returns Update result
   */
  async updateStateLockSection(table: string): Promise<UpdateResult> {
    try {
      if (!fs.existsSync(this.config.statePath)) {
        logger.warn('STATE.md not found', { path: this.config.statePath });
        return {
          updated: false,
          error: 'STATE.md not found'
        };
      }

      let content = fs.readFileSync(this.config.statePath, 'utf8');

      // Check if Lock Status section exists
      const lockStatusRegex = /## Lock Status\s*\n([\s\S]*?)(?=\n## |\n# |\s*$)/;
      const hasLockSection = lockStatusRegex.test(content);

      const newSection = `## Lock Status\n\n${table}\n`;

      if (hasLockSection) {
        // Replace existing section
        content = content.replace(lockStatusRegex, newSection);
      } else {
        // Add new section after the last existing section
        const lastSectionMatch = content.match(/(## [^\n]+\n[\s\S]*)$/);
        if (lastSectionMatch) {
          content = content.replace(lastSectionMatch[0], lastSectionMatch[0] + '\n' + newSection);
        } else {
          // Append to end
          content += '\n' + newSection;
        }
      }

      // Atomic write
      const tempFile = this.config.statePath + '.tmp';
      fs.writeFileSync(tempFile, content, 'utf8');
      fs.renameSync(tempFile, this.config.statePath);

      const lockCount = table.split('\n').length - 3; // Subtract header rows
      logger.info('STATE.md lock section updated', { lockCount });

      return {
        updated: true,
        lockCount
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown';
      logger.error('Failed to update STATE.md lock section', { error: errorMessage });
      return {
        updated: false,
        error: errorMessage
      };
    }
  }

  /**
   * Reconcile STATE.md with actual locks (remove stale entries)
   * @returns Reconcile result
   */
  async reconcile(): Promise<ReconcileResult> {
    try {
      const activeLocks = await this.getLockStatus();
      const table = this.formatLockStatusTable(activeLocks);
      const updateResult = await this.updateStateLockSection(table);
      const result: ReconcileResult = {
        reconciled: updateResult.updated
      };
      if (updateResult.lockCount !== undefined) {
        result.lockCount = updateResult.lockCount;
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown';
      logger.error('Lock state reconcile failed', { error: errorMessage });
      return {
        reconciled: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get lock status summary for quick display
   * @returns Summary string
   */
  async getSummary(): Promise<string> {
    const locks = await this.getLockStatus();

    if (locks.length === 0) {
      return 'No active locks';
    }

    const summary = locks.map(lock => {
      return `Phase ${lock.phase}: ${lock.agentId} (expires ${new Date(lock.expiresAt).toLocaleString()})`;
    });

    return summary.join('\n');
  }

  /**
   * Format duration in human-readable format
   * @param minutes - Duration in minutes
   * @returns Formatted duration
   * @private
   */
  private _formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours < 24) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
}
