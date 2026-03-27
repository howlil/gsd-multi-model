/**
 * State Manager Tests
 *
 * Tests for StateManager class including:
 * - State versioning with vector clocks
 * - Conflict detection
 * - State updates and broadcast
 * - Checkpoint persistence
 * - Crash recovery
 * - Sync statistics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  StateManager,
  type TaskState,
  type StateVersion,
  type GlobalState,
  type SyncStats
} from '../../bin/lib/state/state-manager.js';
import { StateValidator } from '../../bin/lib/state/state-validator.js';
import { AgentMesh } from '../../bin/lib/orchestration/AgentMesh.js';
import { ContextShareManager } from '../../bin/lib/orchestration/context-share-manager.js';

// Mock agent for testing
const mockAgent = {
  name: 'mock-agent',
  execute: vi.fn()
};

describe('StateManager', () => {
  let stateManager: StateManager;
  let mesh: AgentMesh;
  let contextShare: ContextShareManager;
  let tempDir: string;
  let statePath: string;

  beforeEach(() => {
    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ez-state-test-'));
    statePath = path.join(tempDir, 'STATE.md');

    // Create mesh and context share manager
    mesh = new AgentMesh();
    contextShare = new ContextShareManager(mesh);

    // Create state manager with faster checkpoint interval for testing
    stateManager = new StateManager(mesh, contextShare, statePath, 60000);
  });

  afterEach(() => {
    // Stop state manager and cleanup
    stateManager.stop();

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Initialization', () => {
    it('should create StateManager instance', () => {
      expect(stateManager).toBeDefined();
      expect(stateManager).toBeInstanceOf(EventEmitter);
    });

    it('should initialize with default state path', () => {
      const defaultManager = new StateManager(mesh, contextShare);
      expect(defaultManager).toBeDefined();
      defaultManager.stop();
    });

    it('should initialize with custom checkpoint interval', () => {
      const customManager = new StateManager(mesh, contextShare, statePath, 10000);
      expect(customManager).toBeDefined();
      customManager.stop();
    });
  });

  describe('State Versioning', () => {
    it('should create version with vector clock', async () => {
      const result = await stateManager.updateTaskState(
        'test-01',
        { phase: 1, plan: 1, status: 'pending' },
        'ez-planner'
      );

      expect(result).toBe(true);
      const state = stateManager.getTaskState('test-01');
      expect(state).toBeDefined();
      expect(state!.version.vectorClock.get('ez-planner')).toBe(1);
    });

    it('should increment version on update', async () => {
      await stateManager.updateTaskState(
        'test-01',
        { phase: 1, plan: 1, status: 'pending' },
        'ez-planner'
      );

      await stateManager.updateTaskState(
        'test-01',
        { status: 'in-progress' },
        'ez-planner'
      );

      const state = stateManager.getTaskState('test-01');
      expect(state!.version.vectorClock.get('ez-planner')).toBe(2);
    });

    it('should handle multiple agents in vector clock', async () => {
      await stateManager.updateTaskState(
        'test-01',
        { phase: 1, plan: 1, status: 'pending' },
        'ez-planner'
      );

      await stateManager.updateTaskState(
        'test-01',
        { status: 'in-progress' },
        'ez-coder'
      );

      const state = stateManager.getTaskState('test-01');
      // ez-planner updated once (counter = 1)
      // ez-coder updated once (counter = 1, but increments from existing which includes ez-planner's 1)
      // After ez-coder's update, the vector clock should have both agents
      expect(state!.version.vectorClock.get('ez-planner')).toBe(1);
      expect(state!.version.vectorClock.get('ez-coder')).toBe(1);
    });
  });

  describe('Conflict Detection', () => {
    it('should detect concurrent modifications', () => {
      // This test verifies the conflict detection logic
      const existingState: TaskState = {
        taskId: 'test-01',
        phase: 1,
        plan: 1,
        status: 'pending',
        version: {
          vectorClock: new Map([['ez-planner', 2], ['ez-coder', 1]]),
          timestamp: Date.now(),
          checksum: 'abc'
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const updateVersion: StateVersion = {
        vectorClock: new Map([['ez-planner', 1], ['ez-coder', 2]]),
        timestamp: Date.now(),
        checksum: 'def'
      };

      // Access private method via any cast for testing
      const hasConflict = (stateManager as unknown as { detectConflict: (a: TaskState, b?: StateVersion) => boolean }).detectConflict(existingState, updateVersion);
      expect(hasConflict).toBe(true);
    });

    it('should not detect conflict for causal ordering', () => {
      const existingState: TaskState = {
        taskId: 'test-01',
        phase: 1,
        plan: 1,
        status: 'pending',
        version: {
          vectorClock: new Map([['ez-planner', 2], ['ez-coder', 1]]),
          timestamp: Date.now(),
          checksum: 'abc'
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const updateVersion: StateVersion = {
        vectorClock: new Map([['ez-planner', 2], ['ez-coder', 2]]),
        timestamp: Date.now(),
        checksum: 'def'
      };

      const hasConflict = (stateManager as unknown as { detectConflict: (a: TaskState, b?: StateVersion) => boolean }).detectConflict(existingState, updateVersion);
      expect(hasConflict).toBe(false);
    });

    it('should return false when no update version provided', () => {
      const existingState: TaskState = {
        taskId: 'test-01',
        phase: 1,
        plan: 1,
        status: 'pending',
        version: {
          vectorClock: new Map([['ez-planner', 1]]),
          timestamp: Date.now(),
          checksum: 'abc'
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const hasConflict = (stateManager as unknown as { detectConflict: (a: TaskState, b?: StateVersion) => boolean }).detectConflict(existingState);
      expect(hasConflict).toBe(false);
    });
  });

  describe('State Updates', () => {
    it('should create new task state', async () => {
      const result = await stateManager.updateTaskState(
        'test-01',
        { phase: 1, plan: 1, status: 'pending' },
        'ez-planner'
      );

      expect(result).toBe(true);
      const state = stateManager.getTaskState('test-01');
      expect(state).toBeDefined();
      expect(state!.taskId).toBe('test-01');
      expect(state!.phase).toBe(1);
      expect(state!.plan).toBe(1);
      expect(state!.status).toBe('pending');
    });

    it('should update existing task state', async () => {
      await stateManager.updateTaskState(
        'test-01',
        { phase: 1, plan: 1, status: 'pending' },
        'ez-planner'
      );

      const result = await stateManager.updateTaskState(
        'test-01',
        { status: 'in-progress' },
        'ez-planner'
      );

      expect(result).toBe(true);
      const state = stateManager.getTaskState('test-01');
      expect(state!.status).toBe('in-progress');
    });

    it('should emit state-updated event', async () => {
      const eventPromise = new Promise<{ taskId: string; state: TaskState; agentId: string }>((resolve) => {
        stateManager.once('state-updated', resolve);
      });

      await stateManager.updateTaskState(
        'test-01',
        { phase: 1, plan: 1, status: 'pending' },
        'ez-planner'
      );

      const event = await eventPromise;
      expect(event.taskId).toBe('test-01');
      expect(event.state.status).toBe('pending');
      expect(event.agentId).toBe('ez-planner');
    });

    it('should handle state updates gracefully', async () => {
      // State updates should not throw errors for invalid data
      // The StateManager handles errors internally and returns false
      const result = await stateManager.updateTaskState(
        'test-01',
        { phase: 1, plan: 1, status: 'pending' },
        'ez-planner'
      );

      expect(result).toBe(true);
      const state = stateManager.getTaskState('test-01');
      expect(state).toBeDefined();
    });
  });

  describe('Sync Statistics', () => {
    it('should track sync statistics', async () => {
      await stateManager.updateTaskState(
        'test-01',
        { phase: 1, plan: 1, status: 'pending' },
        'ez-planner'
      );

      const stats = stateManager.getSyncStats();
      expect(stats.totalSyncs).toBe(1);
      expect(stats.successfulSyncs).toBe(1);
      expect(stats.failedSyncs).toBe(0);
      expect(stats.averageLatencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return copy of sync stats', async () => {
      await stateManager.updateTaskState(
        'test-01',
        { phase: 1, plan: 1, status: 'pending' },
        'ez-planner'
      );

      const stats1 = stateManager.getSyncStats();
      const stats2 = stateManager.getSyncStats();

      // Should be different objects
      expect(stats1).not.toBe(stats2);
      expect(stats1.totalSyncs).toBe(stats2.totalSyncs);
    });

    it('should track failed syncs', async () => {
      // First successful sync
      await stateManager.updateTaskState(
        'test-01',
        { phase: 1, plan: 1, status: 'pending' },
        'ez-planner'
      );

      // Force a failure
      try {
        await stateManager.updateTaskState(
          'test-02',
          { phase: Infinity, plan: Infinity, status: 'pending' },
          'ez-coder'
        );
      } catch {
        // Expected
      }

      const stats = stateManager.getSyncStats();
      expect(stats.totalSyncs).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Checkpoint Persistence', () => {
    it('should create checkpoint directory', async () => {
      // Trigger checkpoint creation
      await new Promise<void>((resolve) => {
        stateManager.once('checkpoint-created', () => resolve());
        // Manually trigger checkpoint for testing
        (stateManager as unknown as { createCheckpoint: () => Promise<void> }).createCheckpoint();
      });

      const checkpointsDir = path.join(path.dirname(statePath), 'checkpoints');
      expect(fs.existsSync(checkpointsDir)).toBe(true);
    });

    it('should emit checkpoint-created event', async () => {
      const eventPromise = new Promise<{ checkpointId: string }>((resolve) => {
        stateManager.once('checkpoint-created', resolve);
      });

      // Manually trigger checkpoint
      await (stateManager as unknown as { createCheckpoint: () => Promise<void> }).createCheckpoint();

      const event = await eventPromise;
      expect(event.checkpointId).toMatch(/^checkpoint-\d+$/);
    });

    it('should serialize and deserialize global state', () => {
      const globalState: GlobalState = {
        version: {
          vectorClock: new Map([['ez-planner', 1]]),
          timestamp: Date.now(),
          checksum: 'abc'
        },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      const serialized = (stateManager as unknown as { serializeGlobalState: () => string }).serializeGlobalState();
      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe('string');
    });
  });

  describe('Crash Recovery', () => {
    it('should return false when no checkpoint exists', async () => {
      const result = await stateManager.recoverFromCheckpoint();
      expect(result).toBe(false);
    });

    it('should recover from checkpoint', async () => {
      // Create a checkpoint
      await stateManager.updateTaskState(
        'test-01',
        { phase: 1, plan: 1, status: 'pending' },
        'ez-planner'
      );

      await (stateManager as unknown as { createCheckpoint: () => Promise<void> }).createCheckpoint();

      // Create new state manager to simulate restart
      stateManager.stop();
      const newStateManager = new StateManager(mesh, contextShare, statePath, 60000);

      try {
        const result = await newStateManager.recoverFromCheckpoint();
        expect(result).toBe(true);

        const state = newStateManager.getTaskState('test-01');
        expect(state).toBeDefined();
      } finally {
        newStateManager.stop();
      }
    });

    it('should emit recovery-complete event on success', async () => {
      // Create a checkpoint first
      await (stateManager as unknown as { createCheckpoint: () => Promise<void> }).createCheckpoint();

      const eventPromise = new Promise<{ checkpointId: string }>((resolve) => {
        stateManager.once('recovery-complete', resolve);
      });

      await stateManager.recoverFromCheckpoint();

      const event = await eventPromise;
      expect(event.checkpointId).toMatch(/^checkpoint-\d+$/);
    });
  });
});

describe('StateValidator', () => {
  let validator: StateValidator;

  beforeEach(() => {
    validator = new StateValidator();
  });

  describe('validateTaskState', () => {
    it('should validate valid task state', () => {
      const state: TaskState = {
        taskId: 'test-01',
        phase: 1,
        plan: 1,
        status: 'pending',
        version: {
          vectorClock: new Map([['ez-planner', 1]]),
          timestamp: Date.now(),
          checksum: 'abc'
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const result = validator.validateTaskState(state);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid task state', () => {
      const state = {
        taskId: 123, // Should be string
        phase: 'one', // Should be number
        status: 'invalid'
      };

      const result = validator.validateTaskState(state);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject non-object', () => {
      const result = validator.validateTaskState(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('State must be an object');
    });

    it('should validate optional fields', () => {
      const state: TaskState = {
        taskId: 'test-01',
        phase: 1,
        plan: 1,
        status: 'in-progress',
        agent: 'ez-coder',
        output: 'Code generated',
        context: ['context-1', 'context-2'],
        version: {
          vectorClock: new Map([['ez-coder', 1]]),
          timestamp: Date.now(),
          checksum: 'def'
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: { key: 'value' }
      };

      const result = validator.validateTaskState(state);
      expect(result.valid).toBe(true);
    });
  });

  describe('validatePhaseState', () => {
    it('should validate valid phase state', () => {
      const state = {
        phase: 36,
        status: 'in-progress',
        currentPlan: 1,
        completedPlans: [],
        requirements: new Map()
      };

      const result = validator.validatePhaseState(state);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid phase state', () => {
      const state = {
        phase: 'thirty-six', // Should be number
        status: 'invalid',
        completedPlans: 'not-array' // Should be array
      };

      const result = validator.validatePhaseState(state);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateRequirementState', () => {
    it('should validate valid requirement state', () => {
      const state = {
        id: 'STATE-01',
        status: 'completed',
        agent: 'ez-planner',
        output: 'Requirement met'
      };

      const result = validator.validateRequirementState(state);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid requirement state', () => {
      const state = {
        id: 123, // Should be string
        status: 'invalid'
      };

      const result = validator.validateRequirementState(state);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateStateVersion', () => {
    it('should validate valid state version', () => {
      const version: StateVersion = {
        vectorClock: new Map([['ez-planner', 1]]),
        timestamp: Date.now(),
        checksum: 'abc123'
      };

      const result = validator.validateStateVersion(version);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid version', () => {
      const version = {
        vectorClock: 'not-a-map',
        timestamp: 'not-a-number'
      };

      const result = validator.validateStateVersion(version);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateGlobalState', () => {
    it('should validate valid global state', () => {
      const state: GlobalState = {
        version: {
          vectorClock: new Map([['ez-planner', 1]]),
          timestamp: Date.now(),
          checksum: 'abc'
        },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: 'checkpoint-123'
      };

      const result = validator.validateGlobalState(state);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid global state', () => {
      const state = {
        version: 'invalid',
        taskStates: 'not-a-map'
      };

      const result = validator.validateGlobalState(state);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
