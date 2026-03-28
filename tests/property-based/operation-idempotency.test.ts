/**
 * Operation Idempotency - Property-Based Tests (TEST-18)
 *
 * Tests that operations are idempotent:
 * - Applying same operation twice = same as once
 * - Critical for retry logic
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { StateManager } from '../../bin/lib/state/state-manager.js';
import { FileLockManager } from '../../bin/lib/file/file-lock-manager.js';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';

describe('Operation Idempotency (TEST-18)', () => {
  it('state update is idempotent', () => {
    fc.assert(fc.property(
      fc.string(), // taskId
      fc.record({ key: fc.string(), value: fc.anything() }), // operation
      async (taskId, operation) => {
        const stateManager = new StateManager();
        
        // Apply once
        await stateManager.updateState(taskId, { [operation.key]: operation.value });
        const state1 = await stateManager.getState(taskId);
        
        // Apply again (same operation)
        await stateManager.updateState(taskId, { [operation.key]: operation.value });
        const state2 = await stateManager.getState(taskId);
        
        // Same result (idempotent)
        expect(state1.data).toEqual(state2.data);
      }
    ));
  });

  it('lock acquisition is idempotent for same agent', () => {
    fc.assert(fc.property(
      fc.string(), // filePath
      fc.string(), // agentId
      async (filePath, agentId) => {
        const tempDir = mkdtempSync(join(tmpdir(), 'test-'));
        const lockManager = new FileLockManager(tempDir);
        
        try {
          // Lock once
          const lock1 = await lockManager.lock(filePath, agentId);
          
          // Lock again (same agent)
          const lock2 = await lockManager.lock(filePath, agentId);
          
          // Both succeed (idempotent for same agent)
          expect(lock1.acquired).toBe(true);
          expect(lock2.acquired).toBe(true);
        } finally {
          rmSync(tempDir, { recursive: true, force: true });
        }
      }
    ));
  });

  it('unlock is idempotent', () => {
    fc.assert(fc.property(
      fc.string(), // filePath
      fc.string(), // agentId
      async (filePath, agentId) => {
        const tempDir = mkdtempSync(join(tmpdir(), 'test-'));
        const lockManager = new FileLockManager(tempDir);
        
        try {
          // Lock
          await lockManager.lock(filePath, agentId);
          
          // Unlock once
          await lockManager.unlock(filePath, agentId);
          
          // Unlock again (should not error)
          await lockManager.unlock(filePath, agentId);
          
          // File should be unlocked
          const isLocked = await lockManager.isLocked(filePath);
          expect(isLocked).toBe(false);
        } finally {
          rmSync(tempDir, { recursive: true, force: true });
        }
      }
    ));
  });
});
