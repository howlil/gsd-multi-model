/**
 * EZ Tools Tests - Cost CLI Integration Tests
 *
 * Integration tests for the `ez-tools cost` command asserting real data
 * (not the hardcoded mock with total.cost = 12.45 and tokens = 1234567).
 *
 * These tests are RED (failing) until Plan 04 ships the real cost block.
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { runEzTools, createTempProject, cleanup } = require('./helpers.cjs');

describe('ez-tools cost (real data)', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = createTempProject(); });
  afterEach(() => cleanup(tmpDir));

  test('cost --json returns real aggregated data (not hardcoded mock)', () => {
    const result = runEzTools(['cost', '--json'], tmpDir);
    assert.ok(result.success, 'cost --json must exit 0: ' + result.error);
    const data = JSON.parse(result.output);
    assert.ok('total' in data, 'must have total key');
    assert.ok('by_phase' in data, 'must have by_phase key');
    assert.ok('by_provider' in data, 'must have by_provider key');
    // Must NOT be the hardcoded mock value
    assert.notStrictEqual(data.total.cost, 12.45, 'total.cost must not be mock value 12.45');
    // Must NOT contain the mock token count
    assert.notStrictEqual(
      data.total.tokens,
      1234567,
      'total.tokens must not be hardcoded mock value 1234567'
    );
  });

  test('cost record stores entry and aggregate reflects it', () => {
    const rec = runEzTools(
      ['cost', 'record', '--phase', '30', '--provider', 'claude',
       '--input', '100', '--output', '50', '--cost', '0.005'],
      tmpDir
    );
    assert.ok(rec.success, 'cost record must exit 0: ' + rec.error);
    const agg = runEzTools(['cost', '--json'], tmpDir);
    assert.ok(agg.success, 'cost --json must exit 0 after record: ' + agg.error);
    const data = JSON.parse(agg.output);
    assert.ok(data.total.cost > 0, 'total cost must reflect recorded entry');
  });

  test('cost --budget N --set persists budget ceiling and outputs "Budget set"', () => {
    const result = runEzTools(['cost', '--budget', '50', '--set'], tmpDir);
    assert.ok(result.success, 'cost --budget --set must exit 0: ' + result.error);
    assert.ok(
      result.output.includes('Budget set'),
      `output must contain "Budget set", got: "${result.output}"`
    );
  });
});
