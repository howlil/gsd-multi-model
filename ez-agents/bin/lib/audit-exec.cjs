#!/usr/bin/env node

/**
 * EZ Audit Exec — Command execution with full audit logging
 * 
 * Logs all command executions to audit file for security review:
 * - Timestamp, command, arguments, context
 * - Duration and result status
 * - Error details if failed
 * 
 * Usage:
 *   const { auditExec } = require('./audit-exec.cjs');
 *   const result = await auditExec('git', ['status'], { context: 'my-module' });
 */

const { execFile } = require('child_process');
const { promisify } = require('util');
const { appendFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');
const Logger = require('./logger.cjs');
const logger = new Logger();

const execFileAsync = promisify(execFile);

// Audit log file path - lazy init
let _AUDIT_DIR;
let _AUDIT_FILE;

function getAuditDir() {
  if (!_AUDIT_DIR) {
    _AUDIT_DIR = join('.planning', 'logs');
    if (!existsSync(_AUDIT_DIR)) {
      mkdirSync(_AUDIT_DIR, { recursive: true });
    }
  }
  return _AUDIT_DIR;
}

function getAuditFile() {
  if (!_AUDIT_FILE) {
    _AUDIT_FILE = join(getAuditDir(), `audit-${new Date().toISOString().split('T')[0]}.jsonl`);
  }
  return _AUDIT_FILE;
}

/**
 * Write audit log entry
 * @param {Object} entry - Audit entry
 */
function writeAudit(entry) {
  const line = JSON.stringify(entry) + '\n';
  appendFileSync(getAuditFile(), line, 'utf-8');
}

/**
 * Execute command with full audit logging
 * @param {string} cmd - Command to execute
 * @param {string[]} args - Command arguments
 * @param {Object} options - Execution options
 * @param {string} options.context - Calling context (which module/function)
 * @param {string} options.user - User identifier
 * @returns {Promise<string>} - Command stdout
 */
async function auditExec(cmd, args = [], options = {}) {
  const { context = 'unknown', user = 'system', timeout = 30000 } = options;
  
  const entry = {
    timestamp: new Date().toISOString(),
    cmd,
    args,
    context,
    user,
    status: 'started'
  };
  
  // Log start
  writeAudit(entry);
  logger.info('Audit: command started', { cmd, args: args.join(' '), context });
  
  const startTime = Date.now();
  
  try {
    const result = await execFileAsync(cmd, args, { 
      timeout,
      maxBuffer: 10 * 1024 * 1024
    });
    
    const duration = Date.now() - startTime;
    
    // Log success
    const successEntry = {
      ...entry,
      status: 'success',
      duration,
      stdout_length: result.stdout?.length || 0
    };
    writeAudit(successEntry);
    
    logger.debug('Audit: command completed', { cmd, duration, context });
    
    return result.stdout.trim();
  } catch (err) {
    const duration = Date.now() - startTime;
    
    // Log failure
    const errorEntry = {
      ...entry,
      status: 'error',
      duration,
      error: err.message,
      code: err.code,
      signal: err.signal
    };
    writeAudit(errorEntry);
    
    logger.error('Audit: command failed', { cmd, error: err.message, duration, context });
    
    throw err;
  }
}

/**
 * Get today's audit log path
 * @returns {string} - Audit file path
 */
function getAuditFilePath() {
  return AUDIT_FILE;
}

/**
 * Read audit log entries for a specific date
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {Object[]} - Array of audit entries
 */
function readAuditLog(date = new Date().toISOString().split('T')[0]) {
  const filePath = join(AUDIT_DIR, `audit-${date}.jsonl`);
  
  if (!existsSync(filePath)) {
    return [];
  }
  
  const content = require('fs').readFileSync(filePath, 'utf-8');
  return content.trim().split('\n').map(line => JSON.parse(line));
}

/**
 * Search audit log for specific command
 * @param {string} cmdFilter - Command to filter by
 * @param {string} date - Date string
 * @returns {Object[]} - Matching entries
 */
function searchAuditLog(cmdFilter, date) {
  const entries = readAuditLog(date);
  return entries.filter(e => e.cmd === cmdFilter);
}

module.exports = {
  auditExec,
  getAuditFilePath,
  readAuditLog,
  searchAuditLog
};
