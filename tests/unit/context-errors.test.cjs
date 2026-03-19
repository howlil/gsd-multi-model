#!/usr/bin/env node

/**
 * Unit tests for Context Error Classes
 */

const assert = require('assert');
const {
  ContextAccessError,
  URLFetchError,
  FileAccessError,
  SecurityScanError
} = require('../../ez-agents/bin/lib/context-errors.cjs');

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

// ContextAccessError tests
test('ContextAccessError - creates with default code', () => {
  const error = new ContextAccessError('Test error');
  assert.strictEqual(error.name, 'ContextAccessError');
  assert.strictEqual(error.code, 'CONTEXT_ACCESS_ERROR');
  assert.strictEqual(error.message, 'Test error');
  assert.strictEqual(typeof error.timestamp, 'string');
});

test('ContextAccessError - creates with custom code and details', () => {
  const error = new ContextAccessError('Custom error', {
    code: 'CUSTOM_CODE',
    details: { foo: 'bar' }
  });
  assert.strictEqual(error.code, 'CUSTOM_CODE');
  assert.strictEqual(error.details.foo, 'bar');
});

test('ContextAccessError - serializes to JSON', () => {
  const error = new ContextAccessError('JSON test', {
    code: 'JSON_TEST',
    details: { key: 'value' }
  });
  const json = error.toJSON();
  assert.strictEqual(json.name, 'ContextAccessError');
  assert.strictEqual(json.code, 'JSON_TEST');
  assert.strictEqual(json.message, 'JSON test');
  assert.strictEqual(json.details.key, 'value');
  assert.ok(json.timestamp);
});

// URLFetchError tests
test('URLFetchError - creates with url and reason', () => {
  const error = new URLFetchError('https://example.com', 'Network timeout');
  assert.strictEqual(error.name, 'URLFetchError');
  assert.strictEqual(error.code, 'URL_FETCH_ERROR');
  assert.strictEqual(error.url, 'https://example.com');
  assert.strictEqual(error.reason, 'Network timeout');
});

test('URLFetchError - includes url and reason in details', () => {
  const error = new URLFetchError('https://example.com', '404 Not Found');
  assert.strictEqual(error.details.url, 'https://example.com');
  assert.strictEqual(error.details.reason, '404 Not Found');
});

test('URLFetchError - serializes to JSON', () => {
  const error = new URLFetchError('https://example.com', 'DNS error');
  const json = error.toJSON();
  assert.strictEqual(json.name, 'URLFetchError');
  assert.strictEqual(json.code, 'URL_FETCH_ERROR');
  assert.strictEqual(json.details.url, 'https://example.com');
  assert.strictEqual(json.details.reason, 'DNS error');
});

// FileAccessError tests
test('FileAccessError - creates with path and reason', () => {
  const error = new FileAccessError('/path/to/file.txt', 'Permission denied');
  assert.strictEqual(error.name, 'FileAccessError');
  assert.strictEqual(error.code, 'FILE_ACCESS_ERROR');
  assert.strictEqual(error.path, '/path/to/file.txt');
  assert.strictEqual(error.reason, 'Permission denied');
});

test('FileAccessError - includes path and reason in details', () => {
  const error = new FileAccessError('src/index.ts', 'File not found');
  assert.strictEqual(error.details.path, 'src/index.ts');
  assert.strictEqual(error.details.reason, 'File not found');
});

test('FileAccessError - serializes to JSON', () => {
  const error = new FileAccessError('config.json', 'Invalid JSON');
  const json = error.toJSON();
  assert.strictEqual(json.name, 'FileAccessError');
  assert.strictEqual(json.code, 'FILE_ACCESS_ERROR');
  assert.strictEqual(json.details.path, 'config.json');
  assert.strictEqual(json.details.reason, 'Invalid JSON');
});

// SecurityScanError tests
test('SecurityScanError - creates with findings array', () => {
  const findings = [
    { type: 'script_tag', severity: 'high' },
    { type: 'event_handler', severity: 'medium' }
  ];
  const error = new SecurityScanError(findings);
  assert.strictEqual(error.name, 'SecurityScanError');
  assert.strictEqual(error.code, 'SECURITY_SCAN_ERROR');
  assert.strictEqual(error.findings.length, 2);
});

test('SecurityScanError - includes findings in details', () => {
  const findings = [{ type: 'xss_vector', pattern: '<script>' }];
  const error = new SecurityScanError(findings);
  assert.strictEqual(error.details.findings.length, 1);
  assert.strictEqual(error.details.findings[0].type, 'xss_vector');
});

test('SecurityScanError - serializes to JSON', () => {
  const findings = [{ type: 'javascript_url', severity: 'high' }];
  const error = new SecurityScanError(findings);
  const json = error.toJSON();
  assert.strictEqual(json.name, 'SecurityScanError');
  assert.strictEqual(json.code, 'SECURITY_SCAN_ERROR');
  assert.ok(Array.isArray(json.details.findings));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
