/**
 * EZ Tools Tests - ModelTierManager Unit Tests
 *
 * Tests for COST-03: Budget-aware model downgrade feature
 * Tests model tier selection based on budget percentage
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { createTempProject, cleanup } = require('./helpers.cjs');
const ModelTierManager = require('../bin/lib/model-tier-manager.cjs');

describe('ModelTierManager (COST-03)', () => {
  let tmpDir, manager;

  beforeEach(() => {
    tmpDir = createTempProject();
    manager = new ModelTierManager('claude', tmpDir);
  });

  afterEach(() => cleanup(tmpDir));

  describe('getTierForBudget', () => {
    test('returns premium when budgetPercentUsed < 75', () => {
      assert.strictEqual(manager.getTierForBudget(0), 'premium');
      assert.strictEqual(manager.getTierForBudget(50), 'premium');
      assert.strictEqual(manager.getTierForBudget(74), 'premium');
    });

    test('returns standard when budgetPercentUsed >= 75 and < 90', () => {
      assert.strictEqual(manager.getTierForBudget(75), 'standard');
      assert.strictEqual(manager.getTierForBudget(80), 'standard');
      assert.strictEqual(manager.getTierForBudget(89), 'standard');
    });

    test('returns economy when budgetPercentUsed >= 90', () => {
      assert.strictEqual(manager.getTierForBudget(90), 'economy');
      assert.strictEqual(manager.getTierForBudget(95), 'economy');
      assert.strictEqual(manager.getTierForBudget(100), 'economy');
    });
  });

  describe('selectModel', () => {
    test('returns premium model when budgetPercentUsed < 75', () => {
      const model = manager.selectModel('planning', 50);
      assert.ok(
        ['claude-3-opus', 'claude-sonnet-4-6'].includes(model),
        `should return premium model, got ${model}`
      );
    });

    test('returns standard model when budgetPercentUsed >= 75', () => {
      const model = manager.selectModel('planning', 80);
      assert.strictEqual(model, 'claude-3-sonnet', `should return standard model, got ${model}`);
    });

    test('returns economy model when budgetPercentUsed >= 90', () => {
      const model = manager.selectModel('planning', 95);
      assert.strictEqual(model, 'claude-3-haiku', `should return economy model, got ${model}`);
    });

    test('works with different providers', () => {
      const qwenManager = new ModelTierManager('qwen', tmpDir);
      const qwenModel = qwenManager.selectModel('planning', 95);
      assert.strictEqual(qwenModel, 'qwen-turbo', `should return qwen economy model, got ${qwenModel}`);

      const kimiManager = new ModelTierManager('kimi', tmpDir);
      const kimiModel = kimiManager.selectModel('planning', 95);
      assert.strictEqual(kimiModel, 'kimi-v1-8k', `should return kimi economy model, got ${kimiModel}`);
    });
  });

  describe('getTierForModel', () => {
    test('returns correct tier for premium model', () => {
      const tier = manager.getTierForModel('claude-3-opus');
      assert.strictEqual(tier, 'premium', `should return premium tier, got ${tier}`);
    });

    test('returns correct tier for standard model', () => {
      const tier = manager.getTierForModel('claude-3-sonnet');
      assert.strictEqual(tier, 'standard', `should return standard tier, got ${tier}`);
    });

    test('returns correct tier for economy model', () => {
      const tier = manager.getTierForModel('claude-3-haiku');
      assert.strictEqual(tier, 'economy', `should return economy tier, got ${tier}`);
    });

    test('returns null for unknown model', () => {
      const tier = manager.getTierForModel('unknown-model');
      assert.strictEqual(tier, null, `should return null for unknown model, got ${tier}`);
    });
  });

  describe('getModelsForTier', () => {
    test('returns array of premium models', () => {
      const models = manager.getModelsForTier('premium');
      assert.ok(Array.isArray(models), 'should return array');
      assert.ok(models.length > 0, 'should have at least one model');
      assert.ok(models.includes('claude-3-opus'), 'should include claude-3-opus');
    });

    test('returns array of standard models', () => {
      const models = manager.getModelsForTier('standard');
      assert.ok(Array.isArray(models), 'should return array');
      assert.ok(models.includes('claude-3-sonnet'), 'should include claude-3-sonnet');
    });

    test('returns array of economy models', () => {
      const models = manager.getModelsForTier('economy');
      assert.ok(Array.isArray(models), 'should return array');
      assert.ok(models.includes('claude-3-haiku'), 'should include claude-3-haiku');
    });
  });

  describe('logDowngrade', () => {
    test('logs downgrade event to metrics.json', async () => {
      await manager.logDowngrade('claude-3-opus', 'claude-3-haiku', 'budget pressure');

      const metricsPath = path.join(tmpDir, '.planning', 'metrics.json');
      assert.ok(fs.existsSync(metricsPath), 'metrics.json must exist after logDowngrade');

      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      assert.ok(Array.isArray(metrics.downgrades), 'metrics.json must have downgrades array');
      assert.strictEqual(metrics.downgrades.length, 1, 'should have 1 downgrade event');

      const event = metrics.downgrades[0];
      assert.strictEqual(event.fromModel, 'claude-3-opus', 'fromModel must match');
      assert.strictEqual(event.toModel, 'claude-3-haiku', 'toModel must match');
      assert.strictEqual(event.reason, 'budget pressure', 'reason must match');
    });
  });

  describe('setLastBudgetPercent / _getLastBudgetPercent', () => {
    test('sets and gets budget percentage', () => {
      manager.setLastBudgetPercent(85);
      const retrieved = manager._getLastBudgetPercent();
      assert.strictEqual(retrieved, 85, `should retrieve 85, got ${retrieved}`);
    });
  });

  describe('static methods', () => {
    test('getAvailableProviders returns all providers', () => {
      const providers = ModelTierManager.getAvailableProviders();
      assert.ok(providers.includes('claude'), 'should include claude');
      assert.ok(providers.includes('openai'), 'should include openai');
      assert.ok(providers.includes('qwen'), 'should include qwen');
      assert.ok(providers.includes('kimi'), 'should include kimi');
    });

    test('getModelTiers returns MODEL_TIERS constant', () => {
      const tiers = ModelTierManager.getModelTiers();
      assert.ok('claude' in tiers, 'should have claude tier');
      assert.ok('openai' in tiers, 'should have openai tier');
      assert.ok('qwen' in tiers, 'should have qwen tier');
      assert.ok('kimi' in tiers, 'should have kimi tier');
    });
  });

  describe('MODEL_TIERS constant', () => {
    test('exports correct structure', () => {
      assert.ok(ModelTierManager.MODEL_TIERS, 'MODEL_TIERS must be exported');
      assert.ok(ModelTierManager.MODEL_TIERS.claude, 'must have claude provider');
      assert.ok(ModelTierManager.MODEL_TIERS.claude.premium, 'must have premium tier');
      assert.ok(ModelTierManager.MODEL_TIERS.claude.standard, 'must have standard tier');
      assert.ok(ModelTierManager.MODEL_TIERS.claude.economy, 'must have economy tier');
    });
  });
});
