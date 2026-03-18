const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const Logger = require('../ez-agents/bin/lib/logger.cjs');

const tempDirs = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('logger contract', () => {
  test('writes logs under ez-* filename pattern', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ez-logger-'));
    tempDirs.push(root);
    const logDir = path.join(root, '.planning', 'logs');
    const logger = new Logger(logDir);

    const logFile = logger.getLogFile();
    assert.ok(logFile.startsWith(logDir), 'log file must be inside provided directory');
    assert.ok(
      path.basename(logFile).startsWith('ez-'),
      `expected ez-* log filename, got ${path.basename(logFile)}`
    );
  });

  test('serializes ERROR/WARN/INFO/DEBUG entries with timestamp and level', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ez-logger-'));
    tempDirs.push(root);
    const logDir = path.join(root, '.planning', 'logs');
    const logger = new Logger(logDir);

    logger.error('error message', { operation: 'test-error' });
    logger.warn('warn message', { operation: 'test-warn' });
    logger.info('info message', { operation: 'test-info' });
    logger.debug('debug message', { operation: 'test-debug' });

    const lines = fs
      .readFileSync(logger.getLogFile(), 'utf-8')
      .trim()
      .split('\n')
      .map(line => JSON.parse(line));

    assert.strictEqual(lines.length, 4, 'expected 4 log entries');

    const levels = lines.map(entry => entry.level);
    assert.deepStrictEqual(levels, ['ERROR', 'WARN', 'INFO', 'DEBUG']);

    for (const entry of lines) {
      assert.ok(entry.timestamp, 'entry must include timestamp');
      assert.ok(!Number.isNaN(Date.parse(entry.timestamp)), 'timestamp must be ISO-parseable');
      assert.ok(entry.level, 'entry must include level');
    }
  });
});
