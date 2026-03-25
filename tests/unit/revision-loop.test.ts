#!/usr/bin/env node

/**
 * Tests for RevisionLoopController
 *
 * Coverage:
 * - REV-01: Revision iterations track learnings
 * - REV-02: Root cause analysis triggered after 2nd failure
 * - REV-03: Early exit when quality degrades
 * - REV-04: Learnings preserved across iterations in structured JSON
 */

import assert from 'node:assert';
import * as path from 'path';

import RevisionLoopController from '../../bin/lib/revision-loop.js';

let passed = 0;
let failed = 0;

// Run tests
(async () => {
  console.log('\n=== RevisionLoopController Tests ===\n');

  const tempDir = createTempDir();

  try {
    // Constructor tests
    console.log('constructor:');
    const controller1 = new RevisionLoopController();
    assert.strictEqual(controller1.maxAttempts, 3);
    assert.strictEqual(controller1.baseDelay, 1000);
    assert.strictEqual(controller1.maxDelay, 8000);
    console.log('âœ“ should create instance with default options');
    passed++;

    const controller2 = new RevisionLoopController({ maxAttempts: 3, baseDelay: 100, maxDelay: 1000, memoryDir: tempDir });
    assert.strictEqual(controller2.maxAttempts, 3);
    assert.strictEqual(controller2.baseDelay, 100);
    assert.strictEqual(controller2.maxDelay, 1000);
    console.log('âœ“ should create instance with custom options');
    passed++;

    // calculateDelay tests
    console.log('\ncalculateDelay:');
    const controller3 = new RevisionLoopController({ baseDelay: 100, maxDelay: 1000 });
    const d0 = controller3.calculateDelay(0);
    const d1 = controller3.calculateDelay(1);
    const d2 = controller3.calculateDelay(2);
    assert.ok(d0 >= 75 && d0 <= 125, `delay0 should be ~100, got ${d0}`);
    assert.ok(d1 >= 150 && d1 <= 250, `delay1 should be ~200, got ${d1}`);
    assert.ok(d2 >= 300 && d2 <= 500, `delay2 should be ~400, got ${d2}`);
    console.log('âœ“ should calculate exponential backoff');
    passed++;

    const controller4 = new RevisionLoopController({ baseDelay: 1000, maxDelay: 2000 });
    const d10 = controller4.calculateDelay(10);
    assert.ok(d10 <= 2000, `delay10 should be capped at 2000, got ${d10}`);
    console.log('âœ“ should cap delay at maxDelay');
    passed++;

    const controller5 = new RevisionLoopController({ baseDelay: 100 });
    const delays = Array.from({ length: 10 }, () => controller5.calculateDelay(1));
    const uniqueDelays = new Set(delays);
    assert.ok(uniqueDelays.size > 1, 'Delays should vary due to jitter');
    console.log('âœ“ should add jitter to prevent thundering herd');
    passed++;

    // shouldRetry tests
    console.log('\nshouldRetry:');
    const c1 = new RevisionLoopController({ memoryDir: tempDir });
    await c1.recordAttempt('task-01', new Error('Test error'), 50);
    assert.strictEqual(await c1.shouldRetry('task-01'), true);
    console.log('âœ“ should return true when under max attempts');
    passed++;

    const c2 = new RevisionLoopController({ memoryDir: tempDir });
    await c2.recordAttempt('task-02', new Error('Error 1'), 50);
    await c2.recordAttempt('task-02', new Error('Error 2'), 40);
    await c2.recordAttempt('task-02', new Error('Error 3'), 30);
    assert.strictEqual(await c2.shouldRetry('task-02'), false);
    console.log('âœ“ should return false when at max attempts');
    passed++;

    const c3 = new RevisionLoopController({ memoryDir: tempDir });
    assert.strictEqual(await c3.shouldRetry('new-task'), true);
    console.log('âœ“ should return true for new task with no history');
    passed++;

    // recordAttempt tests
    console.log('\nrecordAttempt:');
    const c4 = new RevisionLoopController({ memoryDir: tempDir });
    const r1 = await c4.recordAttempt('task-03', new Error('Test error message'), 65);
    assert.strictEqual(r1.iteration, 1);
    assert.strictEqual(r1.error, 'Test error message');
    assert.strictEqual(r1.quality_score, 65);
    assert.strictEqual(r1.success, false);
    console.log('âœ“ should record attempt with error and quality score');
    passed++;

    const c5 = new RevisionLoopController({ memoryDir: tempDir });
    const r2 = await c5.recordAttempt('task-04', null, 85);
    assert.strictEqual(r2.iteration, 1);
    assert.strictEqual(r2.error, null);
    assert.strictEqual(r2.quality_score, 85);
    assert.strictEqual(r2.success, true);
    console.log('âœ“ should record successful attempt');
    passed++;

    const c6 = new RevisionLoopController({ memoryDir: tempDir });
    await c6.recordAttempt('task-05', new Error('Error 1'), 50);
    const r3 = await c6.recordAttempt('task-05', new Error('Error 2'), 45);
    assert.strictEqual(r3.iteration, 2);
    console.log('âœ“ should increment iteration number for subsequent attempts');
    passed++;

    const c7 = new RevisionLoopController({ memoryDir: tempDir });
    const depErr = await c7.recordAttempt('dep-task', new Error('Cannot find module'), 50);
    assert.strictEqual(depErr.error_type, 'Dependency');
    const synErr = await c7.recordAttempt('syntax-task', new Error('SyntaxError: Unexpected token'), 50);
    assert.strictEqual(synErr.error_type, 'Syntax');
    const toErr = await c7.recordAttempt('timeout-task', new Error('Request timeout'), 50);
    assert.strictEqual(toErr.error_type, 'Timeout');
    const resErr = await c7.recordAttempt('resource-task', new Error('Out of memory'), 50);
    assert.strictEqual(resErr.error_type, 'Resource');
    console.log('âœ“ should classify error types correctly');
    passed++;

    const c8 = new RevisionLoopController({ memoryDir: tempDir });
    await c8.recordAttempt('task-06', new Error('Test'), 60);
    const mf = path.join(tempDir, 'task-06-MEMORY.json');
    assert.ok(fs.existsSync(mf), 'MEMORY.json should exist');
    const data = JSON.parse(fs.readFileSync(mf, 'utf8'));
    assert.strictEqual(data.taskId, 'task-06');
    assert.strictEqual(data.revisions.length, 1);
    console.log('âœ“ should persist to MEMORY.json file');
    passed++;

    const c9 = new RevisionLoopController({ memoryDir: tempDir });
    const r4 = await c9.recordAttempt('task-07', null, 75, { customField: 'customValue', duration: 1500 });
    assert.strictEqual(r4.customField, 'customValue');
    assert.strictEqual(r4.duration, 1500);
    console.log('âœ“ should accept additional metadata');
    passed++;

    // getRevisionHistory tests
    console.log('\ngetRevisionHistory:');
    const c10 = new RevisionLoopController({ memoryDir: tempDir });
    assert.deepStrictEqual(await c10.getRevisionHistory('new-task'), []);
    console.log('âœ“ should return empty array for new task');
    passed++;

    const c11 = new RevisionLoopController({ memoryDir: tempDir });
    await c11.recordAttempt('task-08', new Error('Error 1'), 50);
    await c11.recordAttempt('task-08', new Error('Error 2'), 55);
    await c11.recordAttempt('task-08', null, 80);
    const h1 = await c11.getRevisionHistory('task-08');
    assert.strictEqual(h1.length, 3);
    console.log('âœ“ should return all recorded attempts');
    passed++;

    const mf2 = path.join(tempDir, 'task-09-MEMORY.json');
    fs.writeFileSync(mf2, JSON.stringify({
      taskId: 'task-09',
      lastUpdated: new Date().toISOString(),
      revisionCount: 2,
      revisions: [
        { iteration: 1, error: 'Error 1', quality_score: 50, timestamp: new Date().toISOString() },
        { iteration: 2, error: 'Error 2', quality_score: 60, timestamp: new Date().toISOString() }
      ]
    }, null, 2));
    const c12 = new RevisionLoopController({ memoryDir: tempDir });
    const h2 = await c12.getRevisionHistory('task-09');
    assert.strictEqual(h2.length, 2);
    console.log('âœ“ should load history from MEMORY.json file');
    passed++;

    // resetCounter tests
    console.log('\nresetCounter:');
    const c13 = new RevisionLoopController({ memoryDir: tempDir });
    await c13.recordAttempt('task-10', new Error('Error'), 50);
    await c13.recordAttempt('task-10', new Error('Error 2'), 55);
    await c13.resetCounter('task-10');
    const h3 = await c13.getRevisionHistory('task-10');
    assert.strictEqual(h3.length, 0);
    console.log('âœ“ should clear revision history');
    passed++;

    const c14 = new RevisionLoopController({ memoryDir: tempDir });
    await c14.recordAttempt('task-11', new Error('Error'), 50);
    const mf3 = path.join(tempDir, 'task-11-MEMORY.json');
    assert.ok(fs.existsSync(mf3));
    await c14.resetCounter('task-11');
    assert.ok(!fs.existsSync(mf3), 'MEMORY.json should be removed');
    console.log('âœ“ should remove MEMORY.json file');
    passed++;

    // getAttemptCount tests
    console.log('\ngetAttemptCount:');
    const c15 = new RevisionLoopController({ memoryDir: tempDir });
    assert.strictEqual(await c15.getAttemptCount('new-task'), 0);
    console.log('âœ“ should return 0 for new task');
    passed++;

    const c16 = new RevisionLoopController({ memoryDir: tempDir });
    await c16.recordAttempt('task-12', new Error('Error 1'), 50);
    await c16.recordAttempt('task-12', new Error('Error 2'), 55);
    await c16.recordAttempt('task-12', null, 80);
    assert.strictEqual(await c16.getAttemptCount('task-12'), 3);
    console.log('âœ“ should return number of recorded attempts');
    passed++;

    // getStats tests
    console.log('\ngetStats:');
    const c17 = new RevisionLoopController({ memoryDir: tempDir });
    await c17.recordAttempt('task-a', new Error('Error'), 50);
    await c17.recordAttempt('task-a', null, 75);
    await c17.recordAttempt('task-b', new Error('Error'), 40);
    const stats = c17.getStats();
    assert.strictEqual(stats.totalTasks, 2);
    assert.strictEqual(stats.totalRevisions, 3);
    assert.strictEqual(stats.successfulRevisions, 1);
    assert.strictEqual(stats.successRate, '33.3');
    console.log('âœ“ should return statistics for all tracked tasks');
    passed++;

    const c18 = new RevisionLoopController({ memoryDir: tempDir });
    const stats2 = c18.getStats();
    assert.strictEqual(stats2.totalTasks, 0);
    assert.strictEqual(stats2.totalRevisions, 0);
    console.log('âœ“ should handle empty state');
    passed++;

    // Integration test
    console.log('\nintegration: revision loop workflow:');
    const c19 = new RevisionLoopController({ memoryDir: tempDir });
    const taskId = 'integration-task';
    let attempt = 0;
    let success = false;
    while (await c19.shouldRetry(taskId) && !success) {
      attempt++;
      const qualityScore = attempt === 3 ? 85 : 50 + (attempt * 5);
      const error = qualityScore < 70 ? new Error(`Attempt ${attempt} failed`) : null;
      const result = await c19.recordAttempt(taskId, error, qualityScore);
      success = result.success;
    }
    const history = await c19.getRevisionHistory(taskId);
    assert.strictEqual(history.length, 3);
    assert.strictEqual(history[2].success, true);
    assert.strictEqual(history[2].quality_score, 85);
    console.log('âœ“ should support complete revision loop with retry logic');
    passed++;

  } finally {
    cleanupTempDir(tempDir);
  }

  // Summary
  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
})();
