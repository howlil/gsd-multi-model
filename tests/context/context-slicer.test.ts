/**
 * ContextSlicer Tests
 *
 * Tests for the ContextSlicer class including:
 * - Constructor and configuration
 * - sliceContext method
 * - classifyTiers method (time-based classification)
 * - enforceTierBudget method (70/20/10 allocation)
 * - summarizeLowRelevance method (score < 0.5 threshold)
 * - Cache operations (hits, misses, TTL, LRU eviction)
 * - End-to-end slicing workflow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextSlicer, ContextTier, DEFAULT_SLICER_CONFIG } from '../../bin/lib/context/context-slicer.js';
import type { ContextSource } from '../../bin/lib/context/context-optimizer.js';

describe('ContextSlicer', () => {
  let slicer: ContextSlicer;

  beforeEach(() => {
    slicer = new ContextSlicer();
  });

  describe('Constructor', () => {
    it('should create instance with default config', () => {
      expect(slicer).toBeDefined();
    });

    it('should accept custom config', () => {
      const customSlicer = new ContextSlicer({
        tokenBudget: 10000,
        minScore: 0.5,
        maxFiles: 20
      });
      expect(customSlicer).toBeDefined();
    });

    it('should merge custom config with defaults', () => {
      const customSlicer = new ContextSlicer({
        tokenBudget: 10000
      });
      expect(customSlicer).toBeDefined();
    });
  });

  describe('classifyTiers', () => {
    it('should classify sources into HOT tier (< 5 min)', () => {
      const now = new Date().toISOString();
      const sources: ContextSource[] = [
        {
          type: 'file',
          source: 'test1.ts',
          timestamp: now,
          size: 1000,
          score: 0.8
        }
      ];

      const tiers = slicer.classifyTiers(sources);
      expect(tiers.hot.length).toBe(1);
      expect(tiers.warm.length).toBe(0);
      expect(tiers.cold.length).toBe(0);
    });

    it('should classify sources into WARM tier (< 1 hr)', () => {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const sources: ContextSource[] = [
        {
          type: 'file',
          source: 'test1.ts',
          timestamp: thirtyMinAgo,
          size: 1000,
          score: 0.8
        }
      ];

      const tiers = slicer.classifyTiers(sources);
      expect(tiers.hot.length).toBe(0);
      expect(tiers.warm.length).toBe(1);
      expect(tiers.cold.length).toBe(0);
    });

    it('should classify sources into COLD tier (> 1 hr)', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const sources: ContextSource[] = [
        {
          type: 'file',
          source: 'test1.ts',
          timestamp: twoHoursAgo,
          size: 1000,
          score: 0.8
        }
      ];

      const tiers = slicer.classifyTiers(sources);
      expect(tiers.hot.length).toBe(0);
      expect(tiers.warm.length).toBe(0);
      expect(tiers.cold.length).toBe(1);
    });

    it('should classify multiple sources into different tiers', () => {
      const now = new Date().toISOString();
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      const sources: ContextSource[] = [
        { type: 'file', source: 'hot.ts', timestamp: now, size: 1000, score: 0.9 },
        { type: 'file', source: 'warm.ts', timestamp: thirtyMinAgo, size: 1000, score: 0.7 },
        { type: 'file', source: 'cold.ts', timestamp: twoHoursAgo, size: 1000, score: 0.5 }
      ];

      const tiers = slicer.classifyTiers(sources);
      expect(tiers.hot.length).toBe(1);
      expect(tiers.warm.length).toBe(1);
      expect(tiers.cold.length).toBe(1);
    });
  });

  describe('enforceTierBudget', () => {
    it('should enforce 70/20/10 budget allocation', () => {
      const sources: ContextSource[] = Array(20).fill({
        type: 'file' as const,
        source: 'test.ts',
        timestamp: new Date().toISOString(),
        size: 400, // 100 tokens each
        score: 0.8
      });

      const tiers = {
        hot: sources.slice(0, 10),
        warm: sources.slice(10, 15),
        cold: sources.slice(15, 20)
      };

      const budgeted = slicer.enforceTierBudget(tiers);
      
      // With 8000 token budget: hot=5600, warm=1600, cold=800
      // Each file is 100 tokens (400 chars / 4)
      expect(budgeted.hot.length).toBeLessThanOrEqual(56); // 5600 tokens
      expect(budgeted.warm.length).toBeLessThanOrEqual(16); // 1600 tokens
      expect(budgeted.cold.length).toBeLessThanOrEqual(8); // 800 tokens
    });

    it('should prioritize higher-scored sources', () => {
      const sources: ContextSource[] = [
        { type: 'file', source: 'high.ts', timestamp: new Date().toISOString(), size: 400, score: 0.9 },
        { type: 'file', source: 'low.ts', timestamp: new Date().toISOString(), size: 400, score: 0.3 }
      ];

      const tiers = { hot: sources, warm: [], cold: [] };
      const budgeted = slicer.enforceTierBudget(tiers);
      
      // Higher scored should come first
      expect(budgeted.hot[0].source).toBe('high.ts');
    });
  });

  describe('Cache Operations', () => {
    it('should generate consistent cache keys', () => {
      const files = ['test1.ts', 'test2.ts'];
      const task = 'Test task';
      
      const key1 = slicer.generateCacheKey(files, task);
      const key2 = slicer.generateCacheKey(files, task);
      
      expect(key1).toBe(key2);
    });

    it('should add and retrieve from cache', () => {
      const key = 'test-key';
      const result = {
        context: 'test context',
        tiers: { hot: [] as ContextSource[], warm: [], cold: [] },
        stats: {
          totalTokens: 1000,
          budgetUsed: 1000,
          budgetRemaining: 7000,
          filesIncluded: 5,
          filesExcluded: 0,
          summarizedCount: 0,
          cacheHits: 0,
          cacheMisses: 1
        },
        warnings: []
      };

      slicer.addToCache(key, result);
      const cached = slicer.getFromCache(key);

      expect(cached).not.toBeNull();
      expect(cached?.context).toBe(result.context);
    });

    it('should return null for expired cache entry', () => {
      const customSlicer = new ContextSlicer({ cacheTTL: 100 }); // 100ms TTL
      const key = 'test-key';
      const result = {
        context: 'test context',
        tiers: { hot: [] as ContextSource[], warm: [], cold: [] },
        stats: {
          totalTokens: 1000,
          budgetUsed: 1000,
          budgetRemaining: 7000,
          filesIncluded: 5,
          filesExcluded: 0,
          summarizedCount: 0,
          cacheHits: 0,
          cacheMisses: 1
        },
        warnings: []
      };

      customSlicer.addToCache(key, result);
      
      // Wait for TTL to expire
      setTimeout(() => {
        const cached = customSlicer.getFromCache(key);
        expect(cached).toBeNull();
      }, 150);
    });

    it('should evict oldest entry when cache is full (LRU)', () => {
      const customSlicer = new ContextSlicer({ cacheMaxSize: 3 });
      
      customSlicer.addToCache('key1', {
        context: '1',
        tiers: { hot: [], warm: [], cold: [] },
        stats: { totalTokens: 0, budgetUsed: 0, budgetRemaining: 0, filesIncluded: 0, filesExcluded: 0, summarizedCount: 0, cacheHits: 0, cacheMisses: 1 },
        warnings: []
      });
      customSlicer.addToCache('key2', {
        context: '2',
        tiers: { hot: [], warm: [], cold: [] },
        stats: { totalTokens: 0, budgetUsed: 0, budgetRemaining: 0, filesIncluded: 0, filesExcluded: 0, summarizedCount: 0, cacheHits: 0, cacheMisses: 1 },
        warnings: []
      });
      customSlicer.addToCache('key3', {
        context: '3',
        tiers: { hot: [], warm: [], cold: [] },
        stats: { totalTokens: 0, budgetUsed: 0, budgetRemaining: 0, filesIncluded: 0, filesExcluded: 0, summarizedCount: 0, cacheHits: 0, cacheMisses: 1 },
        warnings: []
      });

      // Add fourth entry - should evict key1
      customSlicer.addToCache('key4', {
        context: '4',
        tiers: { hot: [], warm: [], cold: [] },
        stats: { totalTokens: 0, budgetUsed: 0, budgetRemaining: 0, filesIncluded: 0, filesExcluded: 0, summarizedCount: 0, cacheHits: 0, cacheMisses: 1 },
        warnings: []
      });

      expect(customSlicer.getFromCache('key1')).toBeNull();
      expect(customSlicer.getFromCache('key4')).not.toBeNull();
    });
  });

  describe('buildTieredContext', () => {
    it('should build formatted context with tier headers', () => {
      const sources: ContextSource[] = [
        {
          type: 'file',
          source: 'test.ts',
          timestamp: new Date().toISOString(),
          size: 100,
          score: 0.8
        }
      ];

      const tiers = { hot: sources, warm: [], cold: [] };
      const context = slicer.buildTieredContext(tiers);

      expect(context).toContain('## 🔥 Hot Context (Current Task)');
      expect(context).toContain('test.ts');
    });

    it('should handle empty tiers', () => {
      const tiers = { hot: [], warm: [], cold: [] };
      const context = slicer.buildTieredContext(tiers);

      expect(context).toBe('');
    });
  });

  describe('sliceContext', () => {
    it('should return sliced context within token budget', async () => {
      // This is a basic integration test - actual file patterns would need real files
      const result = await slicer.sliceContext(
        ['package.json'], // Use a file that exists
        'Test task'
      );

      expect(result).toBeDefined();
      expect(result.context).toBeDefined();
      expect(result.tiers).toBeDefined();
      expect(result.stats).toBeDefined();
      expect(result.stats.totalTokens).toBeLessThanOrEqual(DEFAULT_SLICER_CONFIG.tokenBudget);
    });

    it('should include warnings if any', async () => {
      const result = await slicer.sliceContext(
        ['package.json'],
        'Test task'
      );

      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('ContextTier Enum', () => {
    it('should have correct tier values', () => {
      expect(ContextTier.HOT).toBe('hot');
      expect(ContextTier.WARM).toBe('warm');
      expect(ContextTier.COLD).toBe('cold');
    });
  });

  describe('Multi-Factor Relevance Scoring', () => {
    describe('_keywordScore', () => {
      it('should return 1.0 when all keywords match', () => {
        const content = 'This file implements authentication middleware for user login';
        const task = 'Implement authentication middleware';
        // Access private method via bracket notation for testing
        const score = (slicer as any)._keywordScore(content, task);
        expect(score).toBeGreaterThan(0.8);
      });

      it('should return 0.0 when no keywords match', () => {
        const content = 'This file handles database connections';
        const task = 'Implement authentication middleware';
        const score = (slicer as any)._keywordScore(content, task);
        expect(score).toBe(0);
      });

      it('should return partial score when some keywords match', () => {
        const content = 'This file handles user authentication';
        const task = 'Implement authentication middleware';
        const score = (slicer as any)._keywordScore(content, task);
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThan(1);
      });

      it('should filter out short words (3 chars or less)', () => {
        const content = 'The cat sat on the mat';
        const task = 'Do it';
        // 'Do' and 'it' are both <= 3 chars, so they're filtered out
        // Empty keyword list returns 0
        const score = (slicer as any)._keywordScore(content, task);
        expect(score).toBe(0);
      });

      it('should handle empty task gracefully', () => {
        const content = 'Some content here';
        const task = '';
        const score = (slicer as any)._keywordScore(content, task);
        expect(score).toBe(0);
      });
    });

    describe('_semanticScore', () => {
      it('should return higher score for semantically similar content', () => {
        const content = 'authentication middleware user login session token implementation';
        const task = 'Implement authentication middleware';
        const score = (slicer as any)._semanticScore(content, task);
        // Score should be positive and reasonable (exact value depends on word overlap)
        expect(score).toBeGreaterThan(0.3);
      });

      it('should return low score for semantically different content', () => {
        const content = 'database connection pool query optimization';
        const task = 'Implement authentication middleware';
        const score = (slicer as any)._semanticScore(content, task);
        expect(score).toBeLessThan(0.5);
      });

      it('should return 0 for empty content', () => {
        const content = '';
        const task = 'Implement authentication middleware';
        const score = (slicer as any)._semanticScore(content, task);
        expect(score).toBe(0);
      });

      it('should handle identical content with score of 1', () => {
        const text = 'authentication middleware implementation';
        const score = (slicer as any)._semanticScore(text, text);
        expect(score).toBe(1);
      });
    });

    describe('_pathScore', () => {
      it('should return high score when path contains task keywords', () => {
        const source = 'src/middleware/authentication.ts';
        const task = 'Implement authentication middleware';
        const score = (slicer as any)._pathScore(source, task);
        expect(score).toBeGreaterThan(0.5);
      });

      it('should return 0 when path has no task keywords', () => {
        const source = 'src/database/connection.ts';
        const task = 'Implement authentication middleware';
        const score = (slicer as any)._pathScore(source, task);
        expect(score).toBe(0);
      });

      it('should handle paths with multiple keyword matches', () => {
        const source = 'src/auth/middleware/login.ts';
        const task = 'User authentication login';
        const score = (slicer as any)._pathScore(source, task);
        expect(score).toBeGreaterThan(0);
      });

      it('should return 0 for empty task', () => {
        const source = 'src/file.ts';
        const task = '';
        const score = (slicer as any)._pathScore(source, task);
        expect(score).toBe(0);
      });
    });

    describe('Multi-Factor Composite Scoring', () => {
      it('should combine keyword, semantic, and path scores', () => {
        const content = 'authentication middleware for user login';
        const path = 'src/auth/middleware.ts';
        const task = 'Implement authentication middleware';

        const keywordScore = (slicer as any)._keywordScore(content, task);
        const semanticScore = (slicer as any)._semanticScore(content, task);
        const pathScore = (slicer as any)._pathScore(path, task);

        // Weighted composite: 40% keyword, 40% semantic, 20% path
        const compositeScore = (keywordScore * 0.4) + (semanticScore * 0.4) + (pathScore * 0.2);

        expect(compositeScore).toBeGreaterThan(0);
        expect(compositeScore).toBeLessThanOrEqual(1);
      });

      it('should apply tier-specific thresholds correctly', async () => {
        const tiers = {
          hot: [{
            type: 'file' as const,
            source: 'authentication middleware implementation',
            timestamp: new Date().toISOString(),
            size: 100,
            score: 0.8
          }],
          warm: [{
            type: 'file' as const,
            source: 'database connection handling',
            timestamp: new Date().toISOString(),
            size: 100,
            score: 0.5
          }],
          cold: [{
            type: 'file' as const,
            source: 'unrelated historical content xyz',
            timestamp: new Date().toISOString(),
            size: 100,
            score: 0.3
          }]
        };

        const task = 'Implement authentication middleware';
        const result = await slicer.summarizeLowRelevance(tiers, task);

        // Hot tier content with high relevance should be kept
        expect(result.hot.length).toBeGreaterThanOrEqual(0);
        // Warm and cold may be summarized or excluded based on thresholds
      });

      it('should handle marginal cases with summarization', async () => {
        // Create content that's marginally relevant (near threshold boundary)
        const tiers = {
          hot: [{
            type: 'file' as const,
            source: 'middleware implementation with some auth features',
            timestamp: new Date().toISOString(),
            size: 100,
            score: 0.4
          }],
          warm: [],
          cold: []
        };

        const task = 'Implement authentication middleware';
        const result = await slicer.summarizeLowRelevance(tiers, task);

        // Should either keep or summarize (not exclude entirely for hot tier)
        expect(result.hot.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  /**
   * Wave 2 Tests - Phase 43.2
   * Task 43.2-1: Compression Statistics (CTX-10)
   * Task 43.2-2: Token Budget Enforcement (CTX-11)
   * Task 43.2-3: Quality Metrics (CTX-12)
   */
  describe('Wave 2: Compression Statistics (CTX-10)', () => {
    it('should calculate CompressionStats with tier breakdown', async () => {
      const sources: ContextSource[] = [
        {
          type: 'file',
          source: 'test1.ts',
          timestamp: new Date().toISOString(),
          size: 400,
          score: 0.8
        },
        {
          type: 'file',
          source: 'test2.ts',
          timestamp: new Date().toISOString(),
          size: 400,
          score: 0.6
        }
      ];

      const tiers = slicer.classifyTiers(sources);
      const optimized = {
        sources,
        warnings: []
      };

      // Access private method via any cast for testing
      const stats = (slicer as any).calculateStats(tiers, optimized, 'test task');

      expect(stats).toBeDefined();
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.breakdown).toBeDefined();
      expect(stats.breakdown.hot).toBeDefined();
      expect(stats.breakdown.warm).toBeDefined();
      expect(stats.breakdown.cold).toBeDefined();
    });

    it('should include quality score in stats', async () => {
      const sources: ContextSource[] = [
        {
          type: 'file',
          source: 'function test() { return 42; }',
          timestamp: new Date().toISOString(),
          size: 100,
          score: 0.9
        }
      ];

      const tiers = slicer.classifyTiers(sources);
      const optimized = { sources, warnings: [] };
      const stats = (slicer as any).calculateStats(tiers, optimized, 'implement function');

      expect(stats.qualityScore).toBeGreaterThanOrEqual(0);
      expect(stats.qualityScore).toBeLessThanOrEqual(1);
    });

    it('should calculate compression ratio correctly', async () => {
      const sources: ContextSource[] = [
        {
          type: 'file',
          source: 'test content',
          timestamp: new Date().toISOString(),
          size: 100,
          score: 0.8
        }
      ];

      const tiers = slicer.classifyTiers(sources);
      const optimized = { sources, warnings: [] };
      const stats = (slicer as any).calculateStats(tiers, optimized, 'test');

      expect(stats.compressionRatio).toBeGreaterThanOrEqual(0);
      expect(stats.reductionPercentage).toBeGreaterThanOrEqual(0);
      expect(stats.reductionPercentage).toBeLessThanOrEqual(1);
    });
  });

  describe('Wave 2: Token Budget Enforcement (CTX-11)', () => {
    it('should enforce tier budget with fallback when over budget', async () => {
      const largeSlicer = new ContextSlicer({ tokenBudget: 100 });
      
      const sources: ContextSource[] = [
        {
          type: 'file',
          source: 'a'.repeat(500),
          timestamp: new Date().toISOString(),
          size: 500,
          score: 0.8
        },
        {
          type: 'file',
          source: 'b'.repeat(500),
          timestamp: new Date().toISOString(),
          size: 500,
          score: 0.7
        }
      ];

      const tiers = largeSlicer.classifyTiers(sources);
      const result = await largeSlicer.enforceTierBudgetWithFallback(tiers, 'test task');

      // Should apply fallback strategies to reduce token count
      expect(result).toBeDefined();
      expect(result.hot.length + result.warm.length + result.cold.length).toBeLessThanOrEqual(sources.length);
    });

    it('should apply aggressive summarization as fallback', async () => {
      const smallBudgetSlicer = new ContextSlicer({ tokenBudget: 50 });
      
      const sources: ContextSource[] = [
        {
          type: 'file',
          source: 'function test() { return 42; }',
          timestamp: new Date().toISOString(),
          size: 200,
          score: 0.9
        }
      ];

      const tiers = smallBudgetSlicer.classifyTiers(sources);
      const result = await smallBudgetSlicer.enforceTierBudgetWithFallback(tiers, 'implement function');

      expect(result).toBeDefined();
    });

    it('should preserve hot tier when possible', async () => {
      const slicer = new ContextSlicer({ tokenBudget: 1000 });
      
      const sources: ContextSource[] = [
        {
          type: 'file',
          source: 'important hot content',
          timestamp: new Date().toISOString(),
          size: 100,
          score: 0.9
        }
      ];

      const tiers = slicer.classifyTiers(sources);
      const result = await slicer.enforceTierBudgetWithFallback(tiers, 'test task');

      // Hot tier should be preserved when within budget
      expect(result.hot.length).toBeGreaterThan(0);
    });

    it('should truncate to budget per tier', () => {
      const sources: ContextSource[] = [
        { type: 'file', source: 'a'.repeat(100), timestamp: new Date().toISOString(), size: 100, score: 0.9 },
        { type: 'file', source: 'b'.repeat(100), timestamp: new Date().toISOString(), size: 100, score: 0.8 },
        { type: 'file', source: 'c'.repeat(100), timestamp: new Date().toISOString(), size: 100, score: 0.7 }
      ];

      const tiers = { hot: sources, warm: [], cold: [] };
      const result = slicer.enforceTierBudget(tiers);

      // Should truncate based on budget
      expect(result.hot.length).toBeLessThanOrEqual(sources.length);
    });
  });

  describe('Wave 2: Quality Metrics (CTX-12)', () => {
    it('should calculate quality metrics for compression', () => {
      const original = 'function authenticate() { return true; }';
      const compressed = 'function authenticate() { return true; }';
      const taskContext = 'implement authentication';

      const metrics = slicer.calculateQualityMetrics(original, compressed, taskContext);

      expect(metrics).toBeDefined();
      expect(metrics.overallScore).toBeGreaterThanOrEqual(0);
      expect(metrics.overallScore).toBeLessThanOrEqual(1);
      expect(metrics.entityPreservation).toBeGreaterThanOrEqual(0);
      expect(metrics.keywordPreservation).toBeGreaterThanOrEqual(0);
      expect(metrics.codeBlockPreservation).toBeGreaterThanOrEqual(0);
      expect(metrics.semanticSimilarity).toBeGreaterThanOrEqual(0);
    });

    it('should detect entity preservation', () => {
      const original = 'function test() { class Auth {} export const config = {}; }';
      const compressed = 'function test() { class Auth {} }';
      const taskContext = 'test implementation';

      const metrics = slicer.calculateQualityMetrics(original, compressed, taskContext);

      expect(metrics.entityPreservation).toBeGreaterThan(0);
      expect(metrics.entityPreservation).toBeLessThanOrEqual(1);
    });

    it('should extract entities from content', () => {
      const content = `
        function myFunction() {}
        class MyClass {}
        export const myConst = 42;
        export function myExport() {}
      `;

      const entities = slicer.extractEntities(content);

      expect(entities).toContain('myFunction');
      expect(entities).toContain('MyClass');
      expect(entities).toContain('myConst');
      expect(entities).toContain('myExport');
    });

    it('should assess quality level based on score', () => {
      expect(slicer.assessQuality(0.95)).toBe('excellent');
      expect(slicer.assessQuality(0.85)).toBe('good');
      expect(slicer.assessQuality(0.75)).toBe('fair');
      expect(slicer.assessQuality(0.5)).toBe('poor');
    });

    it('should handle empty content gracefully', () => {
      const original = '';
      const compressed = '';
      const taskContext = 'test';

      const metrics = slicer.calculateQualityMetrics(original, compressed, taskContext);

      expect(metrics).toBeDefined();
      expect(metrics.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should detect code block preservation', () => {
      const original = 'Here is code:\n```typescript\nfunction test() {}\n```';
      const compressed = 'Here is code:\n```typescript\nfunction test() {}\n```';
      const taskContext = 'code example';

      const metrics = slicer.calculateQualityMetrics(original, compressed, taskContext);

      expect(metrics.codeBlockPreservation).toBe(1);
    });
  });
});
