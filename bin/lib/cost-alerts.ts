'use strict';
/**
 * EZ Cost Alerts — Multi-threshold budget alert system
 * Triggers alerts at 50%, 75%, and 90% budget usage
 * With duplicate prevention (24h window)
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Alert threshold percentages
 */
const THRESHOLDS = {
  INFO: 50,
  WARNING: 75,
  CRITICAL: 90
} as const;

/**
 * Duplicate prevention window in milliseconds (24 hours)
 */
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

interface Alert {
  threshold: number;
  level: string;
  percentUsed: number;
  totalSpent: number;
  budget: number;
  message: string;
  timestamp: string;
}

interface CheckThresholdsOptions {
  percentUsed: number;
  totalSpent: number;
  budget: number;
}

interface AlertsData {
  alerts: Alert[];
  lastUpdated?: string;
}

class CostAlerts {
  private cwd: string;
  private planningDir: string;
  private alertsFile: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.planningDir = path.join(this.cwd, '.planning');
    this.alertsFile = path.join(this.planningDir, 'alerts.json');
    this._ensurePlanningDir();
  }

  /**
   * Ensure .planning directory exists
   */
  private _ensurePlanningDir(): void {
    if (!fs.existsSync(this.planningDir)) {
      fs.mkdirSync(this.planningDir, { recursive: true });
    }
  }

  /**
   * Load existing alerts from file
   * @returns Existing alerts
   */
  private _loadAlerts(): Alert[] {
    try {
      if (fs.existsSync(this.alertsFile)) {
        const data = JSON.parse(fs.readFileSync(this.alertsFile, 'utf8')) as AlertsData;
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
    const data: AlertsData = {
      alerts,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(this.alertsFile, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Check if alert is duplicate within 24h window
   * @param existingAlerts - Existing alerts
   * @param newAlert - New alert to check
   * @returns True if duplicate
   */
  private _isDuplicate(existingAlerts: Alert[], newAlert: Alert): boolean {
    const now = new Date().getTime();
    return existingAlerts.some(alert => {
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
  checkThresholds(opts: CheckThresholdsOptions): Alert[] {
    const { percentUsed, totalSpent, budget } = opts;
    const triggered: Alert[] = [];

    const thresholds = [
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
   */
  private _buildMessage(level: string, threshold: number, percentUsed: number, totalSpent: number, budget: number): string {
    const levelMessages: Record<string, string> = {
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
  getAlertsByLevel(level: string): Alert[] {
    const alerts = this._loadAlerts();
    return alerts.filter(alert => alert.level === level);
  }
}

// Export thresholds as static property
(CostAlerts as typeof CostAlerts & { THRESHOLDS: typeof THRESHOLDS }).THRESHOLDS = THRESHOLDS;

export default CostAlerts;

export { THRESHOLDS, CostAlerts };

export type { Alert, CheckThresholdsOptions, AlertsData };
