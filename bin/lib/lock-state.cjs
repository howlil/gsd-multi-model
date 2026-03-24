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
 *
 * Usage:
 *   const LockState = require('./lock-state.cjs');
 *   const lockState = new LockState();
 *
 *   // Get formatted lock status
 *   const status = await lockState.getLockStatus();
 *   const table = lockState.formatLockStatusTable(status);
 *
 *   // Update STATE.md
 *   await lockState.updateStateLockSection(table);
 */

const fs = require('fs');
const path = require('path');
const Logger = require('./logger.cjs');
const logger = new Logger();

/**
 * Default configuration.
 */
const DEFAULT_CONFIG = {
  locksDir: path.join(process.cwd(), '.planning', 'locks'),
  statePath: path.join(process.cwd(), '.planning', 'STATE.md'),
  staleThresholdMinutes: 90
};

/**
 * LockState class for managing lock state integration.
 */
class LockState {
  /**
   * Creates a new LockState instance.
   * @param {Object} options - Configuration options
   * @param {string} options.locksDir - Directory for lock files
   * @param {string} options.statePath - Path to STATE.md
   */
  constructor(options = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...options
    };
  }

  /**
   * Get status of all active locks.
   * @returns {Promise<Array<Object>>} - Array of lock status objects
   */
  async getLockStatus() {
    try {
      if (!fs.existsSync(this.config.locksDir)) {
        return [];
      }

      const files = fs.readdirSync(this.config.locksDir)
        .filter(f => f.endsWith('.lock.json'));

      const activeLocks = [];
      const now = new Date();

      for (const file of files) {
        const filePath = path.join(this.config.locksDir, file);
        try {
          const lockInfo = JSON.parse(fs.readFileSync(filePath, 'utf8'));

          // Check if lock is stale
          const expiresAt = new Date(lockInfo.expires_at);
          const lastHeartbeat = new Date(lockInfo.last_heartbeat);
          const staleThreshold = new Date(now.getTime() - this.config.staleThresholdMinutes * 60000);

          const isStale = now > expiresAt || lastHeartbeat < staleThreshold;

          if (!isStale) {
            const acquiredAt = new Date(lockInfo.acquired_at);
            const durationMs = now - acquiredAt;
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
          logger.warn('Failed to read lock file', { file, error: err.message });
        }
      }

      // Sort by phase number
      activeLocks.sort((a, b) => parseInt(a.phase) - parseInt(b.phase));

      return activeLocks;

    } catch (err) {
      logger.error('Failed to get lock status', { error: err.message });
      return [];
    }
  }

  /**
   * Format lock status as markdown table.
   * @param {Array<Object>} locks - Lock status objects
   * @returns {string} - Markdown table string
   */
  formatLockStatusTable(locks) {
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
   * Update STATE.md with lock status section.
   * @param {string} table - Markdown table to insert
   * @returns {Promise<Object>} - Update result
   */
  async updateStateLockSection(table) {
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

      logger.info('STATE.md lock section updated', {
        lockCount: table.split('\n').length - 3 // Subtract header rows
      });

      return {
        updated: true,
        lockCount: table.split('\n').length - 3
      };

    } catch (err) {
      logger.error('Failed to update STATE.md lock section', { error: err.message });
      return {
        updated: false,
        error: err.message
      };
    }
  }

  /**
   * Reconcile STATE.md with actual locks (remove stale entries).
   * @returns {Promise<Object>} - Reconcile result
   */
  async reconcile() {
    try {
      const activeLocks = await this.getLockStatus();
      const table = this.formatLockStatusTable(activeLocks);
      return await this.updateStateLockSection(table);
    } catch (err) {
      logger.error('Lock state reconcile failed', { error: err.message });
      return {
        reconciled: false,
        error: err.message
      };
    }
  }

  /**
   * Get lock status summary for quick display.
   * @returns {Promise<string>} - Summary string
   */
  async getSummary() {
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
   * Format duration in human-readable format.
   * @param {number} minutes - Duration in minutes
   * @returns {string} - Formatted duration
   * @private
   */
  _formatDuration(minutes) {
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

module.exports = LockState;
