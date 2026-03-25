/**
 * EZ Tools Tests - CostTracker Unit Tests
 *
 * Unit tests for cost-tracker.cjs covering record(), aggregate(),
 * and checkBudget() behaviour.
 *
 * These tests are RED (failing) until Plan 03 ships cost-tracker.cjs.
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
import assert from 'node:assert';
import * as path from 'path';
import * as fs from 'fs';
import { createTempProject, cleanup } from '../helpers.js';
import CostTracker from '../bin/lib/cost-tracker.js';

describe('CostTracker', () => {
  let tmpDir, ct;

  beforeEach(() => {
    tmpDir = createTempProject();
    ct = new CostTracker(tmpDir);
  });

  afterEach(() => cleanup(tmpDir));

  test('constructor does not throw', () => {
    assert.ok(ct, 'CostTracker instance must be created without throwing');
  });

  test('record() writes entry to metrics.json', async () => {
    await ct.record({
      phase: 30,
      milestone: 'v2.1',
      operation: 'test',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.001,
    });

    const metricsPath = path.join(tmpDir, '.planning', 'metrics.json');
    assert.ok(fs.existsSync(metricsPath), 'metrics.json must exist after record()');

    const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    assert.ok(Array.isArray(data.entries), 'metrics.json must have entries array');
    assert.ok(data.entries.length > 0, 'entries must have at least one record');

    const entry = data.entries[0];
    assert.strictEqual(entry.phase, 30, 'entry phase must be 30');
    assert.strictEqual(entry.provider, 'claude', 'entry provider must be "claude"');
    assert.strictEqual(entry.cost_usd, 0.001, 'entry cost_usd must be 0.001');
  });

  test('aggregate() returns object with total, by_phase, by_provider keys', async () => {
    await ct.record({
      phase: 30,
      milestone: 'v2.1',
      operation: 'test',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.001,
    });

    const agg = ct.aggregate();
    assert.ok('total' in agg, 'aggregate must have total key');
    assert.ok('by_phase' in agg, 'aggregate must have by_phase key');
    assert.ok('by_provider' in agg, 'aggregate must have by_provider key');
  });

  test('aggregate().total.cost equals sum of all recorded cost_usd', async () => {
    await ct.record({
      phase: 30,
      milestone: 'v2.1',
      operation: 'op1',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.001,
    });
    await ct.record({
      phase: 30,
      milestone: 'v2.1',
      operation: 'op2',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      input_tokens: 200,
      output_tokens: 100,
      cost_usd: 0.002,
    });

    const agg = ct.aggregate();
    // Total should be approximately 0.003 (sum of both entries)
    assert.ok(
      Math.abs(agg.total.cost - 0.003) < 0.000001,
      `total.cost must equal sum of cost_usd entries (0.003), got ${agg.total.cost}`
    );
  });

  test('checkBudget() returns { status: "ok" } when total < warning threshold', async () => {
    // Record a very small cost â€” well below any threshold
    await ct.record({
      phase: 30,
      milestone: 'v2.1',
      operation: 'test',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      input_tokens: 10,
      output_tokens: 5,
      cost_usd: 0.0001,
    });

    const result = await ct.checkBudget({ ceiling: 100, warning_threshold: 80 });
    assert.strictEqual(result.status, 'ok', `status must be "ok" when cost << ceiling, got "${result.status}"`);
  });

  test('checkBudget() returns { status: "warning" } when total >= warning_threshold% of ceiling', async () => {
    // Record cost that is >=80% of ceiling (0.001 ceiling, warning at 80% = 0.0008)
    // We record 0.001 which is >= 80% of 0.001 ceiling
    await ct.record({
      phase: 30,
      milestone: 'v2.1',
      operation: 'test',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.001,
    });

    const result = await ct.checkBudget({ ceiling: 0.001, warning_threshold: 80 });
    // 0.001 >= 80% of 0.001 (0.0008) and 0.001 >= ceiling (0.001), so status may be "exceeded"
    // Use a slightly higher ceiling so cost hits warning but not exceeded
    const result2 = await ct.checkBudget({ ceiling: 0.002, warning_threshold: 80 });
    // 0.001 >= 80% of 0.002 (0.0016)? No â€” 0.001 < 0.0016
    // Use ceiling=0.0012 â€” 80% = 0.00096, cost=0.001 >= 0.00096 and < 0.0012
    const result3 = await ct.checkBudget({ ceiling: 0.0012, warning_threshold: 80 });
    assert.strictEqual(result3.status, 'warning', `status must be "warning" when cost >= warning threshold but < ceiling, got "${result3.status}"`);
  });

  test('checkBudget() returns { status: "exceeded" } when total >= ceiling', async () => {
    // Record cost above ceiling
    await ct.record({
      phase: 30,
      milestone: 'v2.1',
      operation: 'test',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.001,
    });

    const result = await ct.checkBudget({ ceiling: 0.0001, warning_threshold: 80 });
    assert.strictEqual(result.status, 'exceeded', `status must be "exceeded" when total >= ceiling, got "${result.status}"`);
  });

  test('record() accepts agent field for per-agent tracking (COST-01)', async () => {
    await ct.record({
      phase: 44,
      agent: 'ez-planner',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.001,
    });

    const metricsPath = path.join(tmpDir, '.planning', 'metrics.json');
    const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    const entry = data.entries[0];

    assert.strictEqual(entry.agent, 'ez-planner', 'entry must have agent field');
  });

  test('aggregate() with by_agent: true returns nested breakdown by agent (COST-01)', async () => {
    await ct.record({
      phase: 44,
      agent: 'ez-planner',
      provider: 'claude',
      cost_usd: 0.01,
    });
    await ct.record({
      phase: 44,
      agent: 'ez-executor',
      provider: 'claude',
      cost_usd: 0.02,
    });
    await ct.record({
      phase: 44,
      agent: 'ez-planner',
      provider: 'claude',
      cost_usd: 0.005,
    });

    const agg = ct.aggregate({ phase: 44, by_agent: true });

    assert.ok(agg.by_agent, 'must have by_agent breakdown');
    assert.ok('ez-planner' in agg.by_agent, 'must have ez-planner entry');
    assert.ok('ez-executor' in agg.by_agent, 'must have ez-executor entry');
    assert.ok(
      Math.abs(agg.by_agent['ez-planner'].cost - 0.015) < 0.001,
      `ez-planner cost must be ~0.015, got ${agg.by_agent['ez-planner'].cost}`
    );
    assert.ok(
      Math.abs(agg.by_agent['ez-executor'].cost - 0.02) < 0.001,
      `ez-executor cost must be ~0.02, got ${agg.by_agent['ez-executor'].cost}`
    );
  });

  test('aggregate() with by_agent: false or undefined returns phase-level only', async () => {
    await ct.record({
      phase: 44,
      agent: 'ez-planner',
      provider: 'claude',
      cost_usd: 0.01,
    });
    await ct.record({
      phase: 44,
      agent: 'ez-executor',
      provider: 'claude',
      cost_usd: 0.02,
    });

    const aggWithoutAgent = ct.aggregate({ phase: 44 });
    const aggExplicitFalse = ct.aggregate({ phase: 44, by_agent: false });

    assert.ok(!aggWithoutAgent.by_agent, 'by_agent should not be present when not requested');
    assert.ok(!aggExplicitFalse.by_agent, 'by_agent should not be present when explicitly false');
    assert.ok(
      Math.abs(aggWithoutAgent.total.cost - 0.03) < 0.001,
      'total cost should still be correct'
    );
  });
});
