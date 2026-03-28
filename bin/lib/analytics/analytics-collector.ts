#!/usr/bin/env node
/**
 * AnalyticsCollector - Event and session tracking infrastructure
 * 
 * Records feature usage events with metadata, manages user sessions,
 * and provides event filtering and retrieval capabilities.
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
 * Analytics event data structure
 */
export interface EventData {
  name: string;
  userId?: string;
  timestamp?: string | number;
  properties?: Record<string, unknown>;
  type?: string;
  [key: string]: unknown;
}

/**
 * Analytics event record
 */
export interface AnalyticsEvent {
  name: string;
  userId?: string;
  timestamp: string;
  properties?: Record<string, unknown>;
}

/**
 * Session options
 */
export interface SessionOptions {
  userId?: string;
  [key: string]: unknown;
}

/**
 * Session record
 */
export interface Session {
  id: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

/**
 * Analytics data file structure
 */
interface AnalyticsData {
  events: AnalyticsEvent[];
  sessions: Session[];
}

/**
 * AnalyticsCollector class for tracking events and sessions
 */
export class AnalyticsCollector {
  private readonly dataPath: string;
  private readonly enabled: boolean;

  /**
   * Create AnalyticsCollector instance
   * @param projectRoot - Root directory for project (default: cwd)
   */
  constructor(private readonly projectRoot: string = process.cwd()) {
    this.dataPath = path.join(this.projectRoot, '.planning', 'analytics.json');
    this.enabled = isEnabled();
    this.ensureFile();
  }

  /**
   * Track an analytics event
   * Records event with timestamp, name, userId, and properties
   * @param event - Event data to record
   */
  async track(event: EventData): Promise<void> {
    if (!this.enabled) return;

    const eventRecord: AnalyticsEvent = {
      name: event.name || (event.type as string) || 'unknown',
      userId: event.userId,
      timestamp: typeof event.timestamp === 'string' 
        ? event.timestamp 
        : new Date(event.timestamp as number || Date.now()).toISOString(),
      properties: event.properties
    };

    this.ensureFile();
    const data = this.getAnalyticsData();
    data.events.push(eventRecord);
    this.saveAnalyticsData(data);
  }

  /**
   * Start a new analytics session
   * Generates unique session ID and creates session record
   * @param options - Session options including userId
   * @returns Session ID string
   */
  async startSession(options: SessionOptions = {}): Promise<string> {
    if (!this.enabled) {
      return `session-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    }

    const sessionId = `session-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    
    const session: Session = {
      id: sessionId,
      userId: options.userId,
      startTime: Date.now()
    };

    this.ensureFile();
    const data = this.getAnalyticsData();
    data.sessions.push(session);
    this.saveAnalyticsData(data);

    return sessionId;
  }

  /**
   * End an analytics session
   * Calculates duration and closes session
   * @param sessionId - ID of session to end
   */
  async endSession(sessionId: string): Promise<void> {
    if (!this.enabled) return;

    this.ensureFile();
    const data = this.getAnalyticsData();
    
    const session = data.sessions.find(s => s.id === sessionId);
    if (session) {
      session.endTime = Date.now();
      session.duration = session.endTime - session.startTime;
      this.saveAnalyticsData(data);
    }
  }

  /**
   * Get events with optional filtering
   * @param options - Filter options (name, userId)
   * @returns Filtered array of analytics events
   */
  getEvents(options?: { name?: string; userId?: string }): AnalyticsEvent[] {
    if (!this.enabled) return [];

    const data = this.getAnalyticsData();
    let events = data.events;

    if (options?.name) {
      events = events.filter(e => e.name === options.name);
    }

    if (options?.userId) {
      events = events.filter(e => e.userId === options.userId);
    }

    return events;
  }

  /**
   * Get analytics data from file
   * @returns Analytics data object
   */
  private getAnalyticsData(): AnalyticsData {
    if (!fs.existsSync(this.dataPath)) {
      return { events: [], sessions: [] };
    }
    const content = fs.readFileSync(this.dataPath, 'utf8');
    return JSON.parse(content) as AnalyticsData;
  }

  /**
   * Save analytics data to file
   * @param data - Analytics data to save
   */
  private saveAnalyticsData(data: AnalyticsData): void {
    const dir = path.dirname(this.dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Ensure analytics data file exists
   */
  private ensureFile(): void {
    const dir = path.dirname(this.dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.dataPath)) {
      fs.writeFileSync(this.dataPath, JSON.stringify({ events: [], sessions: [] }, null, 2), 'utf8');
    }
  }
}
