/**
 * Planning Write — lock/temp-safe writer for .planning mutations
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { Worker } = require('worker_threads');
const { withLock } = require('./file-lock.cjs');
const { createTempFile, cleanupTemp } = require('./temp-file.cjs');

function normalizeTimeoutError(err, filePath) {
  if (!err) return err;
  const message = err.message || '';
  if (message.includes('File locked:')) {
    return err;
  }
  if (message.includes('timed out') || err.code === 'ELOCKED') {
    return new Error(`File locked: ${filePath}`);
  }
  return err;
}

async function safePlanningWrite(filePath, content, options = {}) {
  const {
    timeoutMs = 30000,
    tempPrefix = 'ez-write-',
  } = options;

  let tempPath = null;

  try {
    await withLock(filePath, async () => {
      tempPath = await createTempFile(tempPrefix, path.dirname(filePath), content);
      await fs.promises.rename(tempPath, filePath);
    }, { timeout: timeoutMs });
  } catch (err) {
    throw normalizeTimeoutError(err, filePath);
  } finally {
    if (tempPath) {
      try {
        await cleanupTemp(tempPath);
      } catch {
        // best effort cleanup only
      }
    }
  }
}

function safePlanningWriteSync(filePath, content, options = {}) {
  const signalBuffer = new SharedArrayBuffer(4);
  const signal = new Int32Array(signalBuffer);
  const errorPath = path.join(os.tmpdir(), `ez-planning-write-error-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.log`);
  const modulePath = __filename;

  const workerCode = `
    const fs = require('fs');
    const { workerData } = require('worker_threads');
    const signal = new Int32Array(workerData.signalBuffer);
    const { safePlanningWrite } = require(workerData.modulePath);
    (async () => {
      try {
        await safePlanningWrite(workerData.filePath, workerData.content, workerData.options);
        Atomics.store(signal, 0, 1);
      } catch (err) {
        try {
          fs.writeFileSync(workerData.errorPath, err && (err.stack || err.message) ? (err.stack || err.message) : String(err), 'utf-8');
        } catch {}
        Atomics.store(signal, 0, 2);
      } finally {
        Atomics.notify(signal, 0);
      }
    })();
  `;

  const worker = new Worker(workerCode, {
    eval: true,
    workerData: { modulePath, filePath, content, options, signalBuffer, errorPath },
  });

  try {
    while (Atomics.load(signal, 0) === 0) {
      Atomics.wait(signal, 0, 0, 100);
    }
  } finally {
    worker.terminate().catch(() => {});
  }

  const status = Atomics.load(signal, 0);
  if (status === 2) {
    let message = `safePlanningWriteSync failed for ${filePath}`;
    try {
      if (fs.existsSync(errorPath)) {
        message = fs.readFileSync(errorPath, 'utf-8') || message;
      }
    } catch {}
    try { fs.rmSync(errorPath, { force: true }); } catch {}
    throw new Error(message);
  }

  try { fs.rmSync(errorPath, { force: true }); } catch {}
}

module.exports = {
  safePlanningWrite,
  safePlanningWriteSync,
};
