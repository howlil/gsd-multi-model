/**
 * TestContext - Shared state management for tests
 *
 * Provides a centralized way to manage test state with snapshot/restore capabilities.
 * Useful for tests that need to modify and revert state.
 *
 * @example
 * ```typescript
 * const ctx = new TestContext();
 *
 * // Set and get values
 * ctx.set('userId', '123');
 * const userId = ctx.get<string>('userId');
 *
 * // Snapshot and restore
 * ctx.snapshot('before-change');
 * ctx.set('userId', '456');
 * ctx.restore('before-change'); // userId is back to '123'
 * ```
 */
export class TestContext {
  /**
   * Internal state storage
   */
  private state: Map<string, any>;

  /**
   * State snapshots for restore functionality
   */
  private snapshots: Map<string, Map<string, any>>;

  /**
   * Creates a new TestContext instance
   */
  constructor() {
    this.state = new Map<string, any>();
    this.snapshots = new Map<string, Map<string, any>>();
  }

  /**
   * Set a value in the context
   * @param key - The key to store the value under
   * @param value - The value to store
   */
  set<T>(key: string, value: T): void {
    this.state.set(key, value);
  }

  /**
   * Get a value from the context
   * @param key - The key to retrieve
   * @returns The stored value, or undefined if not found
   */
  get<T>(key: string): T | undefined {
    return this.state.get(key) as T | undefined;
  }

  /**
   * Check if a key exists in the context
   * @param key - The key to check
   * @returns True if the key exists
   */
  has(key: string): boolean {
    return this.state.has(key);
  }

  /**
   * Delete a value from the context
   * @param key - The key to delete
   * @returns True if the key was deleted
   */
  delete(key: string): boolean {
    return this.state.delete(key);
  }

  /**
   * Create a snapshot of the current state
   * @param key - Name for the snapshot
   */
  snapshot(key: string): void {
    const snapshot = new Map<string, any>(this.state);
    this.snapshots.set(key, snapshot);
  }

  /**
   * Restore state from a snapshot
   * @param key - Name of the snapshot to restore
   * @throws Error if snapshot doesn't exist
   */
  restore(key: string): void {
    const snapshot = this.snapshots.get(key);
    if (!snapshot) {
      throw new Error(`Snapshot '${key}' not found`);
    }
    this.state = new Map<string, any>(snapshot);
  }

  /**
   * Check if a snapshot exists
   * @param key - Name of the snapshot
   * @returns True if the snapshot exists
   */
  hasSnapshot(key: string): boolean {
    return this.snapshots.has(key);
  }

  /**
   * Delete a snapshot
   * @param key - Name of the snapshot to delete
   * @returns True if the snapshot was deleted
   */
  deleteSnapshot(key: string): boolean {
    return this.snapshots.delete(key);
  }

  /**
   * Clear all state and snapshots
   */
  cleanup(): void {
    this.state.clear();
    this.snapshots.clear();
  }

  /**
   * Get all keys in the context
   * @returns Array of keys
   */
  keys(): string[] {
    return Array.from(this.state.keys());
  }

  /**
   * Get the number of items in the context
   * @returns The number of items
   */
  size(): number {
    return this.state.size;
  }

  /**
   * Merge another context into this one
   * @param other - The context to merge from
   */
  merge(other: TestContext): void {
    for (const key of other.keys()) {
      const value = other.get(key);
      if (value !== undefined) {
        this.set(key, value);
      }
    }
  }
}
