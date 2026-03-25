#!/usr/bin/env node

/**
 * EZ Cost Alerts — Multi-threshold budget alert system
 * Triggers alerts at 50%, 75%, and 90% budget usage
 * With duplicate prevention (24h window)
 *
 * Usage:
 *   import { CostAlerts, THRESHOLDS } from './cost-alerts.js';
 *   const alerts = new CostAlerts(cwd);
 *   const triggered = alerts.checkThresholds({ percentUsed: 80, totalSpent: 80, budget: 100 });
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Alert threshold percentages
 */
export const THRESHOLDS = {
  INFO: 50,
  WARNING: 75,
  CRITICAL: 90
} as const;

/**
 * Duplicate prevention window in milliseconds (24 hours)
 */
export const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

// ─── Type Definitions ────────────────────────────────────────────────────────

export type AlertLevel = 'info' | 'warning' | 'critical';

export interface Alert {
  threshold: number;
  level: AlertLevel;
  percentUsed: number;
  totalSpent: number;
  budget: number;
  message: string;
  timestamp: string;
}

export interface AlertOptions {
  percentUsed: number;
  totalSpent: number;
  budget: number;
}

export interface CostAlertsConfig {
  cwd?: string;
}

// ─── Cost Alerts Class ──────────────────────────────────────────────────────

/**
 * Cost Alerts class for managing budget alerts
 */
export class CostAlerts {
  private readonly cwd: string;
  private readonly planningDir: string;
  private readonly alertsFile: string;

  /**
   * Create a CostAlerts instance
   * @param config - Configuration options
   */
  constructor(config: CostAlertsConfig = {}) {
    this.cwd = config.cwd ?? process.cwd();
    this.planningDir = join(this.cwd, '.planning');
    this.alertsFile = join(this.planningDir, 'alerts.json');
    this._ensurePlanningDir();
  }

  /**
   * Ensure .planning directory exists
   */
  private _ensurePlanningDir(): void {
    if (!existsSync(this.planningDir)) {
      mkdirSync(this.planningDir, { recursive: true });
    }
  }

  /**
   * Load existing alerts from file
   * @returns Existing alerts
   */
  private _loadAlerts(): Alert[] {
    try {
      if (existsSync(this.alertsFile)) {
        const data = JSON.parse(readFileSync(this.alertsFile, 'utf8'));
        return data.alerts || [];
      }
    } catch {
      // File corrupted or unreadable, start fresh
    }
    return [];
  }

  /**
   * Save alerts to file
   * @param alerts - Alerts to save
   */
  private _saveAlerts(alerts: Alert[]): void {
    const data = {
      alerts,
      lastUpdated: new Date().toISOString()
    };
    writeFileSync(this.alertsFile, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Check if alert is duplicate within 24h window
   * @param existingAlerts - Existing alerts
   * @param newAlert - New alert to check
   * @returns True if duplicate
   */
  private _isDuplicate(existingAlerts: Alert[], newAlert: Alert): boolean {
    const now = new Date().getTime();
    return existingAlerts.some((alert) => {
      if (alert.threshold !== newAlert.threshold || alert.level !== newAlert.level) {
        return false;
      }
      const alertTime = new Date(alert.timestamp).getTime();
      return (now - alertTime) < DUPLICATE_WINDOW_MS;
    });
  }

  /**
   * Check thresholds and return triggered alerts
   * @param opts - Alert options
   * @returns Array of triggered alerts
   */
  checkThresholds(opts: AlertOptions): Alert[] {
    const { percentUsed, totalSpent, budget } = opts;
    const triggered: Alert[] = [];

    const thresholds: Array<{ level: AlertLevel; threshold: number }> = [
      { level: 'info', threshold: THRESHOLDS.INFO },
      { level: 'warning', threshold: THRESHOLDS.WARNING },
      { level: 'critical', threshold: THRESHOLDS.CRITICAL }
    ];

    for (const { level, threshold } of thresholds) {
      if (percentUsed >= threshold) {
        triggered.push({
          threshold,
          level,
          percentUsed,
          totalSpent,
          budget,
          message: this._buildMessage(level, threshold, percentUsed, totalSpent, budget),
          timestamp: new Date().toISOString()
        });
      }
    }

    return triggered;
  }

  /**
   * Build alert message
   * @private
   */
  private _buildMessage(level: AlertLevel, _threshold: number, percentUsed: number, totalSpent: number, budget: number): string {
    const levelMessages: Record<AlertLevel, string> = {
      info: 'Budget usage has reached',
      warning: 'Budget usage is getting high at',
      critical: 'CRITICAL: Budget usage is very high at'
    };
    return `${levelMessages[level]} ${percentUsed.toFixed(1)}% (${totalSpent.toFixed(2)}/${budget.toFixed(2)})`;
  }

  /**
   * Log alert to alerts.json with duplicate prevention
   * @param alert - Alert object to log
   */
  async logAlert(alert: Alert): Promise<void> {
    const existingAlerts = this._loadAlerts();

    // Check for duplicates
    if (this._isDuplicate(existingAlerts, alert)) {
      return; // Skip duplicate
    }

    existingAlerts.push(alert);
    this._saveAlerts(existingAlerts);
  }

  /**
   * Get all alerts
   * @returns All alerts
   */
  getAlerts(): Alert[] {
    return this._loadAlerts();
  }

  /**
   * Get alerts by level
   * @param level - Alert level (info, warning, critical)
   * @returns Filtered alerts
   */
  getAlertsByLevel(level: AlertLevel): Alert[] {
    const alerts = this._loadAlerts();
    return alerts.filter((alert) => alert.level === level);
  }
}

// ─── Default Export ─────────────────────────────────────────────────────────

export default CostAlerts;
