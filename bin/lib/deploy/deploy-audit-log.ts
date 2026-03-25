/**
 * Deploy Audit Log — Writes deploy audit logs
 * Logs to temp directory (console-only fallback)
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Deploy audit log entry
 */
export interface DeployAuditEntry {
  /** Timestamp of the deploy */
  timestamp: string;
  /** Platform name */
  platform?: string;
  /** Environment name */
  env?: string;
  /** Deployment status */
  status?: string;
  /** Deployment output */
  output?: string;
  /** Any additional properties */
  [key: string]: unknown;
}

export class DeployAuditLog {
  private cwd: string;
  private logsDir: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    // Use temp directory instead of .planning/logs
    this.logsDir = path.join(process.env.TEMP || process.env.TMPDIR || '/tmp', 'ez-agents-deploy');
    // Ensure temp dir exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Write deploy audit log
   * @param deployDetails - Deploy details to log
   * @returns Path to written log
   */
  writeAuditLog(deployDetails: Partial<DeployAuditEntry>): string {
    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `deploy-${timestamp}.json`;
    const logPath = path.join(this.logsDir, filename);

    const logEntry: DeployAuditEntry = {
      timestamp: new Date().toISOString(),
      ...deployDetails
    };

    fs.writeFileSync(logPath, JSON.stringify(logEntry, null, 2), 'utf8');
    return logPath;
  }

  /**
   * Read deploy audit log
   * @param filename - Log filename
   * @returns Log entry or null if not found
   */
  readAuditLog(filename: string): DeployAuditEntry | null {
    const logPath = path.join(this.logsDir, filename);
    if (!fs.existsSync(logPath)) return null;
    return JSON.parse(fs.readFileSync(logPath, 'utf8'));
  }

  /**
   * List all deploy audit logs
   * @returns Array of log filenames
   */
  listAuditLogs(): string[] {
    if (!fs.existsSync(this.logsDir)) return [];
    return fs.readdirSync(this.logsDir).filter(f => f.startsWith('deploy-') && f.endsWith('.json'));
  }
}

/**
 * Write deploy audit log
 * @param deployDetails - Deploy details
 * @param cwd - Working directory
 * @returns Path to written log
 */
export function writeAuditLog(deployDetails: Partial<DeployAuditEntry>, cwd?: string): string {
  const logger = new DeployAuditLog(cwd);
  return logger.writeAuditLog(deployDetails);
}
