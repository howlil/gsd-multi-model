#!/usr/bin/env node

/**
 * Unit tests for Content Security Scanner
 */

import assert from 'node:assert';

import ContentSecurityScanner from '../../bin/lib/content-scanner.js';
import { SecurityScanError } from '../../bin/lib/context-errors.js';

let passed = 0;
let failed = 0;

const scanner = new ContentSecurityScanner();

// Script tag detection tests
test('scan detects opening script tags', () => {
  const result = scanner.scan('<script>alert("XSS")</script>');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'script_tag_open'));
});

test('scan detects closing script tags', () => {
  const result = scanner.scan('</script>');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'script_tag_close'));
});

test('scan detects script tags with attributes', () => {
  const result = scanner.scan('<script src="evil.js" type="text/javascript">');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'script_tag_open'));
});

// JavaScript URL detection tests
test('scan detects javascript: URLs', () => {
  const result = scanner.scan('javascript:alert(1)');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'javascript_url'));
});

test('scan detects javascript: with trailing spaces', () => {
  const result = scanner.scan('javascript :alert(1)');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'javascript_url'));
});

test('scan detects vbscript: URLs', () => {
  const result = scanner.scan('vbscript:msgbox(1)');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'vbscript_url'));
});

test('scan detects data: URLs with HTML', () => {
  const result = scanner.scan('data:text/html,<script>alert(1)</script>');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'data_html_url'));
});

// Event handler detection tests
test('scan detects onclick handlers', () => {
  const result = scanner.scan('<div onclick="alert(1)">Click</div>');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'event_handler'));
});

test('scan detects onerror handlers', () => {
  const result = scanner.scan('<img src="x" onerror="alert(1)">');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'event_handler'));
});

test('scan detects onload handlers', () => {
  const result = scanner.scan('<body onload="alert(1)">');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'event_handler'));
});

// Dangerous tag detection tests
test('scan detects iframe tags', () => {
  const result = scanner.scan('<iframe src="evil.com"></iframe>');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'iframe_tag'));
});

test('scan detects embed tags', () => {
  const result = scanner.scan('<embed src="evil.swf">');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'embed_tag'));
});

test('scan detects object tags', () => {
  const result = scanner.scan('<object data="evil.swf"></object>');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'object_tag'));
});

test('scan detects svg tags', () => {
  const result = scanner.scan('<svg onload="alert(1)"></svg>');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'svg_tag'));
});

// Size limit tests
test('scan rejects content over 1MB', () => {
  const largeContent = 'a'.repeat(1048577); // 1MB + 1 byte
  const result = scanner.scan(largeContent);
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'size_limit'));
});

// Binary content type tests
test('scan rejects application/octet-stream', () => {
  const result = scanner.scan('binary data', 'application/octet-stream');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'binary_content'));
});

test('scan rejects image/* content types', () => {
  const result = scanner.scan('image data', 'image/png');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'binary_content'));
});

test('scan rejects video/* content types', () => {
  const result = scanner.scan('video data', 'video/mp4');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'binary_content'));
});

test('scan rejects audio/* content types', () => {
  const result = scanner.scan('audio data', 'audio/mp3');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'binary_content'));
});

// Clean content tests
test('scan allows clean HTML content', () => {
  const result = scanner.scan('<p>Hello World</p><div>Safe content</div>');
  assert.strictEqual(result.safe, true);
  assert.strictEqual(result.findings.length, 0);
});

test('scan allows plain text content', () => {
  const result = scanner.scan('This is just plain text content.');
  assert.strictEqual(result.safe, true);
  assert.strictEqual(result.findings.length, 0);
});

test('scan allows markdown content', () => {
  const result = scanner.scan('# Heading\n\nThis is **markdown** content.');
  assert.strictEqual(result.safe, true);
  assert.strictEqual(result.findings.length, 0);
});

// getSeverity tests
test('getSeverity returns high for script_tag_open', () => {
  assert.strictEqual(scanner.getSeverity('script_tag_open'), 'high');
});

test('getSeverity returns high for javascript_url', () => {
  assert.strictEqual(scanner.getSeverity('javascript_url'), 'high');
});

test('getSeverity returns medium for event_handler', () => {
  assert.strictEqual(scanner.getSeverity('event_handler'), 'medium');
});

test('getSeverity returns medium for iframe_tag', () => {
  assert.strictEqual(scanner.getSeverity('iframe_tag'), 'medium');
});

test('getSeverity returns low for unknown patterns', () => {
  assert.strictEqual(scanner.getSeverity('unknown_pattern'), 'low');
});

// isSafe convenience method tests
test('isSafe returns true for clean content', () => {
  assert.strictEqual(scanner.isSafe('<p>Safe</p>'), true);
});

test('isSafe returns false for XSS content', () => {
  assert.strictEqual(scanner.isSafe('<script>alert(1)</script>'), false);
});

// validate method tests
test('validate throws SecurityScanError for unsafe content', () => {
  let threw = false;
  try {
    scanner.validate('<script>alert(1)</script>');
  } catch (err) {
    threw = true;
    assert.ok(err instanceof SecurityScanError);
  }
  assert.strictEqual(threw, true);
});

test('validate returns result for safe content', () => {
  const result = scanner.validate('<p>Safe content</p>');
  assert.strictEqual(result.safe, true);
});

// Additional XSS pattern tests
test('scan detects img onerror XSS', () => {
  const result = scanner.scan('<img src="x" onerror="alert(document.cookie)">');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'img_onerror'));
});

test('scan detects CSS expression', () => {
  const result = scanner.scan('style="width: expression(alert(1))"');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'expression_css'));
});

test('scan detects eval() calls', () => {
  const result = scanner.scan('eval(userInput)');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'eval_call'));
});

test('scan detects document.cookie access', () => {
  const result = scanner.scan('var cookies = document.cookie');
  assert.strictEqual(result.safe, false);
  assert.ok(result.findings.some(f => f.type === 'document_cookie'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
