/**
 * AssertionHelper - Reusable assertion patterns for tests
 *
 * Provides common assertion utilities to reduce duplication across test files.
 * Works with node:assert and vitest expect.
 *
 * @example
 * ```typescript
 * // Check object has required properties
 * AssertionHelper.expectToHaveProperties(user, ['id', 'name', 'email']);
 *
 * // Check function completes within time limit
 * AssertionHelper.expectToCompleteInTime(() => slowOperation(), 1000);
 *
 * // Check value matches expected schema
 * AssertionHelper.expectToBeValidSchema(data, { id: 'string', name: 'string' });
 * ```
 */

import assert from 'node:assert';

export class AssertionHelper {
  /**
   * Assert that an object has all specified properties
   * @param obj - The object to check
   * @param properties - Array of property names that must exist
   * @throws AssertionError if any property is missing
   */
  static expectToHaveProperties<T extends object>(obj: T, properties: (keyof T)[]): void {
    for (const prop of properties) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(obj, prop),
        `Expected object to have property '${String(prop)}'`
      );
    }
  }

  /**
   * Assert that a value matches an expected schema (basic type checking)
   * @param obj - The value to validate
   * @param schema - Expected schema as { key: type } map
   * @throws AssertionError if schema doesn't match
   */
  static expectToBeValidSchema(obj: any, schema: Record<string, string>): void {
    assert.ok(obj, 'Expected object to be truthy');
    assert.equal(typeof obj, 'object', 'Expected obj to be an object');

    for (const [key, expectedType] of Object.entries(schema)) {
      assert.ok(key in obj, `Expected object to have property '${key}'`);
      const actualType = typeof obj[key];
      assert.equal(actualType, expectedType, `Expected '${key}' to be ${expectedType}, got ${actualType}`);
    }
  }

  /**
   * Assert that a function completes within a specified time
   * @param fn - The function to execute
   * @param maxMs - Maximum execution time in milliseconds
   * @throws AssertionError if function takes too long
   */
  static expectToCompleteInTime(fn: () => void | Promise<void>, maxMs: number): void {
    const start = Date.now();
    const result = fn();

    if (result instanceof Promise) {
      throw new Error('expectToCompleteInTime does not support async functions. Use expectToCompleteInTimeAsync instead.');
    }

    const duration = Date.now() - start;
    assert.ok(
      duration <= maxMs,
      `Expected function to complete in ${maxMs}ms, but took ${duration}ms`
    );
  }

  /**
   * Assert that an async function completes within a specified time
   * @param fn - The async function to execute
   * @param maxMs - Maximum execution time in milliseconds
   * @throws AssertionError if function takes too long
   */
  static async expectToCompleteInTimeAsync(fn: () => Promise<void>, maxMs: number): Promise<void> {
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    assert.ok(
      duration <= maxMs,
      `Expected function to complete in ${maxMs}ms, but took ${duration}ms`
    );
  }

  /**
   * Assert that a value is not null or undefined
   * @param value - The value to check
   * @param message - Optional error message
   */
  static expectToBeDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
    assert.ok(value !== null && value !== undefined, message || 'Expected value to be defined');
  }

  /**
   * Assert that a value is exactly equal to expected (strict equality)
   * @param actual - The actual value
   * @param expected - The expected value
   * @param message - Optional error message
   */
  static expectToBeEqual<T>(actual: T, expected: T, message?: string): void {
    assert.strictEqual(actual, expected, message);
  }

  /**
   * Assert that a value is deeply equal to expected (structural equality)
   * @param actual - The actual value
   * @param expected - The expected value
   * @param message - Optional error message
   */
  static expectToBeDeepEqual<T>(actual: T, expected: T, message?: string): void {
    assert.deepStrictEqual(actual, expected, message);
  }

  /**
   * Assert that a function throws an error
   * @param fn - The function to execute
   * @param expectedError - Expected error message or constructor
   * @param message - Optional error message
   */
  static expectToThrow(
    fn: () => void,
    expectedError?: string | ErrorConstructor,
    message?: string
  ): void {
    if (typeof expectedError === 'string') {
      assert.throws(fn, (err: Error) => {
        assert.ok(err.message.includes(expectedError), `Expected message to include '${expectedError}'`);
        return true;
      }, message);
    } else if (expectedError) {
      assert.throws(fn, expectedError, message);
    } else {
      assert.throws(fn, undefined, message);
    }
  }

  /**
   * Assert that an array is not empty
   * @param arr - The array to check
   * @param message - Optional error message
   */
  static expectToBeNonEmpty<T>(arr: T[], message?: string): void {
    assert.ok(Array.isArray(arr), message || 'Expected value to be an array');
    assert.ok(arr.length > 0, message || 'Expected array to be non-empty');
  }

  /**
   * Assert that an array has a specific length
   * @param arr - The array to check
   * @param length - Expected length
   * @param message - Optional error message
   */
  static expectToHaveLength<T>(arr: T[], length: number, message?: string): void {
    assert.ok(Array.isArray(arr), message || 'Expected value to be an array');
    assert.strictEqual(arr.length, length, message);
  }

  /**
   * Assert that a string contains a substring
   * @param str - The string to search
   * @param substring - The substring to find
   * @param message - Optional error message
   */
  static expectToContain(str: string, substring: string, message?: string): void {
    assert.ok(str.includes(substring), message || `Expected string to contain '${substring}'`);
  }

  /**
   * Assert that a value is within a range
   * @param value - The value to check
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (inclusive)
   * @param message - Optional error message
   */
  static expectToBeInRange(value: number, min: number, max: number, message?: string): void {
    assert.ok(
      value >= min && value <= max,
      message || `Expected ${value} to be between ${min} and ${max}`
    );
  }
}
