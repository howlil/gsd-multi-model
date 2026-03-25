/**
 * Perf Reporter — Performance report generation
 * Generates structured reports (temp directory)
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Performance analysis results structure
 */
export interface PerfResults {
  /** Timestamp of analysis */
  timestamp?: string;
  /** Database analysis results */
  db?: { suggestions?: unknown[] } | null;
  /** Frontend analysis results */
  frontend?: { performance?: number } | null;
  /** API analysis results */
  api?: Array<{ latency?: number }> | null;
  /** Array of error messages */
  errors?: string[];
}

/**
 * Performance report summary
 */
export interface ReportSummary {
  /** Number of database issues */
  dbIssues: number;
  /** Frontend performance score */
  frontendScore: number;
  /** Average API latency */
  apiLatency: number;
}

/**
 * Structured performance report
 */
export interface PerfReport {
  /** Report timestamp */
  timestamp: string;
  /** Report summary */
  summary: ReportSummary;
  /** Detailed results */
  details: {
    db: unknown | null;
    frontend: unknown | null;
    api: unknown | null;
  };
  /** Array of errors */
  errors: string[];
  /** Recommendations */
  recommendations: Array<{ category: string; priority: string; suggestion: string }>;
}

export class PerfReporter {
  private cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
  }

  /**
   * Generate structured performance report
   * @param results - Analysis results from PerfAnalyzer
   * @returns Structured report
   */
  generateReport(results: PerfResults): PerfReport {
    return {
      timestamp: results.timestamp || new Date().toISOString(),
      summary: {
        dbIssues: results.db?.suggestions?.length || 0,
        frontendScore: results.frontend?.performance || 0,
        apiLatency: results.api ? this.calculateAvgLatency(results.api) : 0
      },
      details: {
        db: results.db || null,
        frontend: results.frontend || null,
        api: results.api || null
      },
      errors: results.errors || [],
      recommendations: this.generateRecommendations(results)
    };
  }

  /**
   * Save report to temp directory
   * @param report - Report to save
   * @param filename - Optional filename
   * @returns Path to saved report
   */
  saveReport(report: PerfReport, filename?: string): string {
    const logsDir = path.join(process.env.TEMP || process.env.TMPDIR || '/tmp', 'ez-agents-perf');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const reportFilename = filename || `perf-${Date.now()}.json`;
    const reportPath = path.join(logsDir, reportFilename);

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    return reportPath;
  }

  /**
   * Calculate average latency from API results
   * @param apiResults - API latency results
   * @returns Average latency
   */
  private calculateAvgLatency(apiResults: Array<{ latency?: number }>): number {
    if (!apiResults || apiResults.length === 0) return 0;
    const valid = apiResults.filter((r): r is { latency: number } => r.latency !== undefined && r.latency > 0);
    if (valid.length === 0) return 0;
    return Math.round(valid.reduce((sum, r) => sum + r.latency, 0) / valid.length);
  }

  /**
   * Generate recommendations from analysis results
   * @param results - Analysis results
   * @returns Recommendations
   */
  private generateRecommendations(results: PerfResults): Array<{ category: string; priority: string; suggestion: string }> {
    const recommendations: Array<{ category: string; priority: string; suggestion: string }> = [];

    if (results.db?.suggestions && results.db.suggestions.length > 0) {
      recommendations.push({
        category: 'database',
        priority: 'high',
        suggestion: `Address ${results.db.suggestions.length} query optimization opportunities`
      });
    }

    if (results.frontend && results.frontend.performance !== undefined && results.frontend.performance < 50) {
      recommendations.push({
        category: 'frontend',
        priority: 'critical',
        suggestion: 'Frontend performance score is low - optimize bundle size and Core Web Vitals'
      });
    }

    return recommendations;
  }
}

/**
 * Generate structured performance report
 * @param results - Analysis results from PerfAnalyzer
 * @returns Structured report
 */
export function generateReport(results: PerfResults): PerfReport {
  const reporter = new PerfReporter();
  return reporter.generateReport(results);
}

/**
 * Save report to temp directory
 * @param report - Report to save
 * @param filename - Optional filename
 * @returns Path to saved report
 */
export function saveReport(report: PerfReport, filename?: string): string {
  const reporter = new PerfReporter();
  return reporter.saveReport(report, filename);
}
