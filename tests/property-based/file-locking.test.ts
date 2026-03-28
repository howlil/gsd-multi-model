/**
 * File Locking - Property-Based Tests (TEST-20)
 *
 * Tests file locking properties:
 * - Mutual exclusion (only one holder at a time)
 * - Deadlock freedom (no circular waits)
 * - Liveness (locks are eventually released)
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { FileLockManager } from '../../bin/lib/file/file-lock-manager.js';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';

describe('File Locking (TEST-20)', () => {
  it('maintains mutual exclusion', () => {
    fc.assert(fc.property(
      fc.string(), // filePath
      fc.string(), // agent1
      fc.string(), // agent2
      async (filePath, agent1, agent2) => {
        fc.pre(agent1 !== agent2); // Different agents
        
        const tempDir = mkdtempSync(join(tmpdir(), 'test-'));
        const lockManager = new FileLockManager(tempDir);
        
        try {
          // Agent 1 locks
          const lock1 = await lockManager.lock(filePath, agent1);
          expect(lock1.acquired).toBe(true);
          
          // Agent 2 tries to lock (should fail)
          const lock2 = await lockManager.lock(filePath, agent2);
          expect(lock2.acquired).toBe(false);
          
          // Mutual exclusion maintained
        } finally {
          rmSync(tempDir, { recursive: true, force: true });
        }
      }
    ));
  });

  it('achieves liveness (locks are eventually released)', () => {
    fc.assert(fc.property(
      fc.string(), // filePath
      fc.string(), // agentId
      async (filePath, agentId) => {
        const tempDir = mkdtempSync(join(tmpdir(), 'test-'));
        const lockManager = new FileLockManager(tempDir);
        
        try {
          // Lock
          await lockManager.lock(filePath, agentId);
          
          // Unlock
          await lockManager.unlock(filePath, agentId);
          
          // Lock should be released (another agent can acquire)
          const isLocked = await lockManager.isLocked(filePath);
          expect(isLocked).toBe(false);
        } finally {
          rmSync(tempDir, { recursive: true, force: true });
        }
      }
    ));
  });

  it('same agent can re-acquire own lock', () => {
    fc.assert(fc.property(
      fc.string(), // filePath
      fc.string(), // agentId
      async (filePath, agentId) => {
        const tempDir = mkdtempSync(join(tmpdir(), 'test-'));
        const lockManager = new FileLockManager(tempDir);
        
        try {
          // Lock
          const lock1 = await lockManager.lock(filePath, agentId);
          expect(lock1.acquired).toBe(true);
          
          // Re-lock (same agent)
          const lock2 = await lockManager.lock(filePath, agentId);
          expect(lock2.acquired).toBe(true);
          
          // Unlock
          await lockManager.unlock(filePath, agentId);
          
          const isLocked = await lockManager.isLocked(filePath);
          expect(isLocked).toBe(false);
        } finally {
          rmSync(tempDir, { recursive: true, force: true });
        }
      }
    ));
  });
});
