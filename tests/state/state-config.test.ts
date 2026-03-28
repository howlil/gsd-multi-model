/**
 * StateConfigLoader - Comprehensive Tests
 *
 * Tests for StateConfigLoader class from bin/lib/config/state-config.ts
 * Coverage target: ≥80%
 *
 * Tests cover:
 * - getDefaultConfig
 * - loadFromFile with merge behavior
 * - saveToFile with atomic writes
 * - validate with all validation rules
 * - applyEnvironmentOverrides
 * - Event emissions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StateConfigLoader, getPersistenceConfig, getJournalConfig } from '../../bin/lib/config/state-config.js';
import { join } from 'path';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';

describe('StateConfigLoader', () => {
  let tempDir: string;
  let configPath: string;
  let loader: StateConfigLoader;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-config-test-'));
    configPath = join(tempDir, 'test-state-config.json');
    loader = new StateConfigLoader();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getDefaultConfig', () => {
    it('should return complete default configuration', () => {
      const config = StateConfigLoader.getDefaultConfig();

      expect(config).toBeDefined();
      expect(config.persistence).toBeDefined();
      expect(config.checkpoints).toBeDefined();
      expect(config.journal).toBeDefined();
    });

    it('should have sensible default values', () => {
      const config = StateConfigLoader.getDefaultConfig();

      expect(config.persistence.backupEnabled).toBe(true);
      expect(config.persistence.backupCount).toBe(3);
      expect(config.persistence.atomicWrites).toBe(true);
      expect(config.persistence.compressionEnabled).toBe(false);
      expect(config.persistence.checkpointIntervalMs).toBe(300000);

      expect(config.checkpoints.enabled).toBe(true);
      expect(config.checkpoints.maxCheckpoints).toBe(10);
      expect(config.checkpoints.autoCheckpointOnTaskComplete).toBe(true);
      expect(config.checkpoints.autoCheckpointOnPhaseComplete).toBe(true);

      expect(config.journal.enabled).toBe(true);
      expect(config.journal.maxEntries).toBe(10000);
      expect(config.journal.flushIntervalMs).toBe(5000);
      expect(config.journal.compressionEnabled).toBe(false);
    });

    it('should return a copy (not reference)', () => {
      const config1 = StateConfigLoader.getDefaultConfig();
      config1.persistence.backupCount = 999;

      const config2 = StateConfigLoader.getDefaultConfig();
      expect(config2.persistence.backupCount).toBe(3);
    });

    it('should have correct default paths', () => {
      const config = StateConfigLoader.getDefaultConfig();

      expect(config.persistence.statePath).toBe('.planning/STATE.md');
      expect(config.checkpoints.checkpointDir).toBe('.planning/checkpoints');
      expect(config.journal.journalPath).toBe('.planning/state-journal.jsonl');
    });
  });

  describe('loadFromFile', () => {
    it('should return default config when file does not exist', async () => {
      const config = await loader.loadFromFile(configPath);

      expect(config).toEqual(StateConfigLoader.getDefaultConfig());
    });

    it('should load config from file', async () => {
      const customConfig = {
        persistence: {
          statePath: '.planning/custom-state.md',
          backupEnabled: false,
          backupCount: 5
        },
        checkpoints: {
          checkpointDir: '.planning/custom-checkpoints',
          enabled: true,
          maxCheckpoints: 20
        },
        journal: {
          journalPath: '.planning/custom-journal.jsonl',
          enabled: false,
          maxEntries: 5000
        }
      };

      const { writeFile } = await import('fs/promises');
      await writeFile(configPath, JSON.stringify(customConfig), 'utf-8');

      const loadedConfig = await loader.loadFromFile(configPath);

      expect(loadedConfig.persistence.statePath).toBe('.planning/custom-state.md');
      expect(loadedConfig.persistence.backupEnabled).toBe(false);
      expect(loadedConfig.persistence.backupCount).toBe(5);
      expect(loadedConfig.checkpoints.checkpointDir).toBe('.planning/custom-checkpoints');
      expect(loadedConfig.checkpoints.maxCheckpoints).toBe(20);
      expect(loadedConfig.journal.journalPath).toBe('.planning/custom-journal.jsonl');
      expect(loadedConfig.journal.enabled).toBe(false);
      expect(loadedConfig.journal.maxEntries).toBe(5000);
    });

    it('should merge file config with defaults', async () => {
      const partialConfig = {
        persistence: {
          backupCount: 10
        }
      };

      const { writeFile } = await import('fs/promises');
      await writeFile(configPath, JSON.stringify(partialConfig), 'utf-8');

      const loadedConfig = await loader.loadFromFile(configPath);

      // Overridden value
      expect(loadedConfig.persistence.backupCount).toBe(10);

      // Default values preserved
      expect(loadedConfig.persistence.backupEnabled).toBe(true);
      expect(loadedConfig.persistence.atomicWrites).toBe(true);
      expect(loadedConfig.journal.enabled).toBe(true);
    });

    it('should emit config-loaded event', async () => {
      const eventPromise = new Promise<any>((resolve) => {
        loader.once('config-loaded', resolve);
      });

      await loader.loadFromFile(configPath);

      const event = await eventPromise;
      expect(event).toBeDefined();
      expect(event.config).toBeDefined();
      expect(event.source).toBe('default');
    });

    it('should emit config-loaded with file source when loading from file', async () => {
      const { writeFile } = await import('fs/promises');
      await writeFile(configPath, JSON.stringify({ persistence: { backupCount: 5 } }), 'utf-8');

      const eventPromise = new Promise<any>((resolve) => {
        loader.once('config-loaded', resolve);
      });

      await loader.loadFromFile(configPath);

      const event = await eventPromise;
      expect(event.source).toBe('file');
      expect(event.path).toBe(configPath);
    });

    it('should throw on invalid configuration', async () => {
      const invalidConfig = {
        persistence: {
          statePath: 'invalid-path', // Doesn't end with .md or .json
          backupCount: 999 // Exceeds max of 100
        }
      };

      const { writeFile } = await import('fs/promises');
      await writeFile(configPath, JSON.stringify(invalidConfig), 'utf-8');

      await expect(loader.loadFromFile(configPath)).rejects.toThrow();
    });
  });

  describe('saveToFile', () => {
    it('should save config to JSON file', async () => {
      const config = StateConfigLoader.getDefaultConfig();
      config.persistence.backupCount = 7;

      const result = await loader.saveToFile(config, configPath);

      expect(result).toBe(true);
      expect(existsSync(configPath)).toBe(true);

      const { readFile } = await import('fs/promises');
      const content = await readFile(configPath, 'utf-8');
      const saved = JSON.parse(content);

      expect(saved.persistence.backupCount).toBe(7);
    });

    it('should create directory if not exists', async () => {
      const nestedPath = join(tempDir, 'nested', 'path', 'config.json');
      const config = StateConfigLoader.getDefaultConfig();

      const result = await loader.saveToFile(config, nestedPath);

      expect(result).toBe(true);
      expect(existsSync(nestedPath)).toBe(true);

      rmSync(nestedPath, { force: true });
    });

    it('should emit config-saved event', async () => {
      const config = StateConfigLoader.getDefaultConfig();
      const eventPromise = new Promise<any>((resolve) => {
        loader.once('config-saved', resolve);
      });

      await loader.saveToFile(config, configPath);

      const event = await eventPromise;
      expect(event).toBeDefined();
      expect(event.config).toBe(config);
      expect(event.path).toBe(configPath);
    });

    it('should use atomic write pattern', async () => {
      const config = StateConfigLoader.getDefaultConfig();

      // Save twice to verify temp files are cleaned up
      await loader.saveToFile(config, configPath);
      await loader.saveToFile(config, configPath);

      // Check no temp files remain
      const { readdir } = await import('fs/promises');
      const files = await readdir(tempDir);
      const tempFiles = files.filter(f => f.includes('.tmp.'));

      expect(tempFiles.length).toBe(0);
    });
  });

  describe('validate', () => {
    it('should return valid for default config', () => {
      const config = StateConfigLoader.getDefaultConfig();
      const result = loader.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should catch invalid statePath', () => {
      const config = StateConfigLoader.getDefaultConfig();
      config.persistence.statePath = 'invalid-path';

      const result = loader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('statePath must end with .md or .json');
    });

    it('should catch invalid backupCount (negative)', () => {
      const config = StateConfigLoader.getDefaultConfig();
      config.persistence.backupCount = -1;

      const result = loader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('backupCount must be between 0 and 100');
    });

    it('should catch invalid backupCount (too high)', () => {
      const config = StateConfigLoader.getDefaultConfig();
      config.persistence.backupCount = 101;

      const result = loader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('backupCount must be between 0 and 100');
    });

    it('should catch invalid checkpointIntervalMs', () => {
      const config = StateConfigLoader.getDefaultConfig();
      config.persistence.checkpointIntervalMs = 500;

      const result = loader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('checkpointIntervalMs must be >= 1000');
    });

    it('should catch invalid maxCheckpoints', () => {
      const config = StateConfigLoader.getDefaultConfig();
      config.checkpoints.maxCheckpoints = 0;

      const result = loader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxCheckpoints must be >= 1');
    });

    it('should catch invalid maxEntries', () => {
      const config = StateConfigLoader.getDefaultConfig();
      config.journal.maxEntries = 50;

      const result = loader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxEntries must be >= 100');
    });

    it('should catch invalid flushIntervalMs', () => {
      const config = StateConfigLoader.getDefaultConfig();
      config.journal.flushIntervalMs = 50;

      const result = loader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('flushIntervalMs must be >= 100');
    });

    it('should return all validation errors', () => {
      const config = StateConfigLoader.getDefaultConfig();
      config.persistence.statePath = 'invalid';
      config.persistence.backupCount = -1;
      config.persistence.checkpointIntervalMs = 100;
      config.journal.maxEntries = 10;

      const result = loader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('applyEnvironmentOverrides', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should override statePath from EZ_STATE_PATH', () => {
      process.env.EZ_STATE_PATH = '/custom/state/path.md';
      const config = StateConfigLoader.getDefaultConfig();

      const overridden = loader.applyEnvironmentOverrides(config);

      expect(overridden.persistence.statePath).toBe('/custom/state/path.md');
    });

    it('should override checkpointDir from EZ_CHECKPOINT_DIR', () => {
      process.env.EZ_CHECKPOINT_DIR = '/custom/checkpoints';
      const config = StateConfigLoader.getDefaultConfig();

      const overridden = loader.applyEnvironmentOverrides(config);

      expect(overridden.checkpoints.checkpointDir).toBe('/custom/checkpoints');
    });

    it('should override journalPath from EZ_JOURNAL_PATH', () => {
      process.env.EZ_JOURNAL_PATH = '/custom/journal.jsonl';
      const config = StateConfigLoader.getDefaultConfig();

      const overridden = loader.applyEnvironmentOverrides(config);

      expect(overridden.journal.journalPath).toBe('/custom/journal.jsonl');
    });

    it('should override backupEnabled from EZ_STATE_BACKUP_ENABLED', () => {
      process.env.EZ_STATE_BACKUP_ENABLED = 'false';
      const config = StateConfigLoader.getDefaultConfig();

      const overridden = loader.applyEnvironmentOverrides(config);

      expect(overridden.persistence.backupEnabled).toBe(false);
    });

    it('should override journalEnabled from EZ_STATE_JOURNAL_ENABLED', () => {
      process.env.EZ_STATE_JOURNAL_ENABLED = 'false';
      const config = StateConfigLoader.getDefaultConfig();

      const overridden = loader.applyEnvironmentOverrides(config);

      expect(overridden.journal.enabled).toBe(false);
    });

    it('should parse boolean environment variables (1 as true)', () => {
      process.env.EZ_STATE_BACKUP_ENABLED = '1';
      const config = StateConfigLoader.getDefaultConfig();

      const overridden = loader.applyEnvironmentOverrides(config);

      expect(overridden.persistence.backupEnabled).toBe(true);
    });

    it('should parse boolean environment variables (TRUE as true)', () => {
      process.env.EZ_STATE_BACKUP_ENABLED = 'TRUE';
      const config = StateConfigLoader.getDefaultConfig();

      const overridden = loader.applyEnvironmentOverrides(config);

      expect(overridden.persistence.backupEnabled).toBe(true);
    });

    it('should not modify original config', () => {
      process.env.EZ_STATE_PATH = '/custom/path.md';
      const config = StateConfigLoader.getDefaultConfig();
      const originalPath = config.persistence.statePath;

      loader.applyEnvironmentOverrides(config);

      expect(config.persistence.statePath).toBe(originalPath);
    });

    it('should apply multiple overrides', () => {
      process.env.EZ_STATE_PATH = '/custom/state.md';
      process.env.EZ_CHECKPOINT_DIR = '/custom/checkpoints';
      process.env.EZ_JOURNAL_PATH = '/custom/journal.jsonl';
      process.env.EZ_STATE_BACKUP_ENABLED = 'false';

      const config = StateConfigLoader.getDefaultConfig();
      const overridden = loader.applyEnvironmentOverrides(config);

      expect(overridden.persistence.statePath).toBe('/custom/state.md');
      expect(overridden.checkpoints.checkpointDir).toBe('/custom/checkpoints');
      expect(overridden.journal.journalPath).toBe('/custom/journal.jsonl');
      expect(overridden.persistence.backupEnabled).toBe(false);
    });
  });

  describe('getCurrentConfig', () => {
    it('should return null before loading', () => {
      const config = loader.getCurrentConfig();
      expect(config).toBeNull();
    });

    it('should return loaded config', async () => {
      const customConfig = {
        persistence: {
          statePath: '.planning/custom.md',
          backupCount: 15,
          checkpointIntervalMs: 600000
        },
        checkpoints: {
          maxCheckpoints: 20
        },
        journal: {
          maxEntries: 5000,
          flushIntervalMs: 10000
        }
      };

      const { writeFile } = await import('fs/promises');
      await writeFile(configPath, JSON.stringify(customConfig), 'utf-8');

      await loader.loadFromFile(configPath);

      const config = loader.getCurrentConfig();
      expect(config).not.toBeNull();
      expect(config?.persistence.backupCount).toBe(15);
    });

    it('should return saved config', async () => {
      const config = StateConfigLoader.getDefaultConfig();
      config.journal.maxEntries = 20000;

      await loader.saveToFile(config, configPath);

      const retrieved = loader.getCurrentConfig();
      expect(retrieved?.journal.maxEntries).toBe(20000);
    });
  });

  describe('Event Emissions', () => {
    it('should emit config-error on validation failure', async () => {
      const invalidConfig = {
        persistence: { statePath: 'invalid' }
      };

      const { writeFile } = await import('fs/promises');
      await writeFile(configPath, JSON.stringify(invalidConfig), 'utf-8');

      const errorPromise = new Promise<any>((resolve) => {
        loader.once('config-error', resolve);
      });

      try {
        await loader.loadFromFile(configPath);
      } catch {
        // Expected to throw
      }

      const event = await errorPromise;
      expect(event).toBeDefined();
      expect(event.reason).toBe('validation-failed');
    });
  });
});

describe('Helper Functions', () => {
  describe('getPersistenceConfig', () => {
    it('should extract PersistenceConfig from StateConfig', () => {
      const stateConfig = StateConfigLoader.getDefaultConfig();
      const persistenceConfig = getPersistenceConfig(stateConfig);

      expect(persistenceConfig.statePath).toBe('.planning/STATE.md');
      expect(persistenceConfig.backupEnabled).toBe(true);
      expect(persistenceConfig.backupCount).toBe(3);
      expect(persistenceConfig.atomicWrites).toBe(true);
      expect(persistenceConfig.compressionEnabled).toBe(false);
    });
  });

  describe('getJournalConfig', () => {
    it('should extract JournalConfig from StateConfig', () => {
      const stateConfig = StateConfigLoader.getDefaultConfig();
      const journalConfig = getJournalConfig(stateConfig);

      expect(journalConfig.journalPath).toBe('.planning/state-journal.jsonl');
      expect(journalConfig.enabled).toBe(true);
      expect(journalConfig.maxEntries).toBe(10000);
      expect(journalConfig.flushIntervalMs).toBe(5000);
      expect(journalConfig.compressionEnabled).toBe(false);
    });
  });
});
