#!/usr/bin/env node

/**
 * EZ Cost Tracker — Token usage and USD cost recording with budget enforcement
 * Persists entries to .planning/metrics.json using file-lock for concurrent safety.
 *
 * Usage:
 *   import CostTracker from './cost-tracker.js';
 *   const ct = new CostTracker(cwd);
 *   await ct.record({ phase: 30, provider: 'claude', model: 'claude-sonnet-4-6', input_tokens: 1000, output_tokens: 500 });
 *   const report = ct.aggregate();
 *   const budget = ct.checkBudget();
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { withLock } from './file-lock.js';
import { Logger } from './logger.js';
import { CostAlerts } from './cost-alerts.js';

const logger = new Logger();

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface CostConfig {
  enabled: boolean;
  budget: number | null;
  warning_threshold: number;
  auto_pause: boolean;
  rates: Record<string, { input: number; output: number }>;
}

export interface CostEntry {
  phase?: number;
  milestone?: string;
  provider?: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
  agent?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface CostFilter {
  phase?: number;
  milestone?: string;
  provider?: string;
  by_agent?: boolean;
}

export interface CostAggregate {
  total: { cost: number; tokens: number };
  by_phase: Record<string, { cost: number; tokens: number }>;
  by_provider: Record<string, { cost: number }>;
  by_agent?: Record<string, { cost: number; tokens: number }>;
}

export interface BudgetResult {
  status: 'ok' | 'warning' | 'exceeded';
  message: string;
  total?: number;
  ceiling?: number;
  percentUsed?: number;
  alerts?: any[];
}

export interface CostTrackerConfig {
  cwd?: string;
}

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Returns default cost configuration with model rates.
 */
export function defaultCostConfig(): CostConfig {
  return {
    enabled: true,
    budget: null,
    warning_threshold: 80,
    auto_pause: false,
    rates: {
      'claude-3': { input: 0.003, output: 0.015 },
      'claude-sonnet-4-6': { input: 0.003, output: 0.015 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'qwen': { input: 0.002, output: 0.006 },
      'kimi': { input: 0.002, output: 0.006 }
    }
  };
}

/**
 * Read cost_tracking section from .planning/config.json.
 * Falls back to defaultCostConfig() when absent or unreadable.
 * @param cwd - Working directory
 * @returns Cost configuration
 */
export function readCostConfig(cwd: string): CostConfig {
  const configPath = join(cwd, '.planning', 'config.json');
  if (!existsSync(configPath)) return defaultCostConfig();
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf8')) as any;
    return Object.assign(defaultCostConfig(), raw.cost_tracking || {});
  } catch {
    return defaultCostConfig();
  }
}

// ─── Cost Tracker Class ─────────────────────────────────────────────────────

/**
 * Cost Tracker class for recording and aggregating costs
 */
export class CostTracker {
  private readonly cwd: string;
  private readonly metricsPath: string;

  /**
   * Create a CostTracker instance
   * @param config - Configuration options
   */
  constructor(config: CostTrackerConfig = {}) {
    this.cwd = config.cwd ?? process.cwd();
    this.metricsPath = join(this.cwd, '.planning', 'metrics.json');
  }

  /**
   * Returns the cost_tracking config merged with defaults.
   */
  getConfig(): CostConfig {
    return readCostConfig(this.cwd);
  }

  /**
   * Record a cost entry to metrics.json atomically (via file-lock).
   * If cost_usd is not supplied, it is computed from token counts and model rates.
   * @param entry - Cost entry to record
   */
  async record(entry: CostEntry): Promise<void> {
    const planningDir = join(this.cwd, '.planning');
    if (!existsSync(planningDir)) {
      mkdirSync(planningDir, { recursive: true });
    }

    await withLock(this.metricsPath, async () => {
      let data: { version: string; entries: CostEntry[] } = { version: '1.0', entries: [] };
      if (existsSync(this.metricsPath)) {
        try {
          data = JSON.parse(readFileSync(this.metricsPath, 'utf8'));
          if (!Array.isArray(data.entries)) data.entries = [];
        } catch {
          logger.warn('cost-tracker: failed to parse metrics.json, reinitialising');
          data = { version: '1.0', entries: [] };
        }
      }

      let cost_usd = entry.cost_usd;
      if (cost_usd === undefined || cost_usd === null) {
        const cfg = readCostConfig(this.cwd);
        const rates = cfg.rates || {};
        const modelKey = entry.model;
        const providerKey = entry.provider;
        const rate = rates[modelKey!] || rates[providerKey!] || null;
        if (rate) {
          const inputTokens = entry.input_tokens || 0;
          const outputTokens = entry.output_tokens || 0;
          cost_usd = (inputTokens * rate.input + outputTokens * rate.output) / 1000;
        } else {
          cost_usd = 0;
        }
      }

      const fullEntry: CostEntry = Object.assign({}, entry, {
        timestamp: new Date().toISOString(),
        cost_usd
      });

      data.entries.push(fullEntry);
      writeFileSync(this.metricsPath, JSON.stringify(data, null, 2), 'utf8');
    });
  }

  /**
   * Aggregate cost entries, optionally filtered.
   * @param filter - Optional filter options
   * @returns Aggregated cost data
   */
  aggregate(filter: CostFilter = {}): CostAggregate {
    const emptyResult = (): CostAggregate => ({ total: { cost: 0, tokens: 0 }, by_phase: {}, by_provider: {} });

    if (!existsSync(this.metricsPath)) return emptyResult();

    let data: any;
    try {
      data = JSON.parse(readFileSync(this.metricsPath, 'utf8'));
    } catch {
      return emptyResult();
    }

    let entries = data.entries || [];

    if (filter.phase !== undefined) entries = entries.filter((e: CostEntry) => e.phase == filter.phase);
    if (filter.milestone) entries = entries.filter((e: CostEntry) => e.milestone === filter.milestone);
    if (filter.provider) entries = entries.filter((e: CostEntry) => e.provider === filter.provider);

    const result: CostAggregate = { total: { cost: 0, tokens: 0 }, by_phase: {}, by_provider: {} };

    for (const e of entries) {
      const phaseKey = String(e.phase ?? 'unknown');
      const phaseData = result.by_phase[phaseKey] ?? { cost: 0, tokens: 0 };
      phaseData.cost += e.cost_usd ?? 0;
      phaseData.tokens += (e.input_tokens ?? 0) + (e.output_tokens ?? 0);
      result.by_phase[phaseKey] = phaseData;

      const provKey = e.provider ?? 'unknown';
      const provData = result.by_provider[provKey] ?? { cost: 0 };
      provData.cost += e.cost_usd ?? 0;
      result.by_provider[provKey] = provData;

      result.total.cost += e.cost_usd ?? 0;
      result.total.tokens += (e.input_tokens ?? 0) + (e.output_tokens ?? 0);
    }

    if (filter.by_agent) {
      result.by_agent = {};
      for (const e of entries) {
        const agentKey = e.agent ?? 'unknown';
        const agentData = result.by_agent[agentKey] ?? { cost: 0, tokens: 0 };
        agentData.cost += e.cost_usd ?? 0;
        agentData.tokens += (e.input_tokens ?? 0) + (e.output_tokens ?? 0);
        result.by_agent[agentKey] = agentData;
      }
    }

    return result;
  }

  /**
   * Check total spending against a budget ceiling.
   * Triggers multi-threshold alerts when thresholds are crossed.
   * @param opts - Budget options
   * @returns Budget check result
   */
  async checkBudget(opts: { ceiling?: number; warning_threshold?: number } = {}): Promise<BudgetResult> {
    const cfg = this.getConfig();
    const ceiling = opts.ceiling !== undefined ? opts.ceiling : cfg.budget;
    const warning_threshold = opts.warning_threshold !== undefined ? opts.warning_threshold : cfg.warning_threshold;

    const agg = this.aggregate();
    const total = agg.total.cost;

    if (ceiling === null || ceiling === undefined || typeof ceiling !== 'number') {
      return { status: 'ok', message: 'No budget set' };
    }

    const percentUsed = (total / ceiling) * 100;
    const alerts = new CostAlerts({ cwd: this.cwd }).checkThresholds({ percentUsed, totalSpent: total, budget: ceiling });

    if (alerts.length > 0) {
      const costAlerts = new CostAlerts({ cwd: this.cwd });
      for (const alert of alerts) {
        await costAlerts.logAlert(alert);
      }
    }

    if (total >= ceiling) {
      return {
        status: 'exceeded',
        message: `Budget ceiling $${ceiling} exceeded ($${total.toFixed(4)} spent)`,
        total,
        ceiling,
        percentUsed,
        alerts
      };
    }

    if (percentUsed >= warning_threshold) {
      return {
        status: 'warning',
        message: `${percentUsed.toFixed(1)}% of budget used`,
        total,
        ceiling,
        percentUsed,
        alerts
      };
    }

    return {
      status: 'ok',
      message: 'Within budget',
      total,
      ceiling,
      percentUsed,
      alerts
    };
  }

  /**
   * Persist a budget ceiling (and optional warning threshold) to .planning/config.json.
   * @param ceiling - Budget ceiling
   * @param warningThreshold - Warning threshold percentage
   */
  setBudget(ceiling: number, warningThreshold?: number): void {
    const configPath = join(this.cwd, '.planning', 'config.json');
    const planningDir = join(this.cwd, '.planning');

    if (!existsSync(planningDir)) {
      mkdirSync(planningDir, { recursive: true });
    }

    let config: any = {};
    if (existsSync(configPath)) {
      try {
        config = JSON.parse(readFileSync(configPath, 'utf8'));
      } catch {
        config = {};
      }
    }

    if (!config.cost_tracking) config.cost_tracking = {};
    config.cost_tracking.budget = ceiling;
    if (warningThreshold !== undefined) {
      config.cost_tracking.warning_threshold = warningThreshold;
    }

    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  }
}

// ─── Default Export ─────────────────────────────────────────────────────────

export default CostTracker;
