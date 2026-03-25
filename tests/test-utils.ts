/**
 * EZ Agents Test Utilities
 *
 * Shared test helpers to avoid duplication across test files.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Module-level counters for test tracking
let _passed = 0;
let _failed = 0;

/**
 * Create a temporary directory for testing.
 * @returns Path to the created temporary directory
 */
export function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ez-test-'));
}

/**
 * Clean up a temporary directory.
 * @param dir - Path to the directory to remove
 */
export function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Simple test runner helper.
 * @param name - Test name/description
 * @param fn - Test function to execute
 * @param counters - Optional counter object with pass/fail methods
 */
export function test(name: string, fn: () => void, counters: { pass?: () => void; fail?: () => void } | null = null): boolean {
  try {
    fn();
    console.log(`✓ ${name}`);
    if (counters?.pass) counters.pass();
    _passed++;
    return true;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`✗ ${name}`);
    console.error(`  Error: ${errorMessage}`);
    if (counters?.fail) counters.fail();
    _failed++;
    return false;
  }
}

/**
 * Get current test statistics.
 * @returns Object with passed and failed counts
 */
export function getTestStats(): { passed: number; failed: number } {
  return { passed: _passed, failed: _failed };
}

/**
 * Reset test counters.
 */
export function resetTestCounters(): void {
  _passed = 0;
  _failed = 0;
}

/**
 * Run all tests and report results.
 * @param testFns - Array of test functions that return pass/fail counts
 */
export async function runTests(testFns: Array<() => Promise<boolean> | boolean>): Promise<void> {
  let passed = 0;
  let failed = 0;

  for (const testFn of testFns) {
    try {
      const result = await testFn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`  Unexpected error: ${errorMessage}`);
      failed++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

/**
 * Run tests with a custom summary format (for compatibility with existing tests).
 * @param testFn - Test function that manages its own pass/fail counters
 */
export async function runTestsWithCounters(testFn: (context: {
  pass: () => void;
  fail: () => void;
  getPassed: () => number;
  getFailed: () => number;
}) => Promise<void>): Promise<void> {
  let passed = 0;
  let failed = 0;

  const context = {
    pass: () => { passed++; },
    fail: () => { failed++; },
    getPassed: () => passed,
    getFailed: () => failed
  };

  try {
    await testFn(context);
  } finally {
    console.log(`\n=== Summary ===`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
      process.exit(1);
    }
  }
}
