/**
 * Analytics Collector — DISABLED BY DEFAULT
 *
 * Feature usage event collection (opt-in only).
 * Disabled by default for local CLI tool - no telemetry backend.
 *
 * Enable with: export EZ_ANALYTICS_ENABLED=true
 *
 * Benefits of disabling:
 * - 100% elimination of analytics I/O overhead (~50-100ms/phase)
 * - No privacy concerns for local development
 * - Reduced disk writes
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Check if analytics is enabled via environment variable
 */
function isEnabled(): boolean {
  return process.env.EZ_ANALYTICS_ENABLED === 'true';
}

/**
 * Analytics event structure
 */
export interface AnalyticsEvent {
  timestamp: string;
  name: string;
  userId: string;
  properties: Record<string, unknown>;
}

/**
 * Session data structure
 */
export interface SessionData {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  events?: AnalyticsEvent[];
}

/**
 * Analytics data structure
 */
export interface AnalyticsData {
  events: AnalyticsEvent[];
  sessions: SessionData[];
}

/**
 * Event data input
 */
export interface EventData {
  name: string;
  type?: string;
  userId?: string;
  properties?: Record<string, unknown>;
}

/**
 * Session options
 */
export interface SessionOptions {
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * AnalyticsCollector - NO-OP when disabled
 */
export class AnalyticsCollector {
  private readonly cwd: string;
  private readonly dataPath: string;
  private readonly enabled: boolean;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.dataPath = path.join(this.cwd, '.planning', 'analytics.json');
    this.enabled = isEnabled();
  }

  /**
   * Track an analytics event (NO-OP if disabled)
   */
  async track(_event: EventData): Promise<void> {
    if (!this.enabled) return; // Zero overhead when disabled

    const data: AnalyticsEvent = {
      timestamp: new Date().toISOString(),
      name: _event.name || _event.type || 'unknown',
      userId: _event.userId || 'anonymous',
      properties: _event.properties || {}
    };

    const analytics = this.getAnalyticsData();
    analytics.events.push(data);
    this.saveAnalyticsData(analytics);
  }

  /**
   * Start a new session (NO-OP if disabled)
   */
  async startSession(options: SessionOptions = {}): Promise<string> {
    if (!this.enabled) return 'disabled'; // Zero overhead when disabled

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const session: SessionData = {
      id: sessionId,
      userId: options.userId || 'anonymous',
      startTime: new Date().toISOString(),
      events: []
    };

    const analytics = this.getAnalyticsData();
    analytics.sessions.push(session);
    this.saveAnalyticsData(analytics);

    return sessionId;
  }

  /**
   * End a session (NO-OP if disabled)
   */
  async endSession(sessionId: string): Promise<void> {
    if (!this.enabled) return;

    if (sessionId === 'disabled') return;

    const analytics = this.getAnalyticsData();
    const session = analytics.sessions.find(s => s.id === sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.endTime = new Date().toISOString();
    session.duration = Date.now() - new Date(session.startTime).getTime();
    this.saveAnalyticsData(analytics);
  }

  /**
   * Get events (returns empty array if disabled)
   */
  getEvents(options?: { name?: string; userId?: string }): AnalyticsEvent[] {
    if (!this.enabled) return [];
    const analytics = this.getAnalyticsData();
    let events = analytics.events;

    if (options?.name) {
      events = events.filter(e => e.name === options.name);
    }
    if (options?.userId) {
      events = events.filter(e => e.userId === options.userId);
    }

    return events;
  }

  /**
   * Get all events (returns empty array if disabled)
   */
  getAllEvents(): AnalyticsEvent[] {
    if (!this.enabled) return [];
    const analytics = this.getAnalyticsData();
    return analytics.events;
  }

  /**
   * Get session (returns undefined if disabled)
   */
  getSession(sessionId: string): SessionData | undefined {
    if (!this.enabled) return undefined;
    const analytics = this.getAnalyticsData();
    return analytics.sessions.find(s => s.id === sessionId);
  }

  /**
   * Get all sessions (returns empty array if disabled)
   */
  getAllSessions(): SessionData[] {
    if (!this.enabled) return [];
    const analytics = this.getAnalyticsData();
    return analytics.sessions;
  }

  /**
   * Get analytics data (returns empty if disabled)
   */
  private getAnalyticsData(): AnalyticsData {
    if (!this.enabled || !fs.existsSync(this.dataPath)) {
      return { events: [], sessions: [] };
    }
    return JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
  }

  /**
   * Save analytics data (NO-OP if disabled)
   */
  private saveAnalyticsData(data: AnalyticsData): void {
    if (!this.enabled) return;
    fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Ensure analytics directory exists (NO-OP if disabled)
   */
  private ensureDir(): void {
    if (!this.enabled) return;
    const dir = path.dirname(this.dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.dataPath)) {
      fs.writeFileSync(this.dataPath, JSON.stringify({ events: [], sessions: [] }, null, 2), 'utf8');
    }
  }
}

/**
 * Track an analytics event (NO-OP if disabled)
 */
export async function track(event: EventData, cwd?: string): Promise<void> {
  const collector = new AnalyticsCollector(cwd);
  return collector.track(event);
}

/**
 * Start a session (NO-OP if disabled)
 */
export async function startSession(options?: SessionOptions, cwd?: string): Promise<string> {
  const collector = new AnalyticsCollector(cwd);
  return collector.startSession(options);
}

/**
 * End a session (NO-OP if disabled)
 */
export async function endSession(sessionId: string, cwd?: string): Promise<void> {
  const collector = new AnalyticsCollector(cwd);
  return collector.endSession(sessionId);
}
