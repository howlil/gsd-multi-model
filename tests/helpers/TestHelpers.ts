/**
 * TestHelpers - Utility functions for test operations
 *
 * Provides common utility functions for file operations, command execution,
 * and test assertions. Use these to reduce duplication in test files.
 *
 * @example
 * ```typescript
 * // Create a temporary test file
 * const filePath = TestHelpers.createTestFile('test.txt', 'content');
 *
 * // Create a temporary directory with files
 * const dirPath = TestHelpers.createTestDirectory(new Map([
 *   ['file1.txt', 'content1'],
 *   ['file2.txt', 'content2']
 * ]));
 *
 * // Assert file exists
 * TestHelpers.assertFileExists(filePath);
 *
 * // Assert file contains text
 * TestHelpers.assertFileContains(filePath, 'expected text');
 * ```
 */

import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

/**
 * Create a temporary test file with content
 * @param filename - Name of the file to create
 * @param content - Content to write to the file
 * @param dir - Optional directory (defaults to temp dir)
 * @returns Full path to the created file
 */
export function createTestFile(filename: string, content: string, dir?: string): string {
  const targetDir = dir || fs.mkdtempSync(path.join(os.tmpdir(), 'ez-test-'));
  const filePath = path.join(targetDir, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Create a temporary directory with multiple files
 * @param files - Map of filename to content
 * @returns Path to the created directory
 */
export function createTestDirectory(files: Map<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ez-test-'));

  for (const [filename, content] of files.entries()) {
    const filePath = path.join(dir, filename);
    // Create parent directories if needed
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return dir;
}

/**
 * Run a shell command and capture output
 * @param cmd - Command to execute
 * @param cwd - Working directory
 * @returns Object with success status and output
 */
export function runCommand(cmd: string, cwd: string): { success: boolean; output: string; error?: string } {
  try {
    const output = execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { success: true, output: output.trim() };
  } catch (err) {
    const error = err as Error & { stdout?: Buffer; stderr?: Buffer };
    return {
      success: false,
      output: error.stdout?.toString().trim() || '',
      error: error.stderr?.toString().trim() || error.message
    };
  }
}

/**
 * Assert that a file exists
 * @param filePath - Path to the file
 * @param message - Optional error message
 */
export function assertFileExists(filePath: string, message?: string): void {
  assert.ok(fs.existsSync(filePath), message || `Expected file to exist: ${filePath}`);
}

/**
 * Assert that a file does not exist
 * @param filePath - Path to the file
 * @param message - Optional error message
 */
export function assertFileNotExists(filePath: string, message?: string): void {
  assert.ok(!fs.existsSync(filePath), message || `Expected file to not exist: ${filePath}`);
}

/**
 * Assert that a file contains specific text
 * @param filePath - Path to the file
 * @param expected - Text to search for
 * @param message - Optional error message
 */
export function assertFileContains(filePath: string, expected: string, message?: string): void {
  assert.ok(fs.existsSync(filePath), `File does not exist: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  assert.ok(content.includes(expected), message || `Expected file to contain '${expected}'`);
}

/**
 * Assert that a file does not contain specific text
 * @param filePath - Path to the file
 * @param unexpected - Text to search for
 * @param message - Optional error message
 */
export function assertFileNotContains(filePath: string, unexpected: string, message?: string): void {
  assert.ok(fs.existsSync(filePath), `File does not exist: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  assert.ok(!content.includes(unexpected), message || `Expected file to not contain '${unexpected}'`);
}

/**
 * Read file content
 * @param filePath - Path to the file
 * @returns File content as string
 */
export function readFileContent(filePath: string): string {
  assert.ok(fs.existsSync(filePath), `File does not exist: ${filePath}`);
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Delete a file or directory
 * @param filePath - Path to delete
 * @param recursive - Whether to delete recursively (for directories)
 */
export function deletePath(filePath: string, recursive: boolean = false): void {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { recursive, force: true });
  }
}

/**
 * Check if a directory is empty
 * @param dirPath - Path to the directory
 * @returns True if directory is empty or doesn't exist
 */
export function isDirectoryEmpty(dirPath: string): boolean {
  if (!fs.existsSync(dirPath)) {
    return true;
  }
  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) {
    return false;
  }
  const files = fs.readdirSync(dirPath);
  return files.length === 0;
}

/**
 * Wait for a condition to be true with timeout
 * @param condition - Function returning boolean
 * @param timeoutMs - Timeout in milliseconds
 * @param intervalMs - Check interval in milliseconds
 * @returns Promise that resolves when condition is true
 * @throws Error if timeout is reached
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const result = await Promise.resolve(condition());
    if (result) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Generate a unique ID for tests
 * @param prefix - Optional prefix for the ID
 * @returns Unique ID string
 */
export function generateUniqueId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
