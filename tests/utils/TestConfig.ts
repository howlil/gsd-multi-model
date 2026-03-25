/**
 * TestConfig - Test configuration management with singleton pattern
 *
 * Provides centralized configuration management for tests.
 * Use this to manage test-specific configuration with load/reset capabilities.
 *
 * @example
 * ```typescript
 * const config = TestConfig.getInstance();
 *
 * // Load configuration from file
 * config.load('./test-config.json');
 *
 * // Get and set values
 * const value = config.get('apiKey');
 * config.set('apiKey', 'new-value');
 *
 * // Create test config with defaults
 * const testConfig = config.createTestConfig({ timeout: 5000 });
 *
 * // Reset all configuration
 * config.reset();
 * ```
 */

import fs from 'fs';
import path from 'path';

export class TestConfig {
  /**
   * Singleton instance
   */
  private static instance: TestConfig | null = null;

  /**
   * Internal configuration storage
   */
  private config: Map<string, any>;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.config = new Map<string, any>();
  }

  /**
   * Get the singleton instance
   * @returns The TestConfig instance
   */
  static getInstance(): TestConfig {
    if (!TestConfig.instance) {
      TestConfig.instance = new TestConfig();
    }
    return TestConfig.instance;
  }

  /**
   * Load configuration from a JSON file
   * @param configPath - Path to the configuration file
   * @throws Error if file cannot be read or parsed
   */
  load(configPath: string): void {
    const absolutePath = path.isAbsolute(configPath) ? configPath : path.resolve(configPath);
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const config = JSON.parse(content);

    for (const [key, value] of Object.entries(config)) {
      this.config.set(key, value);
    }
  }

  /**
   * Get a configuration value
   * @param key - The configuration key
   * @returns The value, or undefined if not found
   */
  get<T>(key: string): T | undefined {
    return this.config.get(key) as T | undefined;
  }

  /**
   * Get a configuration value with a default fallback
   * @param key - The configuration key
   * @param defaultValue - Default value if key not found
   * @returns The value or default
   */
  getOrDefault<T>(key: string, defaultValue: T): T {
    return (this.config.get(key) as T) ?? defaultValue;
  }

  /**
   * Set a configuration value
   * @param key - The configuration key
   * @param value - The value to set
   */
  set(key: string, value: any): void {
    this.config.set(key, value);
  }

  /**
   * Check if a configuration key exists
   * @param key - The configuration key
   * @returns True if the key exists
   */
  has(key: string): boolean {
    return this.config.has(key);
  }

  /**
   * Delete a configuration value
   * @param key - The configuration key
   * @returns True if the key was deleted
   */
  delete(key: string): boolean {
    return this.config.delete(key);
  }

  /**
   * Reset all configuration
   */
  reset(): void {
    this.config.clear();
  }

  /**
   * Create a test configuration with defaults and overrides
   * @param overrides - Values to override in the default config
   * @returns Merged configuration object
   */
  createTestConfig<T extends Record<string, any>>(overrides: Partial<T>): T {
    const defaults = this.getAll() as Partial<T>;
    return { ...defaults, ...overrides } as T;
  }

  /**
   * Get all configuration as an object
   * @returns All configuration key-value pairs
   */
  getAll(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of this.config.entries()) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Get all configuration keys
   * @returns Array of configuration keys
   */
  keys(): string[] {
    return Array.from(this.config.keys());
  }

  /**
   * Get the number of configuration items
   * @returns The number of items
   */
  size(): number {
    return this.config.size;
  }
}
