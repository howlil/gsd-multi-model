/**
 * Orchestrator Property-Based Tests (TEST-22)
 *
 * Tests orchestrator properties:
 * - Work classification consistency (same task = same classification)
 * - Fan-out/fan-in correctness (all results aggregated)
 * - Subagent context isolation (no cross-contamination)
 * - Agent routing accuracy (correct agent for work type)
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { WorkRouter, type WorkType, type AgentResult, type SynthesizedResult } from '../../bin/lib/orchestration/WorkRouter.js';
import { SubagentCoordinator, type SubagentResult } from '../../bin/lib/orchestration/SubagentCoordinator.js';
import {
  workTypeArb,
  agentResultArb,
  agentIdArb,
  nonEmptyArrayArb,
  uniqueStringArb
} from './arbitraries.js';

describe('Orchestrator (TEST-22)', () => {
  describe('WorkRouter', () => {
    it('classifies work consistently for same task', () => {
      fc.assert(fc.property(
        fc.string().filter(s => s.length > 5 && s.length < 200),
        (task) => {
          const router = new WorkRouter();

          // Classify multiple times
          const classification1 = router.classifyWork(task);
          const classification2 = router.classifyWork(task);
          const classification3 = router.classifyWork(task);

          // Should be deterministic
          expect(classification1).toBe(classification2);
          expect(classification2).toBe(classification3);
        }
      ));
    });

    it('correctly classifies bug-related tasks', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constant('Fix authentication bug'),
          fc.constant('Bug in payment processing'),
          fc.constant('Fix the broken login'),
          fc.constant('Error handling issue'),
          fc.constant('Fix memory leak')
        ),
        (task) => {
          const router = new WorkRouter();
          const classification = router.classifyWork(task);

          expect(classification).toBe('bugfix');
        }
      ));
    });

    it('correctly classifies feature tasks', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constant('Implement new dashboard'),
          fc.constant('Add user registration'),
          fc.constant('Create API endpoint'),
          fc.constant('New feature for reports')
        ),
        (task) => {
          const router = new WorkRouter();
          const classification = router.classifyWork(task);

          expect(classification).toBe('feature');
        }
      ));
    });

    it('correctly classifies incident tasks', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constant('Production incident: server down'),
          fc.constant('Emergency: database outage'),
          fc.constant('Production issue: high latency')
        ),
        (task) => {
          const router = new WorkRouter();
          const classification = router.classifyWork(task);

          expect(classification).toBe('incident');
        }
      ));
    });

    it('fan-out executes all agents and collects results', () => {
      fc.assert(fc.property(
        fc.string().filter(s => s.length > 0 && s.length < 100),
        nonEmptyArrayArb(agentIdArb),
        async (task, agentIds) => {
          const router = new WorkRouter();
          const uniqueAgentIds = [...new Set(agentIds)];

          const results = await router.fanOut(task, uniqueAgentIds);

          // Should have result for each agent
          expect(results.length).toBe(uniqueAgentIds.length);

          // All results should have required properties
          results.forEach(result => {
            expect(result).toHaveProperty('agentId');
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('output');
          });
        }
      ));
    });

    it('fan-in aggregates results correctly', () => {
      fc.assert(fc.property(
        nonEmptyArrayArb(agentResultArb),
        (results) => {
          const router = new WorkRouter();

          const synthesized = router.fanIn(results);

          // Should have all required properties
          expect(synthesized).toHaveProperty('success');
          expect(synthesized).toHaveProperty('output');
          expect(synthesized).toHaveProperty('sources');
          expect(synthesized).toHaveProperty('confidence');

          // Confidence should be ratio of successful results
          const successfulCount = results.filter(r => r.success).length;
          const expectedConfidence = successfulCount / results.length;
          expect(synthesized.confidence).toBe(expectedConfidence);

          // Sources should match successful agent IDs
          expect(synthesized.sources.length).toBe(successfulCount);
        }
      ));
    });

    it('fan-in handles all-failure scenario', () => {
      fc.assert(fc.property(
        nonEmptyArrayArb(
          fc.record({
            agentId: agentIdArb,
            output: fc.string(),
            success: fc.constant(false),
            duration: fc.nat()
          })
        ),
        (results) => {
          const router = new WorkRouter();

          const synthesized = router.fanIn(results);

          // Should indicate failure
          expect(synthesized.success).toBe(false);
          expect(synthesized.confidence).toBe(0);
          expect(synthesized.sources.length).toBe(0);
        }
      ));
    });

    it('fan-in handles all-success scenario', () => {
      fc.assert(fc.property(
        nonEmptyArrayArb(
          fc.record({
            agentId: agentIdArb,
            output: fc.string(),
            success: fc.constant(true),
            duration: fc.nat()
          })
        ),
        (results) => {
          const router = new WorkRouter();

          const synthesized = router.fanIn(results);

          // Should indicate success
          expect(synthesized.success).toBe(true);
          expect(synthesized.confidence).toBe(1);
          expect(synthesized.sources.length).toBe(results.length);
        }
      ));
    });

    it('routes work types to correct agents', () => {
      fc.assert(fc.property(
        workTypeArb,
        (workType) => {
          const router = new WorkRouter();
          const agent = router.route(workType);

          expect(agent).toBeDefined();
          expect(agent.id).toBeDefined();

          // Verify expected routing
          const expectedAgents: Record<WorkType, string> = {
            'incident': 'ez-debugger',
            'bugfix': 'ez-debugger',
            'refactor': 'ez-executor',
            'migration': 'ez-executor',
            'feature': 'ez-executor',
            'unknown': 'ez-chief-strategist'
          };

          expect(agent.id).toBe(expectedAgents[workType]);
        }
      ));
    });

    it('classification is invariant under task rephrasing', () => {
      fc.assert(fc.property(
        fc.record({
          task1: fc.constant('Fix the bug'),
          task2: fc.constant('Bug fix needed'),
          task3: fc.constant('There is a bug to fix')
        }),
        ({ task1, task2, task3 }) => {
          const router = new WorkRouter();

          const class1 = router.classifyWork(task1);
          const class2 = router.classifyWork(task2);
          const class3 = router.classifyWork(task3);

          // All should be classified as bugfix
          expect(class1).toBe('bugfix');
          expect(class2).toBe('bugfix');
          expect(class3).toBe('bugfix');
        }
      ));
    });
  });

  describe('SubagentCoordinator', () => {
    it('maintains subagent registration consistency', () => {
      fc.assert(fc.property(
        nonEmptyArrayArb(fc.record({
          id: agentIdArb,
          description: fc.string(),
          capabilities: fc.array(fc.string())
        })),
        (subagents) => {
          const mockSupervisor = {
            id: 'supervisor',
            name: 'Supervisor',
            execute: async () => ({ success: true, output: '' })
          } as any;

          const coordinator = new SubagentCoordinator(mockSupervisor);
          const uniqueIds = [...new Set(subagents.map(s => s.id))];

          // Add subagents
          for (const subagent of subagents) {
            coordinator.addSubagent(
              subagent.id,
              mockSupervisor,
              subagent.description,
              subagent.capabilities
            );
          }

          // List should match registered count
          const registered = coordinator.listSubagents();
          expect(registered.length).toBe(uniqueIds.length);
        }
      ));
    });

    it('subagent removal works correctly', () => {
      fc.assert(fc.property(
        nonEmptyArrayArb(agentIdArb),
        agentIdArb,
        (subagentIds, removeId) => {
          const mockSupervisor = {
            id: 'supervisor',
            name: 'Supervisor',
            execute: async () => ({ success: true, output: '' })
          } as any;

          const coordinator = new SubagentCoordinator(mockSupervisor);

          // Add all subagents
          for (const id of subagentIds) {
            coordinator.addSubagent(id, mockSupervisor);
          }

          // Remove specified subagent
          const removed = coordinator.removeSubagent(removeId);

          // Should be removed if it existed
          const exists = subagentIds.includes(removeId);
          expect(removed).toBe(exists);

          // Verify removal
          const remaining = coordinator.listSubagents();
          expect(remaining.some(s => s.id === removeId)).toBe(!exists);
        }
      ));
    });

    it('callSubagent returns error for non-existent subagent', () => {
      fc.assert(fc.property(
        agentIdArb,
        fc.string(),
        async (subagentId, task) => {
          const mockSupervisor = {
            id: 'supervisor',
            name: 'Supervisor',
            execute: async () => ({ success: true, output: '' })
          } as any;

          const coordinator = new SubagentCoordinator(mockSupervisor);

          const result = await coordinator.callSubagent(subagentId, task);

          expect(result.success).toBe(false);
          expect(result.subagentId).toBe(subagentId);
          expect(result.output).toContain('not found');
        }
      ));
    });

    it('callSubagent returns success for existing subagent', () => {
      fc.assert(fc.property(
        agentIdArb,
        fc.string(),
        async (subagentId, task) => {
          const mockSubagent = {
            id: subagentId,
            name: subagentId,
            execute: async (t: string) => ({ success: true, output: `Result: ${t}` })
          } as any;

          const mockSupervisor = {
            id: 'supervisor',
            name: 'Supervisor',
            execute: async () => ({ success: true, output: '' })
          } as any;

          const coordinator = new SubagentCoordinator(mockSupervisor);
          coordinator.addSubagent(subagentId, mockSubagent);

          const result = await coordinator.callSubagent(subagentId, task);

          expect(result.success).toBe(true);
          expect(result.subagentId).toBe(subagentId);
          expect(result.output).toBeDefined();
        }
      ));
    });

    it('parallel subagent calls execute all tasks', () => {
      fc.assert(fc.property(
        nonEmptyArrayArb(fc.record({
          subagentId: agentIdArb,
          task: fc.string()
        })),
        async (tasks) => {
          const mockSupervisor = {
            id: 'supervisor',
            name: 'Supervisor',
            execute: async () => ({ success: true, output: '' })
          } as any;

          const coordinator = new SubagentCoordinator(mockSupervisor);

          // Register all subagents
          const uniqueIds = [...new Set(tasks.map(t => t.subagentId))];
          for (const id of uniqueIds) {
            coordinator.addSubagent(id, mockSupervisor);
          }

          // Create task map
          const taskMap = new Map(tasks.map(t => [t.subagentId, t.task]));

          const results = await coordinator.callSubagentsParallel(taskMap);

          // Should have result for each task
          expect(results.length).toBe(tasks.length);
        }
      ));
    });

    it('sequential subagent calls stop on first failure', () => {
      fc.assert(fc.property(
        nonEmptyArrayArb(fc.record({
          subagentId: agentIdArb,
          task: fc.string(),
          shouldFail: fc.boolean()
        })),
        async (tasks) => {
          const mockSupervisor = {
            id: 'supervisor',
            name: 'Supervisor',
            execute: async () => ({ success: true, output: '' })
          } as any;

          const coordinator = new SubagentCoordinator(mockSupervisor);

          // Register subagents with controlled failure
          const uniqueIds = [...new Set(tasks.map(t => t.subagentId))];
          for (const id of uniqueIds) {
            const taskForId = tasks.find(t => t.subagentId === id);
            const shouldFail = taskForId?.shouldFail ?? false;

            coordinator.addSubagent(id, {
              id,
              name: id,
              execute: async () => {
                if (shouldFail) {
                  throw new Error('Intentional failure');
                }
                return { success: true, output: 'Success' };
              }
            } as any);
          }

          // Create task tuples
          const taskTuples: Array<[string, string]> = tasks.map(t => [t.subagentId, t.task]);

          const results = await coordinator.callSubagentsSequential(taskTuples);

          // Results should include all tasks up to and including first failure
          const firstFailureIndex = tasks.findIndex(t => t.shouldFail);

          if (firstFailureIndex === -1) {
            // No failures, all should succeed
            expect(results.every(r => r.success)).toBe(true);
            expect(results.length).toBe(tasks.length);
          } else {
            // Should stop at first failure
            expect(results[firstFailureIndex]?.success).toBe(false);
            expect(results.length).toBe(firstFailureIndex + 1);
          }
        }
      ));
    });

    it('getSubagent returns correct registration', () => {
      fc.assert(fc.property(
        agentIdArb,
        fc.string(),
        fc.array(fc.string()),
        (subagentId, description, capabilities) => {
          const mockSupervisor = {
            id: 'supervisor',
            name: 'Supervisor',
            execute: async () => ({ success: true, output: '' })
          } as any;

          const coordinator = new SubagentCoordinator(mockSupervisor);
          coordinator.addSubagent(subagentId, mockSupervisor, description, capabilities);

          const registration = coordinator.getSubagent(subagentId);

          expect(registration).toBeDefined();
          expect(registration?.id).toBe(subagentId);
          expect(registration?.description).toBe(description);
          expect(registration?.capabilities).toEqual(capabilities);
        }
      ));
    });

    it('maintains context isolation between subagent calls', () => {
      fc.assert(fc.property(
        nonEmptyArrayArb(fc.record({
          subagentId: agentIdArb,
          task: fc.string()
        })),
        async (tasks) => {
          const mockSupervisor = {
            id: 'supervisor',
            name: 'Supervisor',
            execute: async () => ({ success: true, output: '' })
          } as any;

          const coordinator = new SubagentCoordinator(mockSupervisor);

          // Track context isolation
          const contextCalls: Array<{ subagentId: string; context?: any }> = [];

          // Register subagents that track context
          const uniqueIds = [...new Set(tasks.map(t => t.subagentId))];
          for (const id of uniqueIds) {
            coordinator.addSubagent(id, {
              id,
              name: id,
              execute: async (task: string, context?: any) => {
                contextCalls.push({ subagentId: id, context });
                return { success: true, output: `Result for ${task}` };
              }
            } as any);
          }

          // Call each subagent with shared context
          const sharedContext = { shared: true, data: 'test' };
          for (const task of tasks) {
            await coordinator.callSubagent(task.subagentId, task.task, sharedContext);
          }

          // Each call should have isolated context
          contextCalls.forEach(call => {
            expect(call.context).toBeDefined();
            expect(call.context.subagentId).toBe(call.subagentId);
            expect(call.context.isolated).toBe(true);
          });
        }
      ));
    });
  });
});
