#!/usr/bin/env node

/**
 * Unit tests for File Access Service
 */

import assert from 'node:assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

import FileAccessService from '../../bin/lib/file-access.js';
import { FileAccessError } from '../../bin/lib/context-errors.js';

let passed = 0;
let failed = 0;

// Create a temporary test directory
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ez-file-access-test-'));

// Create test files
function setupTestFiles() {
  // Create directory structure
  fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(testDir, 'src', 'utils'), { recursive: true });
  fs.mkdirSync(path.join(testDir, 'docs'), { recursive: true });
  fs.mkdirSync(path.join(testDir, '.hidden'), { recursive: true });
  
  // Create test files
  fs.writeFileSync(path.join(testDir, 'README.md'), '# Test Project\n\nThis is a test.');
  fs.writeFileSync(path.join(testDir, 'package.json'), '{"name": "test"}');
  fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), 'export const app = "test";');
  fs.writeFileSync(path.join(testDir, 'src', 'main.ts'), 'import { app } from "./index";');
  fs.writeFileSync(path.join(testDir, 'src', 'utils', 'helper.ts'), 'export function help() {}');
  fs.writeFileSync(path.join(testDir, 'src', 'test.ts'), 'console.log("test");');
  fs.writeFileSync(path.join(testDir, 'docs', 'guide.md'), '# Guide\n\nDocumentation content.');
  fs.writeFileSync(path.join(testDir, '.hidden', 'secret.txt'), 'secret content');
}

// Clean up test directory
function cleanupTestFiles() {
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup errors
  }
}

setupTestFiles();

const fileAccess = new FileAccessService(testDir);

// Basic file reading tests
test('FileAccessService - reads single file', () => {
  const results = fileAccess.readFiles('README.md');
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].path, 'README.md');
  assert.ok(results[0].content.includes('# Test Project'));
});

test('FileAccessService - reads file with nested path', () => {
  const results = fileAccess.readFiles('src/index.ts');
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].path, 'src/index.ts');
  assert.ok(results[0].content.includes('export const app'));
});

// Glob pattern tests
test('FileAccessService - supports glob patterns', () => {
  const results = fileAccess.readFiles('src/**/*.ts');
  assert.ok(results.length >= 3);
  const paths = results.map(r => r.path);
  assert.ok(paths.some(p => p === 'src/index.ts'));
  assert.ok(paths.some(p => p === 'src/main.ts'));
  assert.ok(paths.some(p => p === 'src/utils/helper.ts'));
});

test('FileAccessService - supports brace expansion', () => {
  const results = fileAccess.readFiles('*.{md,json}');
  assert.strictEqual(results.length, 2);
  const paths = results.map(r => r.path);
  assert.ok(paths.includes('README.md'));
  assert.ok(paths.includes('package.json'));
});

test('FileAccessService - supports negation patterns', () => {
  const results = fileAccess.readFiles(['src/**/*.ts', '!src/test.ts']);
  const paths = results.map(r => r.path);
  assert.ok(!paths.includes('src/test.ts'));
  assert.ok(paths.includes('src/index.ts'));
});

test('FileAccessService - excludes hidden directories', () => {
  const results = fileAccess.readFiles('**/*');
  const paths = results.map(r => r.path);
  assert.ok(!paths.some(p => p.includes('.hidden')));
});

test('FileAccessService - reads from nested directories', () => {
  const results = fileAccess.readFiles('docs/*.md');
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].path, 'docs/guide.md');
  assert.ok(results[0].content.includes('# Guide'));
});

// Path normalization tests
test('FileAccessService - normalizePath converts backslashes', () => {
  const normalized = fileAccess.normalizePath('src\\index.ts');
  assert.strictEqual(normalized, 'src/index.ts');
});

test('FileAccessService - normalizePath rejects path traversal', () => {
  let threw = false;
  try {
    fileAccess.normalizePath('../secret.txt');
  } catch (err) {
    threw = true;
    assert.ok(err instanceof FileAccessError);
  }
  assert.strictEqual(threw, true);
});

// Path validation tests
test('FileAccessService - validatePath returns true for valid relative paths', () => {
  assert.strictEqual(fileAccess.validatePath('src/index.ts'), true);
  assert.strictEqual(fileAccess.validatePath('README.md'), true);
});

test('FileAccessService - validatePath returns false for paths with null bytes', () => {
  assert.strictEqual(fileAccess.validatePath('src\x00index.ts'), false);
});

test('FileAccessService - validatePath returns false for absolute paths outside cwd', () => {
  // Try to access a path outside the test directory
  const outsidePath = path.join(os.tmpdir(), '..', '..', 'etc', 'passwd');
  assert.strictEqual(fileAccess.validatePath(outsidePath), false);
});

// File existence tests
test('FileAccessService - fileExists returns true for existing files', () => {
  assert.strictEqual(fileAccess.fileExists('README.md'), true);
});

test('FileAccessService - fileExists returns false for missing files', () => {
  assert.strictEqual(fileAccess.fileExists('nonexistent.txt'), false);
});

// Single file read test
test('FileAccessService - readFile returns file object', () => {
  const result = fileAccess.readFile('package.json');
  assert.ok(result);
  assert.strictEqual(result.path, 'package.json');
  assert.ok(result.content.includes('"name": "test"'));
});

test('FileAccessService - readFile returns null for missing files', () => {
  const result = fileAccess.readFile('missing.txt');
  assert.strictEqual(result, null);
});

// File info test
test('FileAccessService - getFileInfo returns file metadata', () => {
  const info = fileAccess.getFileInfo('README.md');
  assert.strictEqual(info.path, 'README.md');
  assert.ok(info.size > 0);
  assert.ok(info.mtime instanceof Date);
  assert.strictEqual(info.isFile, true);
  assert.strictEqual(info.isDirectory, false);
});

// Max file count test
test('FileAccessService - throws error when max file count exceeded', () => {
  // Create many test files
  for (let i = 0; i < 1001; i++) {
    fs.writeFileSync(path.join(testDir, `file${i}.txt`), `content ${i}`);
  }
  
  let threw = false;
  try {
    fileAccess.readFiles('*.txt');
  } catch (err) {
    threw = true;
    assert.ok(err instanceof FileAccessError);
    assert.ok(err.message.includes('Max file count exceeded'));
  }
  assert.strictEqual(threw, true);
});

// Error handling tests
test('FileAccessService - returns empty array for non-matching patterns', () => {
  const results = fileAccess.readFiles('nonexistent-file-xyz.txt');
  assert.strictEqual(results.length, 0);
});

// Cleanup
cleanupTestFiles();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
