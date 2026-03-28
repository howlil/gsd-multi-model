/**
 * StatePersistence - Comprehensive Tests
 *
 * Tests for StatePersistence class from bin/lib/state/persistence.ts
 * Coverage target: ≥80%
 *
 * Tests cover:
 * - Serialization/deserialization with Map support
 * - writeState and readState operations
 * - Backup management and rotation
 * - Event emissions
 * - Statistics tracking
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StatePersistence } from '../../bin/lib/state/persistence.js';
import type { GlobalState } from '../../bin/lib/state/state-manager.js';
import { join } from 'path';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';

describe('StatePersistence', () => {
  let tempDir: string;
  let statePath: string;
  let persistence: StatePersistence;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-state-test-'));
    statePath = join(tempDir, 'test-state.json');
    persistence = new StatePersistence(statePath);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('serializeState', () => {
    it('should serialize GlobalState with Maps to JSON', () => {
      const state: GlobalState = {
        version: {
          vectorClock: new Map([['agent-1', 1], ['agent-2', 2]]),
          timestamp: Date.now(),
          checksum: 'abc123'
        },
        taskStates: new Map([
          ['01-01', {
            status: 'in-progress',
            version: {
              vectorClock: new Map([['agent-1', 1]]),
              timestamp: Date.now(),
              checksum: 'task-checksum'
            }
          }]
        ]),
        phaseState: new Map([
          [1, {
            status: 'in-progress',
            requirements: new Map([['STATE-01', 'complete']])
          }]
        ]),
        checkpointId: 'checkpoint-1'
      };

      // Access private method via any cast for testing
      const serialized = (persistence as any).serializeState(state);
      const parsed = JSON.parse(serialized);

      expect(parsed.version.vectorClock).toEqual({ 'agent-1': 1, 'agent-2': 2 });
      expect(parsed.taskStates).toHaveLength(1);
      expect(parsed.phaseState).toHaveLength(1);
      expect(parsed.checkpointId).toBe('checkpoint-1');
    });

    it('should handle empty state', () => {
      const state: GlobalState = {
        version: {
          vectorClock: new Map(),
          timestamp: Date.now(),
          checksum: 'empty-checksum'
        },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      const serialized = (persistence as any).serializeState(state);
      const parsed = JSON.parse(serialized);

      expect(parsed.version.vectorClock).toEqual({});
      expect(parsed.taskStates).toHaveLength(0);
      expect(parsed.phaseState).toHaveLength(0);
    });
  });

  describe('deserializeState', () => {
    it('should deserialize JSON back to GlobalState with Maps', () => {
      const json = JSON.stringify({
        version: {
          vectorClock: { 'agent-1': 1, 'agent-2': 2 },
          timestamp: 1234567890,
          checksum: 'abc123'
        },
        taskStates: [['01-01', {
          status: 'in-progress',
          version: {
            vectorClock: { 'agent-1': 1 },
            timestamp: 1234567890,
            checksum: 'task-checksum'
          }
        }]],
        phaseState: [[1, {
          status: 'in-progress',
          requirements: [['STATE-01', 'complete']]
        }]],
        checkpointId: 'checkpoint-1'
      });

      const state = (persistence as any).deserializeState(json);

      expect(state.version.vectorClock).toBeInstanceOf(Map);
      expect(state.version.vectorClock.get('agent-1')).toBe(1);
      expect(state.taskStates).toBeInstanceOf(Map);
      expect(state.phaseState).toBeInstanceOf(Map);
      expect(state.checkpointId).toBe('checkpoint-1');
    });

    it('should round-trip serialize/deserialize', () => {
      const originalState: GlobalState = {
        version: {
          vectorClock: new Map([['agent-1', 5], ['agent-2', 3]]),
          timestamp: 9876543210,
          checksum: 'round-trip-checksum'
        },
        taskStates: new Map([
          ['01-01', {
            status: 'complete',
            version: {
              vectorClock: new Map([['agent-1', 5]]),
              timestamp: 9876543210,
              checksum: 'task-checksum'
            }
          }],
          ['01-02', {
            status: 'pending',
            version: {
              vectorClock: new Map([['agent-2', 3]]),
              timestamp: 9876543210,
              checksum: 'task2-checksum'
            }
          }]
        ]),
        phaseState: new Map([
          [1, {
            status: 'complete',
            requirements: new Map([['STATE-01', 'complete'], ['STATE-02', 'complete']])
          }],
          [2, {
            status: 'in-progress',
            requirements: new Map([['STATE-03', 'pending']])
          }]
        ]),
        checkpointId: 'checkpoint-round-trip'
      };

      const serialized = (persistence as any).serializeState(originalState);
      const deserialized = (persistence as any).deserializeState(serialized);

      expect(deserialized.version.vectorClock).toEqual(originalState.version.vectorClock);
      expect(deserialized.taskStates.size).toBe(originalState.taskStates.size);
      expect(deserialized.phaseState.size).toBe(originalState.phaseState.size);
      expect(deserialized.checkpointId).toBe(originalState.checkpointId);
    });
  });

  describe('writeState', () => {
    it('should write state to file', async () => {
      const state: GlobalState = {
        version: {
          vectorClock: new Map([['agent-1', 1]]),
          timestamp: Date.now(),
          checksum: 'test-checksum'
        },
        taskStates: new Map([['01-01', {
          status: 'in-progress',
          version: {
            vectorClock: new Map([['agent-1', 1]]),
            timestamp: Date.now(),
            checksum: 'task-checksum'
          }
        }]]),
        phaseState: new Map([[1, {
          status: 'in-progress',
          requirements: new Map([['STATE-01', 'pending']])
        }]]),
        checkpointId: 'checkpoint-write'
      };

      const result = await persistence.writeState(state);

      expect(result).toBe(true);
      expect(existsSync(statePath)).toBe(true);

      const content = readFileSync(statePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.version.checksum).toBe('test-checksum');
    });

    it('should create backup when backupEnabled is true', async () => {
      const persistenceWithBackup = new StatePersistence(statePath, { backupEnabled: true, backupCount: 3 });

      // Write initial state
      const state1: GlobalState = {
        version: { vectorClock: new Map([['agent-1', 1]]), timestamp: Date.now(), checksum: 'v1' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: 'checkpoint-1'
      };
      await persistenceWithBackup.writeState(state1);

      // Write second state (should create backup)
      const state2: GlobalState = {
        version: { vectorClock: new Map([['agent-1', 2]]), timestamp: Date.now(), checksum: 'v2' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: 'checkpoint-2'
      };
      await persistenceWithBackup.writeState(state2);

      const backups = await persistenceWithBackup.getBackups();
      expect(backups.length).toBeGreaterThan(0);
    });

    it('should emit state-written event on success', async () => {
      const eventPromise = new Promise<any>((resolve) => {
        persistence.once('state-written', resolve);
      });

      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'event-test' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      await persistence.writeState(state);
      const event = await eventPromise;

      expect(event).toBeDefined();
      expect(event.state).toBe(state);
      expect(typeof event.writeTime).toBe('number');
    });

    it('should track write statistics', async () => {
      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'stats-test' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      await persistence.writeState(state);
      await persistence.writeState(state);

      const stats = persistence.getStats();
      expect(stats.totalWrites).toBe(2);
      expect(stats.averageWriteTimeMs).toBeGreaterThan(0);
    });
  });

  describe('readState', () => {
    it('should return null when state file does not exist', async () => {
      const state = await persistence.readState();
      expect(state).toBeNull();
    });

    it('should read state from file', async () => {
      const originalState: GlobalState = {
        version: {
          vectorClock: new Map([['agent-1', 1]]),
          timestamp: 1234567890,
          checksum: 'read-test'
        },
        taskStates: new Map([['01-01', {
          status: 'complete',
          version: {
            vectorClock: new Map([['agent-1', 1]]),
            timestamp: 1234567890,
            checksum: 'task-checksum'
          }
        }]]),
        phaseState: new Map([[1, {
          status: 'complete',
          requirements: new Map([['STATE-01', 'complete']])
        }]]),
        checkpointId: 'checkpoint-read'
      };

      await persistence.writeState(originalState);
      const readState = await persistence.readState();

      expect(readState).not.toBeNull();
      expect(readState!.checkpointId).toBe('checkpoint-read');
      expect(readState!.version.checksum).toBe('read-test');
    });

    it('should return null for invalid JSON', async () => {
      // Write invalid JSON directly to file
      rmSync(tempDir, { recursive: true, force: true });
      mkdtempSync(join(tmpdir(), 'ez-agents-state-test-'));
      const invalidPath = join(tempDir, 'invalid-state.json');
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-state-test-'));
      statePath = join(tempDir, 'invalid-state.json');

      // Create new persistence with fresh path
      const freshPersistence = new StatePersistence(statePath);
      const invalidJsonPath = join(tempDir, 'invalid.json');
      await import('fs/promises').then(fs => fs.writeFile(invalidJsonPath, '{ invalid json }', 'utf-8'));

      // Test with actual invalid file
      const invalidPersistence = new StatePersistence(invalidJsonPath);
      const state = await invalidPersistence.readState();
      expect(state).toBeNull();
    });

    it('should emit state-read event on success', async () => {
      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'event-read' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      await persistence.writeState(state);

      const eventPromise = new Promise<any>((resolve) => {
        persistence.once('state-read', resolve);
      });

      await persistence.readState();
      const event = await eventPromise;

      expect(event).toBeDefined();
      expect(typeof event.readTime).toBe('number');
    });

    it('should track read statistics', async () => {
      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'read-stats' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      await persistence.writeState(state);
      await persistence.readState();
      await persistence.readState();

      const stats = persistence.getStats();
      expect(stats.totalReads).toBe(2);
      expect(stats.averageReadTimeMs).toBeGreaterThan(0);
    });
  });

  describe('getBackups', () => {
    it('should return empty array when no backups exist', async () => {
      const backups = await persistence.getBackups();
      expect(backups).toEqual([]);
    });

    it('should return sorted backup files', async () => {
      const persistenceWithBackup = new StatePersistence(statePath, { backupEnabled: true, backupCount: 5 });

      // Create multiple backups by writing state multiple times
      for (let i = 0; i < 4; i++) {
        const state: GlobalState = {
          version: { vectorClock: new Map([['agent-1', i]]), timestamp: Date.now(), checksum: `v${i}` },
          taskStates: new Map(),
          phaseState: new Map(),
          checkpointId: `checkpoint-${i}`
        };
        await persistenceWithBackup.writeState(state);
      }

      const backups = await persistenceWithBackup.getBackups();
      expect(backups.length).toBeGreaterThan(0);

      // Verify backups are sorted (newest first, backup.1 is newest)
      const backupNumbers = backups.map(b => {
        const match = b.match(/\.backup\.(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      });

      // Should be in ascending order (1, 2, 3, ...)
      for (let i = 1; i < backupNumbers.length; i++) {
        expect(backupNumbers[i]).toBeGreaterThan(backupNumbers[i - 1]);
      }
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore state from backup', async () => {
      const persistenceWithBackup = new StatePersistence(statePath, { backupEnabled: true, backupCount: 3 });

      // Write initial state
      const state1: GlobalState = {
        version: { vectorClock: new Map([['agent-1', 1]]), timestamp: 1111111111, checksum: 'original' },
        taskStates: new Map([['01-01', {
          status: 'pending',
          version: { vectorClock: new Map(), timestamp: 1111111111, checksum: 'task' }
        }]]),
        phaseState: new Map([[1, {
          status: 'pending',
          requirements: new Map([['STATE-01', 'pending']])
        }]]),
        checkpointId: 'original-checkpoint'
      };
      await persistenceWithBackup.writeState(state1);

      // Write second state to create backup
      const state2: GlobalState = {
        version: { vectorClock: new Map([['agent-1', 2]]), timestamp: 2222222222, checksum: 'new' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: 'new-checkpoint'
      };
      await persistenceWithBackup.writeState(state2);

      // Get backup and restore
      const backups = await persistenceWithBackup.getBackups();
      expect(backups.length).toBeGreaterThan(0);

      const restored = await persistenceWithBackup.restoreFromBackup(backups[0]);
      expect(restored).toBe(true);

      // Verify restored state
      const currentState = await persistenceWithBackup.readState();
      expect(currentState?.checkpointId).toBe('original-checkpoint');
    });

    it('should return false for non-existent backup', async () => {
      const result = await persistence.restoreFromBackup('/non/existent/backup.json');
      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return initial stats', () => {
      const stats = persistence.getStats();

      expect(stats.totalWrites).toBe(0);
      expect(stats.totalReads).toBe(0);
      expect(stats.writeErrors).toBe(0);
      expect(stats.readErrors).toBe(0);
      expect(stats.averageWriteTimeMs).toBe(0);
      expect(stats.averageReadTimeMs).toBe(0);
    });

    it('should track write operations', async () => {
      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'track-write' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      await persistence.writeState(state);
      await persistence.writeState(state);
      await persistence.writeState(state);

      const stats = persistence.getStats();
      expect(stats.totalWrites).toBe(3);
      expect(stats.lastWriteTime).toBeDefined();
    });

    it('should track read operations', async () => {
      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'track-read' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      await persistence.writeState(state);
      await persistence.readState();
      await persistence.readState();
      await persistence.readState();

      const stats = persistence.getStats();
      expect(stats.totalReads).toBe(3);
      expect(stats.lastReadTime).toBeDefined();
    });

    it('should return a copy of stats (not reference)', () => {
      const stats1 = persistence.getStats();
      stats1.totalWrites = 999;

      const stats2 = persistence.getStats();
      expect(stats2.totalWrites).toBe(0);
    });
  });

  describe('Directory Creation', () => {
    it('should create state directory if not exists', () => {
      const nestedPath = join(tempDir, 'nested', 'path', 'state.json');
      const nestedPersistence = new StatePersistence(nestedPath);

      expect(existsSync(join(tempDir, 'nested', 'path'))).toBe(true);
      rmSync(nestedPath, { force: true });
    });
  });
});
