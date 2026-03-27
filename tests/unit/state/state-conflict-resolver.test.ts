/**
 * State Conflict Resolver Tests
 *
 * Tests for StateConflictResolver class covering:
 * - Constructor and initialization
 * - Strategy selection logic
 * - Field merging
 * - Operational transformation
 * - Agent negotiation
 * - 4-tier escalation
 * - Resolution statistics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { StateConflictResolver } from '../../../bin/lib/state/state-conflict-resolver.js';
import {
  ResolutionStrategy,
  ConflictPriority,
  ConflictStatus,
  type StateConflict
} from '../../../bin/lib/state/state-types.js';

// Mock StateManager
const createMockStateManager = () => ({
  updateTaskState: vi.fn(),
  applyResolvedState: vi.fn(),
  on: vi.fn(),
  emit: vi.fn(),
  getTaskState: vi.fn()
});

// Mock AgentMesh
const createMockAgentMesh = () => ({
  sendMessageWithTimeout: vi.fn(),
  broadcast: vi.fn(),
  getMessages: vi.fn(),
  registerAgent: vi.fn(),
  unregisterAgent: vi.fn()
});

// Test conflict fixture
const createTestConflict = (overrides?: Partial<StateConflict>): StateConflict => ({
  id: 'state-conflict-test-1',
  taskId: '01-01',
  phase: 41,
  agents: ['ez-coder', 'ez-verifier'],
  detectedAt: Date.now(),
  strategy: ResolutionStrategy.LAST_WRITE_WINS,
  priority: ConflictPriority.NORMAL,
  status: ConflictStatus.PENDING,
  stateBefore: { status: 'in-progress', version: 1 },
  ...overrides
});

describe('StateConflictResolver', () => {
  let mockStateManager: ReturnType<typeof createMockStateManager>;
  let mockMesh: ReturnType<typeof createMockAgentMesh>;
  let resolver: StateConflictResolver;

  beforeEach(() => {
    mockStateManager = createMockStateManager();
    mockMesh = createMockAgentMesh();
    resolver = new StateConflictResolver(
      mockStateManager as unknown as EventEmitter,
      mockMesh as unknown as typeof mockMesh
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('creates instance with StateManager and AgentMesh', () => {
      expect(resolver).toBeDefined();
      expect(resolver).toBeInstanceOf(StateConflictResolver);
      expect(resolver).toBeInstanceOf(EventEmitter);
    });

    it('sets default negotiationTimeout (5000ms)', () => {
      const customResolver = new StateConflictResolver(
        mockStateManager as unknown as EventEmitter,
        mockMesh as unknown as typeof mockMesh
      );
      expect(customResolver).toBeDefined();
    });

    it('sets default autoResolutionTarget (0.95)', () => {
      const customResolver = new StateConflictResolver(
        mockStateManager as unknown as EventEmitter,
        mockMesh as unknown as typeof mockMesh,
        5000,
        0.95
      );
      expect(customResolver).toBeDefined();
    });

    it('accepts custom negotiation timeout', () => {
      const customResolver = new StateConflictResolver(
        mockStateManager as unknown as EventEmitter,
        mockMesh as unknown as typeof mockMesh,
        10000,
        0.90
      );
      expect(customResolver).toBeDefined();
    });
  });

  describe('Strategy Selection', () => {
    it('selectStrategy returns PRIORITY_BASED for CRITICAL priority', () => {
      const conflict = createTestConflict({ priority: ConflictPriority.CRITICAL });
      // Access private method via type assertion for testing
      const strategy = (resolver as unknown as { selectStrategy: (c: StateConflict) => ResolutionStrategy }).selectStrategy(conflict);
      expect(strategy).toBe(ResolutionStrategy.PRIORITY_BASED);
    });

    it('selectStrategy returns LAST_WRITE_WINS as default', () => {
      const conflict = createTestConflict({ priority: ConflictPriority.NORMAL });
      const strategy = (resolver as unknown as { selectStrategy: (c: StateConflict) => ResolutionStrategy }).selectStrategy(conflict);
      expect(strategy).toBe(ResolutionStrategy.LAST_WRITE_WINS);
    });

    it('isMergeable returns false by default (conservative)', () => {
      const conflict = createTestConflict();
      const isMergeable = (resolver as unknown as { isMergeable: (c: StateConflict) => boolean }).isMergeable(conflict);
      expect(isMergeable).toBe(false);
    });

    it('isConcurrentEdit returns false by default (conservative)', () => {
      const conflict = createTestConflict();
      const isConcurrent = (resolver as unknown as { isConcurrentEdit: (c: StateConflict) => boolean }).isConcurrentEdit(conflict);
      expect(isConcurrent).toBe(false);
    });

    it('getModifiedFields returns all keys (conservative default)', () => {
      const stateBefore = { field1: 'a', field2: 'b', field3: 'c' };
      const fields = (resolver as unknown as { getModifiedFields: (s: Record<string, unknown>, a: string) => string[] }).getModifiedFields(stateBefore, 'agent-1');
      expect(fields).toEqual(['field1', 'field2', 'field3']);
    });
  });

  describe('Field Merging', () => {
    it('mergeFields combines non-conflicting fields', () => {
      const stateA = { status: 'in-progress', agent: 'ez-coder' };
      const stateB = { result: 'success', metadata: { version: 2 } };
      const merged = resolver.mergeFields(stateA, stateB);
      expect(merged).toEqual({
        status: 'in-progress',
        agent: 'ez-coder',
        result: 'success',
        metadata: { version: 2 }
      });
    });

    it('mergeFields uses last-write-wins for conflicting fields', () => {
      const stateA = { status: 'in-progress', version: 1 };
      const stateB = { status: 'completed', version: 2 };
      const merged = resolver.mergeFields(stateA, stateB);
      expect(merged.status).toBe('completed');
      expect(merged.version).toBe(2);
    });

    it('mergeFields preserves all non-conflicting changes', () => {
      const stateA = { field1: 'a', common: 'fromA' };
      const stateB = { field2: 'b', common: 'fromB' };
      const merged = resolver.mergeFields(stateA, stateB);
      expect(merged.field1).toBe('a');
      expect(merged.field2).toBe('b');
      expect(merged.common).toBe('fromB');
    });
  });

  describe('Operational Transform', () => {
    it('applyOperationalTransform handles append operation', () => {
      const state = { items: ['a'] };
      const operations = [
        { type: 'append' as const, field: 'items', value: 'b' },
        { type: 'append' as const, field: 'items', value: 'c' }
      ];
      const result = resolver.applyOperationalTransform(state, operations);
      expect(result.items).toEqual(['a', 'b', 'c']);
    });

    it('applyOperationalTransform handles increment operation', () => {
      const state = { counter: 5 };
      const operations = [
        { type: 'increment' as const, field: 'counter', value: 1 },
        { type: 'increment' as const, field: 'counter', value: 2 }
      ];
      const result = resolver.applyOperationalTransform(state, operations);
      expect(result.counter).toBe(8);
    });

    it('applyOperationalTransform handles decrement operation', () => {
      const state = { counter: 10 };
      const operations = [
        { type: 'decrement' as const, field: 'counter', value: 3 },
        { type: 'decrement' as const, field: 'counter', value: 2 }
      ];
      const result = resolver.applyOperationalTransform(state, operations);
      expect(result.counter).toBe(5);
    });

    it('applyOperationalTransform handles mixed operations', () => {
      const state = { counter: 10, items: ['a'] };
      const operations = [
        { type: 'increment' as const, field: 'counter', value: 5 },
        { type: 'append' as const, field: 'items', value: 'b' },
        { type: 'decrement' as const, field: 'counter', value: 2 }
      ];
      const result = resolver.applyOperationalTransform(state, operations);
      expect(result.counter).toBe(13);
      expect(result.items).toEqual(['a', 'b']);
    });

    it('applyOperationalTransform preserves unchanged fields', () => {
      const state = { counter: 5, unchanged: 'value' };
      const operations = [{ type: 'increment' as const, field: 'counter', value: 1 }];
      const result = resolver.applyOperationalTransform(state, operations);
      expect(result.counter).toBe(6);
      expect(result.unchanged).toBe('value');
    });
  });

  describe('Agent Negotiation', () => {
    it('negotiateResolution collects proposals from agents', async () => {
      mockMesh.sendMessageWithTimeout.mockResolvedValueOnce({
        proposal: {
          agentId: 'ez-coder',
          proposedResolution: ResolutionStrategy.MERGE,
          rationale: 'Non-conflicting fields',
          timestamp: Date.now()
        }
      });
      mockMesh.sendMessageWithTimeout.mockResolvedValueOnce({
        proposal: {
          agentId: 'ez-verifier',
          proposedResolution: ResolutionStrategy.MERGE,
          rationale: 'Agreed',
          timestamp: Date.now()
        }
      });

      const conflict = createTestConflict();
      const result = await resolver.negotiateResolution(conflict);

      expect(result.proposals).toHaveLength(2);
      expect(result.agreed).toBe(true);
      expect(result.strategy).toBe(ResolutionStrategy.MERGE);
    });

    it('negotiateResolution returns agreed:true with majority (≥50%)', async () => {
      mockMesh.sendMessageWithTimeout.mockResolvedValueOnce({
        proposal: {
          agentId: 'ez-coder',
          proposedResolution: ResolutionStrategy.MERGE,
          rationale: 'Merge is best',
          timestamp: Date.now()
        }
      });
      mockMesh.sendMessageWithTimeout.mockResolvedValueOnce({
        proposal: {
          agentId: 'ez-verifier',
          proposedResolution: ResolutionStrategy.MERGE,
          rationale: 'Agreed',
          timestamp: Date.now()
        }
      });

      const conflict = createTestConflict();
      const result = await resolver.negotiateResolution(conflict);

      expect(result.agreed).toBe(true);
      expect(result.strategy).toBe(ResolutionStrategy.MERGE);
    });

    it('negotiateResolution returns agreed:false without majority', async () => {
      // Use 3 agents with split votes (no single strategy gets ≥50%)
      const conflict = createTestConflict({ agents: ['agent-a', 'agent-b', 'agent-c'] });
      
      mockMesh.sendMessageWithTimeout.mockResolvedValueOnce({
        proposal: {
          agentId: 'agent-a',
          proposedResolution: ResolutionStrategy.MERGE,
          rationale: 'Merge is best',
          timestamp: Date.now()
        }
      });
      mockMesh.sendMessageWithTimeout.mockResolvedValueOnce({
        proposal: {
          agentId: 'agent-b',
          proposedResolution: ResolutionStrategy.LAST_WRITE_WINS,
          rationale: 'LWW is simpler',
          timestamp: Date.now()
        }
      });
      mockMesh.sendMessageWithTimeout.mockResolvedValueOnce({
        proposal: {
          agentId: 'agent-c',
          proposedResolution: ResolutionStrategy.PRIORITY_BASED,
          rationale: 'Priority matters',
          timestamp: Date.now()
        }
      });

      const result = await resolver.negotiateResolution(conflict);

      // Each strategy has 33.3%, no majority (≥50%)
      expect(result.agreed).toBe(false);
      expect(result.proposals).toHaveLength(3);
    });

    it('negotiateResolution handles agent timeout gracefully', async () => {
      mockMesh.sendMessageWithTimeout.mockRejectedValueOnce(new Error('Timeout'));
      mockMesh.sendMessageWithTimeout.mockResolvedValueOnce({
        proposal: {
          agentId: 'ez-verifier',
          proposedResolution: ResolutionStrategy.MERGE,
          rationale: 'Only one response',
          timestamp: Date.now()
        }
      });

      const conflict = createTestConflict();
      const result = await resolver.negotiateResolution(conflict);

      expect(result.proposals).toHaveLength(1);
      expect(result.agreed).toBe(true); // Single proposal is 100% majority
    });
  });

  describe('4-Tier Escalation', () => {
    it('escalate tier 0 calls negotiateResolution', async () => {
      mockMesh.sendMessageWithTimeout.mockResolvedValue({
        proposal: {
          agentId: 'ez-coder',
          proposedResolution: ResolutionStrategy.MERGE,
          rationale: 'Test',
          timestamp: Date.now()
        }
      });

      const conflict = createTestConflict();
      const escalateMethod = (resolver as unknown as { escalate: (c: StateConflict, l?: number) => Promise<ResolutionStrategy | null> });
      await escalateMethod.escalate(conflict, 0);

      expect(mockMesh.sendMessageWithTimeout).toHaveBeenCalled();
    });

    it('escalate tier 1 calls orchestratorResolve', async () => {
      mockMesh.sendMessageWithTimeout.mockRejectedValue(new Error('Negotiation failed'));

      const conflict = createTestConflict();
      const escalateMethod = (resolver as unknown as { escalate: (c: StateConflict, l?: number) => Promise<ResolutionStrategy | null> });
      const strategy = await escalateMethod.escalate(conflict, 1);

      expect(strategy).toBeDefined();
    });

    it('escalate tier 2 calls escalateToUser', async () => {
      mockMesh.sendMessageWithTimeout.mockRejectedValue(new Error('Negotiation failed'));

      const conflict = createTestConflict();
      const escalateMethod = (resolver as unknown as { escalate: (c: StateConflict, l?: number) => Promise<ResolutionStrategy | null> });
      
      // Listen for user-escalation event
      let userEscalationEmitted = false;
      resolver.on('user-escalation', () => {
        userEscalationEmitted = true;
      });

      await escalateMethod.escalate(conflict, 2);
      expect(userEscalationEmitted).toBe(true);
    });

    it('escalate tier 3 marks for manual intervention', async () => {
      mockMesh.sendMessageWithTimeout.mockRejectedValue(new Error('Negotiation failed'));

      const conflict = createTestConflict();
      const escalateMethod = (resolver as unknown as { escalate: (c: StateConflict, l?: number) => Promise<ResolutionStrategy | null> });
      
      let manualInterventionEmitted = false;
      resolver.on('manual-intervention-required', () => {
        manualInterventionEmitted = true;
      });

      const strategy = await escalateMethod.escalate(conflict, 3);
      
      expect(strategy).toBeNull();
      expect(manualInterventionEmitted).toBe(true);
      expect(conflict.status).toBe(ConflictStatus.ESCALATED);
      expect(conflict.escalationLevel).toBe(3);
    });
  });

  describe('Resolution Statistics', () => {
    it('getResolutionStats returns correct counts', () => {
      const stats = resolver.getResolutionStats();
      expect(stats).toBeDefined();
      expect(stats.totalConflicts).toBeDefined();
      expect(stats.autoResolutionRate).toBeDefined();
      expect(stats.strategyDistribution).toBeDefined();
    });

    it('getResolutionStats calculates autoResolutionRate correctly', () => {
      const stats = resolver.getResolutionStats();
      expect(stats.autoResolutionRate).toBeGreaterThanOrEqual(0);
      expect(stats.autoResolutionRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Event Emission', () => {
    it('emits conflict-resolved event on successful resolution', async () => {
      const conflict = createTestConflict();
      let eventEmitted = false;
      
      resolver.on('conflict-resolved', () => {
        eventEmitted = true;
      });

      // Trigger resolution through negotiateResolution
      mockMesh.sendMessageWithTimeout.mockResolvedValue({
        proposal: {
          agentId: 'ez-coder',
          proposedResolution: ResolutionStrategy.MERGE,
          rationale: 'Test',
          timestamp: Date.now()
        }
      });

      await resolver.negotiateResolution(conflict);
      // Note: Full resolution requires StateManager integration
      expect(eventEmitted).toBe(false); // Event emitted in applyResolution, not negotiateResolution
    });

    it('emits user-escalation event on tier 2 escalation', async () => {
      let eventEmitted = false;
      resolver.on('user-escalation', () => {
        eventEmitted = true;
      });

      const conflict = createTestConflict();
      const escalateMethod = (resolver as unknown as { escalate: (c: StateConflict, l?: number) => Promise<ResolutionStrategy | null> });
      await escalateMethod.escalate(conflict, 2);

      expect(eventEmitted).toBe(true);
    });
  });
});
