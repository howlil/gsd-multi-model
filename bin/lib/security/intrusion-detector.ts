/**
 * Intrusion Detector — Real-time intrusion detection system
 *
 * SEC-11: Intrusion detection
 *
 * Monitors system activity for signs of unauthorized access or malicious behavior.
 * Features:
 * - Signature-based detection
 * - Behavioral analysis
 * - Real-time alerting
 * - Attack pattern recognition
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { defaultLogger as logger } from '../logger/index.js';
import { SecurityAuditLog, logSecurityEvent, type AuditEvent } from './security-audit-log.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const INTRUSION_DIR = join(process.cwd(), '.planning', 'security', 'intrusion');
const ALERTS_FILE = join(INTRUSION_DIR, 'alerts.jsonl');
const PATTERNS_FILE = join(INTRUSION_DIR, 'patterns.json');
const BLOCKED_IPS_FILE = join(INTRUSION_DIR, 'blocked-ips.json');

// ─── Type Definitions ────────────────────────────────────────────────────────

export type IntrusionType =
  | 'brute_force'
  | 'sql_injection'
  | 'xss'
  | 'path_traversal'
  | 'command_injection'
  | 'unauthorized_access'
  | 'privilege_escalation'
  | 'data_exfiltration'
  | 'dos_attack'
  | 'malware'
  | 'suspicious_activity';

export type AttackVector =
  | 'network'
  | 'application'
  | 'system'
  | 'credential'
  | 'data';

export interface AttackSignature {
  id: string;
  name: string;
  description: string;
  type: IntrusionType;
  vector: AttackVector;
  patterns: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  falsePositiveRate: number; // 0-1
  mitigation: string[];
}

export interface IntrusionAlert {
  id: string;
  timestamp: string;
  type: IntrusionType;
  vector: AttackVector;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: {
    ip?: string;
    user?: string;
    agent?: string;
    endpoint?: string;
  };
  target: {
    resource: string;
    action: string;
    data?: string;
  };
  evidence: {
    signature?: string;
    pattern?: string;
    payload?: string;
    requestHeaders?: Record<string, string>;
    requestBody?: string;
  };
  confidence: number;
  status: 'new' | 'investigating' | 'confirmed' | 'false_positive' | 'mitigated';
  response: {
    automated: boolean;
    actions: string[];
    blocked: boolean;
  };
}

export interface IntrusionStats {
  period: {
    start: string;
    end: string;
  };
  totalAlerts: number;
  byType: Record<IntrusionType, number>;
  bySeverity: Record<'low' | 'medium' | 'high' | 'critical', number>;
  byVector: Record<AttackVector, number>;
  blockedAttacks: number;
  falsePositives: number;
  averageConfidence: number;
  topSources: Array<{ source: string; count: number }>;
  topTargets: Array<{ target: string; count: number }>;
}

export interface IntrusionDetectionConfig {
  enableSignatureDetection: boolean;
  enableBehavioralDetection: boolean;
  enableRateLimiting: boolean;
  rateLimitWindow: number; // milliseconds
  rateLimitThreshold: number; // requests per window
  autoBlock: boolean;
  blockDuration: number; // milliseconds
  alertThreshold: number; // confidence threshold for alerting
  signatures: AttackSignature[];
}

// ─── Attack Signatures Database ──────────────────────────────────────────────

const DEFAULT_SIGNATURES: AttackSignature[] = [
  // Brute Force
  {
    id: 'SIG-001',
    name: 'Brute Force Login',
    description: 'Multiple failed authentication attempts from same source',
    type: 'brute_force',
    vector: 'credential',
    patterns: [
      'failed_login.*threshold',
      'authentication_failure.*repeated',
      'invalid_credentials.*multiple'
    ],
    severity: 'high',
    confidence: 0.85,
    falsePositiveRate: 0.05,
    mitigation: ['Block source IP', 'Enable CAPTCHA', 'Implement account lockout']
  },
  // SQL Injection
  {
    id: 'SIG-002',
    name: 'SQL Injection Attempt',
    description: 'SQL injection patterns in input',
    type: 'sql_injection',
    vector: 'application',
    patterns: [
      "['\"]?\\s*(OR|AND)\\s*['\"]?\\s*[0-9]+\\s*['\"]?\\s*=\\s*['\"]?\\s*[0-9]+",
      "UNION\\s+(ALL\\s+)?SELECT",
      "--\\s*$",
      ";\\s*DROP\\s+TABLE",
      "';\\s*--"
    ],
    severity: 'critical',
    confidence: 0.9,
    falsePositiveRate: 0.02,
    mitigation: ['Use parameterized queries', 'Input validation', 'WAF rules']
  },
  // XSS
  {
    id: 'SIG-003',
    name: 'Cross-Site Scripting',
    description: 'XSS attack patterns in input',
    type: 'xss',
    vector: 'application',
    patterns: [
      '<script[^>]*>',
      'javascript:',
      'on\\w+\\s*=',
      '<iframe[^>]*>',
      '<img[^>]*onerror'
    ],
    severity: 'high',
    confidence: 0.88,
    falsePositiveRate: 0.03,
    mitigation: ['Output encoding', 'Content Security Policy', 'Input sanitization']
  },
  // Path Traversal
  {
    id: 'SIG-004',
    name: 'Path Traversal Attack',
    description: 'Directory traversal attempt',
    type: 'path_traversal',
    vector: 'application',
    patterns: [
      '\\.\\./\\.\\.',
      '\\.\\.\\\\\\.\\.\\\\',
      '%2e%2e%2f',
      '%252e%252e%252f',
      '/etc/passwd',
      '/etc/shadow'
    ],
    severity: 'high',
    confidence: 0.92,
    falsePositiveRate: 0.01,
    mitigation: ['Input validation', 'Chroot jail', 'File access controls']
  },
  // Command Injection
  {
    id: 'SIG-005',
    name: 'Command Injection',
    description: 'OS command injection attempt',
    type: 'command_injection',
    vector: 'application',
    patterns: [
      ';\\s*\\w+',
      '\\|\\s*\\w+',
      '`[^`]+`',
      '\\$\\([^)]+\\)',
      '&&\\s*\\w+',
      '\\|\\|\\s*\\w+'
    ],
    severity: 'critical',
    confidence: 0.87,
    falsePositiveRate: 0.04,
    mitigation: ['Input validation', 'Avoid shell commands', 'Use safe APIs']
  },
  // Unauthorized Access
  {
    id: 'SIG-006',
    name: 'Unauthorized Access Attempt',
    description: 'Access to restricted resource without authorization',
    type: 'unauthorized_access',
    vector: 'application',
    patterns: [
      'access_denied.*admin',
      'permission_denied.*restricted',
      'unauthorized.*resource'
    ],
    severity: 'high',
    confidence: 0.8,
    falsePositiveRate: 0.1,
    mitigation: ['Access control review', 'Authentication enforcement', 'Audit logging']
  },
  // Privilege Escalation
  {
    id: 'SIG-007',
    name: 'Privilege Escalation Attempt',
    description: 'Attempt to gain elevated privileges',
    type: 'privilege_escalation',
    vector: 'system',
    patterns: [
      'sudo.*failure',
      'setuid.*unauthorized',
      'privilege.*escalation',
      'root.*access.*denied'
    ],
    severity: 'critical',
    confidence: 0.85,
    falsePositiveRate: 0.05,
    mitigation: ['Principle of least privilege', 'Regular access reviews', 'Monitoring']
  },
  // Data Exfiltration
  {
    id: 'SIG-008',
    name: 'Data Exfiltration Attempt',
    description: 'Unusual data transfer patterns',
    type: 'data_exfiltration',
    vector: 'data',
    patterns: [
      'large_data_transfer.*external',
      'bulk_export.*unauthorized',
      'data_download.*anomalous'
    ],
    severity: 'critical',
    confidence: 0.75,
    falsePositiveRate: 0.15,
    mitigation: ['DLP controls', 'Data access monitoring', 'Egress filtering']
  },
  // DoS Attack
  {
    id: 'SIG-009',
    name: 'Denial of Service Attack',
    description: 'High volume of requests from single source',
    type: 'dos_attack',
    vector: 'network',
    patterns: [
      'request_rate.*threshold_exceeded',
      'connection_flood',
      'resource_exhaustion'
    ],
    severity: 'critical',
    confidence: 0.82,
    falsePositiveRate: 0.08,
    mitigation: ['Rate limiting', 'DDoS protection', 'Load balancing']
  },
  // Suspicious Activity
  {
    id: 'SIG-010',
    name: 'Suspicious Activity',
    description: 'Anomalous behavior patterns',
    type: 'suspicious_activity',
    vector: 'system',
    patterns: [
      'unusual_time_access',
      'geographic_anomaly',
      'behavior_deviation'
    ],
    severity: 'medium',
    confidence: 0.6,
    falsePositiveRate: 0.2,
    mitigation: ['User verification', 'Behavior analysis', 'Additional authentication']
  }
];

// ─── Intrusion Detector ──────────────────────────────────────────────────────

export class IntrusionDetector {
  private config: IntrusionDetectionConfig;
  private alerts: IntrusionAlert[] = [];
  private blockedIPs: Map<string, { until: number; reason: string }> = new Map();
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private auditLog: SecurityAuditLog;

  constructor(config?: Partial<IntrusionDetectionConfig>) {
    this.config = {
      enableSignatureDetection: true,
      enableBehavioralDetection: true,
      enableRateLimiting: true,
      rateLimitWindow: 60000, // 1 minute
      rateLimitThreshold: 100, // 100 requests per minute
      autoBlock: true,
      blockDuration: 3600000, // 1 hour
      alertThreshold: 0.7,
      signatures: DEFAULT_SIGNATURES,
      ...config
    };

    this.auditLog = new SecurityAuditLog();
    this.initIntrusionDetector();
  }

  private initIntrusionDetector(): void {
    try {
      if (!existsSync(INTRUSION_DIR)) {
        mkdirSync(INTRUSION_DIR, { recursive: true });
      }

      this.loadPatterns();
      this.loadBlockedIPs();
    } catch (err) {
      logger.warn('Failed to initialize intrusion detector', { error: (err as Error).message });
    }
  }

  private loadPatterns(): void {
    try {
      if (existsSync(PATTERNS_FILE)) {
        const data = JSON.parse(readFileSync(PATTERNS_FILE, 'utf8'));
        this.config.signatures = data.signatures || DEFAULT_SIGNATURES;
      } else {
        this.savePatterns();
      }
    } catch (err) {
      logger.warn('Failed to load patterns', { error: (err as Error).message });
    }
  }

  private savePatterns(): void {
    try {
      writeFileSync(PATTERNS_FILE, JSON.stringify({
        signatures: this.config.signatures,
        lastUpdated: new Date().toISOString()
      }, null, 2), 'utf8');
    } catch (err) {
      logger.warn('Failed to save patterns', { error: (err as Error).message });
    }
  }

  private loadBlockedIPs(): void {
    try {
      if (existsSync(BLOCKED_IPS_FILE)) {
        const data = JSON.parse(readFileSync(BLOCKED_IPS_FILE, 'utf8'));
        this.blockedIPs = new Map(Object.entries(data));
        // Clean expired blocks
        const now = Date.now();
        this.blockedIPs.forEach((value, key) => {
          if (value.until < now) {
            this.blockedIPs.delete(key);
          }
        });
        this.saveBlockedIPs();
      }
    } catch (err) {
      logger.warn('Failed to load blocked IPs', { error: (err as Error).message });
    }
  }

  private saveBlockedIPs(): void {
    try {
      const data: Record<string, { until: number; reason: string }> = {};
      this.blockedIPs.forEach((value, key) => {
        data[key] = value;
      });
      writeFileSync(BLOCKED_IPS_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      logger.warn('Failed to save blocked IPs', { error: (err as Error).message });
    }
  }

  private logAlert(alert: IntrusionAlert): void {
    try {
      const line = JSON.stringify(alert) + '\n';
      appendFileSync(ALERTS_FILE, line, 'utf8');

      // Keep file size manageable - keep last 1000 alerts
      const content = readFileSync(ALERTS_FILE, 'utf8');
      const lines = content.split('\n').filter(l => l);
      if (lines.length > 1000) {
        writeFileSync(ALERTS_FILE, lines.slice(-1000).join('\n') + '\n', 'utf8');
      }
    } catch (err) {
      logger.warn('Failed to log intrusion alert', { error: (err as Error).message });
    }
  }

  /**
   * Check if IP is blocked
   */
  isBlocked(ip: string): boolean {
    const block = this.blockedIPs.get(ip);
    if (!block) return false;

    if (block.until < Date.now()) {
      this.blockedIPs.delete(ip);
      this.saveBlockedIPs();
      return false;
    }

    return true;
  }

  /**
   * Block an IP address
   */
  blockIP(ip: string, reason: string, duration?: number): void {
    const blockDuration = duration || this.config.blockDuration;
    this.blockedIPs.set(ip, {
      until: Date.now() + blockDuration,
      reason
    });
    this.saveBlockedIPs();

    logger.warn('IP blocked', { ip, reason, duration: blockDuration });

    // Log to audit
    this.auditLog.log({
      eventType: 'security_scan',
      action: 'deny',
      severity: 'high',
      actor: { type: 'system', id: 'intrusion-detector' },
      resource: { type: 'network', id: ip },
      outcome: { status: 'success', reason }
    });
  }

  /**
   * Unblock an IP address
   */
  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    this.saveBlockedIPs();
    logger.info('IP unblocked', { ip });
  }

  /**
   * Check rate limit for a source
   */
  checkRateLimit(source: string): { allowed: boolean; remaining: number; resetTime: number } {
    if (!this.config.enableRateLimiting) {
      return { allowed: true, remaining: this.config.rateLimitThreshold, resetTime: 0 };
    }

    const now = Date.now();
    let record = this.requestCounts.get(source);

    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + this.config.rateLimitWindow
      };
    }

    record.count++;
    this.requestCounts.set(source, record);

    const remaining = Math.max(0, this.config.rateLimitThreshold - record.count);
    const allowed = record.count <= this.config.rateLimitThreshold;

    if (!allowed && this.config.autoBlock) {
      this.blockIP(source, 'Rate limit exceeded');
    }

    return { allowed, remaining, resetTime: record.resetTime };
  }

  /**
   * Analyze request for intrusion patterns
   */
  analyze(request: {
    sourceIP?: string;
    user?: string;
    endpoint?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timestamp?: string;
  }): IntrusionAlert | null {
    // Check if source is blocked
    if (request.sourceIP && this.isBlocked(request.sourceIP)) {
      logger.warn('Blocked source attempted access', { ip: request.sourceIP });
      return null; // Already blocked
    }

    // Check rate limit
    if (request.sourceIP) {
      const rateLimit = this.checkRateLimit(request.sourceIP);
      if (!rateLimit.allowed) {
        const alert = this.createAlert('dos_attack', 'network', 'critical', {
          ip: request.sourceIP,
          user: request.user,
          endpoint: request.endpoint
        }, {
          resource: 'rate_limiter',
          action: 'request'
        }, {
          pattern: 'request_rate.*threshold_exceeded'
        });
        return alert;
      }
    }

    // Signature-based detection
    if (this.config.enableSignatureDetection) {
      const signatureMatch = this.detectSignatures(request);
      if (signatureMatch) {
        return signatureMatch;
      }
    }

    // Behavioral detection
    if (this.config.enableBehavioralDetection) {
      const behavioralAlert = this.detectBehavioralAnomalies(request);
      if (behavioralAlert) {
        return behavioralAlert;
      }
    }

    return null;
  }

  /**
   * Detect signature matches
   */
  private detectSignatures(request: {
    sourceIP?: string;
    user?: string;
    endpoint?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }): IntrusionAlert | null {
    const contentToCheck = [
      request.body || '',
      request.endpoint || '',
      JSON.stringify(request.headers || {})
    ].join(' ');

    for (const signature of this.config.signatures) {
      for (const pattern of signature.patterns) {
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(contentToCheck)) {
            return this.createAlert(signature.type, signature.vector, signature.severity, {
              ip: request.sourceIP,
              user: request.user,
              endpoint: request.endpoint
            }, {
              resource: request.endpoint || 'unknown',
              action: request.method || 'request',
              data: contentToCheck.substring(0, 500)
            }, {
              signature: signature.id,
              pattern,
              payload: request.body
            }, signature.confidence);
          }
        } catch (err) {
          logger.debug('Invalid regex pattern', { pattern, error: (err as Error).message });
        }
      }
    }

    return null;
  }

  /**
   * Detect behavioral anomalies
   */
  private detectBehavioralAnomalies(request: {
    sourceIP?: string;
    user?: string;
    endpoint?: string;
  }): IntrusionAlert | null {
    // Implement behavioral analysis logic here
    // This is a simplified version - in production, this would use ML models

    // Check for unusual access patterns
    if (request.endpoint && request.endpoint.includes('/admin') && !request.user) {
      return this.createAlert('unauthorized_access', 'application', 'medium', {
        ip: request.sourceIP,
        endpoint: request.endpoint
      }, {
        resource: request.endpoint,
        action: 'access'
      }, {
        pattern: 'unauthenticated_admin_access'
      }, 0.7);
    }

    return null;
  }

  /**
   * Create an intrusion alert
   */
  private createAlert(
    type: IntrusionType,
    vector: AttackVector,
    severity: 'low' | 'medium' | 'high' | 'critical',
    source: { ip?: string; user?: string; endpoint?: string },
    target: { resource: string; action: string; data?: string },
    evidence: { signature?: string; pattern?: string; payload?: string },
    confidence?: number
  ): IntrusionAlert {
    const alert: IntrusionAlert = {
      id: `intrusion-${Date.now()}-${type}`,
      timestamp: new Date().toISOString(),
      type,
      vector,
      severity,
      source: {
        ip: source.ip,
        user: source.user,
        agent: 'intrusion-detector',
        endpoint: source.endpoint
      },
      target,
      evidence,
      confidence: confidence || 0.8,
      status: 'new',
      response: {
        automated: false,
        actions: [],
        blocked: false
      }
    };

    // Auto-respond based on severity
    if (severity === 'critical' && this.config.autoBlock && source.ip) {
      this.blockIP(source.ip, `Intrusion detected: ${type}`);
      alert.response.automated = true;
      alert.response.actions.push('blocked_source');
      alert.response.blocked = true;
    }

    // Log alert
    this.alerts.push(alert);
    this.logAlert(alert);

    // Log to audit
    this.auditLog.log({
      eventType: 'security_scan',
      action: 'deny',
      severity,
      actor: { type: 'system', id: 'intrusion-detector' },
      resource: { type: 'security', id: type },
      outcome: { status: 'failure', reason: `Intrusion detected: ${type}` }
    });

    logger.warn('Intrusion detected', {
      type,
      severity,
      source: source.ip || source.user,
      target: target.resource
    });

    return alert;
  }

  /**
   * Get recent alerts
   */
  getAlerts(options?: {
    type?: IntrusionType;
    severity?: IntrusionAlert['severity'];
    status?: IntrusionAlert['status'];
    limit?: number;
    since?: Date;
  }): IntrusionAlert[] {
    let alerts = [...this.alerts];

    if (options?.type) {
      alerts = alerts.filter(a => a.type === options.type);
    }
    if (options?.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }
    if (options?.status) {
      alerts = alerts.filter(a => a.status === options.status);
    }
    if (options?.since) {
      alerts = alerts.filter(a => new Date(a.timestamp) >= options.since!);
    }

    // Sort by timestamp descending
    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (options?.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  /**
   * Update alert status
   */
  updateAlertStatus(alertId: string, status: IntrusionAlert['status']): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = status;
      return true;
    }
    return false;
  }

  /**
   * Get intrusion statistics
   */
  getStats(period?: { start?: Date; end?: Date }): IntrusionStats {
    let alerts = [...this.alerts];

    if (period?.start) {
      alerts = alerts.filter(a => new Date(a.timestamp) >= period.start!);
    }
    if (period?.end) {
      alerts = alerts.filter(a => new Date(a.timestamp) <= period.end!);
    }

    const stats: IntrusionStats = {
      period: {
        start: period?.start?.toISOString() || alerts[0]?.timestamp || '',
        end: period?.end?.toISOString() || alerts[alerts.length - 1]?.timestamp || ''
      },
      totalAlerts: alerts.length,
      byType: {} as Record<IntrusionType, number>,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byVector: {} as Record<AttackVector, number>,
      blockedAttacks: 0,
      falsePositives: 0,
      averageConfidence: 0,
      topSources: [],
      topTargets: []
    };

    const sourceCounts = new Map<string, number>();
    const targetCounts = new Map<string, number>();
    let totalConfidence = 0;

    alerts.forEach(alert => {
      // Count by type
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;

      // Count by severity
      stats.bySeverity[alert.severity]++;

      // Count by vector
      stats.byVector[alert.vector] = (stats.byVector[alert.vector] || 0) + 1;

      // Count blocked and false positives
      if (alert.response.blocked) stats.blockedAttacks++;
      if (alert.status === 'false_positive') stats.falsePositives++;

      // Track sources and targets
      const sourceKey = alert.source.ip || alert.source.user || 'unknown';
      sourceCounts.set(sourceKey, (sourceCounts.get(sourceKey) || 0) + 1);

      targetCounts.set(alert.target.resource, (targetCounts.get(alert.target.resource) || 0) + 1);

      totalConfidence += alert.confidence;
    });

    stats.averageConfidence = alerts.length > 0 ? totalConfidence / alerts.length : 0;

    // Top sources
    stats.topSources = Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([source, count]) => ({ source, count }));

    // Top targets
    stats.topTargets = Array.from(targetCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([target, count]) => ({ target, count }));

    return stats;
  }

  /**
   * Add custom signature
   */
  addSignature(signature: AttackSignature): void {
    this.config.signatures.push(signature);
    this.savePatterns();
    logger.info('Custom signature added', { signatureId: signature.id, name: signature.name });
  }

  /**
   * Remove signature
   */
  removeSignature(signatureId: string): boolean {
    const index = this.config.signatures.findIndex(s => s.id === signatureId);
    if (index !== -1) {
      this.config.signatures.splice(index, 1);
      this.savePatterns();
      return true;
    }
    return false;
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
    logger.info('All intrusion alerts cleared');
  }
}

// ─── Default Instance ────────────────────────────────────────────────────────

const defaultDetector = new IntrusionDetector();

export function analyzeRequest(request: {
  sourceIP?: string;
  user?: string;
  endpoint?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): IntrusionAlert | null {
  return defaultDetector.analyze(request);
}

export function isIntrusionBlocked(ip: string): boolean {
  return defaultDetector.isBlocked(ip);
}

export function blockIntrusionSource(ip: string, reason: string, duration?: number): void {
  defaultDetector.blockIP(ip, reason, duration);
}

export function getIntrusionAlerts(options?: {
  type?: IntrusionType;
  severity?: IntrusionAlert['severity'];
  status?: IntrusionAlert['status'];
  limit?: number;
  since?: Date;
}): IntrusionAlert[] {
  return defaultDetector.getAlerts(options);
}

export function getIntrusionStats(period?: { start?: Date; end?: Date }): IntrusionStats {
  return defaultDetector.getStats(period);
}

// ─── Default Export ─────────────────────────────────────────────────────────

export default IntrusionDetector;
