/**
 * EZ Tools Tests - Cost Tracking Integration Tests
 *
 * Integration tests for COST-01, COST-02, COST-03:
 * End-to-end cost tracking flow with budget alerts and model downgrade
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
import assert from 'node:assert';
import * as path from 'path';
import * as fs from 'fs';

import CostTracker from '../../bin/lib/cost-tracker.js';
import CostAlerts from '../../bin/lib/cost-alerts.js';
import ModelTierManager from '../../bin/lib/model-tier-manager.js';

describe('Cost Tracking Integration (COST-01, COST-02, COST-03)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => cleanup(tmpDir));

  describe('end-to-end cost tracking flow', () => {
    test('records cost with agent field and aggregates by agent', async () => {
      const tracker = new CostTracker(tmpDir);

      // Record costs for different agents
      await tracker.record({
        phase: 44,
        agent: 'ez-planner',
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        input_tokens: 1000,
        output_tokens: 500,
        cost_usd: 0.0105,
        task_type: 'planning'
      });

      await tracker.record({
        phase: 44,
        agent: 'ez-executor',
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        input_tokens: 2000,
        output_tokens: 1000,
        cost_usd: 0.021,
        task_type: 'execution'
      });

      await tracker.record({
        phase: 44,
        agent: 'ez-planner',
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        input_tokens: 500,
        output_tokens: 250,
        cost_usd: 0.00525,
        task_type: 'planning'
      });

      // Aggregate by agent
      const agg = tracker.aggregate({ phase: 44, by_agent: true });

      assert.ok(agg.by_agent, 'must have by_agent breakdown');
      assert.ok('ez-planner' in agg.by_agent, 'must have ez-planner entry');
      assert.ok('ez-executor' in agg.by_agent, 'must have ez-executor entry');

      // Verify ez-planner total (0.0105 + 0.00525 = 0.01575)
      assert.ok(
        Math.abs(agg.by_agent['ez-planner'].cost - 0.01575) < 0.0001,
        `ez-planner cost must be ~0.01575, got ${agg.by_agent['ez-planner'].cost}`
      );

      // Verify ez-executor total
      assert.ok(
        Math.abs(agg.by_agent['ez-executor'].cost - 0.021) < 0.0001,
        `ez-executor cost must be ~0.021, got ${agg.by_agent['ez-executor'].cost}`
      );
    });

    test('triggers alerts at budget thresholds', async () => {
      const tracker = new CostTracker(tmpDir);
      const alerts = new CostAlerts(tmpDir);

      // Set up budget config
      const configPath = path.join(tmpDir, '.planning', 'config.json');
      fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({
        cost_tracking: {
          budget: 1.00,
          warning_threshold: 80,
          alert_thresholds: [50, 75, 90]
        }
      }, null, 2));

      // Record cost at 50% threshold
      await tracker.record({
        phase: 44,
        agent: 'ez-planner',
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        input_tokens: 1000,
        output_tokens: 500,
        cost_usd: 0.50, // 50% of $1 budget
        task_type: 'planning'
      });

      const budget50 = await tracker.checkBudget();
      assert.ok(budget50.alerts, 'must have alerts array');
      assert.ok(budget50.alerts.some(a => a.threshold === 50), 'must trigger 50% alert');

      // Verify alert was logged
      const loggedAlerts = alerts.getAlerts();
      assert.ok(loggedAlerts.some(a => a.threshold === 50), '50% alert must be logged');

      // Record additional cost to reach 75%
      await tracker.record({
        phase: 44,
        agent: 'ez-executor',
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        input_tokens: 1000,
        output_tokens: 500,
        cost_usd: 0.25, // Now at 75% of $1 budget
        task_type: 'execution'
      });

      const budget75 = await tracker.checkBudget();
      assert.ok(budget75.alerts.some(a => a.threshold === 75), 'must trigger 75% alert');

      // Record additional cost to reach 90%
      await tracker.record({
        phase: 44,
        agent: 'ez-verifier',
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        input_tokens: 1000,
        output_tokens: 500,
        cost_usd: 0.15, // Now at 90% of $1 budget
        task_type: 'verification'
      });

      const budget90 = await tracker.checkBudget();
      assert.ok(budget90.alerts.some(a => a.threshold === 90), 'must trigger 90% alert');
      assert.strictEqual(budget90.status, 'warning', 'status should be warning at 90%');
    });

    test('model downgrade based on budget pressure', () => {
      const manager = new ModelTierManager('claude', tmpDir);

      // Premium model at low budget usage
      const premiumModel = manager.selectModel('planning', 50);
      assert.ok(
        ['claude-3-opus', 'claude-sonnet-4-6'].includes(premiumModel),
        `should select premium model at 50%, got ${premiumModel}`
      );

      // Standard model at 75% budget usage
      const standardModel = manager.selectModel('planning', 75);
      assert.strictEqual(standardModel, 'claude-3-sonnet', `should select standard model at 75%, got ${standardModel}`);

      // Economy model at 90% budget usage
      const economyModel = manager.selectModel('planning', 90);
      assert.strictEqual(economyModel, 'claude-3-haiku', `should select economy model at 90%, got ${economyModel}`);
    });

    test('logs model downgrade events', async () => {
      const manager = new ModelTierManager('claude', tmpDir);

      await manager.logDowngrade('claude-3-opus', 'claude-3-haiku', 'budget pressure: 90%');

      const metricsPath = path.join(tmpDir, '.planning', 'metrics.json');
      assert.ok(fs.existsSync(metricsPath), 'metrics.json must exist');

      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      assert.ok(Array.isArray(metrics.downgrades), 'must have downgrades array');
      assert.strictEqual(metrics.downgrades.length, 1, 'must have 1 downgrade event');

      const event = metrics.downgrades[0];
      assert.strictEqual(event.event, 'model_downgrade', 'event type must be model_downgrade');
      assert.strictEqual(event.fromModel, 'claude-3-opus', 'fromModel must match');
      assert.strictEqual(event.toModel, 'claude-3-haiku', 'toModel must match');
    });

    test('full flow: record cost â†’ check budget â†’ trigger alert â†’ model downgrade', async () => {
      const tracker = new CostTracker(tmpDir);
      const alerts = new CostAlerts(tmpDir);
      const manager = new ModelTierManager('claude', tmpDir);

      // Set up budget config
      const configPath = path.join(tmpDir, '.planning', 'config.json');
      fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({
        cost_tracking: {
          budget: 1.00,
          warning_threshold: 80,
          alert_thresholds: [50, 75, 90],
          model_downgrade: {
            enabled: true
          }
        }
      }, null, 2));

      // Step 1: Record cost at 90% budget
      await tracker.record({
        phase: 44,
        agent: 'ez-planner',
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        input_tokens: 1000,
        output_tokens: 500,
        cost_usd: 0.90,
        task_type: 'planning'
      });

      // Step 2: Check budget
      const budgetStatus = await tracker.checkBudget();
      assert.strictEqual(budgetStatus.status, 'warning', 'status should be warning');
      assert.ok(budgetStatus.percentUsed >= 90, 'percentUsed should be >= 90');

      // Step 3: Verify alert triggered
      assert.ok(budgetStatus.alerts.some(a => a.threshold === 90), '90% alert should be triggered');

      const loggedAlerts = alerts.getAlerts();
      assert.ok(loggedAlerts.some(a => a.threshold === 90), '90% alert should be logged');

      // Step 4: Model selection should downgrade
      const selectedModel = manager.selectModel('planning', budgetStatus.percentUsed);
      assert.strictEqual(selectedModel, 'claude-3-haiku', 'should select economy model at 90%+ budget');

      // Step 5: Verify per-agent tracking
      const agg = tracker.aggregate({ phase: 44, by_agent: true });
      assert.ok(agg.by_agent['ez-planner'], 'must have ez-planner breakdown');
      assert.ok(Math.abs(agg.by_agent['ez-planner'].cost - 0.90) < 0.001, 'ez-planner cost must be ~0.90');
    });
  });

  describe('alert duplicate prevention', () => {
    test('does not log same threshold alert twice within 24 hours', async () => {
      const alerts = new CostAlerts(tmpDir);

      const alert = {
        threshold: 50,
        level: 'info',
        percentUsed: 50,
        totalSpent: 0.50,
        budget: 1.00,
        message: 'Test alert',
        timestamp: new Date().toISOString()
      };

      await alerts.logAlert(alert);
      await alerts.logAlert(alert); // Try to log same alert

      const loggedAlerts = alerts.getAlerts();
      assert.strictEqual(loggedAlerts.length, 1, 'should prevent duplicate alert');
    });

    test('allows different threshold alerts', async () => {
      const alerts = new CostAlerts(tmpDir);

      const alert50 = {
        threshold: 50,
        level: 'info',
        percentUsed: 50,
        totalSpent: 0.50,
        budget: 1.00,
        message: '50% alert',
        timestamp: new Date().toISOString()
      };

      const alert75 = {
        threshold: 75,
        level: 'warning',
        percentUsed: 75,
        totalSpent: 0.75,
        budget: 1.00,
        message: '75% alert',
        timestamp: new Date().toISOString()
      };

      await alerts.logAlert(alert50);
      await alerts.logAlert(alert75);

      const loggedAlerts = alerts.getAlerts();
      assert.strictEqual(loggedAlerts.length, 2, 'should allow different threshold alerts');
    });
  });

  describe('multi-agent cost tracking', () => {
    test('tracks costs for multiple agents in same phase', async () => {
      const tracker = new CostTracker(tmpDir);

      const agents = ['ez-planner', 'ez-executor', 'ez-verifier', 'ez-chief-strategist'];
      const costs = [0.01, 0.02, 0.015, 0.025];

      for (let i = 0; i < agents.length; i++) {
        await tracker.record({
          phase: 44,
          agent: agents[i],
          provider: 'claude',
          model: 'claude-sonnet-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cost_usd: costs[i],
          task_type: 'planning'
        });
      }

      const agg = tracker.aggregate({ phase: 44, by_agent: true });

      assert.strictEqual(Object.keys(agg.by_agent).length, 4, 'must have 4 agents');

      for (let i = 0; i < agents.length; i++) {
        assert.ok(agg.by_agent[agents[i]], `must have ${agents[i]} entry`);
        assert.ok(
          Math.abs(agg.by_agent[agents[i]].cost - costs[i]) < 0.001,
          `${agents[i]} cost must be ~${costs[i]}`
        );
      }
    });

    test('aggregates total cost across all agents', async () => {
      const tracker = new CostTracker(tmpDir);

      await tracker.record({
        phase: 44,
        agent: 'ez-planner',
        provider: 'claude',
        cost_usd: 0.01
      });

      await tracker.record({
        phase: 44,
        agent: 'ez-executor',
        provider: 'claude',
        cost_usd: 0.02
      });

      await tracker.record({
        phase: 44,
        agent: 'ez-verifier',
        provider: 'claude',
        cost_usd: 0.015
      });

      const agg = tracker.aggregate({ phase: 44 });
      assert.ok(Math.abs(agg.total.cost - 0.045) < 0.001, 'total cost must be sum of all agents');
    });
  });
});
