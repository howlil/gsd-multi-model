/**
 * EZ Agents Test Utilities
 *
 * Shared test helpers to avoid duplication across test files.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface TestCounters {
  pass: () => void;
  fail: () => void;
  getPassed: () => number;
  getFailed: () => number;
}

export interface TestStats {
  passed: number;
  failed: number;
}

// ─── Module-level counters for test tracking ─────────────────────────────────

let _passed = 0;
let _failed = 0;

// ─── Functions ───────────────────────────────────────────────────────────────

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
 * @returns True if test passed, false otherwise
 */
export function test(name: string, fn: () => void, counters: TestCounters | null = null): boolean {
  try {
    fn();
    console.log(`✓ ${name}`);
    if (counters && counters.pass) counters.pass();
    _passed++;
    return true;
  } catch (err) {
    const error = err as Error;
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    if (counters && counters.fail) counters.fail();
    _failed++;
    return false;
  }
}

/**
 * Get current test statistics.
 * @returns Object with passed and failed counts
 */
export function getTestStats(): TestStats {
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
 * @returns Promise that resolves when tests complete
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
      const error = err as Error;
      console.error(`  Unexpected error: ${error.message}`);
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
 * @returns Promise that resolves when tests complete
 */
export async function runTestsWithCounters(testFn: (context: TestCounters) => Promise<void>): Promise<void> {
  let passed = 0;
  let failed = 0;

  const context: TestCounters = {
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
