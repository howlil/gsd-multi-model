/**
 * Analytics Reporter — Aggregated analytics report generation
 * Generates reports from events, NPS, funnels, and cohorts
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Analytics report options
 */
export interface AnalyticsReportOptions {
  /** Include NPS data */
  includeNps?: boolean;
  /** Include funnel data */
  includeFunnels?: boolean;
  /** Include cohort data */
  includeCohorts?: boolean;
}

/**
 * NPS result structure
 */
interface NpsResult {
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
}

/**
 * Analytics report structure
 */
export interface AnalyticsReport {
  /** Report timestamp */
  timestamp: string;
  /** Report summary */
  summary: {
    totalEvents: number;
    uniqueEventTypes: number;
    npsScore: number;
  };
  /** Events data */
  events: {
    byType: Record<string, number>;
    recent: unknown[];
  };
  /** NPS data */
  nps: NpsResult;
  /** Recommendations */
  recommendations: Array<{ category: string; priority: string; suggestion: string }>;
}

export class AnalyticsReporter {
  private cwd: string;
  private reportsDir: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.reportsDir = path.join(this.cwd, '.planning', 'analytics', 'reports');
    this.ensureDir();
  }

  /**
   * Generate aggregated analytics report
   * @param options - Report options
   * @returns Analytics report
   */
  async generateReport(options: AnalyticsReportOptions = {}): Promise<AnalyticsReport> {
    const { calculateNPS } = await import('./nps-tracker.js');
    const { AnalyticsCollector } = await import('./analytics-collector.js');

    const collector = new AnalyticsCollector(this.cwd);
    const events = collector.getAllEvents();
    const nps = calculateNPS(this.cwd);

    // Group events by type
    const eventsByType: Record<string, number> = {};
    for (const event of events) {
      const eventType = event.eventType;
      if (eventType) {
        if (!eventsByType[eventType]) {
          eventsByType[eventType] = 0;
        }
        eventsByType[eventType]++;
      }
    }

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalEvents: events.length,
        uniqueEventTypes: Object.keys(eventsByType).length,
        npsScore: nps.score
      },
      events: {
        byType: eventsByType,
        recent: events.slice(-10)
      },
      nps,
      recommendations: this.generateRecommendations(events, nps)
    };
  }

  /**
   * Save report to file
   * @param report - Report to save
   * @param filename - Optional filename
   * @returns Path to saved report
   */
  saveReport(report: AnalyticsReport, filename?: string): string {
    const reportFilename = filename || `analytics-${Date.now()}.json`;
    const reportPath = path.join(this.reportsDir, reportFilename);

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    return reportPath;
  }

  /**
   * Generate recommendations from analytics
   * @param events - Events array
   * @param nps - NPS data
   * @returns Recommendations
   */
  private generateRecommendations(events: unknown[], nps: NpsResult): Array<{ category: string; priority: string; suggestion: string }> {
    const recommendations: Array<{ category: string; priority: string; suggestion: string }> = [];

    if (nps.score < 0) {
      recommendations.push({
        category: 'nps',
        priority: 'high',
        suggestion: 'NPS is negative — investigate detractor feedback'
      });
    }

    if (events.length < 100) {
      recommendations.push({
        category: 'tracking',
        priority: 'medium',
        suggestion: 'Low event volume — ensure all key actions are tracked'
      });
    }

    return recommendations;
  }

  /**
   * Ensure reports directory exists
   */
  private ensureDir(): void {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }
}

/**
 * Generate analytics report
 * @param options - Report options
 * @param cwd - Working directory
 * @returns Analytics report
 */
export async function generateReport(options: AnalyticsReportOptions = {}, cwd?: string): Promise<AnalyticsReport> {
  const reporter = new AnalyticsReporter(cwd);
  return reporter.generateReport(options);
}

/**
 * Save analytics report
 * @param report - Report to save
 * @param filename - Filename
 * @param cwd - Working directory
 * @returns Path to saved report
 */
export function saveReport(report: AnalyticsReport, filename: string, cwd?: string): string {
  const reporter = new AnalyticsReporter(cwd);
  return reporter.saveReport(report, filename);
}
