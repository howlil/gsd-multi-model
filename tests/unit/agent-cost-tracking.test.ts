/**
 * EZ Tools Tests - CostTracker Per-Agent Tracking Unit Tests
 *
 * Tests for COST-01: Per-agent cost tracking feature
 * Tests agent field in record() and by_agent aggregation
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
import assert from 'node:assert';
import * as path from 'path';
import * as fs from 'fs';
import { createTempProject, cleanup } from '../helpers.js';
import CostTracker from '../bin/lib/cost-tracker.js';

describe('CostTracker - Per-Agent Tracking (COST-01)', () => {
  let tmpDir, ct;

  beforeEach(() => {
    tmpDir = createTempProject();
    ct = new CostTracker(tmpDir);
  });

  afterEach(() => cleanup(tmpDir));

  test('record() accepts agent field in entry', async () => {
    await ct.record({
      phase: 44,
      milestone: 'v4.0',
      operation: 'test',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      agent: 'ez-planner',
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.001,
    });

    const metricsPath = path.join(tmpDir, '.planning', 'metrics.json');
    assert.ok(fs.existsSync(metricsPath), 'metrics.json must exist after record()');

    const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    const entry = data.entries[0];
    assert.strictEqual(entry.agent, 'ez-planner', 'entry must include agent field');
  });

  test('aggregate() without by_agent returns phase/provider breakdown only', async () => {
    await ct.record({
      phase: 44,
      milestone: 'v4.0',
      operation: 'test',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      agent: 'ez-planner',
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.001,
    });

    const agg = ct.aggregate();
    assert.ok('by_phase' in agg, 'aggregate must have by_phase key');
    assert.ok('by_provider' in agg, 'aggregate must have by_provider key');
    assert.ok(!('by_agent' in agg), 'aggregate must NOT have by_agent key when not requested');
  });

  test('aggregate({ by_agent: true }) returns nested breakdown by agent', async () => {
    await ct.record({
      phase: 44,
      milestone: 'v4.0',
      operation: 'test1',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      agent: 'ez-planner',
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.001,
    });

    await ct.record({
      phase: 44,
      milestone: 'v4.0',
      operation: 'test2',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      agent: 'ez-executor',
      input_tokens: 200,
      output_tokens: 100,
      cost_usd: 0.002,
    });

    const agg = ct.aggregate({ by_agent: true });
    assert.ok('by_agent' in agg, 'aggregate must have by_agent key when by_agent: true');
    assert.ok('ez-planner' in agg.by_agent, 'by_agent must have ez-planner key');
    assert.ok('ez-executor' in agg.by_agent, 'by_agent must have ez-executor key');
    assert.strictEqual(agg.by_agent['ez-planner'].cost, 0.001, 'ez-planner cost must be 0.001');
    assert.strictEqual(agg.by_agent['ez-executor'].cost, 0.002, 'ez-executor cost must be 0.002');
  });

  test('aggregate({ by_agent: true }) handles entries without agent field', async () => {
    await ct.record({
      phase: 44,
      milestone: 'v4.0',
      operation: 'test1',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      agent: 'ez-planner',
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.001,
    });

    await ct.record({
      phase: 44,
      milestone: 'v4.0',
      operation: 'test2',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      // No agent field
      input_tokens: 200,
      output_tokens: 100,
      cost_usd: 0.002,
    });

    const agg = ct.aggregate({ by_agent: true });
    assert.ok('by_agent' in agg, 'aggregate must have by_agent key');
    assert.ok('ez-planner' in agg.by_agent, 'by_agent must have ez-planner key');
    assert.ok('unknown' in agg.by_agent, 'by_agent must have unknown key for entries without agent');
    assert.strictEqual(agg.by_agent['unknown'].cost, 0.002, 'unknown agent cost must be 0.002');
  });

  test('aggregate({ by_agent: true, phase: 44 }) filters by phase and groups by agent', async () => {
    await ct.record({
      phase: 44,
      milestone: 'v4.0',
      operation: 'test1',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      agent: 'ez-planner',
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.001,
    });

    await ct.record({
      phase: 45,
      milestone: 'v4.0',
      operation: 'test2',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      agent: 'ez-executor',
      input_tokens: 200,
      output_tokens: 100,
      cost_usd: 0.002,
    });

    const agg = ct.aggregate({ phase: 44, by_agent: true });
    assert.ok('by_agent' in agg, 'aggregate must have by_agent key');
    assert.ok('ez-planner' in agg.by_agent, 'by_agent must have ez-planner key');
    assert.ok(!('ez-executor' in agg.by_agent), 'by_agent must NOT have ez-executor (filtered by phase)');
    assert.strictEqual(agg.by_agent['ez-planner'].cost, 0.001, 'ez-planner cost must be 0.001');
  });
});
