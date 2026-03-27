/**
 * State Conflict Resolution Strategies Tests
 *
 * Tests for pure resolution strategy functions:
 * - resolveLastWriteWins
 * - resolveMerge
 * - resolvePriorityBased
 * - resolveOperationalTransform
 */

import { describe, it, expect } from 'vitest';
import {
  resolveLastWriteWins,
  resolveMerge,
  resolvePriorityBased,
  resolveOperationalTransform
} from '../../../bin/lib/state/state-strategies.js';
import { ConflictPriority, type Operation } from '../../../bin/lib/state/state-types.js';

describe('Resolution Strategies', () => {
  describe('resolveLastWriteWins', () => {
    it('returns state unchanged (identity function)', () => {
      const state = { status: 'completed', version: 5, metadata: { author: 'test' } };
      const result = resolveLastWriteWins(state);
      
      expect(result).toBe(state);
      expect(result).toEqual({
        status: 'completed',
        version: 5,
        metadata: { author: 'test' }
      });
    });

    it('handles empty state', () => {
      const state = {};
      const result = resolveLastWriteWins(state);
      
      expect(result).toEqual({});
    });

    it('handles complex nested state', () => {
      const state = {
        level1: {
          level2: {
            level3: 'deep'
          }
        },
        array: [1, 2, 3],
        primitive: 'value'
      };
      const result = resolveLastWriteWins(state);
      
      expect(result).toBe(state);
    });
  });

  describe('resolveMerge', () => {
    it('merges non-conflicting fields', () => {
      const stateA = { status: 'in-progress', agent: 'ez-coder' };
      const stateB = { result: 'success', metadata: { version: 2 } };
      
      const merged = resolveMerge(stateA, stateB);
      
      expect(merged).toEqual({
        status: 'in-progress',
        agent: 'ez-coder',
        result: 'success',
        metadata: { version: 2 }
      });
    });

    it('uses last-write-wins for conflicting fields', () => {
      const stateA = { status: 'in-progress', version: 1 };
      const stateB = { status: 'completed', version: 2 };
      
      const merged = resolveMerge(stateA, stateB);
      
      expect(merged.status).toBe('completed');
      expect(merged.version).toBe(2);
    });

    it('preserves all non-conflicting changes', () => {
      const stateA = { field1: 'a', common: 'fromA' };
      const stateB = { field2: 'b', common: 'fromB' };
      
      const merged = resolveMerge(stateA, stateB);
      
      expect(merged.field1).toBe('a');
      expect(merged.field2).toBe('b');
      expect(merged.common).toBe('fromB');
    });

    it('handles empty stateA', () => {
      const stateA = {};
      const stateB = { status: 'completed' };
      
      const merged = resolveMerge(stateA, stateB);
      
      expect(merged).toEqual({ status: 'completed' });
    });

    it('handles empty stateB', () => {
      const stateA = { status: 'in-progress' };
      const stateB = {};
      
      const merged = resolveMerge(stateA, stateB);
      
      expect(merged).toEqual({ status: 'in-progress' });
    });

    it('is pure (no side effects)', () => {
      const stateA = { field1: 'a' };
      const stateB = { field2: 'b' };
      const stateACopy = { ...stateA };
      const stateBCopy = { ...stateB };
      
      resolveMerge(stateA, stateB);
      
      expect(stateA).toEqual(stateACopy);
      expect(stateB).toEqual(stateBCopy);
    });
  });

  describe('resolvePriorityBased', () => {
    it('returns state with CRITICAL priority unchanged except metadata', () => {
      const state = { health: 'critical', status: 'degraded' };
      const result = resolvePriorityBased(state, ConflictPriority.CRITICAL);
      
      expect(result.health).toBe('critical');
      expect(result.status).toBe('degraded');
      expect(result._priority).toBe(ConflictPriority.CRITICAL);
    });

    it('returns state with HIGH priority unchanged except metadata', () => {
      const state = { taskStatus: 'in-progress' };
      const result = resolvePriorityBased(state, ConflictPriority.HIGH);
      
      expect(result.taskStatus).toBe('in-progress');
      expect(result._priority).toBe(ConflictPriority.HIGH);
    });

    it('returns state with NORMAL priority unchanged except metadata', () => {
      const state = { metadata: { version: 1 } };
      const result = resolvePriorityBased(state, ConflictPriority.NORMAL);
      
      expect(result.metadata).toEqual({ version: 1 });
      expect(result._priority).toBe(ConflictPriority.NORMAL);
    });

    it('is pure (no side effects)', () => {
      const state = { field: 'value' };
      const stateCopy = { ...state };
      
      resolvePriorityBased(state, ConflictPriority.NORMAL);
      
      expect(state).toEqual(stateCopy);
    });
  });

  describe('resolveOperationalTransform', () => {
    it('handles append operations', () => {
      const state = { items: ['a'] };
      const operations: Operation[] = [
        { type: 'append', field: 'items', value: 'b' },
        { type: 'append', field: 'items', value: 'c' }
      ];
      
      const result = resolveOperationalTransform(state, operations);
      
      expect(result.items).toEqual(['a', 'b', 'c']);
    });

    it('handles increment operations', () => {
      const state = { counter: 5 };
      const operations: Operation[] = [
        { type: 'increment', field: 'counter', value: 1 },
        { type: 'increment', field: 'counter', value: 2 }
      ];
      
      const result = resolveOperationalTransform(state, operations);
      
      expect(result.counter).toBe(8);
    });

    it('handles decrement operations', () => {
      const state = { counter: 10 };
      const operations: Operation[] = [
        { type: 'decrement', field: 'counter', value: 3 },
        { type: 'decrement', field: 'counter', value: 2 }
      ];
      
      const result = resolveOperationalTransform(state, operations);
      
      expect(result.counter).toBe(5);
    });

    it('handles mixed operations', () => {
      const state = { counter: 10, items: ['a'] };
      const operations: Operation[] = [
        { type: 'increment', field: 'counter', value: 5 },
        { type: 'append', field: 'items', value: 'b' },
        { type: 'decrement', field: 'counter', value: 2 }
      ];
      
      const result = resolveOperationalTransform(state, operations);
      
      expect(result.counter).toBe(13);
      expect(result.items).toEqual(['a', 'b']);
    });

    it('preserves unchanged fields', () => {
      const state = { counter: 5, unchanged: 'value', other: 42 };
      const operations: Operation[] = [
        { type: 'increment', field: 'counter', value: 1 }
      ];
      
      const result = resolveOperationalTransform(state, operations);
      
      expect(result.counter).toBe(6);
      expect(result.unchanged).toBe('value');
      expect(result.other).toBe(42);
    });

    it('handles empty operations array', () => {
      const state = { counter: 5, items: ['a'] };
      const operations: Operation[] = [];
      
      const result = resolveOperationalTransform(state, operations);
      
      expect(result).toEqual(state);
    });

    it('handles operations on non-existent fields', () => {
      const state = { existing: 'value' };
      const operations: Operation[] = [
        { type: 'increment', field: 'newField', value: 5 }
      ];
      
      const result = resolveOperationalTransform(state, operations);
      
      expect(result.existing).toBe('value');
      // Non-existent field with numeric operation should remain undefined or not affect result
      expect(result).toBeDefined();
    });

    it('is pure (no side effects)', () => {
      const state = { counter: 5, items: ['a'] };
      const stateCopy = JSON.parse(JSON.stringify(state));
      const operations: Operation[] = [
        { type: 'increment', field: 'counter', value: 1 },
        { type: 'append', field: 'items', value: 'b' }
      ];
      
      resolveOperationalTransform(state, operations);
      
      expect(state).toEqual(stateCopy);
    });

    it('handles multiple fields with operations', () => {
      const state = {
        counter1: 10,
        counter2: 20,
        items1: ['a'],
        items2: ['x']
      };
      const operations: Operation[] = [
        { type: 'increment', field: 'counter1', value: 5 },
        { type: 'decrement', field: 'counter2', value: 5 },
        { type: 'append', field: 'items1', value: 'b' },
        { type: 'append', field: 'items2', value: 'y' }
      ];
      
      const result = resolveOperationalTransform(state, operations);
      
      expect(result.counter1).toBe(15);
      expect(result.counter2).toBe(15);
      expect(result.items1).toEqual(['a', 'b']);
      expect(result.items2).toEqual(['x', 'y']);
    });
  });

  describe('Strategy Function Composition', () => {
    it('can chain resolveMerge after resolveLastWriteWins', () => {
      const stateA = { status: 'in-progress' };
      const stateB = { result: 'success' };
      
      const afterLWW = resolveLastWriteWins(stateA);
      const merged = resolveMerge(afterLWW, stateB);
      
      expect(merged).toEqual({
        status: 'in-progress',
        result: 'success'
      });
    });

    it('can apply OT then merge', () => {
      const state = { counter: 5, items: ['a'] };
      const operations: Operation[] = [
        { type: 'increment', field: 'counter', value: 5 },
        { type: 'append', field: 'items', value: 'b' }
      ];
      
      const afterOT = resolveOperationalTransform(state, operations);
      const extraState = { metadata: { version: 2 } };
      const merged = resolveMerge(afterOT, extraState);
      
      expect(merged.counter).toBe(10);
      expect(merged.items).toEqual(['a', 'b']);
      expect(merged.metadata).toEqual({ version: 2 });
    });
  });
});
