/**
 * TestRunner - Test execution utility with chainable API
 *
 * Provides a fluent API for running tests and test suites.
 * Useful for programmatic test execution and reporting.
 *
 * @example
 * ```typescript
 * const runner = new TestRunner();
 *
 * // Run a single test
 * const result = await runner
 *   .setup(() => initialize())
 *   .teardown(() => cleanup())
 *   .timeout(5000)
 *   .runTest('should work', async () => {
 *     // test logic
 *   });
 *
 * // Run a test suite
 * const suiteResult = await runner.runSuite('My Suite', [
 *   { name: 'test 1', fn: () => {...} },
 *   { name: 'test 2', fn: () => {...} }
 * ]);
 * ```
 */

/**
 * Result of a single test execution
 */
export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: Error;
}

/**
 * Result of a test suite execution
 */
export interface SuiteResult {
  name: string;
  results: TestResult[];
  passed: boolean;
  totalDuration: number;
}

/**
 * Test function type
 */
export type TestFn = () => void | Promise<void>;

/**
 * Setup/teardown function type
 */
export type SetupFn = () => void | Promise<void>;

export class TestRunner {
  /**
   * Setup function to run before tests
   */
  private setupFn: SetupFn | null = null;

  /**
   * Teardown function to run after tests
   */
  private teardownFn: SetupFn | null = null;

  /**
   * Timeout in milliseconds
   */
  private timeoutMs: number = 30000;

  /**
   * Set the setup function
   * @param fn - Setup function to run before tests
   * @returns This instance for chaining
   */
  setup(fn: SetupFn): this {
    this.setupFn = fn;
    return this;
  }

  /**
   * Set the teardown function
   * @param fn - Teardown function to run after tests
   * @returns This instance for chaining
   */
  teardown(fn: SetupFn): this {
    this.teardownFn = fn;
    return this;
  }

  /**
   * Set the test timeout
   * @param ms - Timeout in milliseconds
   * @returns This instance for chaining
   */
  timeout(ms: number): this {
    this.timeoutMs = ms;
    return this;
  }

  /**
   * Run a single test
   * @param name - Test name
   * @param fn - Test function
   * @returns Test result
   */
  async runTest(name: string, fn: TestFn): Promise<TestResult> {
    const start = Date.now();
    let passed = true;
    let error: Error | undefined;

    try {
      // Run setup if provided
      if (this.setupFn) {
        await Promise.resolve(this.setupFn());
      }

      // Run test with timeout
      await Promise.race([
        Promise.resolve(fn()),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Test timeout after ${this.timeoutMs}ms`)), this.timeoutMs)
        )
      ]);
    } catch (err) {
      passed = false;
      error = err instanceof Error ? err : new Error(String(err));
    } finally {
      // Run teardown if provided
      if (this.teardownFn) {
        try {
          await Promise.resolve(this.teardownFn());
        } catch (teardownErr) {
          // Log teardown error but don't fail the test
          console.error('Teardown error:', teardownErr);
        }
      }
    }

    const duration = Date.now() - start;

    return {
      name,
      passed,
      duration,
      error
    };
  }

  /**
   * Run a test suite
   * @param name - Suite name
   * @param tests - Array of test definitions
   * @returns Suite result
   */
  async runSuite(name: string, tests: Array<{ name: string; fn: TestFn }>): Promise<SuiteResult> {
    const results: TestResult[] = [];
    let totalDuration = 0;

    for (const test of tests) {
      const result = await this.runTest(test.name, test.fn);
      results.push(result);
      totalDuration += result.duration;
    }

    const passed = results.every(r => r.passed);

    return {
      name,
      results,
      passed,
      totalDuration
    };
  }

  /**
   * Reset the runner state
   */
  reset(): void {
    this.setupFn = null;
    this.teardownFn = null;
    this.timeoutMs = 30000;
  }
}
