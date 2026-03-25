#!/usr/bin/env node

/**
 * Budget Enforcer — Enforces spending limits and auto-pauses over-budget operations
 * Integrates with cost-tracker for budget ceiling enforcement
 *
 * Usage:
 *   import { BudgetEnforcer, checkBudget, enforce } from './finops/budget-enforcer.js';
 *   const enforcer = new BudgetEnforcer(cwd);
 *   const status = enforcer.checkBudget(currentCost);
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface BudgetStatus {
  ok: boolean;
  warning: boolean;
  exceeded: boolean;
  action: 'none' | 'warn' | 'alert' | 'pause';
  percentage?: number;
}

export interface BudgetConfig {
  ceiling?: number;
  warning_threshold?: number;
  auto_pause?: boolean;
}

export interface FinopsConfig {
  cost_tracking?: {
    budget?: BudgetConfig;
    warning_threshold?: number;
    auto_pause?: boolean;
  };
}

export interface BudgetEnforcerConfig {
  cwd?: string;
}

// ─── Budget Enforcer Class ──────────────────────────────────────────────────

/**
 * Budget Enforcer class for enforcing spending limits
 */
export class BudgetEnforcer {
  private readonly cwd: string;
  private readonly configPath: string;

  /**
   * Create a BudgetEnforcer instance
   * @param config - Configuration options
   */
  constructor(config: BudgetEnforcerConfig = {}) {
    this.cwd = config.cwd ?? process.cwd();
    this.configPath = join(this.cwd, '.planning', 'config.json');
  }

  /**
   * Check if budget is exceeded
   * @param currentCost - Current total cost
   * @returns Budget status
   */
  checkBudget(currentCost: number): BudgetStatus {
    const config = this.loadConfig();
    const ceiling = config.cost_tracking?.budget?.ceiling ?? null;
    const warningThreshold = config.cost_tracking?.warning_threshold ?? 80;

    if (!ceiling) {
      return { ok: true, warning: false, exceeded: false, action: 'none' };
    }

    const percentage = (currentCost / ceiling) * 100;

    if (percentage >= 100) {
      return {
        ok: false,
        warning: false,
        exceeded: true,
        action: config.cost_tracking?.auto_pause ? 'pause' : 'alert',
        percentage: Math.round(percentage)
      };
    }

    if (percentage >= warningThreshold) {
      return {
        ok: true,
        warning: true,
        exceeded: false,
        action: 'warn',
        percentage: Math.round(percentage)
      };
    }

    return { ok: true, warning: false, exceeded: false, action: 'none', percentage: Math.round(percentage) };
  }

  /**
   * Enforce budget (exit if exceeded and auto_pause enabled)
   * @param currentCost - Current total cost
   * @returns Budget status
   */
  enforce(currentCost: number): BudgetStatus {
    const status = this.checkBudget(currentCost);

    if (status.exceeded && status.action === 'pause') {
      console.error(`Budget ceiling exceeded (${status.percentage}%) — operations paused`);
      process.exit(1);
    }

    if (status.warning) {
      console.warn(`Budget warning: ${status.percentage}% of ceiling used`);
    }

    return status;
  }

  /**
   * Set budget ceiling
   * @param ceiling - Budget ceiling in USD
   */
  setCeiling(ceiling: number): void {
    const config = this.loadConfig();
    if (!config.cost_tracking) config.cost_tracking = {};
    if (!config.cost_tracking.budget) config.cost_tracking.budget = {};
    config.cost_tracking.budget.ceiling = ceiling;
    this.saveConfig(config);
  }

  /**
   * Load config
   * @returns Configuration object
   */
  loadConfig(): FinopsConfig {
    if (!existsSync(this.configPath)) {
      return { cost_tracking: { budget: {}, warning_threshold: 80 } };
    }
    return JSON.parse(readFileSync(this.configPath, 'utf8')) as FinopsConfig;
  }

  /**
   * Save config
   * @param config - Configuration to save
   */
  saveConfig(config: FinopsConfig): void {
    const planningDir = join(this.cwd, '.planning');
    if (!existsSync(planningDir)) {
      mkdirSync(planningDir, { recursive: true });
    }
    writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
  }
}

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Check budget status
 * @param currentCost - Current cost
 * @param config - Configuration options
 * @returns Budget status
 */
export function checkBudget(currentCost: number, config: BudgetEnforcerConfig = {}): BudgetStatus {
  const enforcer = new BudgetEnforcer(config);
  return enforcer.checkBudget(currentCost);
}

/**
 * Enforce budget
 * @param currentCost - Current cost
 * @param config - Configuration options
 * @returns Budget status
 */
export function enforce(currentCost: number, config: BudgetEnforcerConfig = {}): BudgetStatus {
  const enforcer = new BudgetEnforcer(config);
  return enforcer.enforce(currentCost);
}

// ─── Default Export ─────────────────────────────────────────────────────────

export default BudgetEnforcer;
