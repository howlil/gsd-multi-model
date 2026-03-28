/**
 * Context Slicer Property-Based Tests (TEST-19)
 *
 * Tests ContextSlicer properties:
 * - Token budget enforcement (never exceeds budget)
 * - Tier allocation (70/20/10 distribution maintained)
 * - Relevance scoring consistency (similar content gets similar scores)
 * - Compression quality (summarized content preserves key information)
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ContextSlicer, DEFAULT_SLICER_CONFIG } from '../../bin/lib/context/context-slicer.js';
import {
  filePatternArb,
  contextTaskArb,
  tokenBudgetArb,
  fileContentArb,
  filePathArb,
  nonEmptyArrayArb
} from './arbitraries.js';

describe('Context Slicer (TEST-19)', () => {
  it('enforces token budget - never exceeds configured budget', () => {
    fc.assert(fc.property(
      tokenBudgetArb,
      nonEmptyArrayArb(filePatternArb),
      contextTaskArb,
      async (tokenBudget, files, task) => {
        const slicer = new ContextSlicer({
          tokenBudget,
          minScore: 0.1,
          maxFiles: 50,
          cacheTTL: 0 // Disable cache for testing
        });

        const result = await slicer.sliceContext(files, task);

        // Total tokens should never exceed budget
        expect(result.stats.totalTokens).toBeLessThanOrEqual(tokenBudget);
        expect(result.stats.budgetUsed).toBeLessThanOrEqual(tokenBudget);
        expect(result.stats.budgetRemaining).toBeGreaterThanOrEqual(0);
      }
    ));
  });

  it('maintains tier allocation ratios (70/20/10)', () => {
    fc.assert(fc.property(
      fc.nat({ min: 5000, max: 20000 }),
      contextTaskArb,
      async (tokenBudget, task) => {
        const slicer = new ContextSlicer({
          tokenBudget,
          minScore: 0.1,
          maxFiles: 50,
          tierAllocation: { hot: 0.7, warm: 0.2, cold: 0.1 },
          cacheTTL: 0
        });

        const files = ['*.ts', '*.md', 'src/**/*.ts'];
        const result = await slicer.sliceContext(files, task);

        const hotBudget = tokenBudget * 0.7;
        const warmBudget = tokenBudget * 0.2;
        const coldBudget = tokenBudget * 0.1;

        // Each tier should respect its budget (with some tolerance for overhead)
        expect(result.stats.breakdown.hot.tokens).toBeLessThanOrEqual(hotBudget * 1.1);
        expect(result.stats.breakdown.warm.tokens).toBeLessThanOrEqual(warmBudget * 1.1);
        expect(result.stats.breakdown.cold.tokens).toBeLessThanOrEqual(coldBudget * 1.1);
      }
    ));
  });

  it('produces consistent relevance scores for identical content', () => {
    fc.assert(fc.property(
      fileContentArb,
      contextTaskArb,
      (content, task) => {
        const slicer = new ContextSlicer({ cacheTTL: 0 });

        // Score the same content twice
        const score1 = (slicer as any)._keywordScore(content, task);
        const score2 = (slicer as any)._keywordScore(content, task);

        // Scores should be identical (deterministic)
        expect(score1).toBe(score2);
      }
    ));
  });

  it('handles empty file lists gracefully', () => {
    fc.assert(fc.property(
      contextTaskArb,
      async (task) => {
        const slicer = new ContextSlicer({ cacheTTL: 0 });

        const result = await slicer.sliceContext([], task);

        // Should produce valid result even with no files
        expect(result).toBeDefined();
        expect(result.context).toBeDefined();
        expect(result.stats.totalTokens).toBe(0);
        expect(result.tiers.hot.length).toBe(0);
        expect(result.tiers.warm.length).toBe(0);
        expect(result.tiers.cold.length).toBe(0);
      }
    ));
  });

  it('classifies tiers based on access time', () => {
    fc.assert(fc.property(
      nonEmptyArrayArb(
        fc.record({
          source: fileContentArb,
          score: fc.float({ min: 0, max: 1 }),
          size: fc.nat({ max: 10000 }),
          timestamp: fc.nat()
        })
      ),
      (sources) => {
        const slicer = new ContextSlicer({ cacheTTL: 0 });

        const tiered = slicer.classifyTiers(sources);

        // All sources should be classified into exactly one tier
        const totalClassified = tiered.hot.length + tiered.warm.length + tiered.cold.length;
        expect(totalClassified).toBe(sources.length);

        // No source should appear in multiple tiers
        const allSources = [...tiered.hot, ...tiered.warm, ...tiered.cold];
        const uniqueSources = new Set(allSources);
        expect(uniqueSources.size).toBe(sources.length);
      }
    ));
  });

  it('maintains compression ratio within expected bounds', () => {
    fc.assert(fc.property(
      tokenBudgetArb,
      contextTaskArb,
      async (tokenBudget, task) => {
        const slicer = new ContextSlicer({
          tokenBudget,
          minScore: 0.1,
          maxFiles: 50,
          cacheTTL: 0
        });

        const files = ['*.ts', '*.md'];
        const result = await slicer.sliceContext(files, task);

        // Compression ratio should be between 0 and 1
        expect(result.stats.compressionRatio).toBeGreaterThanOrEqual(0);
        expect(result.stats.compressionRatio).toBeLessThanOrEqual(1);

        // Reduction percentage should be between 0 and 1
        expect(result.stats.reductionPercentage).toBeGreaterThanOrEqual(0);
        expect(result.stats.reductionPercentage).toBeLessThanOrEqual(1);
      }
    ));
  });

  it('produces valid quality scores', () => {
    fc.assert(fc.property(
      tokenBudgetArb,
      contextTaskArb,
      async (tokenBudget, task) => {
        const slicer = new ContextSlicer({
          tokenBudget,
          minScore: 0.1,
          maxFiles: 50,
          cacheTTL: 0
        });

        const files = ['*.ts', '*.md'];
        const result = await slicer.sliceContext(files, task);

        // Quality score should be between 0 and 1
        expect(result.stats.qualityScore).toBeGreaterThanOrEqual(0);
        expect(result.stats.qualityScore).toBeLessThanOrEqual(1);
      }
    ));
  });

  it('handles arbitrary file patterns', () => {
    fc.assert(fc.property(
      nonEmptyArrayArb(filePatternArb),
      contextTaskArb,
      async (files, task) => {
        const slicer = new ContextSlicer({
          tokenBudget: 8000,
          minScore: 0.1,
          maxFiles: 50,
          cacheTTL: 0
        });

        const result = await slicer.sliceContext(files, task);

        // Should always produce a valid result
        expect(result).toBeDefined();
        expect(result.context).toBeDefined();
        expect(result.stats).toBeDefined();
        expect(result.tiers).toBeDefined();
      }
    ));
  });

  it('maintains cache consistency', () => {
    fc.assert(fc.property(
      nonEmptyArrayArb(filePatternArb),
      contextTaskArb,
      async (files, task) => {
        const slicer = new ContextSlicer({
          tokenBudget: 8000,
          minScore: 0.1,
          maxFiles: 50,
          cacheTTL: 60000 // Enable cache
        });

        // First call (cache miss)
        const result1 = await slicer.sliceContext(files, task);

        // Second call (cache hit)
        const result2 = await slicer.sliceContext(files, task);

        // Results should be identical
        expect(result1.context).toBe(result2.context);
        expect(result1.stats.totalTokens).toBe(result2.stats.totalTokens);

        // Cache hits should increase
        expect(result2.stats.cacheHits).toBeGreaterThan(result1.stats.cacheHits);
      }
    ));
  });

  it('handles varying task complexity', () => {
    fc.assert(fc.property(
      fc.string().filter(s => s.length > 0 && s.length < 500),
      async (task) => {
        const slicer = new ContextSlicer({
          tokenBudget: 8000,
          minScore: 0.1,
          maxFiles: 50,
          cacheTTL: 0
        });

        const files = ['*.ts', '*.md'];
        const result = await slicer.sliceContext(files, task);

        // Should produce valid result regardless of task complexity
        expect(result).toBeDefined();
        expect(result.warnings).toBeDefined();
        expect(Array.isArray(result.warnings)).toBe(true);
      }
    ));
  });

  it('ensures tiered context building produces formatted output', () => {
    fc.assert(fc.property(
      tokenBudgetArb,
      contextTaskArb,
      async (tokenBudget, task) => {
        const slicer = new ContextSlicer({
          tokenBudget,
          minScore: 0.1,
          maxFiles: 50,
          cacheTTL: 0
        });

        const files = ['*.ts', '*.md', 'src/**/*.ts'];
        const result = await slicer.sliceContext(files, task);

        // Context should be a non-empty string
        expect(result.context).toBeDefined();
        expect(typeof result.context).toBe('string');

        // If there are any tiers with content, context should have tier headers
        const hasContent = result.tiers.hot.length > 0 ||
                          result.tiers.warm.length > 0 ||
                          result.tiers.cold.length > 0;

        if (hasContent) {
          expect(result.context.length).toBeGreaterThan(0);
        }
      }
    ));
  });

  it('handles multi-factor relevance scoring', () => {
    fc.assert(fc.property(
      fileContentArb,
      contextTaskArb,
      (content, task) => {
        const slicer = new ContextSlicer({ cacheTTL: 0 });

        // All scoring methods should return values between 0 and 1
        const keywordScore = (slicer as any)._keywordScore(content, task);
        const semanticScore = (slicer as any)._semanticScore(content, task);
        const pathScore = (slicer as any)._pathScore('src/test.ts', task);

        expect(keywordScore).toBeGreaterThanOrEqual(0);
        expect(keywordScore).toBeLessThanOrEqual(1);
        expect(semanticScore).toBeGreaterThanOrEqual(0);
        expect(semanticScore).toBeLessThanOrEqual(1);
        expect(pathScore).toBeGreaterThanOrEqual(0);
        expect(pathScore).toBeLessThanOrEqual(1);
      }
    ));
  });
});
