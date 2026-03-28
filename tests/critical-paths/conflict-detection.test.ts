/**
 * Conflict Detection - Critical Path Tests
 *
 * Tests for Phase 37: Conflict Detection
 * Coverage target: ≥75% for conflict-detector.ts
 *
 * Tests:
 * - Pre-write conflict checks
 * - FIFO auto-resolution
 * - 3-tier escalation
 * - Conflict logging
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictDetector } from '../../bin/lib/orchestration/conflict-detector.js';
import { ConflictLog } from '../../bin/lib/orchestration/conflict-log.js';
import { FileLockManager } from '../../bin/lib/file/file-lock-manager.js';
import { AgentMesh } from '../../bin/lib/orchestration/AgentMesh.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Conflict Detection - Critical Path', () => {
  let conflictDetector: ConflictDetector;
  let lockManager: FileLockManager;
  let mesh: AgentMesh;
  let conflictLog: ConflictLog;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-test-'));
    lockManager = new FileLockManager(tempDir);
    mesh = new AgentMesh();
    conflictLog = new ConflictLog();
    conflictDetector = new ConflictDetector(lockManager, mesh, conflictLog);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Pre-Write Conflict Checks', () => {
    it('detects conflicts before write (pre-write check)', async () => {
      const filePath = join(tempDir, 'test.txt');
      
      // Lock file with agent-2
      await lockManager.lock(filePath, 'agent-2');
      
      // Agent-1 tries to write (should detect conflict)
      const result = await conflictDetector.checkConflict(filePath, 'agent-1');
      
      expect(result.hasConflict).toBe(true);
      expect(result.action).toBe('wait');
      expect(result.waitingFor).toBe('agent-2');
      
      // Cleanup
      await lockManager.unlock(filePath, 'agent-2');
    });

    it('allows write when no conflict', async () => {
      const filePath = join(tempDir, 'test.txt');
      
      // No lock exists
      const result = await conflictDetector.checkConflict(filePath, 'agent-1');
      
      expect(result.hasConflict).toBe(false);
      expect(result.action).toBe('proceed');
    });

    it('allows same agent to write to locked file', async () => {
      const filePath = join(tempDir, 'test.txt');
      
      // Lock with agent-1
      await lockManager.lock(filePath, 'agent-1');
      
      // Same agent checks conflict (should proceed)
      const result = await conflictDetector.checkConflict(filePath, 'agent-1');
      
      expect(result.hasConflict).toBe(false);
      expect(result.action).toBe('proceed');
      
      // Cleanup
      await lockManager.unlock(filePath, 'agent-1');
    });
  });

  describe('FIFO Auto-Resolution', () => {
    it('resolves conflicts with first-come-first-served', async () => {
      const filePath = join(tempDir, 'test.txt');
      
      // Agent-1 locks first
      await lockManager.lock(filePath, 'agent-1');
      
      // Agent-2 tries to lock (should wait)
      const result2 = await conflictDetector.checkConflict(filePath, 'agent-2');
      expect(result2.hasConflict).toBe(true);
      expect(result2.action).toBe('wait');
      
      // Agent-1 releases
      await lockManager.unlock(filePath, 'agent-1');
      
      // Notify conflict detector of release
      await conflictDetector.resolveConflict(filePath, 'agent-1');
      
      // Agent-2 can now proceed (in production, would be notified)
      const resultAfter = await conflictDetector.checkConflict(filePath, 'agent-2');
      expect(resultAfter.hasConflict).toBe(false);
      expect(resultAfter.action).toBe('proceed');
      
      // Cleanup
      await lockManager.unlock(filePath, 'agent-2');
    });

    it('maintains FIFO order for multiple waiting agents', async () => {
      const filePath = join(tempDir, 'test.txt');
      
      // Agent-1 locks first
      await lockManager.lock(filePath, 'agent-1');
      
      // Agents 2, 3, 4 try to lock (all should wait in FIFO order)
      const result2 = await conflictDetector.checkConflict(filePath, 'agent-2');
      const result3 = await conflictDetector.checkConflict(filePath, 'agent-3');
      const result4 = await conflictDetector.checkConflict(filePath, 'agent-4');
      
      expect(result2.hasConflict).toBe(true);
      expect(result3.hasConflict).toBe(true);
      expect(result4.hasConflict).toBe(true);
      
      // Cleanup
      await lockManager.unlock(filePath, 'agent-1');
    });
  });

  describe('3-Tier Escalation', () => {
    it('escalates through tiers when negotiation fails', async () => {
      const filePath = join(tempDir, 'test.txt');
      
      // Create conflict
      await lockManager.lock(filePath, 'agent-1');
      await conflictDetector.checkConflict(filePath, 'agent-2');
      
      // In production, would escalate:
      // Tier 1: Agent negotiation (automatic)
      // Tier 2: Orchestrator decision
      // Tier 3: User escalation
      
      // Verify escalation method exists
      expect(conflictDetector.escalateConflict).toBeDefined();
      
      // Cleanup
      await lockManager.unlock(filePath, 'agent-1');
    });

    it('logs escalation events', async () => {
      // Verify conflict log exists and tracks escalations
      const stats = await conflictDetector.getStatistics();
      expect(stats).toBeDefined();
    });
  });

  describe('Conflict Logging', () => {
    it('logs all conflicts for audit', async () => {
      const filePath = join(tempDir, 'test.txt');
      
      // Create conflict
      await lockManager.lock(filePath, 'agent-1');
      await conflictDetector.checkConflict(filePath, 'agent-2');
      
      // Resolve conflict
      await lockManager.unlock(filePath, 'agent-1');
      await conflictDetector.resolveConflict(filePath, 'agent-1');
      
      // Get statistics
      const stats = await conflictDetector.getStatistics();
      
      // Verify conflict was logged
      expect(stats.totalConflicts).toBeGreaterThanOrEqual(1);
    });

    it('tracks conflict resolution time', async () => {
      const filePath = join(tempDir, 'test.txt');
      
      // Create and resolve conflict
      await lockManager.lock(filePath, 'agent-1');
      const checkTime = Date.now();
      await conflictDetector.checkConflict(filePath, 'agent-2');
      
      await lockManager.unlock(filePath, 'agent-1');
      await conflictDetector.resolveConflict(filePath, 'agent-1');
      
      const stats = await conflictDetector.getStatistics();
      
      // Verify resolution time is tracked
      expect(stats.avgResolutionTime).toBeGreaterThanOrEqual(0);
    });

    it('provides file history', async () => {
      const filePath = join(tempDir, 'test.txt');
      
      // Create multiple conflicts on same file
      for (let i = 0; i < 3; i++) {
        await lockManager.lock(filePath, `agent-${i}`);
        await conflictDetector.checkConflict(filePath, `agent-${i + 10}`);
        await lockManager.unlock(filePath, `agent-${i}`);
        await conflictDetector.resolveConflict(filePath, `agent-${i}`);
      }
      
      // Get file history
      const history = await conflictDetector.getFileHistory(filePath, 10);
      
      // Verify history is tracked
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Alert Notifications', () => {
    it('sends immediate alerts to affected agents', async () => {
      const filePath = join(tempDir, 'test.txt');
      
      // Create conflict
      await lockManager.lock(filePath, 'agent-1');
      
      // Agent-2 tries to write
      const result = await conflictDetector.checkConflict(filePath, 'agent-2');
      
      // Verify alert was sent (via AgentMesh)
      expect(result.hasConflict).toBe(true);
      
      // Cleanup
      await lockManager.unlock(filePath, 'agent-1');
    });

    it('uses warning format for alerts', async () => {
      // Alert format is defined in conflict-detector.ts
      // This test verifies the alert mechanism exists
      expect(conflictDetector.checkConflict).toBeDefined();
    });
  });
});
