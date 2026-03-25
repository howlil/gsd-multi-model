/**
 * Test Helpers - Barrel Export
 *
 * Central import point for all test helpers and utilities.
 *
 * @example
 * ```typescript
 * import {
 *   TestFixture,
 *   TestContext,
 *   MockFactory,
 *   TestDataBuilder,
 *   AgentBuilder,
 *   PhaseBuilder,
 *   SkillBuilder,
 *   SessionBuilder,
 *   AssertionHelper,
 *   TestHelpers
 * } from '../helpers';
 * ```
 */

// Core test fixtures
export { TestFixture } from './Fixture.js';

// State management
export { TestContext } from './TestContext.js';

// Mock creation
export { MockFactory } from './MockFactory.js';

// Test data builders
export {
  AgentBuilder,
  PhaseBuilder,
  SkillBuilder,
  SessionBuilder
} from './TestDataBuilder.js';

// Assertion helpers
export { AssertionHelper } from './AssertionHelper.js';

// Utility functions
export {
  createTestFile,
  createTestDirectory,
  runCommand,
  assertFileExists,
  assertFileNotExists,
  assertFileContains,
  assertFileNotContains,
  readFileContent,
  deletePath,
  isDirectoryEmpty,
  waitForCondition,
  generateUniqueId
} from './TestHelpers.js';

// Legacy helpers (re-export from root helpers.ts)
export {
  runEzTools,
  createTempProject,
  createTempGitProject,
  cleanup,
  EZ_TOOLS_PATH_CONST,
  type EzToolsResult
} from '../helpers.js';
