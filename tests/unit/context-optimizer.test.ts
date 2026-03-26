/**
 * Context Optimizer Tests
 *
 * Tests for the consolidated ContextOptimizer class.
 * Verifies single-pass optimization, lazy evaluation, deduplication,
 * token budget enforcement, and transparent reasoning.
 */

import * as path from 'path';
import * as fs from 'fs';
import { ContextOptimizer, optimizeContext } from '../../bin/lib/context-optimizer.js';

describe('ContextOptimizer', () => {
  let tmpDir: string;
  let optimizer: ContextOptimizer;

  beforeEach(() => {
    tmpDir = createTempProject();
    optimizer = new ContextOptimizer(tmpDir);
  });

  afterEach(() => cleanup(tmpDir));

  test('constructor does not throw', () => {
    expect(optimizer).toBeTruthy();
  });

  test('optimizeContext reads and scores files in single pass', async () => {
    const testFile = path.join(tmpDir, 'test.txt');
    fs.writeFileSync(testFile, 'This is a test file about optimization and performance');

    const result = await optimizer.optimizeContext({
      files: [testFile],
      task: 'optimization performance',
      includeReasoning: true,
    });

    expect(result.context).toBeTruthy();
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.stats.filesProcessed).toBeGreaterThan(0);
    expect(result.sources[0].reasoning).toBeDefined();
  });

  test('optimizeContext provides transparent reasoning', async () => {
    const testFile = path.join(tmpDir, 'test.txt');
    fs.writeFileSync(testFile, 'This file contains optimization and performance keywords');

    const result = await optimizer.optimizeContext({
      files: [testFile],
      task: 'optimization performance',
      includeReasoning: true,
    });

    expect(result.sources[0].reasoning).toBeDefined();
    // At least one keyword should match
    expect(result.sources[0].reasoning?.matchedKeywords.length).toBeGreaterThan(0);
    expect(result.sources[0].reasoning?.matchDensity).toBeGreaterThan(0);
  });

  test('optimizeContext filters by minScore', async () => {
    const relevantFile = path.join(tmpDir, 'relevant.txt');
    const irrelevantFile = path.join(tmpDir, 'irrelevant.txt');
    fs.writeFileSync(relevantFile, 'This file is about optimization and performance tuning');
    fs.writeFileSync(irrelevantFile, 'This file is about cooking recipes and food');

    const result = await optimizer.optimizeContext({
      files: [relevantFile, irrelevantFile],
      task: 'optimization performance',
      minScore: 0.5,
    });

    expect(result.sources.some((s) => s.source.includes('relevant'))).toBeTruthy();
  });

  test('optimizeContext limits to maxFiles', async () => {
    for (let i = 0; i < 20; i++) {
      fs.writeFileSync(path.join(tmpDir, `file${i}.txt`), `Content ${i}`);
    }

    const result = await optimizer.optimizeContext({
      files: [path.join(tmpDir, '*.txt')],
      maxFiles: 10,
    });

    expect(result.stats.filesProcessed).toBeLessThanOrEqual(10);
  });

  test('optimizeContext enforces maxTokens budget', async () => {
    for (let i = 0; i < 10; i++) {
      fs.writeFileSync(path.join(tmpDir, `file${i}.txt`), 'A'.repeat(1000));
    }

    const result = await optimizer.optimizeContext({
      files: [path.join(tmpDir, '*.txt')],
      maxTokens: 500, // ~2000 chars
      minScore: 0.3,
    });

    expect(result.stats.totalTokens).toBeLessThanOrEqual(500);
    expect(result.stats.underBudget).toBeTruthy();
    expect(result.warnings.some(w => w.includes('budget'))).toBeTruthy();
  });

  test('optimizeContext deduplicates exact matches', async () => {
    const content = 'This is duplicate content';
    fs.writeFileSync(path.join(tmpDir, 'file1.txt'), content);
    fs.writeFileSync(path.join(tmpDir, 'file2.txt'), content);

    const result = await optimizer.optimizeContext({
      files: [path.join(tmpDir, '*.txt')],
    });

    expect(result.stats.filesProcessed).toBe(1);
  });

  test('optimizeContext returns structured LLM-friendly output', async () => {
    const testFile = path.join(tmpDir, 'test.txt');
    fs.writeFileSync(testFile, 'Test content');

    const result = await optimizer.optimizeContext({
      files: [testFile],
      task: 'test',
      includeReasoning: true,
    });

    // Check structured format
    expect(result.context).toContain('// File:');
    expect(result.context).toContain('// Score:');
    expect(result.context).toContain('// Size:');
    expect(result.context).toContain('// Matched keywords:');
  });

  test('optimizeContext includes warnings when near budget', async () => {
    fs.writeFileSync(path.join(tmpDir, 'large.txt'), 'A'.repeat(10000));

    const result = await optimizer.optimizeContext({
      files: [path.join(tmpDir, '*.txt')],
      maxTokens: 3000, // ~12000 chars, file is 10000
    });

    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test('optimizeContext handles empty file list gracefully', async () => {
    const result = await optimizer.optimizeContext({
      files: [],
    });

    expect(result.context).toContain('// No relevant files found');
    expect(result.stats.filesProcessed).toBe(0);
  });

  test('optimizeContext returns empty when disabled', async () => {
    process.env.EZ_CONTEXT_OPTIMIZED = 'false';
    const disabledOptimizer = new ContextOptimizer(tmpDir);

    const result = await disabledOptimizer.optimizeContext({
      files: [path.join(tmpDir, '*.txt')],
    });

    expect(result).toBeTruthy();
    expect(result.warnings).toContain('Using legacy fallback (optimization disabled)');
    process.env.EZ_CONTEXT_OPTIMIZED = 'true';
  });

  test('quickScore provides detailed reasoning', () => {
    const content = 'This file contains optimization and performance keywords';
    const task = 'optimize performance';

    const result = (optimizer as any).quickScore(content, task, true);

    expect(result.score).toBeGreaterThanOrEqual(0.3);
    expect(result.score).toBeLessThanOrEqual(1.0);
    expect(result.reasoning).toBeDefined();
    // At least one keyword should match (stemming might affect exact match)
    expect(result.reasoning?.matchedKeywords.length).toBeGreaterThan(0);
  });

  test('quickScore can exclude reasoning for performance', () => {
    const content = 'Test content';
    const task = 'test';

    const result = (optimizer as any).quickScore(content, task, false);

    expect(result.score).toBeDefined();
    expect(result.reasoning).toBeUndefined();
  });

  test('simpleHash produces consistent hashes', () => {
    const content = 'test content';
    const hash1 = (optimizer as any).simpleHash(content);
    const hash2 = (optimizer as any).simpleHash(content);

    expect(hash1).toBe(hash2);
  });

  test('simpleHash differentiates different content', () => {
    const hash1 = (optimizer as any).simpleHash('content 1');
    const hash2 = (optimizer as any).simpleHash('content 2');

    expect(hash1).not.toBe(hash2);
  });
});

describe('optimizeContext (standalone function)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => cleanup(tmpDir));

  test('standalone function works', async () => {
    const testFile = path.join(tmpDir, 'test.txt');
    fs.writeFileSync(testFile, 'Test content');

    const result = await optimizeContext(
      {
        files: [testFile],
        task: 'test',
        includeReasoning: true,
      },
      tmpDir
    );

    expect(result.context).toBeTruthy();
    expect(result.sources[0].reasoning).toBeDefined();
  });

  test('standalone function with token budget', async () => {
    fs.writeFileSync(path.join(tmpDir, 'large.txt'), 'A'.repeat(10000));

    const result = await optimizeContext(
      {
        files: [path.join(tmpDir, '*.txt')],
        maxTokens: 500,
      },
      tmpDir
    );

    expect(result.stats.totalTokens).toBeLessThanOrEqual(500);
    expect(result.stats.underBudget).toBeTruthy();
  });
});
