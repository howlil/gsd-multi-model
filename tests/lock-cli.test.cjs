/**
 * EZ Tools Tests - Lock CLI Integration Tests
 *
 * Integration tests for the `ez-tools lock` command covering create,
 * release, and status subcommands via CrashRecovery.
 *
 * These tests are RED (failing) until Plan 04 adds the 'lock' case to ez-tools.cjs.
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { runEzTools, createTempProject, cleanup } = require('./helpers.cjs');

describe('ez-tools lock', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = createTempProject(); });
  afterEach(() => cleanup(tmpDir));

  test('lock create exits 0 and output contains "created" or "locked"', () => {
    const result = runEzTools(['lock', 'create', 'test-op'], tmpDir);
    assert.ok(result.success, 'lock create must exit 0: ' + result.error);
    const outputLower = result.output.toLowerCase();
    assert.ok(
      outputLower.includes('created') || outputLower.includes('locked'),
      `output must mention "created" or "locked", got: "${result.output}"`
    );
  });

  test('lock create writes .planning/locks/test-op.lock.json in tmpDir', () => {
    runEzTools(['lock', 'create', 'test-op'], tmpDir);
    const lockPath = path.join(tmpDir, '.planning', 'locks', 'test-op.lock.json');
    assert.ok(
      fs.existsSync(lockPath),
      `lock file must exist at ${lockPath} after lock create`
    );
  });

  test('lock release exits 0 after create', () => {
    runEzTools(['lock', 'create', 'test-op'], tmpDir);
    const result = runEzTools(['lock', 'release', 'test-op'], tmpDir);
    assert.ok(result.success, 'lock release must exit 0: ' + result.error);
  });

  test('lock file does not exist after release', () => {
    runEzTools(['lock', 'create', 'test-op'], tmpDir);
    const lockPath = path.join(tmpDir, '.planning', 'locks', 'test-op.lock.json');
    assert.ok(fs.existsSync(lockPath), 'lock file must exist before release');
    runEzTools(['lock', 'release', 'test-op'], tmpDir);
    assert.ok(
      !fs.existsSync(lockPath),
      'lock file must not exist after release'
    );
  });

  test('lock status exits 0 and output contains operation name', () => {
    runEzTools(['lock', 'create', 'test-op'], tmpDir);
    const result = runEzTools(['lock', 'status', 'test-op'], tmpDir);
    assert.ok(result.success, 'lock status must exit 0: ' + result.error);
    assert.ok(
      result.output.includes('test-op'),
      `lock status output must contain operation name "test-op", got: "${result.output}"`
    );
  });
});
