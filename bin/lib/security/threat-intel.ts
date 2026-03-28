/**
 * Threat Intelligence — Security threat intelligence integration
 *
 * SEC-13: Threat intelligence integration
 *
 * Integrates with threat intelligence feeds and provides threat analysis.
 * Features:
 * - Threat feed integration
 * - IOC (Indicators of Compromise) management
 * - Threat actor tracking
 * - Vulnerability correlation
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { defaultLogger as logger } from '../logger/index.js';
import { SecurityAuditLog, logSecurityEvent } from './security-audit-log.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const THREAT_INTEL_DIR = join(process.cwd(), '.planning', 'security', 'threat-intel');
const IOC_FILE = join(THREAT_INTEL_DIR, 'ioc.json');
const THREATS_FILE = join(THREAT_INTEL_DIR, 'threats.jsonl');
const ACTORS_FILE = join(THREAT_INTEL_DIR, 'actors.json');
const FEEDS_FILE = join(THREAT_INTEL_DIR, 'feeds.json');

// ─── Type Definitions ────────────────────────────────────────────────────────

export type IOCType =
  | 'ip'
  | 'domain'
  | 'url'
  | 'email'
  | 'hash_md5'
  | 'hash_sha1'
  | 'hash_sha256'
  | 'file_path'
  | 'registry_key'
  | 'user_agent';

export type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ThreatCategory =
  | 'malware'
  | 'ransomware'
  | 'phishing'
  | 'apt'
  | 'botnet'
  | 'cryptominer'
  | 'spyware'
  | 'trojan'
  | 'exploit'
  | 'vulnerability';

export interface IndicatorOfCompromise {
  id: string;
  type: IOCType;
  value: string;
  confidence: number; // 0-1
  severity: ThreatSeverity;
  source: string;
  firstSeen: string;
  lastSeen: string;
  tags: string[];
  context: {
    description?: string;
    attackVector?: string;
    targetedIndustries?: string[];
    associatedMalware?: string[];
  };
  status: 'active' | 'expired' | 'false_positive';
}

export interface ThreatActor {
  id: string;
  name: string;
  aliases: string[];
  type: 'nation_state' | 'cybercriminal' | 'hacktivist' | 'insider' | 'unknown';
  sophistication: 'low' | 'medium' | 'high' | 'advanced';
  motivation: string[];
  targetedIndustries: string[];
  targetedRegions: string[];
  ttps: string[]; // Tactics, Techniques, and Procedures
  associatedMalware: string[];
  firstSeen: string;
  lastActivity: string;
  description: string;
}

export interface ThreatFeed {
  id: string;
  name: string;
  url?: string;
  type: 'open_source' | 'commercial' | 'government' | 'community';
  updateFrequency: 'real_time' | 'hourly' | 'daily' | 'weekly';
  categories: ThreatCategory[];
  lastUpdate: string;
  status: 'active' | 'inactive' | 'error';
  iocCount: number;
}

export interface Threat {
  id: string;
  timestamp: string;
  type: ThreatCategory;
  severity: ThreatSeverity;
  title: string;
  description: string;
  iocs: string[]; // IOC IDs
  actors: string[]; // Actor IDs
  affectedSystems: string[];
  mitigation: string[];
  references: string[];
  status: 'new' | 'investigating' | 'confirmed' | 'mitigated' | 'false_positive';
}

export interface ThreatIntelConfig {
  enableAutoUpdate: boolean;
  updateInterval: number; // milliseconds
  iocRetentionDays: number;
  confidenceThreshold: number; // 0-1
  autoBlock: boolean;
  feeds: ThreatFeed[];
}

export interface ThreatIntelStats {
  period: {
    start: string;
    end: string;
  };
  totalIOCs: number;
  iocsByType: Record<IOCType, number>;
  iocsBySeverity: Record<ThreatSeverity, number>;
  activeThreats: number;
  threatActors: number;
  feedStatus: Array<{ name: string; status: string; lastUpdate: string }>;
  matchesFound: number;
  blocksExecuted: number;
}

// ─── Threat Intelligence Manager ─────────────────────────────────────────────

export class ThreatIntelligence {
  private config: ThreatIntelConfig;
  private iocs: Map<string, IndicatorOfCompromise> = new Map();
  private threats: Threat[] = [];
  private actors: Map<string, ThreatActor> = new Map();
  private auditLog: SecurityAuditLog;

  constructor(config?: Partial<ThreatIntelConfig>) {
    this.config = {
      enableAutoUpdate: true,
      updateInterval: 3600000, // 1 hour
      iocRetentionDays: 90,
      confidenceThreshold: 0.7,
      autoBlock: true,
      feeds: [],
      ...config
    };

    this.auditLog = new SecurityAuditLog();
    this.initThreatIntel();
  }

  private initThreatIntel(): void {
    try {
      if (!existsSync(THREAT_INTEL_DIR)) {
        mkdirSync(THREAT_INTEL_DIR, { recursive: true });
      }

      this.loadIOCs();
      this.loadThreats();
      this.loadActors();
      this.loadFeeds();
      this.cleanupExpiredIOCs();
    } catch (err) {
      logger.warn('Failed to initialize threat intelligence', { error: (err as Error).message });
    }
  }

  private loadIOCs(): void {
    try {
      if (existsSync(IOC_FILE)) {
        const data = JSON.parse(readFileSync(IOC_FILE, 'utf8'));
        this.iocs = new Map(Object.entries(data));
        logger.info('Loaded IOCs', { count: this.iocs.size });
      }
    } catch (err) {
      logger.warn('Failed to load IOCs', { error: (err as Error).message });
    }
  }

  private saveIOCs(): void {
    try {
      const data: Record<string, IndicatorOfCompromise> = {};
      this.iocs.forEach((value, key) => {
        data[key] = value;
      });
      writeFileSync(IOC_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      logger.warn('Failed to save IOCs', { error: (err as Error).message });
    }
  }

  private loadThreats(): void {
    try {
      if (existsSync(THREATS_FILE)) {
        const content = readFileSync(THREATS_FILE, 'utf8');
        const lines = content.split('\n').filter(l => l);
        this.threats = lines.map(l => JSON.parse(l));
        logger.info('Loaded threats', { count: this.threats.length });
      }
    } catch (err) {
      logger.warn('Failed to load threats', { error: (err as Error).message });
    }
  }

  private saveThreats(): void {
    try {
      const content = this.threats.map(t => JSON.stringify(t)).join('\n');
      writeFileSync(THREATS_FILE, content, 'utf8');
    } catch (err) {
      logger.warn('Failed to save threats', { error: (err as Error).message });
    }
  }

  private loadActors(): void {
    try {
      if (existsSync(ACTORS_FILE)) {
        const data = JSON.parse(readFileSync(ACTORS_FILE, 'utf8'));
        this.actors = new Map(Object.entries(data));
        logger.info('Loaded threat actors', { count: this.actors.size });
      }
    } catch (err) {
      logger.warn('Failed to load threat actors', { error: (err as Error).message });
    }
  }

  private saveActors(): void {
    try {
      const data: Record<string, ThreatActor> = {};
      this.actors.forEach((value, key) => {
        data[key] = value;
      });
      writeFileSync(ACTORS_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      logger.warn('Failed to save threat actors', { error: (err as Error).message });
    }
  }

  private loadFeeds(): void {
    try {
      if (existsSync(FEEDS_FILE)) {
        const data = JSON.parse(readFileSync(FEEDS_FILE, 'utf8'));
        this.config.feeds = data.feeds || [];
      } else {
        // Initialize with default feeds
        this.config.feeds = [
          {
            id: 'feed-001',
            name: 'MITRE ATT&CK',
            type: 'open_source',
            updateFrequency: 'weekly',
            categories: ['apt', 'malware', 'exploit'],
            lastUpdate: new Date().toISOString(),
            status: 'active',
            iocCount: 0
          },
          {
            id: 'feed-002',
            name: 'AlienVault OTX',
            type: 'open_source',
            updateFrequency: 'hourly',
            categories: ['malware', 'phishing', 'botnet'],
            lastUpdate: new Date().toISOString(),
            status: 'active',
            iocCount: 0
          },
          {
            id: 'feed-003',
            name: 'Abuse.ch',
            type: 'open_source',
            updateFrequency: 'daily',
            categories: ['malware', 'botnet', 'ransomware'],
            lastUpdate: new Date().toISOString(),
            status: 'active',
            iocCount: 0
          }
        ];
        this.saveFeeds();
      }
    } catch (err) {
      logger.warn('Failed to load feeds', { error: (err as Error).message });
    }
  }

  private saveFeeds(): void {
    try {
      writeFileSync(FEEDS_FILE, JSON.stringify({
        feeds: this.config.feeds,
        lastUpdated: new Date().toISOString()
      }, null, 2), 'utf8');
    } catch (err) {
      logger.warn('Failed to save feeds', { error: (err as Error).message });
    }
  }

  private cleanupExpiredIOCs(): void {
    const cutoff = Date.now() - (this.config.iocRetentionDays * 24 * 60 * 60 * 1000);
    let expired = 0;

    this.iocs.forEach((ioc, key) => {
      const lastSeen = new Date(ioc.lastSeen).getTime();
      if (lastSeen < cutoff && ioc.status === 'active') {
        ioc.status = 'expired';
        expired++;
      }
    });

    if (expired > 0) {
      this.saveIOCs();
      logger.info('Cleaned up expired IOCs', { count: expired });
    }
  }

  /**
   * Add an Indicator of Compromise
   */
  addIOC(ioc: Omit<IndicatorOfCompromise, 'id' | 'firstSeen' | 'lastSeen'>): IndicatorOfCompromise {
    const id = `ioc-${createHash('sha256').update(ioc.value).digest('hex').substring(0, 12)}`;
    const now = new Date().toISOString();

    const fullIOC: IndicatorOfCompromise = {
      ...ioc,
      id,
      firstSeen: now,
      lastSeen: now
    };

    this.iocs.set(id, fullIOC);
    this.saveIOCs();

    logger.info('IOC added', { id, type: ioc.type, value: ioc.value });

    // Log to audit
    this.auditLog.log({
      eventType: 'security_scan',
      action: 'create',
      severity: ioc.severity,
      actor: { type: 'system', id: 'threat-intel' },
      resource: { type: 'ioc', id },
      outcome: { status: 'success' }
    });

    return fullIOC;
  }

  /**
   * Check if a value matches any IOC
   */
  checkIOC(value: string, type?: IOCType): { match: boolean; ioc?: IndicatorOfCompromise } {
    for (const ioc of this.iocs.values()) {
      if (ioc.status !== 'active') continue;
      if (ioc.confidence < this.config.confidenceThreshold) continue;

      if (type && ioc.type !== type) continue;

      // Check for exact match or pattern match
      if (ioc.value === value ||
          (ioc.type === 'domain' && value.endsWith(`.${ioc.value}`)) ||
          (ioc.type === 'url' && value.includes(ioc.value))) {
        logger.warn('IOC match found', { value, iocId: ioc.id, severity: ioc.severity });

        // Log to audit
        this.auditLog.log({
          eventType: 'security_scan',
          action: 'read',
          severity: ioc.severity,
          actor: { type: 'system', id: 'threat-intel' },
          resource: { type: 'ioc', id: ioc.id },
          outcome: { status: 'success', reason: 'IOC match' }
        });

        return { match: true, ioc };
      }
    }

    return { match: false };
  }

  /**
   * Add a threat actor
   */
  addActor(actor: Omit<ThreatActor, 'id'>): ThreatActor {
    const id = `actor-${actor.name.toLowerCase().replace(/\s+/g, '-')}`;
    const now = new Date().toISOString();

    const fullActor: ThreatActor = {
      ...actor,
      id,
      lastActivity: now
    };

    this.actors.set(id, fullActor);
    this.saveActors();

    logger.info('Threat actor added', { id, name: actor.name });

    return fullActor;
  }

  /**
   * Get threat actor by name
   */
  getActor(nameOrId: string): ThreatActor | null {
    return this.actors.get(nameOrId) ||
           Array.from(this.actors.values()).find(a =>
             a.name.toLowerCase() === nameOrId.toLowerCase() ||
             a.aliases.some(alias => alias.toLowerCase() === nameOrId.toLowerCase())
           ) || null;
  }

  /**
   * Record a threat
   */
  recordThreat(threat: Omit<Threat, 'id' | 'timestamp'>): Threat {
    const id = `threat-${Date.now()}-${createHash('sha256').update(threat.title).digest('hex').substring(0, 8)}`;
    const now = new Date().toISOString();

    const fullThreat: Threat = {
      ...threat,
      id,
      timestamp: now
    };

    this.threats.push(fullThreat);
    this.saveThreats();

    logger.info('Threat recorded', { id, type: threat.type, severity: threat.severity });

    // Log to audit
    this.auditLog.log({
      eventType: 'incident_response',
      action: 'create',
      severity: threat.severity,
      actor: { type: 'system', id: 'threat-intel' },
      resource: { type: 'threat', id },
      outcome: { status: 'success' }
    });

    return fullThreat;
  }

  /**
   * Get active threats
   */
  getThreats(options?: {
    type?: ThreatCategory;
    severity?: ThreatSeverity;
    status?: Threat['status'];
    limit?: number;
  }): Threat[] {
    let threats = [...this.threats];

    if (options?.type) {
      threats = threats.filter(t => t.type === options.type);
    }
    if (options?.severity) {
      threats = threats.filter(t => t.severity === options.severity);
    }
    if (options?.status) {
      threats = threats.filter(t => t.status === options.status);
    }

    // Sort by timestamp descending
    threats.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (options?.limit) {
      threats = threats.slice(0, options.limit);
    }

    return threats;
  }

  /**
   * Update threat status
   */
  updateThreatStatus(threatId: string, status: Threat['status']): boolean {
    const threat = this.threats.find(t => t.id === threatId);
    if (threat) {
      threat.status = status;
      this.saveThreats();
      return true;
    }
    return false;
  }

  /**
   * Get IOCs by criteria
   */
  getIOCs(options?: {
    type?: IOCType;
    severity?: ThreatSeverity;
    status?: IndicatorOfCompromise['status'];
    tags?: string[];
    limit?: number;
  }): IndicatorOfCompromise[] {
    let iocs = Array.from(this.iocs.values());

    if (options?.type) {
      iocs = iocs.filter(i => i.type === options.type);
    }
    if (options?.severity) {
      iocs = iocs.filter(i => i.severity === options.severity);
    }
    if (options?.status) {
      iocs = iocs.filter(i => i.status === options.status);
    }
    if (options?.tags) {
      iocs = iocs.filter(i => options.tags!.some(tag => i.tags.includes(tag)));
    }

    // Sort by lastSeen descending
    iocs.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

    if (options?.limit) {
      iocs = iocs.slice(0, options.limit);
    }

    return iocs;
  }

  /**
   * Get all threat actors
   */
  getActors(): ThreatActor[] {
    return Array.from(this.actors.values());
  }

  /**
   * Get threat intelligence statistics
   */
  getStats(period?: { start?: Date; end?: Date }): ThreatIntelStats {
    const now = new Date();
    const start = period?.start || new Date(0);
    const end = period?.end || now;

    const iocs = Array.from(this.iocs.values());
    const activeIOCs = iocs.filter(i => i.status === 'active');

    const iocsByType: Record<IOCType, number> = {} as Record<IOCType, number>;
    const iocsBySeverity: Record<ThreatSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };

    activeIOCs.forEach(ioc => {
      iocsByType[ioc.type] = (iocsByType[ioc.type] || 0) + 1;
      iocsBySeverity[ioc.severity]++;
    });

    const activeThreats = this.threats.filter(t =>
      t.status === 'new' || t.status === 'investigating' || t.status === 'confirmed'
    ).length;

    const feedStatus = this.config.feeds.map(f => ({
      name: f.name,
      status: f.status,
      lastUpdate: f.lastUpdate
    }));

    return {
      period: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      totalIOCs: activeIOCs.length,
      iocsByType,
      iocsBySeverity,
      activeThreats,
      threatActors: this.actors.size,
      feedStatus,
      matchesFound: 0, // Would be tracked in production
      blocksExecuted: 0 // Would be tracked in production
    };
  }

  /**
   * Import IOCs from a feed
   */
  importFeedIOCs(feedId: string, iocs: Array<{
    type: IOCType;
    value: string;
    confidence?: number;
    severity?: ThreatSeverity;
    tags?: string[];
  }>): number {
    const feed = this.config.feeds.find(f => f.id === feedId);
    if (!feed) {
      logger.error('Feed not found', { feedId });
      return 0;
    }

    let imported = 0;

    for (const iocData of iocs) {
      const ioc = this.addIOC({
        type: iocData.type,
        value: iocData.value,
        confidence: iocData.confidence || 0.8,
        severity: iocData.severity || 'medium',
        source: feed.name,
        tags: iocData.tags || [],
        context: {},
        status: 'active'
      });

      if (ioc) imported++;
    }

    // Update feed stats
    feed.iocCount = imported;
    feed.lastUpdate = new Date().toISOString();
    this.saveFeeds();

    logger.info('Feed IOCs imported', { feedId, count: imported });

    return imported;
  }

  /**
   * Export IOCs for sharing
   */
  exportIOCs(options?: {
    format: 'json' | 'csv' | 'stix';
    types?: IOCType[];
    minConfidence?: number;
  }): string {
    let iocs = this.getIOCs({
      status: 'active',
      limit: 10000
    });

    if (options?.types) {
      iocs = iocs.filter(i => options.types!.includes(i.type));
    }
    if (options?.minConfidence) {
      iocs = iocs.filter(i => i.confidence >= options.minConfidence!);
    }

    if (options?.format === 'json') {
      return JSON.stringify(iocs, null, 2);
    }

    if (options?.format === 'csv') {
      const headers = ['id', 'type', 'value', 'confidence', 'severity', 'source', 'tags'];
      const rows = iocs.map(i => [
        i.id,
        i.type,
        i.value,
        i.confidence,
        i.severity,
        i.source,
        i.tags.join(';')
      ]);

      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    // STIX format (simplified)
    if (options?.format === 'stix') {
      const stixObjects = iocs.map(ioc => ({
        type: 'indicator',
        id: `indicator--${ioc.id}`,
        created: ioc.firstSeen,
        modified: ioc.lastSeen,
        name: `${ioc.type}:${ioc.value}`,
        pattern: `[file:hashes.MD5 = '${ioc.value}']`, // Simplified
        pattern_type: 'stix',
        valid_from: ioc.firstSeen,
        confidence: Math.round(ioc.confidence * 100),
        labels: ioc.tags
      }));

      return JSON.stringify({
        type: 'bundle',
        id: `bundle--${Date.now()}`,
        objects: stixObjects
      }, null, 2);
    }

    return '';
  }

  /**
   * Generate threat intelligence report
   */
  generateReport(period?: { start?: Date; end?: Date }): string {
    const stats = this.getStats(period);
    const date = new Date().toISOString().split('T')[0];

    let report = `# Threat Intelligence Report\n\n`;
    report += `**Generated:** ${date}\n\n`;

    report += `## Executive Summary\n\n`;
    report += `- Total Active IOCs: ${stats.totalIOCs}\n`;
    report += `- Active Threats: ${stats.activeThreats}\n`;
    report += `- Tracked Threat Actors: ${stats.threatActors}\n`;
    report += `- Feed Sources: ${stats.feedStatus.length}\n\n`;

    report += `## IOC Breakdown by Type\n\n`;
    report += `| Type | Count |\n`;
    report += `|------|-------|\n`;
    Object.entries(stats.iocsByType).forEach(([type, count]) => {
      if (count > 0) report += `| ${type} | ${count} |\n`;
    });

    report += `\n## IOC Breakdown by Severity\n\n`;
    report += `| Severity | Count |\n`;
    report += `|----------|-------|\n`;
    Object.entries(stats.iocsBySeverity).forEach(([severity, count]) => {
      if (count > 0) report += `| ${severity} | ${count} |\n`;
    });

    report += `\n## Feed Status\n\n`;
    report += `| Feed | Status | Last Update |\n`;
    report += `|------|--------|-------------|\n`;
    stats.feedStatus.forEach(f => {
      const icon = f.status === 'active' ? '✅' : '❌';
      report += `| ${f.name} | ${icon} ${f.status} | ${new Date(f.lastUpdate).toLocaleDateString()} |\n`;
    });

    report += `\n## Recent Threats\n\n`;
    const recentThreats = this.getThreats({ limit: 10 });
    if (recentThreats.length === 0) {
      report += `*No recent threats recorded*\n`;
    } else {
      report += `| Date | Type | Severity | Status |\n`;
      report += `|------|------|----------|--------|\n`;
      recentThreats.forEach(t => {
        report += `| ${new Date(t.timestamp).toLocaleDateString()} | ${t.type} | ${t.severity} | ${t.status} |\n`;
      });
    }

    report += `\n---\n\n*Report generated: ${new Date().toISOString()}*\n`;

    return report;
  }

  /**
   * Clear expired IOCs
   */
  clearExpiredIOCs(): number {
    let cleared = 0;
    this.iocs.forEach((ioc, key) => {
      if (ioc.status === 'expired') {
        this.iocs.delete(key);
        cleared++;
      }
    });

    if (cleared > 0) {
      this.saveIOCs();
      logger.info('Cleared expired IOCs', { count: cleared });
    }

    return cleared;
  }
}

// ─── Default Instance ────────────────────────────────────────────────────────

const defaultThreatIntel = new ThreatIntelligence();

export function addThreatIOC(ioc: Omit<IndicatorOfCompromise, 'id' | 'firstSeen' | 'lastSeen'>): IndicatorOfCompromise {
  return defaultThreatIntel.addIOC(ioc);
}

export function checkThreatIOC(value: string, type?: IOCType): { match: boolean; ioc?: IndicatorOfCompromise } {
  return defaultThreatIntel.checkIOC(value, type);
}

export function recordThreat(threat: Omit<Threat, 'id' | 'timestamp'>): Threat {
  return defaultThreatIntel.recordThreat(threat);
}

export function getThreats(options?: {
  type?: ThreatCategory;
  severity?: ThreatSeverity;
  status?: Threat['status'];
  limit?: number;
}): Threat[] {
  return defaultThreatIntel.getThreats(options);
}

export function getThreatIOCs(options?: {
  type?: IOCType;
  severity?: ThreatSeverity;
  status?: IndicatorOfCompromise['status'];
  tags?: string[];
  limit?: number;
}): IndicatorOfCompromise[] {
  return defaultThreatIntel.getIOCs(options);
}

export function getThreatIntelStats(period?: { start?: Date; end?: Date }): ThreatIntelStats {
  return defaultThreatIntel.getStats(period);
}

export function generateThreatIntelReport(period?: { start?: Date; end?: Date }): string {
  return defaultThreatIntel.generateReport(period);
}

// ─── Default Export ─────────────────────────────────────────────────────────

export default ThreatIntelligence;
