/**
 * Agent Mesh Property-Based Tests (TEST-17)
 *
 * Tests AgentMesh properties:
 * - Task pool consistency (tasks transition through valid states)
 * - Message delivery (broadcast reaches all subscribers)
 * - Agent registration (registered agents can claim tasks)
 * - Capability matching (agents only claim tasks they're capable of)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { AgentMesh } from '../../bin/lib/orchestration/AgentMesh.js';
import {
  agentIdArb,
  taskIdArb,
  taskDescriptionArb,
  capabilityArb,
  channelArb,
  messageContentArb,
  nonEmptyArrayArb,
  uniqueStringArb
} from './arbitraries.js';

describe('Agent Mesh (TEST-17)', () => {
  let mesh: AgentMesh;

  beforeEach(() => {
    mesh = new AgentMesh();
  });

  it('maintains task pool consistency - tasks transition through valid states', () => {
    fc.assert(fc.property(
      taskIdArb,
      taskDescriptionArb,
      nonEmptyArrayArb(capabilityArb),
      agentIdArb,
      (taskId, description, capabilities, agentId) => {
        const testMesh = new AgentMesh();

        // Register agent with capabilities
        testMesh.registerAgent(agentId, {} as any, capabilities, []);

        // Post task
        testMesh.postTask({
          id: taskId,
          description,
          requiredCapabilities: capabilities
        });

        // Task should be pending
        const availableTasks = testMesh.getAvailableTasks(agentId);
        const task = availableTasks.find(t => t.id === taskId);
        expect(task).toBeDefined();
        expect(task?.status).toBe('pending');

        // Agent claims task
        const claimed = testMesh.claimTask(agentId, taskId);
        expect(claimed).toBe(true);

        // Task should be claimed
        const claimedTasks = testMesh.getAvailableTasks(agentId);
        expect(claimedTasks.find(t => t.id === taskId)).toBeUndefined();

        // Complete task
        testMesh.completeTask(taskId, 'output', true);

        // Task pool stats should reflect completion
        const stats = testMesh.getTaskPoolStats();
        expect(stats.completed).toBeGreaterThanOrEqual(1);
      }
    ));
  });

  it('ensures message delivery - broadcast reaches all channel subscribers', () => {
    fc.assert(fc.property(
      channelArb,
      messageContentArb,
      nonEmptyArrayArb(agentIdArb),
      (channel, content, agentIds) => {
        const testMesh = new AgentMesh();

        // Register all agents subscribed to channel
        for (const agentId of agentIds) {
          testMesh.registerAgent(agentId, {} as any, [], [channel]);
        }

        // First agent broadcasts message
        const sender = agentIds[0]!;
        testMesh.broadcast(sender, channel, content);

        // All agents should receive the message
        for (const agentId of agentIds) {
          const messages = testMesh.getMessages(agentId);
          const receivedMessage = messages.find(m => m.content === content);
          expect(receivedMessage).toBeDefined();
          expect(receivedMessage?.from).toBe(sender);
          expect(receivedMessage?.to).toBe(channel);
        }
      }
    ));
  });

  it('validates capability matching - agents only claim tasks they are capable of', () => {
    fc.assert(fc.property(
      taskIdArb,
      taskDescriptionArb,
      nonEmptyArrayArb(capabilityArb),
      nonEmptyArrayArb(capabilityArb),
      (taskId, description, taskCapabilities, agentCapabilities) => {
        const testMesh = new AgentMesh();

        const agentId = 'test-agent';
        testMesh.registerAgent(agentId, {} as any, agentCapabilities, []);

        testMesh.postTask({
          id: taskId,
          description,
          requiredCapabilities: taskCapabilities
        });

        // Check if agent has all required capabilities
        const hasAllCapabilities = taskCapabilities.every(cap =>
          agentCapabilities.includes(cap)
        );

        const canClaim = testMesh.claimTask(agentId, taskId);

        // Claim success should match capability match
        expect(canClaim).toBe(hasAllCapabilities);
      }
    ));
  });

  it('maintains agent registration consistency', () => {
    fc.assert(fc.property(
      nonEmptyArrayArb(
        fc.record({
          id: agentIdArb,
          capabilities: nonEmptyArrayArb(capabilityArb),
          channels: fc.array(channelArb)
        })
      ),
      (agents) => {
        const testMesh = new AgentMesh();

        // Register all agents
        for (const agent of agents) {
          testMesh.registerAgent(agent.id, {} as any, agent.capabilities, agent.channels);
        }

        // Get stats
        const stats = testMesh.getMeshStats();

        // Agent count should match
        expect(stats.agents).toBe(agents.length);

        // Channel count should be at least the unique channels
        const uniqueChannels = new Set(agents.flatMap(a => a.channels));
        expect(stats.channels).toBeGreaterThanOrEqual(uniqueChannels.size);
      }
    ));
  });

  it('ensures task lifecycle - pending -> claimed -> completed/failed', () => {
    fc.assert(fc.property(
      taskIdArb,
      taskDescriptionArb,
      agentIdArb,
      capabilityArb,
      fc.boolean(),
      (taskId, description, agentId, capability, shouldSucceed) => {
        const testMesh = new AgentMesh();

        testMesh.registerAgent(agentId, {} as any, [capability], []);

        testMesh.postTask({
          id: taskId,
          description,
          requiredCapabilities: [capability]
        });

        // Initial state: pending
        let stats = testMesh.getTaskPoolStats();
        expect(stats.pending).toBe(1);
        expect(stats.claimed).toBe(0);
        expect(stats.completed).toBe(0);
        expect(stats.failed).toBe(0);

        // Claim task
        testMesh.claimTask(agentId, taskId);
        stats = testMesh.getTaskPoolStats();
        expect(stats.pending).toBe(0);
        expect(stats.claimed).toBe(1);

        // Complete task
        testMesh.completeTask(taskId, 'output', shouldSucceed);
        stats = testMesh.getTaskPoolStats();
        expect(stats.claimed).toBe(0);
        if (shouldSucceed) {
          expect(stats.completed).toBe(1);
          expect(stats.failed).toBe(0);
        } else {
          expect(stats.completed).toBe(0);
          expect(stats.failed).toBe(1);
        }
      }
    ));
  });

  it('handles concurrent task claims - only one agent succeeds', () => {
    fc.assert(fc.property(
      taskIdArb,
      taskDescriptionArb,
      nonEmptyArrayArb(capabilityArb),
      (taskId, description, capabilities) => {
        const testMesh = new AgentMesh();

        const agent1 = 'agent-1';
        const agent2 = 'agent-2';

        testMesh.registerAgent(agent1, {} as any, capabilities, []);
        testMesh.registerAgent(agent2, {} as any, capabilities, []);

        testMesh.postTask({
          id: taskId,
          description,
          requiredCapabilities: capabilities
        });

        // Both agents try to claim
        const claim1 = testMesh.claimTask(agent1, taskId);
        const claim2 = testMesh.claimTask(agent2, taskId);

        // Only one should succeed
        expect(claim1 || claim2).toBe(true);
        expect(claim1 && claim2).toBe(false);
      }
    ));
  });

  it('maintains message ordering within channels', () => {
    fc.assert(fc.property(
      channelArb,
      nonEmptyArrayArb(messageContentArb),
      agentIdArb,
      (channel, messages, agentId) => {
        const testMesh = new AgentMesh();

        testMesh.registerAgent(agentId, {} as any, [], [channel]);

        // Send messages in order
        for (const content of messages) {
          testMesh.broadcast('sender', channel, content);
        }

        // Get messages
        const receivedMessages = testMesh.getMessages(agentId);

        // All messages should be received in order
        expect(receivedMessages.length).toBe(messages.length);
        for (let i = 0; i < messages.length; i++) {
          expect(receivedMessages[i]?.content).toBe(messages[i]);
        }
      }
    ));
  });

  it('handles agent unregistration correctly', () => {
    fc.assert(fc.property(
      nonEmptyArrayArb(agentIdArb),
      channelArb,
      (agentIds, channel) => {
        const testMesh = new AgentMesh();

        // Register all agents
        for (const agentId of agentIds) {
          testMesh.registerAgent(agentId, {} as any, [], [channel]);
        }

        // Unregister first agent
        const agentToUnregister = agentIds[0]!;
        const unregistered = testMesh.unregisterAgent(agentToUnregister);
        expect(unregistered).toBe(true);

        // Stats should reflect unregistration
        const stats = testMesh.getMeshStats();
        expect(stats.agents).toBe(agentIds.length - 1);
      }
    ));
  });

  it('ensures idempotent message read marking', () => {
    fc.assert(fc.property(
      channelArb,
      messageContentArb,
      agentIdArb,
      (channel, content, agentId) => {
        const testMesh = new AgentMesh();

        testMesh.registerAgent(agentId, {} as any, [], [channel]);
        testMesh.broadcast('sender', channel, content);

        // Get initial unread message count
        const initialMessages = testMesh.getMessages(agentId);
        expect(initialMessages.length).toBeGreaterThan(0);

        const messageId = initialMessages[0]?.id;
        expect(messageId).toBeDefined();

        // Mark as read multiple times (idempotent operation)
        if (messageId) {
          testMesh.markMessageRead(messageId);
          testMesh.markMessageRead(messageId);
          testMesh.markMessageRead(messageId);

          // Message should be removed from unread list (getMessages returns only unread)
          const updatedMessages = testMesh.getMessages(agentId);
          const stillUnread = updatedMessages.find(m => m.id === messageId);
          expect(stillUnread).toBeUndefined(); // Message is now read, so not in unread list
        }
      }
    ));
  });
});
