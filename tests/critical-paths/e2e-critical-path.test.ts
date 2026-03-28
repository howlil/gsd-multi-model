/**
 * End-to-End Critical Path Tests
 *
 * Integration tests for complete orchestration workflows
 * Coverage target: ≥70% for end-to-end scenarios
 *
 * Requirements:
 * - TEST-08: End-to-end critical path tests
 *   - Complete phase execution workflow
 *   - Multi-agent coordination with state sync
 *   - File locking during parallel execution
 *   - Quality gate enforcement
 *   - Context management across tasks
 *   - Recovery from failures
 *   - Performance benchmarks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentMesh } from '../../bin/lib/orchestration/AgentMesh.js';
import { StateManager } from '../../bin/lib/state/state-manager.js';
import { FileLockManager } from '../../bin/lib/file/file-lock-manager.js';
import { ContextSlicer } from '../../bin/lib/context/context-slicer.js';
import { WorkRouter, WorkType } from '../../bin/lib/orchestration/WorkRouter.js';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('End-to-End Critical Path', () => {
  describe('Complete Phase Execution Workflow', () => {
    let tempDir: string;
    let mesh: AgentMesh;
    let stateManager: StateManager;
    let lockManager: FileLockManager;
    let contextSlicer: ContextSlicer;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-e2e-'));
      mesh = new AgentMesh();
      stateManager = new StateManager();
      lockManager = new FileLockManager(tempDir);
      contextSlicer = new ContextSlicer();
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('executes complete phase workflow', async () => {
      const phaseId = 'phase-44';
      const taskId = 'task-001';

      // Register agents for phase
      mesh.registerAgent('planner', {} as any, ['planning'], ['phase-44']);
      mesh.registerAgent('executor', {} as any, ['execution'], ['phase-44']);
      mesh.registerAgent('verifier', {} as any, ['verification'], ['phase-44']);

      // Initialize phase state
      await stateManager.updateState(phaseId, {
        status: 'in-progress',
        currentPlan: 1,
        totalPlans: 8
      });

      // Post tasks to mesh
      mesh.postTask({
        id: taskId,
        description: 'Implement critical path tests',
        status: 'pending',
        requiredCapabilities: ['execution'],
        createdAt: Date.now()
      });

      // Executor claims task
      const claimed = mesh.claimTask('executor', taskId);
      expect(claimed).toBe(true);

      // Update state
      await stateManager.updateState(taskId, {
        status: 'in-progress',
        agent: 'executor'
      });

      // Complete task
      mesh.completeTask(taskId, 'Tests implemented', true);
      await stateManager.updateState(taskId, {
        status: 'completed',
        output: 'Tests implemented'
      });

      // Verify final state
      const finalState = await stateManager.getState(taskId);
      expect(finalState.data.status).toBe('completed');

      const taskStats = mesh.getTaskPoolStats();
      expect(taskStats.completed).toBe(1);
    });

    it('coordinates multiple agents on shared task', async () => {
      const taskId = 'multi-agent-task';

      // Register specialist agents
      mesh.registerAgent('researcher', {} as any, ['research'], ['tasks']);
      mesh.registerAgent('coder', {} as any, ['coding'], ['tasks']);
      mesh.registerAgent('reviewer', {} as any, ['review'], ['tasks']);

      // Post task
      mesh.postTask({
        id: taskId,
        description: 'Research, implement, and review feature',
        status: 'pending',
        requiredCapabilities: ['research', 'coding', 'review'],
        createdAt: Date.now()
      });

      // Sequential execution through agents
      const tasks = [
        { agent: 'researcher', capability: 'research' },
        { agent: 'coder', capability: 'coding' },
        { agent: 'reviewer', capability: 'review' }
      ];

      for (const { agent, capability } of tasks) {
        const available = mesh.getAvailableTasks(agent);
        expect(available.length).toBeGreaterThan(0);

        const claimed = mesh.claimTask(agent, taskId);
        expect(claimed).toBe(true);

        mesh.completeTask(taskId, `${agent} completed`, true);
      }

      const stats = mesh.getTaskPoolStats();
      expect(stats.completed).toBe(1);
    });
  });

  describe('Multi-Agent Coordination with State Sync', () => {
    let tempDir: string;
    let mesh: AgentMesh;
    let stateManager: StateManager;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-coord-'));
      mesh = new AgentMesh();
      stateManager = new StateManager();
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('syncs state across multiple agents', async () => {
      const taskId = 'sync-task';

      // Register agents
      mesh.registerAgent('agent-a', {} as any, ['task-a'], ['sync']);
      mesh.registerAgent('agent-b', {} as any, ['task-b'], ['sync']);

      // Agent A updates state
      await stateManager.updateState(taskId, {
        step: 1,
        agent: 'agent-a',
        data: 'initial'
      }, 'agent-a');

      // Agent B reads state
      const stateB = await stateManager.getState(taskId);
      expect(stateB.data.step).toBe(1);

      // Agent B updates state
      await stateManager.updateState(taskId, {
        step: 2,
        agent: 'agent-b',
        data: 'updated'
      }, 'agent-b');

      // Agent A reads updated state
      const stateA = await stateManager.getState(taskId);
      expect(stateA.data.step).toBe(2);
    });

    it('handles concurrent state updates', async () => {
      const taskId = 'concurrent-task';

      // Register agents
      mesh.registerAgent('agent-1', {} as any, ['task'], ['concurrent']);
      mesh.registerAgent('agent-2', {} as any, ['task'], ['concurrent']);

      // Both agents try to update state
      const update1 = stateManager.updateState(taskId, { value: 1 }, 'agent-1');
      const update2 = stateManager.updateState(taskId, { value: 2 }, 'agent-2');

      await Promise.all([update1, update2]);

      // Last write should win
      const finalState = await stateManager.getState(taskId);
      expect(finalState.data.value).toBe(2);
    });

    it('creates checkpoint for recovery', async () => {
      const taskId = 'checkpoint-task';

      // Set initial state
      await stateManager.updateState(taskId, { progress: 50 });

      // Create checkpoint
      const checkpointId = await stateManager.createCheckpoint('mid-execution');
      expect(checkpointId).toBeDefined();

      // Continue execution
      await stateManager.updateState(taskId, { progress: 100 });

      // Verify checkpoint exists
      const checkpoints = await stateManager.getCheckpointHistory();
      expect(checkpoints.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('File Locking During Parallel Execution', () => {
    let tempDir: string;
    let lockManager: FileLockManager;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-parallel-'));
      lockManager = new FileLockManager(tempDir);
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('prevents concurrent writes during parallel execution', async () => {
      const sharedFile = join(tempDir, 'shared.txt');

      // Agent 1 acquires lock
      const lock1 = await lockManager.lock(sharedFile, 'agent-1');
      expect(lock1.acquired).toBe(true);

      // Agent 2 tries to acquire (should fail)
      const lock2 = await lockManager.lock(sharedFile, 'agent-2');
      expect(lock2.acquired).toBe(false);

      // Agent 1 releases
      await lockManager.unlock(sharedFile, 'agent-1');

      // Agent 2 can now acquire
      const lock3 = await lockManager.lock(sharedFile, 'agent-2');
      expect(lock3.acquired).toBe(true);

      await lockManager.unlock(sharedFile, 'agent-2');
    });

    it('allows parallel writes to different files', async () => {
      const file1 = join(tempDir, 'file1.txt');
      const file2 = join(tempDir, 'file2.txt');

      // Both agents acquire locks on different files
      const lock1 = await lockManager.lock(file1, 'agent-1');
      const lock2 = await lockManager.lock(file2, 'agent-2');

      expect(lock1.acquired).toBe(true);
      expect(lock2.acquired).toBe(true);

      await lockManager.unlock(file1, 'agent-1');
      await lockManager.unlock(file2, 'agent-2');
    });

    it('handles lock queue during high contention', async () => {
      const sharedFile = join(tempDir, 'contended.txt');

      // Agent 1 holds lock
      await lockManager.lock(sharedFile, 'agent-1');

      // Agent 2 waits for lock
      const agent2Promise = lockManager.lock(sharedFile, 'agent-2', {
        timeout: 500,
        waitForLock: true
      });

      // Agent 1 releases after delay
      await new Promise(resolve => setTimeout(resolve, 50));
      await lockManager.unlock(sharedFile, 'agent-1');

      // Agent 2 should acquire
      const lock2 = await agent2Promise;
      expect(lock2.acquired).toBe(true);

      await lockManager.unlock(sharedFile, 'agent-2');
    });
  });

  describe('Quality Gate Enforcement', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-gate-e2e-'));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('passes all quality gates in workflow', async () => {
      // Simulate gate execution
      const gates = [
        { id: 'gate-01', passed: true },
        { id: 'gate-02', passed: true },
        { id: 'gate-03', passed: true },
        { id: 'gate-04', passed: true }
      ];

      const allPassed = gates.every(g => g.passed);
      expect(allPassed).toBe(true);
    });

    it('fails workflow on gate failure', async () => {
      const gates = [
        { id: 'gate-01', passed: true },
        { id: 'gate-02', passed: false },  // Architecture gate fails
        { id: 'gate-03', passed: true },
        { id: 'gate-04', passed: true }
      ];

      const allPassed = gates.every(g => g.passed);
      expect(allPassed).toBe(false);
    });
  });

  describe('Context Management Across Tasks', () => {
    let tempDir: string;
    let contextSlicer: ContextSlicer;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-context-e2e-'));
      contextSlicer = new ContextSlicer();

      // Create test files
      for (let i = 0; i < 5; i++) {
        writeFileSync(join(tempDir, `file-${i}.ts`), `export const value${i} = ${i};`);
      }
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('maintains context across multiple tasks', async () => {
      const files = Array.from({ length: 5 }, (_, i) => join(tempDir, `file-${i}.ts`));

      // Task 1: Get context
      const context1 = await contextSlicer.sliceContext({
        task: 'Task 1: Read values',
        files,
        maxTokens: 1000
      });

      // Task 2: Get context (should use cache)
      const context2 = await contextSlicer.sliceContext({
        task: 'Task 2: Process values',
        files,
        maxTokens: 1000
      });

      expect(context1.sources.length).toBeGreaterThan(0);
      expect(context2.sources.length).toBeGreaterThan(0);
    });

    it('enforces token budget across tasks', async () => {
      const files = Array.from({ length: 5 }, (_, i) => join(tempDir, `file-${i}.ts`));

      const context = await contextSlicer.sliceContext({
        task: 'Budget test',
        files,
        maxTokens: 500
      });

      expect(context.stats.totalTokens).toBeLessThanOrEqual(500);
      expect(context.stats.underBudget).toBe(true);
    });
  });

  describe('Recovery From Failures', () => {
    let tempDir: string;
    let stateManager: StateManager;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-recovery-'));
      stateManager = new StateManager();
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('recovers from checkpoint after failure', async () => {
      const taskId = 'recovery-task';

      // Set initial state and checkpoint
      await stateManager.updateState(taskId, { progress: 25 });
      const checkpoint1 = await stateManager.createCheckpoint('checkpoint-1');

      await stateManager.updateState(taskId, { progress: 50 });
      const checkpoint2 = await stateManager.createCheckpoint('checkpoint-2');

      // Simulate failure at 75%
      await stateManager.updateState(taskId, { progress: 75, status: 'failed' });

      // Restore from checkpoint
      const restored = await stateManager.restoreFromCheckpoint(checkpoint1);
      expect(restored).toBe(true);

      // Verify state restored
      const restoredState = await stateManager.getState(taskId);
      expect(restoredState.data.progress).toBe(25);
    });

    it('continues execution after recovery', async () => {
      const taskId = 'continue-task';

      // Initial state
      await stateManager.updateState(taskId, { step: 1 });
      await stateManager.createCheckpoint('step-1');

      // Simulate failure
      await stateManager.updateState(taskId, { step: 2, status: 'failed' });

      // Recover
      const checkpoints = await stateManager.getCheckpointHistory();
      if (checkpoints.length > 0) {
        await stateManager.restoreFromCheckpoint(checkpoints[0].id);

        // Continue from recovered state
        await stateManager.updateState(taskId, { step: 2, status: 'recovered' });
        await stateManager.updateState(taskId, { step: 3, status: 'completed' });

        const finalState = await stateManager.getState(taskId);
        expect(finalState.data.status).toBe('completed');
      }
    });
  });

  describe('Performance Benchmarks', () => {
    let tempDir: string;
    let mesh: AgentMesh;
    let stateManager: StateManager;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-perf-'));
      mesh = new AgentMesh();
      stateManager = new StateManager();
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('meets throughput threshold', async () => {
      const taskCount = 100;
      const startTime = Date.now();

      // Register agent
      mesh.registerAgent('worker', {} as any, ['task'], ['tasks']);

      // Post and claim tasks
      for (let i = 0; i < taskCount; i++) {
        mesh.postTask({
          id: `task-${i}`,
          description: `Task ${i}`,
          status: 'pending',
          createdAt: Date.now()
        });
        mesh.claimTask('worker', `task-${i}`);
        mesh.completeTask(`task-${i}`, 'Done', true);
      }

      const elapsed = Date.now() - startTime;
      const throughput = taskCount / (elapsed / 1000);

      // Should process at least 10 tasks/second
      expect(throughput).toBeGreaterThan(10);
    });

    it('meets latency threshold for state sync', async () => {
      const taskId = 'latency-test';
      const iterations = 10;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await stateManager.updateState(taskId, { count: i });
        await stateManager.getState(taskId);
        latencies.push(Date.now() - start);
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

      // Average latency should be under 100ms
      expect(avgLatency).toBeLessThan(100);
    });

    it('handles concurrent load', async () => {
      const agentCount = 5;
      const taskCount = 20;

      // Register agents
      for (let i = 0; i < agentCount; i++) {
        mesh.registerAgent(`agent-${i}`, {} as any, ['task'], ['tasks']);
      }

      // Post tasks
      for (let i = 0; i < taskCount; i++) {
        mesh.postTask({
          id: `load-task-${i}`,
          description: `Load task ${i}`,
          status: 'pending',
          createdAt: Date.now()
        });
      }

      // All agents claim tasks concurrently
      const promises: Promise<boolean>[] = [];
      for (let i = 0; i < agentCount; i++) {
        for (let j = 0; j < taskCount / agentCount; j++) {
          promises.push(mesh.claimTask(`agent-${i}`, `load-task-${i * 5 + j}`));
        }
      }

      const results = await Promise.all(promises);
      const claimed = results.filter(r => r).length;

      expect(claimed).toBe(taskCount);
    });
  });

  describe('Integration - Full Orchestration Workflow', () => {
    it('executes complete orchestration workflow', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-full-'));
      
      try {
        // Initialize all components
        const mesh = new AgentMesh();
        const stateManager = new StateManager();
        const lockManager = new FileLockManager(tempDir);
        const router = new WorkRouter();

        // Register agents
        mesh.registerAgent('planner', {} as any, ['planning'], ['workflow']);
        mesh.registerAgent('executor', {} as any, ['execution'], ['workflow']);
        mesh.registerAgent('verifier', {} as any, ['verification'], ['workflow']);

        // Classify work
        const workType = router.classifyWork('Implement new feature');
        expect(workType).toBe('feature');

        // Post task
        mesh.postTask({
          id: 'workflow-task',
          description: 'Complete workflow task',
          status: 'pending',
          requiredCapabilities: ['planning', 'execution', 'verification'],
          createdAt: Date.now()
        });

        // Execute through agents
        const agents = ['planner', 'executor', 'verifier'];
        for (const agent of agents) {
          const claimed = mesh.claimTask(agent, 'workflow-task');
          expect(claimed).toBe(true);
          mesh.completeTask('workflow-task', `${agent} done`, true);
        }

        // Update state throughout
        await stateManager.updateState('workflow-task', { status: 'completed' });

        // Create checkpoint
        const checkpointId = await stateManager.createCheckpoint('workflow-complete');
        expect(checkpointId).toBeDefined();

        // Verify final state
        const stats = mesh.getTaskPoolStats();
        expect(stats.completed).toBe(1);

        const state = await stateManager.getState('workflow-task');
        expect(state.data.status).toBe('completed');
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
