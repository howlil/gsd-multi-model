#!/usr/bin/env node

/**
 * Tests for QualityDetector
 *
 * Coverage:
 * - REV-03: Early exit when quality degrades 20% from peak
 */

import assert from 'node:assert';
import * as path from 'path';

import QualityDetector from '../../bin/lib/quality-detector.js';

let passed = 0;
let failed = 0;

async function runTests() {
  console.log('\n=== QualityDetector Tests ===\n');

  const tempDir = createTempDir();

  try {
    // Constructor tests
    console.log('constructor:');
    const detector1 = new QualityDetector();
    assert.strictEqual(detector1.degradationThreshold, 0.20);
    assert.strictEqual(detector1.weights.tests, 0.50);
    assert.strictEqual(detector1.weights.lint, 0.20);
    assert.strictEqual(detector1.weights.diff, 0.20);
    assert.strictEqual(detector1.weights.time, 0.10);
    console.log('âœ“ should create instance with default options');
    passed++;

    const detector2 = new QualityDetector({
      degradationThreshold: 0.15,
      weights: { tests: 0.60, lint: 0.15, diff: 0.15, time: 0.10 }
    });
    assert.strictEqual(detector2.degradationThreshold, 0.15);
    assert.strictEqual(detector2.weights.tests, 0.60);
    console.log('âœ“ should create instance with custom options');
    passed++;

    // calculateQualityScore tests
    console.log('\ncalculateQualityScore:');
    const d1 = new QualityDetector({ qualityDir: tempDir });
    const result1 = await d1.calculateQualityScore('task-01', {
      iteration: 1,
      testPassRate: 0.95,
      lintErrorCount: 2,
      lintErrorMax: 10,
      diffSize: 50,
      diffSizeBaseline: 50,
      executionTimeMs: 5000,
      executionTimeMax: 30000
    });
    assert.strictEqual(result1.taskId, 'task-01');
    assert.strictEqual(result1.iteration, 1);
    assert.ok(result1.scores.composite);
    assert.ok(result1.scores.test);
    assert.ok(result1.scores.lint);
    assert.ok(result1.scores.diff);
    assert.ok(result1.scores.time);
    console.log('âœ“ should calculate quality score with all metrics');
    passed++;

    const d2 = new QualityDetector({ qualityDir: tempDir });
    const result2 = await d2.calculateQualityScore('task-02', {
      iteration: 1,
      testPassRate: 1.0,
      lintErrorCount: 10,
      lintErrorMax: 10,
      diffSize: 100,
      diffSizeBaseline: 100,
      executionTimeMs: 30000,
      executionTimeMax: 30000
    });
    assert.strictEqual(result2.scores.test, 100);
    assert.ok(result2.scores.composite < 80);
    assert.ok(result2.scores.composite > 40);
    console.log('âœ“ should weight tests at 50%');
    passed++;

    const d3 = new QualityDetector({ qualityDir: tempDir });
    const result3 = await d3.calculateQualityScore('task-03', {
      iteration: 1,
      testPassRate: 1.0,
      lintErrorCount: 0,
      lintErrorMax: 10,
      diffSize: 50,
      diffSizeBaseline: 50,
      executionTimeMs: 5000,
      executionTimeMax: 30000
    });
    assert.strictEqual(result3.scores.composite, 100);
    console.log('âœ“ should handle perfect scores');
    passed++;

    const d4 = new QualityDetector({ qualityDir: tempDir });
    const result4 = await d4.calculateQualityScore('task-04', {
      iteration: 1,
      testPassRate: 0.5,
      lintErrorCount: 15,
      lintErrorMax: 10,
      diffSize: 200,
      diffSizeBaseline: 50,
      executionTimeMs: 50000,
      executionTimeMax: 30000
    });
    assert.ok(result4.scores.composite < 50);
    console.log('âœ“ should handle poor scores');
    passed++;

    const d5 = new QualityDetector({ qualityDir: tempDir });
    await d5.calculateQualityScore('task-05', {
      iteration: 1,
      testPassRate: 0.90,
      lintErrorCount: 3,
      lintErrorMax: 10,
      diffSize: 50,
      diffSizeBaseline: 50,
      executionTimeMs: 5000,
      executionTimeMax: 30000
    });
    const mf = path.join(tempDir, 'task-05-QUALITY.json');
    assert.ok(fs.existsSync(mf));
    const data = JSON.parse(fs.readFileSync(mf, 'utf8'));
    assert.strictEqual(data.taskId, 'task-05');
    assert.strictEqual(data.history.length, 1);
    console.log('âœ“ should persist quality data to file');
    passed++;

    const d6 = new QualityDetector({ qualityDir: tempDir });
    await d6.calculateQualityScore('task-06', {
      iteration: 1,
      testPassRate: 0.90,
      lintErrorCount: 3,
      lintErrorMax: 10,
      diffSize: 50,
      diffSizeBaseline: 50,
      executionTimeMs: 5000,
      executionTimeMax: 30000
    });
    await d6.calculateQualityScore('task-06', {
      iteration: 2,
      testPassRate: 0.95,
      lintErrorCount: 1,
      lintErrorMax: 10,
      diffSize: 50,
      diffSizeBaseline: 50,
      executionTimeMs: 4000,
      executionTimeMax: 30000
    });
    const history1 = await d6.getQualityHistory('task-06');
    assert.strictEqual(history1.length, 2);
    console.log('âœ“ should track multiple iterations');
    passed++;

    // detectDegradation tests
    console.log('\ndetectDegradation:');
    const d7 = new QualityDetector({ qualityDir: tempDir });
    await d7.calculateQualityScore('task-01', {
      iteration: 1,
      testPassRate: 0.90,
      lintErrorCount: 3,
      lintErrorMax: 10,
      diffSize: 50,
      diffSizeBaseline: 50,
      executionTimeMs: 5000,
      executionTimeMax: 30000
    });
    const analysis1 = await d7.detectDegradation('task-01');
    assert.strictEqual(analysis1.isDegraded, false);
    assert.ok(analysis1.reason.includes('Insufficient history'));
    console.log('âœ“ should return insufficient history for single iteration');
    passed++;

    const d8 = new QualityDetector({ qualityDir: tempDir });
    await d8.calculateQualityScore('task-02', {
      iteration: 1,
      testPassRate: 1.0,
      lintErrorCount: 0,
      lintErrorMax: 10,
      diffSize: 50,
      diffSizeBaseline: 50,
      executionTimeMs: 5000,
      executionTimeMax: 30000
    });
    await d8.calculateQualityScore('task-02', {
      iteration: 2,
      testPassRate: 0.60,
      lintErrorCount: 5,
      lintErrorMax: 10,
      diffSize: 100,
      diffSizeBaseline: 50,
      executionTimeMs: 10000,
      executionTimeMax: 30000
    });
    const analysis2 = await d8.detectDegradation('task-02');
    assert.strictEqual(analysis2.isDegraded, true);
    assert.strictEqual(analysis2.peakScore, 100);
    assert.ok(analysis2.currentScore < 80);
    assert.ok(analysis2.dropFromPeak >= 20);
    assert.strictEqual(analysis2.recommendation, 'EXIT_EARLY');
    console.log('âœ“ should detect degradation when score drops 20% from peak');
    passed++;

    const d9 = new QualityDetector({ qualityDir: tempDir });
    await d9.calculateQualityScore('task-03', {
      iteration: 1,
      testPassRate: 0.90,
      lintErrorCount: 2,
      lintErrorMax: 10,
      diffSize: 50,
      diffSizeBaseline: 50,
      executionTimeMs: 5000,
      executionTimeMax: 30000
    });
    await d9.calculateQualityScore('task-03', {
      iteration: 2,
      testPassRate: 0.88,
      lintErrorCount: 3,
      lintErrorMax: 10,
      diffSize: 55,
      diffSizeBaseline: 50,
      executionTimeMs: 5500,
      executionTimeMax: 30000
    });
    const analysis3 = await d9.detectDegradation('task-03');
    assert.strictEqual(analysis3.isDegraded, false);
    assert.strictEqual(analysis3.recommendation, 'CONTINUE');
    console.log('âœ“ should not detect degradation when score is stable');
    passed++;

    const d10 = new QualityDetector({ qualityDir: tempDir });
    await d10.calculateQualityScore('task-04', {
      iteration: 1,
      testPassRate: 1.0,
      lintErrorCount: 0,
      lintErrorMax: 10,
      diffSize: 50,
      diffSizeBaseline: 50,
      executionTimeMs: 5000,
      executionTimeMax: 30000
    });
    await d10.calculateQualityScore('task-04', {
      iteration: 2,
      testPassRate: 0.70,
      lintErrorCount: 8,
      lintErrorMax: 10,
      diffSize: 50,
      diffSizeBaseline: 50,
      executionTimeMs: 5000,
      executionTimeMax: 30000
    });
    const analysis4 = await d10.detectDegradation('task-04');
    assert.ok(analysis4.degradedMetrics.includes('test_pass_rate'));
    assert.ok(analysis4.degradedMetrics.includes('lint_errors'));
    console.log('âœ“ should identify degraded metrics');
    passed++;

    const d11 = new QualityDetector({ qualityDir: tempDir });
    await d11.calculateQualityScore('task-05', {
      iteration: 1,
      testPassRate: 0.70,
      lintErrorCount: 3,
      lintErrorMax: 10,
      diffSize: 50,
      diffSizeBaseline: 50,
      executionTimeMs: 5000,
      executionTimeMax: 30000
    });
    await d11.calculateQualityScore('task-05', {
      iteration: 2,
      testPassRate: 1.0,
      lintErrorCount: 0,
      lintErrorMax: 10,
      diffSize: 50,
      diffSizeBaseline: 50,
      executionTimeMs: 5000,
      executionTimeMax: 30000
    });
    await d11.calculateQualityScore('task-05', {
      iteration: 3,
      testPassRate: 0.70,
      lintErrorCount: 3,
      lintErrorMax: 10,
      diffSize: 50,
      diffSizeBaseline: 50,
      executionTimeMs: 5000,
      executionTimeMax: 30000
    });
    const analysis5 = await d11.detectDegradation('task-05');
    assert.strictEqual(analysis5.peakIteration, 2);
    assert.strictEqual(analysis5.currentIteration, 3);
    assert.strictEqual(analysis5.isDegraded, true);
    console.log('âœ“ should track peak iteration correctly');
    passed++;

    // shouldExitEarly tests
    console.log('\nshouldExitEarly:');
    const d12 = new QualityDetector({ qualityDir: tempDir });
    await d12.calculateQualityScore('task-01', {
      iteration: 1,
      testPassRate: 0.50,
      lintErrorCount: 5,
      lintErrorMax: 10,
      diffSize: 50,
      diffSizeBaseline: 50,
      executionTimeMs: 5000,
      executionTimeMax: 30000
    });
    const shouldExit1 = await d12.shouldExitEarly('task-01');
    assert.strictEqual(shouldExit1, false);
    console.log('âœ“ should return false for single iteration');
    passed++;

    const d13 = new QualityDetector({ qualityDir: tempDir });
    await d13.calculateQualityScore('task-02', {
      iteration: 1,
      testPassRate: 1.0,
      lintErrorCount: 0,
      lintErrorMax: 10,
      diffSize: 50,
      diffSizeBaseline: 50,
      executionTimeMs: 5000,
      executionTimeMax: 30000
    });
    await d13.calculateQualityScore('task-02', {
      iteration: 2,
      testPassRate: 0.50,
      lintErrorCount: 8,
      lintErrorMax: 10,
      diffSize: 150,
      diffSizeBaseline: 50,
      executionTimeMs: 20000,
      executionTimeMax: 30000
    });
    const shouldExit2 = await d13.shouldExitEarly('task-02');
    assert.strictEqual(shouldExit2, true);
    console.log('âœ“ should return true when quality degraded');
    passed++;

    const d14 = new QualityDetector({ qualityDir: tempDir });
    await d14.calculateQualityScore('task-03', {
      iteration: 1,
      testPassRate: 0.85,
      lintErrorCount: 2,
      lintErrorMax: 10,
      diffSize: 50,
      diffSizeBaseline: 50,
      executionTimeMs: 5000,
      executionTimeMax: 30000
    });
    await d14.calculateQualityScore('task-03', {
      iteration: 2,
      testPassRate: 0.83,
      lintErrorCount: 3,
      lintErrorMax: 10,
      diffSize: 55,
      diffSizeBaseline: 50,
      executionTimeMs: 5500,
      executionTimeMax: 30000
    });
    const shouldExit3 = await d14.shouldExitEarly('task-03');
    assert.strictEqual(shouldExit3, false);
    console.log('âœ“ should return false when quality stable');
    passed++;

    // flagForReview tests
    console.log('\nflagForReview:');
    const d15 = new QualityDetector({ qualityDir: tempDir });
    const flag1 = await d15.flagForReview('task-01', 'Quality degradation detected');
    assert.strictEqual(flag1.taskId, 'task-01');
    assert.strictEqual(flag1.reason, 'Quality degradation detected');
    assert.strictEqual(flag1.status, 'pending_review');
    assert.strictEqual(flag1.flagged_by, 'quality-detector');
    console.log('âœ“ should flag task for human review');
    passed++;

    const d16 = new QualityDetector({ qualityDir: tempDir });
    await d16.calculateQualityScore('task-02', {
      iteration: 1,
      testPassRate: 0.60,
      lintErrorCount: 5,
      lintErrorMax: 10,
      diffSize: 100,
      diffSizeBaseline: 50,
      executionTimeMs: 10000,
      executionTimeMax: 30000
    });
    const flag2 = await d16.flagForReview('task-02', 'Low quality score');
    assert.ok(flag2.qualityScore);
    assert.strictEqual(flag2.iterationCount, 1);
    console.log('âœ“ should include quality score in flag');
    passed++;

    const flagTempDir = createTempDir();
    try {
    const d17 = new QualityDetector({ qualityDir: flagTempDir });
    await d17.flagForReview('task-03', 'Test flag');
    const flagFile = path.join(flagTempDir, 'FLAGS.json');
    assert.ok(fs.existsSync(flagFile));
    const flagData = JSON.parse(fs.readFileSync(flagFile, 'utf8'));
    assert.ok(flagData.flags);
    assert.ok(flagData.flags.length > 0);
    assert.strictEqual(flagData.flags[0].taskId, 'task-03');
    console.log('âœ“ should persist flag to FLAGS.json');
    passed++;

    const d18 = new QualityDetector({ qualityDir: flagTempDir });
    const flag3 = await d18.flagForReview('task-04', 'Test reason', { customField: 'customValue', severity: 'high' });
    assert.strictEqual(flag3.context.customField, 'customValue');
    assert.strictEqual(flag3.context.severity, 'high');
    console.log('âœ“ should accept additional context');
    passed++;
    } finally {
      cleanupTempDir(flagTempDir);
    }

    // getFlaggedTasks tests
    console.log('\ngetFlaggedTasks:');
    const d19 = new QualityDetector({ qualityDir: tempDir });
    await d19.flagForReview('task-01', 'Reason 1');
    await d19.flagForReview('task-02', 'Reason 2');
    const flagged1 = await d19.getFlaggedTasks();
    assert.strictEqual(flagged1.length, 2);
    console.log('âœ“ should return all flagged tasks');
    passed++;

    const d20 = new QualityDetector({ qualityDir: tempDir });
    const flagged2 = await d20.getFlaggedTasks();
    assert.deepStrictEqual(flagged2, []);
    console.log('âœ“ should return empty array when no flags');
    passed++;

    // clearFlag tests
    console.log('\nclearFlag:');
    const d21 = new QualityDetector({ qualityDir: tempDir });
    await d21.flagForReview('task-01', 'Test reason');
    await d21.clearFlag('task-01');
    const flagged3 = await d21.getFlaggedTasks();
    assert.strictEqual(flagged3.find(f => f.taskId === 'task-01').status, 'resolved');
    console.log('âœ“ should clear flag after review');
    passed++;

    const d22 = new QualityDetector({ qualityDir: tempDir });
    await d22.flagForReview('task-02', 'Test reason');
    await d22.clearFlag('task-02');
    const flagged4 = await d22.getFlaggedTasks();
    assert.ok(flagged4.find(f => f.taskId === 'task-02').resolvedAt);
    console.log('âœ“ should add resolvedAt timestamp');
    passed++;

    // getStats tests
    console.log('\ngetStats:');
    const statsTempDir = createTempDir();
    try {
    const d23 = new QualityDetector({ qualityDir: statsTempDir });
    await d23.calculateQualityScore('task-01', {
      iteration: 1,
      testPassRate: 0.90,
      lintErrorCount: 2,
      lintErrorMax: 10,
      diffSize: 50,
      diffSizeBaseline: 50,
      executionTimeMs: 5000,
      executionTimeMax: 30000
    });
    await d23.calculateQualityScore('task-02', {
      iteration: 1,
      testPassRate: 0.80,
      lintErrorCount: 3,
      lintErrorMax: 10,
      diffSize: 60,
      diffSizeBaseline: 50,
      executionTimeMs: 6000,
      executionTimeMax: 30000
    });
    await d23.flagForReview('task-03', 'Test flag');
    const stats = await d23.getStats();
    assert.strictEqual(stats.totalTasks, 2);
    assert.strictEqual(stats.totalIterations, 2);
    assert.strictEqual(stats.flaggedTasks, 1);
    assert.ok(stats.averageQualityScore > 0);
    assert.strictEqual(stats.degradationThreshold, 20);
    console.log('âœ“ should return summary statistics');
    passed++;
    } finally {
      cleanupTempDir(statsTempDir);
    }

    // Metric score calculation tests
    console.log('\nmetric score calculations:');
    const d24 = new QualityDetector({ qualityDir: tempDir });
    assert.strictEqual(d24._calculateTestScore(1.0), 100);
    assert.strictEqual(d24._calculateTestScore(0), 0);
    assert.strictEqual(d24._calculateTestScore(0.5), 50);
    assert.strictEqual(d24._calculateTestScore(0.75), 75);
    console.log('âœ“ _calculateTestScore should scale linearly');
    passed++;

    const d25 = new QualityDetector({ qualityDir: tempDir });
    assert.strictEqual(d25._calculateLintScore(0, 10), 100);
    assert.strictEqual(d25._calculateLintScore(10, 10), 0);
    assert.strictEqual(d25._calculateLintScore(5, 10), 50);
    console.log('âœ“ _calculateLintScore should scale based on error ratio');
    passed++;

    const d26 = new QualityDetector({ qualityDir: tempDir });
    assert.strictEqual(d26._calculateDiffScore(50, 50), 100);
    assert.strictEqual(d26._calculateDiffScore(25, 50), 100);
    const diffScore = d26._calculateDiffScore(150, 50);
    assert.ok(diffScore < 100);
    console.log('âœ“ _calculateDiffScore should decrease as diff grows');
    passed++;

    const d27 = new QualityDetector({ qualityDir: tempDir });
    assert.strictEqual(d27._calculateTimeScore(5000, 30000), 100);
    const timeScore1 = d27._calculateTimeScore(10000, 30000);
    const timeScore2 = d27._calculateTimeScore(20000, 30000);
    assert.ok(timeScore1 > timeScore2);
    assert.strictEqual(d27._calculateTimeScore(50000, 30000), 0);
    console.log('âœ“ _calculateTimeScore should decrease as time increases');
    passed++;

    // Integration test
    console.log('\nintegration: quality monitoring workflow:');
    const d28 = new QualityDetector({ qualityDir: tempDir });
    const taskId = 'integration-task';
    const iterations = [
      { testPassRate: 0.70, lintErrorCount: 5, diffSize: 100, executionTimeMs: 8000 },
      { testPassRate: 0.85, lintErrorCount: 2, diffSize: 60, executionTimeMs: 6000 },
      { testPassRate: 0.95, lintErrorCount: 0, diffSize: 50, executionTimeMs: 5000 },
      { testPassRate: 0.60, lintErrorCount: 8, diffSize: 150, executionTimeMs: 15000 }
    ];

    for (let i = 0; i < iterations.length; i++) {
      await d28.calculateQualityScore(taskId, {
        iteration: i + 1,
        ...iterations[i],
        lintErrorMax: 10,
        diffSizeBaseline: 50,
        executionTimeMax: 30000
      });
    }

    const analysis6 = await d28.detectDegradation(taskId);
    assert.strictEqual(analysis6.peakIteration, 3);
    assert.strictEqual(analysis6.currentIteration, 4);
    assert.strictEqual(analysis6.isDegraded, true);

    const shouldExit4 = await d28.shouldExitEarly(taskId);
    assert.strictEqual(shouldExit4, true);

    const flag4 = await d28.flagForReview(taskId, 'Quality degraded from peak');
    assert.strictEqual(flag4.status, 'pending_review');
    console.log('âœ“ should support complete quality monitoring with early exit');
    passed++;

    // Custom threshold test
    console.log('\ncustom threshold:');
    const strictDetector = new QualityDetector({
      degradationThreshold: 0.10,
      qualityDir: tempDir
    });
    await strictDetector.calculateQualityScore('task-01', {
      iteration: 1,
      testPassRate: 1.0,
      lintErrorCount: 0,
      lintErrorMax: 10,
      diffSize: 50,
      diffSizeBaseline: 50,
      executionTimeMs: 5000,
      executionTimeMax: 30000
    });
    await strictDetector.calculateQualityScore('task-01', {
      iteration: 2,
      testPassRate: 0.88,
      lintErrorCount: 2,
      lintErrorMax: 10,
      diffSize: 60,
      diffSizeBaseline: 50,
      executionTimeMs: 6000,
      executionTimeMax: 30000
    });
    const analysis7 = await strictDetector.detectDegradation('task-01');
    assert.strictEqual(analysis7.isDegraded, true);
    console.log('âœ“ should use custom degradation threshold');
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
