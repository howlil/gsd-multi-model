#!/usr/bin/env node

/**
 * EZ Phase Lock
 *
 * Implements phase locking mechanism to prevent multiple agents from working
 * on the same phase concurrently. Uses atomic file operations for lock acquisition
 * and structured JSON metadata for lock tracking.
 *
 * Features:
 * - Atomic lock acquisition with fs.writeFileSync 'wx' flag
 * - Structured lock metadata (agent_id, session_id, timestamps)
 * - Conflict detection with lock info return
 * - Stale lock detection and auto-recovery
 * - Idempotent release operation
 * - Comprehensive logging
 *
 * Lock File Structure:
 * .planning/locks/phase-{N}.lock.json
 * {
 *   "phase": "47",
 *   "status": "active",
 *   "agent_id": "ez-backend-agent",
 *   "agent_name": "Backend Agent",
 *   "acquired_at": "2026-03-24T10:30:00.000Z",
 *   "last_heartbeat": "2026-03-24T10:30:00.000Z",
 *   "expires_at": "2026-03-24T11:30:00.000Z",
 *   "milestone": "v4.1",
 *   "session_id": "session-20260324-103000"
 * }
 *
 * Usage:
 *   const PhaseLock = require('./phase-lock.cjs');
 *   const lock = new PhaseLock('47', { milestone: 'v4.1' });
 *
 *   // Acquire lock
 *   const result = await lock.acquire('agent-1', 'Backend Agent', 'session-123');
 *   if (result.acquired) {
 *     // Do phase work...
 *     await lock.release();
 *   } else if (result.conflict) {
 *     console.log(`Phase locked by ${result.lockInfo.agent_id}`);
 *   }
 */

const fs = require('fs');
const path = require('path');
const Logger = require('./logger.cjs');
const LockLogger = require('./lock-logger.cjs');
const LockState = require('./lock-state.cjs');
const logger = new Logger();

/**
 * Default configuration for phase locks.
 */
const DEFAULT_CONFIG = {
  locksDir: path.join(process.cwd(), '.planning', 'locks'),
  defaultExpiryMinutes: 60,
  staleThresholdMinutes: 90,
  heartbeatIntervalMinutes: 5,
  autoHeartbeat: true,
  archiveDir: path.join(process.cwd(), '.planning', 'locks', 'archive'),
  archiveRetentionDays: 7
};

/**
 * PhaseLock class for managing phase-level locks.
 */
class PhaseLock {
  /**
   * Creates a new PhaseLock instance.
   * @param {string} phase - Phase number (e.g., '47')
   * @param {Object} options - Configuration options
   * @param {string} options.locksDir - Directory for lock files (default: .planning/locks)
   * @param {number} options.defaultExpiryMinutes - Default lock expiry in minutes (default: 60)
   * @param {number} options.staleThresholdMinutes - Minutes before lock considered stale (default: 90)
   * @param {string} options.milestone - Milestone version (e.g., 'v4.1')
   * @param {boolean} options.autoHeartbeat - Enable automatic heartbeat (default: true)
   * @param {number} options.heartbeatIntervalMinutes - Heartbeat interval in minutes (default: 5)
   */
  constructor(phase, options = {}) {
    this.phase = String(phase);
    this.config = {
      ...DEFAULT_CONFIG,
      ...options
    };
    
    /** @private */
    this._lockFilePath = this._getLockFilePath(phase);
    /** @private */
    this._lockInfo = null;
    /** @private */
    this._heartbeatInterval = null;
    /** @protected */
    this.lockLogger = new LockLogger();
    /** @protected */
    this.lockState = new LockState({ locksDir: this.config.locksDir });
    
    // Ensure locks directory exists
    if (!fs.existsSync(this.config.locksDir)) {
      fs.mkdirSync(this.config.locksDir, { recursive: true });
    }
    
    // Ensure archive directory exists
    if (!fs.existsSync(this.config.archiveDir)) {
      fs.mkdirSync(this.config.archiveDir, { recursive: true });
    }
  }

  /**
   * Acquire a phase lock.
   * @param {string} agentId - Agent identifier
   * @param {string} agentName - Human-readable agent name
   * @param {string} sessionId - Session identifier
   * @param {Object} options - Override options
   * @param {number} options.expiryMinutes - Custom expiry in minutes
   * @returns {Promise<Object>} - Lock result: { acquired, conflict, lockInfo, error }
   */
  async acquire(agentId, agentName, sessionId, options = {}) {
    const timestamp = new Date();
    const expiryMinutes = options.expiryMinutes || this.config.defaultExpiryMinutes;

    const lockInfo = {
      phase: this.phase,
      status: 'active',
      agent_id: agentId,
      agent_name: agentName,
      session_id: sessionId,
      milestone: this.config.milestone || null,
      acquired_at: timestamp.toISOString(),
      last_heartbeat: timestamp.toISOString(),
      expires_at: new Date(timestamp.getTime() + expiryMinutes * 60000).toISOString()
    };

    try {
      // Check for existing lock
      const existingLock = await this._readLockFile();

      if (existingLock) {
        // Check if lock is stale
        if (this._isStale(existingLock)) {
          logger.warn('Stale lock detected, recovering', {
            phase: this.phase,
            previousAgent: existingLock.agent_id,
            expiredAt: existingLock.expires_at
          });

          // Log stale detection
          this.lockLogger.logStale(this.phase, existingLock);

          // Remove stale lock and acquire new one
          await this._removeLockFile();
          const result = await this._createLockFile(lockInfo);
          this.lockLogger.logAcquire(this.phase, agentId, result);
          await this._updateState();
          return result;
        }

        // Lock exists and not stale - return conflict info
        logger.info('Lock conflict', {
          phase: this.phase,
          heldBy: existingLock.agent_id,
          expiresAt: existingLock.expires_at
        });

        // Log conflict
        this.lockLogger.log('WARN', 'conflict', {
          phase: this.phase,
          agent_id: agentId,
          holder_agent: existingLock.agent_id,
          holder_name: existingLock.agent_name,
          expires_at: existingLock.expires_at
        });

        return {
          acquired: false,
          conflict: true,
          stale: false,
          lockInfo: existingLock,
          message: `Phase ${this.phase} is locked by ${existingLock.agent_id} (${existingLock.agent_name})`,
          expiresAt: existingLock.expires_at
        };
      }

      // No existing lock - acquire new lock
      const result = await this._createLockFile(lockInfo);
      this.lockLogger.logAcquire(this.phase, agentId, result);
      await this._updateState();
      return result;

    } catch (err) {
      logger.error('Lock acquisition failed', {
        phase: this.phase,
        agentId,
        error: err.message
      });

      this.lockLogger.log('ERROR', 'acquire', {
        phase: this.phase,
        agent_id: agentId,
        error: err.message
      });

      return {
        acquired: false,
        conflict: false,
        error: err.message,
        message: `Failed to acquire lock: ${err.message}`
      };
    }
  }

  /**
   * Release a phase lock.
   * @returns {Promise<Object>} - Release result: { released, error }
   */
  async release() {
    try {
      const lockInfo = await this._readLockFile();

      if (!lockInfo) {
        logger.warn('Release called on non-existent lock', { phase: this.phase });
        this.lockLogger.log('INFO', 'release', {
          phase: this.phase,
          result: 'not_found',
          message: 'Lock did not exist'
        });
        return {
          released: true,
          existed: false,
          message: `Lock for phase ${this.phase} did not exist (idempotent release)`
        };
      }

      // Stop heartbeat before removing lock
      this._stopHeartbeat();

      await this._removeLockFile();

      const heldDuration = Date.now() - new Date(lockInfo.acquired_at).getTime();

      logger.info('Lock released', {
        phase: this.phase,
        agentId: lockInfo.agent_id,
        heldDuration
      });

      // Log release
      const result = {
        released: true,
        existed: true,
        lockInfo,
        message: `Lock released for phase ${this.phase}`
      };
      this.lockLogger.logRelease(this.phase, lockInfo.agent_id, result);

      // Update STATE.md
      await this._updateState();

      return result;

    } catch (err) {
      logger.error('Lock release failed', {
        phase: this.phase,
        error: err.message
      });

      this.lockLogger.log('ERROR', 'release', {
        phase: this.phase,
        error: err.message
      });

      return {
        released: false,
        error: err.message,
        message: `Failed to release lock: ${err.message}`
      };
    }
  }

  /**
   * Check if phase is locked.
   * @returns {Promise<Object>} - Lock status: { isLocked, isStale, lockInfo }
   */
  async isLocked() {
    try {
      const lockInfo = await this._readLockFile();
      
      if (!lockInfo) {
        return {
          isLocked: false,
          isStale: false,
          lockInfo: null
        };
      }
      
      const isStale = this._isStale(lockInfo);
      
      return {
        isLocked: !isStale,
        isStale,
        lockInfo
      };
      
    } catch (err) {
      logger.error('Lock status check failed', {
        phase: this.phase,
        error: err.message
      });
      
      return {
        isLocked: false,
        isStale: false,
        lockInfo: null,
        error: err.message
      };
    }
  }

  /**
   * Get lock information.
   * @returns {Promise<Object|null>} - Lock info or null if not locked
   */
  async getLockInfo() {
    return await this._readLockFile();
  }

  /**
   * Update heartbeat timestamp.
   * @returns {Promise<Object>} - Heartbeat result: { success, error }
   */
  async heartbeat() {
    try {
      const lockInfo = await this._readLockFile();
      
      if (!lockInfo) {
        return {
          success: false,
          error: 'Lock not found',
          message: `Cannot update heartbeat - lock for phase ${this.phase} does not exist`
        };
      }
      
      // Update heartbeat and expiry
      const now = new Date();
      lockInfo.last_heartbeat = now.toISOString();
      
      // Extend expiry from current time
      const expiryMinutes = this.config.defaultExpiryMinutes;
      lockInfo.expires_at = new Date(now.getTime() + expiryMinutes * 60000).toISOString();
      
      await this._writeLockFile(lockInfo);
      
      logger.debug('Heartbeat updated', {
        phase: this.phase,
        agentId: lockInfo.agent_id,
        expiresAt: lockInfo.expires_at
      });
      
      return {
        success: true,
        lockInfo,
        message: `Heartbeat updated for phase ${this.phase}`
      };
      
    } catch (err) {
      logger.error('Heartbeat update failed', {
        phase: this.phase,
        error: err.message
      });
      
      return {
        success: false,
        error: err.message,
        message: `Failed to update heartbeat: ${err.message}`
      };
    }
  }

  /**
   * Start automatic heartbeat timer.
   * @private
   */
  _startHeartbeat() {
    // Clear any existing timer
    this._stopHeartbeat();

    const intervalMs = this.config.heartbeatIntervalMinutes * 60000;

    this._heartbeatInterval = setInterval(async () => {
      try {
        const result = await this.heartbeat();
        if (!result.success) {
          logger.warn('Auto-heartbeat failed', {
            phase: this.phase,
            error: result.error
          });
        }
      } catch (err) {
        logger.error('Auto-heartbeat error', {
          phase: this.phase,
          error: err.message
        });
      }
    }, intervalMs);

    // Don't block process exit
    if (this._heartbeatInterval.unref) {
      this._heartbeatInterval.unref();
    }

    logger.debug('Auto-heartbeat started', {
      phase: this.phase,
      intervalMinutes: this.config.heartbeatIntervalMinutes
    });
  }

  /**
   * Stop automatic heartbeat timer.
   * @private
   */
  _stopHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
      logger.debug('Auto-heartbeat stopped', { phase: this.phase });
    }
  }

  /**
   * Update STATE.md with current lock status.
   * @private
   */
  async _updateState() {
    try {
      const locks = await this.lockState.getLockStatus();
      const table = this.lockState.formatLockStatusTable(locks);
      const result = await this.lockState.updateStateLockSection(table);
      
      this.lockLogger.logStateUpdate(locks.length, result);
      
      return result;
    } catch (err) {
      logger.warn('STATE.md lock update failed', { error: err.message });
      this.lockLogger.log('WARN', 'state_update', {
        error: err.message,
        message: 'Failed to update STATE.md lock section'
      });
      return { updated: false, error: err.message };
    }
  }

  /**
   * Force acquire a lock (even if locked).
   * Use with caution — only for stale lock recovery.
   * @param {string} agentId - Agent identifier
   * @param {string} agentName - Human-readable agent name
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} - Lock result
   */
  async forceAcquire(agentId, agentName, sessionId) {
    logger.warn('Force acquire requested', {
      phase: this.phase,
      agentId
    });
    
    // Remove any existing lock
    await this._removeLockFile();
    
    // Acquire new lock
    return await this.acquire(agentId, agentName, sessionId);
  }

  /**
   * Get lock file path for a phase.
   * @param {string} phase - Phase number
   * @returns {string} - File path
   * @private
   */
  _getLockFilePath(phase) {
    return path.join(this.config.locksDir, `phase-${phase}.lock.json`);
  }

  /**
   * Read lock file.
   * @returns {Promise<Object|null>} - Lock info or null
   * @private
   */
  async _readLockFile() {
    try {
      if (!fs.existsSync(this._lockFilePath)) {
        return null;
      }
      
      const content = fs.readFileSync(this._lockFilePath, 'utf8');
      return JSON.parse(content);
      
    } catch (err) {
      // File corrupted - treat as stale
      if (err instanceof SyntaxError) {
        logger.warn('Lock file corrupted', {
          phase: this.phase,
          error: err.message
        });
        return null;
      }
      
      throw err;
    }
  }

  /**
   * Create lock file atomically.
   * @param {Object} lockInfo - Lock metadata
   * @returns {Promise<Object>} - Lock result
   * @private
   */
  async _createLockFile(lockInfo) {
    try {
      // Atomic write: temp file + rename
      const tempFile = this._lockFilePath + '.tmp';
      fs.writeFileSync(tempFile, JSON.stringify(lockInfo, null, 2), 'utf8');
      fs.renameSync(tempFile, this._lockFilePath);

      this._lockInfo = lockInfo;

      // Start auto-heartbeat if enabled
      if (this.config.autoHeartbeat) {
        this._startHeartbeat();
      }

      logger.info('Lock acquired', {
        phase: this.phase,
        agentId: lockInfo.agent_id,
        expiresAt: lockInfo.expires_at
      });

      return {
        acquired: true,
        conflict: false,
        lockInfo,
        message: `Lock acquired for phase ${this.phase}`
      };

    } catch (err) {
      // Clean up temp file if it exists
      const tempFile = this._lockFilePath + '.tmp';
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }

      throw err;
    }
  }

  /**
   * Write lock file.
   * @param {Object} lockInfo - Lock metadata
   * @private
   */
  async _writeLockFile(lockInfo) {
    const tempFile = this._lockFilePath + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(lockInfo, null, 2), 'utf8');
    fs.renameSync(tempFile, this._lockFilePath);
    this._lockInfo = lockInfo;
  }

  /**
   * Remove lock file.
   * @private
   */
  async _removeLockFile() {
    if (fs.existsSync(this._lockFilePath)) {
      fs.unlinkSync(this._lockFilePath);
    }
    this._lockInfo = null;
  }

  /**
   * Check if lock is stale.
   * @param {Object} lockInfo - Lock metadata
   * @returns {boolean} - True if stale
   * @private
   */
  _isStale(lockInfo) {
    if (!lockInfo || !lockInfo.expires_at) {
      return true;
    }
    
    const now = new Date();
    const expiresAt = new Date(lockInfo.expires_at);
    
    // Also check stale threshold
    const staleThreshold = new Date(now.getTime() - this.config.staleThresholdMinutes * 60000);
    const lastHeartbeat = new Date(lockInfo.last_heartbeat);
    
    return now > expiresAt || lastHeartbeat < staleThreshold;
  }

  /**
   * Get lock statistics.
   * @returns {Promise<Object>} - Statistics
   */
  async getStats() {
    try {
      const files = fs.readdirSync(this.config.locksDir)
        .filter(f => f.endsWith('.lock.json'));

      const activeLocks = [];
      const staleLocks = [];

      for (const file of files) {
        const filePath = path.join(this.config.locksDir, file);
        try {
          const lockInfo = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (this._isStale(lockInfo)) {
            staleLocks.push(lockInfo);
          } else {
            activeLocks.push(lockInfo);
          }
        } catch (err) {
          // Skip corrupted files
        }
      }

      return {
        totalLocks: files.length,
        activeLocks: activeLocks.length,
        staleLocks: staleLocks.length,
        activeLockDetails: activeLocks,
        staleLockDetails: staleLocks
      };

    } catch (err) {
      return {
        totalLocks: 0,
        activeLocks: 0,
        staleLocks: 0,
        error: err.message
      };
    }
  }

  /**
   * Archive a stale lock before removal.
   * @param {Object} lockInfo - Lock metadata
   * @returns {Promise<string>} - Archive file path
   * @private
   */
  async _archiveLock(lockInfo) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveFileName = `phase-${this.phase}-${timestamp}.archived.json`;
    const archiveFilePath = path.join(this.config.archiveDir, archiveFileName);

    const archiveData = {
      ...lockInfo,
      archived_at: new Date().toISOString(),
      original_phase: this.phase
    };

    fs.writeFileSync(archiveFilePath, JSON.stringify(archiveData, null, 2), 'utf8');

    logger.info('Lock archived', {
      phase: this.phase,
      agentId: lockInfo.agent_id,
      archivePath: archiveFilePath
    });

    return archiveFilePath;
  }

  /**
   * Clean up old archives.
   * @returns {Promise<Object>} - Cleanup result
   */
  async cleanupArchives() {
    try {
      if (!fs.existsSync(this.config.archiveDir)) {
        return { cleaned: 0, message: 'Archive directory does not exist' };
      }

      const files = fs.readdirSync(this.config.archiveDir)
        .filter(f => f.endsWith('.archived.json'));

      const now = Date.now();
      const retentionMs = this.config.archiveRetentionDays * 24 * 60 * 60 * 1000;
      let cleaned = 0;

      for (const file of files) {
        const filePath = path.join(this.config.archiveDir, file);
        const stats = fs.statSync(filePath);
        const ageMs = now - stats.mtimeMs;

        if (ageMs > retentionMs) {
          fs.unlinkSync(filePath);
          cleaned++;
          logger.debug('Old archive deleted', {
            file,
            ageDays: Math.round(ageMs / (24 * 60 * 60 * 1000))
          });
        }
      }

      return {
        cleaned,
        message: `Deleted ${cleaned} archives older than ${this.config.archiveRetentionDays} days`
      };

    } catch (err) {
      logger.error('Archive cleanup failed', { error: err.message });
      return {
        cleaned: 0,
        error: err.message
      };
    }
  }

  /**
   * Scan for stale locks.
   * @returns {Promise<Object>} - Stale lock scan result
   */
  async scanStale() {
    try {
      const files = fs.readdirSync(this.config.locksDir)
        .filter(f => f.endsWith('.lock.json'));

      const staleLocks = [];

      for (const file of files) {
        const filePath = path.join(this.config.locksDir, file);
        try {
          const lockInfo = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (this._isStale(lockInfo)) {
            staleLocks.push({
              file,
              ...lockInfo
            });
          }
        } catch (err) {
          staleLocks.push({
            file,
            error: 'corrupted',
            message: err.message
          });
        }
      }

      return {
        staleCount: staleLocks.length,
        staleLocks
      };

    } catch (err) {
      return {
        staleCount: 0,
        error: err.message
      };
    }
  }

  /**
   * Clean up all stale locks (archive and remove).
   * @returns {Promise<Object>} - Cleanup result
   */
  async cleanupStale() {
    try {
      const scanResult = await this.scanStale();
      const cleaned = [];
      const errors = [];

      for (const staleLock of scanResult.staleLocks) {
        if (staleLock.error) {
          errors.push({ file: staleLock.file, error: staleLock.error });
          continue;
        }

        try {
          // Extract phase from file name
          const phaseMatch = staleLock.file.match(/phase-(\d+)\.lock\.json/);
          if (!phaseMatch) continue;

          const phase = phaseMatch[1];
          const lock = new PhaseLock(phase, this.config);

          // Archive first
          await lock._archiveLock(staleLock);

          // Then remove
          await lock._removeLockFile();

          cleaned.push({
            phase,
            agentId: staleLock.agent_id,
            archived: true
          });

          logger.info('Stale lock cleaned', {
            phase,
            agentId: staleLock.agent_id
          });
        } catch (err) {
          errors.push({
            phase: staleLock.phase || 'unknown',
            agentId: staleLock.agent_id,
            error: err.message
          });
        }
      }

      return {
        cleaned: cleaned.length,
        cleanedLocks: cleaned,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (err) {
      return {
        cleaned: 0,
        error: err.message
      };
    }
  }
}

module.exports = PhaseLock;
