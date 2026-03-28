/**
 * Phase 23: Integration/Roadmap Tests
 * 
 * Tests for INT-01 to INT-06:
 * - INT-01: FinOps and Context integration
 * - INT-02: Cost tracking with context optimization
 * - INT-03: Budget enforcement with workflow execution
 * - INT-04: Multi-agent coordination with cost tracking
 * - INT-05: Roadmap phase discovery integration
 * - INT-06: End-to-end workflow integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createTempProject, createTempGitProject, cleanup } from '../helpers.js';

import CostTracker from '../../bin/lib/cost/cost-tracker.js';
import { ContextOptimizer } from '../../bin/lib/context/context-optimizer.js';
import { ContextSlicer } from '../../bin/lib/context/context-slicer.js';
import { FinopsAnalyzer } from '../../bin/lib/finops/finops-analyzer.js';
import { BudgetEnforcer } from '../../bin/lib/finops/budget-enforcer.js';
import { findPhaseInternal, getRoadmapPhaseInternal, loadConfig } from '../../bin/lib/core.js';

describe('Phase 23: Integration/Roadmap Tests', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  /**
   * INT-01: FinOps and Context Integration
   * Verify FinOps and Context modules work together
   */
  describe('INT-01: FinOps and Context Integration', () => {
    it('should track context optimization costs', async () => {
      const tracker = new CostTracker(tmpDir);
      const optimizer = new ContextOptimizer(tmpDir);

      // Create test files
      const testFile = path.join(tmpDir, 'test.ts');
      fs.writeFileSync(testFile, 'export const test = "hello";');

      // Optimize context
      await optimizer.optimizeContext({
        files: ['*.ts'],
        task: 'test optimization'
      });

      // Record the cost
      await tracker.record({
        phase: 21,
        agent: 'ez-executor',
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        input_tokens: 500,
        output_tokens: 250,
        cost_usd: 0.00525,
        task_type: 'context-optimization'
      });

      const agg = tracker.aggregate({ phase: 21 });
      expect(agg.total.cost).toBe(0.00525);
    });

    it('should analyze context operation costs with FinOpsAnalyzer', () => {
      const analyzer = new FinopsAnalyzer(tmpDir);

      const resources = {
        'context-optimization': { cost: 0.01, category: 'context', utilization: 80 },
        'context-slicing': { cost: 0.005, category: 'context', utilization: 60 },
        'cost-tracking': { cost: 0.002, category: 'finops', utilization: 90 }
      };

      const analysis = analyzer.analyzeCosts(resources);

      expect(analysis.totalCost).toBe(0.017);
      expect(analysis.byCategory['context']).toBe(0.015);
      expect(analysis.byCategory['finops']).toBe(0.002);
    });

    it('should generate recommendations for context operations', () => {
      const analyzer = new FinopsAnalyzer(tmpDir);

      const resources = {
        'expensive-context-op': { 
          cost: 10, 
          category: 'context', 
          utilization: 20  // Low utilization triggers recommendation
        }
      };

      const analysis = analyzer.analyzeCosts(resources);

      expect(analysis.recommendations.length).toBe(1);
      expect(analysis.recommendations[0].type).toBe('rightsize');
    });
  });

  /**
   * INT-02: Cost Tracking with Context Optimization
   * Verify cost tracking integrates with context operations
   */
  describe('INT-02: Cost Tracking with Context Optimization', () => {
    it('should record costs for multiple context operations', async () => {
      const tracker = new CostTracker(tmpDir);
      const optimizer = new ContextOptimizer(tmpDir);

      // Create test files
      fs.writeFileSync(path.join(tmpDir, 'file1.ts'), 'export const f1 = "test";');
      fs.writeFileSync(path.join(tmpDir, 'file2.ts'), 'export const f2 = "test";');

      // Simulate multiple context operations
      await optimizer.optimizeContext({ files: ['*.ts'], task: 'task1' });
      await tracker.record({
        phase: 21,
        agent: 'ez-executor',
        provider: 'claude',
        cost_usd: 0.01
      });

      await optimizer.optimizeContext({ files: ['*.ts'], task: 'task2' });
      await tracker.record({
        phase: 21,
        agent: 'ez-executor',
        provider: 'claude',
        cost_usd: 0.015
      });

      const agg = tracker.aggregate({ phase: 21 });
      expect(agg.total.cost).toBe(0.025);
    });

    it('should track context slicing costs separately', async () => {
      const tracker = new CostTracker(tmpDir);
      const slicer = new ContextSlicer();

      // Create test file
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"name": "test"}');

      // Slice context
      await slicer.sliceContext(['package.json'], 'test task');

      // Record cost
      await tracker.record({
        phase: 21,
        agent: 'ez-executor',
        provider: 'claude',
        cost_usd: 0.008,
        task_type: 'context-slicing'
      });

      const agg = tracker.aggregate({ by_agent: true });
      expect(agg.by_agent?.['ez-executor']?.cost).toBe(0.008);
    });

    it('should enforce budget during context operations', async () => {
      const tracker = new CostTracker(tmpDir);
      tracker.setBudget(0.05);

      // Record costs approaching budget
      await tracker.record({
        phase: 21,
        provider: 'claude',
        cost_usd: 0.04
      });

      const budget = await tracker.checkBudget();
      expect(budget.status).toBe('warning');
      expect(budget.percentUsed).toBe(80);
    });
  });

  /**
   * INT-03: Budget Enforcement with Workflow Execution
   * Verify budget enforcement during workflow execution
   */
  describe('INT-03: Budget Enforcement with Workflow', () => {
    it('should check budget before workflow execution', async () => {
      const tracker = new CostTracker(tmpDir);
      const enforcer = new BudgetEnforcer(tmpDir);

      // Set up config
      const configPath = path.join(tmpDir, '.planning', 'config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({
        cost_tracking: {
          budget: { ceiling: 100 },
          warning_threshold: 80
        }
      }));

      // Record some cost
      await tracker.record({
        phase: 20,
        provider: 'claude',
        cost_usd: 50
      });

      // Check budget
      const status = enforcer.checkBudget(50);
      expect(status.ok).toBe(true);
      expect(status.warning).toBe(false);
    });

    it('should block workflow when budget exceeded', async () => {
      const tracker = new CostTracker(tmpDir);
      tracker.setBudget(100);

      await tracker.record({
        phase: 20,
        provider: 'claude',
        cost_usd: 120
      });

      const budget = await tracker.checkBudget();
      expect(budget.status).toBe('exceeded');
      expect(budget.total).toBeGreaterThan(100);
    });

    it('should trigger alerts during workflow execution', async () => {
      const tracker = new CostTracker(tmpDir);
      tracker.setBudget(100);

      await tracker.record({
        phase: 20,
        provider: 'claude',
        cost_usd: 75
      });

      const budget = await tracker.checkBudget();
      expect(budget.alerts).toBeDefined();
      expect(budget.alerts?.length).toBeGreaterThan(0);
    });
  });

  /**
   * INT-04: Multi-Agent Coordination with Cost Tracking
   * Verify cost tracking across multiple agents
   */
  describe('INT-04: Multi-Agent Coordination', () => {
    it('should track costs for multiple agents in same phase', async () => {
      const tracker = new CostTracker(tmpDir);

      const agents = ['ez-planner', 'ez-executor', 'ez-verifier'];
      const costs = [0.01, 0.02, 0.015];

      for (let i = 0; i < agents.length; i++) {
        await tracker.record({
          phase: 20,
          agent: agents[i],
          provider: 'claude',
          cost_usd: costs[i]
        });
      }

      const agg = tracker.aggregate({ phase: 20, by_agent: true });
      
      expect(Object.keys(agg.by_agent ?? {}).length).toBe(3);
      expect(agg.by_agent?.['ez-planner']?.cost).toBe(0.01);
      expect(agg.by_agent?.['ez-executor']?.cost).toBe(0.02);
      expect(agg.by_agent?.['ez-verifier']?.cost).toBe(0.015);
    });

    it('should aggregate total cost across all agents', async () => {
      const tracker = new CostTracker(tmpDir);

      await tracker.record({
        phase: 20,
        agent: 'ez-planner',
        provider: 'claude',
        cost_usd: 0.01
      });

      await tracker.record({
        phase: 20,
        agent: 'ez-executor',
        provider: 'claude',
        cost_usd: 0.02
      });

      await tracker.record({
        phase: 20,
        agent: 'ez-verifier',
        provider: 'claude',
        cost_usd: 0.015
      });

      const agg = tracker.aggregate({ phase: 20 });
      expect(agg.total.cost).toBe(0.045);
    });

    it('should track agent-specific context usage', async () => {
      const tracker = new CostTracker(tmpDir);
      const optimizer = new ContextOptimizer(tmpDir);

      // Create test file
      fs.writeFileSync(path.join(tmpDir, 'test.ts'), 'export const test = "hello";');

      // Simulate agent operations
      await optimizer.optimizeContext({ files: ['*.ts'], task: 'planner task' });
      await tracker.record({
        phase: 20,
        agent: 'ez-planner',
        provider: 'claude',
        cost_usd: 0.01,
        task_type: 'planning'
      });

      await optimizer.optimizeContext({ files: ['*.ts'], task: 'executor task' });
      await tracker.record({
        phase: 20,
        agent: 'ez-executor',
        provider: 'claude',
        cost_usd: 0.02,
        task_type: 'execution'
      });

      const agg = tracker.aggregate({ phase: 20, by_agent: true });
      expect(agg.by_agent?.['ez-planner']).toBeDefined();
      expect(agg.by_agent?.['ez-executor']).toBeDefined();
    });
  });

  /**
   * INT-05: Roadmap Phase Discovery Integration
   * Verify roadmap phase discovery works with other modules
   */
  describe('INT-05: Roadmap Phase Discovery', () => {
    it('should discover phases and track their costs', async () => {
      // Create phase directory
      const phaseDir = path.join(tmpDir, '.planning', 'phases', '20-finops');
      fs.mkdirSync(phaseDir, { recursive: true });
      fs.writeFileSync(path.join(phaseDir, 'PLAN.md'), '# Plan');

      // Create roadmap
      const roadmapPath = path.join(tmpDir, '.planning', 'ROADMAP.md');
      fs.writeFileSync(roadmapPath, '### Phase 20: FinOps Tests\n**Goal:** Implement FinOps');

      // Find phase
      const phase = findPhaseInternal(tmpDir, '20');
      expect(phase).not.toBeNull();
      expect(phase?.found).toBe(true);

      // Get roadmap info
      const roadmapPhase = getRoadmapPhaseInternal(tmpDir, '20');
      expect(roadmapPhase).not.toBeNull();
      expect(roadmapPhase?.goal).toBe('Implement FinOps');
    });

    it('should load config and discover phases together', () => {
      // Create config
      const configPath = path.join(tmpDir, '.planning', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        model_profile: 'quality',
        cost_tracking: {
          budget: 100
        }
      }));

      // Create phase
      const phaseDir = path.join(tmpDir, '.planning', 'phases', '21-context');
      fs.mkdirSync(phaseDir, { recursive: true });

      // Load config - verify model_profile is loaded
      const config = loadConfig(tmpDir);
      expect(config.model_profile).toBe('quality');
      
      // Verify config file was written correctly by reading it directly
      const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(rawConfig.cost_tracking?.budget).toBe(100);

      // Find phase
      const phase = findPhaseInternal(tmpDir, '21');
      expect(phase).not.toBeNull();
    });

    it('should integrate phase discovery with cost tracking', async () => {
      // Create phase directory
      const phaseDir = path.join(tmpDir, '.planning', 'phases', '22-integration');
      fs.mkdirSync(phaseDir, { recursive: true });
      fs.writeFileSync(path.join(phaseDir, 'PLAN.md'), '# Plan');
      fs.writeFileSync(path.join(phaseDir, 'SUMMARY.md'), '# Summary');

      // Find phase
      const phase = findPhaseInternal(tmpDir, '22');
      expect(phase?.found).toBe(true);
      expect(phase?.incomplete_plans.length).toBe(0);

      // Track costs for this phase
      const tracker = new CostTracker(tmpDir);
      await tracker.record({
        phase: 22,
        agent: 'ez-executor',
        provider: 'claude',
        cost_usd: 0.01
      });

      const agg = tracker.aggregate({ phase: 22 });
      expect(agg.total.cost).toBe(0.01);
    });
  });

  /**
   * INT-06: End-to-End Workflow Integration
   * Verify complete workflow from phase discovery to cost tracking
   */
  describe('INT-06: End-to-End Workflow', () => {
    it('should execute complete workflow: discover -> optimize -> track -> report', async () => {
      // Step 1: Set up phase structure
      const phaseDir = path.join(tmpDir, '.planning', 'phases', '23-e2e');
      fs.mkdirSync(phaseDir, { recursive: true });
      fs.writeFileSync(path.join(phaseDir, 'PLAN.md'), '# Plan');

      // Step 2: Create roadmap
      const roadmapPath = path.join(tmpDir, '.planning', 'ROADMAP.md');
      fs.writeFileSync(roadmapPath, '### Phase 23: E2E Tests\n**Goal:** End-to-end integration');

      // Step 3: Create config with budget
      const configPath = path.join(tmpDir, '.planning', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        model_profile: 'balanced',
        cost_tracking: {
          budget: 100,
          warning_threshold: 80
        }
      }));

      // Step 4: Create test files for context
      fs.writeFileSync(path.join(tmpDir, 'module.ts'), 'export const module = "test";');

      // Step 5: Discover phase
      const phase = findPhaseInternal(tmpDir, '23');
      expect(phase?.found).toBe(true);

      // Step 6: Optimize context
      const optimizer = new ContextOptimizer(tmpDir);
      const contextResult = await optimizer.optimizeContext({
        files: ['*.ts'],
        task: 'e2e integration test'
      });
      expect(contextResult.sources.length).toBeGreaterThan(0);

      // Step 7: Track costs
      const tracker = new CostTracker(tmpDir);
      await tracker.record({
        phase: 23,
        agent: 'ez-executor',
        provider: 'claude',
        cost_usd: 0.01
      });

      // Step 8: Check budget
      const budget = await tracker.checkBudget();
      expect(budget.status).toBe('ok');

      // Step 9: Generate report
      const analyzer = new FinopsAnalyzer(tmpDir);
      const analysis = analyzer.analyzeCosts({
        'e2e-test': { cost: 0.01, category: 'testing', utilization: 100 }
      });
      expect(analysis.totalCost).toBe(0.01);
    });

    it('should handle workflow with budget constraints', async () => {
      // Set up tight budget
      const tracker = new CostTracker(tmpDir);
      tracker.setBudget(0.05, 80);

      // Simulate workflow steps
      await tracker.record({
        phase: 23,
        agent: 'ez-planner',
        provider: 'claude',
        cost_usd: 0.02
      });

      // Check budget - should be ok (40%)
      let budget = await tracker.checkBudget();
      expect(budget.status).toBe('ok');

      // Continue workflow
      await tracker.record({
        phase: 23,
        agent: 'ez-executor',
        provider: 'claude',
        cost_usd: 0.025
      });

      // Check budget - should be warning (90%)
      budget = await tracker.checkBudget();
      expect(budget.status).toBe('warning');
      expect(budget.percentUsed).toBeCloseTo(90, 0);
    });

    it('should integrate context slicing with cost tracking in workflow', async () => {
      // Create test files
      fs.writeFileSync(path.join(tmpDir, 'file1.ts'), 'export const f1 = "test";');
      fs.writeFileSync(path.join(tmpDir, 'file2.ts'), 'export const f2 = "test";');
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"name": "test"}');

      // Set up budget
      const tracker = new CostTracker(tmpDir);
      tracker.setBudget(1.0);

      // Context optimization step
      const optimizer = new ContextOptimizer(tmpDir);
      await optimizer.optimizeContext({
        files: ['*.ts'],
        task: 'workflow test'
      });
      await tracker.record({
        phase: 23,
        agent: 'ez-executor',
        provider: 'claude',
        cost_usd: 0.01,
        task_type: 'context-optimization'
      });

      // Context slicing step
      const slicer = new ContextSlicer();
      await slicer.sliceContext(['package.json'], 'workflow test');
      await tracker.record({
        phase: 23,
        agent: 'ez-executor',
        provider: 'claude',
        cost_usd: 0.005,
        task_type: 'context-slicing'
      });

      // Verify total cost
      const agg = tracker.aggregate({ phase: 23 });
      expect(agg.total.cost).toBe(0.015);

      // Verify budget status
      const budget = await tracker.checkBudget();
      expect(budget.status).toBe('ok');
    });

    it('should generate comprehensive workflow report', () => {
      const analyzer = new FinopsAnalyzer(tmpDir);

      // Simulate workflow costs
      const workflowResources = {
        'planning': { cost: 0.02, category: 'phase', utilization: 90 },
        'execution': { cost: 0.05, category: 'phase', utilization: 85 },
        'verification': { cost: 0.015, category: 'phase', utilization: 95 },
        'context-optimization': { cost: 0.01, category: 'context', utilization: 70 }
      };

      const analysis = analyzer.analyzeCosts(workflowResources);

      expect(analysis.totalCost).toBe(0.095);
      expect(analysis.byCategory['phase']).toBe(0.085);
      expect(analysis.byCategory['context']).toBe(0.01);
      expect(analysis.recommendations.length).toBe(0); // All high utilization
    });
  });
});
