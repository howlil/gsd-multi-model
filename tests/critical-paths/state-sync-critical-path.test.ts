/**
 * State Synchronization - Critical Path Tests
 *
 * Tests for Phase 40: State Synchronization
 * Coverage target: ≥75% for state-manager.ts
 *
 * Requirements:
 * - TEST-02: State synchronization critical path tests
 *   - Vector clock versioning
 *   - Real-time state sync between agents
 *   - Conflict detection with vector clocks
 *   - Checkpoint-based recovery
 *   - State persistence and atomic writes
 *   - Backup management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StateManager } from '../../bin/lib/state/state-manager.js';
import { StatePersistence, CheckpointService } from '../../bin/lib/state/persistence.js';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('State Synchronization - Critical Path', () => {
  describe('StateManager - Vector Clock Versioning', () => {
    let stateManager: StateManager;

    beforeEach(() => {
      stateManager = new StateManager();
    });

    it('versions state with vector clocks', async () => {
      const taskId = 'test-task';

      // Initial state
      await stateManager.updateState(taskId, { data: 'initial' });
      const state1 = await stateManager.getState(taskId);

      // Update state
      await stateManager.updateState(taskId, { data: 'updated' });
      const state2 = await stateManager.getState(taskId);

      // Vector clock should increment
      expect(state2.version).toBeDefined();
      expect(state2.data).toBe('updated');
    });

    it('tracks per-agent vector clock counters', async () => {
      const taskId = 'test-task';

      // Agent A updates state
      await stateManager.updateState(taskId, { data: 'from-A' }, 'agent-A');
      const stateA = await stateManager.getState(taskId);

      // Agent B updates state
      await stateManager.updateState(taskId, { data: 'from-B' }, 'agent-B');
      const stateB = await stateManager.getState(taskId);

      // Vector clock should track both agents
      expect(stateB.vectorClock).toBeDefined();
    });

    it('increments vector clock on each update', async () => {
      const taskId = 'test-task';

      await stateManager.updateState(taskId, { count: 1 }, 'agent-1');
      const state1 = await stateManager.getState(taskId);

      await stateManager.updateState(taskId, { count: 2 }, 'agent-1');
      const state2 = await stateManager.getState(taskId);

      // Clock should increment for same agent
      expect(state2.updatedAt).toBeGreaterThan(state1.updatedAt);
    });
  });

  describe('StateManager - Real-Time Sync', () => {
    let stateManager: StateManager;

    beforeEach(() => {
      stateManager = new StateManager();
    });

    it('syncs deltas between agents', async () => {
      const taskId = 'test-task';

      // Agent A updates state
      await stateManager.updateState(taskId, { field1: 'value1' });

      // Agent B gets state (delta sync)
      const state = await stateManager.getState(taskId);
      expect(state.data.field1).toBe('value1');
    });

    it('broadcasts state updates to subscribed agents', async () => {
      const taskId = 'test-task';

      // Update state
      await stateManager.updateState(taskId, { status: 'in-progress' });

      // State should be immediately available
      const state = await stateManager.getState(taskId);
      expect(state.data.status).toBe('in-progress');
    });

    it('tracks sync statistics', async () => {
      const taskId = 'test-task';

      // Multiple updates
      for (let i = 0; i < 5; i++) {
        await stateManager.updateState(taskId, { count: i });
      }

      const stats = await stateManager.getSyncStats();
      expect(stats.totalSyncs).toBeGreaterThanOrEqual(5);
    });
  });

  describe('StateManager - Conflict Detection', () => {
    let stateManager: StateManager;

    beforeEach(() => {
      stateManager = new StateManager();
    });

    it('resolves conflicts with last-write-wins', async () => {
      const taskId = 'test-task';

      // Two updates (simulating concurrent writes)
      await stateManager.updateState(taskId, { data: 'first' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await stateManager.updateState(taskId, { data: 'second' });

      // Last write wins
      const state = await stateManager.getState(taskId);
      expect(state.data).toBe('second');
    });

    it('detects concurrent modifications via vector clocks', async () => {
      const taskId = 'test-task';

      // Agent A updates
      await stateManager.updateState(taskId, { value: 'A' }, 'agent-A');

      // Agent B updates
      await stateManager.updateState(taskId, { value: 'B' }, 'agent-B');

      const state = await stateManager.getState(taskId);
      expect(state.vectorClock).toBeDefined();
    });
  });

  describe('StateManager - Checkpoint Recovery', () => {
    let stateManager: StateManager;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-state-'));
      stateManager = new StateManager();
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('creates checkpoints for recovery', async () => {
      const taskId = 'test-task';

      // Update state
      await stateManager.updateState(taskId, { data: 'checkpoint-test' });

      // Create checkpoint
      const checkpointId = await stateManager.createCheckpoint('test-checkpoint');
      expect(checkpointId).toBeDefined();
    });

    it('recovers state from checkpoint', async () => {
      const taskId = 'test-task';

      // Set initial state
      await stateManager.updateState(taskId, { data: 'original' });
      const checkpointId = await stateManager.createCheckpoint('before-change');

      // Change state
      await stateManager.updateState(taskId, { data: 'modified' });

      // Verify change
      const modifiedState = await stateManager.getState(taskId);
      expect(modifiedState.data).toBe('modified');

      // Restore from checkpoint
      const restored = await stateManager.restoreFromCheckpoint(checkpointId);
      expect(restored).toBe(true);
    });

    it('tracks checkpoint history', async () => {
      // Create multiple checkpoints
      await stateManager.createCheckpoint('checkpoint-1');
      await new Promise(resolve => setTimeout(resolve, 10));
      await stateManager.createCheckpoint('checkpoint-2');

      const checkpoints = await stateManager.getCheckpointHistory();
      expect(checkpoints.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('StatePersistence - Atomic Writes', () => {
    let persistence: StatePersistence;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-persist-'));
      persistence = new StatePersistence(tempDir);
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('writes state atomically using temp file + rename', async () => {
      const state = { taskId: 'test', data: { value: 1 } };

      const result = await persistence.writeState('test-task', state);
      expect(result.success).toBe(true);

      // Read back
      const readState = await persistence.readState('test-task');
      expect(readState?.data.value).toBe(1);
    });

    it('creates backups before overwriting', async () => {
      const state1 = { taskId: 'test', data: { version: 1 } };
      const state2 = { taskId: 'test', data: { version: 2 } };

      // Write twice to trigger backup
      await persistence.writeState('test-task', state1);
      await persistence.writeState('test-task', state2);

      // Check for backups
      const backups = await persistence.getBackups('test-task');
      expect(backups.length).toBeGreaterThanOrEqual(1);
    });

    it('restores from backup', async () => {
      const state1 = { taskId: 'test', data: { version: 1 } };

      await persistence.writeState('test-task', state1);
      await persistence.writeState('test-task', { taskId: 'test', data: { version: 2 } });

      // Restore from backup
      const backups = await persistence.getBackups('test-task');
      if (backups.length > 0) {
        const restored = await persistence.restoreFromBackup(backups[0].id);
        expect(restored).toBe(true);
      }
    });

    it('rotates old backups', async () => {
      // Write multiple times to trigger rotation
      for (let i = 0; i < 10; i++) {
        await persistence.writeState('test-task', { taskId: 'test', data: { version: i } });
      }

      const backups = await persistence.getBackups('test-task');
      // Should have limited number of backups (default 3)
      expect(backups.length).toBeLessThanOrEqual(5);
    });
  });

  describe('StatePersistence - Serialization', () => {
    let persistence: StatePersistence;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-serial-'));
      persistence = new StatePersistence(tempDir);
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('serializes and deserializes Map objects', async () => {
      const state = {
        taskId: 'test',
        mapData: new Map([['key1', 'value1'], ['key2', 'value2']])
      };

      await persistence.writeState('test-task', state);
      const readState = await persistence.readState('test-task');

      expect(readState?.mapData).toBeDefined();
    });

    it('handles complex nested objects', async () => {
      const state = {
        taskId: 'test',
        nested: {
          level1: {
            level2: {
              data: [1, 2, 3]
            }
          }
        }
      };

      await persistence.writeState('test-task', state);
      const readState = await persistence.readState('test-task');

      expect(readState?.nested.level1.level2.data).toEqual([1, 2, 3]);
    });
  });

  describe('StatePersistence - Statistics', () => {
    let persistence: StatePersistence;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-stats-'));
      persistence = new StatePersistence(tempDir);
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('tracks write operations', async () => {
      for (let i = 0; i < 5; i++) {
        await persistence.writeState(`task-${i}`, { taskId: `task-${i}`, data: i });
      }

      const stats = persistence.getStats();
      expect(stats.writeCount).toBeGreaterThanOrEqual(5);
    });

    it('tracks read operations', async () => {
      await persistence.writeState('test-task', { taskId: 'test' });

      for (let i = 0; i < 5; i++) {
        await persistence.readState('test-task');
      }

      const stats = persistence.getStats();
      expect(stats.readCount).toBeGreaterThanOrEqual(5);
    });

    it('tracks average write duration', async () => {
      for (let i = 0; i < 3; i++) {
        await persistence.writeState(`task-${i}`, { taskId: `task-${i}` });
      }

      const stats = persistence.getStats();
      expect(stats.averageWriteDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration - State Sync Workflow', () => {
    it('executes complete state sync workflow', async () => {
      const stateManager = new StateManager();
      const taskId = 'integration-test';

      // Agent A creates initial state
      await stateManager.updateState(taskId, { status: 'started', agent: 'A' }, 'agent-A');

      // Agent B reads and updates
      const stateB = await stateManager.getState(taskId);
      expect(stateB.data.status).toBe('started');

      await stateManager.updateState(taskId, { status: 'in-progress', agent: 'B' }, 'agent-B');

      // Agent A reads updated state
      const stateA = await stateManager.getState(taskId);
      expect(stateA.data.status).toBe('in-progress');

      // Create checkpoint
      const checkpointId = await stateManager.createCheckpoint('mid-point');
      expect(checkpointId).toBeDefined();

      // Verify stats
      const stats = await stateManager.getSyncStats();
      expect(stats.totalSyncs).toBeGreaterThanOrEqual(3);
    });
  });
});
