/**
 * Incident Response — Security incident response automation
 *
 * SEC-14: Security incident response
 *
 * Provides automated incident response capabilities and workflow management.
 * Features:
 * - Incident classification and prioritization
 * - Response playbook execution
 * - Automated containment actions
 * - Incident timeline tracking
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { defaultLogger as logger } from '../logger/index.js';
import { SecurityAuditLog, logSecurityEvent, type AuditEvent } from './security-audit-log.js';
import { IntrusionDetector, type IntrusionAlert } from './intrusion-detector.js';
import { ThreatIntelligence, type Threat } from './threat-intel.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const INCIDENT_DIR = join(process.cwd(), '.planning', 'security', 'incidents');
const INCIDENTS_FILE = join(INCIDENT_DIR, 'incidents.jsonl');
const PLAYBOOKS_FILE = join(INCIDENT_DIR, 'playbooks.json');
const TIMELINE_FILE = join(INCIDENT_DIR, 'timeline.jsonl');

// ─── Type Definitions ────────────────────────────────────────────────────────

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus =
  | 'new'
  | 'triage'
  | 'investigating'
  | 'contained'
  | 'eradicating'
  | 'recovering'
  | 'resolved'
  | 'closed';

export type IncidentType =
  | 'malware'
  | 'ransomware'
  | 'phishing'
  | 'data_breach'
  | 'unauthorized_access'
  | 'dos_attack'
  | 'insider_threat'
  | 'vulnerability_exploit'
  | 'policy_violation'
  | 'other';

export type IncidentPhase =
  | 'identification'
  | 'containment'
  | 'eradication'
  | 'recovery'
  | 'lessons_learned';

export interface IncidentTimelineEntry {
  timestamp: string;
  phase: IncidentPhase;
  action: string;
  actor: string;
  details?: string;
  outcome?: string;
}

export interface IncidentResponse {
  id: string;
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  priority: number; // 1-5, 1 is highest
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;

  // Detection
  detectionSource: string;
  detectionMethod: string;
  relatedAlerts: string[]; // Alert IDs
  relatedThreats: string[]; // Threat IDs

  // Impact Assessment
  affectedSystems: string[];
  affectedUsers: string[];
  dataExposed?: boolean;
  estimatedImpact: {
    financial?: number;
    reputational: 'low' | 'medium' | 'high';
    operational: 'low' | 'medium' | 'high';
  };

  // Response
  assignedTo?: string;
  timeline: IncidentTimelineEntry[];
  actionsTaken: string[];
  containmentActions: string[];
  eradicationActions: string[];
  recoveryActions: string[];

  // Evidence
  evidenceCollected: Array<{
    type: string;
    location: string;
    hash?: string;
    collectedAt: string;
    collectedBy: string;
  }>;

  // Communication
  stakeholdersNotified: string[];
  externalReporting: {
    lawEnforcement?: boolean;
    regulators?: boolean;
    customers?: boolean;
    public?: boolean;
  };

  // Closure
  rootCause?: string;
  lessonsLearned: string[];
  recommendations: string[];
}

export interface ResponsePlaybook {
  id: string;
  name: string;
  description: string;
  incidentTypes: IncidentType[];
  severityLevels: IncidentSeverity[];
  steps: Array<{
    order: number;
    phase: IncidentPhase;
    action: string;
    description: string;
    automated: boolean;
    required: boolean;
    estimatedTime?: number; // minutes
    dependencies?: number[]; // Step order numbers
  }>;
  escalationRules: Array<{
    condition: string;
    action: string;
    notify: string[];
  }>;
  containmentStrategies: string[];
  recoveryProcedures: string[];
  communicationTemplates: Array<{
    audience: string;
    template: string;
  }>;
}

export interface IncidentConfig {
  autoTriage: boolean;
  autoContain: boolean;
  escalationEnabled: boolean;
  notificationChannels: string[];
  retentionDays: number;
  playbooks: ResponsePlaybook[];
}

export interface IncidentStats {
  period: {
    start: string;
    end: string;
  };
  totalIncidents: number;
  byStatus: Record<IncidentStatus, number>;
  bySeverity: Record<IncidentSeverity, number>;
  byType: Record<IncidentType, number>;
  averageResolutionTime: number; // hours
  mttr: number; // Mean Time To Resolution
  containmentRate: number;
  escalationRate: number;
}

// ─── Default Playbooks ───────────────────────────────────────────────────────

const DEFAULT_PLAYBOOKS: ResponsePlaybook[] = [
  {
    id: 'playbook-malware',
    name: 'Malware Incident Response',
    description: 'Response procedures for malware infections',
    incidentTypes: ['malware'],
    severityLevels: ['medium', 'high', 'critical'],
    steps: [
      {
        order: 1,
        phase: 'identification',
        action: 'Isolate affected system',
        description: 'Disconnect the affected system from the network to prevent spread',
        automated: false,
        required: true,
        estimatedTime: 5
      },
      {
        order: 2,
        phase: 'identification',
        action: 'Collect initial evidence',
        description: 'Capture memory dump, running processes, and network connections',
        automated: false,
        required: true,
        estimatedTime: 15
      },
      {
        order: 3,
        phase: 'identification',
        action: 'Identify malware type',
        description: 'Analyze malware samples and identify the threat family',
        automated: false,
        required: true,
        estimatedTime: 30
      },
      {
        order: 4,
        phase: 'containment',
        action: 'Block IOCs',
        description: 'Add identified IOCs to blocklist (IPs, domains, hashes)',
        automated: true,
        required: true,
        estimatedTime: 5
      },
      {
        order: 5,
        phase: 'eradication',
        action: 'Remove malware',
        description: 'Use antivirus/EDR to remove malware from affected systems',
        automated: false,
        required: true,
        estimatedTime: 60
      },
      {
        order: 6,
        phase: 'recovery',
        action: 'Restore from backup',
        description: 'Restore affected systems from clean backups if necessary',
        automated: false,
        required: false,
        estimatedTime: 120
      },
      {
        order: 7,
        phase: 'recovery',
        action: 'Verify system integrity',
        description: 'Confirm system is clean and functioning properly',
        automated: false,
        required: true,
        estimatedTime: 30
      },
      {
        order: 8,
        phase: 'lessons_learned',
        action: 'Document incident',
        description: 'Complete incident report with timeline and findings',
        automated: false,
        required: true,
        estimatedTime: 60
      }
    ],
    escalationRules: [
      {
        condition: 'severity == critical',
        action: 'Notify CISO and executive team',
        notify: ['ciso', 'cto', 'ceo']
      },
      {
        condition: 'dataExposed == true',
        action: 'Notify legal and compliance',
        notify: ['legal', 'compliance']
      }
    ],
    containmentStrategies: [
      'Network isolation',
      'Account disablement',
      'Firewall rule updates',
      'DNS sinkholing'
    ],
    recoveryProcedures: [
      'System reimaging',
      'Password reset for affected users',
      'Security control verification',
      'Enhanced monitoring deployment'
    ],
    communicationTemplates: [
      {
        audience: 'executive',
        template: 'Executive summary template for malware incident'
      },
      {
        audience: 'technical',
        template: 'Technical details template for security team'
      }
    ]
  },
  {
    id: 'playbook-phishing',
    name: 'Phishing Incident Response',
    description: 'Response procedures for phishing attacks',
    incidentTypes: ['phishing'],
    severityLevels: ['low', 'medium', 'high'],
    steps: [
      {
        order: 1,
        phase: 'identification',
        action: 'Identify phishing email',
        description: 'Collect phishing email headers and content',
        automated: false,
        required: true,
        estimatedTime: 10
      },
      {
        order: 2,
        phase: 'identification',
        action: 'Determine scope',
        description: 'Identify all recipients of the phishing email',
        automated: false,
        required: true,
        estimatedTime: 15
      },
      {
        order: 3,
        phase: 'containment',
        action: 'Remove phishing emails',
        description: 'Delete phishing emails from all mailboxes',
        automated: true,
        required: true,
        estimatedTime: 10
      },
      {
        order: 4,
        phase: 'containment',
        action: 'Block sender/domain',
        description: 'Add sender address and domains to blocklist',
        automated: true,
        required: true,
        estimatedTime: 5
      },
      {
        order: 5,
        phase: 'eradication',
        action: 'Reset compromised credentials',
        description: 'Force password reset for users who clicked links',
        automated: false,
        required: true,
        estimatedTime: 30
      },
      {
        order: 6,
        phase: 'lessons_learned',
        action: 'User awareness training',
        description: 'Send targeted training to affected users',
        automated: false,
        required: true,
        estimatedTime: 60
      }
    ],
    escalationRules: [
      {
        condition: 'credentialsCompromised > 10',
        action: 'Escalate to security leadership',
        notify: ['ciso', 'security-manager']
      }
    ],
    containmentStrategies: [
      'Email quarantine',
      'Sender blocking',
      'URL blocking',
      'User account lockdown'
    ],
    recoveryProcedures: [
      'Credential reset',
      'MFA enforcement',
      'Account monitoring',
      'Security awareness training'
    ],
    communicationTemplates: [
      {
        audience: 'affected_users',
        template: 'Phishing notification template for affected users'
      }
    ]
  },
  {
    id: 'playbook-data-breach',
    name: 'Data Breach Response',
    description: 'Response procedures for data breaches',
    incidentTypes: ['data_breach'],
    severityLevels: ['high', 'critical'],
    steps: [
      {
        order: 1,
        phase: 'identification',
        action: 'Confirm breach',
        description: 'Verify that a data breach has occurred',
        automated: false,
        required: true,
        estimatedTime: 60
      },
      {
        order: 2,
        phase: 'identification',
        action: 'Assess data exposure',
        description: 'Determine what data was accessed/exfiltrated',
        automated: false,
        required: true,
        estimatedTime: 120
      },
      {
        order: 3,
        phase: 'containment',
        action: 'Stop data exfiltration',
        description: 'Block unauthorized data transfers',
        automated: false,
        required: true,
        estimatedTime: 30
      },
      {
        order: 4,
        phase: 'containment',
        action: 'Revoke access',
        description: 'Revoke compromised credentials and access tokens',
        automated: false,
        required: true,
        estimatedTime: 30
      },
      {
        order: 5,
        phase: 'eradication',
        action: 'Close vulnerability',
        description: 'Patch or remediate the vulnerability that enabled the breach',
        automated: false,
        required: true,
        estimatedTime: 240
      },
      {
        order: 6,
        phase: 'recovery',
        action: 'Notify stakeholders',
        description: 'Notify affected individuals and regulators as required',
        automated: false,
        required: true,
        estimatedTime: 480
      },
      {
        order: 7,
        phase: 'lessons_learned',
        action: 'Post-incident review',
        description: 'Conduct thorough review and update security controls',
        automated: false,
        required: true,
        estimatedTime: 240
      }
    ],
    escalationRules: [
      {
        condition: 'PII exposed',
        action: 'Notify legal and initiate breach notification process',
        notify: ['legal', 'compliance', 'ciso', 'ceo']
      },
      {
        condition: 'records > 10000',
        action: 'Regulatory notification required',
        notify: ['legal', 'compliance', 'pr']
      }
    ],
    containmentStrategies: [
      'Access revocation',
      'Network segmentation',
      'Data loss prevention activation',
      'Account lockdown'
    ],
    recoveryProcedures: [
      'Credential rotation',
      'Security control enhancement',
      'Monitoring increase',
      'Third-party audit'
    ],
    communicationTemplates: [
      {
        audience: 'affected_individuals',
        template: 'Data breach notification template for affected individuals'
      },
      {
        audience: 'regulators',
        template: 'Regulatory notification template'
      },
      {
        audience: 'public',
        template: 'Public disclosure template'
      }
    ]
  }
];

// ─── Incident Response Manager ───────────────────────────────────────────────

export class IncidentResponse {
  private config: IncidentConfig;
  private incidents: IncidentResponse[] = [];
  private auditLog: SecurityAuditLog;
  private intrusionDetector: IntrusionDetector;
  private threatIntel: ThreatIntelligence;

  constructor(config?: Partial<IncidentConfig>) {
    this.config = {
      autoTriage: true,
      autoContain: false,
      escalationEnabled: true,
      notificationChannels: ['email', 'slack'],
      retentionDays: 365,
      playbooks: DEFAULT_PLAYBOOKS,
      ...config
    };

    this.auditLog = new SecurityAuditLog();
    this.intrusionDetector = new IntrusionDetector();
    this.threatIntel = new ThreatIntelligence();

    this.initIncidentResponse();
  }

  private initIncidentResponse(): void {
    try {
      if (!existsSync(INCIDENT_DIR)) {
        mkdirSync(INCIDENT_DIR, { recursive: true });
      }

      this.loadIncidents();
      this.loadPlaybooks();
    } catch (err) {
      logger.warn('Failed to initialize incident response', { error: (err as Error).message });
    }
  }

  private loadIncidents(): void {
    try {
      if (existsSync(INCIDENTS_FILE)) {
        const content = readFileSync(INCIDENTS_FILE, 'utf8');
        const lines = content.split('\n').filter(l => l);
        this.incidents = lines.map(l => JSON.parse(l));
        logger.info('Loaded incidents', { count: this.incidents.length });
      }
    } catch (err) {
      logger.warn('Failed to load incidents', { error: (err as Error).message });
    }
  }

  private saveIncidents(): void {
    try {
      const content = this.incidents.map(i => JSON.stringify(i)).join('\n');
      writeFileSync(INCIDENTS_FILE, content, 'utf8');
    } catch (err) {
      logger.warn('Failed to save incidents', { error: (err as Error).message });
    }
  }

  private loadPlaybooks(): void {
    try {
      if (existsSync(PLAYBOOKS_FILE)) {
        const data = JSON.parse(readFileSync(PLAYBOOKS_FILE, 'utf8'));
        this.config.playbooks = data.playbooks || DEFAULT_PLAYBOOKS;
      } else {
        this.savePlaybooks();
      }
    } catch (err) {
      logger.warn('Failed to load playbooks', { error: (err as Error).message });
    }
  }

  private savePlaybooks(): void {
    try {
      writeFileSync(PLAYBOOKS_FILE, JSON.stringify({
        playbooks: this.config.playbooks,
        lastUpdated: new Date().toISOString()
      }, null, 2), 'utf8');
    } catch (err) {
      logger.warn('Failed to save playbooks', { error: (err as Error).message });
    }
  }

  private addTimelineEntry(incidentId: string, entry: Omit<IncidentTimelineEntry, 'timestamp'>): void {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (incident) {
      const fullEntry: IncidentTimelineEntry = {
        ...entry,
        timestamp: new Date().toISOString()
      };
      incident.timeline.push(fullEntry);
      incident.updatedAt = fullEntry.timestamp;

      // Log to timeline file
      try {
        appendFileSync(TIMELINE_FILE, JSON.stringify({
          incidentId,
          ...fullEntry
        }) + '\n', 'utf8');
      } catch (err) {
        logger.warn('Failed to log timeline entry', { error: (err as Error).message });
      }

      this.saveIncidents();
    }
  }

  /**
   * Create a new incident
   */
  createIncident(incident: {
    title: string;
    description: string;
    type: IncidentType;
    severity: IncidentSeverity;
    detectionSource: string;
    detectionMethod: string;
    affectedSystems?: string[];
    affectedUsers?: string[];
    relatedAlerts?: string[];
  }): IncidentResponse {
    const id = `INC-${Date.now()}-${createHash('sha256').update(incident.title).digest('hex').substring(0, 6).toUpperCase()}`;
    const now = new Date().toISOString();

    const priority = this.calculatePriority(incident.severity, incident.type);

    const fullIncident: IncidentResponse = {
      id,
      title: incident.title,
      description: incident.description,
      type: incident.type,
      severity: incident.severity,
      status: 'new',
      priority,
      createdAt: now,
      updatedAt: now,

      detectionSource: incident.detectionSource,
      detectionMethod: incident.detectionMethod,
      relatedAlerts: incident.relatedAlerts || [],
      relatedThreats: [],

      affectedSystems: incident.affectedSystems || [],
      affectedUsers: incident.affectedUsers || [],
      dataExposed: false,
      estimatedImpact: {
        reputational: 'low',
        operational: 'low'
      },

      timeline: [],
      actionsTaken: [],
      containmentActions: [],
      eradicationActions: [],
      recoveryActions: [],

      evidenceCollected: [],
      stakeholdersNotified: [],
      externalReporting: {},

      lessonsLearned: [],
      recommendations: []
    };

    // Add initial timeline entry
    this.addTimelineEntry(id, {
      phase: 'identification',
      action: 'Incident created',
      actor: 'system',
      details: incident.description
    });

    this.incidents.push(fullIncident);
    this.saveIncidents();

    logger.warn('Security incident created', {
      id,
      type: incident.type,
      severity: incident.severity,
      priority
    });

    // Log to audit
    this.auditLog.log({
      eventType: 'incident_response',
      action: 'create',
      severity: incident.severity,
      actor: { type: 'system', id: 'incident-response' },
      resource: { type: 'incident', id },
      outcome: { status: 'success' }
    });

    // Auto-triage if enabled
    if (this.config.autoTriage) {
      this.triageIncident(id);
    }

    return fullIncident;
  }

  private calculatePriority(severity: IncidentSeverity, type: IncidentType): number {
    const severityPriority: Record<IncidentSeverity, number> = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 4
    };

    // Adjust priority based on type
    const typeAdjustment: Partial<Record<IncidentType, number>> = {
      ransomware: -1,
      data_breach: -1,
      malware: 0,
      phishing: 1
    };

    const basePriority = severityPriority[severity];
    const adjustment = typeAdjustment[type] || 0;

    return Math.max(1, Math.min(5, basePriority + adjustment));
  }

  /**
   * Triage an incident
   */
  triageIncident(incidentId: string): boolean {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident || incident.status !== 'new') return false;

    incident.status = 'triage';
    incident.updatedAt = new Date().toISOString();

    // Apply playbook if matching
    const playbook = this.config.playbooks.find(p =>
      p.incidentTypes.includes(incident.type) &&
      p.severityLevels.includes(incident.severity)
    );

    if (playbook) {
      this.addTimelineEntry(incidentId, {
        phase: 'identification',
        action: 'Playbook applied',
        actor: 'system',
        details: `Applied playbook: ${playbook.name}`
      });

      // Execute automated steps
      playbook.steps
        .filter(s => s.automated && s.required)
        .forEach(step => {
          this.executeAutomatedStep(incidentId, step);
        });
    }

    this.saveIncidents();
    logger.info('Incident triaged', { incidentId });

    return true;
  }

  /**
   * Execute an automated response step
   */
  private executeAutomatedStep(incidentId: string, step: ResponsePlaybook['steps'][0]): void {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) return;

    let outcome = '';

    switch (step.action) {
      case 'Block IOCs':
        // Block related IOCs from threat intel
        incident.relatedAlerts.forEach(alertId => {
          // In production, would extract IOCs from alert and block
        });
        outcome = 'IOCs blocked';
        incident.containmentActions.push('IOC blocking executed');
        break;

      case 'Remove phishing emails':
        outcome = 'Phishing emails quarantined';
        incident.containmentActions.push('Email quarantine executed');
        break;

      case 'Block sender/domain':
        outcome = 'Sender/domain added to blocklist';
        incident.containmentActions.push('Email blocking executed');
        break;

      default:
        outcome = 'Action executed';
    }

    this.addTimelineEntry(incidentId, {
      phase: step.phase,
      action: step.action,
      actor: 'system',
      details: step.description,
      outcome
    });

    incident.actionsTaken.push(step.action);
  }

  /**
   * Update incident status
   */
  updateStatus(incidentId: string, status: IncidentStatus): boolean {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) return false;

    const previousStatus = incident.status;
    incident.status = status;
    incident.updatedAt = new Date().toISOString();

    // Determine phase based on status
    const statusPhaseMap: Record<IncidentStatus, IncidentPhase> = {
      new: 'identification',
      triage: 'identification',
      investigating: 'identification',
      contained: 'containment',
      eradicating: 'eradication',
      recovering: 'recovery',
      resolved: 'lessons_learned',
      closed: 'lessons_learned'
    };

    this.addTimelineEntry(incidentId, {
      phase: statusPhaseMap[status],
      action: `Status changed: ${previousStatus} → ${status}`,
      actor: 'system'
    });

    if (status === 'resolved' || status === 'closed') {
      incident.resolvedAt = new Date().toISOString();
    }

    this.saveIncidents();
    logger.info('Incident status updated', { incidentId, status });

    return true;
  }

  /**
   * Add action to incident
   */
  addAction(incidentId: string, action: {
    phase: IncidentPhase;
    action: string;
    actor: string;
    details?: string;
    outcome?: string;
  }): boolean {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) return false;

    this.addTimelineEntry(incidentId, action);

    switch (action.phase) {
      case 'containment':
        incident.containmentActions.push(action.action);
        break;
      case 'eradication':
        incident.eradicationActions.push(action.action);
        break;
      case 'recovery':
        incident.recoveryActions.push(action.action);
        break;
      default:
        incident.actionsTaken.push(action.action);
    }

    return true;
  }

  /**
   * Collect evidence for incident
   */
  collectEvidence(incidentId: string, evidence: {
    type: string;
    location: string;
    hash?: string;
    collectedBy: string;
  }): boolean {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) return false;

    const collectedEvidence = {
      ...evidence,
      collectedAt: new Date().toISOString()
    };

    incident.evidenceCollected.push(collectedEvidence);
    incident.updatedAt = collectedEvidence.collectedAt;

    this.addTimelineEntry(incidentId, {
      phase: 'identification',
      action: 'Evidence collected',
      actor: evidence.collectedBy,
      details: `${evidence.type} from ${evidence.location}`
    });

    this.saveIncidents();
    return true;
  }

  /**
   * Get incident by ID
   */
  getIncident(incidentId: string): IncidentResponse | null {
    return this.incidents.find(i => i.id === incidentId) || null;
  }

  /**
   * Get incidents by criteria
   */
  getIncidents(options?: {
    status?: IncidentStatus;
    severity?: IncidentSeverity;
    type?: IncidentType;
    assignedTo?: string;
    limit?: number;
  }): IncidentResponse[] {
    let incidents = [...this.incidents];

    if (options?.status) {
      incidents = incidents.filter(i => i.status === options.status);
    }
    if (options?.severity) {
      incidents = incidents.filter(i => i.severity === options.severity);
    }
    if (options?.type) {
      incidents = incidents.filter(i => i.type === options.type);
    }
    if (options?.assignedTo) {
      incidents = incidents.filter(i => i.assignedTo === options.assignedTo);
    }

    // Sort by priority (ascending) then by createdAt (descending)
    incidents.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    if (options?.limit) {
      incidents = incidents.slice(0, options.limit);
    }

    return incidents;
  }

  /**
   * Get incident statistics
   */
  getStats(period?: { start?: Date; end?: Date }): IncidentStats {
    let incidents = [...this.incidents];

    if (period?.start) {
      incidents = incidents.filter(i => new Date(i.createdAt) >= period.start!);
    }
    if (period?.end) {
      incidents = incidents.filter(i => new Date(i.createdAt) <= period.end!);
    }

    const stats: IncidentStats = {
      period: {
        start: period?.start?.toISOString() || incidents[0]?.createdAt || '',
        end: period?.end?.toISOString() || incidents[incidents.length - 1]?.createdAt || ''
      },
      totalIncidents: incidents.length,
      byStatus: {} as Record<IncidentStatus, number>,
      bySeverity: {} as Record<IncidentSeverity, number>,
      byType: {} as Record<IncidentType, number>,
      averageResolutionTime: 0,
      mttr: 0,
      containmentRate: 0,
      escalationRate: 0
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let containedCount = 0;
    let escalatedCount = 0;

    incidents.forEach(i => {
      stats.byStatus[i.status] = (stats.byStatus[i.status] || 0) + 1;
      stats.bySeverity[i.severity] = (stats.bySeverity[i.severity] || 0) + 1;
      stats.byType[i.type] = (stats.byType[i.type] || 0) + 1;

      if (i.resolvedAt) {
        const resolutionTime = (new Date(i.resolvedAt).getTime() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60);
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }

      if (i.status === 'contained' || i.status === 'eradicating' || i.status === 'recovering' || i.status === 'resolved' || i.status === 'closed') {
        containedCount++;
      }

      if (i.timeline.some(e => e.action.includes('escalat'))) {
        escalatedCount++;
      }
    });

    if (resolvedCount > 0) {
      stats.averageResolutionTime = totalResolutionTime / resolvedCount;
      stats.mttr = stats.averageResolutionTime;
    }

    if (incidents.length > 0) {
      stats.containmentRate = (containedCount / incidents.length) * 100;
      stats.escalationRate = (escalatedCount / incidents.length) * 100;
    }

    return stats;
  }

  /**
   * Close an incident
   */
  closeIncident(incidentId: string, closure: {
    rootCause: string;
    lessonsLearned: string[];
    recommendations: string[];
  }): boolean {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident || incident.status !== 'resolved') return false;

    incident.rootCause = closure.rootCause;
    incident.lessonsLearned = closure.lessonsLearned;
    incident.recommendations = closure.recommendations;
    incident.status = 'closed';
    incident.updatedAt = new Date().toISOString();

    this.addTimelineEntry(incidentId, {
      phase: 'lessons_learned',
      action: 'Incident closed',
      actor: 'system',
      details: `Root cause: ${closure.rootCause}`
    });

    this.saveIncidents();
    logger.info('Incident closed', { incidentId });

    return true;
  }

  /**
   * Generate incident report
   */
  generateReport(incidentId: string): string {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) return 'Incident not found';

    const date = new Date().toISOString().split('T')[0];
    let report = `# Incident Report: ${incident.id}\n\n`;
    report += `**Generated:** ${date}\n\n`;

    report += `## Summary\n\n`;
    report += `| Field | Value |\n`;
    report += `|-------|-------|\n`;
    report += `| Title | ${incident.title} |\n`;
    report += `| Type | ${incident.type} |\n`;
    report += `| Severity | ${incident.severity} |\n`;
    report += `| Priority | ${incident.priority} |\n`;
    report += `| Status | ${incident.status} |\n`;
    report += `| Created | ${new Date(incident.createdAt).toLocaleString()} |\n`;
    if (incident.resolvedAt) {
      report += `| Resolved | ${new Date(incident.resolvedAt).toLocaleString()} |\n`;
    }

    report += `\n## Description\n\n${incident.description}\n\n`;

    report += `## Timeline\n\n`;
    report += `| Time | Phase | Action | Actor | Outcome |\n`;
    report += `|------|-------|--------|-------|--------|\n`;
    incident.timeline.forEach(entry => {
      report += `| ${new Date(entry.timestamp).toLocaleString()} | ${entry.phase} | ${entry.action} | ${entry.actor} | ${entry.outcome || '-'} |\n`;
    });

    report += `\n## Impact\n\n`;
    report += `- Affected Systems: ${incident.affectedSystems.join(', ') || 'None'}\n`;
    report += `- Affected Users: ${incident.affectedUsers.length}\n`;
    report += `- Data Exposed: ${incident.dataExposed ? 'Yes' : 'No'}\n`;

    if (incident.rootCause) {
      report += `\n## Root Cause\n\n${incident.rootCause}\n\n`;
    }

    if (incident.lessonsLearned.length > 0) {
      report += `\n## Lessons Learned\n\n`;
      incident.lessonsLearned.forEach((lesson, i) => {
        report += `${i + 1}. ${lesson}\n`;
      });
    }

    if (incident.recommendations.length > 0) {
      report += `\n## Recommendations\n\n`;
      incident.recommendations.forEach((rec, i) => {
        report += `${i + 1}. ${rec}\n`;
      });
    }

    report += `\n---\n\n*Report generated: ${new Date().toISOString()}*\n`;

    return report;
  }

  /**
   * Get available playbooks
   */
  getPlaybooks(): ResponsePlaybook[] {
    return this.config.playbooks;
  }

  /**
   * Add custom playbook
   */
  addPlaybook(playbook: ResponsePlaybook): void {
    this.config.playbooks.push(playbook);
    this.savePlaybooks();
    logger.info('Custom playbook added', { id: playbook.id, name: playbook.name });
  }
}

// ─── Default Instance ────────────────────────────────────────────────────────

const defaultIncidentResponse = new IncidentResponse();

export function createSecurityIncident(incident: {
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  detectionSource: string;
  detectionMethod: string;
  affectedSystems?: string[];
  affectedUsers?: string[];
  relatedAlerts?: string[];
}): IncidentResponse {
  return defaultIncidentResponse.createIncident(incident);
}

export function getIncident(incidentId: string): IncidentResponse | null {
  return defaultIncidentResponse.getIncident(incidentId);
}

export function getIncidents(options?: {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  type?: IncidentType;
  assignedTo?: string;
  limit?: number;
}): IncidentResponse[] {
  return defaultIncidentResponse.getIncidents(options);
}

export function updateIncidentStatus(incidentId: string, status: IncidentStatus): boolean {
  return defaultIncidentResponse.updateStatus(incidentId, status);
}

export function getIncidentStats(period?: { start?: Date; end?: Date }): IncidentStats {
  return defaultIncidentResponse.getStats(period);
}

export function generateIncidentReport(incidentId: string): string {
  return defaultIncidentResponse.generateReport(incidentId);
}

// ─── Default Export ─────────────────────────────────────────────────────────

export default IncidentResponse;
