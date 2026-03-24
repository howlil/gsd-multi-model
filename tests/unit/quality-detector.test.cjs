#!/usr/bin/env node

/**
 * Tests for QualityDetector
 *
 * Coverage:
 * - REV-03: Early exit when quality degrades 20% from peak
 */

const { describe, it, beforeEach, afterEach } = require('vitest');
const { expect } = require('vitest');
const fs = require('fs');
const path = require('path');
const os = require('os');
const QualityDetector = require('../../bin/lib/quality-detector.cjs');

describe('QualityDetector', () => {
  let detector;
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quality-detector-test-'));
    detector = new QualityDetector({
      degradationThreshold: 0.20,
      qualityDir: tempDir
    });
  });

  afterEach(() => {
    // Cleanup temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const defaultDetector = new QualityDetector();
      expect(defaultDetector.degradationThreshold).toBe(0.20);
      expect(defaultDetector.weights.tests).toBe(0.50);
      expect(defaultDetector.weights.lint).toBe(0.20);
      expect(defaultDetector.weights.diff).toBe(0.20);
      expect(defaultDetector.weights.time).toBe(0.10);
    });

    it('should create instance with custom options', () => {
      const customDetector = new QualityDetector({
        degradationThreshold: 0.15,
        weights: { tests: 0.60, lint: 0.15, diff: 0.15, time: 0.10 }
      });

      expect(customDetector.degradationThreshold).toBe(0.15);
      expect(customDetector.weights.tests).toBe(0.60);
    });
  });

  describe('calculateQualityScore', () => {
    it('should calculate quality score with all metrics', async () => {
      const metrics = {
        iteration: 1,
        testPassRate: 0.95,
        lintErrorCount: 2,
        lintErrorMax: 10,
        diffSize: 50,
        diffSizeBaseline: 50,
        executionTimeMs: 5000,
        executionTimeMax: 30000
      };

      const result = await detector.calculateQualityScore('task-01', metrics);

      expect(result.taskId).toBe('task-01');
      expect(result.iteration).toBe(1);
      expect(result.scores.composite).toBeDefined();
      expect(result.scores.test).toBeDefined();
      expect(result.scores.lint).toBeDefined();
      expect(result.scores.diff).toBeDefined();
      expect(result.scores.time).toBeDefined();
    });

    it('should weight tests at 50%', async () => {
      const metrics = {
        iteration: 1,
        testPassRate: 1.0,
        lintErrorCount: 10,
        lintErrorMax: 10,
        diffSize: 100,
        diffSizeBaseline: 100,
        executionTimeMs: 30000,
        executionTimeMax: 30000
      };

      const result = await detector.calculateQualityScore('task-02', metrics);

      // With perfect tests (100) and poor other metrics, composite should be ~50
      expect(result.scores.test).toBe(100);
      expect(result.scores.composite).toBeLessThan(80);
      expect(result.scores.composite).toBeGreaterThan(40);
    });

    it('should handle perfect scores', async () => {
      const metrics = {
        iteration: 1,
        testPassRate: 1.0,
        lintErrorCount: 0,
        lintErrorMax: 10,
        diffSize: 50,
        diffSizeBaseline: 50,
        executionTimeMs: 5000,
        executionTimeMax: 30000
      };

      const result = await detector.calculateQualityScore('task-03', metrics);

      expect(result.scores.composite).toBe(100);
    });

    it('should handle poor scores', async () => {
      const metrics = {
        iteration: 1,
        testPassRate: 0.5,
        lintErrorCount: 15,
        lintErrorMax: 10,
        diffSize: 200,
        diffSizeBaseline: 50,
        executionTimeMs: 50000,
        executionTimeMax: 30000
      };

      const result = await detector.calculateQualityScore('task-04', metrics);

      expect(result.scores.composite).toBeLessThan(50);
    });

    it('should persist quality data to file', async () => {
      const metrics = {
        iteration: 1,
        testPassRate: 0.90,
        lintErrorCount: 3,
        lintErrorMax: 10,
        diffSize: 50,
        diffSizeBaseline: 50,
        executionTimeMs: 5000,
        executionTimeMax: 30000
      };

      await detector.calculateQualityScore('task-05', metrics);

      const qualityFile = path.join(tempDir, 'task_05-QUALITY.json');
      expect(fs.existsSync(qualityFile)).toBe(true);

      const data = JSON.parse(fs.readFileSync(qualityFile, 'utf8'));
      expect(data.taskId).toBe('task-05');
      expect(data.history).toHaveLength(1);
    });

    it('should track multiple iterations', async () => {
      await detector.calculateQualityScore('task-06', {
        iteration: 1,
        testPassRate: 0.90,
        lintErrorCount: 3,
        lintErrorMax: 10,
        diffSize: 50,
        diffSizeBaseline: 50,
        executionTimeMs: 5000,
        executionTimeMax: 30000
      });

      await detector.calculateQualityScore('task-06', {
        iteration: 2,
        testPassRate: 0.95,
        lintErrorCount: 1,
        lintErrorMax: 10,
        diffSize: 50,
        diffSizeBaseline: 50,
        executionTimeMs: 4000,
        executionTimeMax: 30000
      });

      const history = await detector.getQualityHistory('task-06');
      expect(history).toHaveLength(2);
      expect(history[0].iteration).toBe(1);
      expect(history[1].iteration).toBe(2);
    });
  });

  describe('detectDegradation', () => {
    it('should return insufficient history for single iteration', async () => {
      await detector.calculateQualityScore('task-01', {
        iteration: 1,
        testPassRate: 0.90,
        lintErrorCount: 3,
        lintErrorMax: 10,
        diffSize: 50,
        diffSizeBaseline: 50,
        executionTimeMs: 5000,
        executionTimeMax: 30000
      });

      const analysis = await detector.detectDegradation('task-01');

      expect(analysis.isDegraded).toBe(false);
      expect(analysis.reason).toContain('Insufficient history');
    });

    it('should detect degradation when score drops 20% from peak', async () => {
      // Peak iteration
      await detector.calculateQualityScore('task-02', {
        iteration: 1,
        testPassRate: 1.0,
        lintErrorCount: 0,
        lintErrorMax: 10,
        diffSize: 50,
        diffSizeBaseline: 50,
        executionTimeMs: 5000,
        executionTimeMax: 30000
      });

      // Degraded iteration (test pass rate drops to 60%)
      await detector.calculateQualityScore('task-02', {
        iteration: 2,
        testPassRate: 0.60,
        lintErrorCount: 5,
        lintErrorMax: 10,
        diffSize: 100,
        diffSizeBaseline: 50,
        executionTimeMs: 10000,
        executionTimeMax: 30000
      });

      const analysis = await detector.detectDegradation('task-02');

      expect(analysis.isDegraded).toBe(true);
      expect(analysis.peakScore).toBe(100);
      expect(analysis.currentScore).toBeLessThan(80);
      expect(analysis.dropFromPeak).toBeGreaterThanOrEqual(20);
      expect(analysis.recommendation).toBe('EXIT_EARLY');
    });

    it('should not detect degradation when score is stable', async () => {
      await detector.calculateQualityScore('task-03', {
        iteration: 1,
        testPassRate: 0.90,
        lintErrorCount: 2,
        lintErrorMax: 10,
        diffSize: 50,
        diffSizeBaseline: 50,
        executionTimeMs: 5000,
        executionTimeMax: 30000
      });

      await detector.calculateQualityScore('task-03', {
        iteration: 2,
        testPassRate: 0.88,
        lintErrorCount: 3,
        lintErrorMax: 10,
        diffSize: 55,
        diffSizeBaseline: 50,
        executionTimeMs: 5500,
        executionTimeMax: 30000
      });

      const analysis = await detector.detectDegradation('task-03');

      expect(analysis.isDegraded).toBe(false);
      expect(analysis.recommendation).toBe('CONTINUE');
    });

    it('should identify degraded metrics', async () => {
      await detector.calculateQualityScore('task-04', {
        iteration: 1,
        testPassRate: 1.0,
        lintErrorCount: 0,
        lintErrorMax: 10,
        diffSize: 50,
        diffSizeBaseline: 50,
        executionTimeMs: 5000,
        executionTimeMax: 30000
      });

      await detector.calculateQualityScore('task-04', {
        iteration: 2,
        testPassRate: 0.70,
        lintErrorCount: 8,
        lintErrorMax: 10,
        diffSize: 50,
        diffSizeBaseline: 50,
        executionTimeMs: 5000,
        executionTimeMax: 30000
      });

      const analysis = await detector.detectDegradation('task-04');

      expect(analysis.degradedMetrics).toContain('test_pass_rate');
      expect(analysis.degradedMetrics).toContain('lint_errors');
    });

    it('should track peak iteration correctly', async () => {
      // Iteration 1: score ~70
      await detector.calculateQualityScore('task-05', {
        iteration: 1,
        testPassRate: 0.70,
        lintErrorCount: 3,
        lintErrorMax: 10,
        diffSize: 50,
        diffSizeBaseline: 50,
        executionTimeMs: 5000,
        executionTimeMax: 30000
      });

      // Iteration 2: score 100 (peak)
      await detector.calculateQualityScore('task-05', {
        iteration: 2,
        testPassRate: 1.0,
        lintErrorCount: 0,
        lintErrorMax: 10,
        diffSize: 50,
        diffSizeBaseline: 50,
        executionTimeMs: 5000,
        executionTimeMax: 30000
      });

      // Iteration 3: score drops
      await detector.calculateQualityScore('task-05', {
        iteration: 3,
        testPassRate: 0.70,
        lintErrorCount: 3,
        lintErrorMax: 10,
        diffSize: 50,
        diffSizeBaseline: 50,
        executionTimeMs: 5000,
        executionTimeMax: 30000
      });

      const analysis = await detector.detectDegradation('task-05');

      expect(analysis.peakIteration).toBe(2);
      expect(analysis.currentIteration).toBe(3);
      expect(analysis.isDegraded).toBe(true);
    });
  });

  describe('shouldExitEarly', () => {
    it('should return false for single iteration', async () => {
      await detector.calculateQualityScore('task-01', {
        iteration: 1,
        testPassRate: 0.50,
        lintErrorCount: 5,
        lintErrorMax: 10,
        diffSize: 50,
        diffSizeBaseline: 50,
        executionTimeMs: 5000,
        executionTimeMax: 30000
      });

      const shouldExit = await detector.shouldExitEarly('task-01');
      expect(shouldExit).toBe(false);
    });

    it('should return true when quality degraded', async () => {
      await detector.calculateQualityScore('task-02', {
        iteration: 1,
        testPassRate: 1.0,
        lintErrorCount: 0,
        lintErrorMax: 10,
        diffSize: 50,
        diffSizeBaseline: 50,
        executionTimeMs: 5000,
        executionTimeMax: 30000
      });

      await detector.calculateQualityScore('task-02', {
        iteration: 2,
        testPassRate: 0.50,
        lintErrorCount: 8,
        lintErrorMax: 10,
        diffSize: 150,
        diffSizeBaseline: 50,
        executionTimeMs: 20000,
        executionTimeMax: 30000
      });

      const shouldExit = await detector.shouldExitEarly('task-02');
      expect(shouldExit).toBe(true);
    });

    it('should return false when quality stable', async () => {
      await detector.calculateQualityScore('task-03', {
        iteration: 1,
        testPassRate: 0.85,
        lintErrorCount: 2,
        lintErrorMax: 10,
        diffSize: 50,
        diffSizeBaseline: 50,
        executionTimeMs: 5000,
        executionTimeMax: 30000
      });

      await detector.calculateQualityScore('task-03', {
        iteration: 2,
        testPassRate: 0.83,
        lintErrorCount: 3,
        lintErrorMax: 10,
        diffSize: 55,
        diffSizeBaseline: 50,
        executionTimeMs: 5500,
        executionTimeMax: 30000
      });

      const shouldExit = await detector.shouldExitEarly('task-03');
      expect(shouldExit).toBe(false);
    });
  });

  describe('flagForReview', () => {
    it('should flag task for human review', async () => {
      const flag = await detector.flagForReview('task-01', 'Quality degradation detected');

      expect(flag.taskId).toBe('task-01');
      expect(flag.reason).toBe('Quality degradation detected');
      expect(flag.status).toBe('pending_review');
      expect(flag.flagged_by).toBe('quality-detector');
    });

    it('should include quality score in flag', async () => {
      await detector.calculateQualityScore('task-02', {
        iteration: 1,
        testPassRate: 0.60,
        lintErrorCount: 5,
        lintErrorMax: 10,
        diffSize: 100,
        diffSizeBaseline: 50,
        executionTimeMs: 10000,
        executionTimeMax: 30000
      });

      const flag = await detector.flagForReview('task-02', 'Low quality score');

      expect(flag.qualityScore).toBeDefined();
      expect(flag.iterationCount).toBe(1);
    });

    it('should persist flag to FLAGS.json', async () => {
      await detector.flagForReview('task-03', 'Test flag');

      const flagFile = path.join(tempDir, 'FLAGS.json');
      expect(fs.existsSync(flagFile)).toBe(true);

      const data = JSON.parse(fs.readFileSync(flagFile, 'utf8'));
      expect(data.flags).toBeDefined();
      expect(data.flags.length).toBeGreaterThan(0);
      expect(data.flags[0].taskId).toBe('task-03');
    });

    it('should accept additional context', async () => {
      const flag = await detector.flagForReview('task-04', 'Test reason', {
        customField: 'customValue',
        severity: 'high'
      });

      expect(flag.context.customField).toBe('customValue');
      expect(flag.context.severity).toBe('high');
    });
  });

  describe('getFlaggedTasks', () => {
    it('should return all flagged tasks', async () => {
      await detector.flagForReview('task-01', 'Reason 1');
      await detector.flagForReview('task-02', 'Reason 2');

      const flagged = await detector.getFlaggedTasks();

      expect(flagged.length).toBe(2);
      expect(flagged.map(f => f.taskId)).toEqual(expect.arrayContaining(['task-01', 'task-02']));
    });

    it('should return empty array when no flags', async () => {
      const flagged = await detector.getFlaggedTasks();
      expect(flagged).toEqual([]);
    });
  });

  describe('clearFlag', () => {
    it('should clear flag after review', async () => {
      await detector.flagForReview('task-01', 'Test reason');

      await detector.clearFlag('task-01');

      const flagged = await detector.getFlaggedTasks();
      expect(flagged.find(f => f.taskId === 'task-01').status).toBe('resolved');
    });

    it('should add resolvedAt timestamp', async () => {
      await detector.flagForReview('task-02', 'Test reason');
      await detector.clearFlag('task-02');

      const flagged = await detector.getFlaggedTasks();
      expect(flagged.find(f => f.taskId === 'task-02').resolvedAt).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return summary statistics', async () => {
      await detector.calculateQualityScore('task-01', {
        iteration: 1,
        testPassRate: 0.90,
        lintErrorCount: 2,
        lintErrorMax: 10,
        diffSize: 50,
        diffSizeBaseline: 50,
        executionTimeMs: 5000,
        executionTimeMax: 30000
      });

      await detector.calculateQualityScore('task-02', {
        iteration: 1,
        testPassRate: 0.80,
        lintErrorCount: 3,
        lintErrorMax: 10,
        diffSize: 60,
        diffSizeBaseline: 50,
        executionTimeMs: 6000,
        executionTimeMax: 30000
      });

      await detector.flagForReview('task-03', 'Test flag');

      const stats = await detector.getStats();

      expect(stats.totalTasks).toBe(2);
      expect(stats.totalIterations).toBe(2);
      expect(stats.flaggedTasks).toBe(1);
      expect(stats.averageQualityScore).toBeGreaterThan(0);
      expect(stats.degradationThreshold).toBe(20);
    });
  });

  describe('metric score calculations', () => {
    describe('_calculateTestScore', () => {
      it('should return 100 for perfect pass rate', () => {
        const score = detector._calculateTestScore(1.0);
        expect(score).toBe(100);
      });

      it('should return 0 for zero pass rate', () => {
        const score = detector._calculateTestScore(0);
        expect(score).toBe(0);
      });

      it('should scale linearly', () => {
        expect(detector._calculateTestScore(0.5)).toBe(50);
        expect(detector._calculateTestScore(0.75)).toBe(75);
      });
    });

    describe('_calculateLintScore', () => {
      it('should return 100 for zero errors', () => {
        const score = detector._calculateLintScore(0, 10);
        expect(score).toBe(100);
      });

      it('should return 0 for max errors', () => {
        const score = detector._calculateLintScore(10, 10);
        expect(score).toBe(0);
      });

      it('should scale based on error ratio', () => {
        const score = detector._calculateLintScore(5, 10);
        expect(score).toBe(50);
      });
    });

    describe('_calculateDiffScore', () => {
      it('should return 100 when diff equals baseline', () => {
        const score = detector._calculateDiffScore(50, 50);
        expect(score).toBe(100);
      });

      it('should return 100 when diff is smaller than baseline', () => {
        const score = detector._calculateDiffScore(25, 50);
        expect(score).toBe(100);
      });

      it('should decrease as diff grows beyond baseline', () => {
        const score = detector._calculateDiffScore(150, 50);
        expect(score).toBeLessThan(100);
      });

      it('should return 0 when diff is 3x baseline', () => {
        const score = detector._calculateDiffScore(150, 50);
        expect(score).toBe(0);
      });
    });

    describe('_calculateTimeScore', () => {
      it('should return 100 for fast execution', () => {
        const score = detector._calculateTimeScore(5000, 30000);
        expect(score).toBe(100);
      });

      it('should decrease as time increases', () => {
        const score1 = detector._calculateTimeScore(10000, 30000);
        const score2 = detector._calculateTimeScore(20000, 30000);
        expect(score1).toBeGreaterThan(score2);
      });

      it('should return 0 for very slow execution', () => {
        const score = detector._calculateTimeScore(50000, 30000);
        expect(score).toBe(0);
      });
    });
  });

  describe('integration: quality monitoring workflow', () => {
    it('should support complete quality monitoring with early exit', async () => {
      const taskId = 'integration-task';

      // Simulate revision iterations with quality tracking
      const iterations = [
        { testPassRate: 0.70, lintErrorCount: 5, diffSize: 100, executionTimeMs: 8000 },
        { testPassRate: 0.85, lintErrorCount: 2, diffSize: 60, executionTimeMs: 6000 },
        { testPassRate: 0.95, lintErrorCount: 0, diffSize: 50, executionTimeMs: 5000 },
        { testPassRate: 0.60, lintErrorCount: 8, diffSize: 150, executionTimeMs: 15000 }
      ];

      for (let i = 0; i < iterations.length; i++) {
        await detector.calculateQualityScore(taskId, {
          iteration: i + 1,
          ...iterations[i],
          lintErrorMax: 10,
          diffSizeBaseline: 50,
          executionTimeMax: 30000
        });
      }

      // Check for degradation
      const analysis = await detector.detectDegradation(taskId);

      expect(analysis.peakIteration).toBe(3);
      expect(analysis.currentIteration).toBe(4);
      expect(analysis.isDegraded).toBe(true);

      // Should exit early
      const shouldExit = await detector.shouldExitEarly(taskId);
      expect(shouldExit).toBe(true);

      // Flag for review
      const flag = await detector.flagForReview(taskId, 'Quality degraded from peak');
      expect(flag.status).toBe('pending_review');
    });
  });

  describe('custom threshold', () => {
    it('should use custom degradation threshold', async () => {
      const strictDetector = new QualityDetector({
        degradationThreshold: 0.10, // 10% threshold
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
        testPassRate: 0.88, // 12% drop
        lintErrorCount: 2,
        lintErrorMax: 10,
        diffSize: 60,
        diffSizeBaseline: 50,
        executionTimeMs: 6000,
        executionTimeMax: 30000
      });

      const analysis = await strictDetector.detectDegradation('task-01');

      // With 10% threshold, 12% drop should trigger
      expect(analysis.isDegraded).toBe(true);
    });
  });
});
