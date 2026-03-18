#!/usr/bin/env node

/**
 * EZ Logger — Centralized logging module for EZ workflow
 * 
 * Provides structured logging with levels (ERROR, WARN, INFO, DEBUG)
 * Writes to .planning/logs/ez-{timestamp}.log
 * Replaces silent catch {} blocks with proper error logging
 * 
 * Usage:
 *   const Logger = require('./logger.cjs');
 *   const logger = new Logger();
 *   logger.error('Something failed', { context: 'details' });
 */

const fs = require('fs');
const path = require('path');

class Logger {
  /**
   * Create a Logger instance
   * @param {string} logDir - Directory for log files (default: .planning/logs)
   */
  constructor(logDir = '.planning/logs') {
    this.logDir = logDir;
    this.logFile = null;
  }

  /**
   * Ensure log directory exists and initialize log file
   */
  _ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    this.logFile = path.join(this.logDir, `ez-${Date.now()}.log`);
  }

  /**
   * Get current log file path
   * @returns {string} - Path to log file
   */
  getLogFile() {
    if (!this.logFile) {
      this._ensureLogDir();
    }
    return this.logFile;
  }

  /**
   * Write a log entry
   * @param {string} level - Log level (ERROR, WARN, INFO, DEBUG)
   * @param {string} message - Log message
   * @param {Object} context - Additional context data
   */
  log(level, message, context = {}) {
    // Ensure log directory exists before first write
    if (!this.logFile) {
      this._ensureLogDir();
    }
    
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      pid: process.pid
    };

    try {
      fs.appendFileSync(this.logFile, JSON.stringify(entry) + '\n');
      
      // Always output ERROR level to console for visibility
      if (level === 'ERROR') {
        console.error(`[EZ ${level}] ${message}`);
      }
    } catch (err) {
      // Fallback: log to console if file write fails
      console.error(`[EZ ${level}] ${message} (file write failed: ${err.message})`);
    }
  }

  /**
   * Log an ERROR level message
   * @param {string} msg - Error message
   * @param {Object} ctx - Additional context
   */
  error(msg, ctx) {
    this.log('ERROR', msg, ctx);
  }

  /**
   * Log a WARN level message
   * @param {string} msg - Warning message
   * @param {Object} ctx - Additional context
   */
  warn(msg, ctx) {
    this.log('WARN', msg, ctx);
  }

  /**
   * Log an INFO level message
   * @param {string} msg - Info message
   * @param {Object} ctx - Additional context
   */
  info(msg, ctx) {
    this.log('INFO', msg, ctx);
  }

  /**
   * Log a DEBUG level message
   * @param {string} msg - Debug message
   * @param {Object} ctx - Additional context
   */
  debug(msg, ctx) {
    this.log('DEBUG', msg, ctx);
  }
}

// Singleton instance for default usage
const defaultLogger = new Logger();

module.exports = Logger;
module.exports.defaultLogger = defaultLogger;
