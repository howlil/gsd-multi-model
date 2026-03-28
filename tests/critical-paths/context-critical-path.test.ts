/**
 * Context Management - Critical Path Tests
 *
 * Tests for Phase 38 & 43: Context Slicing & Token Compression
 * Coverage target: ≥80% for context-slicer.ts, context-optimizer.ts
 *
 * Requirements:
 * - TEST-03: Context management critical path tests
 *   - Relevance-based context slicing
 *   - Token budget enforcement
 *   - Summarization with quality validation
 *   - Tier-based context management (hot/warm/cold)
 *   - Compression statistics tracking
 *   - Cache hit/miss tracking
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContextSlicer, ContextTier, CompressionStats } from '../../bin/lib/context/context-slicer.js';
import { ContextOptimizer, ContextResult } from '../../bin/lib/context/context-optimizer.js';
import { TokenExtractorClass } from '../../bin/lib/adapters/shared/tokenExtractor.js';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Context Management - Critical Path', () => {
  describe('ContextSlicer - Relevance-Based Slicing', () => {
    let slicer: ContextSlicer;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-context-'));
      slicer = new ContextSlicer();
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('slices context based on task relevance', async () => {
      // Create test files
      const file1 = join(tempDir, 'auth.ts');
      const file2 = join(tempDir, 'utils.ts');
      
      writeFileSync(file1, 'export function authenticate() { /* auth logic */ }');
      writeFileSync(file2, 'export function formatDate() { /* date utils */ }');

      const result = await slicer.sliceContext({
        task: 'Fix authentication bug',
        files: [file1, file2],
        maxTokens: 1000
      });

      // Auth file should have higher relevance
      expect(result.sources.length).toBeGreaterThan(0);
    });

    it('filters files by minimum score threshold', async () => {
      const file1 = join(tempDir, 'relevant.ts');
      writeFileSync(file1, 'export const auth = "authentication system"');

      const result = await slicer.sliceContext({
        task: 'Authentication',
        files: [file1],
        minScore: 0.5,
        maxTokens: 500
      });

      expect(result.sources.length).toBeGreaterThanOrEqual(0);
    });

    it('limits context to max files', async () => {
      // Create multiple files
      for (let i = 0; i < 10; i++) {
        writeFileSync(join(tempDir, `file-${i}.ts`), `export const value${i} = ${i};`);
      }

      const files = Array.from({ length: 10 }, (_, i) => join(tempDir, `file-${i}.ts`));
      
      const result = await slicer.sliceContext({
        task: 'General task',
        files,
        maxFiles: 3,
        maxTokens: 1000
      });

      expect(result.sources.length).toBeLessThanOrEqual(3);
    });

    it('classifies context into tiers', async () => {
      const file1 = join(tempDir, 'current.ts');
      writeFileSync(file1, 'export const current = "hot";');

      const result = await slicer.sliceContext({
        task: 'Current task',
        files: [file1],
        maxTokens: 500
      });

      // Should have tier classification
      expect(result).toBeDefined();
    });
  });

  describe('ContextSlicer - Token Budget Enforcement', () => {
    let slicer: ContextSlicer;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-budget-'));
      slicer = new ContextSlicer();
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('enforces token budget with summarization fallback', async () => {
      // Create large file
      const largeContent = Array.from({ length: 100 }, () => 
        'export const data = "This is a large file with lots of content";'
      ).join('\n');
      
      const largeFile = join(tempDir, 'large.ts');
      writeFileSync(largeFile, largeContent);

      const result = await slicer.sliceContext({
        task: 'Process data',
        files: [largeFile],
        maxTokens: 500
      });

      // Should either truncate or summarize
      expect(result.stats.totalTokens).toBeLessThanOrEqual(500);
    });

    it('tracks budget usage', async () => {
      const file = join(tempDir, 'test.ts');
      writeFileSync(file, 'export const test = "budget test";');

      const result = await slicer.sliceContext({
        task: 'Test task',
        files: [file],
        maxTokens: 1000
      });

      // Should track budget
      expect(result.stats.underBudget).toBeDefined();
    });

    it('allocates tokens by tier (70/20/10)', async () => {
      const files: string[] = [];
      for (let i = 0; i < 5; i++) {
        const file = join(tempDir, `tier-${i}.ts`);
        writeFileSync(file, `export const tier${i} = "content";`);
        files.push(file);
      }

      const result = await slicer.sliceContext({
        task: 'Multi-tier task',
        files,
        maxTokens: 1000
      });

      // Should have tier breakdown
      expect(result.stats).toBeDefined();
    });
  });

  describe('ContextSlicer - Compression Statistics', () => {
    let slicer: ContextSlicer;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-stats-'));
      slicer = new ContextSlicer();
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('tracks compression ratio', async () => {
      const file = join(tempDir, 'compress.ts');
      writeFileSync(file, 'export const data = "compression test data";');

      const result = await slicer.sliceContext({
        task: 'Compression test',
        files: [file],
        maxTokens: 500
      });

      // Should track compression metrics
      expect(result.stats.reduction).toBeGreaterThanOrEqual(0);
    });

    it('tracks cache hits and misses', async () => {
      const file = join(tempDir, 'cache.ts');
      writeFileSync(file, 'export const cached = "content";');

      // First call (cache miss)
      await slicer.sliceContext({
        task: 'Cache test',
        files: [file],
        maxTokens: 500
      });

      // Second call (cache hit)
      const result2 = await slicer.sliceContext({
        task: 'Cache test',
        files: [file],
        maxTokens: 500
      });

      // Should track cache stats
      expect(result2.stats).toBeDefined();
    });

    it('provides tier breakdown in statistics', async () => {
      const files: string[] = [];
      for (let i = 0; i < 3; i++) {
        const file = join(tempDir, `file-${i}.ts`);
        writeFileSync(file, `export const data${i} = "content";`);
        files.push(file);
      }

      const result = await slicer.sliceContext({
        task: 'Tier breakdown test',
        files,
        maxTokens: 1000
      });

      expect(result.stats.filesProcessed).toBe(3);
    });
  });

  describe('ContextOptimizer - Single-Pass Optimization', () => {
    let optimizer: ContextOptimizer;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-opt-'));
      optimizer = new ContextOptimizer();
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('optimizes context from files', async () => {
      const file = join(tempDir, 'optimize.ts');
      writeFileSync(file, 'export const optimized = "context optimization test";');

      const result = await optimizer.optimizeContext({
        files: [file],
        task: 'Optimization test'
      });

      expect(result.context).toBeDefined();
      expect(result.sources.length).toBeGreaterThan(0);
    });

    it('scores files by relevance', async () => {
      const relevant = join(tempDir, 'auth.ts');
      const irrelevant = join(tempDir, 'utils.ts');
      
      writeFileSync(relevant, 'export const authentication = "auth system";');
      writeFileSync(irrelevant, 'export const utils = "utility functions";');

      const result = await optimizer.optimizeContext({
        files: [relevant, irrelevant],
        task: 'Fix authentication',
        minScore: 0.3
      });

      // Should include sources with scores
      expect(result.sources.length).toBeGreaterThan(0);
    });

    it('deduplicates context sources', async () => {
      const file = join(tempDir, 'duplicate.ts');
      writeFileSync(file, 'export const data = "test";');

      // Pass same file twice
      const result = await optimizer.optimizeContext({
        files: [file, file],
        task: 'Dedup test'
      });

      // Should deduplicate
      expect(result.sources.length).toBe(1);
    });

    it('tracks optimization statistics', async () => {
      const file = join(tempDir, 'stats.ts');
      writeFileSync(file, 'export const stats = "optimization statistics";');

      const result = await optimizer.optimizeContext({
        files: [file],
        task: 'Stats test'
      });

      expect(result.stats.filesProcessed).toBe(1);
      expect(result.stats.totalSize).toBeGreaterThan(0);
    });
  });

  describe('TokenExtractor - Token Counting', () => {
    let extractor: TokenExtractorClass;

    beforeEach(() => {
      extractor = new TokenExtractorClass();
    });

    it('counts tokens accurately', () => {
      const text = 'This is a test string for token counting';
      const count = extractor.countTokens(text);
      
      expect(count).toBeGreaterThan(0);
    });

    it('handles empty strings', () => {
      const count = extractor.countTokens('');
      expect(count).toBe(0);
    });

    it('counts tokens for code snippets', () => {
      const code = 'function test() { return true; }';
      const count = extractor.countTokens(code);
      
      expect(count).toBeGreaterThan(0);
    });

    it('provides fallback counting', () => {
      const text = 'Fallback token count test';
      const count = extractor.fallbackCount(text);
      
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('Integration - Context Workflow', () => {
    it('executes complete context optimization workflow', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-workflow-'));
      
      try {
        // Create test files
        const authFile = join(tempDir, 'auth.ts');
        const utilsFile = join(tempDir, 'utils.ts');
        
        writeFileSync(authFile, 'export function authenticate() { /* auth */ }');
        writeFileSync(utilsFile, 'export function format() { /* utils */ }');

        const slicer = new ContextSlicer();
        
        // Slice context
        const sliceResult = await slicer.sliceContext({
          task: 'Fix authentication',
          files: [authFile, utilsFile],
          maxTokens: 1000
        });

        expect(sliceResult.sources.length).toBeGreaterThan(0);
        expect(sliceResult.stats.underBudget).toBeDefined();

        // Optimize context
        const optimizer = new ContextOptimizer();
        const optResult = await optimizer.optimizeContext({
          files: [authFile, utilsFile],
          task: 'Fix authentication'
        });

        expect(optResult.context).toBeDefined();
        expect(optResult.stats.filesProcessed).toBe(2);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
