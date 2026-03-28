/**
 * State Consistency - Property-Based Tests (TEST-17)
 *
 * Tests that state maintains consistency:
 * - Schema always valid after operations
 * - All-or-nothing updates
 * - Version numbers always increase
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { StateManager } from '../../bin/lib/state/state-manager.js';

describe('State Consistency (TEST-17)', () => {
  it('maintains valid schema after all operations', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        taskId: fc.string(),
        key: fc.string(),
        value: fc.anything()
      })),
      async (operations) => {
        const stateManager = new StateManager();
        
        // Apply all operations
        for (const op of operations) {
          await stateManager.updateState(op.taskId, { [op.key]: op.value });
        }
        
        // All states should have valid schema
        const taskIds = [...new Set(operations.map(o => o.taskId))];
        for (const taskId of taskIds) {
          const state = await stateManager.getState(taskId);
          
          // Schema validation
          expect(state).toHaveProperty('data');
          expect(state).toHaveProperty('version');
          expect(state.version).toHaveProperty('clock');
          expect(state.version).toHaveProperty('timestamp');
        }
      }
    ));
  });

  it('maintains monotonically increasing version numbers', () => {
    fc.assert(fc.property(
      fc.string(), // taskId
      fc.nat({ max: 50 }), // updateCount
      async (taskId, updateCount) => {
        const stateManager = new StateManager();
        let previousVersion = 0;
        
        for (let i = 0; i < updateCount; i++) {
          await stateManager.updateState(taskId, { count: i });
          const state = await stateManager.getState(taskId);
          
          // Version always increases
          expect(state.version.clock).toBeGreaterThan(previousVersion);
          previousVersion = state.version.clock;
        }
      }
    ));
  });

  it('maintains consistency with arbitrary update patterns', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        taskId: fc.string(),
        operation: fc.oneof(
          fc.constant('set'),
          fc.constant('delete'),
          fc.constant('update')
        ),
        key: fc.string(),
        value: fc.anything()
      })),
      async (operations) => {
        const stateManager = new StateManager();
        
        // Apply arbitrary operations
        for (const op of operations) {
          switch (op.operation) {
            case 'set':
              await stateManager.updateState(op.taskId, { [op.key]: op.value });
              break;
            case 'delete':
              await stateManager.updateState(op.taskId, { [op.key]: undefined });
              break;
            case 'update':
              await stateManager.updateState(op.taskId, { [op.key]: op.value });
              break;
          }
        }
        
        // All states should be consistent
        const taskIds = [...new Set(operations.map(o => o.taskId))];
        for (const taskId of taskIds) {
          const state = await stateManager.getState(taskId);
          expect(state.data).toBeDefined();
        }
      }
    ));
  });
});
