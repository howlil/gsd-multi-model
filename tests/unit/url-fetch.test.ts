#!/usr/bin/env node

/**
 * Unit tests for URL Fetch Service
 */

import assert from 'node:assert';

import URLFetchService from '../../bin/lib/url-fetch.js';
import { URLValidator } from '../../bin/lib/url-fetch.js';
import { URLFetchError } from '../../bin/lib/context-errors.js';

let passed = 0;
let failed = 0;

// URL Validator tests
test('URLValidator - accepts HTTPS URLs', () => {
  const result = URLValidator.validate('https://example.com');
  assert.strictEqual(result.valid, true);
});

test('URLValidator - accepts HTTPS URLs with paths', () => {
  const result = URLValidator.validate('https://example.com/path/to/file.md');
  assert.strictEqual(result.valid, true);
});

test('URLValidator - accepts HTTPS URLs with query params', () => {
  const result = URLValidator.validate('https://example.com/file?key=value&other=123');
  assert.strictEqual(result.valid, true);
});

test('URLValidator - rejects HTTP URLs', () => {
  const result = URLValidator.validate('http://example.com');
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('not allowed') || result.error.includes('Only HTTPS'));
});

test('URLValidator - rejects file: URLs', () => {
  const result = URLValidator.validate('file:///etc/passwd');
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('not allowed'));
});

test('URLValidator - rejects data: URLs', () => {
  const result = URLValidator.validate('data:text/html,<script>alert(1)</script>');
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('not allowed'));
});

test('URLValidator - rejects javascript: URLs', () => {
  const result = URLValidator.validate('javascript:alert(1)');
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('not allowed'));
});

test('URLValidator - rejects vbscript: URLs', () => {
  const result = URLValidator.validate('vbscript:msgbox(1)');
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('not allowed'));
});

test('URLValidator - rejects localhost URLs', () => {
  const result = URLValidator.validate('https://localhost:8080/api');
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('Localhost'));
});

test('URLValidator - rejects 127.0.0.1 URLs', () => {
  const result = URLValidator.validate('https://127.0.0.1:8080/api');
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('Localhost'));
});

test('URLValidator - rejects invalid URL formats', () => {
  const result = URLValidator.validate('not-a-valid-url');
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('Invalid URL format'));
});

test('URLValidator - rejects empty URLs', () => {
  const result = URLValidator.validate('');
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('required'));
});

test('URLValidator - rejects null URLs', () => {
  const result = URLValidator.validate(null);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('required'));
});

test('URLValidator - rejects undefined URLs', () => {
  const result = URLValidator.validate(undefined);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('required'));
});

test('URLValidator - accepts GitHub raw URLs', () => {
  const result = URLValidator.validate('https://raw.githubusercontent.com/user/repo/main/file.md');
  assert.strictEqual(result.valid, true);
});

test('URLValidator - accepts GitLab raw URLs', () => {
  const result = URLValidator.validate('https://gitlab.com/user/repo/-/raw/main/file.md');
  assert.strictEqual(result.valid, true);
});

// URLFetchService tests
test('URLFetchService - constructor sets timeout', () => {
  const service = new URLFetchService(5000);
  assert.strictEqual(service.timeout, 5000);
});

test('URLFetchService - default timeout is 30 seconds', () => {
  const service = new URLFetchService();
  assert.strictEqual(service.timeout, 30000);
});

test('URLFetchService - validateUrl delegates to URLValidator', () => {
  const service = new URLFetchService();
  const result = service.validateUrl('https://example.com');
  assert.strictEqual(result.valid, true);
});

test('URLFetchService - validateUrl rejects HTTP', () => {
  const service = new URLFetchService();
  const result = service.validateUrl('http://example.com');
  assert.strictEqual(result.valid, false);
});

// Async fetch tests (with mock/simulation)
test('URLFetchService - fetchUrl throws URLFetchError for invalid URL', async () => {
  const service = new URLFetchService();
  let threw = false;
  try {
    await service.fetchUrl('http://example.com');
  } catch (err) {
    threw = true;
    assert.ok(err instanceof URLFetchError);
    assert.strictEqual(err.url, 'http://example.com');
  }
  assert.strictEqual(threw, true);
});

test('URLFetchService - fetchUrl throws URLFetchError for localhost', async () => {
  const service = new URLFetchService();
  let threw = false;
  try {
    await service.fetchUrl('https://localhost:8080');
  } catch (err) {
    threw = true;
    assert.ok(err instanceof URLFetchError);
  }
  assert.strictEqual(threw, true);
});

// User confirmation test (non-interactive check)
test('URLFetchService - confirmUrlFetch is a static method', () => {
  assert.strictEqual(typeof URLFetchService.confirmUrlFetch, 'function');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
