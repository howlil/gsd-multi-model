/**
 * Anomaly Detector — Statistical anomaly detection for security monitoring
 *
 * SEC-10: Anomaly detection
 *
 * Detects unusual patterns in system behavior using statistical methods.
 * Features:
 * - Baseline computation with configurable windows
 * - Z-score and IQR-based anomaly detection
 * - Multi-metric correlation analysis
 * - Adaptive threshold adjustment
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { defaultLogger as logger } from '../logger/index.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const ANOMALY_DIR = join(process.cwd(), '.planning', 'security', 'anomaly');
const BASELINE_FILE = join(ANOMALY_DIR, 'baseline.json');
const ANOMALIES_FILE = join(ANOMALY_DIR, 'anomalies.jsonl');

// ─── Type Definitions ────────────────────────────────────────────────────────

export type MetricType =
  | 'request_rate'
  | 'error_rate'
  | 'latency'
  | 'cpu_usage'
  | 'memory_usage'
  | 'disk_io'
  | 'network_io'
  | 'auth_failures'
  | 'file_operations'
  | 'api_calls'
  | 'token_usage'
  | 'cost_rate';

export interface DataPoint {
  timestamp: string;
  value: number;
  labels?: Record<string, string>;
}

export interface MetricBaseline {
  metric: MetricType;
  labels?: Record<string, string>;
  window: {
    size: number; // Number of data points
    unit: 'seconds' | 'minutes' | 'hours' | 'days';
  };
  statistics: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    median: number;
    p95: number;
    p99: number;
    iqr: {
      q1: number;
      q3: number;
      iqr: number;
    };
  };
  thresholds: {
    zScore: number; // Standard deviations for z-score
    iqrMultiplier: number; // IQR multiplier for outlier detection
    absoluteMin?: number;
    absoluteMax?: number;
  };
  lastUpdated: string;
  dataPoints: number;
}

export interface AnomalyDetectionConfig {
  zScoreThreshold: number; // Default: 3.0
  iqrMultiplier: number; // Default: 1.5
  minDataPoints: number; // Minimum points before detection starts
  windowSize: number; // Rolling window size for baseline
  sensitivity: 'low' | 'medium' | 'high';
  enableCorrelation: boolean;
}

export interface Anomaly {
  id: string;
  timestamp: string;
  metric: MetricType;
  labels?: Record<string, string>;
  value: number;
  expectedRange: {
    min: number;
    max: number;
  };
  deviation: {
    zScore: number;
    iqrDistance: number;
    percentFromMean: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectionMethod: 'zscore' | 'iqr' | 'absolute' | 'correlation';
  context: {
    baseline: MetricBaseline['statistics'];
    recentValues: number[];
    correlatedMetrics?: Array<{ metric: string; value: number }>;
  };
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
}

export interface AnomalyReport {
  period: {
    start: string;
    end: string;
  };
  totalAnomalies: number;
  bySeverity: Record<'low' | 'medium' | 'high' | 'critical', number>;
  byMetric: Record<MetricType, number>;
  byDetectionMethod: Record<'zscore' | 'iqr' | 'absolute' | 'correlation', number>;
  topAnomalies: Anomaly[];
  recommendations: string[];
}

// ─── Anomaly Detector ────────────────────────────────────────────────────────

export class AnomalyDetector {
  private baselines: Map<string, MetricBaseline> = new Map();
  private recentData: Map<string, DataPoint[]> = new Map();
  private anomalies: Anomaly[] = [];
  private config: AnomalyDetectionConfig;

  constructor(config?: Partial<AnomalyDetectionConfig>) {
    this.config = {
      zScoreThreshold: 3.0,
      iqrMultiplier: 1.5,
      minDataPoints: 30,
      windowSize: 100,
      sensitivity: 'medium',
      enableCorrelation: true,
      ...config
    };

    // Adjust thresholds based on sensitivity
    this.adjustForSensitivity();

    this.initAnomalyDetector();
  }

  private adjustForSensitivity(): void {
    switch (this.config.sensitivity) {
      case 'low':
        this.config.zScoreThreshold = 4.0;
        this.config.iqrMultiplier = 2.0;
        break;
      case 'medium':
        this.config.zScoreThreshold = 3.0;
        this.config.iqrMultiplier = 1.5;
        break;
      case 'high':
        this.config.zScoreThreshold = 2.0;
        this.config.iqrMultiplier = 1.0;
        break;
    }
  }

  private initAnomalyDetector(): void {
    try {
      if (!existsSync(ANOMALY_DIR)) {
        mkdirSync(ANOMALY_DIR, { recursive: true });
      }

      this.loadBaselines();
    } catch (err) {
      logger.warn('Failed to initialize anomaly detector', { error: (err as Error).message });
    }
  }

  private getBaselineKey(metric: MetricType, labels?: Record<string, string>): string {
    const labelStr = labels ? JSON.stringify(Object.entries(labels).sort()) : '';
    return `${metric}:${labelStr}`;
  }

  private loadBaselines(): void {
    try {
      if (existsSync(BASELINE_FILE)) {
        const data = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
        this.baselines = new Map(Object.entries(data));
        logger.info('Loaded anomaly baselines', { count: this.baselines.size });
      }
    } catch (err) {
      logger.warn('Failed to load baselines', { error: (err as Error).message });
    }
  }

  private saveBaselines(): void {
    try {
      const data: Record<string, MetricBaseline> = {};
      this.baselines.forEach((value, key) => {
        data[key] = value;
      });
      writeFileSync(BASELINE_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      logger.warn('Failed to save baselines', { error: (err as Error).message });
    }
  }

  private logAnomaly(anomaly: Anomaly): void {
    try {
      const line = JSON.stringify(anomaly) + '\n';
      const file = ANOMALIES_FILE;

      if (!existsSync(file)) {
        writeFileSync(file, line, 'utf8');
      } else {
        const content = readFileSync(file, 'utf8');
        const lines = content.split('\n').filter(l => l);
        
        // Keep last 1000 anomalies
        const recentLines = lines.slice(-999);
        writeFileSync(file, [...recentLines, line].join('\n'), 'utf8');
      }
    } catch (err) {
      logger.warn('Failed to log anomaly', { error: (err as Error).message });
    }
  }

  /**
   * Record a data point for a metric
   */
  record(metric: MetricType, value: number, labels?: Record<string, string>): Anomaly | null {
    const key = this.getBaselineKey(metric, labels);
    const now = new Date().toISOString();
    const dataPoint: DataPoint = { timestamp: now, value, labels };

    // Get or create recent data array
    let recentData = this.recentData.get(key) || [];
    recentData.push(dataPoint);

    // Maintain window size
    if (recentData.length > this.config.windowSize) {
      recentData = recentData.slice(-this.config.windowSize);
    }
    this.recentData.set(key, recentData);

    // Check if we have enough data for anomaly detection
    if (recentData.length < this.config.minDataPoints) {
      // Still building baseline
      this.updateBaseline(metric, recentData, labels);
      return null;
    }

    // Update baseline
    const baseline = this.updateBaseline(metric, recentData, labels);

    // Detect anomaly
    const anomaly = this.detectAnomaly(metric, value, baseline, labels, recentData);

    if (anomaly) {
      this.anomalies.push(anomaly);
      this.logAnomaly(anomaly);
      logger.warn('Anomaly detected', {
        metric,
        value,
        expectedMin: anomaly.expectedRange.min,
        expectedMax: anomaly.expectedRange.max,
        severity: anomaly.severity
      });
    }

    return anomaly;
  }

  /**
   * Update baseline statistics for a metric
   */
  private updateBaseline(
    metric: MetricType,
    dataPoints: DataPoint[],
    labels?: Record<string, string>
  ): MetricBaseline {
    const values = dataPoints.map(d => d.value);
    const sorted = [...values].sort((a, b) => a - b);

    const statistics = this.computeStatistics(values, sorted);
    const key = this.getBaselineKey(metric, labels);

    const baseline: MetricBaseline = {
      metric,
      labels,
      window: {
        size: this.config.windowSize,
        unit: 'minutes'
      },
      statistics,
      thresholds: {
        zScore: this.config.zScoreThreshold,
        iqrMultiplier: this.config.iqrMultiplier,
        absoluteMin: statistics.min - (statistics.stdDev * 5),
        absoluteMax: statistics.max + (statistics.stdDev * 5)
      },
      lastUpdated: new Date().toISOString(),
      dataPoints: values.length
    };

    this.baselines.set(key, baseline);
    this.saveBaselines();

    return baseline;
  }

  /**
   * Compute statistical measures
   */
  private computeStatistics(values: number[], sorted: number[]): MetricBaseline['statistics'] {
    const n = values.length;
    if (n === 0) {
      return {
        mean: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        median: 0,
        p95: 0,
        p99: 0,
        iqr: { q1: 0, q3: 0, iqr: 0 }
      };
    }

    // Mean
    const mean = values.reduce((a, b) => a + b, 0) / n;

    // Standard deviation
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Median
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    // Percentiles
    const p95 = sorted[Math.floor(n * 0.95)] || sorted[n - 1];
    const p99 = sorted[Math.floor(n * 0.99)] || sorted[n - 1];

    // IQR
    const q1 = sorted[Math.floor(n * 0.25)] || sorted[0];
    const q3 = sorted[Math.floor(n * 0.75)] || sorted[n - 1];
    const iqr = q3 - q1;

    return {
      mean,
      stdDev,
      min: sorted[0],
      max: sorted[n - 1],
      median,
      p95,
      p99,
      iqr: { q1, q3, iqr }
    };
  }

  /**
   * Detect anomaly using multiple methods
   */
  private detectAnomaly(
    metric: MetricType,
    value: number,
    baseline: MetricBaseline,
    labels?: Record<string, string>,
    recentData?: DataPoint[]
  ): Anomaly | null {
    const { statistics, thresholds } = baseline;
    const { mean, stdDev } = statistics;

    // Z-score detection
    const zScore = stdDev > 0 ? Math.abs(value - mean) / stdDev : 0;
    const isZScoreAnomaly = zScore > thresholds.zScore;

    // IQR detection
    const { q1, q3, iqr } = statistics.iqr;
    const lowerBound = q1 - (thresholds.iqrMultiplier * iqr);
    const upperBound = q3 + (thresholds.iqrMultiplier * iqr);
    const iqrDistance = value < q1
      ? (q1 - value) / iqr
      : value > q3
        ? (value - q3) / iqr
        : 0;
    const isIqrAnomaly = value < lowerBound || value > upperBound;

    // Absolute bounds detection
    const isAbsoluteAnomaly =
      (thresholds.absoluteMin !== undefined && value < thresholds.absoluteMin) ||
      (thresholds.absoluteMax !== undefined && value > thresholds.absoluteMax);

    // Determine if anomaly detected
    let detectionMethod: 'zscore' | 'iqr' | 'absolute' | 'correlation' | null = null;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (isAbsoluteAnomaly) {
      detectionMethod = 'absolute';
      severity = 'critical';
    } else if (isZScoreAnomaly && isIqrAnomaly) {
      detectionMethod = 'zscore';
      severity = zScore > 5 ? 'critical' : zScore > 4 ? 'high' : 'medium';
    } else if (isZScoreAnomaly) {
      detectionMethod = 'zscore';
      severity = 'low';
    } else if (isIqrAnomaly) {
      detectionMethod = 'iqr';
      severity = 'low';
    }

    if (!detectionMethod) {
      return null;
    }

    // Compute deviation metrics
    const percentFromMean = stdDev > 0 ? ((value - mean) / mean) * 100 : 0;

    // Get recent values for context
    const recentValues = (recentData || []).slice(-10).map(d => d.value);

    // Build anomaly record
    const anomaly: Anomaly = {
      id: `anomaly-${Date.now()}-${metric}`,
      timestamp: new Date().toISOString(),
      metric,
      labels,
      value,
      expectedRange: {
        min: Math.max(lowerBound, thresholds.absoluteMin ?? -Infinity),
        max: Math.min(upperBound, thresholds.absoluteMax ?? Infinity)
      },
      deviation: {
        zScore,
        iqrDistance,
        percentFromMean
      },
      severity,
      detectionMethod,
      context: {
        baseline: statistics,
        recentValues
      },
      status: 'new'
    };

    return anomaly;
  }

  /**
   * Get baseline for a metric
   */
  getBaseline(metric: MetricType, labels?: Record<string, string>): MetricBaseline | null {
    const key = this.getBaselineKey(metric, labels);
    return this.baselines.get(key) || null;
  }

  /**
   * Get recent anomalies
   */
  getAnomalies(options?: {
    metric?: MetricType;
    severity?: Anomaly['severity'];
    status?: Anomaly['status'];
    limit?: number;
    since?: Date;
  }): Anomaly[] {
    let anomalies = [...this.anomalies];

    if (options?.metric) {
      anomalies = anomalies.filter(a => a.metric === options.metric);
    }
    if (options?.severity) {
      anomalies = anomalies.filter(a => a.severity === options.severity);
    }
    if (options?.status) {
      anomalies = anomalies.filter(a => a.status === options.status);
    }
    if (options?.since) {
      anomalies = anomalies.filter(a => new Date(a.timestamp) >= options.since!);
    }

    // Sort by timestamp descending
    anomalies.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (options?.limit) {
      anomalies = anomalies.slice(0, options.limit);
    }

    return anomalies;
  }

  /**
   * Update anomaly status
   */
  updateAnomalyStatus(anomalyId: string, status: Anomaly['status']): boolean {
    const anomaly = this.anomalies.find(a => a.id === anomalyId);
    if (anomaly) {
      anomaly.status = status;
      return true;
    }
    return false;
  }

  /**
   * Generate anomaly report
   */
  generateReport(period?: { start?: Date; end?: Date }): AnomalyReport {
    let anomalies = [...this.anomalies];

    if (period?.start) {
      anomalies = anomalies.filter(a => new Date(a.timestamp) >= period.start!);
    }
    if (period?.end) {
      anomalies = anomalies.filter(a => new Date(a.timestamp) <= period.end!);
    }

    const report: AnomalyReport = {
      period: {
        start: period?.start?.toISOString() || anomalies[0]?.timestamp || '',
        end: period?.end?.toISOString() || anomalies[anomalies.length - 1]?.timestamp || ''
      },
      totalAnomalies: anomalies.length,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byMetric: {} as Record<MetricType, number>,
      byDetectionMethod: { zscore: 0, iqr: 0, absolute: 0, correlation: 0 },
      topAnomalies: [],
      recommendations: []
    };

    // Count by severity
    anomalies.forEach(a => {
      report.bySeverity[a.severity]++;
    });

    // Count by metric
    anomalies.forEach(a => {
      report.byMetric[a.metric] = (report.byMetric[a.metric] || 0) + 1;
    });

    // Count by detection method
    anomalies.forEach(a => {
      report.byDetectionMethod[a.detectionMethod]++;
    });

    // Top anomalies (by severity and deviation)
    report.topAnomalies = anomalies
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.deviation.zScore - a.deviation.zScore;
      })
      .slice(0, 10);

    // Generate recommendations
    report.recommendations = this.generateRecommendations(anomalies);

    return report;
  }

  /**
   * Generate recommendations based on anomaly patterns
   */
  private generateRecommendations(anomalies: Anomaly[]): string[] {
    const recommendations: string[] = [];

    // Check for critical anomalies
    const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push(
        `Investigate ${criticalCount} critical anomalies immediately - these indicate severe deviations from normal behavior`
      );
    }

    // Check for patterns by metric
    const metricCounts: Record<string, number> = {};
    anomalies.forEach(a => {
      metricCounts[a.metric] = (metricCounts[a.metric] || 0) + 1;
    });

    for (const [metric, count] of Object.entries(metricCounts)) {
      if (count >= 5) {
        recommendations.push(
          `Review ${metric} metric - ${count} anomalies detected, consider adjusting baseline or investigating root cause`
        );
      }
    }

    // Check for high z-score anomalies
    const highZScore = anomalies.filter(a => a.deviation.zScore > 4).length;
    if (highZScore > 0) {
      recommendations.push(
        `${highZScore} anomalies with z-score > 4 detected - consider reviewing threshold settings`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('No immediate action required - anomaly patterns within expected range');
    }

    return recommendations;
  }

  /**
   * Reset baseline for a metric
   */
  resetBaseline(metric: MetricType, labels?: Record<string, string>): void {
    const key = this.getBaselineKey(metric, labels);
    this.baselines.delete(key);
    this.recentData.delete(key);
    this.saveBaselines();
    logger.info('Baseline reset', { metric, labels });
  }

  /**
   * Clear all anomalies
   */
  clearAnomalies(): void {
    this.anomalies = [];
    logger.info('All anomalies cleared');
  }
}

// ─── Default Instance ────────────────────────────────────────────────────────

const defaultDetector = new AnomalyDetector();

export function recordMetric(
  metric: MetricType,
  value: number,
  labels?: Record<string, string>
): Anomaly | null {
  return defaultDetector.record(metric, value, labels);
}

export function getAnomalyBaseline(
  metric: MetricType,
  labels?: Record<string, string>
): MetricBaseline | null {
  return defaultDetector.getBaseline(metric, labels);
}

export function getAnomalies(options?: {
  metric?: MetricType;
  severity?: Anomaly['severity'];
  status?: Anomaly['status'];
  limit?: number;
  since?: Date;
}): Anomaly[] {
  return defaultDetector.getAnomalies(options);
}

export function generateAnomalyReport(period?: { start?: Date; end?: Date }): AnomalyReport {
  return defaultDetector.generateReport(period);
}

// ─── Default Export ─────────────────────────────────────────────────────────

export default AnomalyDetector;
