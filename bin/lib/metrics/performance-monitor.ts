/**
 * Performance Monitor — Comprehensive performance monitoring system
 *
 * PERF-01: Performance metrics collection
 * PERF-02: Metrics aggregation
 * PERF-03: Performance dashboard
 * PERF-04: Alerting system
 * PERF-05: Performance trending
 * PERF-06: Capacity planning
 * PERF-07: Performance reporting
 *
 * Features:
 * - Real-time metrics collection
 * - Statistical aggregation
 * - Markdown dashboard generation
 * - Threshold-based alerting
 * - Trend analysis and forecasting
 * - Capacity planning recommendations
 * - Comprehensive reporting
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { defaultLogger as logger } from '../logger/index.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const PERF_DIR = join(process.cwd(), '.planning', 'performance');
const METRICS_FILE = join(PERF_DIR, 'metrics.jsonl');
const AGGREGATED_FILE = join(PERF_DIR, 'aggregated.json');
const ALERTS_FILE = join(PERF_DIR, 'alerts.md');
const DASHBOARD_FILE = join(PERF_DIR, 'dashboard.md');
const TRENDS_FILE = join(PERF_DIR, 'trends.json');
const CAPACITY_FILE = join(PERF_DIR, 'capacity.json');
const REPORTS_DIR = join(PERF_DIR, 'reports');

// ─── Type Definitions ────────────────────────────────────────────────────────

export type MetricType =
  | 'duration'
  | 'throughput'
  | 'latency'
  | 'cpu_usage'
  | 'memory_usage'
  | 'disk_io'
  | 'network_io'
  | 'error_rate'
  | 'success_rate'
  | 'cost'
  | 'token_usage'
  | 'queue_depth'
  | 'active_agents'
  | 'task_completion';

export type AggregationType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'p50' | 'p95' | 'p99';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type TrendDirection = 'increasing' | 'decreasing' | 'stable';

export interface RawMetric {
  timestamp: string;
  type: MetricType;
  value: number;
  unit: string;
  labels: Record<string, string>;
  source: string;
}

export interface AggregatedMetric {
  period: {
    start: string;
    end: string;
  };
  type: MetricType;
  labels: Record<string, string>;
  aggregations: {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
    stdDev: number;
  };
  samples: number;
}

export interface AlertConfig {
  id: string;
  name: string;
  metric: MetricType;
  condition: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'between';
  threshold: number;
  thresholdMax?: number; // For 'between' condition
  severity: AlertSeverity;
  cooldown: number; // milliseconds before re-alerting
  enabled: boolean;
  notify: string[];
}

export interface Alert {
  id: string;
  configId: string;
  timestamp: string;
  metric: MetricType;
  value: number;
  threshold: number;
  severity: AlertSeverity;
  message: string;
  status: 'firing' | 'resolved' | 'acknowledged';
  resolvedAt?: string;
}

export interface TrendAnalysis {
  metric: MetricType;
  labels: Record<string, string>;
  period: {
    start: string;
    end: string;
  };
  direction: TrendDirection;
  slope: number; // Rate of change per day
  forecast: {
    '1day': number;
    '7day': number;
    '30day': number;
  };
  confidence: number; // 0-1
  seasonality?: {
    period: string;
    pattern: number[];
  };
}

export interface CapacityPlan {
  resource: string;
  current: {
    usage: number;
    capacity: number;
    utilization: number;
  };
  projected: {
    '7day': { usage: number; utilization: number; daysUntilFull?: number };
    '30day': { usage: number; utilization: number; daysUntilFull?: number };
    '90day': { usage: number; utilization: number; daysUntilFull?: number };
  };
  recommendations: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    impact: string;
    cost?: number;
  }>;
  risks: string[];
}

export interface PerformanceReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    healthScore: number;
    totalMetrics: number;
    alertsFired: number;
    anomaliesDetected: number;
  };
  metrics: {
    duration?: AggregatedMetric;
    throughput?: AggregatedMetric;
    latency?: AggregatedMetric;
    cpuUsage?: AggregatedMetric;
    memoryUsage?: AggregatedMetric;
    errorRate?: AggregatedMetric;
    cost?: AggregatedMetric;
  };
  trends: TrendAnalysis[];
  alerts: Alert[];
  capacity: CapacityPlan[];
  recommendations: string[];
}

export interface PerformanceConfig {
  collectionInterval: number; // milliseconds
  retentionDays: number;
  aggregationWindows: Array<{
    window: string; // '1m', '5m', '1h', '1d'
    retention: number; // days to keep aggregated data
  }>;
  alerting: {
    enabled: boolean;
    defaultCooldown: number;
    defaultSeverity: AlertSeverity;
  };
  thresholds: {
    duration: { warning: number; critical: number }; // ms
    latency: { warning: number; critical: number }; // ms
    errorRate: { warning: number; critical: number }; // percentage
    cpuUsage: { warning: number; critical: number }; // percentage
    memoryUsage: { warning: number; critical: number }; // percentage
    cost: { warning: number; critical: number }; // USD
  };
}

// ─── Default Alert Configurations ────────────────────────────────────────────

const DEFAULT_ALERTS: AlertConfig[] = [
  {
    id: 'alert-duration-warning',
    name: 'High Duration Warning',
    metric: 'duration',
    condition: 'gt',
    threshold: 2 * 3600000, // 2 hours
    severity: 'warning',
    cooldown: 300000, // 5 minutes
    enabled: true,
    notify: ['team']
  },
  {
    id: 'alert-duration-critical',
    name: 'Critical Duration',
    metric: 'duration',
    condition: 'gt',
    threshold: 4 * 3600000, // 4 hours
    severity: 'critical',
    cooldown: 60000, // 1 minute
    enabled: true,
    notify: ['team', 'oncall']
  },
  {
    id: 'alert-error-rate-warning',
    name: 'Elevated Error Rate',
    metric: 'error_rate',
    condition: 'gt',
    threshold: 5, // 5%
    severity: 'warning',
    cooldown: 300000,
    enabled: true,
    notify: ['team']
  },
  {
    id: 'alert-error-rate-critical',
    name: 'Critical Error Rate',
    metric: 'error_rate',
    condition: 'gt',
    threshold: 10, // 10%
    severity: 'critical',
    cooldown: 60000,
    enabled: true,
    notify: ['team', 'oncall']
  },
  {
    id: 'alert-cpu-warning',
    name: 'High CPU Usage',
    metric: 'cpu_usage',
    condition: 'gt',
    threshold: 70, // 70%
    severity: 'warning',
    cooldown: 300000,
    enabled: true,
    notify: ['team']
  },
  {
    id: 'alert-cpu-critical',
    name: 'Critical CPU Usage',
    metric: 'cpu_usage',
    condition: 'gt',
    threshold: 90, // 90%
    severity: 'critical',
    cooldown: 60000,
    enabled: true,
    notify: ['team', 'oncall']
  },
  {
    id: 'alert-memory-warning',
    name: 'High Memory Usage',
    metric: 'memory_usage',
    condition: 'gt',
    threshold: 70,
    severity: 'warning',
    cooldown: 300000,
    enabled: true,
    notify: ['team']
  },
  {
    id: 'alert-memory-critical',
    name: 'Critical Memory Usage',
    metric: 'memory_usage',
    condition: 'gt',
    threshold: 90,
    severity: 'critical',
    cooldown: 60000,
    enabled: true,
    notify: ['team', 'oncall']
  },
  {
    id: 'alert-cost-warning',
    name: 'High Cost Warning',
    metric: 'cost',
    condition: 'gt',
    threshold: 2.00, // $2
    severity: 'warning',
    cooldown: 3600000, // 1 hour
    enabled: true,
    notify: ['team']
  },
  {
    id: 'alert-cost-critical',
    name: 'Critical Cost',
    metric: 'cost',
    condition: 'gt',
    threshold: 4.00, // $4
    severity: 'critical',
    cooldown: 3600000,
    enabled: true,
    notify: ['team', 'oncall']
  }
];

// ─── Performance Monitor ─────────────────────────────────────────────────────

export class PerformanceMonitor {
  private config: PerformanceConfig;
  private rawMetrics: RawMetric[] = [];
  private aggregatedMetrics: Map<string, AggregatedMetric> = new Map();
  private alerts: Alert[] = [];
  private alertConfigs: Map<string, AlertConfig> = new Map();
  private lastAlertTime: Map<string, number> = new Map();
  private trends: Map<string, TrendAnalysis> = new Map();

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      collectionInterval: 10000, // 10 seconds
      retentionDays: 90,
      aggregationWindows: [
        { window: '1m', retention: 7 },
        { window: '5m', retention: 30 },
        { window: '1h', retention: 90 },
        { window: '1d', retention: 365 }
      ],
      alerting: {
        enabled: true,
        defaultCooldown: 300000,
        defaultSeverity: 'warning'
      },
      thresholds: {
        duration: { warning: 2 * 3600000, critical: 4 * 3600000 },
        latency: { warning: 500, critical: 1000 },
        errorRate: { warning: 5, critical: 10 },
        cpuUsage: { warning: 70, critical: 90 },
        memoryUsage: { warning: 70, critical: 90 },
        cost: { warning: 2.00, critical: 4.00 }
      },
      ...config
    };

    this.initPerformanceMonitor();
  }

  private initPerformanceMonitor(): void {
    try {
      if (!existsSync(PERF_DIR)) {
        mkdirSync(PERF_DIR, { recursive: true });
      }
      if (!existsSync(REPORTS_DIR)) {
        mkdirSync(REPORTS_DIR, { recursive: true });
      }

      this.loadMetrics();
      this.loadAlertConfigs();
      this.loadTrends();
    } catch (err) {
      logger.warn('Failed to initialize performance monitor', { error: (err as Error).message });
    }
  }

  private loadMetrics(): void {
    try {
      if (existsSync(METRICS_FILE)) {
        const content = readFileSync(METRICS_FILE, 'utf8');
        const lines = content.split('\n').filter(l => l);
        this.rawMetrics = lines.map(l => JSON.parse(l));
        this.cleanupOldMetrics();
        logger.info('Loaded performance metrics', { count: this.rawMetrics.length });
      }
      if (existsSync(AGGREGATED_FILE)) {
        const data = JSON.parse(readFileSync(AGGREGATED_FILE, 'utf8'));
        this.aggregatedMetrics = new Map(Object.entries(data));
      }
    } catch (err) {
      logger.warn('Failed to load metrics', { error: (err as Error).message });
    }
  }

  private loadAlertConfigs(): void {
    this.alertConfigs = new Map(DEFAULT_ALERTS.map(a => [a.id, a]));
  }

  private loadTrends(): void {
    try {
      if (existsSync(TRENDS_FILE)) {
        const data = JSON.parse(readFileSync(TRENDS_FILE, 'utf8'));
        this.trends = new Map(Object.entries(data));
      }
    } catch (err) {
      logger.warn('Failed to load trends', { error: (err as Error).message });
    }
  }

  private saveMetrics(): void {
    try {
      const content = this.rawMetrics.map(m => JSON.stringify(m)).join('\n');
      writeFileSync(METRICS_FILE, content, 'utf8');

      const aggData: Record<string, AggregatedMetric> = {};
      this.aggregatedMetrics.forEach((value, key) => {
        aggData[key] = value;
      });
      writeFileSync(AGGREGATED_FILE, JSON.stringify(aggData, null, 2), 'utf8');
    } catch (err) {
      logger.warn('Failed to save metrics', { error: (err as Error).message });
    }
  }

  private saveAlerts(): void {
    try {
      const content = this.alerts.map(a => JSON.stringify(a)).join('\n');
      writeFileSync(join(PERF_DIR, 'alerts.jsonl'), content, 'utf8');
    } catch (err) {
      logger.warn('Failed to save alerts', { error: (err as Error).message });
    }
  }

  private saveTrends(): void {
    try {
      const data: Record<string, TrendAnalysis> = {};
      this.trends.forEach((value, key) => {
        data[key] = value;
      });
      writeFileSync(TRENDS_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      logger.warn('Failed to save trends', { error: (err as Error).message });
    }
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    this.rawMetrics = this.rawMetrics.filter(m =>
      new Date(m.timestamp).getTime() > cutoff
    );
  }

  private getMetricKey(type: MetricType, labels?: Record<string, string>): string {
    const labelStr = labels ? JSON.stringify(Object.entries(labels).sort()) : '';
    return `${type}:${labelStr}`;
  }

  private computePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  private computeStdDev(values: number[], avg: number): number {
    if (values.length === 0) return 0;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * PERF-01: Record a performance metric
   */
  record(metric: {
    type: MetricType;
    value: number;
    unit: string;
    labels?: Record<string, string>;
    source?: string;
  }): RawMetric {
    const rawMetric: RawMetric = {
      timestamp: new Date().toISOString(),
      type: metric.type,
      value: metric.value,
      unit: metric.unit,
      labels: metric.labels || {},
      source: metric.source || 'system'
    };

    this.rawMetrics.push(rawMetric);

    // Check alerts
    if (this.config.alerting.enabled) {
      this.checkAlerts(rawMetric);
    }

    // Aggregate periodically
    if (this.rawMetrics.length % 100 === 0) {
      this.aggregateMetrics();
      this.saveMetrics();
    }

    return rawMetric;
  }

  /**
   * PERF-02: Aggregate metrics
   */
  aggregateMetrics(): void {
    const metricsByType = new Map<string, RawMetric[]>();

    // Group metrics by type and labels
    this.rawMetrics.forEach(m => {
      const key = this.getMetricKey(m.type, m.labels);
      if (!metricsByType.has(key)) {
        metricsByType.set(key, []);
      }
      metricsByType.get(key)!.push(m);
    });

    // Aggregate each group
    metricsByType.forEach((metrics, key) => {
      if (metrics.length === 0) return;

      const values = metrics.map(m => m.value).sort((a, b) => a - b);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;

      const aggregated: AggregatedMetric = {
        period: {
          start: metrics[0].timestamp,
          end: metrics[metrics.length - 1].timestamp
        },
        type: metrics[0].type,
        labels: metrics[0].labels,
        aggregations: {
          count: values.length,
          sum: values.reduce((a, b) => a + b, 0),
          avg,
          min: values[0],
          max: values[values.length - 1],
          p50: this.computePercentile(values, 50),
          p95: this.computePercentile(values, 95),
          p99: this.computePercentile(values, 99),
          stdDev: this.computeStdDev(values, avg)
        },
        samples: values.length
      };

      this.aggregatedMetrics.set(key, aggregated);
    });

    logger.debug('Metrics aggregated', { count: this.aggregatedMetrics.size });
  }

  /**
   * PERF-04: Check alerts for a metric
   */
  private checkAlerts(metric: RawMetric): void {
    const now = Date.now();

    this.alertConfigs.forEach((config, configId) => {
      if (!config.enabled) return;
      if (config.metric !== metric.type) return;

      // Check cooldown
      const lastAlertTime = this.lastAlertTime.get(configId);
      if (lastAlertTime && now - lastAlertTime < config.cooldown) return;

      let triggered = false;

      switch (config.condition) {
        case 'gt':
          triggered = metric.value > config.threshold;
          break;
        case 'lt':
          triggered = metric.value < config.threshold;
          break;
        case 'gte':
          triggered = metric.value >= config.threshold;
          break;
        case 'lte':
          triggered = metric.value <= config.threshold;
          break;
        case 'eq':
          triggered = metric.value === config.threshold;
          break;
        case 'between':
          triggered = config.thresholdMax !== undefined &&
                      metric.value >= config.threshold &&
                      metric.value <= config.thresholdMax;
          break;
      }

      if (triggered) {
        this.fireAlert(config, metric);
        this.lastAlertTime.set(configId, now);
      }
    });
  }

  private fireAlert(config: AlertConfig, metric: RawMetric): void {
    const alert: Alert = {
      id: `alert-${Date.now()}-${config.id}`,
      configId: config.id,
      timestamp: new Date().toISOString(),
      metric: config.metric,
      value: metric.value,
      threshold: config.threshold,
      severity: config.severity,
      message: `${config.name}: ${metric.value} ${metric.unit} (threshold: ${config.threshold})`,
      status: 'firing'
    };

    this.alerts.push(alert);
    this.saveAlerts();

    logger.warn('Alert fired', {
      alertId: alert.id,
      name: config.name,
      severity: config.severity,
      value: metric.value,
      threshold: config.threshold
    });
  }

  /**
   * PERF-03: Generate performance dashboard
   */
  async generateDashboard(): Promise<string> {
    this.aggregateMetrics();

    const date = new Date().toISOString().split('T')[0];
    const latestMetrics = this.getLatestMetrics();

    let md = `# Performance Dashboard\n\n`;
    md += `**Generated:** ${date} at ${new Date().toLocaleTimeString()}\n\n`;

    // Health Summary
    md += `## Health Summary\n\n`;
    md += this.renderHealthSummary(latestMetrics);

    // Key Metrics
    md += `\n## Key Metrics\n\n`;
    md += this.renderKeyMetrics(latestMetrics);

    // Resource Utilization
    md += `\n## Resource Utilization\n\n`;
    md += this.renderResourceUtilization(latestMetrics);

    // Recent Alerts
    md += `\n## Recent Alerts\n\n`;
    md += this.renderRecentAlerts();

    // Trends
    md += `\n## Performance Trends\n\n`;
    md += this.renderTrendSummary();

    // Recommendations
    md += `\n## Recommendations\n\n`;
    md += this.generateRecommendations(latestMetrics);

    md += `\n---\n\n*Last updated: ${new Date().toISOString()}*\n`;
    md += `\n*Retention: ${this.config.retentionDays} days | Collection interval: ${this.config.collectionInterval / 1000}s*\n`;

    // Save dashboard
    try {
      writeFileSync(DASHBOARD_FILE, md, 'utf8');
      logger.info('Performance dashboard generated', { file: DASHBOARD_FILE });
    } catch (err) {
      logger.error('Failed to save dashboard', { error: (err as Error).message });
    }

    return md;
  }

  private renderHealthSummary(metrics: Map<string, RawMetric>): string {
    const healthScore = this.calculateHealthScore(metrics);
    const healthStatus = healthScore >= 90 ? 'excellent' : healthScore >= 70 ? 'good' : healthScore >= 50 ? 'fair' : 'poor';
    const healthIcon = healthScore >= 90 ? '🟢' : healthScore >= 70 ? '🟡' : '🟠';

    let md = `| Metric | Value | Status |\n`;
    md += `|--------|-------|--------|\n`;
    md += `| Overall Health | ${healthIcon} ${healthScore.toFixed(0)}% | ${healthStatus} |\n`;

    const activeAlerts = this.alerts.filter(a => a.status === 'firing').length;
    md += `| Active Alerts | ${activeAlerts} | ${activeAlerts === 0 ? '✅' : '⚠️'} |\n`;

    const errorRate = metrics.get('error_rate:')?.value || 0;
    md += `| Error Rate | ${errorRate.toFixed(2)}% | ${errorRate < 5 ? '✅' : '⚠️'} |\n`;

    return md;
  }

  private calculateHealthScore(metrics: Map<string, RawMetric>): number {
    let score = 100;

    // Deduct for error rate
    const errorRate = metrics.get('error_rate:')?.value || 0;
    if (errorRate > 10) score -= 30;
    else if (errorRate > 5) score -= 15;
    else if (errorRate > 2) score -= 5;

    // Deduct for high resource usage
    const cpuUsage = metrics.get('cpu_usage:')?.value || 0;
    if (cpuUsage > 90) score -= 20;
    else if (cpuUsage > 70) score -= 10;

    const memoryUsage = metrics.get('memory_usage:')?.value || 0;
    if (memoryUsage > 90) score -= 20;
    else if (memoryUsage > 70) score -= 10;

    // Deduct for active alerts
    const activeAlerts = this.alerts.filter(a => a.status === 'firing').length;
    score -= activeAlerts * 5;

    return Math.max(0, Math.min(100, score));
  }

  private renderKeyMetrics(metrics: Map<string, RawMetric>): string {
    let md = `| Metric | Current | Avg | P95 | P99 | Status |\n`;
    md += `|--------|---------|-----|-----|-----|--------|\n`;

    const keyMetrics: MetricType[] = ['duration', 'throughput', 'latency', 'error_rate', 'cost'];

    keyMetrics.forEach(type => {
      const key = this.getMetricKey(type);
      const raw = metrics.get(key);
      const agg = this.aggregatedMetrics.get(key);

      if (raw || agg) {
        const current = raw?.value || agg?.aggregations.avg || 0;
        const avg = agg?.aggregations.avg || current;
        const p95 = agg?.aggregations.p95 || current;
        const p99 = agg?.aggregations.p99 || current;

        const status = this.getMetricStatus(type, current);
        md += `| ${type.replace('_', ' ')} | ${current.toFixed(2)} | ${avg.toFixed(2)} | ${p95.toFixed(2)} | ${p99.toFixed(2)} | ${status} |\n`;
      }
    });

    return md;
  }

  private getMetricStatus(type: MetricType, value: number): string {
    const thresholds = this.config.thresholds[type as keyof typeof this.config.thresholds];
    if (!thresholds) return '✅';

    if (value >= thresholds.critical) return '🔴';
    if (value >= thresholds.warning) return '🟡';
    return '✅';
  }

  private renderResourceUtilization(metrics: Map<string, RawMetric>): string {
    let md = `| Resource | Usage | Capacity | Utilization | Status |\n`;
    md += `|----------|-------|----------|-------------|--------|\n`;

    const resources = [
      { name: 'CPU', metric: 'cpu_usage', capacity: 100 },
      { name: 'Memory', metric: 'memory_usage', capacity: 100 },
      { name: 'Disk I/O', metric: 'disk_io', capacity: 1000 },
      { name: 'Network', metric: 'network_io', capacity: 1000 }
    ];

    resources.forEach(r => {
      const value = metrics.get(`${r.metric}:`)?.value || 0;
      const utilization = (value / r.capacity) * 100;
      const status = utilization > 90 ? '🔴' : utilization > 70 ? '🟡' : '✅';
      md += `| ${r.name} | ${value.toFixed(2)} | ${r.capacity} | ${utilization.toFixed(1)}% | ${status} |\n`;
    });

    return md;
  }

  private renderRecentAlerts(): string {
    const recentAlerts = this.alerts
      .filter(a => a.status === 'firing')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    if (recentAlerts.length === 0) {
      return `*No active alerts*\n`;
    }

    let md = `| Time | Alert | Severity | Value | Threshold |\n`;
    md += `|------|-------|----------|-------|-----------|\n`;

    recentAlerts.forEach(a => {
      const time = new Date(a.timestamp).toLocaleString();
      const severityIcon = a.severity === 'critical' ? '🔴' : a.severity === 'warning' ? '🟡' : '🔵';
      md += `| ${time} | ${a.message.split(':')[0]} | ${severityIcon} ${a.severity} | ${a.value.toFixed(2)} | ${a.threshold} |\n`;
    });

    return md;
  }

  private renderTrendSummary(): string {
    if (this.trends.size === 0) {
      return `*No trend data available. Run trend analysis first.*\n`;
    }

    let md = `| Metric | Direction | 7-Day Forecast | 30-Day Forecast |\n`;
    md += `|--------|-----------|----------------|-----------------|\n`;

    this.trends.forEach((trend, key) => {
      const directionIcon = trend.direction === 'increasing' ? '📈' : trend.direction === 'decreasing' ? '📉' : '➡️';
      md += `| ${trend.metric} | ${directionIcon} ${trend.direction} | ${trend.forecast['7day'].toFixed(2)} | ${trend.forecast['30day'].toFixed(2)} |\n`;
    });

    return md;
  }

  private generateRecommendations(metrics: Map<string, RawMetric>): string {
    const recommendations: string[] = [];

    // Check CPU
    const cpuUsage = metrics.get('cpu_usage:')?.value || 0;
    if (cpuUsage > 80) {
      recommendations.push(`⚠️ High CPU usage (${cpuUsage.toFixed(1)}%) - consider scaling or optimization`);
    }

    // Check memory
    const memoryUsage = metrics.get('memory_usage:')?.value || 0;
    if (memoryUsage > 80) {
      recommendations.push(`⚠️ High memory usage (${memoryUsage.toFixed(1)}%) - review memory allocation and leaks`);
    }

    // Check error rate
    const errorRate = metrics.get('error_rate:')?.value || 0;
    if (errorRate > 5) {
      recommendations.push(`🔴 Elevated error rate (${errorRate.toFixed(1)}%) - investigate root cause`);
    }

    // Check cost
    const cost = metrics.get('cost:')?.value || 0;
    if (cost > 2) {
      recommendations.push(`⚠️ High cost (${cost.toFixed(2)} USD) - review resource utilization`);
    }

    if (recommendations.length === 0) {
      recommendations.push(`✅ All metrics within acceptable thresholds`);
    }

    return recommendations.map(r => `- ${r}\n`).join('');
  }

  /**
   * PERF-05: Analyze trends
   */
  analyzeTrends(options?: { metric?: MetricType; period?: { start: Date; end: Date } }): TrendAnalysis[] {
    const now = new Date();
    const start = options?.period?.start || new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const end = options?.period?.end || now;

    const metricsByType = new Map<MetricType, RawMetric[]>();

    this.rawMetrics
      .filter(m => {
        const time = new Date(m.timestamp).getTime();
        return time >= start.getTime() && time <= end.getTime();
      })
      .forEach(m => {
        if (!options?.metric || m.type === options.metric) {
          if (!metricsByType.has(m.type)) {
            metricsByType.set(m.type, []);
          }
          metricsByType.get(m.type)!.push(m);
        }
      });

    const trends: TrendAnalysis[] = [];

    metricsByType.forEach((metrics, type) => {
      if (metrics.length < 10) return; // Not enough data

      // Sort by timestamp
      metrics.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const values = metrics.map(m => m.value);
      const timestamps = metrics.map(m => new Date(m.timestamp).getTime());

      // Linear regression for trend
      const { slope, direction } = this.computeTrend(timestamps, values);

      // Forecast
      const lastValue = values[values.length - 1];
      const dayMs = 24 * 60 * 60 * 1000;
      const lastTime = timestamps[timestamps.length - 1];

      const forecast = {
        '1day': lastValue + (slope * dayMs),
        '7day': lastValue + (slope * 7 * dayMs),
        '30day': lastValue + (slope * 30 * dayMs)
      };

      const trend: TrendAnalysis = {
        metric: type,
        labels: metrics[0].labels,
        period: { start: start.toISOString(), end: end.toISOString() },
        direction,
        slope,
        forecast,
        confidence: this.computeConfidence(values, slope)
      };

      const key = this.getMetricKey(type, metrics[0].labels);
      this.trends.set(key, trend);
      trends.push(trend);
    });

    this.saveTrends();
    return trends;
  }

  private computeTrend(timestamps: number[], values: number[]): { slope: number; direction: TrendDirection } {
    const n = timestamps.length;
    if (n < 2) return { slope: 0, direction: 'stable' };

    // Normalize timestamps to start from 0
    const startTime = timestamps[0];
    const normalizedTimes = timestamps.map(t => (t - startTime) / (1000 * 60 * 60)); // Hours

    // Linear regression
    const sumX = normalizedTimes.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = normalizedTimes.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = normalizedTimes.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Convert slope to per-day rate
    const dailySlope = slope * 24;

    const direction: TrendDirection = dailySlope > 1 ? 'increasing' : dailySlope < -1 ? 'decreasing' : 'stable';

    return { slope: dailySlope, direction };
  }

  private computeConfidence(values: number[], slope: number): number {
    if (values.length < 10) return 0.5;

    // Calculate R-squared
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const ssTot = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0);

    // Simple confidence based on variance
    const variance = ssTot / values.length;
    const coefficientOfVariation = Math.sqrt(variance) / avg;

    // Higher CV = lower confidence
    const confidence = Math.max(0.3, Math.min(0.95, 1 - coefficientOfVariation));

    return confidence;
  }

  /**
   * PERF-06: Generate capacity plan
   */
  generateCapacityPlan(): CapacityPlan[] {
    const plans: CapacityPlan[] = [];

    // CPU Capacity
    const cpuMetrics = Array.from(this.aggregatedMetrics.values()).filter(m => m.type === 'cpu_usage');
    if (cpuMetrics.length > 0) {
      const currentCpu = cpuMetrics[cpuMetrics.length - 1].aggregations.avg;
      plans.push(this.createCapacityPlan('CPU', currentCpu, 100));
    }

    // Memory Capacity
    const memoryMetrics = Array.from(this.aggregatedMetrics.values()).filter(m => m.type === 'memory_usage');
    if (memoryMetrics.length > 0) {
      const currentMemory = memoryMetrics[memoryMetrics.length - 1].aggregations.avg;
      plans.push(this.createCapacityPlan('Memory', currentMemory, 100));
    }

    // Storage Capacity (simulated)
    plans.push(this.createCapacityPlan('Storage', 45, 100));

    // Throughput Capacity
    const throughputMetrics = Array.from(this.aggregatedMetrics.values()).filter(m => m.type === 'throughput');
    if (throughputMetrics.length > 0) {
      const currentThroughput = throughputMetrics[throughputMetrics.length - 1].aggregations.avg;
      plans.push(this.createCapacityPlan('Throughput', currentThroughput, 1000));
    }

    return plans;
  }

  private createCapacityPlan(resource: string, currentUsage: number, capacity: number): CapacityPlan {
    const currentUtilization = (currentUsage / capacity) * 100;

    // Get trend for this resource
    const trendKey = this.getMetricKey(resource.toLowerCase() as MetricType);
    const trend = this.trends.get(trendKey);
    const dailyGrowth = trend?.slope || 0.5; // Default 0.5% per day

    const projectUsage = (days: number) => {
      return Math.min(capacity, currentUsage + (dailyGrowth * days));
    };

    const daysUntilFull = dailyGrowth > 0
      ? Math.ceil((capacity - currentUsage) / dailyGrowth)
      : Infinity;

    const plan: CapacityPlan = {
      resource,
      current: {
        usage: currentUsage,
        capacity,
        utilization: currentUtilization
      },
      projected: {
        '7day': {
          usage: projectUsage(7),
          utilization: (projectUsage(7) / capacity) * 100,
          daysUntilFull: daysUntilFull <= 7 ? daysUntilFull : undefined
        },
        '30day': {
          usage: projectUsage(30),
          utilization: (projectUsage(30) / capacity) * 100,
          daysUntilFull: daysUntilFull <= 30 ? daysUntilFull : undefined
        },
        '90day': {
          usage: projectUsage(90),
          utilization: (projectUsage(90) / capacity) * 100,
          daysUntilFull: daysUntilFull <= 90 ? daysUntilFull : undefined
        }
      },
      recommendations: this.generateCapacityRecommendations(resource, currentUtilization, daysUntilFull),
      risks: this.generateCapacityRisks(resource, currentUtilization, daysUntilFull)
    };

    return plan;
  }

  private generateCapacityRecommendations(resource: string, utilization: number, daysUntilFull: number): CapacityPlan['recommendations'] {
    const recommendations: CapacityPlan['recommendations'] = [];

    if (utilization > 90) {
      recommendations.push({
        action: `Immediate capacity increase required for ${resource}`,
        priority: 'critical',
        impact: 'Prevent service degradation or outage',
        cost: 100
      });
    } else if (utilization > 70) {
      recommendations.push({
        action: `Plan capacity increase for ${resource} within 2 weeks`,
        priority: 'high',
        impact: 'Avoid future bottlenecks',
        cost: 50
      });
    } else if (utilization > 50) {
      recommendations.push({
        action: `Monitor ${resource} growth trend`,
        priority: 'medium',
        impact: 'Early warning for capacity planning',
        cost: 0
      });
    }

    if (daysUntilFull < 30) {
      recommendations.push({
        action: `Urgent: ${resource} will reach capacity in ${daysUntilFull} days`,
        priority: 'critical',
        impact: 'Prevent service disruption',
        cost: 150
      });
    }

    return recommendations;
  }

  private generateCapacityRisks(resource: string, utilization: number, daysUntilFull: number): string[] {
    const risks: string[] = [];

    if (utilization > 80) {
      risks.push(`High ${resource.toLowerCase()} utilization may cause performance degradation`);
    }

    if (daysUntilFull < 60) {
      risks.push(`${resource} capacity exhaustion projected within ${daysUntilFull} days`);
    }

    if (utilization > 90) {
      risks.push(`Immediate risk of ${resource.toLowerCase()} exhaustion`);
    }

    return risks;
  }

  /**
   * PERF-07: Generate performance report
   */
  generateReport(type: 'daily' | 'weekly' | 'monthly' | 'custom' = 'weekly'): PerformanceReport {
    const now = new Date();
    let periodStart: Date;

    switch (type) {
      case 'daily': periodStart = new Date(now.getTime() - (24 * 60 * 60 * 1000)); break;
      case 'weekly': periodStart = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); break;
      case 'monthly': periodStart = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); break;
      default: periodStart = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    }

    // Filter metrics for period
    const periodMetrics = this.rawMetrics.filter(m =>
      new Date(m.timestamp) >= periodStart
    );

    // Get aggregated metrics
    const metrics: PerformanceReport['metrics'] = {};
    const metricTypes: MetricType[] = ['duration', 'throughput', 'latency', 'cpu_usage', 'memory_usage', 'error_rate', 'cost'];

    metricTypes.forEach(type => {
      const key = this.getMetricKey(type);
      const agg = this.aggregatedMetrics.get(key);
      if (agg) {
        metrics[`${type}Usage` as keyof PerformanceReport['metrics']] = agg as any;
      }
    });

    // Get trends
    const trends = this.analyzeTrends({ period: { start: periodStart, end: now } });

    // Get alerts
    const periodAlerts = this.alerts.filter(a =>
      new Date(a.timestamp) >= periodStart
    );

    // Get capacity plan
    const capacity = this.generateCapacityPlan();

    // Calculate health score
    const latestMetrics = this.getLatestMetrics();
    const healthScore = this.calculateHealthScore(latestMetrics);
    const overallHealth = healthScore >= 90 ? 'excellent' : healthScore >= 70 ? 'good' : healthScore >= 50 ? 'fair' : 'poor';

    const report: PerformanceReport = {
      id: `RPT-${type}-${Date.now()}`,
      type,
      generatedAt: now.toISOString(),
      period: {
        start: periodStart.toISOString(),
        end: now.toISOString()
      },
      summary: {
        overallHealth,
        healthScore,
        totalMetrics: periodMetrics.length,
        alertsFired: periodAlerts.length,
        anomaliesDetected: 0
      },
      metrics,
      trends,
      alerts: periodAlerts,
      capacity,
      recommendations: this.generateReportRecommendations(report)
    };

    // Save report
    try {
      const reportFile = join(REPORTS_DIR, `performance-${type}-${now.toISOString().split('T')[0]}.json`);
      writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
      logger.info('Performance report generated', { type, file: reportFile });
    } catch (err) {
      logger.warn('Failed to save performance report', { error: (err as Error).message });
    }

    return report;
  }

  private generateReportRecommendations(report: PerformanceReport): string[] {
    const recommendations: string[] = [];

    // Based on health
    if (report.summary.healthScore < 70) {
      recommendations.push('Investigate performance issues causing degraded health score');
    }

    // Based on alerts
    const criticalAlerts = report.alerts.filter(a => a.severity === 'critical').length;
    if (criticalAlerts > 0) {
      recommendations.push(`Address ${criticalAlerts} critical alerts immediately`);
    }

    // Based on capacity
    report.capacity.forEach(cap => {
      const criticalRecs = cap.recommendations.filter(r => r.priority === 'critical');
      if (criticalRecs.length > 0) {
        recommendations.push(`Capacity action required for ${cap.resource}`);
      }
    });

    // Based on trends
    const negativeTrends = report.trends.filter(t =>
      t.direction === 'increasing' && ['error_rate', 'latency', 'cpu_usage', 'memory_usage'].includes(t.metric)
    );
    if (negativeTrends.length > 0) {
      recommendations.push('Review increasing trends in critical metrics');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring - all metrics within acceptable ranges');
    }

    return recommendations;
  }

  /**
   * Get latest metrics
   */
  getLatestMetrics(): Map<string, RawMetric> {
    const latest = new Map<string, RawMetric>();

    this.rawMetrics.forEach(m => {
      const key = this.getMetricKey(m.type, m.labels);
      const existing = latest.get(key);
      if (!existing || new Date(m.timestamp) > new Date(existing.timestamp)) {
        latest.set(key, m);
      }
    });

    return latest;
  }

  /**
   * Get metrics by type
   */
  getMetrics(type?: MetricType, options?: { start?: Date; end?: Date }): RawMetric[] {
    let metrics = [...this.rawMetrics];

    if (type) {
      metrics = metrics.filter(m => m.type === type);
    }

    if (options?.start) {
      metrics = metrics.filter(m => new Date(m.timestamp) >= options.start!);
    }
    if (options?.end) {
      metrics = metrics.filter(m => new Date(m.timestamp) <= options.end!);
    }

    return metrics;
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(type?: MetricType): AggregatedMetric[] {
    let metrics = Array.from(this.aggregatedMetrics.values());

    if (type) {
      metrics = metrics.filter(m => m.type === type);
    }

    return metrics;
  }

  /**
   * Get active alerts
   */
  getAlerts(options?: { severity?: AlertSeverity; status?: Alert['status']; limit?: number }): Alert[] {
    let alerts = [...this.alerts];

    if (options?.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }
    if (options?.status) {
      alerts = alerts.filter(a => a.status === options.status);
    }

    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (options?.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date().toISOString();
      this.saveAlerts();
      return true;
    }
    return false;
  }

  /**
   * Add custom alert configuration
   */
  addAlertConfig(config: AlertConfig): void {
    this.alertConfigs.set(config.id, config);
    logger.info('Custom alert config added', { id: config.id, name: config.name });
  }

  /**
   * Clear old data
   */
  clearOldData(): void {
    this.cleanupOldMetrics();
    this.saveMetrics();
    logger.info('Old performance data cleared');
  }
}

// ─── Default Instance ────────────────────────────────────────────────────────

const defaultMonitor = new PerformanceMonitor();

export function recordPerformanceMetric(metric: {
  type: MetricType;
  value: number;
  unit: string;
  labels?: Record<string, string>;
  source?: string;
}): RawMetric {
  return defaultMonitor.record(metric);
}

export function generatePerformanceDashboard(): Promise<string> {
  return defaultMonitor.generateDashboard();
}

export function analyzePerformanceTrends(options?: { metric?: MetricType; period?: { start: Date; end: Date } }): TrendAnalysis[] {
  return defaultMonitor.analyzeTrends(options);
}

export function generateCapacityPlan(): CapacityPlan[] {
  return defaultMonitor.generateCapacityPlan();
}

export function generatePerformanceReport(type?: 'daily' | 'weekly' | 'monthly' | 'custom'): PerformanceReport {
  return defaultMonitor.generateReport(type);
}

export function getPerformanceAlerts(options?: { severity?: AlertSeverity; status?: Alert['status']; limit?: number }): Alert[] {
  return defaultMonitor.getAlerts(options);
}

export function getPerformanceMetrics(type?: MetricType, options?: { start?: Date; end?: Date }): RawMetric[] {
  return defaultMonitor.getMetrics(type, options);
}

// ─── Default Export ─────────────────────────────────────────────────────────

export default PerformanceMonitor;
