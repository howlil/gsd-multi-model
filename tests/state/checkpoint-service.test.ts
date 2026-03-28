/**
 * CheckpointService - Comprehensive Tests
 *
 * Tests for CheckpointService class from bin/lib/state/persistence.ts
 * Coverage target: ≥80%
 *
 * Tests cover:
 * - createCheckpoint with metadata
 * - getCheckpoint with checksum validation
 * - listCheckpoints sorted by timestamp
 * - deleteCheckpoint
 * - Event emissions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CheckpointService } from '../../bin/lib/state/persistence.js';
import type { GlobalState } from '../../bin/lib/state/state-manager.js';
import { join } from 'path';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';

describe('CheckpointService', () => {
  let tempDir: string;
  let checkpointService: CheckpointService;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-checkpoint-test-'));
    checkpointService = new CheckpointService(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('createCheckpoint', () => {
    it('should create checkpoint file and metadata file', async () => {
      const state: GlobalState = {
        version: {
          vectorClock: new Map([['agent-1', 1]]),
          timestamp: Date.now(),
          checksum: 'checkpoint-checksum'
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
        checkpointId: 'checkpoint-1'
      };

      const metadata = {
        id: 'test-checkpoint-1',
        timestamp: Date.now(),
        reason: 'manual' as const
      };

      const checkpointId = await checkpointService.createCheckpoint(state, metadata);

      expect(checkpointId).toBe('test-checkpoint-1');

      // Verify checkpoint file exists
      const files = await import('fs/promises').then(fs => fs.readdir(tempDir));
      const checkpointFiles = files.filter(f => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const metadataFiles = files.filter(f => f.endsWith('.meta.json'));

      expect(checkpointFiles.length).toBe(1);
      expect(metadataFiles.length).toBe(1);
    });

    it('should return checkpoint ID', async () => {
      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'test' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      const checkpointId = await checkpointService.createCheckpoint(state, {
        id: 'my-checkpoint',
        timestamp: Date.now(),
        reason: 'manual'
      });

      expect(checkpointId).toBe('my-checkpoint');
    });

    it('should include stateSize and checksum in metadata', async () => {
      const state: GlobalState = {
        version: { vectorClock: new Map([['agent-1', 1]]), timestamp: Date.now(), checksum: 'size-test' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      const checkpointId = await checkpointService.createCheckpoint(state, {
        id: 'size-checkpoint',
        timestamp: Date.now(),
        reason: 'manual'
      });

      const metadata = checkpointService.getMetadata(checkpointId);
      expect(metadata).toBeDefined();
      expect(metadata?.stateSize).toBeGreaterThan(0);
      expect(metadata?.checksum).toBeDefined();
    });

    it('should emit checkpoint-created event', async () => {
      const eventPromise = new Promise<any>((resolve) => {
        checkpointService.once('checkpoint-created', resolve);
      });

      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'event-test' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      await checkpointService.createCheckpoint(state, {
        id: 'event-checkpoint',
        timestamp: Date.now(),
        reason: 'manual'
      });

      const event = await eventPromise;
      expect(event).toBeDefined();
      expect(event.checkpointId).toBe('event-checkpoint');
      expect(event.metadata).toBeDefined();
    });

    it('should create checkpoint with task metadata', async () => {
      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'task-meta' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      const checkpointId = await checkpointService.createCheckpoint(state, {
        id: 'task-checkpoint',
        timestamp: Date.now(),
        taskId: '01-01',
        reason: 'task-complete'
      });

      const metadata = checkpointService.getMetadata(checkpointId);
      expect(metadata?.taskId).toBe('01-01');
      expect(metadata?.reason).toBe('task-complete');
    });

    it('should create checkpoint with phase metadata', async () => {
      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'phase-meta' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      const checkpointId = await checkpointService.createCheckpoint(state, {
        id: 'phase-checkpoint',
        timestamp: Date.now(),
        phase: 42,
        plan: 10,
        reason: 'phase-complete'
      });

      const metadata = checkpointService.getMetadata(checkpointId);
      expect(metadata?.phase).toBe(42);
      expect(metadata?.plan).toBe(10);
    });

    it('should generate unique ID if not provided', async () => {
      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'auto-id' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      const checkpointId1 = await checkpointService.createCheckpoint(state, {
        timestamp: Date.now(),
        reason: 'manual'
      });

      const checkpointId2 = await checkpointService.createCheckpoint(state, {
        timestamp: Date.now() + 1000,
        reason: 'manual'
      });

      expect(checkpointId1).not.toBe(checkpointId2);
    });
  });

  describe('getCheckpoint', () => {
    it('should return null for non-existent checkpoint', async () => {
      const state = await checkpointService.getCheckpoint('non-existent-id');
      expect(state).toBeNull();
    });

    it('should retrieve checkpoint state', async () => {
      const originalState: GlobalState = {
        version: {
          vectorClock: new Map([['agent-1', 5], ['agent-2', 3]]),
          timestamp: 9876543210,
          checksum: 'retrieval-test'
        },
        taskStates: new Map([
          ['01-01', {
            status: 'complete',
            version: {
              vectorClock: new Map([['agent-1', 5]]),
              timestamp: 9876543210,
              checksum: 'task-checksum'
            }
          }]
        ]),
        phaseState: new Map([[1, {
          status: 'complete',
          requirements: new Map([['STATE-01', 'complete']])
        }]]),
        checkpointId: 'retrieval-checkpoint'
      };

      const checkpointId = await checkpointService.createCheckpoint(originalState, {
        id: 'retrieval-test',
        timestamp: Date.now(),
        reason: 'manual'
      });

      const retrievedState = await checkpointService.getCheckpoint(checkpointId);

      expect(retrievedState).not.toBeNull();
      expect(retrievedState?.checkpointId).toBe('retrieval-checkpoint');
      expect(retrievedState?.version.checksum).toBe('retrieval-test');
      expect(retrievedState?.version.vectorClock.get('agent-1')).toBe(5);
    });

    it('should validate checksum', async () => {
      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'checksum-validation' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      const checkpointId = await checkpointService.createCheckpoint(state, {
        id: 'checksum-test',
        timestamp: Date.now(),
        reason: 'manual'
      });

      // Corrupt the checkpoint file
      const files = await import('fs/promises').then(fs => fs.readdir(tempDir));
      const checkpointFile = files.find(f => f.endsWith('.json') && !f.endsWith('.meta.json'));
      if (checkpointFile) {
        const checkpointPath = join(tempDir, checkpointFile);
        await import('fs/promises').then(fs => fs.writeFile(checkpointPath, '{ corrupted }', 'utf-8'));
      }

      // Should return null due to checksum mismatch or parse error
      const retrievedState = await checkpointService.getCheckpoint(checkpointId);
      expect(retrievedState).toBeNull();
    });

    it('should emit checkpoint-loaded event on success', async () => {
      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'event-load' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      const checkpointId = await checkpointService.createCheckpoint(state, {
        id: 'load-event-test',
        timestamp: Date.now(),
        reason: 'manual'
      });

      const eventPromise = new Promise<any>((resolve) => {
        checkpointService.once('checkpoint-loaded', resolve);
      });

      await checkpointService.getCheckpoint(checkpointId);
      const event = await eventPromise;

      expect(event).toBeDefined();
      expect(event.checkpointId).toBe('load-event-test');
    });
  });

  describe('listCheckpoints', () => {
    it('should return empty array when no checkpoints exist', async () => {
      const checkpoints = await checkpointService.listCheckpoints();
      expect(checkpoints).toEqual([]);
    });

    it('should return checkpoints sorted by timestamp (newest first)', async () => {
      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'list-test' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      // Create checkpoints with different timestamps
      const timestamp1 = 1000000000000;
      const timestamp2 = 2000000000000;
      const timestamp3 = 3000000000000;

      await checkpointService.createCheckpoint(state, {
        id: 'checkpoint-1',
        timestamp: timestamp1,
        reason: 'manual'
      });

      await checkpointService.createCheckpoint(state, {
        id: 'checkpoint-2',
        timestamp: timestamp2,
        reason: 'manual'
      });

      await checkpointService.createCheckpoint(state, {
        id: 'checkpoint-3',
        timestamp: timestamp3,
        reason: 'manual'
      });

      const checkpoints = await checkpointService.listCheckpoints();

      expect(checkpoints.length).toBe(3);
      expect(checkpoints[0].timestamp).toBe(timestamp3);
      expect(checkpoints[1].timestamp).toBe(timestamp2);
      expect(checkpoints[2].timestamp).toBe(timestamp1);
    });

    it('should include all metadata in list', async () => {
      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'metadata-test' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      await checkpointService.createCheckpoint(state, {
        id: 'full-meta-checkpoint',
        timestamp: Date.now(),
        phase: 42,
        taskId: '01-01',
        agentId: 'ez-planner',
        reason: 'task-complete'
      });

      const checkpoints = await checkpointService.listCheckpoints();

      expect(checkpoints.length).toBe(1);
      expect(checkpoints[0].id).toBe('full-meta-checkpoint');
      expect(checkpoints[0].phase).toBe(42);
      expect(checkpoints[0].taskId).toBe('01-01');
      expect(checkpoints[0].agentId).toBe('ez-planner');
      expect(checkpoints[0].reason).toBe('task-complete');
    });
  });

  describe('deleteCheckpoint', () => {
    it('should delete checkpoint and metadata files', async () => {
      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'delete-test' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      const checkpointId = await checkpointService.createCheckpoint(state, {
        id: 'to-delete',
        timestamp: Date.now(),
        reason: 'manual'
      });

      // Verify files exist
      const filesBefore = await import('fs/promises').then(fs => fs.readdir(tempDir));
      expect(filesBefore.length).toBe(2); // checkpoint + metadata

      // Delete
      const result = await checkpointService.deleteCheckpoint(checkpointId);
      expect(result).toBe(true);

      // Verify files deleted
      const filesAfter = await import('fs/promises').then(fs => fs.readdir(tempDir));
      expect(filesAfter.length).toBe(0);
    });

    it('should return false for non-existent checkpoint', async () => {
      const result = await checkpointService.deleteCheckpoint('non-existent');
      expect(result).toBe(false);
    });

    it('should emit checkpoint-deleted event', async () => {
      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'delete-event' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      const checkpointId = await checkpointService.createCheckpoint(state, {
        id: 'delete-event-test',
        timestamp: Date.now(),
        reason: 'manual'
      });

      const eventPromise = new Promise<any>((resolve) => {
        checkpointService.once('checkpoint-deleted', resolve);
      });

      await checkpointService.deleteCheckpoint(checkpointId);
      const event = await eventPromise;

      expect(event).toBeDefined();
      expect(event.checkpointId).toBe('delete-event-test');
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for checkpoint', async () => {
      const state: GlobalState = {
        version: { vectorClock: new Map(), timestamp: Date.now(), checksum: 'meta-get' },
        taskStates: new Map(),
        phaseState: new Map(),
        checkpointId: undefined
      };

      const checkpointId = await checkpointService.createCheckpoint(state, {
        id: 'meta-test',
        timestamp: 1234567890,
        phase: 42,
        taskId: '01-01',
        agentId: 'ez-executor',
        reason: 'phase-complete'
      });

      const metadata = checkpointService.getMetadata(checkpointId);

      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('meta-test');
      expect(metadata?.timestamp).toBe(1234567890);
      expect(metadata?.phase).toBe(42);
      expect(metadata?.taskId).toBe('01-01');
      expect(metadata?.agentId).toBe('ez-executor');
      expect(metadata?.reason).toBe('phase-complete');
      expect(metadata?.stateSize).toBeGreaterThan(0);
      expect(metadata?.checksum).toBeDefined();
    });

    it('should return undefined for non-existent checkpoint', async () => {
      const metadata = checkpointService.getMetadata('non-existent-checkpoint');
      expect(metadata).toBeUndefined();
    });
  });

  describe('Checkpoint Directory Creation', () => {
    it('should create checkpoint directory if not exists', () => {
      const nestedDir = join(tempDir, 'nested', 'checkpoints');
      const service = new CheckpointService(nestedDir);

      expect(existsSync(nestedDir)).toBe(true);
      rmSync(nestedDir, { recursive: true, force: true });
    });
  });

  describe('calculateChecksum', () => {
    it('should calculate consistent checksums', () => {
      const serialized1 = JSON.stringify({ test: 'data' });
      const serialized2 = JSON.stringify({ test: 'data' });
      const serialized3 = JSON.stringify({ test: 'different' });

      const checksum1 = (checkpointService as any).calculateChecksum(serialized1);
      const checksum2 = (checkpointService as any).calculateChecksum(serialized2);
      const checksum3 = (checkpointService as any).calculateChecksum(serialized3);

      expect(checksum1).toBe(checksum2);
      expect(checksum1).not.toBe(checksum3);
    });
  });
});
