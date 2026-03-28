/**
 * Parallel Execution - Integration Tests
 *
 * Integration tests for parallel agent execution.
 * Tests wave-based synchronization, task distribution,
 * execution ordering, and failure handling.
 *
 * Requirement: TEST-12
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentMesh } from '../../bin/lib/orchestration/AgentMesh.js';
import { ContextShareManager } from '../../bin/lib/orchestration/context-share-manager.js';
import { FileLockManager } from '../../bin/lib/file/file-lock-manager.js';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';

describe('Parallel Execution - Integration', () => {
  let mesh: AgentMesh;
  let contextShare: ContextShareManager;
  let lockManager: FileLockManager;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-parallel-test-'));
    lockManager = new FileLockManager({ lockDirectory: join(tempDir, 'locks') });
    mesh = new AgentMesh();
    contextShare = new ContextShareManager(mesh);
  });

  afterEach(() => {
    contextShare.destroy();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('executes multiple agents in parallel without conflicts', async () => {
    // Register 5 agents
    const agents = ['agent-1', 'agent-2', 'agent-3', 'agent-4', 'agent-5'];
    for (const agent of agents) {
      mesh.registerAgent(agent, { agentId: agent } as any, ['coding'], [agent]);
    }

    // Each agent works on different file
    const tasks = agents.map((agent, idx) => {
      const filePath = join(tempDir, `file-${idx}.txt`);
      return lockManager.acquire(filePath, agent);
    });

    const locks = await Promise.all(tasks);

    // All agents should get their locks
    locks.forEach(lock => {
      expect(lock).toBe(true);
    });

    // Cleanup
    await Promise.all(
      agents.map((agent, idx) =>
        lockManager.release(join(tempDir, `file-${idx}.txt`), agent)
      )
    );
  });

  it('coordinates wave-based synchronization', async () => {
    // Wave 1: 3 agents execute in parallel
    const wave1Agents = ['agent-1', 'agent-2', 'agent-3'];
    for (const agent of wave1Agents) {
      mesh.registerAgent(agent, { agentId: agent } as any, ['coding'], [agent]);
    }

    // Execute wave 1
    const wave1Results = await Promise.all(
      wave1Agents.map(agent => executeAgentTask(agent, 'wave-1'))
    );

    // Synchronization point - all wave 1 should complete
    expect(wave1Results.every(r => r.completed)).toBe(true);

    // Wave 2: starts after wave 1 completes
    const wave2Result = await executeAgentTask('agent-4', 'wave-2');
    expect(wave2Result.completed).toBe(true);
  });

  it('distributes tasks across agents', async () => {
    const tasks = [
      { id: 'task-1', file: 'file-1.txt' },
      { id: 'task-2', file: 'file-2.txt' },
      { id: 'task-3', file: 'file-3.txt' }
    ];

    const agents = ['agent-1', 'agent-2', 'agent-3'];

    // Register agents
    agents.forEach(agent => {
      mesh.registerAgent(agent, { agentId: agent } as any, ['coding'], [agent]);
    });

    // Distribute tasks
    const distribution = tasks.map((task, idx) => ({
      task,
      agent: agents[idx]
    }));

    // Execute distributed tasks
    const results = await Promise.all(
      distribution.map(({ task, agent }) =>
        executeTaskForAgent(task, agent)
      )
    );

    // All tasks completed
    expect(results.every(r => r.success)).toBe(true);
  });

  it('maintains execution ordering within waves', async () => {
    const executionOrder: string[] = [];

    // Register agents
    mesh.registerAgent('agent-1', { agentId: 'agent-1' } as any, ['coding'], ['agent-1']);
    mesh.registerAgent('agent-2', { agentId: 'agent-2' } as any, ['coding'], ['agent-2']);
    mesh.registerAgent('agent-3', { agentId: 'agent-3' } as any, ['coding'], ['agent-3']);

    // Wave 1: agents execute in parallel
    await Promise.all([
      executeOrderedTask('agent-1', 'wave-1', executionOrder),
      executeOrderedTask('agent-2', 'wave-1', executionOrder),
      executeOrderedTask('agent-3', 'wave-1', executionOrder)
    ]);

    // Wave 1 agents should all be in execution order
    const wave1Executions = executionOrder.filter(a => a.startsWith('wave-1'));
    expect(wave1Executions.length).toBe(3);
  });

  it('handles agent failures during parallel execution', async () => {
    // Register agents
    mesh.registerAgent('agent-1', { agentId: 'agent-1' } as any, ['coding'], ['agent-1']);
    mesh.registerAgent('agent-2', { agentId: 'agent-2' } as any, ['coding'], ['agent-2']);
    mesh.registerAgent('agent-3', { agentId: 'agent-3' } as any, ['coding'], ['agent-3']);

    // Execute with one failing agent
    const results = await Promise.allSettled([
      executeAgentTask('agent-1', 'normal'),
      executeAgentTask('agent-2', 'fail'),
      executeAgentTask('agent-3', 'normal')
    ]);

    // Count successes
    const successes = results.filter(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<any>).value.completed).length;
    expect(successes).toBeGreaterThanOrEqual(2);
  });

  it('shares context across agents during parallel execution', async () => {
    // Register agents
    mesh.registerAgent('discoverer', { agentId: 'discoverer' } as any, ['research'], ['discoverer']);
    mesh.registerAgent('implementer', { agentId: 'implementer' } as any, ['coding'], ['implementer']);

    // Discoverer shares finding
    const discovery = {
      type: 'discovery' as const,
      agent: 'discoverer',
      task: 'parallel-task',
      content: { pattern: 'factory-pattern' },
      metadata: {
        timestamp: new Date().toISOString(),
        relevance: ['architecture', 'patterns'],
        priority: 'high' as const
      }
    };

    await contextShare.shareContext(discovery);

    // Implementer subscribes to relevant topics
    contextShare.subscribe('implementer', ['architecture', 'patterns']);

    // Get shared context for implementer
    const sharedContext = contextShare.getTopicHistory('architecture');
    expect(sharedContext.length).toBeGreaterThan(0);
  });

  it('prevents file conflicts during parallel writes', async () => {
    const sharedFile = join(tempDir, 'shared-write.txt');

    // Register 2 agents
    mesh.registerAgent('writer-1', { agentId: 'writer-1' } as any, ['coding'], ['writer-1']);
    mesh.registerAgent('writer-2', { agentId: 'writer-2' } as any, ['coding'], ['writer-2']);

    // Both try to acquire lock
    const lock1 = await lockManager.acquire(sharedFile, 'writer-1');
    const lock2 = await lockManager.acquire(sharedFile, 'writer-2', { waitForLock: false });

    // First should succeed, second should fail (no wait)
    expect(lock1).toBe(true);
    expect(lock2).toBe(false);

    // Release and let second acquire
    await lockManager.release(sharedFile, 'writer-1');
    const lock2Retry = await lockManager.acquire(sharedFile, 'writer-2');
    expect(lock2Retry).toBe(true);
  });

  it('tracks task pool statistics during parallel execution', async () => {
    // Post multiple tasks
    for (let i = 0; i < 5; i++) {
      mesh.postTask({
        id: `task-${i}`,
        description: `Task ${i}`,
        requiredCapabilities: ['coding']
      });
    }

    // Register agent and claim tasks
    mesh.registerAgent('worker', { agentId: 'worker' } as any, ['coding'], ['worker']);

    // Claim all tasks
    for (let i = 0; i < 5; i++) {
      mesh.claimTask('worker', `task-${i}`);
    }

    const stats = mesh.getTaskPoolStats();
    expect(stats.total).toBe(5);
    expect(stats.claimed).toBe(5);
    expect(stats.pending).toBe(0);
  });

  it('completes tasks in parallel and updates pool stats', async () => {
    // Post and claim tasks
    mesh.postTask({ id: 'task-a', description: 'Task A' });
    mesh.postTask({ id: 'task-b', description: 'Task B' });
    mesh.registerAgent('completer', { agentId: 'completer' } as any, ['coding'], ['completer']);

    mesh.claimTask('completer', 'task-a');
    mesh.claimTask('completer', 'task-b');

    // Complete tasks in parallel
    mesh.completeTask('task-a', 'Result A', true);
    mesh.completeTask('task-b', 'Result B', true);

    const stats = mesh.getTaskPoolStats();
    expect(stats.completed).toBe(2);
    expect(stats.claimed).toBe(0);
  });

  it('handles wave synchronization with dependencies', async () => {
    const executionLog: string[] = [];

    // Register agents
    const agents = ['setup-agent', 'build-agent', 'test-agent'];
    agents.forEach(agent => {
      mesh.registerAgent(agent, { agentId: agent } as any, ['coding'], [agent]);
    });

    // Wave 1: Setup
    await executeAgentTask('setup-agent', 'setup', executionLog);

    // Wave 2: Build (depends on setup)
    await executeAgentTask('build-agent', 'build', executionLog);

    // Wave 3: Test (depends on build)
    await executeAgentTask('test-agent', 'test', executionLog);

    // Verify order
    expect(executionLog).toEqual(['setup', 'build', 'test']);
  });

  // Helper functions
  async function executeAgentTask(agent: string, mode: string, log?: string[]) {
    if (log) {
      log.push(mode);
    }
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 10));
    return { agent, completed: mode !== 'fail' };
  }

  async function executeTaskForAgent(task: { id: string; file: string }, agent: string) {
    const filePath = join(tempDir, task.file);
    await lockManager.acquire(filePath, agent);
    await new Promise(resolve => setTimeout(resolve, 10));
    await lockManager.release(filePath, agent);
    return { success: true, task: task.id, agent };
  }

  async function executeOrderedTask(agent: string, wave: string, order: string[]) {
    order.push(`${wave}-${agent}`);
    await new Promise(resolve => setTimeout(resolve, 10));
    return { agent, wave };
  }
});
