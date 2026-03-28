/**
 * Security Audit Log — Comprehensive security audit logging
 *
 * SEC-09: Security audit logging
 * 
 * Provides immutable audit trail for all security-relevant operations.
 * Features:
 * - Tamper-evident logging with hash chaining
 * - Structured audit events
 * - File-based persistence with rotation
 * - Query and filter capabilities
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, appendFileSync, statSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { defaultLogger as logger } from '../logger/index.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const AUDIT_DIR = join(process.cwd(), '.planning', 'security', 'audit');
const AUDIT_FILE = join(AUDIT_DIR, 'audit-log.jsonl');
const AUDIT_INDEX_FILE = join(AUDIT_DIR, 'audit-index.json');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES = 30; // 30 days retention

// ─── Type Definitions ────────────────────────────────────────────────────────

export type AuditEventType =
  | 'authentication'
  | 'authorization'
  | 'access_control'
  | 'data_access'
  | 'configuration_change'
  | 'security_scan'
  | 'incident_response'
  | 'compliance_check'
  | 'vault_operation'
  | 'file_operation'
  | 'system_event';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'execute'
  | 'grant'
  | 'deny'
  | 'success'
  | 'failure';

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  action: AuditAction;
  severity: AuditSeverity;
  actor: {
    type: 'user' | 'agent' | 'system';
    id: string;
    context?: Record<string, unknown>;
  };
  resource: {
    type: string;
    id: string;
    path?: string;
  };
  outcome: {
    status: 'success' | 'failure' | 'partial';
    reason?: string;
    errorCode?: string;
  };
  metadata: {
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    correlationId?: string;
    custom?: Record<string, unknown>;
  };
  previousHash: string;
  currentHash: string;
}

export interface AuditQueryOptions {
  startTime?: Date;
  endTime?: Date;
  eventType?: AuditEventType;
  severity?: AuditSeverity;
  actorId?: string;
  resourceId?: string;
  outcome?: 'success' | 'failure';
  limit?: number;
}

export interface AuditStats {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  eventsByOutcome: Record<'success' | 'failure' | 'partial', number>;
  uniqueActors: number;
  uniqueResources: number;
  timeRange: {
    earliest: string;
    latest: string;
  };
}

// ─── Audit Log Manager ───────────────────────────────────────────────────────

export class SecurityAuditLog {
  private previousHash: string = '0';
  private eventCounter: number = 0;
  private index: Map<string, number> = new Map(); // eventId -> line number

  constructor() {
    this.initAuditLog();
    this.loadIndex();
  }

  /**
   * Initialize audit log directory and file
   */
  private initAuditLog(): void {
    try {
      if (!existsSync(AUDIT_DIR)) {
        mkdirSync(AUDIT_DIR, { recursive: true });
      }

      if (!existsSync(AUDIT_FILE)) {
        writeFileSync(AUDIT_FILE, '', 'utf8');
      }

      this.rotateIfNeeded();
    } catch (err) {
      logger.error('Failed to initialize audit log', { error: (err as Error).message });
    }
  }

  /**
   * Load or rebuild the event index
   */
  private loadIndex(): void {
    try {
      if (existsSync(AUDIT_INDEX_FILE)) {
        const indexData = JSON.parse(readFileSync(AUDIT_INDEX_FILE, 'utf8'));
        this.index = new Map(Object.entries(indexData));
        this.eventCounter = this.index.size;

        // Get last hash
        const lines = readFileSync(AUDIT_FILE, 'utf8').trim().split('\n').filter(l => l);
        if (lines.length > 0) {
          const lastEvent = JSON.parse(lines[lines.length - 1]);
          this.previousHash = lastEvent.currentHash;
        }
      } else {
        this.rebuildIndex();
      }
    } catch (err) {
      logger.warn('Failed to load audit index, rebuilding', { error: (err as Error).message });
      this.rebuildIndex();
    }
  }

  /**
   * Rebuild index from audit log file
   */
  private rebuildIndex(): void {
    try {
      this.index.clear();
      this.eventCounter = 0;
      this.previousHash = '0';

      if (!existsSync(AUDIT_FILE)) {
        this.saveIndex();
        return;
      }

      const lines = readFileSync(AUDIT_FILE, 'utf8').trim().split('\n').filter(l => l);
      lines.forEach((line, idx) => {
        try {
          const event = JSON.parse(line);
          this.index.set(event.id, idx);
          this.eventCounter++;
          this.previousHash = event.currentHash;
        } catch {
          // Skip malformed lines
        }
      });

      this.saveIndex();
    } catch (err) {
      logger.error('Failed to rebuild audit index', { error: (err as Error).message });
    }
  }

  /**
   * Save index to file
   */
  private saveIndex(): void {
    try {
      const indexObj: Record<string, number> = {};
      this.index.forEach((value, key) => {
        indexObj[key] = value;
      });
      writeFileSync(AUDIT_INDEX_FILE, JSON.stringify(indexObj, null, 2), 'utf8');
    } catch (err) {
      logger.warn('Failed to save audit index', { error: (err as Error).message });
    }
  }

  /**
   * Rotate audit log if needed
   */
  private rotateIfNeeded(): void {
    try {
      const stat = statSync(AUDIT_FILE);
      if (stat.size > MAX_FILE_SIZE) {
        this.rotate();
      }
    } catch {
      // File doesn't exist yet
    }
  }

  /**
   * Rotate audit log files
   */
  private rotate(): void {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const rotatedFile = join(AUDIT_DIR, `audit-log-${timestamp}.jsonl`);

      // Rename current file
      writeFileSync(rotatedFile, readFileSync(AUDIT_FILE), 'utf8');
      writeFileSync(AUDIT_FILE, '', 'utf8');

      // Clean old files
      const files = existsSync(AUDIT_DIR)
        ? readFileSync(AUDIT_DIR, { withFileTypes: true })
            .filter(d => d.isFile() && d.name.startsWith('audit-log-'))
            .map(d => d.name)
            .sort()
        : [];

      while (files.length > MAX_FILES) {
        const oldest = files.shift();
        if (oldest) {
          const oldestPath = join(AUDIT_DIR, oldest);
          writeFileSync(oldestPath, '', 'utf8'); // Clear instead of delete for audit trail
        }
      }

      // Reset index for new file
      this.index.clear();
      this.eventCounter = 0;
      this.previousHash = '0';
      this.saveIndex();

      logger.info('Audit log rotated', { file: rotatedFile });
    } catch (err) {
      logger.error('Failed to rotate audit log', { error: (err as Error).message });
    }
  }

  /**
   * Compute hash for event chain
   */
  private computeHash(event: Omit<AuditEvent, 'currentHash'>): string {
    const content = JSON.stringify({
      ...event,
      previousHash: this.previousHash
    });
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Log a security audit event
   */
  async log(event: Omit<AuditEvent, 'id' | 'timestamp' | 'previousHash' | 'currentHash'>): Promise<AuditEvent> {
    const id = `audit-${Date.now()}-${this.eventCounter}`;
    const timestamp = new Date().toISOString();

    const fullEvent: AuditEvent = {
      ...event,
      id,
      timestamp,
      previousHash: this.previousHash,
      currentHash: '' // Will be computed
    };

    fullEvent.currentHash = this.computeHash(fullEvent);

    try {
      this.rotateIfNeeded();

      const line = JSON.stringify(fullEvent) + '\n';
      appendFileSync(AUDIT_FILE, line, 'utf8');

      this.index.set(id, this.eventCounter);
      this.eventCounter++;
      this.previousHash = fullEvent.currentHash;
      this.saveIndex();

      logger.debug('Audit event logged', {
        eventId: id,
        eventType: event.eventType,
        action: event.action,
        severity: event.severity
      });

      return fullEvent;
    } catch (err) {
      logger.error('Failed to log audit event', { error: (err as Error).message, eventId: id });
      throw err;
    }
  }

  /**
   * Query audit log events
   */
  query(options: AuditQueryOptions = {}): AuditEvent[] {
    try {
      const lines = readFileSync(AUDIT_FILE, 'utf8').trim().split('\n').filter(l => l);
      const events: AuditEvent[] = [];

      for (const line of lines) {
        try {
          const event = JSON.parse(line);

          // Apply filters
          if (options.startTime && new Date(event.timestamp) < options.startTime) continue;
          if (options.endTime && new Date(event.timestamp) > options.endTime) continue;
          if (options.eventType && event.eventType !== options.eventType) continue;
          if (options.severity && event.severity !== options.severity) continue;
          if (options.actorId && event.actor.id !== options.actorId) continue;
          if (options.resourceId && event.resource.id !== options.resourceId) continue;
          if (options.outcome && event.outcome.status !== options.outcome) continue;

          events.push(event);

          if (options.limit && events.length >= options.limit) break;
        } catch {
          // Skip malformed lines
        }
      }

      return options.limit ? events.slice(0, options.limit) : events;
    } catch (err) {
      logger.error('Failed to query audit log', { error: (err as Error).message });
      return [];
    }
  }

  /**
   * Get event by ID
   */
  getEvent(eventId: string): AuditEvent | null {
    try {
      const lineNum = this.index.get(eventId);
      if (lineNum === undefined) return null;

      const lines = readFileSync(AUDIT_FILE, 'utf8').trim().split('\n');
      if (lineNum >= lines.length) return null;

      return JSON.parse(lines[lineNum]);
    } catch (err) {
      logger.warn('Failed to get audit event', { eventId, error: (err as Error).message });
      return null;
    }
  }

  /**
   * Verify hash chain integrity
   */
  verifyIntegrity(): { valid: boolean; invalidFrom?: string; error?: string } {
    try {
      const lines = readFileSync(AUDIT_FILE, 'utf8').trim().split('\n').filter(l => l);
      let expectedHash = '0';

      for (const line of lines) {
        try {
          const event = JSON.parse(line);

          if (event.previousHash !== expectedHash) {
            return {
              valid: false,
              invalidFrom: event.id,
              error: `Hash chain broken at ${event.id}`
            };
          }

          // Verify current hash
          const computedHash = createHash('sha256')
            .update(JSON.stringify({ ...event, previousHash: event.previousHash }))
            .digest('hex');

          if (event.currentHash !== computedHash) {
            return {
              valid: false,
              invalidFrom: event.id,
              error: `Event hash mismatch at ${event.id}`
            };
          }

          expectedHash = event.currentHash;
        } catch (err) {
          return {
            valid: false,
            error: `Failed to parse event: ${(err as Error).message}`
          };
        }
      }

      return { valid: true };
    } catch (err) {
      return {
        valid: false,
        error: `Failed to verify integrity: ${(err as Error).message}`
      };
    }
  }

  /**
   * Get audit statistics
   */
  getStats(timeRange?: { start?: Date; end?: Date }): AuditStats {
    const events = this.query(timeRange ? {
      startTime: timeRange.start,
      endTime: timeRange.end
    } : {});

    const stats: AuditStats = {
      totalEvents: events.length,
      eventsByType: {} as Record<AuditEventType, number>,
      eventsBySeverity: {} as Record<AuditSeverity, number>,
      eventsByOutcome: { success: 0, failure: 0, partial: 0 },
      uniqueActors: 0,
      uniqueResources: 0,
      timeRange: {
        earliest: events[0]?.timestamp || '',
        latest: events[events.length - 1]?.timestamp || ''
      }
    };

    const actors = new Set<string>();
    const resources = new Set<string>();

    for (const event of events) {
      // Count by type
      stats.eventsByType[event.eventType] = (stats.eventsByType[event.eventType] || 0) + 1;

      // Count by severity
      stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;

      // Count by outcome
      stats.eventsByOutcome[event.outcome.status]++;

      // Track unique actors and resources
      actors.add(event.actor.id);
      resources.add(event.resource.id);
    }

    stats.uniqueActors = actors.size;
    stats.uniqueResources = resources.size;

    return stats;
  }

  /**
   * Export audit log for compliance
   */
  export(options: { format: 'json' | 'csv'; startTime?: Date; endTime?: Date }): string {
    const events = this.query({
      startTime: options.startTime,
      endTime: options.endTime
    });

    if (options.format === 'json') {
      return JSON.stringify(events, null, 2);
    }

    // CSV format
    const headers = ['timestamp', 'id', 'eventType', 'action', 'severity', 'actorType', 'actorId', 'resourceType', 'resourceId', 'outcome', 'reason'];
    const rows = events.map(e => [
      e.timestamp,
      e.id,
      e.eventType,
      e.action,
      e.severity,
      e.actor.type,
      e.actor.id,
      e.resource.type,
      e.resource.id,
      e.outcome.status,
      e.outcome.reason || ''
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

// ─── Convenience Functions ───────────────────────────────────────────────────

const defaultAuditLog = new SecurityAuditLog();

export async function logSecurityEvent(
  eventType: AuditEventType,
  action: AuditAction,
  severity: AuditSeverity,
  actor: AuditEvent['actor'],
  resource: AuditEvent['resource'],
  outcome: AuditEvent['outcome'],
  metadata?: AuditEvent['metadata']
): Promise<AuditEvent> {
  return defaultAuditLog.log({
    eventType,
    action,
    severity,
    actor,
    resource,
    outcome,
    metadata: metadata || {}
  });
}

export function getAuditStats(): AuditStats {
  return defaultAuditLog.getStats();
}

export function queryAuditLog(options?: AuditQueryOptions): AuditEvent[] {
  return defaultAuditLog.query(options);
}

export function verifyAuditIntegrity(): { valid: boolean; invalidFrom?: string; error?: string } {
  return defaultAuditLog.verifyIntegrity();
}

// ─── Default Export ─────────────────────────────────────────────────────────

export default SecurityAuditLog;
