#!/usr/bin/env node

/**
 * Metrics Tracker — Records and queries EZ Agents success metrics
 *
 * Manages .planning/metrics.json: phase velocity, BDD pass rate,
 * defect density, token cost, and DORA-inspired metrics.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { withLock } = require('./file-lock.cjs');

const METRICS_PATH = '.planning/metrics.json';

// ─────────────────────────────────────────────
// Metric Thresholds
// ─────────────────────────────────────────────

const METRIC_THRESHOLDS = {
  deviation_rate:     { warn: 0.2, bad: 0.4 },  // DORA: change failure rate
  avg_velocity_min:   { warn: 120, bad: 240 },   // warn if avg > 2h, bad if > 4h
  bdd_pass_rate:      { warn: 0.8, bad: 0.6 },   // MVP: 60%, Medium: 80%
  test_coverage:      { warn: 60, bad: 40 }       // warn below 60%
};

function getThresholdStatus(value, thresholds, lowerIsBetter = false) {
  if (lowerIsBetter) {
    if (value >= thresholds.bad) return '🔴';
    if (value >= thresholds.warn) return '🟡';
    return '🟢';
  } else {
    if (value <= thresholds.bad) return '🔴';
    if (value <= thresholds.warn) return '🟡';
    return '🟢';
  }
}

// ─────────────────────────────────────────────
// Schema defaults
// ─────────────────────────────────────────────

function defaultMetrics(project) {
  return {
    schema_version: '1.0',
    project: project || 'unknown',
    updated: new Date().toISOString(),
    phase_metrics: [],
    project_metrics: {
      requirements_coverage_pct: 0,
      test_coverage_pct: 0,
      bdd_scenarios_total: 0,
      bdd_scenarios_passing: 0,
      bdd_scenarios_must: 0,
      bdd_scenarios_must_passing: 0
    },
    agent_metrics: {
      total_token_cost_usd: 0,
      avg_cost_per_plan: 0,
      deviation_rate: 0,
      avg_plans_per_phase: 0,
      avg_velocity_min_per_plan: 0
    },
    business_metrics: {
      time_to_first_ship_days: null,
      hotfixes_deployed: 0,
      milestones_shipped: 0,
      current_tier: 'mvp',
      phases_total: 0,
      phases_completed: 0
    }
  };
}

// ─────────────────────────────────────────────
// Load / Save
// ─────────────────────────────────────────────

function loadMetrics(metricsPath = METRICS_PATH) {
  const fullPath = path.resolve(process.cwd(), metricsPath);
  if (!fs.existsSync(fullPath)) {
    return defaultMetrics();
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch {
    return defaultMetrics();
  }
}

function saveMetrics(metrics, metricsPath = METRICS_PATH) {
  const fullPath = path.resolve(process.cwd(), metricsPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  metrics.updated = new Date().toISOString();
  fs.writeFileSync(fullPath, JSON.stringify(metrics, null, 2) + '\n', 'utf8');
}

async function saveMetricsLocked(metrics, metricsPath = METRICS_PATH) {
  const fullPath = path.resolve(process.cwd(), metricsPath);
  return withLock(fullPath, async () => {
    saveMetrics(metrics, metricsPath);
  });
}

// ─────────────────────────────────────────────
// Phase Metrics
// ─────────────────────────────────────────────

/**
 * Record phase execution metrics (called by ez-executor after plan completion)
 * @param {object} data - { phase, phase_name, plans_total, plans_completed, velocity_min, deviation_count, tasks_total, cost_usd }
 */
async function recordPlanMetrics(data, metricsPath = METRICS_PATH) {
  const fullPath = path.resolve(process.cwd(), metricsPath);
  return withLock(fullPath, async () => {
    const metrics = loadMetrics(metricsPath); // read INSIDE lock

    const existing = metrics.phase_metrics.find(m => m.phase === data.phase);
    if (existing) {
      // Update existing phase entry
      Object.assign(existing, {
        plans_completed: data.plans_completed || existing.plans_completed,
        velocity_min: data.velocity_min || existing.velocity_min,
        deviation_count: (existing.deviation_count || 0) + (data.deviation_count || 0),
        defect_density: data.tasks_total > 0
          ? ((existing.deviation_count || 0) + (data.deviation_count || 0)) / data.tasks_total
          : existing.defect_density
      });
    } else {
      metrics.phase_metrics.push({
        phase: data.phase,
        phase_name: data.phase_name || `phase-${data.phase}`,
        plans_total: data.plans_total || 0,
        plans_completed: data.plans_completed || 0,
        velocity_min: data.velocity_min || 0,
        defect_density: data.tasks_total > 0 ? (data.deviation_count || 0) / data.tasks_total : 0,
        bdd_pass_rate: null, // filled by verifier
        bdd_must_passing: null,
        bdd_must_total: null,
        deviation_count: data.deviation_count || 0,
        completed_at: new Date().toISOString()
      });
    }

    // Update agent metrics
    if (data.cost_usd) {
      metrics.agent_metrics.total_token_cost_usd =
        (metrics.agent_metrics.total_token_cost_usd || 0) + data.cost_usd;
    }

    // Recalculate averages
    _recalcAverages(metrics);
    saveMetrics(metrics, metricsPath); // write INSIDE lock
    return metrics.phase_metrics.find(m => m.phase === data.phase);
  });
}

/**
 * Record BDD verification results (called by ez-verifier)
 * @param {object} data - { phase, bdd_must_passing, bdd_must_total, bdd_pass_rate, test_coverage_pct }
 */
async function recordBddMetrics(data, metricsPath = METRICS_PATH) {
  const fullPath = path.resolve(process.cwd(), metricsPath);
  return withLock(fullPath, async () => {
    const metrics = loadMetrics(metricsPath); // read INSIDE lock

    const phaseEntry = metrics.phase_metrics.find(m => m.phase === data.phase);
    if (phaseEntry) {
      phaseEntry.bdd_pass_rate = data.bdd_pass_rate;
      phaseEntry.bdd_must_passing = data.bdd_must_passing;
      phaseEntry.bdd_must_total = data.bdd_must_total;
    }

    if (data.test_coverage_pct !== undefined) {
      metrics.project_metrics.test_coverage_pct = data.test_coverage_pct;
    }
    if (data.bdd_must_passing !== undefined) {
      metrics.project_metrics.bdd_scenarios_must_passing = data.bdd_must_passing;
      metrics.project_metrics.bdd_scenarios_must = data.bdd_must_total;
    }

    saveMetrics(metrics, metricsPath); // write INSIDE lock
  });
}

/**
 * Record release event (called by ez-release-agent)
 * @param {object} data - { tier, version, is_hotfix }
 */
async function recordRelease(data, metricsPath = METRICS_PATH) {
  const fullPath = path.resolve(process.cwd(), metricsPath);
  return withLock(fullPath, async () => {
    const metrics = loadMetrics(metricsPath); // read INSIDE lock

    if (data.is_hotfix) {
      metrics.business_metrics.hotfixes_deployed =
        (metrics.business_metrics.hotfixes_deployed || 0) + 1;
    } else {
      metrics.business_metrics.milestones_shipped =
        (metrics.business_metrics.milestones_shipped || 0) + 1;

      if (!metrics.business_metrics.first_ship_date) {
        metrics.business_metrics.first_ship_date = new Date().toISOString();
        // Calculate time to first ship from project init
        const planningStateFile = '.planning/STATE.md';
        if (fs.existsSync(planningStateFile)) {
          const stat = fs.statSync(planningStateFile);
          const initDate = stat.birthtime || stat.mtime;
          const days = Math.ceil((Date.now() - initDate.getTime()) / (1000 * 60 * 60 * 24));
          metrics.business_metrics.time_to_first_ship_days = days;
        }
      }
    }

    if (data.tier) {
      metrics.business_metrics.current_tier = data.tier;
    }

    saveMetrics(metrics, metricsPath); // write INSIDE lock
  });
}

/**
 * Update project-level metrics
 * @param {object} data - { requirements_coverage_pct, phases_total, phases_completed }
 */
async function updateProjectMetrics(data, metricsPath = METRICS_PATH) {
  const fullPath = path.resolve(process.cwd(), metricsPath);
  return withLock(fullPath, async () => {
    const metrics = loadMetrics(metricsPath); // read INSIDE lock
    Object.assign(metrics.project_metrics, data);
    Object.assign(metrics.business_metrics, {
      phases_total: data.phases_total || metrics.business_metrics.phases_total,
      phases_completed: data.phases_completed || metrics.business_metrics.phases_completed
    });
    saveMetrics(metrics, metricsPath); // write INSIDE lock
  });
}

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────

/**
 * Generate enhanced /ez:stats dashboard
 * @param {string} metricsPath
 * @returns {string} Formatted dashboard
 */
function generateDashboard(metricsPath = METRICS_PATH) {
  const metrics = loadMetrics(metricsPath);
  const pm = metrics.project_metrics;
  const am = metrics.agent_metrics;
  const bm = metrics.business_metrics;

  // Velocity trend
  const phases = metrics.phase_metrics.slice(-5);
  let velocityTrend = '→ STABLE';
  if (phases.length >= 3) {
    const recent = phases.slice(-2).reduce((sum, p) => sum + (p.velocity_min || 0), 0) / 2;
    const older = phases.slice(0, -2).reduce((sum, p) => sum + (p.velocity_min || 0), 0) / Math.max(1, phases.length - 2);
    if (recent < older * 0.9) velocityTrend = '↑ IMPROVING';
    else if (recent > older * 1.1) velocityTrend = '↓ SLOWING';
  }

  // BDD status
  const bddRate = pm.bdd_scenarios_must > 0
    ? Math.round((pm.bdd_scenarios_must_passing / pm.bdd_scenarios_must) * 100)
    : null;

  // Cost estimate remaining
  const remainingPhases = (bm.phases_total || 0) - (bm.phases_completed || 0);
  const costEst = am.avg_cost_per_plan > 0 && am.avg_plans_per_phase > 0
    ? (remainingPhases * am.avg_plans_per_phase * am.avg_cost_per_plan).toFixed(2)
    : null;

  const lines = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ' EZ ► PROJECT METRICS DASHBOARD',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `PROGRESS:  Phase ${bm.phases_completed || '?'}/${bm.phases_total || '?'} (${bm.phases_total ? Math.round((bm.phases_completed / bm.phases_total) * 100) : '?'}%) | Requirements ${pm.requirements_coverage_pct || 0}%${bddRate !== null ? ` | BDD @must ${bddRate}% (est.)` : ''}`,
    `VELOCITY:  ${am.avg_velocity_min_per_plan || '?'} min/plan avg | Trend: ${velocityTrend}`,
  ];

  // Fix 12: QUALITY line with threshold indicators
  const coveragePct = pm.test_coverage_pct || 0;
  const deviationRate = am.deviation_rate || 0;
  const coverageIcon = getThresholdStatus(coveragePct, METRIC_THRESHOLDS.test_coverage);
  const deviationIcon = getThresholdStatus(deviationRate, METRIC_THRESHOLDS.deviation_rate, true);
  const deviationPct = Math.round(deviationRate * 100);
  lines.push(`QUALITY:   ${coverageIcon} Coverage ${coveragePct}% | ${deviationIcon} Deviation ${deviationPct}%${deviationRate >= METRIC_THRESHOLDS.deviation_rate.warn ? ` (warn: >${Math.round(METRIC_THRESHOLDS.deviation_rate.warn * 100)}%)` : ''} | Defect density ${am.deviation_rate ? am.deviation_rate.toFixed(2) : '?'}`);
  lines.push(`COSTS:     $${(am.total_token_cost_usd || 0).toFixed(2)} total | $${(am.avg_cost_per_plan || 0).toFixed(2)}/plan${costEst ? ` | Est. remaining: ~$${costEst}` : ''}`);
  lines.push(`RELEASE:   Tier: ${bm.current_tier || 'mvp'} | Hotfixes: ${bm.hotfixes_deployed || 0} | Ships: ${bm.milestones_shipped || 0}`);
  lines.push('');

  if (metrics.phase_metrics.length > 0) {
    lines.push('Recent Phases:');
    for (const p of metrics.phase_metrics.slice(-5).reverse()) {
      const bdd = p.bdd_pass_rate !== null && p.bdd_pass_rate !== undefined
        ? ` | BDD ${Math.round(p.bdd_pass_rate * 100)}%`
        : '';
      lines.push(`  Phase ${p.phase} ${p.phase_name}: ${p.velocity_min || '?'}min | dev:${(p.defect_density || 0).toFixed(2)}${bdd}`);
    }
    lines.push('');
  }

  // Fix 12: Cost projection alert
  if (am.total_token_cost_usd > 5) {
    const projectedTotal = costEst ? parseFloat(costEst) + am.total_token_cost_usd : null;
    if (projectedTotal && projectedTotal > 30) {
      lines.push(`⚠  COST ALERT: Projected total ~$${projectedTotal.toFixed(0)}. Consider disabling scrum_master_standup for budget tiers.`);
    }
  }

  lines.push('─────────────────────────────────────────────────────');
  lines.push('⚠  BDD rates are ESTIMATED (scenario existence, not test runs).');
  lines.push('   For actual pass rates, configure a BDD runner (Jest/Cucumber/Playwright).');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return lines.join('\n');
}

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

function _recalcAverages(metrics) {
  const phases = metrics.phase_metrics;
  if (phases.length === 0) return;

  const withVelocity = phases.filter(p => p.velocity_min > 0);
  if (withVelocity.length > 0) {
    metrics.agent_metrics.avg_velocity_min_per_plan =
      Math.round(withVelocity.reduce((sum, p) => sum + p.velocity_min, 0) / withVelocity.length);
  }

  const totalDeviations = phases.reduce((sum, p) => sum + (p.deviation_count || 0), 0);
  const totalPlans = phases.reduce((sum, p) => sum + (p.plans_completed || 0), 0);
  if (totalPlans > 0) {
    metrics.agent_metrics.deviation_rate = parseFloat((totalDeviations / totalPlans).toFixed(3));
    metrics.agent_metrics.avg_plans_per_phase = parseFloat((totalPlans / phases.length).toFixed(1));
  }

  if (metrics.agent_metrics.total_token_cost_usd > 0 && totalPlans > 0) {
    metrics.agent_metrics.avg_cost_per_plan =
      parseFloat((metrics.agent_metrics.total_token_cost_usd / totalPlans).toFixed(3));
  }
}

// ─────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0];

  (async () => {
  try {
    if (cmd === 'record-plan') {
      const data = JSON.parse(args[1] || '{}');
      const result = await recordPlanMetrics(data);
      console.log(JSON.stringify({ recorded: true, phase: result }));
    } else if (cmd === 'record-bdd') {
      const data = JSON.parse(args[1] || '{}');
      await recordBddMetrics(data);
      console.log(JSON.stringify({ recorded: true }));
    } else if (cmd === 'record-release') {
      const data = JSON.parse(args[1] || '{}');
      await recordRelease(data);
      console.log(JSON.stringify({ recorded: true }));
    } else if (cmd === 'update-project') {
      const data = JSON.parse(args[1] || '{}');
      await updateProjectMetrics(data);
      console.log(JSON.stringify({ updated: true }));
    } else if (cmd === 'dashboard') {
      console.log(generateDashboard());
    } else if (cmd === 'get') {
      const metrics = loadMetrics();
      console.log(JSON.stringify(metrics, null, 2));
    } else {
      console.error('Commands: record-plan, record-bdd, record-release, update-project, dashboard, get');
      process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
  })();
}

module.exports = {
  loadMetrics,
  saveMetrics,
  saveMetricsLocked,
  recordPlanMetrics,
  recordBddMetrics,
  recordRelease,
  updateProjectMetrics,
  generateDashboard,
  METRIC_THRESHOLDS,
  getThresholdStatus
};
