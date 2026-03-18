const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('safePlanningWrite temp staging', () => {
  let tmpDir;
  let fileLockPath;
  let tempFilePath;
  let planningWritePath;
  let originalRename;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ez-planning-write-'));
    fileLockPath = require.resolve('../ez-agents/bin/lib/file-lock.cjs');
    tempFilePath = require.resolve('../ez-agents/bin/lib/temp-file.cjs');
    planningWritePath = require.resolve('../ez-agents/bin/lib/planning-write.cjs');
    originalRename = fs.promises.rename;
  });

  afterEach(() => {
    fs.promises.rename = originalRename;
    delete require.cache[fileLockPath];
    delete require.cache[tempFilePath];
    delete require.cache[planningWritePath];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('creates temp file in target directory and cleans it up after success', async () => {
    const target = path.join(tmpDir, 'STATE.md');
    const tempCalls = [];
    const cleanupCalls = [];

    require.cache[fileLockPath] = {
      id: fileLockPath,
      filename: fileLockPath,
      loaded: true,
      exports: {
        withLock: async (_file, operation) => operation(),
      },
    };

    require.cache[tempFilePath] = {
      id: tempFilePath,
      filename: tempFilePath,
      loaded: true,
      exports: {
        createTempFile: async (prefix, dir, content) => {
          tempCalls.push({ prefix, dir });
          const tempPath = path.join(dir, `${prefix}mock-temp`);
          await fs.promises.writeFile(tempPath, content, 'utf-8');
          return tempPath;
        },
        cleanupTemp: async (tempPath) => {
          cleanupCalls.push(tempPath);
          await fs.promises.rm(tempPath, { force: true });
        },
      },
    };

    const { safePlanningWrite } = require('../ez-agents/bin/lib/planning-write.cjs');
    await safePlanningWrite(target, 'hello');

    assert.strictEqual(tempCalls.length, 1, 'temp file should be created exactly once');
    assert.strictEqual(tempCalls[0].prefix, 'ez-write-', 'default prefix should be used');
    assert.strictEqual(tempCalls[0].dir, tmpDir, 'temp file should be staged in target directory');
    assert.strictEqual(cleanupCalls.length, 1, 'cleanup should run after rename');
    assert.strictEqual(fs.readFileSync(target, 'utf-8'), 'hello', 'target file should contain new content');
    assert.ok(!fs.existsSync(cleanupCalls[0]), 'temp file should be removed');
  });

  test('cleans up staged temp artifact when rename fails', async () => {
    const target = path.join(tmpDir, 'STATE.md');
    const cleanupCalls = [];

    require.cache[fileLockPath] = {
      id: fileLockPath,
      filename: fileLockPath,
      loaded: true,
      exports: {
        withLock: async (_file, operation) => operation(),
      },
    };

    require.cache[tempFilePath] = {
      id: tempFilePath,
      filename: tempFilePath,
      loaded: true,
      exports: {
        createTempFile: async (prefix, dir, content) => {
          const tempPath = path.join(dir, `${prefix}mock-temp-fail`);
          await fs.promises.writeFile(tempPath, content, 'utf-8');
          return tempPath;
        },
        cleanupTemp: async (tempPath) => {
          cleanupCalls.push(tempPath);
          await fs.promises.rm(tempPath, { force: true });
        },
      },
    };

    fs.promises.rename = async () => {
      throw new Error('rename exploded');
    };

    const { safePlanningWrite } = require('../ez-agents/bin/lib/planning-write.cjs');
    await assert.rejects(() => safePlanningWrite(target, 'boom'), /rename exploded/);
    assert.strictEqual(cleanupCalls.length, 1, 'cleanup should run on failure');
    assert.ok(!fs.existsSync(cleanupCalls[0]), 'temp file should be removed after failure');
  });
});
