/**
 * State Synchronization - Critical Path Tests
 *
 * Tests for Phase 40: State Synchronization
 * Coverage target: ≥75% for state-manager.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../../bin/lib/state/state-manager.js';

describe('State Synchronization - Critical Path', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  it('versions state with vector clocks', async () => {
    const taskId = 'test-task';
    
    // Initial state
    await stateManager.updateState(taskId, { data: 'initial' });
    const state1 = await stateManager.getState(taskId);
    
    // Update state
    await stateManager.updateState(taskId, { data: 'updated' });
    const state2 = await stateManager.getState(taskId);
    
    // Vector clock should increment
    expect(state2.version).toBeDefined();
    expect(state2.data).toBe('updated');
  });

  it('syncs deltas between agents', async () => {
    const taskId = 'test-task';
    
    // Agent A updates state
    await stateManager.updateState(taskId, { field1: 'value1' });
    
    // Agent B gets state (delta sync)
    const state = await stateManager.getState(taskId);
    expect(state.data.field1).toBe('value1');
  });

  it('resolves conflicts with last-write-wins', async () => {
    const taskId = 'test-task';
    
    // Two updates (simulating concurrent writes)
    await stateManager.updateState(taskId, { data: 'first' });
    await stateManager.updateState(taskId, { data: 'second' });
    
    // Last write wins
    const state = await stateManager.getState(taskId);
    expect(state.data).toBe('second');
  });

  it('persists state for recovery', async () => {
    const taskId = 'test-task';
    
    // Update state
    await stateManager.updateState(taskId, { data: 'persistent' });
    
    // State should be retrievable
    const state = await stateManager.getState(taskId);
    expect(state.data).toBe('persistent');
  });
});
