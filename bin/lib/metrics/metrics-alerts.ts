/**
 * Metrics Alerting — Performance alert system
 *
 * Checks thresholds and creates alerts for performance regressions.
 */

import { writeFileSync, mkdirSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';
import { MetricsCollector, PhaseMetrics } from './metrics-collector.js';
import { defaultLogger as logger } from '../logger/index.js';

const ALERTS_FILE = join(process.cwd(), '.planning', 'metrics', 'alerts.md');

export interface Alert {
  severity: 'warning' | 'critical';
  type: string;
  message: string;
  phase: number;
  timestamp: string;
  value: number;
  threshold: number;
}

export class MetricsAlerts {
  constructor(private collector: MetricsCollector) {}

  async checkAlerts(): Promise<Alert[]> {
    const latest = this.collector.getLatestMetrics();
    if (!latest) return [];

    const alerts: Alert[] = [];

    // Duration alerts
    const durationHours = latest.duration.totalMs / 3600000;
    if (durationHours > 4) {
      alerts.push(this.createAlert('critical', 'duration', latest, durationHours, 4, 
        `Phase duration ${durationHours.toFixed(1)}h exceeds 4h SLA`));
    } else if (durationHours > 2) {
      alerts.push(this.createAlert('warning', 'duration', latest, durationHours, 2,
        `Phase duration ${durationHours.toFixed(1)}h exceeds 2h warning threshold`));
    }

    // Cost alerts
    if (latest.cost.usd > 4.00) {
      alerts.push(this.createAlert('critical', 'cost', latest, latest.cost.usd, 4.00,
        `Phase cost $${latest.cost.usd.toFixed(2)} exceeds $4.00 critical threshold`));
    } else if (latest.cost.usd > 2.00) {
      alerts.push(this.createAlert('warning', 'cost', latest, latest.cost.usd, 2.00,
        `Phase cost $${latest.cost.usd.toFixed(2)} exceeds $2.00 warning threshold`));
    }

    // Error rate alerts
    if (latest.errorRate.total > 10) {
      alerts.push(this.createAlert('critical', 'error_rate', latest, latest.errorRate.total, 10,
        `Error rate ${latest.errorRate.total}% exceeds 10% critical threshold`));
    } else if (latest.errorRate.total > 5) {
      alerts.push(this.createAlert('warning', 'error_rate', latest, latest.errorRate.total, 5,
        `Error rate ${latest.errorRate.total}% exceeds 5% warning threshold`));
    }

    // Log alerts
    for (const alert of alerts) {
      await this.logAlert(alert);
    }

    return alerts;
  }

  private createAlert(
    severity: 'warning' | 'critical',
    type: string,
    metrics: PhaseMetrics,
    value: number,
    threshold: number,
    message: string
  ): Alert {
    return {
      severity,
      type,
      message,
      phase: metrics.phase,
      timestamp: new Date().toISOString(),
      value,
      threshold
    };
  }

  private async logAlert(alert: Alert): Promise<void> {
    try {
      const dir = join(process.cwd(), '.planning', 'metrics');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const entry = `| ${alert.timestamp.split('T')[0]} | ${alert.severity.toUpperCase()} | ${alert.type} | ${alert.message} |\n`;
      
      if (!existsSync(ALERTS_FILE)) {
        writeFileSync(ALERTS_FILE, 
          `# Performance Alerts\n\n| Date | Severity | Type | Message |\n|------|----------|------|--------|\n${entry}`, 
          'utf8'
        );
      } else {
        appendFileSync(ALERTS_FILE, entry, 'utf8');
      }

      logger.warn('Alert logged', { 
        severity: alert.severity, 
        type: alert.type,
        message: alert.message 
      });
    } catch (err) {
      logger.error('Failed to log alert', { error: (err as Error).message });
    }
  }
}
