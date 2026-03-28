/**
 * Multi-Agent Coordination - Integration Tests
 *
 * Integration tests for multi-agent coordination system.
 * Tests agent-to-agent messaging, peer-to-peer communication,
 * broadcast messaging, and message delivery guarantees.
 *
 * Requirement: TEST-09
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentMesh } from '../../bin/lib/orchestration/AgentMesh.js';

describe('Multi-Agent Coordination - Integration', () => {
  let mesh: AgentMesh;

  beforeEach(() => {
    mesh = new AgentMesh();
  });

  afterEach(() => {
    // Cleanup - unregister all agents
    const stats = mesh.getMeshStats();
    for (let i = 0; i < stats.agents; i++) {
      // In real implementation, would track registered agents
    }
  });

  it('establishes peer-to-peer connections between agents', async () => {
    // Register 3 agents with different capabilities
    mesh.registerAgent('agent-1', { agentId: 'agent-1' } as any, ['coding'], ['tasks']);
    mesh.registerAgent('agent-2', { agentId: 'agent-2' } as any, ['reviewing'], ['tasks']);
    mesh.registerAgent('agent-3', { agentId: 'agent-3' } as any, ['testing'], ['tasks']);

    // Verify all agents are connected
    const stats = mesh.getMeshStats();
    expect(stats.agents).toBe(3);
  });

  it('sends direct messages between agents via broadcast', async () => {
    // Register 2 agents
    mesh.registerAgent('agent-1', { agentId: 'agent-1' } as any, ['coding'], ['agent-2']);
    mesh.registerAgent('agent-2', { agentId: 'agent-2' } as any, ['reviewing'], ['agent-2']);

    // Send message via broadcast to agent-2 channel
    mesh.broadcast('agent-1', 'agent-2', JSON.stringify({
      type: 'REQUEST',
      action: 'review',
      fileId: 'test.ts'
    }));

    // Agent-2 should receive the message
    const messages = mesh.getMessages('agent-2');
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].from).toBe('agent-1');
  });

  it('broadcasts messages to all agents in channel', async () => {
    // Register multiple agents subscribed to same channel
    mesh.registerAgent('agent-1', { agentId: 'agent-1' } as any, ['coding'], ['broadcast-channel']);
    mesh.registerAgent('agent-2', { agentId: 'agent-2' } as any, ['reviewing'], ['broadcast-channel']);
    mesh.registerAgent('agent-3', { agentId: 'agent-3' } as any, ['testing'], ['broadcast-channel']);

    // Broadcast state update to channel
    mesh.broadcast('orchestrator', 'broadcast-channel', JSON.stringify({
      event: 'state_update',
      phase: 45
    }));

    // All agents should receive the message
    const agent1Messages = mesh.getMessages('agent-1');
    const agent2Messages = mesh.getMessages('agent-2');
    const agent3Messages = mesh.getMessages('agent-3');

    expect(agent1Messages.length).toBeGreaterThan(0);
    expect(agent2Messages.length).toBeGreaterThan(0);
    expect(agent3Messages.length).toBeGreaterThan(0);
  });

  it('handles message delivery to non-existent agent gracefully', async () => {
    // Only register one agent
    mesh.registerAgent('agent-1', { agentId: 'agent-1' } as any, ['coding'], ['tasks']);

    // Broadcast to non-existent agent channel
    mesh.broadcast('agent-1', 'non-existent-agent', JSON.stringify({
      type: 'REQUEST',
      payload: {}
    }));

    // Message should be in mailbox even if no subscriber
    const mailboxesStats = mesh.getMeshStats();
    expect(mailboxesStats.totalMessages).toBeGreaterThan(0);
  });

  it('maintains message ordering for same sender', async () => {
    // Register sender and receiver
    mesh.registerAgent('sender', { agentId: 'sender' } as any, ['coding'], ['receiver']);
    mesh.registerAgent('receiver', { agentId: 'receiver' } as any, ['reviewing'], ['receiver']);

    // Send multiple messages in sequence
    const sequenceLength = 5;
    for (let i = 0; i < sequenceLength; i++) {
      mesh.broadcast('sender', 'receiver', JSON.stringify({
        sequence: i,
        timestamp: Date.now()
      }));
    }

    // Verify messages are received in order
    const messages = mesh.getMessages('receiver');
    expect(messages.length).toBe(sequenceLength);

    // Messages should be in FIFO order
    for (let i = 0; i < sequenceLength; i++) {
      const content = JSON.parse(messages[i].content);
      expect(content.sequence).toBe(i);
    }
  });

  it('tracks task pool statistics correctly', async () => {
    // Post multiple tasks
    mesh.postTask({ id: 'task-1', description: 'Task 1' });
    mesh.postTask({ id: 'task-2', description: 'Task 2' });
    mesh.postTask({ id: 'task-3', description: 'Task 3' });

    const stats = mesh.getTaskPoolStats();
    expect(stats.total).toBe(3);
    expect(stats.pending).toBe(3);
  });

  it('allows agents to claim tasks based on capabilities', async () => {
    // Register agent with specific capabilities
    mesh.registerAgent('coder', { agentId: 'coder' } as any, ['coding', 'typescript'], ['tasks']);

    // Post task requiring coding capability
    mesh.postTask({
      id: 'coding-task',
      description: 'Implement feature',
      requiredCapabilities: ['coding']
    });

    // Coder should be able to claim the task
    const claimed = mesh.claimTask('coder', 'coding-task');
    expect(claimed).toBe(true);

    const stats = mesh.getTaskPoolStats();
    expect(stats.claimed).toBe(1);
  });

  it('prevents agents from claiming tasks without required capabilities', async () => {
    // Register agent without required capability
    mesh.registerAgent('tester', { agentId: 'tester' } as any, ['testing'], ['tasks']);

    // Post task requiring coding capability
    mesh.postTask({
      id: 'coding-task',
      description: 'Implement feature',
      requiredCapabilities: ['coding']
    });

    // Tester should NOT be able to claim the task
    const claimed = mesh.claimTask('tester', 'coding-task');
    expect(claimed).toBe(false);

    const stats = mesh.getTaskPoolStats();
    expect(stats.pending).toBe(1);
  });

  it('allows task completion with output', async () => {
    // Register and claim
    mesh.registerAgent('coder', { agentId: 'coder' } as any, ['coding'], ['tasks']);
    mesh.postTask({ id: 'task-1', description: 'Implement feature' });
    mesh.claimTask('coder', 'task-1');

    // Complete task
    mesh.completeTask('task-1', 'Feature implemented successfully', true);

    const stats = mesh.getTaskPoolStats();
    expect(stats.completed).toBe(1);
    expect(stats.claimed).toBe(0);
  });

  it('allows agents to get available tasks matching capabilities', async () => {
    // Register agents with different capabilities
    mesh.registerAgent('frontend-dev', { agentId: 'frontend-dev' } as any, ['react', 'typescript'], ['tasks']);
    mesh.registerAgent('backend-dev', { agentId: 'backend-dev' } as any, ['node', 'database'], ['tasks']);

    // Post tasks with different requirements
    mesh.postTask({
      id: 'frontend-task',
      description: 'Build UI component',
      requiredCapabilities: ['react']
    });
    mesh.postTask({
      id: 'backend-task',
      description: 'Create API endpoint',
      requiredCapabilities: ['node']
    });
    // General task with no specific requirements
    mesh.postTask({
      id: 'general-task',
      description: 'General task',
      requiredCapabilities: []
    });

    // Frontend dev should see frontend and general tasks
    const frontendTasks = mesh.getAvailableTasks('frontend-dev');
    expect(frontendTasks.length).toBe(2);
    expect(frontendTasks.map(t => t.id)).toContain('frontend-task');
    expect(frontendTasks.map(t => t.id)).toContain('general-task');

    // Backend dev should see backend and general tasks
    const backendTasks = mesh.getAvailableTasks('backend-dev');
    expect(backendTasks.length).toBe(2);
    expect(backendTasks.map(t => t.id)).toContain('backend-task');
    expect(backendTasks.map(t => t.id)).toContain('general-task');
  });
});
