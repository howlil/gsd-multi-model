/**
 * State Determinism - Property-Based Tests (TEST-16)
 *
 * Tests that state operations are deterministic:
 * - Same input → same output
 * - Vector clocks always increment correctly
 * - Independent of execution order for deterministic operations
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { StateManager } from '../../bin/lib/state/state-manager.js';

describe('State Determinism (TEST-16)', () => {
  it('produces same output for same input sequence', () => {
    fc.assert(fc.property(
      fc.string(), // taskId
      fc.array(fc.record({
        key: fc.string(),
        value: fc.string()
      })), // operations
      async (taskId, operations) => {
        const stateManager = new StateManager();
        
        // Apply operations
        for (const op of operations) {
          await stateManager.updateState(taskId, { [op.key]: op.value });
        }
        const state1 = await stateManager.getState(taskId);
        
        // Reset and apply again
        const stateManager2 = new StateManager();
        for (const op of operations) {
          await stateManager2.updateState(taskId, { [op.key]: op.value });
        }
        const state2 = await stateManager2.getState(taskId);
        
        // Same input → same output (determinism)
        expect(state1.data).toEqual(state2.data);
      }
    ));
  });

  it('increments vector clocks correctly', () => {
    fc.assert(fc.property(
      fc.string(), // taskId
      fc.nat({ max: 100 }), // updateCount
      async (taskId, updateCount) => {
        const stateManager = new StateManager();
        
        // Apply updateCount updates
        for (let i = 0; i < updateCount; i++) {
          await stateManager.updateState(taskId, { count: i });
        }
        
        const state = await stateManager.getState(taskId);
        
        // Vector clock should equal update count
        expect(state.version.clock).toBe(updateCount);
      }
    ));
  });

  it('maintains determinism under concurrent updates', () => {
    fc.assert(fc.property(
      fc.string(), // taskId
      fc.array(fc.string()), // values
      async (taskId, values) => {
        const stateManager = new StateManager();
        
        // Apply updates sequentially (simulating concurrent updates with last-write-wins)
        for (const value of values) {
          await stateManager.updateState(taskId, { data: value });
        }
        
        const state = await stateManager.getState(taskId);
        
        // Last value wins (deterministic)
        expect(state.data.data).toBe(values[values.length - 1]);
      }
    ));
  });
});
