const { test, afterEach } = require('node:test');
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { withLock } from '../ez-agents/bin/lib/file-lock.js';

const tempDirs = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

test('LOCK-02: second lock attempt times out with deterministic File locked error shape', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ez-lock-timeout-'));
  tempDirs.push(tmpDir);
  const lockTarget = path.join(tmpDir, 'target.md');
  fs.writeFileSync(lockTarget, 'seed', 'utf-8');

  const holdLock = withLock(lockTarget, async () => {
    await new Promise((resolve) => setTimeout(resolve, 150));
  }, { timeout: 5000 });

  await new Promise((resolve) => setTimeout(resolve, 20));

  await assert.rejects(
    () => withLock(lockTarget, async () => 'unreachable', { timeout: 30, retries: { retries: 0 } }),
    (err) => {
      assert.match(err.message, /^File locked:/, 'error should normalize to "File locked:" shape');
      assert.match(err.message, /\(waited \d+ms\)/, 'error should include waited duration');
      return true;
    }
  );

  await holdLock;
});
