'use strict';
/**
 * EZ Cost Tracker — Token usage and USD cost recording with budget enforcement
 * Persists entries to .planning/metrics.json using file-lock for concurrent safety.
 */

import * as fs from 'fs';
import * as path from 'path';
import { withSimpleLock } from '../file/index.js';
import Logger, { defaultLogger as logger } from '../logger/index.js';
import { CostAlerts } from './cost-alerts.js';

interface CostConfig {
  enabled: boolean;
  budget: number | null;
  warning_threshold: number;
  auto_pause: boolean;
  rates: Record<string, { input: number; output: number }>;
}

interface CostEntry {
  phase?: number | string;
  milestone?: string;
  provider: string;
  model: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
  timestamp?: string;
  agent?: string;
  [key: string]: unknown;
}

interface MetricsData {
  version: string;
  entries: CostEntry[];
}

interface AggregateFilter {
  phase?: number | string;
  milestone?: string;
  provider?: string;
  by_agent?: boolean;
}

interface AggregateResult {
  total: { cost: number; tokens: number };
  by_phase: Record<string, { cost: number; tokens: number }>;
  by_provider: Record<string, { cost: number }>;
  by_agent?: Record<string, { cost: number; tokens: number }>;
}

interface BudgetCheckResult {
  status: 'ok' | 'warning' | 'exceeded';
  message: string;
  total?: number;
  ceiling?: number;
  percentUsed?: number;
  alerts?: Alert[];
}

interface Alert {
  threshold: number;
  level: string;
  percentUsed: number;
  totalSpent: number;
  budget: number;
  message: string;
  timestamp: string;
}

/**
 * Returns default cost configuration with model rates.
 */
function defaultCostConfig(): CostConfig {
  return {
    enabled: true,
    budget: null,
    warning_threshold: 80,
    auto_pause: false,
    rates: {
      'claude-3':          { input: 0.003, output: 0.015 },
      'claude-sonnet-4-6': { input: 0.003, output: 0.015 },
      'gpt-4':             { input: 0.03,  output: 0.06  },
      'qwen':              { input: 0.002, output: 0.006 },
      'kimi':              { input: 0.002, output: 0.006 },
    },
  };
}

/**
 * Read cost_tracking section from .planning/config.json.
 * @param cwd - Working directory
 * @returns Cost configuration
 */
function readCostConfig(cwd: string): CostConfig {
  const configPath = path.join(cwd, '.planning', 'config.json');
  if (!fs.existsSync(configPath)) return defaultCostConfig();
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.assign(defaultCostConfig(), (parsed.cost_tracking as CostConfig) || {});
  } catch {
    return defaultCostConfig();
  }
}

class CostTracker {
  private readonly cwd: string;
  private readonly metricsPath: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.metricsPath = path.join(this.cwd, '.planning', 'metrics.json');
  }

  /**
   * Returns the cost_tracking config merged with defaults.
   */
  getConfig(): CostConfig {
    return readCostConfig(this.cwd);
  }

  /**
   * Record a cost entry to metrics.json atomically.
   * @param entry - Cost entry to record
   */
  async record(entry: CostEntry): Promise<void> {
    const planningDir = path.join(this.cwd, '.planning');
    if (!fs.existsSync(planningDir)) {
      fs.mkdirSync(planningDir, { recursive: true });
    }

    await withSimpleLock(this.metricsPath, async () => {
      let data: MetricsData = { version: '1.0', entries: [] };
      if (fs.existsSync(this.metricsPath)) {
        try {
          data = JSON.parse(fs.readFileSync(this.metricsPath, 'utf8')) as MetricsData;
          if (!Array.isArray(data.entries)) data.entries = [];
        } catch (e) {
          const error = e as Error;
          logger.warn('cost-tracker: failed to parse metrics.json, reinitialising', { error: error.message });
          data = { version: '1.0', entries: [] };
        }
      }

      // Compute cost_usd if not provided
      let cost_usd = entry.cost_usd;
      if (cost_usd === undefined || cost_usd === null) {
        const cfg = readCostConfig(this.cwd);
        const rates = cfg.rates || {};
        const modelKey = entry.model;
        const providerKey = entry.provider;
        const rate = rates[modelKey] || rates[providerKey] || null;
        if (rate) {
          const inputTokens = entry.input_tokens || 0;
          const outputTokens = entry.output_tokens || 0;
          cost_usd = (inputTokens * rate.input + outputTokens * rate.output) / 1000;
        } else {
          cost_usd = 0;
        }
      }

      const fullEntry: CostEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
        cost_usd,
      };

      data.entries.push(fullEntry);
      fs.writeFileSync(this.metricsPath, JSON.stringify(data, null, 2), 'utf8');
    });
  }

  /**
   * Aggregate cost entries, optionally filtered.
   * @param filter - Optional filter
   * @returns Aggregated results
   */
  aggregate(filter: AggregateFilter = {}): AggregateResult {
    const emptyResult = (): AggregateResult => ({ total: { cost: 0, tokens: 0 }, by_phase: {}, by_provider: {} });

    if (!fs.existsSync(this.metricsPath)) return emptyResult();

    let data: MetricsData;
    try {
      data = JSON.parse(fs.readFileSync(this.metricsPath, 'utf8')) as MetricsData;
    } catch {
      return emptyResult();
    }

    let entries = data.entries || [];

    if (filter.phase !== undefined) entries = entries.filter(e => e.phase == filter.phase);
    if (filter.milestone)          entries = entries.filter(e => e.milestone === filter.milestone);
    if (filter.provider)           entries = entries.filter(e => e.provider === filter.provider);

    const result: AggregateResult = { total: { cost: 0, tokens: 0 }, by_phase: {}, by_provider: {} };

    for (const e of entries) {
      const phaseKey = String(e.phase || 'unknown');
      if (!result.by_phase[phaseKey]) result.by_phase[phaseKey] = { cost: 0, tokens: 0 };
      result.by_phase[phaseKey]!.cost   += e.cost_usd || 0;
      result.by_phase[phaseKey]!.tokens += (e.input_tokens || 0) + (e.output_tokens || 0);

      const provKey = e.provider || 'unknown';
      if (!result.by_provider[provKey]) result.by_provider[provKey] = { cost: 0 };
      result.by_provider[provKey]!.cost += e.cost_usd || 0;

      result.total.cost   += e.cost_usd || 0;
      result.total.tokens += (e.input_tokens || 0) + (e.output_tokens || 0);
    }

    // Add by_agent breakdown if requested
    if (filter.by_agent) {
      result.by_agent = {};
      for (const e of entries) {
        const agentKey = e.agent || 'unknown';
        if (!result.by_agent[agentKey]) result.by_agent[agentKey] = { cost: 0, tokens: 0 };
        result.by_agent[agentKey]!.cost += e.cost_usd || 0;
        result.by_agent[agentKey]!.tokens += (e.input_tokens || 0) + (e.output_tokens || 0);
      }
    }

    return result;
  }

  /**
   * Check total spending against a budget ceiling.
   * @param opts - Budget options
   * @returns Budget check result
   */
  async checkBudget(opts: Record<string, unknown> = {}): Promise<BudgetCheckResult> {
    const cfg = this.getConfig();
    const ceiling = (opts.ceiling !== undefined) ? opts.ceiling as number : cfg.budget;
    const warning_threshold = (opts.warning_threshold !== undefined) ? opts.warning_threshold as number : cfg.warning_threshold;

    const agg = this.aggregate();
    const total = agg.total.cost;

    if (ceiling === null || ceiling === undefined || typeof ceiling !== 'number') {
      return { status: 'ok', message: 'No budget set' };
    }

    const percentUsed = (total / ceiling) * 100;
    const alerts = new CostAlerts(this.cwd).checkThresholds({ percentUsed, totalSpent: total, budget: ceiling });

    // Log triggered alerts
    if (alerts.length > 0) {
      const costAlerts = new CostAlerts(this.cwd);
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
   * Persist a budget ceiling to .planning/config.json.
   * @param ceiling - Budget ceiling
   * @param warningThreshold - Warning threshold
   */
  setBudget(ceiling: number, warningThreshold?: number): void {
    const configPath = path.join(this.cwd, '.planning', 'config.json');
    const planningDir = path.join(this.cwd, '.planning');

    if (!fs.existsSync(planningDir)) {
      fs.mkdirSync(planningDir, { recursive: true });
    }

    let config: Record<string, unknown> = {};
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Record<string, unknown>;
      } catch {
        config = {};
      }
    }

    if (!config.cost_tracking) config.cost_tracking = {};
    (config.cost_tracking as Record<string, unknown>).budget = ceiling;
    if (warningThreshold !== undefined) {
      (config.cost_tracking as Record<string, unknown>).warning_threshold = warningThreshold;
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  }
}

export default CostTracker;

export type { CostConfig, CostEntry, MetricsData, AggregateFilter, AggregateResult, BudgetCheckResult, Alert };
