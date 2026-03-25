/**
 * Cost Reporter — Cost breakdown by phase/operation/provider with trend analysis
 * Generates detailed cost reports from cost-tracker data
 */

import fs from 'fs';
import path from 'path';
import { CostTracker } from '../cost-tracker.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface CostReportOptions {
  [key: string]: any;
}

export interface CostTrend {
  timestamp: string;
  total: number;
}

export interface CostRecommendation {
  category: string;
  phase?: string;
  provider?: string;
  suggestion: string;
}

export interface CostReport {
  timestamp: string;
  total: { cost: number };
  byPhase: Record<string, { cost: number }>;
  byProvider: Record<string, { cost: number }>;
  trend: CostTrend[];
  recommendations: CostRecommendation[];
}

// ─── CostReporter Class ──────────────────────────────────────────────────────

export class CostReporter {
  private cwd: string;
  private metricsPath: string;
  private reportsDir: string;

  /**
   * Create a CostReporter instance
   * @param cwd - Working directory (defaults to process.cwd())
   */
  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.metricsPath = path.join(this.cwd, '.planning', 'metrics.json');
    this.reportsDir = path.join(this.cwd, '.planning', 'finops', 'reports');
    this.ensureDir();
  }

  /**
   * Generate cost breakdown report
   * @param options - Report options
   * @returns Cost report
   */
  generateReport(options: CostReportOptions = {}): CostReport {
    const tracker = new CostTracker(this.cwd);
    const data = tracker.aggregate();

    const report: CostReport = {
      timestamp: new Date().toISOString(),
      total: data.total,
      byPhase: data.by_phase || {},
      byProvider: data.by_provider || {},
      trend: this.calculateTrend(data),
      recommendations: this.generateRecommendations(data)
    };

    return report;
  }

  /**
   * Save report to file
   * @param report - Report to save
   * @param filename - Optional filename
   * @returns Path to saved report
   */
  saveReport(report: CostReport, filename?: string): string {
    const reportFilename = filename || `cost-${Date.now()}.json`;
    const reportPath = path.join(this.reportsDir, reportFilename);

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    return reportPath;
  }

  /**
   * Calculate cost trend
   * @param data - Aggregated cost data
   * @returns Trend data
   */
  private calculateTrend(data: any): CostTrend[] {
    // Placeholder - would track historical trend
    return [{
      timestamp: new Date().toISOString(),
      total: data.total.cost || 0
    }];
  }

  /**
   * Generate cost optimization recommendations
   * @param data - Cost data
   * @returns Recommendations
   */
  private generateRecommendations(data: any): CostRecommendation[] {
    const recommendations: CostRecommendation[] = [];

    // Check for high-cost phases
    for (const [phase, costs] of Object.entries(data.by_phase || {})) {
      const costValue = (costs as { cost: number }).cost;
      if (costValue > 10) {
        recommendations.push({
          category: 'phase',
          phase,
          suggestion: `High cost phase ($${costValue}) — review operation efficiency`
        });
      }
    }

    // Check for expensive providers
    for (const [provider, costs] of Object.entries(data.by_provider || {})) {
      const costValue = (costs as { cost: number }).cost;
      if (costValue > 5) {
        recommendations.push({
          category: 'provider',
          provider,
          suggestion: `Consider alternative models for ${provider}`
        });
      }
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

// ─── Functional Exports ──────────────────────────────────────────────────────

/**
 * Generate cost report
 * @param options - Report options
 * @param cwd - Working directory
 * @returns Cost report
 */
export function generateReport(options: CostReportOptions = {}, cwd?: string): CostReport {
  const reporter = new CostReporter(cwd);
  return reporter.generateReport(options);
}

/**
 * Save cost report
 * @param report - Report to save
 * @param filename - Filename
 * @param cwd - Working directory
 * @returns Path to saved report
 */
export function saveReport(report: CostReport, filename?: string, cwd?: string): string {
  const reporter = new CostReporter(cwd);
  return reporter.saveReport(report, filename);
}
