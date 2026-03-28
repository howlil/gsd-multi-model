/**
 * Workflow Metrics Tracker - Track and analyze workflow execution metrics
 * 
 * Provides visibility into workflow performance, token consumption,
 * success rates, and optimization opportunities.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getEzAgentsRoot } from '../core.js';
import { defaultLogger as logger } from '../logger/index.js';

export interface WorkflowMetrics {
  workflow: string;
  run_id: string;
  duration_ms: number;
  token_consumption: number;
  checkpoints_hit: number;
  deviations: number;
  success: boolean;
  timestamp: string;
  phase?: string;
  milestone?: string;
  model_profile?: string;
  flags?: string[];
  errors?: string[];
  agent_spawn_count?: number;
  files_modified?: number;
  files_created?: number;
}

export interface WorkflowStats {
  workflow: string;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  success_rate: number;
  avg_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;
  avg_token_consumption: number;
  avg_checkpoints: number;
  avg_deviations: number;
  last_run: string;
  trend: 'improving' | 'stable' | 'degrading';
}

export interface MetricsConfig {
  enabled: boolean;
  storage_path: string;
  retention_days: number;
  aggregate_interval: 'hour' | 'day' | 'week' | 'month';
}

const DEFAULT_CONFIG: MetricsConfig = {
  enabled: true,
  storage_path: '.planning/metrics',
  retention_days: 90,
  aggregate_interval: 'day'
};

/**
 * Workflow Metrics Tracker class
 */
export class WorkflowMetricsTracker {
  private config: MetricsConfig;
  private metricsFile: string;
  private startTime: number = 0;
  private currentMetrics: Partial<WorkflowMetrics> = {};

  constructor(config?: Partial<MetricsConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metricsFile = path.join(this.config.storage_path, 'workflow-stats.json');
  }

  /**
   * Initialize metrics storage
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.debug('Metrics tracking disabled');
      return;
    }

    // Create storage directory if not exists
    if (!fs.existsSync(this.config.storage_path)) {
      fs.mkdirSync(this.config.storage_path, { recursive: true });
    }

    // Create metrics file if not exists
    if (!fs.existsSync(this.metricsFile)) {
      fs.writeFileSync(this.metricsFile, JSON.stringify({ runs: [] }, null, 2));
    }

    logger.info('Workflow metrics tracker initialized', {
      storagePath: this.config.storage_path,
      retentionDays: this.config.retention_days
    });
  }

  /**
   * Start tracking a workflow run
   * 
   * @param workflow - Workflow name
   * @param metadata - Additional metadata
   */
  startTracking(workflow: string, metadata: Partial<WorkflowMetrics> = {}): string {
    this.startTime = Date.now();
    const runId = this.generateRunId();
    
    this.currentMetrics = {
      workflow,
      run_id: runId,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    logger.debug('Started tracking workflow', {
      workflow,
      runId,
      timestamp: this.currentMetrics.timestamp
    });

    return runId;
  }

  /**
   * Record checkpoint hit
   */
  recordCheckpoint(): void {
    this.currentMetrics.checkpoints_hit = (this.currentMetrics.checkpoints_hit || 0) + 1;
  }

  /**
   * Record deviation from workflow
   */
  recordDeviation(reason: string): void {
    this.currentMetrics.deviations = (this.currentMetrics.deviations || 0) + 1;
    
    if (!this.currentMetrics.errors) {
      this.currentMetrics.errors = [];
    }
    this.currentMetrics.errors.push(reason);
  }

  /**
   * Record token consumption
   * 
   * @param tokens - Number of tokens consumed
   */
  recordTokenConsumption(tokens: number): void {
    this.currentMetrics.token_consumption = (this.currentMetrics.token_consumption || 0) + tokens;
  }

  /**
   * Record agent spawn
   */
  recordAgentSpawn(): void {
    this.currentMetrics.agent_spawn_count = (this.currentMetrics.agent_spawn_count || 0) + 1;
  }

  /**
   * Record file operations
   * 
   * @param type - 'modified' or 'created'
   */
  recordFileOperation(type: 'modified' | 'created'): void {
    if (type === 'modified') {
      this.currentMetrics.files_modified = (this.currentMetrics.files_modified || 0) + 1;
    } else {
      this.currentMetrics.files_created = (this.currentMetrics.files_created || 0) + 1;
    }
  }

  /**
   * Stop tracking and save metrics
   * 
   * @param success - Whether workflow completed successfully
   */
  async stopTracking(success: boolean): Promise<WorkflowMetrics | null> {
    if (!this.config.enabled || this.startTime === 0) {
      return null;
    }

    const duration = Date.now() - this.startTime;
    
    const metrics: WorkflowMetrics = {
      workflow: this.currentMetrics.workflow || 'unknown',
      run_id: this.currentMetrics.run_id || this.generateRunId(),
      duration_ms: duration,
      token_consumption: this.currentMetrics.token_consumption || 0,
      checkpoints_hit: this.currentMetrics.checkpoints_hit || 0,
      deviations: this.currentMetrics.deviations || 0,
      success,
      timestamp: this.currentMetrics.timestamp || new Date().toISOString(),
      phase: this.currentMetrics.phase,
      milestone: this.currentMetrics.milestone,
      model_profile: this.currentMetrics.model_profile,
      flags: this.currentMetrics.flags,
      errors: this.currentMetrics.errors,
      agent_spawn_count: this.currentMetrics.agent_spawn_count,
      files_modified: this.currentMetrics.files_modified,
      files_created: this.currentMetrics.files_created
    };

    // Save metrics
    await this.saveMetrics(metrics);

    // Reset state
    this.startTime = 0;
    this.currentMetrics = {};

    logger.info('Workflow metrics saved', {
      workflow: metrics.workflow,
      runId: metrics.run_id,
      duration: duration,
      success
    });

    return metrics;
  }

  /**
   * Get statistics for a workflow
   * 
   * @param workflow - Workflow name
   * @param limit - Number of runs to analyze (default: 30)
   */
  getStats(workflow: string, limit: number = 30): WorkflowStats | null {
    const metricsData = this.loadMetrics();
    
    if (!metricsData || metricsData.runs.length === 0) {
      return null;
    }

    // Filter runs for this workflow
    const workflowRuns = metricsData.runs
      .filter(run => run.workflow === workflow)
      .slice(-limit);

    if (workflowRuns.length === 0) {
      return null;
    }

    // Calculate statistics
    const totalRuns = workflowRuns.length;
    const successfulRuns = workflowRuns.filter(run => run.success).length;
    const failedRuns = totalRuns - successfulRuns;
    
    const durations = workflowRuns.map(run => run.duration_ms);
    const tokens = workflowRuns.map(run => run.token_consumption);
    const checkpoints = workflowRuns.map(run => run.checkpoints_hit);
    const deviations = workflowRuns.map(run => run.deviations);

    const avgDuration = this.average(durations);
    const avgTokens = this.average(tokens);
    const avgCheckpoints = this.average(checkpoints);
    const avgDeviations = this.average(deviations);

    // Calculate trend (compare last 10 runs to previous 10)
    const trend = this.calculateTrend(workflowRuns);

    return {
      workflow,
      total_runs: totalRuns,
      successful_runs: successfulRuns,
      failed_runs: failedRuns,
      success_rate: (successfulRuns / totalRuns) * 100,
      avg_duration_ms: Math.round(avgDuration),
      min_duration_ms: Math.min(...durations),
      max_duration_ms: Math.max(...durations),
      avg_token_consumption: Math.round(avgTokens),
      avg_checkpoints: Math.round(avgCheckpoints * 10) / 10,
      avg_deviations: Math.round(avgDeviations * 10) / 10,
      last_run: workflowRuns[workflowRuns.length - 1]?.timestamp || '',
      trend
    };
  }

  /**
   * Get all workflow statistics
   */
  getAllStats(): Record<string, WorkflowStats> {
    const metricsData = this.loadMetrics();
    const stats: Record<string, WorkflowStats> = {};

    if (!metricsData || metricsData.runs.length === 0) {
      return stats;
    }

    // Get unique workflows
    const workflows = [...new Set(metricsData.runs.map(run => run.workflow))];

    for (const workflow of workflows) {
      const workflowStats = this.getStats(workflow);
      if (workflowStats) {
        stats[workflow] = workflowStats;
      }
    }

    return stats;
  }

  /**
   * Format statistics for display
   * 
   * @param stats - Workflow statistics
   */
  formatStats(stats: WorkflowStats): string {
    const lines: string[] = [];

    lines.push(`${stats.workflow} metrics (last ${stats.total_runs} runs):`);
    lines.push(``);
    lines.push(`  Success Rate: ${stats.success_rate.toFixed(1)}% (${stats.successful_runs}/${stats.total_runs})`);
    lines.push(``);
    lines.push(`  Duration:`);
    lines.push(`    Average: ${this.formatDuration(stats.avg_duration_ms)}`);
    lines.push(`    Min: ${this.formatDuration(stats.min_duration_ms)}`);
    lines.push(`    Max: ${this.formatDuration(stats.max_duration_ms)}`);
    lines.push(``);
    lines.push(`  Token Consumption:`);
    lines.push(`    Average: ${this.formatNumber(stats.avg_token_consumption)} tokens`);
    lines.push(``);
    lines.push(`  Checkpoints: ${stats.avg_checkpoints.toFixed(1)} per run`);
    lines.push(`  Deviations: ${stats.avg_deviations.toFixed(1)} per run`);
    lines.push(``);
    lines.push(`  Trend: ${this.getTrendEmoji(stats.trend)} ${stats.trend.toUpperCase()}`);
    lines.push(`  Last Run: ${new Date(stats.last_run).toLocaleString()}`);

    return lines.join('\n');
  }

  /**
   * Clean up old metrics based on retention policy
   */
  async cleanup(): Promise<void> {
    const metricsData = this.loadMetrics();
    
    if (!metricsData) {
      return;
    }

    const cutoffDate = Date.now() - (this.config.retention_days * 24 * 60 * 60 * 1000);
    const originalCount = metricsData.runs.length;
    
    metricsData.runs = metricsData.runs.filter(
      run => new Date(run.timestamp).getTime() > cutoffDate
    );

    const removedCount = originalCount - metricsData.runs.length;
    
    if (removedCount > 0) {
      this.saveMetricsData(metricsData);
      logger.info('Cleaned up old metrics', {
        removed: removedCount,
        remaining: metricsData.runs.length,
        retentionDays: this.config.retention_days
      });
    }
  }

  /**
   * Export metrics to CSV
   * 
   * @param workflow - Optional workflow filter
   * @param outputPath - Output file path
   */
  exportToCSV(workflow?: string, outputPath?: string): string {
    const metricsData = this.loadMetrics();
    
    if (!metricsData || metricsData.runs.length === 0) {
      return '';
    }

    let runs = metricsData.runs;
    if (workflow) {
      runs = runs.filter(run => run.workflow === workflow);
    }

    const headers = [
      'timestamp',
      'workflow',
      'run_id',
      'duration_ms',
      'token_consumption',
      'checkpoints_hit',
      'deviations',
      'success'
    ];

    const csvLines = [headers.join(',')];
    
    for (const run of runs) {
      const row = headers.map(header => {
        const value = (run as any)[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      });
      csvLines.push(row.join(','));
    }

    const csv = csvLines.join('\n');

    if (outputPath) {
      fs.writeFileSync(outputPath, csv, 'utf-8');
      logger.info('Metrics exported to CSV', { path: outputPath, rows: runs.length });
    }

    return csv;
  }

  // Private helper methods

  private loadMetrics(): { runs: WorkflowMetrics[] } | null {
    try {
      if (!fs.existsSync(this.metricsFile)) {
        return null;
      }
      const content = fs.readFileSync(this.metricsFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      const err = error as Error;
      logger.warn('Failed to load metrics', { error: err.message });
      return null;
    }
  }

  private async saveMetrics(metrics: WorkflowMetrics): Promise<void> {
    const metricsData = this.loadMetrics() || { runs: [] };
    metricsData.runs.push(metrics);
    this.saveMetricsData(metricsData);
  }

  private saveMetricsData(data: { runs: WorkflowMetrics[] }): void {
    try {
      fs.writeFileSync(this.metricsFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to save metrics', { error: err.message });
    }
  }

  private generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private calculateTrend(runs: WorkflowMetrics[]): 'improving' | 'stable' | 'degrading' {
    if (runs.length < 20) {
      return 'stable';
    }

    const recent = runs.slice(-10);
    const previous = runs.slice(-20, -10);

    const recentSuccessRate = recent.filter(r => r.success).length / recent.length;
    const previousSuccessRate = previous.filter(r => r.success).length / previous.length;

    const recentAvgDuration = this.average(recent.map(r => r.duration_ms));
    const previousAvgDuration = this.average(previous.map(r => r.duration_ms));

    // Improving if success rate increased OR duration decreased by >10%
    if (recentSuccessRate > previousSuccessRate + 0.05 ||
        recentAvgDuration < previousAvgDuration * 0.9) {
      return 'improving';
    }

    // Degrading if success rate decreased OR duration increased by >10%
    if (recentSuccessRate < previousSuccessRate - 0.05 ||
        recentAvgDuration > previousAvgDuration * 1.1) {
      return 'degrading';
    }

    return 'stable';
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }

  private getTrendEmoji(trend: string): string {
    switch (trend) {
      case 'improving': return '📈';
      case 'degrading': return '📉';
      default: return '➡️';
    }
  }
}

/**
 * Create a new metrics tracker instance
 */
export function createMetricsTracker(config?: Partial<MetricsConfig>): WorkflowMetricsTracker {
  return new WorkflowMetricsTracker(config);
}

/**
 * Quick helper to track a workflow execution
 * 
 * @param workflow - Workflow name
 * @param fn - Async function to track
 */
export async function trackWorkflow<T>(
  workflow: string,
  fn: () => Promise<T>,
  metadata?: Partial<WorkflowMetrics>
): Promise<T> {
  const tracker = createMetricsTracker();
  await tracker.initialize();
  
  const runId = tracker.startTracking(workflow, metadata);
  
  try {
    const result = await fn();
    await tracker.stopTracking(true);
    return result;
  } catch (error) {
    const err = error as Error;
    tracker.recordDeviation(err.message);
    await tracker.stopTracking(false);
    throw error;
  }
}
