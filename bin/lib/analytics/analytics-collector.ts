/**
 * Analytics Collector — Feature usage event collection and local storage
 * Stores events in .planning/analytics/events.json
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Analytics event structure
 */
export interface AnalyticsEvent {
  /** Event timestamp */
  timestamp: string;
  /** Event type */
  eventType: string;
  /** User ID */
  userId: string;
  /** Event properties */
  properties: Record<string, unknown>;
}

/**
 * Event data input
 */
export interface EventData {
  /** Event type */
  type: string;
  /** User ID */
  userId?: string;
  /** Event properties */
  properties?: Record<string, unknown>;
}

export class AnalyticsCollector {
  private cwd: string;
  private eventsPath: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.eventsPath = path.join(this.cwd, '.planning', 'analytics', 'events.json');
    this.ensureDir();
  }

  /**
   * Track an analytics event
   * @param event - Event data { type, userId, properties }
   */
  async trackEvent(event: EventData): Promise<void> {
    const data: AnalyticsEvent = {
      timestamp: new Date().toISOString(),
      eventType: event.type,
      userId: event.userId || 'anonymous',
      properties: event.properties || {}
    };

    await this.appendToJsonFile(data);
  }

  /**
   * Get events by type
   * @param type - Event type to filter
   * @returns Filtered events
   */
  getEventsByType(type: string): AnalyticsEvent[] {
    if (!fs.existsSync(this.eventsPath)) return [];

    const events: AnalyticsEvent[] = JSON.parse(fs.readFileSync(this.eventsPath, 'utf8'));
    return events.filter(e => e.eventType === type);
  }

  /**
   * Get all events
   * @returns All events
   */
  getAllEvents(): AnalyticsEvent[] {
    if (!fs.existsSync(this.eventsPath)) return [];
    return JSON.parse(fs.readFileSync(this.eventsPath, 'utf8'));
  }

  /**
   * Ensure analytics directory exists
   */
  private ensureDir(): void {
    const dir = path.dirname(this.eventsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.eventsPath)) {
      fs.writeFileSync(this.eventsPath, '[]', 'utf8');
    }
  }

  /**
   * Append data to JSON file
   * @param data - Data to append
   */
  private async appendToJsonFile(data: AnalyticsEvent): Promise<void> {
    const events = this.getAllEvents();
    events.push(data);
    fs.writeFileSync(this.eventsPath, JSON.stringify(events, null, 2), 'utf8');
  }
}

/**
 * Track an analytics event
 * @param event - Event data
 * @param cwd - Working directory
 */
export async function trackEvent(event: EventData, cwd?: string): Promise<void> {
  const collector = new AnalyticsCollector(cwd);
  return collector.trackEvent(event);
}
