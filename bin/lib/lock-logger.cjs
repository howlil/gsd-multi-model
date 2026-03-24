#!/usr/bin/env node

/**
 * EZ Lock Logger
 *
 * Dedicated logging for phase lock operations.
 * Writes structured JSON lines to `.planning/logs/phase-lock.log`.
 *
 * Features:
 * - Structured JSON line format
 * - Size-based log rotation (10MB, keep 5 files)
 * - Log levels: INFO, WARN, ERROR
 * - Automatic timestamp and context
 *
 * Log Entry Format:
 * {"timestamp":"2026-03-24T10:30:00.000Z","level":"INFO","operation":"acquire","phase":"47","agent_id":"ez-backend-agent","result":"success"}
 *
 * Usage:
 *   const LockLogger = require('./lock-logger.cjs');
 *   const lockLogger = new LockLogger();
 *
 *   lockLogger.log('INFO', 'acquire', { phase: '47', agent_id: 'agent-1', result: 'success' });
 *   lockLogger.log('WARN', 'conflict', { phase: '47', holder_agent: 'agent-2' });
 */

const fs = require('fs');
const path = require('path');
const Logger = require('./logger.cjs');
const logger = new Logger();

/**
 * Default configuration.
 */
const DEFAULT_CONFIG = {
  logDir: path.join(process.cwd(), '.planning', 'logs'),
  logFile: 'phase-lock.log',
  maxSizeBytes: 10 * 1024 * 1024,  // 10MB
  maxFiles: 5
};

/**
 * LockLogger class for lock operation logging.
 */
class LockLogger {
  /**
   * Creates a new LockLogger instance.
   * @param {Object} options - Configuration options
   * @param {string} options.logDir - Directory for log files
   * @param {string} options.logFile - Log file name
   * @param {number} options.maxSizeBytes - Max log file size before rotation
   * @param {number} options.maxFiles - Max number of rotated log files to keep
   */
  constructor(options = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...options
    };

    this.logPath = path.join(this.config.logDir, this.config.logFile);

    // Ensure log directory exists
    if (!fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }
  }

  /**
   * Log a lock operation.
   * @param {string} level - Log level: INFO, WARN, ERROR
   * @param {string} operation - Operation type: acquire, release, heartbeat, conflict, stale
   * @param {Object} data - Operation data
   */
  log(level, operation, data = {}) {
    try {
      const entry = {
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        operation,
        ...data
      };

      const line = JSON.stringify(entry) + '\n';

      // Check if rotation needed
      this._rotateIfNeeded();

      // Append to log file
      fs.appendFileSync(this.logPath, line);

    } catch (err) {
      // Silent fallback - don't block operations
      logger.debug('Lock logger write failed', { error: err.message });
    }
  }

  /**
   * Log lock acquire.
   * @param {string} phase - Phase number
   * @param {string} agentId - Agent identifier
   * @param {Object} result - Acquire result
   */
  logAcquire(phase, agentId, result) {
    const data = {
      phase,
      agent_id: agentId,
      result: result.acquired ? 'success' : (result.conflict ? 'conflict' : 'error'),
      message: result.message
    };

    if (result.lockInfo) {
      data.holder_agent = result.lockInfo.agent_id;
      data.holder_name = result.lockInfo.agent_name;
      data.expires_at = result.expiresAt;
    }

    const level = result.acquired ? 'INFO' : (result.conflict ? 'WARN' : 'ERROR');
    this.log(level, 'acquire', data);
  }

  /**
   * Log lock release.
   * @param {string} phase - Phase number
   * @param {string} agentId - Agent identifier
   * @param {Object} result - Release result
   */
  logRelease(phase, agentId, result) {
    const data = {
      phase,
      agent_id: agentId,
      result: result.released ? 'success' : 'error',
      message: result.message
    };

    if (result.lockInfo) {
      data.held_duration_ms = Date.now() - new Date(result.lockInfo.acquired_at).getTime();
    }

    const level = result.released ? 'INFO' : 'ERROR';
    this.log(level, 'release', data);
  }

  /**
   * Log heartbeat.
   * @param {string} phase - Phase number
   * @param {string} agentId - Agent identifier
   * @param {Object} result - Heartbeat result
   */
  logHeartbeat(phase, agentId, result) {
    const data = {
      phase,
      agent_id: agentId,
      result: result.success ? 'success' : 'error',
      message: result.message
    };

    if (result.lockInfo) {
      data.expires_at = result.lockInfo.expires_at;
    }

    const level = result.success ? 'INFO' : 'WARN';
    this.log(level, 'heartbeat', data);
  }

  /**
   * Log stale lock detection.
   * @param {string} phase - Phase number
   * @param {Object} lockInfo - Stale lock info
   */
  logStale(phase, lockInfo) {
    const data = {
      phase,
      previous_agent: lockInfo.agent_id,
      previous_name: lockInfo.agent_name,
      reason: 'expired',
      action: 'auto-release'
    };

    if (lockInfo.expires_at) {
      data.expired_at = lockInfo.expires_at;
    }

    this.log('WARN', 'stale', data);
  }

  /**
   * Log lock status update.
   * @param {number} lockCount - Number of active locks
   * @param {Object} result - Update result
   */
  logStateUpdate(lockCount, result) {
    const data = {
      lock_count: lockCount,
      result: result.updated ? 'success' : 'error'
    };

    if (result.error) {
      data.error = result.error;
    }

    const level = result.updated ? 'INFO' : 'WARN';
    this.log(level, 'state_update', data);
  }

  /**
   * Rotate log file if needed.
   * @private
   */
  _rotateIfNeeded() {
    try {
      if (!fs.existsSync(this.logPath)) {
        return;
      }

      const stats = fs.statSync(this.logPath);
      if (stats.size < this.config.maxSizeBytes) {
        return;
      }

      // Rotate files
      for (let i = this.config.maxFiles - 1; i >= 1; i--) {
        const oldFile = `${this.logPath}.${i}`;
        const newFile = `${this.logPath}.${i + 1}`;

        if (fs.existsSync(oldFile)) {
          if (i === this.config.maxFiles - 1) {
            // Delete oldest file
            fs.unlinkSync(oldFile);
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // Rename current log to .1
      fs.renameSync(this.logPath, `${this.logPath}.1`);

      logger.debug('Log file rotated', { path: this.logPath });

    } catch (err) {
      logger.warn('Log rotation failed', { error: err.message });
    }
  }

  /**
   * Get log file path.
   * @returns {string} - Log file path
   */
  getLogPath() {
    return this.logPath;
  }

  /**
   * Read recent log entries.
   * @param {number} limit - Number of entries to read
   * @returns {Array<Object>} - Log entries
   */
  readRecent(limit = 100) {
    try {
      if (!fs.existsSync(this.logPath)) {
        return [];
      }

      const content = fs.readFileSync(this.logPath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.trim());

      const entries = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (err) {
          return null;
        }
      }).filter(entry => entry !== null);

      return entries.slice(-limit);

    } catch (err) {
      logger.error('Failed to read log', { error: err.message });
      return [];
    }
  }

  /**
   * Clear log file.
   * @returns {boolean} - Success
   */
  clear() {
    try {
      if (fs.existsSync(this.logPath)) {
        fs.unlinkSync(this.logPath);
      }
      return true;
    } catch (err) {
      logger.error('Failed to clear log', { error: err.message });
      return false;
    }
  }
}

module.exports = LockLogger;
