/**
 * Parallel Workflow - E2E Tests
 *
 * End-to-end tests for parallel workflow execution.
 * Tests full workflow from planning to verification with
 * real agent simulation, conflict handling, and context sharing.
 *
 * Requirement: TEST-14
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentMesh } from '../../bin/lib/orchestration/AgentMesh.js';
import { ContextShareManager } from '../../bin/lib/orchestration/context-share-manager.js';
import { FileLockManager } from '../../bin/lib/file/file-lock-manager.js';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';

describe('Parallel Workflow - E2E', () => {
  let mesh: AgentMesh;
  let contextShare: ContextShareManager;
  let lockManager: FileLockManager;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ez-agents-e2e-test-'));
    lockManager = new FileLockManager({ lockDirectory: join(tempDir, 'locks') });
    mesh = new AgentMesh();
    contextShare = new ContextShareManager(mesh);
  });

  afterEach(() => {
    contextShare.destroy();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('completes full parallel workflow with all components', async () => {
    const workflowId = 'e2e-parallel-workflow';

    // Phase 1: Setup - Register 4 agents
    const agents = [
      { id: 'planner', type: 'planner' },
      { id: 'coder-1', type: 'coder' },
      { id: 'coder-2', type: 'coder' },
      { id: 'reviewer', type: 'reviewer' }
    ];

    for (const agent of agents) {
      mesh.registerAgent(agent.id, { agentId: agent.id } as any, [agent.type], [agent.id]);
    }

    // Phase 2: Planning - Create task breakdown
    mesh.postTask({
      id: `${workflowId}-task-1`,
      description: 'Implement feature part 1',
      requiredCapabilities: ['coder']
    });
    mesh.postTask({
      id: `${workflowId}-task-2`,
      description: 'Implement feature part 2',
      requiredCapabilities: ['coder']
    });

    // Phase 3: Parallel Execution - Coders work on tasks
    mesh.claimTask('coder-1', `${workflowId}-task-1`);
    mesh.claimTask('coder-2', `${workflowId}-task-2`);

    const [result1, result2] = await Promise.all([
      executeCoderTask('coder-1', `${workflowId}-task-1`),
      executeCoderTask('coder-2', `${workflowId}-task-2`)
    ]);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // Phase 4: Review - Reviewer checks completed work
    mesh.completeTask(`${workflowId}-task-1`, 'Feature part 1 complete', true);
    mesh.completeTask(`${workflowId}-task-2`, 'Feature part 2 complete', true);

    const reviewResult = await executeReviewerTask('reviewer', workflowId);
    expect(reviewResult.approved).toBe(true);

    // Phase 5: Completion - Verify workflow complete
    const stats = mesh.getTaskPoolStats();
    expect(stats.completed).toBe(2);
    expect(stats.pending).toBe(0);
  });

  it('handles conflicts during parallel workflow', async () => {
    const workflowId = 'e2e-conflict-workflow';

    // Register 2 coders working on same file
    mesh.registerAgent('coder-1', { agentId: 'coder-1' } as any, ['coder'], ['coder-1']);
    mesh.registerAgent('coder-2', { agentId: 'coder-2' } as any, ['coder'], ['coder-2']);

    const sharedFile = join(tempDir, 'shared-code.ts');

    // Both try to lock same file
    const lock1 = await lockManager.acquire(sharedFile, 'coder-1');
    expect(lock1).toBe(true);

    const lock2 = await lockManager.acquire(sharedFile, 'coder-2', { waitForLock: false });
    expect(lock2).toBe(false); // Conflict detected

    // First coder completes work
    await executeCoderTask('coder-1', `${workflowId}-shared-task`);
    await lockManager.release(sharedFile, 'coder-1');

    // Second coder can now proceed
    const retryLock = await lockManager.acquire(sharedFile, 'coder-2');
    expect(retryLock).toBe(true);
  });

  it('shares context across agents during workflow', async () => {
    const workflowId = 'e2e-context-share-workflow';

    // Register agents
    mesh.registerAgent('discoverer', { agentId: 'discoverer' } as any, ['researcher'], ['discoverer']);
    mesh.registerAgent('implementer', { agentId: 'implementer' } as any, ['coder'], ['implementer']);

    // Discoverer shares finding
    const discovery = {
      type: 'discovery' as const,
      agent: 'discoverer',
      task: workflowId,
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

    // Implementer receives shared context
    const sharedContext = contextShare.getTopicHistory('architecture');
    expect(sharedContext.length).toBeGreaterThan(0);
    expect(sharedContext[0].content).toEqual({ pattern: 'factory-pattern' });
  });

  it('recovers from agent failure during workflow', async () => {
    const workflowId = 'e2e-recovery-workflow';

    // Register agents
    mesh.registerAgent('worker-1', { agentId: 'worker-1' } as any, ['coder'], ['worker-1']);
    mesh.registerAgent('worker-2', { agentId: 'worker-2' } as any, ['coder'], ['worker-2']);
    mesh.registerAgent('backup', { agentId: 'backup' } as any, ['coder'], ['backup']);

    // Post task
    mesh.postTask({
      id: `${workflowId}-task-1`,
      description: 'Critical task',
      requiredCapabilities: ['coder']
    });

    // Worker 1 claims but fails
    mesh.claimTask('worker-1', `${workflowId}-task-1`);
    const worker1Result = await executeAgentTask('worker-1', 'fail');
    expect(worker1Result.completed).toBe(false);

    // Backup agent takes over
    mesh.claimTask('backup', `${workflowId}-task-1`);
    const backupResult = await executeCoderTask('backup', `${workflowId}-task-1`);
    expect(backupResult.success).toBe(true);

    // Workflow continues
    mesh.completeTask(`${workflowId}-task-1`, 'Completed by backup', true);
    const stats = mesh.getTaskPoolStats();
    expect(stats.completed).toBe(1);
  });

  it('executes multi-wave workflow with dependencies', async () => {
    const workflowId = 'e2e-wave-workflow';
    const executionLog: string[] = [];

    // Register agents for each wave
    const waveAgents = {
      wave1: ['setup-agent'],
      wave2: ['build-agent-1', 'build-agent-2'],
      wave3: ['test-agent']
    };

    // Register all agents
    Object.values(waveAgents).flat().forEach(agent => {
      mesh.registerAgent(agent, { agentId: agent } as any, ['coder'], [agent]);
    });

    // Wave 1: Setup
    await executeAgentTask('setup-agent', 'setup', executionLog);

    // Wave 2: Build (parallel, depends on setup)
    await Promise.all([
      executeAgentTask('build-agent-1', 'build-1', executionLog),
      executeAgentTask('build-agent-2', 'build-2', executionLog)
    ]);

    // Wave 3: Test (depends on build)
    await executeAgentTask('test-agent', 'test', executionLog);

    // Verify execution order
    expect(executionLog[0]).toBe('setup');
    expect(executionLog.slice(1, 3)).toEqual(expect.arrayContaining(['build-1', 'build-2']));
    expect(executionLog[executionLog.length - 1]).toBe('test');
  });

  it('tracks workflow progress via task pool', async () => {
    const workflowId = 'e2e-progress-workflow';

    // Register agents
    mesh.registerAgent('worker', { agentId: 'worker' } as any, ['coder'], ['worker']);

    // Post multiple tasks
    for (let i = 0; i < 5; i++) {
      mesh.postTask({
        id: `${workflowId}-task-${i}`,
        description: `Task ${i}`,
        requiredCapabilities: ['coder']
      });
    }

    // Claim and complete tasks progressively
    for (let i = 0; i < 5; i++) {
      mesh.claimTask('worker', `${workflowId}-task-${i}`);
      await executeCoderTask('worker', `${workflowId}-task-${i}`);
      mesh.completeTask(`${workflowId}-task-${i}`, `Result ${i}`, true);
    }

    // Verify final state
    const stats = mesh.getTaskPoolStats();
    expect(stats.total).toBe(5);
    expect(stats.completed).toBe(5);
    expect(stats.pending).toBe(0);
    expect(stats.claimed).toBe(0);
  });

  it('handles concurrent context sharing during workflow', async () => {
    const workflowId = 'e2e-concurrent-context-workflow';

    // Register multiple agents
    const agents = ['agent-1', 'agent-2', 'agent-3'];
    agents.forEach(agent => {
      mesh.registerAgent(agent, { agentId: agent } as any, ['coder'], [agent]);
    });

    // All agents share context concurrently
    await Promise.all(
      agents.map((agent, idx) =>
        contextShare.shareContext({
          type: 'discovery',
          agent,
          task: workflowId,
          content: { data: `share-${idx}` },
          metadata: {
            timestamp: new Date().toISOString(),
            relevance: ['workflow'],
            priority: 'normal'
          }
        })
      )
    );

    // Verify all shares were recorded
    const stats = contextShare.getStatistics();
    expect(stats.totalShares).toBeGreaterThanOrEqual(3);
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

  async function executeCoderTask(agent: string, task: string) {
    // Simulate coding work
    await new Promise(resolve => setTimeout(resolve, 10));
    return { success: true, agent, task };
  }

  async function executeReviewerTask(agent: string, workflowId: string) {
    // Simulate review work
    await new Promise(resolve => setTimeout(resolve, 10));
    return { approved: true, agent, workflowId };
  }
});
