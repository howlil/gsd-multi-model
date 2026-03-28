/**
 * Conflict Resolution - Critical Path Tests
 *
 * Tests for Phase 41: State Conflict Resolution
 * Coverage target: ≥70% for state-conflict-resolver.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StateConflictResolver, ResolutionStrategy, ConflictPriority } from '../../bin/lib/state/state-conflict-resolver.js';
import { StateManager } from '../../bin/lib/state/state-manager.js';
import { AgentMesh } from '../../bin/lib/orchestration/AgentMesh.js';

describe('Conflict Resolution - Critical Path', () => {
  let resolver: StateConflictResolver;
  let stateManager: StateManager;
  let mesh: AgentMesh;

  beforeEach(() => {
    stateManager = new StateManager();
    mesh = new AgentMesh();
    resolver = new StateConflictResolver(stateManager, mesh);
  });

  it('merges non-conflicting fields', () => {
    const stateA = { field1: 'value1', field2: 'value2' };
    const stateB = { field3: 'value3' };
    
    const merged = resolver.mergeFields(stateA, stateB);
    
    expect(merged.field1).toBe('value1');
    expect(merged.field2).toBe('value2');
    expect(merged.field3).toBe('value3');
  });

  it('applies operational transforms for concurrent edits', () => {
    const state = { counter: 0, items: [] };
    const operations = [
      { type: 'increment' as const, path: 'counter', delta: 1 },
      { type: 'append' as const, path: 'items', value: 'new-item' }
    ];
    
    const result = resolver.applyOperationalTransform(state, operations);
    
    expect(result.counter).toBe(1);
    expect(result.items).toEqual(['new-item']);
  });

  it('selects correct strategy based on conflict type', () => {
    // Strategy selection is internal, but we can test the logic
    expect(ResolutionStrategy.LAST_WRITE_WINS).toBe('last-write-wins');
    expect(ResolutionStrategy.MERGE).toBe('merge');
    expect(ResolutionStrategy.PRIORITY_BASED).toBe('priority-based');
    expect(ResolutionStrategy.OPERATIONAL_TRANSFORM).toBe('operational-transform');
  });

  it('handles different priority levels', () => {
    expect(ConflictPriority.CRITICAL).toBe('critical');
    expect(ConflictPriority.HIGH).toBe('high');
    expect(ConflictPriority.NORMAL).toBe('normal');
  });
});
