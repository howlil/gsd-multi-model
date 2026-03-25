const { test, afterEach } = require('node:test');
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { createTempFile, cleanupTemp } from '../ez-agents/bin/lib/temp-file.js';

const tempDirs = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

test('TEMP-02: temp files are removed after successful cleanup path', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ez-temp-cleanup-'));
  tempDirs.push(tmpDir);

  const tempPath = await createTempFile('temp-success-', tmpDir, 'ok');
  assert.ok(fs.existsSync(tempPath), 'temp file should exist after creation');

  await cleanupTemp(tempPath);
  assert.ok(!fs.existsSync(tempPath), 'temp file should be deleted after cleanupTemp');
});

test('TEMP-02: temp files are removed even when wrapped operation throws', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ez-temp-cleanup-fail-'));
  tempDirs.push(tmpDir);

  let tempPath = null;
  await assert.rejects(
    async () => {
      try {
        tempPath = await createTempFile('temp-fail-', tmpDir, 'boom');
        throw new Error('forced failure');
      } finally {
        if (tempPath) {
          await cleanupTemp(tempPath);
        }
      }
    },
    /forced failure/
  );

  assert.ok(tempPath, 'temp path should be captured before failure');
  assert.ok(!fs.existsSync(tempPath), 'temp file should be removed after error path cleanup');
});
