/**
 * EZ Agents Test Setup
 *
 * Global test helpers and utilities for vitest.
 * This file is loaded before all tests via vitest.config.ts setupFiles.
 */

import * as helpers from './helpers.js';
import * as fs from 'fs';

// Enable analytics for testing
process.env.EZ_ANALYTICS_ENABLED = 'true';

// Declare global test helpers
declare global {
  var createTempProject: typeof helpers.createTempProject;
  var createTempGitProject: typeof helpers.createTempGitProject;
  var cleanup: typeof helpers.cleanup;
  var runEzTools: typeof helpers.runEzTools;
  var createTempDir: typeof import('./test-utils.js').createTempDir;
  var cleanupTempDir: typeof import('./test-utils.js').cleanupTempDir;
  var fs: typeof import('fs');
  }

// Assign globals
globalThis.createTempProject = helpers.createTempProject;
globalThis.createTempGitProject = helpers.createTempGitProject;
globalThis.cleanup = helpers.cleanup;
globalThis.runEzTools = helpers.runEzTools;

// Import from test-utils for createTempDir and cleanupTempDir
const testUtils = await import('./test-utils.js');
globalThis.createTempDir = testUtils.createTempDir;
globalThis.cleanupTempDir = testUtils.cleanupTempDir;
globalThis.fs = fs;

// Assign vitest globals
globalThis.describe = describe;
globalThis.test = test;
globalThis.it = it;
globalThis.expect = expect;
globalThis.beforeEach = beforeEach;
globalThis.afterEach = afterEach;
globalThis.beforeAll = beforeAll;
globalThis.afterAll = afterAll;

// Export error type guards for use in tests
export function isErrorWithCode(err: unknown): err is Error & { code: string } {
  return err instanceof Error && 'code' in err && typeof err.code === 'string';
}

export function assertError(err: unknown): asserts err is Error {
  if (!(err instanceof Error)) {
    throw new Error(`Expected Error but got ${typeof err}`);
  }
}
