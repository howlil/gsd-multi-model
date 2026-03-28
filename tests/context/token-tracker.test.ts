/**
 * TokenTracker Tests
 *
 * Tests for the TokenTracker class including:
 * - Constructor and configuration
 * - logUsage method (append to metrics.json)
 * - getPhaseSummary method (aggregation, filtering)
 * - Budget violation detection
 * - File I/O operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenTracker } from '../../bin/lib/context/token-tracker.js';
import type { TokenUsage } from '../../bin/lib/context/token-tracker.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('TokenTracker', () => {
  let tracker: TokenTracker;
  const testMetricsPath = '.planning/metrics.test.json';

  beforeEach(async () => {
    tracker = new TokenTracker(testMetricsPath);
    // Clean up test file before each test
    try {
      await fs.unlink(testMetricsPath);
    } catch {
      // File doesn't exist yet - that's ok
    }
  });

  afterEach(async () => {
    // Clean up test file after each test
    try {
      await fs.unlink(testMetricsPath);
    } catch {
      // File doesn't exist - that's ok
    }
  });

  describe('Constructor', () => {
    it('should create instance with default path', () => {
      const defaultTracker = new TokenTracker();
      expect(defaultTracker).toBeDefined();
    });

    it('should accept custom metrics path', () => {
      const customTracker = new TokenTracker('.planning/custom-metrics.json');
      expect(customTracker).toBeDefined();
    });
  });

  describe('logUsage', () => {
    it('should append token usage to metrics.json', async () => {
      const usage: TokenUsage = {
        phase: 7,
        plan: 1,
        task: 'Implement context slicer',
        tokensUsed: 7200,
        budget: 8000,
        timestamp: new Date().toISOString()
      };

      await tracker.logUsage(usage);

      const content = await fs.readFile(testMetricsPath, 'utf-8');
      const metrics = JSON.parse(content);

      expect(metrics.tokenUsage).toBeDefined();
      expect(Array.isArray(metrics.tokenUsage)).toBe(true);
      expect(metrics.tokenUsage.length).toBe(1);
      expect(metrics.tokenUsage[0].phase).toBe(7);
      expect(metrics.tokenUsage[0].task).toBe('Implement context slicer');
    });

    it('should append multiple usage records', async () => {
      const usage1: TokenUsage = {
        phase: 7,
        plan: 1,
        task: 'Task 1',
        tokensUsed: 7000,
        budget: 8000,
        timestamp: new Date().toISOString()
      };

      const usage2: TokenUsage = {
        phase: 7,
        plan: 1,
        task: 'Task 2',
        tokensUsed: 7500,
        budget: 8000,
        timestamp: new Date().toISOString()
      };

      await tracker.logUsage(usage1);
      await tracker.logUsage(usage2);

      const content = await fs.readFile(testMetricsPath, 'utf-8');
      const metrics = JSON.parse(content);

      expect(metrics.tokenUsage.length).toBe(2);
      expect(metrics.tokenUsage[0].task).toBe('Task 1');
      expect(metrics.tokenUsage[1].task).toBe('Task 2');
    });

    it('should create tokenUsage array if not exists', async () => {
      // First, create a metrics file without tokenUsage
      const initialMetrics = {
        milestone: 'v5.0.0',
        started_at: new Date().toISOString(),
        budget: { ceiling: 50.00, alert_threshold: 0.8, projected: 0.00, spent: 0.00 },
        phases: {},
        cumulative: { total_tokens: 0, total_cost_usd: 0.00, by_provider: {} }
      };

      await fs.writeFile(testMetricsPath, JSON.stringify(initialMetrics, null, 2));

      const usage: TokenUsage = {
        phase: 7,
        plan: 1,
        task: 'Test task',
        tokensUsed: 5000,
        budget: 8000,
        timestamp: new Date().toISOString()
      };

      await tracker.logUsage(usage);

      const content = await fs.readFile(testMetricsPath, 'utf-8');
      const metrics = JSON.parse(content);

      expect(metrics.tokenUsage).toBeDefined();
      expect(metrics.tokenUsage.length).toBe(1);
    });
  });

  describe('getPhaseSummary', () => {
    it('should return phase token summary', async () => {
      const usage1: TokenUsage = {
        phase: 7,
        plan: 1,
        task: 'Task 1',
        tokensUsed: 7000,
        budget: 8000,
        timestamp: new Date().toISOString()
      };

      const usage2: TokenUsage = {
        phase: 7,
        plan: 1,
        task: 'Task 2',
        tokensUsed: 7500,
        budget: 8000,
        timestamp: new Date().toISOString()
      };

      await tracker.logUsage(usage1);
      await tracker.logUsage(usage2);

      const summary = await tracker.getPhaseSummary(7);

      expect(summary.phase).toBe(7);
      expect(summary.totalTokens).toBe(14500);
      expect(summary.taskCount).toBe(2);
      expect(summary.averagePerTask).toBe(7250);
    });

    it('should return zero summary for phase with no usage', async () => {
      const summary = await tracker.getPhaseSummary(99);

      expect(summary.phase).toBe(99);
      expect(summary.totalTokens).toBe(0);
      expect(summary.taskCount).toBe(0);
      expect(summary.averagePerTask).toBe(0);
      expect(summary.budgetViolations).toBe(0);
    });

    it('should filter by phase number', async () => {
      const usage7: TokenUsage = {
        phase: 7,
        plan: 1,
        task: 'Phase 7 Task',
        tokensUsed: 7000,
        budget: 8000,
        timestamp: new Date().toISOString()
      };

      const usage8: TokenUsage = {
        phase: 8,
        plan: 1,
        task: 'Phase 8 Task',
        tokensUsed: 8000,
        budget: 9000,
        timestamp: new Date().toISOString()
      };

      await tracker.logUsage(usage7);
      await tracker.logUsage(usage8);

      const summary7 = await tracker.getPhaseSummary(7);
      const summary8 = await tracker.getPhaseSummary(8);

      expect(summary7.totalTokens).toBe(7000);
      expect(summary8.totalTokens).toBe(8000);
    });
  });

  describe('Budget Violation Detection', () => {
    it('should detect budget violations', async () => {
      const usage: TokenUsage = {
        phase: 7,
        plan: 1,
        task: 'Over budget task',
        tokensUsed: 9000,
        budget: 8000,
        timestamp: new Date().toISOString()
      };

      await tracker.logUsage(usage);

      const summary = await tracker.getPhaseSummary(7);

      expect(summary.budgetViolations).toBe(1);
    });

    it('should not count tasks within budget as violations', async () => {
      const usage: TokenUsage = {
        phase: 7,
        plan: 1,
        task: 'Within budget task',
        tokensUsed: 7000,
        budget: 8000,
        timestamp: new Date().toISOString()
      };

      await tracker.logUsage(usage);

      const summary = await tracker.getPhaseSummary(7);

      expect(summary.budgetViolations).toBe(0);
    });

    it('should count multiple violations', async () => {
      const usage1: TokenUsage = {
        phase: 7,
        plan: 1,
        task: 'Over budget 1',
        tokensUsed: 9000,
        budget: 8000,
        timestamp: new Date().toISOString()
      };

      const usage2: TokenUsage = {
        phase: 7,
        plan: 1,
        task: 'Over budget 2',
        tokensUsed: 10000,
        budget: 8000,
        timestamp: new Date().toISOString()
      };

      await tracker.logUsage(usage1);
      await tracker.logUsage(usage2);

      const summary = await tracker.getPhaseSummary(7);

      expect(summary.budgetViolations).toBe(2);
    });
  });

  describe('isBudgetViolated', () => {
    it('should return true when tokensUsed > budget', () => {
      const usage: TokenUsage = {
        phase: 7,
        plan: 1,
        task: 'Test',
        tokensUsed: 9000,
        budget: 8000,
        timestamp: new Date().toISOString()
      };

      expect(tracker.isBudgetViolated(usage)).toBe(true);
    });

    it('should return false when tokensUsed <= budget', () => {
      const usage: TokenUsage = {
        phase: 7,
        plan: 1,
        task: 'Test',
        tokensUsed: 7000,
        budget: 8000,
        timestamp: new Date().toISOString()
      };

      expect(tracker.isBudgetViolated(usage)).toBe(false);
    });
  });

  describe('getAllUsage', () => {
    it('should return all token usage records', async () => {
      const usage1: TokenUsage = {
        phase: 7,
        plan: 1,
        task: 'Task 1',
        tokensUsed: 7000,
        budget: 8000,
        timestamp: new Date().toISOString()
      };

      const usage2: TokenUsage = {
        phase: 8,
        plan: 1,
        task: 'Task 2',
        tokensUsed: 8000,
        budget: 9000,
        timestamp: new Date().toISOString()
      };

      await tracker.logUsage(usage1);
      await tracker.logUsage(usage2);

      const allUsage = await tracker.getAllUsage();

      expect(allUsage.length).toBe(2);
      expect(allUsage[0].phase).toBe(7);
      expect(allUsage[1].phase).toBe(8);
    });
  });

  describe('getUsageByPhase', () => {
    it('should return usage records filtered by phase', async () => {
      const usage7a: TokenUsage = {
        phase: 7,
        plan: 1,
        task: 'Task 1',
        tokensUsed: 7000,
        budget: 8000,
        timestamp: new Date().toISOString()
      };

      const usage7b: TokenUsage = {
        phase: 7,
        plan: 1,
        task: 'Task 2',
        tokensUsed: 7500,
        budget: 8000,
        timestamp: new Date().toISOString()
      };

      const usage8: TokenUsage = {
        phase: 8,
        plan: 1,
        task: 'Task 3',
        tokensUsed: 8000,
        budget: 9000,
        timestamp: new Date().toISOString()
      };

      await tracker.logUsage(usage7a);
      await tracker.logUsage(usage7b);
      await tracker.logUsage(usage8);

      const phase7Usage = await tracker.getUsageByPhase(7);

      expect(phase7Usage.length).toBe(2);
      expect(phase7Usage.every(u => u.phase === 7)).toBe(true);
    });
  });

  /**
   * Wave 2 Tests - Phase 43.2
   * Task 43.2-1: Compression Statistics (CTX-10)
   */
  describe('Wave 2: Compression Statistics Logging (CTX-10)', () => {
    it('should log compression statistics to metrics.json', async () => {
      const stats = {
        totalTokens: 5000,
        originalTokens: 8000,
        compressedTokens: 5000,
        reductionPercentage: 0.375,
        filesIncluded: 10,
        filesExcluded: 5,
        summarizedCount: 3,
        prunedCount: 5,
        cacheHits: 2,
        cacheMisses: 1,
        compressionRatio: 0.625,
        qualityScore: 0.85,
        budgetUsed: 5000,
        budgetRemaining: 3000,
        breakdown: {
          hot: { tokens: 3500, files: 7 },
          warm: { tokens: 1000, files: 2 },
          cold: { tokens: 500, files: 1 }
        }
      };

      await tracker.logCompressionStats(stats);

      const content = await fs.readFile(testMetricsPath, 'utf-8');
      const metrics = JSON.parse(content);

      expect(metrics.compressionStats).toBeDefined();
      expect(Array.isArray(metrics.compressionStats)).toBe(true);
      expect(metrics.compressionStats.length).toBe(1);
      expect(metrics.compressionStats[0].totalTokens).toBe(5000);
      expect(metrics.compressionStats[0].timestamp).toBeDefined();
    });

    it('should append multiple compression statistics records', async () => {
      const stats1 = {
        totalTokens: 5000,
        originalTokens: 8000,
        compressedTokens: 5000,
        reductionPercentage: 0.375,
        filesIncluded: 10,
        filesExcluded: 5,
        summarizedCount: 3,
        prunedCount: 5,
        cacheHits: 2,
        cacheMisses: 1,
        compressionRatio: 0.625,
        qualityScore: 0.85,
        budgetUsed: 5000,
        budgetRemaining: 3000,
        breakdown: {
          hot: { tokens: 3500, files: 7 },
          warm: { tokens: 1000, files: 2 },
          cold: { tokens: 500, files: 1 }
        }
      };

      const stats2 = {
        totalTokens: 6000,
        originalTokens: 9000,
        compressedTokens: 6000,
        reductionPercentage: 0.333,
        filesIncluded: 12,
        filesExcluded: 3,
        summarizedCount: 4,
        prunedCount: 3,
        cacheHits: 1,
        cacheMisses: 2,
        compressionRatio: 0.667,
        qualityScore: 0.9,
        budgetUsed: 6000,
        budgetRemaining: 2000,
        breakdown: {
          hot: { tokens: 4200, files: 8 },
          warm: { tokens: 1200, files: 3 },
          cold: { tokens: 600, files: 1 }
        }
      };

      await tracker.logCompressionStats(stats1);
      await tracker.logCompressionStats(stats2);

      const content = await fs.readFile(testMetricsPath, 'utf-8');
      const metrics = JSON.parse(content);

      expect(metrics.compressionStats.length).toBe(2);
      expect(metrics.compressionStats[0].totalTokens).toBe(5000);
      expect(metrics.compressionStats[1].totalTokens).toBe(6000);
    });

    it('should include timestamp in compression stats record', async () => {
      const beforeTime = Date.now();

      const stats = {
        totalTokens: 5000,
        originalTokens: 8000,
        compressedTokens: 5000,
        reductionPercentage: 0.375,
        filesIncluded: 10,
        filesExcluded: 5,
        summarizedCount: 3,
        prunedCount: 5,
        cacheHits: 2,
        cacheMisses: 1,
        compressionRatio: 0.625,
        qualityScore: 0.85,
        budgetUsed: 5000,
        budgetRemaining: 3000,
        breakdown: {
          hot: { tokens: 3500, files: 7 },
          warm: { tokens: 1000, files: 2 },
          cold: { tokens: 500, files: 1 }
        }
      };

      await tracker.logCompressionStats(stats);

      const content = await fs.readFile(testMetricsPath, 'utf-8');
      const metrics = JSON.parse(content);
      const timestamp = new Date(metrics.compressionStats[0].timestamp).getTime();

      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should get compression stats by phase', async () => {
      const stats = {
        totalTokens: 5000,
        originalTokens: 8000,
        compressedTokens: 5000,
        reductionPercentage: 0.375,
        filesIncluded: 10,
        filesExcluded: 5,
        summarizedCount: 3,
        prunedCount: 5,
        cacheHits: 2,
        cacheMisses: 1,
        compressionRatio: 0.625,
        qualityScore: 0.85,
        budgetUsed: 5000,
        budgetRemaining: 3000,
        breakdown: {
          hot: { tokens: 3500, files: 7 },
          warm: { tokens: 1000, files: 2 },
          cold: { tokens: 500, files: 1 }
        }
      };

      await tracker.logCompressionStats(stats);

      const compressionStats = await tracker.getCompressionStatsByPhase(43);

      expect(compressionStats).toBeDefined();
      expect(Array.isArray(compressionStats)).toBe(true);
      expect(compressionStats.length).toBe(1);
    });
  });
});
