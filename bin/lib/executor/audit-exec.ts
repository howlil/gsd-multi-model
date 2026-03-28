/**
 * EZ Audit Exec — Command execution with full audit logging
 *
 * Logs all command executions to audit file for security review:
 * - Timestamp, command, arguments, context
 * - Duration and result status
 * - Error details if failed
 *
 * Uses Promise-based execution for async operations.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { defaultLogger as logger } from '../logger/index.js';
import type { StateManager } from '../state/state-manager.js';

const execFileAsync = promisify(execFile);

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface AuditExecOptions {
  context?: string;
  user?: string;
  timeout?: number;
  // Checkpoint options
  createCheckpoint?: boolean;
  checkpointBeforeExec?: boolean;
  checkpointAfterSuccess?: boolean;
  stateManager?: StateManager;
  taskId?: string;
  agentId?: string;
}

export interface AuditEntry {
  timestamp: string;
  cmd: string;
  args: string[];
  context: string;
  user: string;
  status: 'started' | 'success' | 'error';
  duration?: number;
  stdout_length?: number;
  error?: string;
  code?: string;
  signal?: string;
  checkpointId?: string;
}

// ─── Module State ───────────────────────────────────────────────────────────

let _AUDIT_DIR: string | undefined;
let _AUDIT_FILE: string | undefined;

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Get audit log directory
 * @returns Audit directory path
 */
function getAuditDir(): string {
  if (!_AUDIT_DIR) {
    _AUDIT_DIR = join(process.env.TEMP ?? process.env.TMPDIR ?? '/tmp', 'ez-agents-audit');
    if (!existsSync(_AUDIT_DIR)) {
      mkdirSync(_AUDIT_DIR, { recursive: true });
    }
  }
  return _AUDIT_DIR;
}

/**
 * Get audit log file path
 * @returns Audit file path
 */
function getAuditFile(): string {
  if (!_AUDIT_FILE) {
    _AUDIT_FILE = join(getAuditDir(), `audit-${new Date().toISOString().split('T')[0]}.jsonl`);
  }
  return _AUDIT_FILE;
}

/**
 * Write audit log entry
 * @param entry - Audit entry to write
 */
function writeAudit(entry: AuditEntry): void {
  try {
    const line = JSON.stringify(entry) + '\n';
    appendFileSync(getAuditFile(), line, 'utf-8');
  } catch (err) {
    // Log audit failures to stderr - never silently ignore
    // This ensures security issues are visible even if file write fails
    console.error('AUDIT LOG FAILURE:', err instanceof Error ? err.message : 'Unknown');
    console.error('Audit entry:', JSON.stringify(entry));

    // In strict mode, throw to prevent execution without audit trail
    if (process.env.AUDIT_STRICT === 'true') {
      throw err;
    }
  }
}

// ─── Main Functions ─────────────────────────────────────────────────────────

/**
 * Execute command with full audit logging
 * @param cmd - Command to execute
 * @param args - Command arguments
 * @param options - Execution options
 * @returns Promise resolving to command stdout
 */
export async function auditExec(
  cmd: string,
  args: string[] = [],
  options: AuditExecOptions = {}
): Promise<string> {
  const { context = 'unknown', user = 'system', timeout = 30000 } = options;
  let checkpointId: string | undefined;

  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    cmd,
    args,
    context,
    user,
    status: 'started'
  };

  // Pre-execution checkpoint
  if (options.createCheckpoint && options.checkpointBeforeExec && 
      options.stateManager && options.taskId) {
    try {
      checkpointId = await options.stateManager.createTaskCheckpoint(
        options.taskId,
        options.agentId || 'executor'
      );
      logger.debug(`Pre-execution checkpoint created for task ${options.taskId}: ${checkpointId}`);
    } catch (error) {
      logger.warn(`Failed to create pre-execution checkpoint: ${error}`);
      // Don't block execution
    }
  }

  // Log start
  writeAudit(entry);
  logger.info('Audit: command started', { cmd, args: args.join(' '), context });

  const startTime = Date.now();

  try {
    const result = await execFileAsync(cmd, args, {
      timeout,
      maxBuffer: 1 * 1024 * 1024 // 1MB buffer (reduced from 10MB for security)
    });

    const duration = Date.now() - startTime;

    // Post-execution checkpoint on success
    if (options.createCheckpoint && options.checkpointAfterSuccess && 
        options.stateManager && options.taskId) {
      try {
        checkpointId = await options.stateManager.createTaskCheckpoint(
          options.taskId,
          options.agentId || 'executor'
        );
        logger.debug(`Post-execution checkpoint created for task ${options.taskId}: ${checkpointId}`);
      } catch (error) {
        logger.warn(`Failed to create post-execution checkpoint: ${error}`);
        // Don't block result
      }
    }

    // Log success
    const successEntry: AuditEntry = {
      ...entry,
      status: 'success',
      duration,
      stdout_length: result.stdout?.length ?? 0,
      checkpointId
    };
    writeAudit(successEntry);

    logger.debug('Audit: command completed', { cmd, duration, context });

    return result.stdout.trim();
  } catch (err) {
    const duration = Date.now() - startTime;

    // Log failure
    const errorEntry: AuditEntry = {
      ...entry,
      status: 'error',
      duration,
      error: err instanceof Error ? err.message : 'Unknown',
      ...(err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code !== undefined ? { code: (err as NodeJS.ErrnoException).code! } : {}),
      ...(err instanceof Error && 'signal' in err && (err as NodeJS.ErrnoException & { signal?: string }).signal !== undefined ? { signal: (err as NodeJS.ErrnoException & { signal?: string }).signal! } : {}),
      checkpointId
    };
    writeAudit(errorEntry);

    logger.error('Audit: command failed', {
      cmd,
      error: err instanceof Error ? err.message : 'Unknown',
      duration,
      context
    });

    throw err;
  }
}

/**
 * Get today's audit log path
 * @returns Audit file path
 */
export function getAuditFilePath(): string {
  return getAuditFile();
}

/**
 * Read audit log entries for a specific date
 * @param date - Date string (YYYY-MM-DD)
 * @returns Array of audit entries
 */
export function readAuditLog(date: string = new Date().toISOString().slice(0, 10)): AuditEntry[] {
  const filePath = join(getAuditDir(), `audit-${date}.jsonl`);

  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, 'utf-8');
  return content.trim().split('\n').map(line => JSON.parse(line) as AuditEntry);
}

/**
 * Search audit log for specific command
 * @param cmdFilter - Command to filter by
 * @param date - Date string (YYYY-MM-DD)
 * @returns Matching entries
 */
export function searchAuditLog(cmdFilter: string, date?: string): AuditEntry[] {
  const entries = readAuditLog(date);
  return entries.filter(entry => entry.cmd === cmdFilter);
}

// ─── Default Export ─────────────────────────────────────────────────────────

export default {
  auditExec,
  getAuditFilePath,
  readAuditLog,
  searchAuditLog
};
