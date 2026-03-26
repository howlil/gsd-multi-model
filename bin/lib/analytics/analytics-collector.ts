/**
 * Analytics Collector — Feature usage event collection and local storage
 * Stores events in .planning/analytics.json
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Analytics event structure
 */
export interface AnalyticsEvent {
  /** Event timestamp */
  timestamp: string;
  /** Event name */
  name: string;
  /** User ID */
  userId: string;
  /** Event properties */
  properties: Record<string, unknown>;
}

/**
 * Session data structure
 */
export interface SessionData {
  /** Session ID */
  id: string;
  /** User ID */
  userId: string;
  /** Session start time */
  startTime: string;
  /** Session end time */
  endTime?: string;
  /** Duration in ms */
  duration?: number;
  /** Events in session */
  events?: AnalyticsEvent[];
}

/**
 * Analytics data structure
 */
export interface AnalyticsData {
  /** Analytics events */
  events: AnalyticsEvent[];
  /** Sessions */
  sessions: SessionData[];
}

/**
 * Event data input
 */
export interface EventData {
  /** Event name */
  name: string;
  /** Event type (alias for name) */
  type?: string;
  /** User ID */
  userId?: string;
  /** Event properties */
  properties?: Record<string, unknown>;
}

/**
 * Session options
 */
export interface SessionOptions {
  /** User ID */
  userId?: string;
  /** Session metadata */
  metadata?: Record<string, unknown>;
}

export class AnalyticsCollector {
  private readonly cwd: string;
  private readonly dataPath: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.dataPath = path.join(this.cwd, '.planning', 'analytics.json');
    this.ensureDir();
  }

  /**
   * Track an analytics event
   * @param event - Event data { name, userId, properties }
   */
  async track(event: EventData): Promise<void> {
    const data: AnalyticsEvent = {
      timestamp: new Date().toISOString(),
      name: event.name || event.type || 'unknown',
      userId: event.userId || 'anonymous',
      properties: event.properties || {}
    };

    const analytics = this.getAnalyticsData();
    analytics.events.push(data);
    this.saveAnalyticsData(analytics);
  }

  /**
   * Start a new session
   * @param options - Session options
   * @returns Session ID
   */
  async startSession(options: SessionOptions = {}): Promise<string> {
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
   * End a session
   * @param sessionId - Session ID to end
   */
  async endSession(sessionId: string): Promise<void> {
    const analytics = this.getAnalyticsData();
    const session = analytics.sessions.find(s => s.id === sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.endTime = new Date().toISOString();
    session.duration = Date.now() - new Date(session.startTime).getTime();
    session.status = 'completed';

    this.saveAnalyticsData(analytics);
  }

  /**
   * Get events by filter options
   * @param options - Filter options { name?, userId? }
   * @returns Filtered events
   */
  getEvents(options?: { name?: string; userId?: string }): AnalyticsEvent[] {
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
   * Get all events
   * @returns All events
   */
  getAllEvents(): AnalyticsEvent[] {
    const analytics = this.getAnalyticsData();
    return analytics.events;
  }

  /**
   * Get session by ID
   * @param sessionId - Session ID
   * @returns Session data or undefined
   */
  getSession(sessionId: string): SessionData | undefined {
    const analytics = this.getAnalyticsData();
    return analytics.sessions.find(s => s.id === sessionId);
  }

  /**
   * Get all sessions
   * @returns All sessions
   */
  getAllSessions(): SessionData[] {
    const analytics = this.getAnalyticsData();
    return analytics.sessions;
  }

  /**
   * Get analytics data
   * @returns Analytics data
   */
  private getAnalyticsData(): AnalyticsData {
    if (!fs.existsSync(this.dataPath)) {
      return { events: [], sessions: [] };
    }
    return JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
  }

  /**
   * Save analytics data
   * @param data - Data to save
   */
  private saveAnalyticsData(data: AnalyticsData): void {
    fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Ensure analytics directory exists
   */
  private ensureDir(): void {
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
 * Track an analytics event
 * @param event - Event data
 * @param cwd - Working directory
 */
export async function track(event: EventData, cwd?: string): Promise<void> {
  const collector = new AnalyticsCollector(cwd);
  return collector.track(event);
}

/**
 * Start a session
 * @param options - Session options
 * @param cwd - Working directory
 * @returns Session ID
 */
export async function startSession(options?: SessionOptions, cwd?: string): Promise<string> {
  const collector = new AnalyticsCollector(cwd);
  return collector.startSession(options);
}

/**
 * End a session
 * @param sessionId - Session ID
 * @param cwd - Working directory
 */
export async function endSession(sessionId: string, cwd?: string): Promise<void> {
  const collector = new AnalyticsCollector(cwd);
  return collector.endSession(sessionId);
}
