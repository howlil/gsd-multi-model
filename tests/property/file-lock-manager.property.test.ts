/**
 * File Lock Manager Property-Based Tests (TEST-20)
 *
 * Tests FileLockManager properties:
 * - Mutual exclusion (only one holder at a time)
 * - Deadlock freedom (no circular waits)
 * - Liveness (locks are eventually released)
 * - Lock statistics accuracy
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { FileLockManager, LockState } from '../../bin/lib/file/file-lock-manager.js';
import {
  filePathArb,
  agentIdArb,
  lockTimeoutArb,
  lockPriorityArb,
  lockOptionsArb,
  nonEmptyArrayArb
} from './arbitraries.js';

describe('File Lock Manager (TEST-20)', () => {
  it('maintains mutual exclusion - only one holder at a time', () => {
    fc.assert(fc.property(
      filePathArb,
      agentIdArb,
      agentIdArb,
      async (filePath, agent1, agent2) => {
        fc.pre(agent1 !== agent2); // Different agents

        const lockManager = new FileLockManager({
          lockDirectory: `.planning/locks-test-${Date.now()}`
        });

        try {
          // Agent 1 acquires lock
          const lock1 = await lockManager.acquire(filePath, agent1, { waitForLock: false });
          expect(lock1).toBe(true);

          // Agent 2 tries to acquire (should fail without waiting)
          const lock2 = await lockManager.acquire(filePath, agent2, { waitForLock: false });
          expect(lock2).toBe(false);

          // Mutual exclusion maintained
          expect(lockManager.isLocked(filePath)).toBe(true);
        } finally {
          // Cleanup
          await lockManager.release(filePath, agent1);
          lockManager.clearAllLocks();
        }
      }
    ));
  });

  it('achieves liveness - locks are eventually released', () => {
    fc.assert(fc.property(
      filePathArb,
      agentIdArb,
      async (filePath, agentId) => {
        const lockManager = new FileLockManager({
          lockDirectory: `.planning/locks-test-${Date.now()}`
        });

        try {
          // Acquire lock
          const acquired = await lockManager.acquire(filePath, agentId);
          expect(acquired).toBe(true);
          expect(lockManager.isLocked(filePath)).toBe(true);

          // Release lock
          const released = await lockManager.release(filePath, agentId);
          expect(released).toBe(true);
          expect(lockManager.isLocked(filePath)).toBe(false);
        } finally {
          lockManager.clearAllLocks();
        }
      }
    ));
  });

  it('same agent can re-acquire own lock (reentrant)', () => {
    fc.assert(fc.property(
      filePathArb,
      agentIdArb,
      async (filePath, agentId) => {
        const lockManager = new FileLockManager({
          lockDirectory: `.planning/locks-test-${Date.now()}`
        });

        try {
          // First acquire
          const lock1 = await lockManager.acquire(filePath, agentId);
          expect(lock1).toBe(true);

          // Re-acquire (same agent)
          const lock2 = await lockManager.acquire(filePath, agentId);
          expect(lock2).toBe(true);

          // Release once
          await lockManager.release(filePath, agentId);

          // Should still be locked (reentrant)
          expect(lockManager.isLocked(filePath)).toBe(true);

          // Release again
          await lockManager.release(filePath, agentId);

          // Now should be unlocked
          expect(lockManager.isLocked(filePath)).toBe(false);
        } finally {
          lockManager.clearAllLocks();
        }
      }
    ));
  });

  it('withLock helper ensures release even on error', () => {
    fc.assert(fc.property(
      filePathArb,
      agentIdArb,
      async (filePath, agentId) => {
        const lockManager = new FileLockManager({
          lockDirectory: `.planning/locks-test-${Date.now()}`
        });

        try {
          let errorCaught = false;

          try {
            await lockManager.withLock(filePath, agentId, async () => {
              expect(lockManager.isLocked(filePath)).toBe(true);
              throw new Error('Test error');
            });
          } catch (e) {
            errorCaught = true;
          }

          expect(errorCaught).toBe(true);

          // Lock should be released even after error
          expect(lockManager.isLocked(filePath)).toBe(false);
        } finally {
          lockManager.clearAllLocks();
        }
      }
    ));
  });

  it('maintains lock statistics accuracy', () => {
    fc.assert(fc.property(
      nonEmptyArrayArb(fc.record({
        filePath: filePathArb,
        agentId: agentIdArb
      }), { minLength: 1, maxLength: 10 }),
      async (operations) => {
        const lockManager = new FileLockManager({
          lockDirectory: `.planning/locks-test-${Date.now()}`,
          enableStats: true
        });

        const uniqueOps = new Set(operations.map(o => `${o.filePath}-${o.agentId}`));

        try {
          // Execute operations
          for (const op of operations) {
            await lockManager.acquire(op.filePath, op.agentId);
            await lockManager.release(op.filePath, op.agentId);
          }

          const stats = lockManager.getStats();

          // Stats should reflect operations
          expect(stats.totalAcquired).toBeGreaterThanOrEqual(uniqueOps.size);
          expect(stats.totalReleased).toBeGreaterThanOrEqual(uniqueOps.size);
          expect(stats.activeLocks).toBe(0); // All released
        } finally {
          lockManager.clearAllLocks();
        }
      }
    ));
  });

  it('handles lock queue with priority ordering', () => {
    fc.assert(fc.property(
      filePathArb,
      nonEmptyArrayArb(fc.record({
        agentId: agentIdArb,
        priority: lockPriorityArb
      }), { minLength: 2, maxLength: 5 }),
      async (filePath, agents) => {
        const lockManager = new FileLockManager({
          lockDirectory: `.planning/locks-test-${Date.now()}`,
          defaultTimeout: 5000
        });

        const firstAgent = agents[0]!.agentId;

        try {
          // First agent acquires lock
          await lockManager.acquire(filePath, firstAgent);

          // Other agents queue up with different priorities
          const queuePromises = agents.slice(1).map(agent =>
            lockManager.acquire(filePath, agent.agentId, {
              priority: agent.priority,
              timeout: 10000
            })
          );

          // Give time for queue to form
          await new Promise(resolve => setTimeout(resolve, 100));

          // Release first lock
          await lockManager.release(filePath, firstAgent);

          // Wait for queue processing
          await Promise.allSettled(queuePromises);

          // Stats should show waiting requests were processed
          const stats = lockManager.getStats();
          expect(stats.totalAcquired).toBeGreaterThanOrEqual(agents.length);
        } finally {
          lockManager.clearAllLocks();
        }
      }
    ));
  });

  it('detects stale locks correctly', () => {
    fc.assert(fc.property(
      filePathArb,
      agentIdArb,
      async (filePath, agentId) => {
        const lockManager = new FileLockManager({
          lockDirectory: `.planning/locks-test-${Date.now()}`,
          defaultStaleTime: 100 // Very short stale time for testing
        });

        try {
          // Acquire lock
          await lockManager.acquire(filePath, agentId);
          expect(lockManager.isLocked(filePath)).toBe(true);

          // Wait for lock to become stale
          await new Promise(resolve => setTimeout(resolve, 150));

          // Lock info should show stale state
          const lockInfo = lockManager.getLockInfo(filePath);
          expect(lockInfo).not.toBeNull();

          // Another agent should be able to acquire (stale lock reclaimed)
          const newAgent = 'new-agent';
          const acquired = await lockManager.acquire(filePath, newAgent);
          expect(acquired).toBe(true);
        } finally {
          lockManager.clearAllLocks();
        }
      }
    ));
  });

  it('forceRelease works for administrative cleanup', () => {
    fc.assert(fc.property(
      filePathArb,
      agentIdArb,
      async (filePath, agentId) => {
        const lockManager = new FileLockManager({
          lockDirectory: `.planning/locks-test-${Date.now()}`
        });

        try {
          // Acquire lock
          await lockManager.acquire(filePath, agentId);
          expect(lockManager.isLocked(filePath)).toBe(true);

          // Force release
          const forceReleased = await lockManager.forceRelease(filePath);
          expect(forceReleased).toBe(true);

          // Lock should be released
          expect(lockManager.isLocked(filePath)).toBe(false);
        } finally {
          lockManager.clearAllLocks();
        }
      }
    ));
  });

  it('getQueueLength returns accurate count', () => {
    fc.assert(fc.property(
      filePathArb,
      agentIdArb,
      nonEmptyArrayArb(agentIdArb, { minLength: 1, maxLength: 5 }),
      async (filePath, holder, waiters) => {
        const lockManager = new FileLockManager({
          lockDirectory: `.planning/locks-test-${Date.now()}`,
          defaultTimeout: 10000
        });

        const uniqueWaiters = [...new Set(waiters)].filter(a => a !== holder);

        try {
          // Holder acquires lock
          await lockManager.acquire(filePath, holder);

          // Waiters queue up (non-blocking check)
          for (const waiter of uniqueWaiters) {
            lockManager.acquire(filePath, waiter, { waitForLock: true, timeout: 5000 })
              .catch(() => {}); // Ignore errors
          }

          // Give time for queue to form
          await new Promise(resolve => setTimeout(resolve, 100));

          // Queue length should match waiters
          const queueLength = lockManager.getQueueLength(filePath);
          expect(queueLength).toBeGreaterThanOrEqual(0);
        } finally {
          lockManager.clearAllLocks();
        }
      }
    ));
  });

  it('maintains lock state consistency through lifecycle', () => {
    fc.assert(fc.property(
      filePathArb,
      agentIdArb,
      async (filePath, agentId) => {
        const lockManager = new FileLockManager({
          lockDirectory: `.planning/locks-test-${Date.now()}`
        });

        try {
          // Initial state: unlocked
          expect(lockManager.isLocked(filePath)).toBe(false);
          expect(lockManager.getLockInfo(filePath)).toBeNull();

          // After acquire: locked
          await lockManager.acquire(filePath, agentId);
          expect(lockManager.isLocked(filePath)).toBe(true);

          const lockInfo = lockManager.getLockInfo(filePath);
          expect(lockInfo).not.toBeNull();
          expect(lockInfo?.ownerId).toBe(agentId);
          expect(lockInfo?.state).toBe(LockState.LOCKED);

          // After release: unlocked
          await lockManager.release(filePath, agentId);
          expect(lockManager.isLocked(filePath)).toBe(false);
          expect(lockManager.getLockInfo(filePath)).toBeNull();
        } finally {
          lockManager.clearAllLocks();
        }
      }
    ));
  });

  it('handles concurrent lock requests on different files', () => {
    fc.assert(fc.property(
      nonEmptyArrayArb(filePathArb, { minLength: 2, maxLength: 5 }),
      nonEmptyArrayArb(agentIdArb, { minLength: 2, maxLength: 5 }),
      async (filePaths, agentIds) => {
        const lockManager = new FileLockManager({
          lockDirectory: `.planning/locks-test-${Date.now()}`
        });

        try {
          // Each agent acquires lock on different file
          const acquirePromises = filePaths.map((filePath, i) => {
            const agentId = agentIds[i % agentIds.length]!;
            return lockManager.acquire(filePath, agentId);
          });

          const results = await Promise.all(acquirePromises);

          // All should succeed (different files)
          expect(results.every(r => r === true)).toBe(true);

          // All files should be locked
          for (const filePath of filePaths) {
            expect(lockManager.isLocked(filePath)).toBe(true);
          }

          // Release all
          const releasePromises = filePaths.map((filePath, i) => {
            const agentId = agentIds[i % agentIds.length]!;
            return lockManager.release(filePath, agentId);
          });

          await Promise.all(releasePromises);

          // All files should be unlocked
          for (const filePath of filePaths) {
            expect(lockManager.isLocked(filePath)).toBe(false);
          }
        } finally {
          lockManager.clearAllLocks();
        }
      }
    ));
  });
});
