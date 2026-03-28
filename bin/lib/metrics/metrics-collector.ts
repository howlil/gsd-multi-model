/**
 * Metrics Collector — Lightweight performance metrics
 *
 * Collects and stores performance metrics for production monitoring.
 * 90-day retention, JSON file storage.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { defaultLogger as logger } from '../logger/index.js';

const METRICS_DIR = join(process.cwd(), '.planning', 'metrics');
const METRICS_FILE = join(METRICS_DIR, 'metrics.json');
const RETENTION_DAYS = 90;

export interface PhaseMetrics {
  phase: number;
  timestamp: string;
  duration: {
    totalMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
  };
  cost: {
    tokens: number;
    usd: number;
  };
  tokenEfficiency: {
    used: number;
    budgeted: number;
    wastePercent: number;
  };
  successRate: {
    phase: number;
    agent: Record<string, number>;
  };
  retryRate: {
    total: number;
    successAfterRetry: number;
  };
  resourceUtilization: {
    memoryMb: number;
    cpuTimeMs: number;
  };
  errorRate: {
    total: number;
    byType: Record<string, number>;
  };
  throughput: {
    phasesPerDay: number;
    tasksPerDay: number;
  };
  slaCompliance: {
    durationSla: number;
    costSla: number;
  };
}

export class MetricsCollector {
  private metrics: PhaseMetrics[] = [];

  constructor() {
    this.loadMetrics();
  }

  private loadMetrics(): void {
    try {
      if (existsSync(METRICS_FILE)) {
        this.metrics = JSON.parse(readFileSync(METRICS_FILE, 'utf8'));
        this.cleanupOldMetrics();
      }
    } catch (err) {
      logger.warn('Failed to load metrics', { error: (err as Error).message });
      this.metrics = [];
    }
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => 
      new Date(m.timestamp).getTime() > cutoff
    );
  }

  async recordPhase(phase: number, metrics: Partial<PhaseMetrics>): Promise<void> {
    const phaseMetrics: PhaseMetrics = {
      phase,
      timestamp: new Date().toISOString(),
      duration: metrics.duration || { totalMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0 },
      cost: metrics.cost || { tokens: 0, usd: 0 },
      tokenEfficiency: metrics.tokenEfficiency || { used: 0, budgeted: 0, wastePercent: 0 },
      successRate: metrics.successRate || { phase: 100, agent: {} },
      retryRate: metrics.retryRate || { total: 0, successAfterRetry: 0 },
      resourceUtilization: metrics.resourceUtilization || { memoryMb: 0, cpuTimeMs: 0 },
      errorRate: metrics.errorRate || { total: 0, byType: {} },
      throughput: metrics.throughput || { phasesPerDay: 0, tasksPerDay: 0 },
      slaCompliance: metrics.slaCompliance || { durationSla: 100, costSla: 100 }
    };

    this.metrics.push(phaseMetrics);
    await this.saveMetrics();
  }

  private async saveMetrics(): Promise<void> {
    try {
      if (!existsSync(METRICS_DIR)) {
        mkdirSync(METRICS_DIR, { recursive: true });
      }
      writeFileSync(METRICS_FILE, JSON.stringify(this.metrics, null, 2), 'utf8');
    } catch (err) {
      logger.error('Failed to save metrics', { error: (err as Error).message });
    }
  }

  getMetrics(phase?: number): PhaseMetrics[] {
    if (phase !== undefined) {
      return this.metrics.filter(m => m.phase === phase);
    }
    return this.metrics;
  }

  getLatestMetrics(): PhaseMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }
}
