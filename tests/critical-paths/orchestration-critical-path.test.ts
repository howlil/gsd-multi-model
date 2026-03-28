/**
 * Agent Orchestration - Critical Path Tests
 *
 * Tests for Phase 36-37: Agent Mesh & Conflict Detection
 * Coverage target: ≥80% for AgentMesh, WorkRouter, HandoffManager
 *
 * Requirements:
 * - TEST-01: Agent orchestration critical path tests
 *   - Multi-agent registration and discovery
 *   - Task pool management
 *   - Message routing between agents
 *   - Work classification and routing
 *   - Handoff coordination
 *   - Conflict detection during orchestration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentMesh, Task, Message } from '../../bin/lib/orchestration/AgentMesh.js';
import { WorkRouter, WorkType, AgentResult } from '../../bin/lib/orchestration/WorkRouter.js';
import { HandoffManager } from '../../bin/lib/orchestration/HandoffManager.js';
import { ConflictDetector } from '../../bin/lib/orchestration/conflict-detector.js';

describe('Agent Orchestration - Critical Path', () => {
  describe('AgentMesh - Multi-Agent Registration', () => {
    let mesh: AgentMesh;

    beforeEach(() => {
      mesh = new AgentMesh();
    });

    it('registers multiple agents with different capabilities', () => {
      mesh.registerAgent('planner', {} as any, ['planning', 'analysis'], ['tasks']);
      mesh.registerAgent('coder', {} as any, ['coding', 'typescript'], ['tasks']);
      mesh.registerAgent('tester', {} as any, ['testing', 'vitest'], ['tasks']);

      const stats = mesh.getMeshStats();
      expect(stats.agents).toBe(3);
    });

    it('prevents duplicate agent registration', () => {
      mesh.registerAgent('agent-1', {} as any, ['coding'], ['tasks']);
      
      // Re-registering same ID should not increase count
      mesh.registerAgent('agent-1', {} as any, ['testing'], ['tasks']);
      
      const stats = mesh.getMeshStats();
      expect(stats.agents).toBe(1);
    });

    it('allows agent lookup by ID', () => {
      mesh.registerAgent('agent-1', {} as any, ['coding'], ['tasks']);
      
      const agent = mesh.getAgent('agent-1');
      expect(agent).toBeDefined();
      expect(agent?.id).toBe('agent-1');
    });

    it('returns undefined for non-existent agent', () => {
      const agent = mesh.getAgent('non-existent');
      expect(agent).toBeUndefined();
    });
  });

  describe('AgentMesh - Task Pool Management', () => {
    let mesh: AgentMesh;

    beforeEach(() => {
      mesh = new AgentMesh();
    });

    it('posts tasks to shared pool', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Implement feature',
        status: 'pending',
        requiredCapabilities: ['coding'],
        createdAt: Date.now()
      };

      mesh.postTask(task);
      const stats = mesh.getTaskPoolStats();
      expect(stats.total).toBe(1);
      expect(stats.pending).toBe(1);
    });

    it('allows agents to claim tasks matching capabilities', () => {
      mesh.registerAgent('coder', {} as any, ['coding', 'typescript'], ['tasks']);
      mesh.postTask({
        id: 'coding-task',
        description: 'Write code',
        status: 'pending',
        requiredCapabilities: ['coding'],
        createdAt: Date.now()
      });

      const claimed = mesh.claimTask('coder', 'coding-task');
      expect(claimed).toBe(true);

      const stats = mesh.getTaskPoolStats();
      expect(stats.claimed).toBe(1);
    });

    it('prevents claiming tasks without required capabilities', () => {
      mesh.registerAgent('tester', {} as any, ['testing'], ['tasks']);
      mesh.postTask({
        id: 'coding-task',
        description: 'Write code',
        status: 'pending',
        requiredCapabilities: ['coding'],
        createdAt: Date.now()
      });

      const claimed = mesh.claimTask('tester', 'coding-task');
      expect(claimed).toBe(false);

      const stats = mesh.getTaskPoolStats();
      expect(stats.pending).toBe(1);
    });

    it('completes tasks and tracks output', () => {
      mesh.registerAgent('coder', {} as any, ['coding'], ['tasks']);
      mesh.postTask({
        id: 'task-1',
        description: 'Implement feature',
        status: 'pending',
        createdAt: Date.now()
      });
      mesh.claimTask('coder', 'task-1');

      mesh.completeTask('task-1', 'Feature implemented', true);

      const stats = mesh.getTaskPoolStats();
      expect(stats.completed).toBe(1);
    });

    it('returns available tasks for agent capabilities', () => {
      mesh.registerAgent('fullstack', {} as any, ['coding', 'testing'], ['tasks']);
      mesh.postTask({
        id: 'task-1',
        description: 'Frontend work',
        status: 'pending',
        requiredCapabilities: ['coding'],
        createdAt: Date.now()
      });
      mesh.postTask({
        id: 'task-2',
        description: 'Backend work',
        status: 'pending',
        requiredCapabilities: ['testing'],
        createdAt: Date.now()
      });
      mesh.postTask({
        id: 'task-3',
        description: 'Design work',
        status: 'pending',
        requiredCapabilities: ['design'],
        createdAt: Date.now()
      });

      const available = mesh.getAvailableTasks('fullstack');
      expect(available.length).toBe(2);
      expect(available.map(t => t.id)).toContain('task-1');
      expect(available.map(t => t.id)).toContain('task-2');
    });
  });

  describe('AgentMesh - Message Routing', () => {
    let mesh: AgentMesh;

    beforeEach(() => {
      mesh = new AgentMesh();
    });

    it('broadcasts messages to channel subscribers', () => {
      mesh.registerAgent('agent-1', {} as any, ['coding'], ['broadcast-channel']);
      mesh.registerAgent('agent-2', {} as any, ['testing'], ['broadcast-channel']);
      mesh.registerAgent('agent-3', {} as any, ['design'], ['other-channel']);

      mesh.broadcast('sender', 'broadcast-channel', JSON.stringify({ type: 'update' }));

      const agent1Messages = mesh.getMessages('agent-1');
      const agent2Messages = mesh.getMessages('agent-2');
      const agent3Messages = mesh.getMessages('agent-3');

      expect(agent1Messages.length).toBe(1);
      expect(agent2Messages.length).toBe(1);
      expect(agent3Messages.length).toBe(0);
    });

    it('maintains message ordering from same sender', () => {
      mesh.registerAgent('receiver', {} as any, ['coding'], ['channel']);

      for (let i = 0; i < 5; i++) {
        mesh.broadcast('sender', 'channel', JSON.stringify({ sequence: i }));
      }

      const messages = mesh.getMessages('receiver');
      expect(messages.length).toBe(5);

      for (let i = 0; i < 5; i++) {
        const content = JSON.parse(messages[i].content);
        expect(content.sequence).toBe(i);
      }
    });

    it('tracks unread message count', () => {
      mesh.registerAgent('agent-1', {} as any, ['coding'], ['channel']);
      mesh.broadcast('sender', 'channel', 'message 1');
      mesh.broadcast('sender', 'channel', 'message 2');

      const unreadCount = mesh.getUnreadCount('agent-1');
      expect(unreadCount).toBe(2);
    });
  });

  describe('WorkRouter - Work Classification', () => {
    let router: WorkRouter;

    beforeEach(() => {
      router = new WorkRouter();
    });

    it('classifies feature work', () => {
      const workType = router.classifyWork('Implement new user registration feature');
      expect(workType).toBe('feature');
    });

    it('classifies bugfix work', () => {
      const workType = router.classifyWork('Fix authentication bug in login');
      expect(workType).toBe('bugfix');
    });

    it('classifies refactor work', () => {
      const workType = router.classifyWork('Refactor database connection pooling');
      expect(workType).toBe('refactor');
    });

    it('classifies migration work', () => {
      const workType = router.classifyWork('Migrate from PostgreSQL to MongoDB');
      expect(workType).toBe('migration');
    });

    it('classifies incident work with highest priority', () => {
      const workType = router.classifyWork('Production incident: API returning 500 errors');
      expect(workType).toBe('incident');
    });

    it('classifies unknown work type', () => {
      const workType = router.classifyWork('Do something random');
      expect(workType).toBe('unknown');
    });
  });

  describe('HandoffManager - Agent Handoffs', () => {
    let handoffManager: HandoffManager;

    beforeEach(() => {
      handoffManager = new HandoffManager();
    });

    it('creates handoff between agents', () => {
      const handoffId = handoffManager.createHandoff('agent-1', 'agent-2', {
        taskId: 'task-1',
        context: { data: 'test' }
      });

      expect(handoffId).toBeDefined();
    });

    it('tracks pending handoffs', () => {
      handoffManager.createHandoff('agent-1', 'agent-2', { taskId: 'task-1' });
      handoffManager.createHandoff('agent-2', 'agent-3', { taskId: 'task-2' });

      const pending = handoffManager.getPendingHandoffs();
      expect(pending.length).toBe(2);
    });

    it('completes handoff successfully', () => {
      const handoffId = handoffManager.createHandoff('agent-1', 'agent-2', { taskId: 'task-1' });
      
      const completed = handoffManager.completeHandoff(handoffId, true, 'Success');
      expect(completed).toBe(true);

      const pending = handoffManager.getPendingHandoffs();
      expect(pending.length).toBe(0);
    });

    it('fails handoff with reason', () => {
      const handoffId = handoffManager.createHandoff('agent-1', 'agent-2', { taskId: 'task-1' });
      
      const failed = handoffManager.failHandoff(handoffId, 'Agent unavailable');
      expect(failed).toBe(true);
    });

    it('tracks handoff statistics', () => {
      const handoffId1 = handoffManager.createHandoff('agent-1', 'agent-2', { taskId: 'task-1' });
      handoffManager.completeHandoff(handoffId1, true);

      const handoffId2 = handoffManager.createHandoff('agent-1', 'agent-2', { taskId: 'task-2' });
      handoffManager.failHandoff(handoffId2, 'Error');

      const stats = handoffManager.getHandoffStats();
      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });

  describe('ConflictDetector - Orchestration Conflicts', () => {
    let conflictDetector: ConflictDetector;

    beforeEach(() => {
      conflictDetector = new ConflictDetector();
    });

    it('detects file access conflicts between agents', () => {
      conflictDetector.recordFileAccess('agent-1', 'file.ts', 'write');
      conflictDetector.recordFileAccess('agent-2', 'file.ts', 'write');

      const conflicts = conflictDetector.detectConflicts();
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('allows concurrent read access', () => {
      conflictDetector.recordFileAccess('agent-1', 'file.ts', 'read');
      conflictDetector.recordFileAccess('agent-2', 'file.ts', 'read');

      const conflicts = conflictDetector.detectConflicts();
      expect(conflicts.length).toBe(0);
    });

    it('detects read-write conflicts', () => {
      conflictDetector.recordFileAccess('agent-1', 'file.ts', 'write');
      conflictDetector.recordFileAccess('agent-2', 'file.ts', 'read');

      const conflicts = conflictDetector.detectConflicts();
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('tracks conflict resolution', () => {
      conflictDetector.recordFileAccess('agent-1', 'file.ts', 'write');
      conflictDetector.recordFileAccess('agent-2', 'file.ts', 'write');

      const conflicts = conflictDetector.detectConflicts();
      if (conflicts.length > 0) {
        const resolved = conflictDetector.resolveConflict(conflicts[0].id, 'agent-1');
        expect(resolved).toBe(true);
      }
    });
  });

  describe('Integration - Multi-Agent Workflow', () => {
    it('executes complete multi-agent workflow', () => {
      const mesh = new AgentMesh();
      const router = new WorkRouter();
      const handoffManager = new HandoffManager();

      // Register specialist agents
      mesh.registerAgent('planner', {} as any, ['planning'], ['tasks']);
      mesh.registerAgent('coder', {} as any, ['coding'], ['tasks']);
      mesh.registerAgent('tester', {} as any, ['testing'], ['tasks']);

      // Post and claim tasks
      mesh.postTask({
        id: 'task-1',
        description: 'Plan architecture',
        status: 'pending',
        requiredCapabilities: ['planning'],
        createdAt: Date.now()
      });

      const claimed = mesh.claimTask('planner', 'task-1');
      expect(claimed).toBe(true);

      // Simulate handoff to coder
      const handoffId = handoffManager.createHandoff('planner', 'coder', {
        taskId: 'task-1',
        output: 'Architecture planned'
      });

      expect(handoffId).toBeDefined();
    });
  });
});
