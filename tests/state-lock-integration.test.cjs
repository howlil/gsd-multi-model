const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Worker } = require('worker_threads');

const { withLock } = require('../ez-agents/bin/lib/file-lock.cjs');

const tempDirs = [];

function makePlanningDir() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ez-lock-test-'));
  fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
  tempDirs.push(tmpDir);
  return tmpDir;
}

function runStateWriterWorker(payload) {
  const workerCode = `
    const { parentPort, workerData } = require('worker_threads');
    const { writeStateMd } = require(workerData.statePath);
    try {
      writeStateMd(workerData.filePath, workerData.content, workerData.cwd, workerData.options || {});
      parentPort.postMessage({ ok: true });
    } catch (err) {
      parentPort.postMessage({ ok: false, message: err.message });
    }
  `;

  return new Promise((resolve, reject) => {
    const worker = new Worker(workerCode, {
      eval: true,
      workerData: payload,
    });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
}

describe('state lock integration', () => {
  afterEach(() => {
    while (tempDirs.length > 0) {
      fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
    }
  });

  test('concurrent writeStateMd calls do not produce interleaved output', async () => {
    const tmpDir = makePlanningDir();
    const statePath = path.join(tmpDir, '.planning', 'STATE.md');
    fs.writeFileSync(statePath, '# Initial\n', 'utf-8');

    const modulePath = path.join(__dirname, '..', 'ez-agents', 'bin', 'lib', 'state.cjs');
    const payloadA = `# State A\n\n**Current Phase:** 08\n**Status:** Ready to execute\n`;
    const payloadB = `# State B\n\n**Current Phase:** 08\n**Status:** Executing\n`;

    const [resultA, resultB] = await Promise.all([
      runStateWriterWorker({ statePath: modulePath, filePath: statePath, content: payloadA, cwd: tmpDir }),
      runStateWriterWorker({ statePath: modulePath, filePath: statePath, content: payloadB, cwd: tmpDir }),
    ]);

    assert.strictEqual(resultA.ok, true, resultA.message || 'worker A should succeed');
    assert.strictEqual(resultB.ok, true, resultB.message || 'worker B should succeed');

    const finalContent = fs.readFileSync(statePath, 'utf-8');
    assert.ok(
      finalContent.includes('# State A') || finalContent.includes('# State B'),
      'final file should be one complete writer result'
    );
    assert.ok(
      !finalContent.includes('# State A') || !finalContent.includes('# State B'),
      'final output should not contain merged bodies from both writers'
    );
  });

  test('second writer fails fast with lock timeout error when lock is held', async () => {
    const tmpDir = makePlanningDir();
    const statePath = path.join(tmpDir, '.planning', 'STATE.md');
    fs.writeFileSync(statePath, '# Initial\n', 'utf-8');

    const lockPromise = withLock(statePath, async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }, { timeout: 5000 });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const modulePath = path.join(__dirname, '..', 'ez-agents', 'bin', 'lib', 'state.cjs');
    const result = await runStateWriterWorker({
      statePath: modulePath,
      filePath: statePath,
      content: '# Timeout test\n',
      cwd: tmpDir,
      options: { timeoutMs: 100 },
    });

    await lockPromise;

    assert.strictEqual(result.ok, false, 'second writer should fail while lock is held');
    assert.match(result.message, /File locked:/, 'timeout error should use File locked shape');
  });
});
