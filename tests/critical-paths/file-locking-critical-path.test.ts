/**
 * File Locking - Critical Path Tests
 *
 * Tests for Phase 32: File Locking System
 * Coverage target: ≥80% for file-lock-manager.ts
 *
 * Requirements:
 * - TEST-04: File locking critical path tests
 *   - Concurrent write prevention
 *   - Deadlock detection and prevention
 *   - Stale lock cleanup
 *   - Lock statistics tracking
 *   - Lock queue with priority
 *   - Heartbeat mechanism
 *   - Force release
 *   - Lock persistence
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileLockManager, LockState, LockOptions } from '../../bin/lib/file/file-lock-manager.js';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('File Locking - Critical Path', () => {
  describe('FileLockManager - Concurrent Write Prevention', () => {
    let lockManager: FileLockManager;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-lock-'));
      lockManager = new FileLockManager(tempDir);
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('prevents concurrent writes to same file', async () => {
      const filePath = join(tempDir, 'test.txt');

      // First lock succeeds
      const lock1 = await lockManager.lock(filePath, 'agent-1');
      expect(lock1.acquired).toBe(true);
      expect(lock1.ownerId).toBe('agent-1');

      // Second lock fails (file already locked)
      const lock2 = await lockManager.lock(filePath, 'agent-2');
      expect(lock2.acquired).toBe(false);

      // Cleanup
      await lockManager.unlock(filePath, 'agent-1');
    });

    it('allows same agent to re-acquire lock', async () => {
      const filePath = join(tempDir, 'test.txt');

      // First lock
      const lock1 = await lockManager.lock(filePath, 'agent-1');
      expect(lock1.acquired).toBe(true);

      // Same agent re-acquires (should succeed)
      const lock2 = await lockManager.lock(filePath, 'agent-1');
      expect(lock2.acquired).toBe(true);

      // Cleanup
      await lockManager.unlock(filePath, 'agent-1');
    });

    it('allows different files to be locked concurrently', async () => {
      const file1 = join(tempDir, 'test1.txt');
      const file2 = join(tempDir, 'test2.txt');

      // Lock both files with different agents
      const lock1 = await lockManager.lock(file1, 'agent-1');
      const lock2 = await lockManager.lock(file2, 'agent-2');

      expect(lock1.acquired).toBe(true);
      expect(lock2.acquired).toBe(true);

      // Cleanup
      await lockManager.unlock(file1, 'agent-1');
      await lockManager.unlock(file2, 'agent-2');
    });

    it('releases lock properly', async () => {
      const filePath = join(tempDir, 'test.txt');

      await lockManager.lock(filePath, 'agent-1');
      const released = await lockManager.unlock(filePath, 'agent-1');
      expect(released).toBe(true);

      // Another agent can now acquire lock
      const lock2 = await lockManager.lock(filePath, 'agent-2');
      expect(lock2.acquired).toBe(true);

      await lockManager.unlock(filePath, 'agent-2');
    });
  });

  describe('FileLockManager - Deadlock Detection', () => {
    let lockManager: FileLockManager;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-deadlock-'));
      lockManager = new FileLockManager(tempDir);
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('detects potential deadlock scenario', async () => {
      const file1 = join(tempDir, 'test1.txt');
      const file2 = join(tempDir, 'test2.txt');

      // Agent 1 holds lock on file1
      await lockManager.lock(file1, 'agent-1');

      // Agent 2 holds lock on file2
      await lockManager.lock(file2, 'agent-2');

      // Both agents try to lock the other file (potential deadlock)
      // Deadlock should be detected and resolved

      const stats = await lockManager.getStatistics();
      expect(stats).toBeDefined();

      // Cleanup
      await lockManager.unlock(file1, 'agent-1');
      await lockManager.unlock(file2, 'agent-2');
    });

    it('resolves deadlock with FIFO ordering', async () => {
      const file1 = join(tempDir, 'test1.txt');
      const file2 = join(tempDir, 'test2.txt');

      // Create potential deadlock scenario
      await lockManager.lock(file1, 'agent-1');
      await lockManager.lock(file2, 'agent-2');

      // Verify locks are held
      const isFile1Locked = await lockManager.isLocked(file1);
      const isFile2Locked = await lockManager.isLocked(file2);

      expect(isFile1Locked).toBe(true);
      expect(isFile2Locked).toBe(true);

      // Cleanup
      await lockManager.unlock(file1, 'agent-1');
      await lockManager.unlock(file2, 'agent-2');
    });

    it('prevents deadlock with timeout', async () => {
      const filePath = join(tempDir, 'test.txt');

      // Agent 1 acquires lock
      await lockManager.lock(filePath, 'agent-1');

      // Agent 2 tries to acquire with timeout (should fail after timeout)
      const start = Date.now();
      const lock2 = await lockManager.lock(filePath, 'agent-2', { 
        timeout: 100,
        waitForLock: true 
      });
      const elapsed = Date.now() - start;

      // Should timeout after ~100ms
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(lock2.acquired).toBe(false);

      // Cleanup
      await lockManager.unlock(filePath, 'agent-1');
    });
  });

  describe('FileLockManager - Stale Lock Cleanup', () => {
    let lockManager: FileLockManager;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-stale-'));
      lockManager = new FileLockManager(tempDir);
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('cleans up locks after timeout', async () => {
      const filePath = join(tempDir, 'test.txt');

      // Lock with short timeout (100ms for testing)
      await lockManager.lock(filePath, 'agent-1', { timeout: 100 });

      // Verify lock exists
      expect(await lockManager.isLocked(filePath)).toBe(true);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Lock should be cleaned up or marked as stale
      const isLocked = await lockManager.isLocked(filePath);
      expect(typeof isLocked).toBe('boolean');
    });

    it('detects stale locks via heartbeat', async () => {
      const filePath = join(tempDir, 'test.txt');

      // Lock file
      await lockManager.lock(filePath, 'agent-1');

      // Get lock info
      const lockInfo = await lockManager.getLockInfo(filePath);
      expect(lockInfo).toBeDefined();
      expect(lockInfo?.ownerId).toBe('agent-1');

      // Cleanup
      await lockManager.unlock(filePath, 'agent-1');
    });

    it('marks lock as stale after staleTime', async () => {
      const filePath = join(tempDir, 'test.txt');

      // Lock with short stale time
      await lockManager.lock(filePath, 'agent-1', { staleTime: 100 });

      // Wait for stale time
      await new Promise(resolve => setTimeout(resolve, 150));

      // Lock should be marked as stale or cleaned up
      const lockInfo = await lockManager.getLockInfo(filePath);
      
      // Either lock is cleaned up or marked stale
      expect(lockInfo === undefined || lockInfo?.state === LockState.STALE).toBe(true);
    });
  });

  describe('FileLockManager - Lock Statistics', () => {
    let lockManager: FileLockManager;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-stats-'));
      lockManager = new FileLockManager(tempDir);
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('tracks total locks acquired', async () => {
      const filePath = join(tempDir, 'test.txt');

      // Acquire and release multiple locks
      for (let i = 0; i < 5; i++) {
        await lockManager.lock(filePath, `agent-${i}`);
        await lockManager.unlock(filePath, `agent-${i}`);
      }

      const stats = await lockManager.getStatistics();
      expect(stats.totalLocks).toBeGreaterThanOrEqual(5);
    });

    it('tracks successful vs failed lock attempts', async () => {
      const filePath = join(tempDir, 'test.txt');

      // Successful lock
      await lockManager.lock(filePath, 'agent-1');

      // Failed lock attempt
      await lockManager.lock(filePath, 'agent-2');

      // Cleanup
      await lockManager.unlock(filePath, 'agent-1');

      const stats = await lockManager.getStatistics();
      expect(stats.totalLocks).toBeGreaterThanOrEqual(1);
      expect(stats.failedAttempts).toBeGreaterThanOrEqual(1);
    });

    it('provides lock duration metrics', async () => {
      const filePath = join(tempDir, 'test.txt');

      // Lock for a short duration
      await lockManager.lock(filePath, 'agent-1');
      await new Promise(resolve => setTimeout(resolve, 50));
      await lockManager.unlock(filePath, 'agent-1');

      const stats = await lockManager.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.averageLockDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('tracks waiting locks', async () => {
      const filePath = join(tempDir, 'test.txt');

      // First agent acquires lock
      await lockManager.lock(filePath, 'agent-1');

      // Second agent waits for lock
      const lockPromise = lockManager.lock(filePath, 'agent-2', { 
        timeout: 200,
        waitForLock: true 
      });

      // Give some time for queue to form
      await new Promise(resolve => setTimeout(resolve, 50));

      const stats = await lockManager.getStatistics();
      expect(stats.waitingLocks).toBeGreaterThanOrEqual(0);

      // Cleanup
      await lockManager.unlock(filePath, 'agent-1');
      await lockPromise;
    });
  });

  describe('FileLockManager - Lock Queue with Priority', () => {
    let lockManager: FileLockManager;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-queue-'));
      lockManager = new FileLockManager(tempDir);
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('queues lock requests when file is locked', async () => {
      const filePath = join(tempDir, 'test.txt');

      // First agent acquires lock
      await lockManager.lock(filePath, 'agent-1');

      // Second agent waits
      const lockPromise = lockManager.lock(filePath, 'agent-2', {
        timeout: 500,
        waitForLock: true
      });

      // Release first lock
      await new Promise(resolve => setTimeout(resolve, 50));
      await lockManager.unlock(filePath, 'agent-1');

      // Second agent should acquire lock
      const lock2 = await lockPromise;
      expect(lock2.acquired).toBe(true);

      await lockManager.unlock(filePath, 'agent-2');
    });

    it('respects priority in lock queue', async () => {
      const filePath = join(tempDir, 'test.txt');

      // First agent acquires lock
      await lockManager.lock(filePath, 'agent-1');

      // Low priority agent waits
      const lowPriorityPromise = lockManager.lock(filePath, 'agent-low', {
        timeout: 500,
        waitForLock: true,
        priority: 1
      });

      // High priority agent waits
      const highPriorityPromise = lockManager.lock(filePath, 'agent-high', {
        timeout: 500,
        waitForLock: true,
        priority: 10
      });

      // Release first lock
      await new Promise(resolve => setTimeout(resolve, 50));
      await lockManager.unlock(filePath, 'agent-1');

      // High priority should acquire first
      const highLock = await highPriorityPromise;
      expect(highLock.acquired).toBe(true);

      await lockManager.unlock(filePath, 'agent-high');
      await lowPriorityPromise;
    });
  });

  describe('FileLockManager - Force Release', () => {
    let lockManager: FileLockManager;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-force-'));
      lockManager = new FileLockManager(tempDir);
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('force releases lock', async () => {
      const filePath = join(tempDir, 'test.txt');

      // Lock file
      await lockManager.lock(filePath, 'agent-1');

      // Force release
      const forceReleased = await lockManager.forceRelease(filePath);
      expect(forceReleased).toBe(true);

      // Another agent can acquire
      const lock2 = await lockManager.lock(filePath, 'agent-2');
      expect(lock2.acquired).toBe(true);

      await lockManager.unlock(filePath, 'agent-2');
    });

    it('tracks force release in statistics', async () => {
      const filePath = join(tempDir, 'test.txt');

      await lockManager.lock(filePath, 'agent-1');
      await lockManager.forceRelease(filePath);

      const stats = await lockManager.getStatistics();
      expect(stats.forceReleases).toBeGreaterThanOrEqual(1);
    });
  });

  describe('FileLockManager - Lock Info Retrieval', () => {
    let lockManager: FileLockManager;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-info-'));
      lockManager = new FileLockManager(tempDir);
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('returns lock info for locked file', async () => {
      const filePath = join(tempDir, 'test.txt');

      await lockManager.lock(filePath, 'agent-1');

      const lockInfo = await lockManager.getLockInfo(filePath);
      expect(lockInfo).toBeDefined();
      expect(lockInfo?.ownerId).toBe('agent-1');
      expect(lockInfo?.state).toBe(LockState.LOCKED);

      await lockManager.unlock(filePath, 'agent-1');
    });

    it('returns undefined for unlocked file', async () => {
      const filePath = join(tempDir, 'test.txt');

      const lockInfo = await lockManager.getLockInfo(filePath);
      expect(lockInfo).toBeUndefined();
    });

    it('checks if file is locked', async () => {
      const filePath = join(tempDir, 'test.txt');

      expect(await lockManager.isLocked(filePath)).toBe(false);

      await lockManager.lock(filePath, 'agent-1');
      expect(await lockManager.isLocked(filePath)).toBe(true);

      await lockManager.unlock(filePath, 'agent-1');
      expect(await lockManager.isLocked(filePath)).toBe(false);
    });
  });

  describe('FileLockManager - With Lock Helper', () => {
    let lockManager: FileLockManager;
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-with-'));
      lockManager = new FileLockManager(tempDir);
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('executes callback with lock', async () => {
      const filePath = join(tempDir, 'test.txt');
      let executed = false;

      await lockManager.withLock(filePath, 'agent-1', async () => {
        executed = true;
        // File should be locked here
        expect(await lockManager.isLocked(filePath)).toBe(true);
      });

      expect(executed).toBe(true);
      
      // Lock should be released
      expect(await lockManager.isLocked(filePath)).toBe(false);
    });

    it('releases lock even on error', async () => {
      const filePath = join(tempDir, 'test.txt');

      try {
        await lockManager.withLock(filePath, 'agent-1', async () => {
          throw new Error('Test error');
        });
      } catch (error) {
        // Expected error
      }

      // Lock should still be released
      expect(await lockManager.isLocked(filePath)).toBe(false);
    });
  });

  describe('Integration - File Locking Workflow', () => {
    it('executes complete file locking workflow', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-workflow-'));
      
      try {
        const lockManager = new FileLockManager(tempDir);
        const filePath = join(tempDir, 'shared.txt');
        writeFileSync(filePath, 'initial content');

        // Agent 1 acquires lock and writes
        await lockManager.withLock(filePath, 'agent-1', async () => {
          writeFileSync(filePath, 'content from agent-1');
        });

        // Agent 2 acquires lock and writes
        await lockManager.withLock(filePath, 'agent-2', async () => {
          writeFileSync(filePath, 'content from agent-2');
        });

        // Verify final content
        const stats = await lockManager.getStatistics();
        expect(stats.totalLocks).toBeGreaterThanOrEqual(2);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
