/**
 * State Configuration - Centralized configuration for state persistence components
 *
 * Provides:
 * - Centralized configuration for StatePersistence, CheckpointService, StateJournal
 * - Environment-based configuration overrides
 * - Validation of configuration values
 * - Default values for all persistence settings
 *
 * @example
 * ```typescript
 * const configLoader = new StateConfigLoader();
 * const config = await configLoader.loadFromFile();
 * const validated = configLoader.validate(config);
 *
 * // Extract component-specific configs
 * const persistenceConfig = getPersistenceConfig(config);
 * const journalConfig = getJournalConfig(config);
 * ```
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { PersistenceConfig } from '../state/persistence.js';
import { JournalConfig } from '../state/state-journal.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

/**
 * Persistence configuration for state storage
 */
export interface StatePersistenceConfig {
  /** Path to state file (default: '.planning/STATE.md') */
  statePath: string;
  /** Enable backup creation (default: true) */
  backupEnabled: boolean;
  /** Number of backups to retain (default: 3) */
  backupCount: number;
  /** Use atomic writes with temp file (default: true) */
  atomicWrites: boolean;
  /** Enable compression (default: false) */
  compressionEnabled: boolean;
  /** Checkpoint interval in milliseconds (default: 300000 / 5 min) */
  checkpointIntervalMs: number;
}

/**
 * Checkpoint configuration for crash recovery
 */
export interface StateCheckpointConfig {
  /** Directory to store checkpoints (default: '.planning/checkpoints') */
  checkpointDir: string;
  /** Enable checkpointing (default: true) */
  enabled: boolean;
  /** Maximum checkpoints to retain (default: 10) */
  maxCheckpoints: number;
  /** Auto checkpoint on task completion (default: true) */
  autoCheckpointOnTaskComplete: boolean;
  /** Auto checkpoint on phase completion (default: true) */
  autoCheckpointOnPhaseComplete: boolean;
}

/**
 * Journal configuration for audit trail
 */
export interface StateJournalConfig {
  /** Path to journal file (default: '.planning/state-journal.jsonl') */
  journalPath: string;
  /** Enable journaling (default: true) */
  enabled: boolean;
  /** Maximum entries before rotation (default: 10000) */
  maxEntries: number;
  /** Flush interval in milliseconds (default: 5000) */
  flushIntervalMs: number;
  /** Enable compression (default: false) */
  compressionEnabled: boolean;
}

/**
 * Combined state configuration for all persistence components
 */
export interface StateConfig {
  /** Persistence configuration */
  persistence: StatePersistenceConfig;
  /** Checkpoint configuration */
  checkpoints: StateCheckpointConfig;
  /** Journal configuration */
  journal: StateJournalConfig;
}

/**
 * Validation result with errors
 */
export interface ValidationResult {
  /** Whether configuration is valid */
  valid: boolean;
  /** Array of validation error messages */
  errors: string[];
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: StateConfig = {
  persistence: {
    statePath: '.planning/STATE.md',
    backupEnabled: true,
    backupCount: 3,
    atomicWrites: true,
    compressionEnabled: false,
    checkpointIntervalMs: 300000
  },
  checkpoints: {
    checkpointDir: '.planning/checkpoints',
    enabled: true,
    maxCheckpoints: 10,
    autoCheckpointOnTaskComplete: true,
    autoCheckpointOnPhaseComplete: true
  },
  journal: {
    journalPath: '.planning/state-journal.jsonl',
    enabled: true,
    maxEntries: 10000,
    flushIntervalMs: 5000,
    compressionEnabled: false
  }
};

// ─── StateConfigLoader Class ─────────────────────────────────────────────────

/**
 * State Configuration Loader
 *
 * Handles loading, validation, and management of state persistence configuration.
 * Supports file-based configuration, environment variable overrides, and validation.
 *
 * Extends EventEmitter to emit events on configuration operations:
 * - 'config-loaded': When configuration is loaded from file
 * - 'config-saved': When configuration is saved to file
 * - 'config-error': When configuration operation fails
 */
export class StateConfigLoader extends EventEmitter {
  private currentConfig: StateConfig | null = null;

  /**
   * Get default configuration
   *
   * @returns Complete default configuration with all fields populated
   *
   * @example
   * ```typescript
   * const defaultConfig = StateConfigLoader.getDefaultConfig();
   * ```
   */
  static getDefaultConfig(): StateConfig {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  /**
   * Load configuration from JSON file
   *
   * Loads configuration from specified path, merges with defaults,
   * and validates the result.
   *
   * @param configPath - Path to configuration file (default: '.ez-agents/state-config.json')
   * @returns Promise resolving to merged and validated configuration
   *
   * @emits StateConfigLoader#config-loaded
   * @emits StateConfigLoader#config-error
   *
   * @example
   * ```typescript
   * const loader = new StateConfigLoader();
   * const config = await loader.loadFromFile('./config.json');
   * ```
   */
  async loadFromFile(configPath?: string): Promise<StateConfig> {
    const defaultPath = '.ez-agents/state-config.json';
    const resolvedPath = path.resolve(configPath || defaultPath);

    try {
      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        // Return default config if file doesn't exist
        const defaultConfig = StateConfigLoader.getDefaultConfig();
        this.currentConfig = defaultConfig;
        this.emit('config-loaded', { config: defaultConfig, source: 'default' });
        return defaultConfig;
      }

      // Read and parse JSON file
      const content = await fs.promises.readFile(resolvedPath, 'utf-8');
      const fileConfig = JSON.parse(content) as Partial<StateConfig>;

      // Deep merge with default config (file values override defaults)
      const mergedConfig = this.deepMerge(DEFAULT_CONFIG, fileConfig);

      // Validate merged config
      const validation = this.validate(mergedConfig);
      if (!validation.valid) {
        const error = new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
        this.emit('config-error', { error, reason: 'validation-failed' });
        throw error;
      }

      // Store current config
      this.currentConfig = mergedConfig;

      // Emit success event
      this.emit('config-loaded', { config: mergedConfig, source: 'file', path: resolvedPath });

      return mergedConfig;
    } catch (error) {
      // Emit error event
      this.emit('config-error', { error, reason: 'load-failed' });
      throw error;
    }
  }

  /**
   * Apply environment variable overrides to configuration
   *
   * Reads environment variables with prefix `EZ_STATE_` and overrides
   * corresponding configuration values.
   *
   * Supported environment variables:
   * - `EZ_STATE_PATH` — overrides persistence.statePath
   * - `EZ_CHECKPOINT_DIR` — overrides checkpoints.checkpointDir
   * - `EZ_JOURNAL_PATH` — overrides journal.journalPath
   * - `EZ_STATE_BACKUP_ENABLED` — overrides persistence.backupEnabled
   * - `EZ_STATE_JOURNAL_ENABLED` — overrides journal.enabled
   *
   * @param config - Configuration to apply overrides to
   * @returns Configuration with environment overrides applied
   *
   * @example
   * ```typescript
   * const loader = new StateConfigLoader();
   * const config = await loader.loadFromFile();
   * const configWithEnv = loader.applyEnvironmentOverrides(config);
   * ```
   */
  applyEnvironmentOverrides(config: StateConfig): StateConfig {
    // Create deep copy to avoid mutating original
    const configCopy = JSON.parse(JSON.stringify(config)) as StateConfig;

    // Parse boolean helper
    const parseBool = (value: string | undefined): boolean | undefined => {
      if (value === undefined) return undefined;
      return value.toLowerCase() === 'true' || value === '1';
    };

    // Apply environment variable overrides
    if (process.env.EZ_STATE_PATH) {
      configCopy.persistence.statePath = process.env.EZ_STATE_PATH;
    }

    if (process.env.EZ_CHECKPOINT_DIR) {
      configCopy.checkpoints.checkpointDir = process.env.EZ_CHECKPOINT_DIR;
    }

    if (process.env.EZ_JOURNAL_PATH) {
      configCopy.journal.journalPath = process.env.EZ_JOURNAL_PATH;
    }

    const backupEnabled = parseBool(process.env.EZ_STATE_BACKUP_ENABLED);
    if (backupEnabled !== undefined) {
      configCopy.persistence.backupEnabled = backupEnabled;
    }

    const journalEnabled = parseBool(process.env.EZ_STATE_JOURNAL_ENABLED);
    if (journalEnabled !== undefined) {
      configCopy.journal.enabled = journalEnabled;
    }

    return configCopy;
  }

  /**
   * Validate configuration
   *
   * Validates all configuration values against rules:
   * - statePath must end with .md or .json
   * - backupCount must be >= 0 and <= 100
   * - checkpointIntervalMs must be >= 1000
   * - maxEntries must be >= 100
   * - flushIntervalMs must be >= 100
   *
   * @param config - Configuration to validate
   * @returns ValidationResult with valid flag and error messages
   *
   * @example
   * ```typescript
   * const loader = new StateConfigLoader();
   * const result = loader.validate(config);
   * if (!result.valid) {
   *   console.error('Validation errors:', result.errors);
   * }
   * ```
   */
  validate(config: StateConfig): ValidationResult {
    const errors: string[] = [];

    // Validate persistence
    if (!config.persistence.statePath.match(/\.(md|json)$/)) {
      errors.push('statePath must end with .md or .json');
    }

    if (config.persistence.backupCount < 0 || config.persistence.backupCount > 100) {
      errors.push('backupCount must be between 0 and 100');
    }

    if (config.persistence.checkpointIntervalMs < 1000) {
      errors.push('checkpointIntervalMs must be >= 1000');
    }

    // Validate checkpoints
    if (config.checkpoints.maxCheckpoints < 1) {
      errors.push('maxCheckpoints must be >= 1');
    }

    // Validate journal
    if (config.journal.maxEntries < 100) {
      errors.push('maxEntries must be >= 100');
    }

    if (config.journal.flushIntervalMs < 100) {
      errors.push('flushIntervalMs must be >= 100');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Save configuration to JSON file
   *
   * Uses atomic write pattern (temp file + rename) to ensure
   * configuration file is never left in partial state.
   *
   * @param config - Configuration to save
   * @param configPath - Path to save to (default: '.ez-agents/state-config.json')
   * @returns Promise resolving to true on success, false on failure
   *
   * @emits StateConfigLoader#config-saved
   * @emits StateConfigLoader#config-error
   *
   * @example
   * ```typescript
   * const loader = new StateConfigLoader();
   * const config = await loader.loadFromFile();
   * await loader.saveToFile(config, './custom-config.json');
   * ```
   */
  async saveToFile(config: StateConfig, configPath?: string): Promise<boolean> {
    const defaultPath = '.ez-agents/state-config.json';
    const resolvedPath = path.resolve(configPath || defaultPath);

    try {
      // Ensure directory exists
      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write to temp file first
      const tempPath = `${resolvedPath}.tmp.${Date.now()}`;
      const serialized = JSON.stringify(config, null, 2);
      await fs.promises.writeFile(tempPath, serialized, 'utf-8');

      // Rename temp file to config path (atomic operation)
      await fs.promises.rename(tempPath, resolvedPath);

      // Update current config
      this.currentConfig = config;

      // Emit success event
      this.emit('config-saved', { config, path: resolvedPath });

      return true;
    } catch (error) {
      // Emit error event
      this.emit('config-error', { error, reason: 'save-failed' });
      return false;
    }
  }

  /**
   * Get current configuration
   *
   * @returns Current configuration or null if not loaded
   */
  getCurrentConfig(): StateConfig | null {
    return this.currentConfig;
  }

  /**
   * Deep merge two configuration objects
   *
   * @param defaults - Default configuration
   * @param overrides - Override configuration
   * @returns Merged configuration
   */
  private deepMerge(defaults: StateConfig, overrides: Partial<StateConfig>): StateConfig {
    return {
      persistence: {
        ...defaults.persistence,
        ...overrides.persistence
      },
      checkpoints: {
        ...defaults.checkpoints,
        ...overrides.checkpoints
      },
      journal: {
        ...defaults.journal,
        ...overrides.journal
      }
    };
  }
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Extract PersistenceConfig from StateConfig
 *
 * Converts StateConfig.persistence to PersistenceConfig format
 * for use with StatePersistence class.
 *
 * @param stateConfig - Complete state configuration
 * @returns PersistenceConfig for StatePersistence constructor
 *
 * @example
 * ```typescript
 * const stateConfig = await configLoader.loadFromFile();
 * const persistenceConfig = getPersistenceConfig(stateConfig);
 * const persistence = new StatePersistence(persistenceConfig.statePath, persistenceConfig);
 * ```
 */
export function getPersistenceConfig(stateConfig: StateConfig): PersistenceConfig {
  return {
    statePath: stateConfig.persistence.statePath,
    backupEnabled: stateConfig.persistence.backupEnabled,
    backupCount: stateConfig.persistence.backupCount,
    atomicWrites: stateConfig.persistence.atomicWrites,
    compressionEnabled: stateConfig.persistence.compressionEnabled
  };
}

/**
 * Extract JournalConfig from StateConfig
 *
 * Converts StateConfig.journal to JournalConfig format
 * for use with StateJournal class.
 *
 * @param stateConfig - Complete state configuration
 * @returns JournalConfig for StateJournal constructor
 *
 * @example
 * ```typescript
 * const stateConfig = await configLoader.loadFromFile();
 * const journalConfig = getJournalConfig(stateConfig);
 * const journal = new StateJournal(journalConfig.journalPath, journalConfig);
 * ```
 */
export function getJournalConfig(stateConfig: StateConfig): JournalConfig {
  return {
    journalPath: stateConfig.journal.journalPath,
    enabled: stateConfig.journal.enabled,
    maxEntries: stateConfig.journal.maxEntries,
    flushIntervalMs: stateConfig.journal.flushIntervalMs,
    compressionEnabled: stateConfig.journal.compressionEnabled
  };
}
