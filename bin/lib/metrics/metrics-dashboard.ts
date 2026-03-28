/**
 * Metrics Dashboard — Markdown-based performance dashboard
 *
 * Generates markdown dashboard from collected metrics.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { MetricsCollector, PhaseMetrics } from './metrics-collector.js';
import { defaultLogger as logger } from '../logger/index.js';

const DASHBOARD_FILE = join(process.cwd(), '.planning', 'metrics', 'dashboard.md');

export class MetricsDashboard {
  constructor(private collector: MetricsCollector) {}

  async generate(): Promise<void> {
    const metrics = this.collector.getMetrics();
    const latest = this.collector.getLatestMetrics();
    const last30Days = this.getLast30Days(metrics);

    const dashboard = this.renderDashboard(latest, last30Days);

    try {
      const dir = join(process.cwd(), '.planning', 'metrics');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(DASHBOARD_FILE, dashboard, 'utf8');
      logger.info('Dashboard generated', { file: DASHBOARD_FILE });
    } catch (err) {
      logger.error('Failed to generate dashboard', { error: (err as Error).message });
    }
  }

  private getLast30Days(metrics: PhaseMetrics[]): PhaseMetrics[] {
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return metrics.filter(m => new Date(m.timestamp).getTime() > cutoff);
  }

  private renderDashboard(latest: PhaseMetrics | null, last30Days: PhaseMetrics[]): string {
    const date = new Date().toISOString().split('T')[0];

    let md = `# Performance Dashboard\n\n`;
    md += `**Generated:** ${date}\n\n`;

    // Current Phase
    md += `## Current Phase\n\n`;
    if (latest) {
      md += `| Metric | Value | Target | Status |\n`;
      md += `|--------|-------|--------|--------|\n`;
      md += `| Duration | ${(latest.duration.totalMs / 3600000).toFixed(1)}h | <4h | ${latest.duration.totalMs < 4 * 3600000 ? '✅' : '❌'} |\n`;
      md += `| Cost | $${latest.cost.usd.toFixed(2)} | <$1.00 | ${latest.cost.usd < 1.00 ? '✅' : '❌'} |\n`;
      md += `| Token Usage | ${(latest.cost.tokens / 1000).toFixed(1)}K | <100K | ${latest.cost.tokens < 100000 ? '✅' : '❌'} |\n`;
      md += `| Success Rate | ${latest.successRate.phase.toFixed(0)}% | >95% | ${latest.successRate.phase > 95 ? '✅' : '❌'} |\n`;
    } else {
      md += `*No metrics collected yet*\n\n`;
    }

    // Trends
    md += `\n## Trends (Last 30 Days)\n\n`;
    md += `### Duration Trend\n\n`;
    md += this.renderTrendTable(last30Days, 'duration');
    
    md += `\n### Cost Trend\n\n`;
    md += this.renderTrendTable(last30Days, 'cost');
    
    md += `\n### Token Efficiency\n\n`;
    md += this.renderTrendTable(last30Days, 'tokenEfficiency');

    // Alerts
    md += `\n## Alerts\n\n`;
    const alerts = this.checkAlerts(latest);
    if (alerts.length === 0) {
      md += `- [ ] No active alerts\n`;
    } else {
      for (const alert of alerts) {
        md += `- [${alert.severity === 'critical' ? 'x' : ' '}] **${alert.severity.toUpperCase()}:** ${alert.message}\n`;
      }
    }

    md += `\n---\n\n*Last updated: ${date}*\n`;

    return md;
  }

  private renderTrendTable(metrics: PhaseMetrics[], metricType: string): string {
    if (metrics.length === 0) return '*No data*\n';

    let md = `| Date | Phase | Value |\n`;
    md += `|------|-------|-------|\n`;

    for (const m of metrics.slice(-7)) { // Last 7 data points
      const value = this.getMetricValue(m, metricType);
      md += `| ${m.timestamp.split('T')[0]} | ${m.phase} | ${value} |\n`;
    }

    return md;
  }

  private getMetricValue(m: PhaseMetrics, type: string): string {
    switch (type) {
      case 'duration': return `${(m.duration.totalMs / 3600000).toFixed(1)}h`;
      case 'cost': return `$${m.cost.usd.toFixed(2)}`;
      case 'tokenEfficiency': return `${(100 - m.tokenEfficiency.wastePercent).toFixed(0)}% efficient`;
      default: return 'N/A';
    }
  }

  private checkAlerts(latest: PhaseMetrics | null): Array<{ severity: 'warning' | 'critical'; message: string }> {
    const alerts: Array<{ severity: 'warning' | 'critical'; message: string }> = [];

    if (!latest) return alerts;

    // Duration alerts
    if (latest.duration.totalMs > 4 * 3600000) {
      alerts.push({ severity: 'critical', message: `Phase duration ${(latest.duration.totalMs / 3600000).toFixed(1)}h exceeds 4h SLA` });
    } else if (latest.duration.totalMs > 2 * 3600000) {
      alerts.push({ severity: 'warning', message: `Phase duration ${(latest.duration.totalMs / 3600000).toFixed(1)}h exceeds 2h warning threshold` });
    }

    // Cost alerts
    if (latest.cost.usd > 4.00) {
      alerts.push({ severity: 'critical', message: `Phase cost $${latest.cost.usd.toFixed(2)} exceeds $4.00 critical threshold` });
    } else if (latest.cost.usd > 2.00) {
      alerts.push({ severity: 'warning', message: `Phase cost $${latest.cost.usd.toFixed(2)} exceeds $2.00 warning threshold` });
    }

    // Error rate alerts
    if (latest.errorRate.total > 10) {
      alerts.push({ severity: 'critical', message: `Error rate ${latest.errorRate.total}% exceeds 10% critical threshold` });
    } else if (latest.errorRate.total > 5) {
      alerts.push({ severity: 'warning', message: `Error rate ${latest.errorRate.total}% exceeds 5% warning threshold` });
    }

    return alerts;
  }
}
