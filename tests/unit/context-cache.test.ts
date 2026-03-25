#!/usr/bin/env node

/**
 * Unit tests for Context Cache
 */

import assert from 'node:assert';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

import ContextCache from '../../bin/lib/context-cache.js';

let passed = 0;
let failed = 0;

// Basic cache operations
test('ContextCache - creates with temp directory', () => {
  const cache = new ContextCache();
  assert.ok(cache.cacheDir);
  assert.ok(cache.cacheDir.includes(process.pid.toString()));
  assert.ok(cache.cache instanceof Map);
});

test('ContextCache - set stores content with metadata', () => {
  const cache = new ContextCache();
  cache.set('test-key', 'test-content', { type: 'url', contentType: 'text/html' });
  const cached = cache.get('test-key');
  assert.strictEqual(cached.content, 'test-content');
  assert.strictEqual(cached.type, 'url');
  assert.strictEqual(cached.contentType, 'text/html');
  assert.ok(cached.timestamp);
});

test('ContextCache - get returns undefined for missing keys', () => {
  const cache = new ContextCache();
  const result = cache.get('nonexistent-key');
  assert.strictEqual(result, undefined);
});

test('ContextCache - has returns true for existing keys', () => {
  const cache = new ContextCache();
  cache.set('exists', 'content');
  assert.strictEqual(cache.has('exists'), true);
});

test('ContextCache - has returns false for missing keys', () => {
  const cache = new ContextCache();
  assert.strictEqual(cache.has('missing'), false);
});

test('ContextCache - delete removes items', () => {
  const cache = new ContextCache();
  cache.set('to-delete', 'content');
  assert.strictEqual(cache.has('to-delete'), true);
  cache.delete('to-delete');
  assert.strictEqual(cache.has('to-delete'), false);
});

test('ContextCache - size returns correct count', () => {
  const cache = new ContextCache();
  assert.strictEqual(cache.size(), 0);
  cache.set('key1', 'content1');
  assert.strictEqual(cache.size(), 1);
  cache.set('key2', 'content2');
  assert.strictEqual(cache.size(), 2);
});

test('ContextCache - clear empties the cache', () => {
  const cache = new ContextCache();
  cache.set('key1', 'content1');
  cache.set('key2', 'content2');
  assert.strictEqual(cache.size(), 2);
  cache.clear();
  assert.strictEqual(cache.size(), 0);
});

test('ContextCache - clear removes temp directory', () => {
  const cache = new ContextCache();
  const cacheDir = cache.getCacheDir();
  // Create the directory
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  assert.ok(fs.existsSync(cacheDir));
  cache.clear();
  assert.strictEqual(fs.existsSync(cacheDir), false);
});

test('ContextCache - keys returns all cache keys', () => {
  const cache = new ContextCache();
  cache.set('key1', 'content1');
  cache.set('key2', 'content2');
  const keys = cache.keys();
  assert.strictEqual(keys.length, 2);
  assert.ok(keys.includes('key1'));
  assert.ok(keys.includes('key2'));
});

test('ContextCache - entries returns key-value pairs', () => {
  const cache = new ContextCache();
  cache.set('key1', 'content1');
  const entries = cache.entries();
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].key, 'key1');
  assert.strictEqual(entries[0].value.content, 'content1');
});

test('ContextCache - stats returns size and keys', () => {
  const cache = new ContextCache();
  cache.set('key1', 'content1');
  cache.set('key2', 'content2');
  const stats = cache.stats();
  assert.strictEqual(stats.size, 2);
  assert.strictEqual(stats.keys.length, 2);
});

test('ContextCache - cache directory uses system temp', () => {
  const cache = new ContextCache();
  const expectedPrefix = path.join(os.tmpdir(), 'ez-agents-context-');
  assert.ok(cache.cacheDir.startsWith(expectedPrefix));
});

test('ContextCache - multiple caches have isolated storage', () => {
  const cache1 = new ContextCache();
  const cache2 = new ContextCache();
  cache1.set('key1', 'content1');
  cache2.set('key2', 'content2');
  assert.strictEqual(cache1.has('key2'), false);
  assert.strictEqual(cache2.has('key1'), false);
});

// Test timestamp is recent
test('ContextCache - timestamp is recent', () => {
  const cache = new ContextCache();
  const before = Date.now();
  cache.set('timestamp-test', 'content');
  const after = Date.now();
  const cached = cache.get('timestamp-test');
  assert.ok(cached.timestamp >= before);
  assert.ok(cached.timestamp <= after);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
