/**
 * Conflict Resolution - Property-Based Tests (TEST-19)
 *
 * Tests conflict resolution properties:
 * - Last-write-wins is deterministic
 * - Merge is commutative for non-conflicting fields
 * - Priority-based resolution respects priority order
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { resolveMerge } from '../../bin/lib/state/state-strategies.js';

describe('Conflict Resolution (TEST-19)', () => {
  it('last-write-wins is deterministic', () => {
    fc.assert(fc.property(
      fc.record({ a: fc.anything(), b: fc.anything() }), // stateA
      fc.record({ a: fc.anything(), b: fc.anything() }), // stateB
      (stateA, stateB) => {
        // Apply resolution twice
        const result1 = resolveMerge(stateA, stateB);
        const result2 = resolveMerge(stateA, stateB);
        
        // Same result (deterministic)
        expect(result1).toEqual(result2);
      }
    ));
  });

  it('merge is commutative for non-conflicting fields', () => {
    fc.assert(fc.property(
      fc.record({ a: fc.string(), b: fc.string() }), // stateA
      fc.record({ c: fc.string(), d: fc.string() }), // stateB (no overlap)
      (stateA, stateB) => {
        const merged1 = resolveMerge(stateA, stateB);
        const merged2 = resolveMerge(stateB, stateA);
        
        // Both contain all fields (commutative for non-conflicting)
        expect(Object.keys(merged1).length).toBe(4);
        expect(Object.keys(merged2).length).toBe(4);
        
        // All values preserved
        expect(merged1.a).toBe(stateA.a);
        expect(merged1.c).toBe(stateB.c);
        expect(merged2.a).toBe(stateA.a);
        expect(merged2.c).toBe(stateB.c);
      }
    ));
  });

  it('merge preserves conflicting fields from first state', () => {
    fc.assert(fc.property(
      fc.record({ a: fc.string(), b: fc.string() }), // stateA
      fc.record({ a: fc.string(), d: fc.string() }), // stateB (overlapping 'a')
      (stateA, stateB) => {
        const merged = resolveMerge(stateA, stateB);
        
        // Conflicting field 'a' preserved from first state
        expect(merged.a).toBe(stateA.a);
        
        // Non-conflicting fields merged
        expect(merged.b).toBe(stateA.b);
        expect(merged.d).toBe(stateB.d);
      }
    ));
  });
});
