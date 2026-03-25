const { test, describe, beforeEach, afterEach } = require('node:test');
import assert from 'node:assert';
import { createTempProject, cleanup, runEzTools } from '../helpers.js';

describe('health route', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('exposes health payload with status, checks, and timestamp', () => {
    const result = runEzTools('health', tmpDir);
    assert.ok(result.success, `health command failed: ${result.error}`);

    const payload = JSON.parse(result.output);
    assert.strictEqual(typeof payload.status, 'string');
    assert.strictEqual(typeof payload.checks, 'object');
    assert.ok(payload.checks, 'checks payload must be present');
    assert.strictEqual(typeof payload.timestamp, 'string');
    assert.ok(!Number.isNaN(Date.parse(payload.timestamp)), 'timestamp must be ISO parseable');
  });
});
