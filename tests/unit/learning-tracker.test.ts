#!/usr/bin/env node

/**
 * Tests for LearningTracker
 *
 * Coverage:
 * - REV-01: Revision iterations track learnings
 * - REV-04: Learnings preserved across iterations in structured JSON
 */

import assert from 'node:assert';
import * as path from 'path';

import LearningTracker from '../../bin/lib/learning-tracker.js';

let passed = 0;
let failed = 0;

async function runTests() {
  console.log('\n=== LearningTracker Tests ===\n');

  const tempDir = createTempDir();

  try {
    // Constructor tests
    console.log('constructor:');
    const tracker1 = new LearningTracker();
    assert.ok(tracker1.memoryDir);
    console.log('âœ“ should create instance with default memoryDir');
    passed++;

    const tracker2 = new LearningTracker({ memoryDir: tempDir });
    assert.strictEqual(tracker2.memoryDir, tempDir);
    console.log('âœ“ should create instance with custom memoryDir');
    passed++;

    const newDir = path.join(os.tmpdir(), 'new-learning-dir-' + Date.now());
    try {
      const tracker3 = new LearningTracker({ memoryDir: newDir });
      assert.ok(fs.existsSync(newDir));
      console.log('âœ“ should create memory directory if not exists');
      passed++;
    } finally {
      if (fs.existsSync(newDir)) {
        fs.rmSync(newDir, { recursive: true, force: true });
      }
    }

    // recordLearning tests
    console.log('\nrecordLearning:');
    const t1 = new LearningTracker({ memoryDir: tempDir });
    const r1 = await t1.recordLearning('task-01', {
      iteration: 1,
      error_type: 'Syntax',
      root_cause: 'Missing semicolon on line 10',
      fix_attempted: 'Added semicolon',
      quality_delta: 15
    });
    assert.strictEqual(r1.iteration, 1);
    assert.strictEqual(r1.error_type, 'Syntax');
    assert.strictEqual(r1.root_cause, 'Missing semicolon on line 10');
    assert.strictEqual(r1.fix_attempted, 'Added semicolon');
    assert.strictEqual(r1.quality_delta, 15);
    assert.ok(r1.timestamp);
    assert.ok(Array.isArray(r1.tags));
    console.log('âœ“ should record learning with required fields');
    passed++;

    const t2 = new LearningTracker({ memoryDir: tempDir });
    const r2 = await t2.recordLearning('task-02', {
      iteration: 1,
      error_type: 'Dependency',
      root_cause: 'Module not found: lodash is not installed',
      fix_attempted: 'npm install lodash'
    });
    assert.ok(r2.tags.length > 0);
    console.log('âœ“ should generate semantic tags automatically');
    passed++;

    const t3 = new LearningTracker({ memoryDir: tempDir });
    const r3 = await t3.recordLearning('task-03', {
      iteration: 1,
      error_type: 'Logic',
      root_cause: 'Off-by-one error',
      fix_attempted: 'Fixed loop boundary',
      tags: ['loop', 'boundary', 'array']
    });
    assert.deepStrictEqual(r3.tags, ['loop', 'boundary', 'array']);
    console.log('âœ“ should accept custom tags');
    passed++;

    const t4 = new LearningTracker({ memoryDir: tempDir });
    await t4.recordLearning('task-04', {
      iteration: 1,
      error_type: 'Timeout',
      root_cause: 'API request took too long',
      fix_attempted: 'Increased timeout threshold'
    });
    const mf = path.join(tempDir, 'task-04-MEMORY.json');
    assert.ok(fs.existsSync(mf));
    const data = JSON.parse(fs.readFileSync(mf, 'utf8'));
    assert.strictEqual(data.taskId, 'task-04');
    assert.strictEqual(data.revisionCount, 1);
    console.log('âœ“ should persist to MEMORY.json file');
    passed++;

    const t5 = new LearningTracker({ memoryDir: tempDir });
    await t5.recordLearning('task-05', { iteration: 1, error_type: 'Syntax', root_cause: 'Missing bracket' });
    await t5.recordLearning('task-05', { iteration: 2, error_type: 'Logic', root_cause: 'Wrong condition', quality_delta: 20 });
    const learnings = await t5.getLearnings('task-05');
    assert.strictEqual(learnings.revisionCount, 2);
    assert.strictEqual(learnings.revisions.length, 2);
    console.log('âœ“ should track multiple revisions for same task');
    passed++;

    const t6 = new LearningTracker({ memoryDir: tempDir });
    const r6 = await t6.recordLearning('task-06', {});
    assert.strictEqual(r6.iteration, 1);
    assert.strictEqual(r6.error_type, 'Unknown');
    assert.strictEqual(r6.root_cause, '');
    console.log('âœ“ should handle default values for optional fields');
    passed++;

    // getLearnings tests
    console.log('\ngetLearnings:');
    const t7 = new LearningTracker({ memoryDir: tempDir });
    const l1 = await t7.getLearnings('new-task');
    assert.strictEqual(l1.taskId, 'new-task');
    assert.strictEqual(l1.revisionCount, 0);
    assert.deepStrictEqual(l1.revisions, []);
    console.log('âœ“ should return empty learnings for new task');
    passed++;

    const t8 = new LearningTracker({ memoryDir: tempDir });
    await t8.recordLearning('task-07', { iteration: 1, error_type: 'Dependency', root_cause: 'Missing package' });
    await t8.recordLearning('task-07', { iteration: 2, error_type: 'Syntax', root_cause: 'Parse error' });
    const l2 = await t8.getLearnings('task-07');
    assert.strictEqual(l2.revisionCount, 2);
    console.log('âœ“ should return all learnings for a task');
    passed++;

    const mf3 = path.join(tempDir, 'task-08-MEMORY.json');
    fs.writeFileSync(mf3, JSON.stringify({
      taskId: 'task-08',
      lastUpdated: new Date().toISOString(),
      revisionCount: 2,
      revisions: [
        { iteration: 1, error_type: 'Syntax', root_cause: 'Error 1', timestamp: new Date().toISOString() },
        { iteration: 2, error_type: 'Logic', root_cause: 'Error 2', timestamp: new Date().toISOString() }
      ]
    }, null, 2));
    const t9 = new LearningTracker({ memoryDir: tempDir });
    const l3 = await t9.getLearnings('task-08');
    assert.strictEqual(l3.revisionCount, 2);
    console.log('âœ“ should load learnings from MEMORY.json file');
    passed++;

    // searchLearnings tests
    console.log('\nsearchLearnings:');
    const searchTempDir = createTempDir();
    try {
    const t10 = new LearningTracker({ memoryDir: searchTempDir });
    await t10.recordLearning('task-01', { iteration: 1, error_type: 'Syntax', root_cause: 'Missing semicolon' });
    await t10.recordLearning('task-02', { iteration: 1, error_type: 'Dependency', root_cause: 'Module not found' });
    await t10.recordLearning('task-03', { iteration: 1, error_type: 'Syntax', root_cause: 'Unexpected token' });
    const results1 = await t10.searchLearnings('Syntax');
    assert.strictEqual(results1.length, 2);
    assert.ok(results1.every(r => r.error_type === 'Syntax'));
    console.log('âœ“ should find learnings by error type');
    passed++;

    const t11 = new LearningTracker({ memoryDir: searchTempDir });
    await t11.recordLearning('task-04', { iteration: 1, error_type: 'Dependency', root_cause: 'lodash module not found' });
    await t11.recordLearning('task-05', { iteration: 1, error_type: 'Syntax', root_cause: 'Missing import statement' });
    const results2 = await t11.searchLearnings('module');
    assert.ok(results2.length > 0);
    console.log('âœ“ should find learnings by root cause keyword');
    passed++;

    const t12 = new LearningTracker({ memoryDir: searchTempDir });
    await t12.recordLearning('task-06', { iteration: 1, error_type: 'Logic', root_cause: 'Array index out of bounds', tags: ['array', 'index', 'bounds'] });
    const results3 = await t12.searchLearnings('array');
    assert.ok(results3.length > 0);
    console.log('âœ“ should find learnings by tag');
    passed++;

    const t13 = new LearningTracker({ memoryDir: searchTempDir });
    for (let i = 0; i < 15; i++) {
      await t13.recordLearning(`task-${i}`, { iteration: 1, error_type: 'Syntax', root_cause: `Error ${i}` });
    }
    const results4 = await t13.searchLearnings('Syntax', { limit: 5 });
    assert.ok(results4.length <= 5);
    console.log('âœ“ should limit results');
    passed++;
    } finally {
      cleanupTempDir(searchTempDir);
    }

    // getLearningsByCategory tests
    console.log('\ngetLearningsByCategory:');
    const catTempDir = createTempDir();
    try {
    const t14 = new LearningTracker({ memoryDir: catTempDir });
    await t14.recordLearning('task-01', { iteration: 1, error_type: 'Dependency', root_cause: 'Missing package' });
    await t14.recordLearning('task-02', { iteration: 1, error_type: 'Dependency', root_cause: 'Version conflict' });
    await t14.recordLearning('task-03', { iteration: 1, error_type: 'Syntax', root_cause: 'Parse error' });
    const catResults = await t14.getLearningsByCategory('Dependency');
    assert.strictEqual(catResults.length, 2);
    console.log('âœ“ should return learnings for specific category');
    passed++;

    // getPatterns tests
    console.log('\ngetPatterns:');
    const t15 = new LearningTracker({ memoryDir: catTempDir });
    await t15.recordLearning('task-01', { iteration: 1, error_type: 'Syntax', root_cause: 'Missing semicolon' });
    await t15.recordLearning('task-02', { iteration: 1, error_type: 'Syntax', root_cause: 'Missing semicolon' });
    await t15.recordLearning('task-03', { iteration: 1, error_type: 'Dependency', root_cause: 'Module not found' });
    const patterns = await t15.getPatterns();
    assert.strictEqual(patterns.categoryCount.Syntax, 2);
    assert.strictEqual(patterns.categoryCount.Dependency, 1);
    console.log('âœ“ should analyze patterns across all learnings');
    passed++;

    const patternsTempDir = createTempDir();
    try {
    const t16 = new LearningTracker({ memoryDir: patternsTempDir });
    await t16.recordLearning('task-01', { iteration: 1, error_type: 'Syntax', root_cause: 'Missing semicolon' });
    await t16.recordLearning('task-02', { iteration: 1, error_type: 'Syntax', root_cause: 'Missing semicolon' });
    await t16.recordLearning('task-03', { iteration: 1, error_type: 'Syntax', root_cause: 'Missing bracket' });
    const patterns2 = await t16.getPatterns();
    assert.ok(patterns2.commonRootCauses.length > 0);
    console.log('âœ“ should identify common root causes');
    passed++;

    const t17 = new LearningTracker({ memoryDir: patternsTempDir });
    await t17.recordLearning('task-01', { iteration: 1, error_type: 'Syntax', root_cause: 'Error' });
    await t17.recordLearning('task-01', { iteration: 2, error_type: 'Logic', root_cause: 'Error' });
    await t17.recordLearning('task-02', { iteration: 1, error_type: 'Dependency', root_cause: 'Error' });
    const patterns3 = await t17.getPatterns();
    assert.strictEqual(patterns3.taskFailures['task-01'], 2);
    console.log('âœ“ should track task failure counts');
    passed++;
    } finally {
      cleanupTempDir(patternsTempDir);
    }
    } finally {
      cleanupTempDir(catTempDir);
    }

    // clearLearnings tests
    console.log('\nclearLearnings:');
    const t18 = new LearningTracker({ memoryDir: tempDir });
    await t18.recordLearning('task-01', { iteration: 1, error_type: 'Syntax', root_cause: 'Error' });
    await t18.clearLearnings('task-01');
    const l4 = await t18.getLearnings('task-01');
    assert.strictEqual(l4.revisionCount, 0);
    console.log('âœ“ should clear learnings from memory');
    passed++;

    const t19 = new LearningTracker({ memoryDir: tempDir });
    await t19.recordLearning('task-02', { iteration: 1, error_type: 'Syntax', root_cause: 'Error' });
    const mf4 = path.join(tempDir, 'task-02-MEMORY.json');
    assert.ok(fs.existsSync(mf4));
    await t19.clearLearnings('task-02');
    assert.ok(!fs.existsSync(mf4));
    console.log('âœ“ should remove MEMORY.json file');
    passed++;

    // getStats tests
    console.log('\ngetStats:');
    const statsTempDir = createTempDir();
    try {
    const t20 = new LearningTracker({ memoryDir: statsTempDir });
    await t20.recordLearning('task-01', { iteration: 1, error_type: 'Syntax', root_cause: 'Error', success: true });
    await t20.recordLearning('task-02', { iteration: 1, error_type: 'Dependency', root_cause: 'Error', success: false });
    const stats = await t20.getStats();
    assert.strictEqual(stats.totalTasks, 2);
    assert.strictEqual(stats.totalRevisions, 2);
    assert.strictEqual(stats.successfulRevisions, 1);
    console.log('âœ“ should return summary statistics');
    passed++;
    } finally {
      cleanupTempDir(statsTempDir);
    }

    // Integration test
    console.log('\nintegration: learning tracking workflow:');
    const t21 = new LearningTracker({ memoryDir: tempDir });
    const taskId = 'integration-task';
    const iterations = [
      { error_type: 'Syntax', root_cause: 'Missing semicolon', fix_attempted: 'Added semicolon', quality_delta: 10 },
      { error_type: 'Logic', root_cause: 'Wrong condition', fix_attempted: 'Fixed condition', quality_delta: 15 },
      { error_type: null, root_cause: 'All issues resolved', fix_attempted: 'Final review', quality_delta: 25, success: true }
    ];
    for (const iter of iterations) {
      await t21.recordLearning(taskId, { iteration: iterations.indexOf(iter) + 1, ...iter });
    }
    const learnings2 = await t21.getLearnings(taskId);
    assert.strictEqual(learnings2.revisionCount, 3);
    console.log('âœ“ should support complete learning tracking across iterations');
    passed++;

    // Schema validation
    console.log('\nschema validation:');
    const t22 = new LearningTracker({ memoryDir: tempDir });
    const r22 = await t22.recordLearning('schema-task', {
      iteration: 1,
      error_type: 'Syntax',
      root_cause: 'Test root cause',
      fix_attempted: 'Test fix',
      quality_delta: 10,
      tags: ['test', 'syntax']
    });
    assert.ok(r22.hasOwnProperty('iteration'));
    assert.ok(r22.hasOwnProperty('timestamp'));
    assert.ok(r22.hasOwnProperty('error_type'));
    assert.ok(r22.hasOwnProperty('root_cause'));
    assert.ok(r22.hasOwnProperty('fix_attempted'));
    assert.ok(r22.hasOwnProperty('quality_delta'));
    assert.ok(r22.hasOwnProperty('tags'));
    assert.ok(r22.hasOwnProperty('success'));
    console.log('âœ“ should produce learnings matching expected schema');
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
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
