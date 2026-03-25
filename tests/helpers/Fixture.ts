/**
 * TestFixture - Abstract base class for test setup and teardown
 *
 * Provides a standardized OOP pattern for test lifecycle management.
 * Extend this class and implement setUp() and tearDown() methods.
 *
 * @template TContext - Type of context object shared across tests
 *
 * @example
 * ```typescript
 * class MyTestFixture extends TestFixture<{ db: Database }> {
 *   async setUp() {
 *     this.context.db = await createTestDatabase();
 *   }
 *
 *   async tearDown() {
 *     await this.context.db.destroy();
 *   }
 * }
 * ```
 */
export abstract class TestFixture<TContext = any> {
  /**
   * Shared context object for test state
   */
  protected context: TContext;

  /**
   * Creates a new TestFixture instance
   */
  constructor() {
    this.context = {} as TContext;
  }

  /**
   * Setup method called before each test
   * Override this method to implement custom setup logic
   */
  abstract setUp(): Promise<void> | void;

  /**
   * Teardown method called after each test
   * Override this method to implement custom cleanup logic
   */
  abstract tearDown(): Promise<void> | void;

  /**
   * Common before-each logic
   * Called automatically by test framework if using vitest integration
   */
  protected beforeEach(): void {
    // Reset context before each test
    this.context = {} as TContext;
  }

  /**
   * Common after-each logic
   * Called automatically by test framework if using vitest integration
   */
  protected afterEach(): void {
    // Cleanup is handled by tearDown
  }

  /**
   * Get the current context
   * @returns The shared context object
   */
  protected getContext(): TContext {
    return this.context;
  }

  /**
   * Set the context
   * @param context - The new context object
   */
  protected setContext(context: TContext): void {
    this.context = context;
  }
}
