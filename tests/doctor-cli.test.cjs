/**
 * EZ Tools Tests - Doctor CLI Integration Tests
 *
 * Integration tests for the `ez-tools doctor` command asserting real check
 * results (not the hardcoded mock that always exits with code 2).
 *
 * These tests are RED (failing) until Plan 04 replaces the mock doctor block.
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { runEzTools, createTempProject, cleanup } = require('./helpers.cjs');

/**
 * Create a fully-populated healthy project directory so that doctor can
 * return status "healthy" (exit 0) rather than "degraded"/"unhealthy".
 */
function createHealthyProject() {
  const tmpDir = createTempProject();

  // STATE.md
  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'STATE.md'),
    '# Session State\n\n## Current Position\n\nPhase: 30\n'
  );

  // ROADMAP.md
  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'ROADMAP.md'),
    '# Roadmap\n\n### Phase 30: GSD Gap Closure\n'
  );

  // PROJECT.md
  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'PROJECT.md'),
    '# Project\n\n## What This Is\n\nTest project.\n\n## Core Value\n\nTesting.\n\n## Requirements\n\nNone.\n'
  );

  // REQUIREMENTS.md
  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'REQUIREMENTS.md'),
    '# Requirements\n\n| ID | Description | Status |\n|----|----|----|\n'
  );

  // config.json
  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'config.json'),
    JSON.stringify({ model_profile: 'balanced', commit_docs: true }, null, 2)
  );

  // Phase directory matching ROADMAP
  fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '30-gsd-gap-closure'), { recursive: true });

  return tmpDir;
}

describe('ez-tools doctor (real health checks)', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) cleanup(tmpDir);
    tmpDir = null;
  });

  test('doctor --json on healthy project exits 0 (not hardcoded exit 2)', () => {
    tmpDir = createHealthyProject();
    const result = runEzTools(['doctor', '--json'], tmpDir);
    // The mock always exits 2 — real implementation should exit 0 on healthy project
    assert.ok(result.success, 'doctor --json must exit 0 on a healthy project: ' + result.error);
  });

  test('doctor --json output has "status" key with value "healthy", "degraded", or "unhealthy"', () => {
    tmpDir = createHealthyProject();
    const result = runEzTools(['doctor', '--json'], tmpDir);
    assert.ok(result.success, 'doctor --json must exit 0: ' + result.error);
    let data;
    try {
      data = JSON.parse(result.output);
    } catch (e) {
      assert.fail(`doctor --json output must be valid JSON, got: "${result.output}"`);
    }
    assert.ok('status' in data, `JSON output must have "status" key, got: ${JSON.stringify(Object.keys(data))}`);
    const validStatuses = ['healthy', 'degraded', 'unhealthy'];
    assert.ok(
      validStatuses.includes(data.status),
      `status must be one of ${validStatuses.join(', ')}, got: "${data.status}"`
    );
  });

  test('doctor --json output does NOT contain hardcoded mock token value "1234567"', () => {
    tmpDir = createHealthyProject();
    const result = runEzTools(['doctor', '--json'], tmpDir);
    assert.ok(result.success, 'doctor --json must exit 0: ' + result.error);
    assert.ok(
      !result.output.includes('1234567'),
      'doctor --json output must NOT contain hardcoded mock token value "1234567"'
    );
  });

  test('doctor --json output has "checks" key with real check results', () => {
    tmpDir = createHealthyProject();
    const result = runEzTools(['doctor', '--json'], tmpDir);
    assert.ok(result.success, 'doctor --json must exit 0: ' + result.error);
    const data = JSON.parse(result.output);
    assert.ok('checks' in data, `JSON output must have "checks" key, got: ${JSON.stringify(Object.keys(data))}`);
    // checks must be an object with at least one key
    assert.ok(
      typeof data.checks === 'object' && data.checks !== null,
      'checks must be a non-null object'
    );
    assert.ok(
      Object.keys(data.checks).length > 0,
      'checks must have at least one check result'
    );
  });

  test('doctor (no --json) exits 0 on fully healthy project', () => {
    tmpDir = createHealthyProject();
    const result = runEzTools(['doctor'], tmpDir);
    // The mock unconditionally exits 2 — real should exit 0 for healthy
    assert.ok(result.success, 'doctor must exit 0 on a healthy project (not hardcoded exit 2): ' + result.error);
  });

  test('doctor exits non-zero on empty project (unhealthy)', () => {
    // Empty tmpDir — .planning/ exists but no STATE.md, ROADMAP.md, PROJECT.md, config.json
    tmpDir = createTempProject();
    const result = runEzTools(['doctor'], tmpDir);
    assert.ok(
      !result.success,
      'doctor must exit non-zero on a project with missing required files'
    );
  });
});
