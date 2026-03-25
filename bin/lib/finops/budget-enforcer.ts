/**
 * Budget Enforcer — Enforces spending limits and auto-pauses over-budget operations
 * Integrates with cost-tracker for budget ceiling enforcement
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────

interface BudgetStatus {
  ok: boolean;
  warning: boolean;
  exceeded: boolean;
  action: 'none' | 'warn' | 'alert' | 'pause';
  percentage?: number;
}

interface Config {
  cost_tracking?: {
    budget?: {
      ceiling?: number;
    };
    warning_threshold?: number;
    auto_pause?: boolean;
  };
}

// ─────────────────────────────────────────────
// BudgetEnforcer Class
// ─────────────────────────────────────────────

export class BudgetEnforcer {
  #cwd: string;
  #configPath: string;

  constructor(cwd?: string) {
    this.#cwd = cwd || process.cwd();
    this.#configPath = path.join(this.#cwd, '.planning', 'config.json');
  }

  /**
   * Check if budget is exceeded
   * @param currentCost - Current total cost
   * @returns Budget status
   */
  checkBudget(currentCost: number): BudgetStatus {
    const config = this.loadConfig();
    const ceiling = config.cost_tracking?.budget?.ceiling || null;
    const warningThreshold = config.cost_tracking?.warning_threshold || 80;

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
   * @returns Config object
   */
  loadConfig(): Config {
    if (!fs.existsSync(this.#configPath)) {
      return { cost_tracking: { budget: {}, warning_threshold: 80 } };
    }
    return JSON.parse(fs.readFileSync(this.#configPath, 'utf8')) as Config;
  }

  /**
   * Save config
   * @param config - Config to save
   */
  saveConfig(config: Config): void {
    fs.writeFileSync(this.#configPath, JSON.stringify(config, null, 2), 'utf8');
  }
}

// ─────────────────────────────────────────────
// Standalone Functions
// ─────────────────────────────────────────────

/**
 * Check budget status
 * @param currentCost - Current cost
 * @param cwd - Working directory
 * @returns Budget status
 */
export function checkBudget(currentCost: number, cwd?: string): BudgetStatus {
  const enforcer = new BudgetEnforcer(cwd);
  return enforcer.checkBudget(currentCost);
}

/**
 * Enforce budget
 * @param currentCost - Current cost
 * @param cwd - Working directory
 * @returns Budget status
 */
export function enforce(currentCost: number, cwd?: string): BudgetStatus {
  const enforcer = new BudgetEnforcer(cwd);
  return enforcer.enforce(currentCost);
}

// ─────────────────────────────────────────────
// CLI Interface
// ─────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'check' && args[1]) {
    const currentCost = parseFloat(args[1]);
    const cwd = args[2] || process.cwd();

    if (isNaN(currentCost)) {
      console.error('Error: current_cost must be a number');
      console.error('Usage: node budget-enforcer.ts check <current_cost> [cwd]');
      process.exit(1);
    }

    const status = checkBudget(currentCost, cwd);
    console.log(JSON.stringify(status, null, 2));
    process.exit(status.exceeded ? 1 : 0);

  } else if (command === 'set' && args[1]) {
    const ceiling = parseFloat(args[1]);
    const cwd = args[2] || process.cwd();

    if (isNaN(ceiling)) {
      console.error('Error: ceiling must be a number');
      console.error('Usage: node budget-enforcer.ts set <ceiling> [cwd]');
      process.exit(1);
    }

    const enforcer = new BudgetEnforcer(cwd);
    enforcer.setCeiling(ceiling);
    console.log(JSON.stringify({ success: true, ceiling }));
    process.exit(0);

  } else if (command === 'status') {
    const cwd = args[1] || process.cwd();
    const enforcer = new BudgetEnforcer(cwd);
    const config = enforcer.loadConfig();

    console.log('Budget Enforcer Status:');
    console.log(`  Ceiling: $${config.cost_tracking?.budget?.ceiling || 'not set'}`);
    console.log(`  Warning threshold: ${config.cost_tracking?.warning_threshold || 80}%`);
    console.log(`  Auto-pause: ${config.cost_tracking?.auto_pause ? 'enabled' : 'disabled'}`);
    process.exit(0);

  } else {
    console.log('Budget Enforcer - Enforces spending limits and auto-pauses over-budget operations');
    console.log('');
    console.log('Usage:');
    console.log('  node budget-enforcer.ts check <current_cost> [cwd]');
    console.log('  node budget-enforcer.ts set <ceiling> [cwd]');
    console.log('  node budget-enforcer.ts status [cwd]');
    console.log('');
    console.log('Commands:');
    console.log('  check   - Check if current cost exceeds budget');
    console.log('  set     - Set budget ceiling');
    console.log('  status  - Show current budget configuration');
    process.exit(0);
  }
}
