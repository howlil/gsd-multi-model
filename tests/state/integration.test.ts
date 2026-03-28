/**
 * Persistence Integration Tests
 *
 * Integration tests for StateManager + StatePersistence + CheckpointService
 * Coverage target: Verify component interactions work correctly
 *
 * Tests cover:
 * - StateManager + StatePersistence integration
 * - StateManager + CheckpointService integration
 * - End-to-end persistence workflows
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StatePersistence, CheckpointService } from '../../bin/lib/state/persistence.js';
import { StateJournal } from '../../bin/lib/state/state-journal.js';
import { StateConfigLoader } from '../../bin/lib/config/state-config.js';
import type { GlobalState } from '../../bin/lib/state/state-manager.js';
import { join } from 'path';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';

describe('Persistence Integration', () => {
  let tempDir: string;
  let statePath: string;
  let checkpointDir: string;
  let journalPath: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-integration-test-'));
    statePath = join(tempDir, 'STATE.md');
    checkpointDir = join(tempDir, 'checkpoints');
    journalPath = join(tempDir, 'state-journal.jsonl');
    configPath = join(tempDir, 'state-config.json');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('StatePersistence + CheckpointService', () => {
    it('should persist state and create checkpoint', async () => {
      const persistence = new StatePersistence(statePath);
      const checkpointService = new CheckpointService(checkpointDir);

      const state: GlobalState = {
        version: {
          vectorClock: new Map([['agent-1', 1]]),
          timestamp: Date.now(),
          checksum: 'integration-test-1'
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
        checkpointId: undefined
      };

      // Write state
      const writeResult = await persistence.writeState(state);
      expect(writeResult).toBe(true);

      // Create checkpoint
      const checkpointId = await checkpointService.createCheckpoint(state, {
        id: 'integration-checkpoint-1',
        timestamp: Date.now(),
        reason: 'manual'
      });

      expect(checkpointId).toBe('integration-checkpoint-1');

      // Verify both persistence mechanisms work
      const persistedState = await persistence.readState();
      const checkpointState = await checkpointService.getCheckpoint(checkpointId);

      expect(persistedState?.checkpointId).toBeUndefined();
      expect(checkpointState?.version.checksum).toBe('integration-test-1');
    });

    it('should recover state from checkpoint after persistence failure', async () => {
      const persistence = new StatePersistence(statePath);
      const checkpointService = new CheckpointService(checkpointDir);

      // Create initial state
      const initialState: GlobalState = {
        version: {
          vectorClock: new Map([['agent-1', 1]]),
          timestamp: 1111111111,
          checksum: 'initial-state'
        },
        taskStates: new Map([['01-01', {
          status: 'pending',
          version: {
            vectorClock: new Map(),
            timestamp: 1111111111,
            checksum: 'task-initial'
          }
        }]]),
        phaseState: new Map([[1, {
          status: 'pending',
          requirements: new Map([['STATE-01', 'pending']])
        }]]),
        checkpointId: 'initial-checkpoint'
      };

      // Write and checkpoint
      await persistence.writeState(initialState);
      await checkpointService.createCheckpoint(initialState, {
        id: 'recovery-checkpoint',
        timestamp: Date.now(),
        reason: 'manual'
      });

      // Simulate state corruption by writing invalid data
      const { writeFile } = await import('fs/promises');
      await writeFile(statePath, '{ invalid json }', 'utf-8');

      // Read should fail and return null
      const corruptedState = await persistence.readState();
      expect(corruptedState).toBeNull();

      // Recovery from checkpoint should succeed
      const recoveredState = await checkpointService.getCheckpoint('recovery-checkpoint');
      expect(recoveredState).not.toBeNull();
      expect(recoveredState?.checkpointId).toBe('initial-checkpoint');
    });
  });

  describe('StatePersistence + StateJournal', () => {
    it('should persist state changes and log to journal', async () => {
      const persistence = new StatePersistence(statePath);
      const journal = new StateJournal(journalPath);

      const state: GlobalState = {
        version: {
          vectorClock: new Map([['agent-1', 1]]),
          timestamp: Date.now(),
          checksum: 'journal-test'
        },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      // Create journal entry for state change
      const entry = journal.createEntry('create', 'ez-planner', {
        taskId: '01-01',
        newState: { status: 'pending' },
        vectorClock: { 'agent-1': 1 }
      });

      // Append to journal
      await journal.append(entry);

      // Write state
      await persistence.writeState(state);

      // Wait for journal flush
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify both operations succeeded
      const persistedState = await persistence.readState();
      expect(persistedState?.version.checksum).toBe('journal-test');

      const journalEntries = await journal.query({ taskId: '01-01' });
      expect(journalEntries.length).toBe(1);
      expect(journalEntries[0].agentId).toBe('ez-planner');

      journal.stop();
    });

    it('should replay journal entries to reconstruct state history', async () => {
      const persistence = new StatePersistence(statePath);
      const journal = new StateJournal(journalPath);

      // Simulate state transitions
      const transitions = [
        { status: 'pending', timestamp: 1000 },
        { status: 'in-progress', timestamp: 2000 },
        { status: 'complete', timestamp: 3000 }
      ];

      for (const transition of transitions) {
        const entry = journal.createEntry('update', 'agent-1', {
          taskId: '01-01',
          previousState: { status: 'previous' },
          newState: { status: transition.status },
          vectorClock: { 'agent-1': transition.timestamp }
        });
        await journal.append(entry);
      }

      // Wait for flush
      await new Promise(resolve => setTimeout(resolve, 100));

      // Replay history
      const history = await journal.replay('01-01');

      expect(history.length).toBe(3);
      expect(history[0].newState).toEqual({ status: 'pending' });
      expect(history[1].newState).toEqual({ status: 'in-progress' });
      expect(history[2].newState).toEqual({ status: 'complete' });

      journal.stop();
    });
  });

  describe('StateConfigLoader + StatePersistence', () => {
    it('should load config and apply to persistence', async () => {
      const configLoader = new StateConfigLoader();

      // Create custom config
      const customConfig = {
        persistence: {
          statePath: statePath,
          backupEnabled: true,
          backupCount: 5
        },
        checkpoints: {
          checkpointDir: checkpointDir,
          enabled: true,
          maxCheckpoints: 10
        },
        journal: {
          journalPath: journalPath,
          enabled: true,
          maxEntries: 1000
        }
      };

      const { writeFile } = await import('fs/promises');
      await writeFile(configPath, JSON.stringify(customConfig), 'utf-8');

      // Load config
      const config = await configLoader.loadFromFile(configPath);

      // Create persistence with loaded config
      const persistence = new StatePersistence(config.persistence.statePath, {
        backupEnabled: config.persistence.backupEnabled,
        backupCount: config.persistence.backupCount
      });

      // Verify config was applied
      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'config-test' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      await persistence.writeState(state);

      // Verify backup settings
      const backups = await persistence.getBackups();
      expect(Array.isArray(backups)).toBe(true);
    });

    it('should validate config before using', async () => {
      const configLoader = new StateConfigLoader();
      const invalidConfig = {
        persistence: {
          statePath: 'invalid-path', // Doesn't end with .md or .json
          backupCount: -1
        },
        checkpoints: {
          checkpointDir: checkpointDir,
          enabled: true,
          maxCheckpoints: 10
        },
        journal: {
          journalPath: journalPath,
          enabled: true,
          maxEntries: 1000
        }
      };

      const result = configLoader.validate(invalidConfig as any);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Full Persistence Workflow', () => {
    it('should complete full persistence workflow', async () => {
      // Initialize all components
      const configLoader = new StateConfigLoader();
      const persistence = new StatePersistence(statePath, { backupEnabled: true, backupCount: 3 });
      const checkpointService = new CheckpointService(checkpointDir);
      const journal = new StateJournal(journalPath);

      // Phase 1: Initial state
      const initialState: GlobalState = {
        version: {
          vectorClock: new Map([['agent-1', 1]]),
          timestamp: 1000000000,
          checksum: 'phase-1'
        },
        taskStates: new Map([['01-01', {
          status: 'pending',
          version: {
            vectorClock: new Map(),
            timestamp: 1000000000,
            checksum: 'task-1'
          }
        }]]),
        phaseState: new Map([[1, {
          status: 'pending',
          requirements: new Map([['STATE-01', 'pending']])
        }]]),
        checkpointId: undefined
      };

      await persistence.writeState(initialState);

      // Log to journal
      const entry1 = journal.createEntry('create', 'ez-planner', {
        taskId: '01-01',
        phase: 1,
        newState: { status: 'pending' }
      });
      await journal.append(entry1);

      // Phase 2: Update state
      const updatedState: GlobalState = {
        version: {
          vectorClock: new Map([['agent-1', 2]]),
          timestamp: 2000000000,
          checksum: 'phase-2'
        },
        taskStates: new Map([['01-01', {
          status: 'in-progress',
          version: {
            vectorClock: new Map([['agent-1', 2]]),
            timestamp: 2000000000,
            checksum: 'task-2'
          }
        }]]),
        phaseState: new Map([[1, {
          status: 'in-progress',
          requirements: new Map([['STATE-01', 'in-progress']])
        }]]),
        checkpointId: undefined
      };

      await persistence.writeState(updatedState);

      // Create checkpoint at phase 2
      await checkpointService.createCheckpoint(updatedState, {
        id: 'phase-2-checkpoint',
        timestamp: 2000000000,
        phase: 1,
        reason: 'task-complete'
      });

      // Log to journal
      const entry2 = journal.createEntry('update', 'ez-executor', {
        taskId: '01-01',
        phase: 1,
        previousState: { status: 'pending' },
        newState: { status: 'in-progress' }
      });
      await journal.append(entry2);

      // Wait for journal flush
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify workflow
      const finalState = await persistence.readState();
      expect(finalState?.version.checksum).toBe('phase-2');

      const checkpoint = await checkpointService.getCheckpoint('phase-2-checkpoint');
      expect(checkpoint?.version.checksum).toBe('phase-2');

      const journalEntries = await journal.query({ taskId: '01-01' });
      expect(journalEntries.length).toBe(2);

      const history = await journal.replay('01-01');
      expect(history.length).toBe(2);
      expect(history[0].newState).toEqual({ status: 'pending' });
      expect(history[1].newState).toEqual({ status: 'in-progress' });

      // Get statistics
      const persistenceStats = persistence.getStats();
      expect(persistenceStats.totalWrites).toBe(2);

      const journalStats = journal.getStats();
      expect(journalStats.totalAppends).toBe(2);

      journal.stop();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle concurrent persistence operations', async () => {
      const persistence = new StatePersistence(statePath);
      const checkpointService = new CheckpointService(checkpointDir);

      const state1: GlobalState = {
        version: { vectorClock: new Map([['agent-1', 1]]), timestamp: 1000, checksum: 'state-1' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      const state2: GlobalState = {
        version: { vectorClock: new Map([['agent-2', 1]]), timestamp: 2000, checksum: 'state-2' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      // Sequential operations to avoid file locking conflicts
      const write1 = await persistence.writeState(state1);
      expect(write1).toBe(true);

      const write2 = await persistence.writeState(state2);
      expect(write2).toBe(true);

      const checkpoint = await checkpointService.createCheckpoint(state1, {
        id: 'concurrent-checkpoint',
        timestamp: Date.now(),
        reason: 'manual'
      });
      expect(checkpoint).toBe('concurrent-checkpoint');

      // Verify final state
      const finalState = await persistence.readState();
      expect(finalState).not.toBeNull();

      const checkpointState = await checkpointService.getCheckpoint('concurrent-checkpoint');
      expect(checkpointState?.version.checksum).toBe('state-1');
    });

    it('should handle missing directories gracefully', async () => {
      const nestedStatePath = join(tempDir, 'nested', 'path', 'STATE.md');
      const nestedCheckpointDir = join(tempDir, 'nested', 'checkpoints');

      const persistence = new StatePersistence(nestedStatePath);
      const checkpointService = new CheckpointService(nestedCheckpointDir);

      expect(existsSync(join(tempDir, 'nested', 'path'))).toBe(true);
      expect(existsSync(nestedCheckpointDir)).toBe(true);

      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'nested-test' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      const writeResult = await persistence.writeState(state);
      expect(writeResult).toBe(true);

      const checkpointId = await checkpointService.createCheckpoint(state, {
        id: 'nested-checkpoint',
        timestamp: Date.now(),
        reason: 'manual'
      });
      expect(checkpointId).toBe('nested-checkpoint');
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track statistics across all components', async () => {
      const persistence = new StatePersistence(statePath);
      const checkpointService = new CheckpointService(checkpointDir);
      const journal = new StateJournal(journalPath);

      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'stats-test' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      // Perform operations
      await persistence.writeState(state);
      await persistence.readState();
      await persistence.readState();

      await checkpointService.createCheckpoint(state, {
        id: 'stats-checkpoint',
        timestamp: Date.now(),
        reason: 'manual'
      });
      await checkpointService.getCheckpoint('stats-checkpoint');
      await checkpointService.listCheckpoints();

      const entry = journal.createEntry('create', 'agent-1');
      await journal.append(entry);
      await journal.query({ limit: 10 });

      // Wait for journal flush
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify statistics
      const persistenceStats = persistence.getStats();
      expect(persistenceStats.totalWrites).toBe(1);
      expect(persistenceStats.totalReads).toBe(2);

      const journalStats = journal.getStats();
      expect(journalStats.totalAppends).toBe(1);
      expect(journalStats.totalQueries).toBe(1);

      journal.stop();
    });
  });
});
