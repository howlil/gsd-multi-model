#!/usr/bin/env node

/**
 * Unit tests for Context Manager
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const ContextManager = require('../../ez-agents/bin/lib/context-manager.cjs');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}: ${err.message}`);
    failed++;
  }
}

// Create a temporary test directory
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ez-context-manager-test-'));

// Setup test files
function setupTestFiles() {
  fs.mkdirSync(path.join(testDir, '.planning'), { recursive: true });
  fs.writeFileSync(path.join(testDir, 'README.md'), '# Test Project\n\nTest content.');
  fs.writeFileSync(path.join(testDir, 'package.json'), '{"name": "test-project"}');
}

// Cleanup test directory
function cleanupTestFiles() {
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup errors
  }
}

setupTestFiles();

const contextManager = new ContextManager(testDir);

// Constructor tests
test('ContextManager - creates with cwd', () => {
  assert.strictEqual(contextManager.cwd, testDir);
  assert.ok(contextManager.sources instanceof Array);
  assert.ok(contextManager.cache);
  assert.ok(contextManager.fileAccess);
  assert.ok(contextManager.urlFetch);
  assert.ok(contextManager.scanner);
});

test('ContextManager - defaults to process.cwd() if no cwd provided', () => {
  const cm = new ContextManager();
  assert.strictEqual(cm.cwd, process.cwd());
});

// Source tracking tests
test('ContextManager - trackSources adds sources', () => {
  const sources = [
    { type: 'file', source: 'test.txt', timestamp: '2024-01-01T00:00:00.000Z' }
  ];
  contextManager.trackSources(sources);
  assert.strictEqual(contextManager.sources.length, 1);
});

test('ContextManager - trackSources deduplicates', () => {
  const initialLength = contextManager.sources.length;
  const sources = [
    { type: 'file', source: 'test.txt', timestamp: '2024-01-01T00:00:00.000Z' }
  ];
  contextManager.trackSources(sources);
  // Should not add duplicate
  assert.strictEqual(contextManager.sources.length, initialLength);
});

test('ContextManager - getSources returns tracked sources', () => {
  const cm = new ContextManager(testDir);
  cm.trackSources([
    { type: 'file', source: 'file1.txt', timestamp: '2024-01-01T00:00:00.000Z' },
    { type: 'url', source: 'https://example.com', timestamp: '2024-01-01T00:00:00.000Z' }
  ]);
  const sources = cm.getSources();
  assert.strictEqual(sources.length, 2);
});

// File context tests (async)
test('ContextManager - requestContext reads files', async () => {
  const cm = new ContextManager(testDir);
  const result = await cm.requestContext({
    files: ['README.md'],
    urls: []
  });
  assert.ok(result.context.includes('# Test Project'));
  assert.strictEqual(result.sources.length, 1);
  assert.strictEqual(result.sources[0].type, 'file');
  assert.strictEqual(result.errors.length, 0);
});

test('ContextManager - requestContext handles file errors gracefully', async () => {
  const cm = new ContextManager(testDir);
  const result = await cm.requestContext({
    files: ['nonexistent-file.md'],
    urls: []
  });
  assert.strictEqual(result.context, '');
  assert.strictEqual(result.sources.length, 0);
  assert.strictEqual(result.errors.length, 1);
  assert.ok(result.errors[0].message);
});

test('ContextManager - requestContext aggregates multiple files', async () => {
  const cm = new ContextManager(testDir);
  const result = await cm.requestContext({
    files: ['README.md', 'package.json'],
    urls: []
  });
  assert.ok(result.context.includes('# Test Project'));
  assert.ok(result.context.includes('"name": "test-project"'));
  assert.strictEqual(result.sources.length, 2);
});

// STATE.md update tests
test('ContextManager - updateStateMd creates file if missing', () => {
  const cm = new ContextManager(testDir);
  const statePath = path.join(testDir, '.planning', 'STATE.md');
  
  // Remove if exists
  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
  }
  
  cm.trackSources([
    { type: 'file', source: 'test.txt', timestamp: '2024-01-01T00:00:00.000Z' }
  ]);
  cm.updateStateMd();
  
  assert.ok(fs.existsSync(statePath));
  const content = fs.readFileSync(statePath, 'utf-8');
  assert.ok(content.includes('## Context Sources'));
  assert.ok(content.includes('| Source | Type | Timestamp |'));
  assert.ok(content.includes('test.txt'));
});

test('ContextManager - updateStateMd appends to existing file', () => {
  const cm = new ContextManager(testDir);
  const statePath = path.join(testDir, '.planning', 'STATE.md');
  
  // Create initial content
  fs.writeFileSync(statePath, '# Project State\n\n## Current Position\n\nPhase: 1\n', 'utf-8');
  
  cm.trackSources([
    { type: 'url', source: 'https://example.com', timestamp: '2024-01-01T00:00:00.000Z' }
  ]);
  cm.updateStateMd();
  
  const content = fs.readFileSync(statePath, 'utf-8');
  assert.ok(content.includes('# Project State'));
  assert.ok(content.includes('## Current Position'));
  assert.ok(content.includes('## Context Sources'));
  assert.ok(content.includes('https://example.com'));
});

test('ContextManager - updateStateMd replaces existing Context Sources section', () => {
  const cm = new ContextManager(testDir);
  const statePath = path.join(testDir, '.planning', 'STATE.md');
  
  // Create file with existing Context Sources section
  fs.writeFileSync(statePath, `# Project State

## Current Position

Phase: 1

## Context Sources

| Source | Type | Timestamp |
|--------|------|-----------|
| old.txt | FILE | 2023-01-01T00:00:00.000Z |
`, 'utf-8');
  
  // Clear sources and add new one
  cm.sources = [];
  cm.trackSources([
    { type: 'file', source: 'new.txt', timestamp: '2024-01-01T00:00:00.000Z' }
  ]);
  cm.updateStateMd();
  
  const content = fs.readFileSync(statePath, 'utf-8');
  assert.ok(content.includes('new.txt'));
  assert.ok(!content.includes('old.txt'));
});

// Cache tests
test('ContextManager - getCached returns cached content', () => {
  const cm = new ContextManager(testDir);
  cm.cache.set('https://example.com', 'cached content', { type: 'url' });
  const cached = cm.getCached('https://example.com');
  assert.strictEqual(cached.content, 'cached content');
});

test('ContextManager - getCached returns undefined for missing keys', () => {
  const cm = new ContextManager(testDir);
  const cached = cm.getCached('https://nonexistent.com');
  assert.strictEqual(cached, undefined);
});

test('ContextManager - clearCache empties the cache', () => {
  const cm = new ContextManager(testDir);
  cm.cache.set('key1', 'content1');
  cm.cache.set('key2', 'content2');
  assert.strictEqual(cm.getCacheStats().size, 2);
  cm.clearCache();
  assert.strictEqual(cm.getCacheStats().size, 0);
});

test('ContextManager - getCacheStats returns cache statistics', () => {
  const cm = new ContextManager(testDir);
  cm.cache.set('key1', 'content1');
  const stats = cm.getCacheStats();
  assert.strictEqual(stats.size, 1);
  assert.ok(Array.isArray(stats.keys));
});

// Cleanup
cleanupTestFiles();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
