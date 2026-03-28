/**
 * Phase 20: FinOps Implementation Tests
 * 
 * Tests for FINOPS-01 to FINOPS-07:
 * - FINOPS-01: Cost tracker recording and aggregation
 * - FINOPS-02: Budget manager with ceiling enforcement
 * - FINOPS-03: Cost forecasting based on trends
 * - FINOPS-04: Cost optimization recommendations
 * - FINOPS-05: Spot instance management
 * - FINOPS-06: Multi-provider cost comparison
 * - FINOPS-07: Budget alerts and notifications
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createTempProject, cleanup } from '../helpers.js';

import CostTracker from '../../bin/lib/cost/cost-tracker.js';
import CostAlerts, { THRESHOLDS } from '../../bin/lib/cost/cost-alerts.js';
import { FinopsAnalyzer } from '../../bin/lib/finops/finops-analyzer.js';
import { CostReporter } from '../../bin/lib/finops/cost-reporter.js';
import { BudgetEnforcer } from '../../bin/lib/finops/budget-enforcer.js';
import { SpotManager } from '../../bin/lib/finops/spot-manager.js';

describe('Phase 20: FinOps Implementation Tests', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  /**
   * FINOPS-01: Cost Tracker Recording and Aggregation
   * Verify cost entries can be recorded and aggregated by phase, provider, and agent
   */
  describe('FINOPS-01: Cost Tracker Recording', () => {
    it('should record cost entry with all required fields', async () => {
      const tracker = new CostTracker(tmpDir);
      
      await tracker.record({
        phase: 20,
        agent: 'ez-planner',
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        input_tokens: 1000,
        output_tokens: 500,
        cost_usd: 0.0105,
        task_type: 'planning'
      });

      const agg = tracker.aggregate({ phase: 20 });
      expect(agg.total.cost).toBe(0.0105);
      expect(agg.total.tokens).toBe(1500);
    });

    it('should aggregate costs by phase', async () => {
      const tracker = new CostTracker(tmpDir);

      await tracker.record({
        phase: 20,
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        input_tokens: 1000,
        output_tokens: 500,
        cost_usd: 0.01
      });

      await tracker.record({
        phase: 20,
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        input_tokens: 2000,
        output_tokens: 1000,
        cost_usd: 0.02
      });

      await tracker.record({
        phase: 21,
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        input_tokens: 500,
        output_tokens: 250,
        cost_usd: 0.005
      });

      const aggPhase20 = tracker.aggregate({ phase: 20 });
      expect(aggPhase20.total.cost).toBe(0.03);
      expect(aggPhase20.total.tokens).toBe(4500);

      const aggAll = tracker.aggregate();
      expect(aggAll.total.cost).toBeCloseTo(0.035, 3);
    });

    it('should aggregate costs by provider', async () => {
      const tracker = new CostTracker(tmpDir);

      await tracker.record({
        phase: 20,
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        cost_usd: 0.01
      });

      await tracker.record({
        phase: 20,
        provider: 'openai',
        model: 'gpt-4',
        cost_usd: 0.02
      });

      const agg = tracker.aggregate();
      expect(agg.by_provider['claude']?.cost).toBe(0.01);
      expect(agg.by_provider['openai']?.cost).toBe(0.02);
    });

    it('should aggregate costs by agent', async () => {
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

      const agg = tracker.aggregate({ phase: 20, by_agent: true });
      expect(agg.by_agent).toBeDefined();
      expect(agg.by_agent?.['ez-planner']?.cost).toBe(0.01);
      expect(agg.by_agent?.['ez-executor']?.cost).toBe(0.02);
    });

    it('should compute cost_usd from tokens if not provided', async () => {
      const tracker = new CostTracker(tmpDir);

      await tracker.record({
        phase: 20,
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        input_tokens: 1000,
        output_tokens: 500
      });

      const agg = tracker.aggregate({ phase: 20 });
      // Rate: input 0.003, output 0.015 per 1000 tokens
      // Cost: (1000 * 0.003 + 500 * 0.015) / 1000 = 0.0105
      expect(agg.total.cost).toBeCloseTo(0.0105, 4);
    });
  });

  /**
   * FINOPS-02: Budget Manager with Ceiling Enforcement
   * Verify budget ceiling can be set and enforced
   */
  describe('FINOPS-02: Budget Manager', () => {
    it('should set budget ceiling in config', () => {
      const tracker = new CostTracker(tmpDir);
      tracker.setBudget(100.0, 80);

      const configPath = path.join(tmpDir, '.planning', 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      expect(config.cost_tracking?.budget).toBe(100.0);
      expect(config.cost_tracking?.warning_threshold).toBe(80);
    });

    it('should check budget status correctly', async () => {
      const tracker = new CostTracker(tmpDir);
      tracker.setBudget(100.0);

      await tracker.record({
        phase: 20,
        provider: 'claude',
        cost_usd: 50.0
      });

      const result = await tracker.checkBudget();
      expect(result.status).toBe('ok');
      expect(result.percentUsed).toBe(50);
    });

    it('should return warning status when approaching budget', async () => {
      const tracker = new CostTracker(tmpDir);
      tracker.setBudget(100.0, 80);

      await tracker.record({
        phase: 20,
        provider: 'claude',
        cost_usd: 85.0
      });

      const result = await tracker.checkBudget();
      expect(result.status).toBe('warning');
      expect(result.percentUsed).toBe(85);
    });

    it('should return exceeded status when over budget', async () => {
      const tracker = new CostTracker(tmpDir);
      tracker.setBudget(100.0);

      await tracker.record({
        phase: 20,
        provider: 'claude',
        cost_usd: 120.0
      });

      const result = await tracker.checkBudget();
      expect(result.status).toBe('exceeded');
      expect(result.percentUsed).toBe(120);
    });

    it('should use BudgetEnforcer for enforcement', () => {
      const enforcer = new BudgetEnforcer(tmpDir);
      
      // Set up config
      const configPath = path.join(tmpDir, '.planning', 'config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({
        cost_tracking: {
          budget: { ceiling: 100 },
          warning_threshold: 80,
          auto_pause: false
        }
      }));

      const status = enforcer.checkBudget(50);
      expect(status.ok).toBe(true);
      expect(status.exceeded).toBe(false);
    });
  });

  /**
   * FINOPS-03: Cost Forecasting Based on Trends
   * Verify cost trends can be analyzed and forecasted
   */
  describe('FINOPS-03: Cost Forecasting', () => {
    it('should analyze costs and generate trend data', () => {
      const analyzer = new FinopsAnalyzer(tmpDir);
      
      const resources = {
        'compute-1': { cost: 50, category: 'compute', utilization: 75 },
        'compute-2': { cost: 30, category: 'compute', utilization: 40 },
        'storage-1': { cost: 20, category: 'storage', utilization: 60 }
      };

      const analysis = analyzer.analyzeCosts(resources);
      
      expect(analysis.totalCost).toBe(100);
      expect(analysis.byCategory['compute']).toBe(80);
      expect(analysis.byCategory['storage']).toBe(20);
      expect(analysis.timestamp).toBeDefined();
    });

    it('should save and retrieve cost trend data', () => {
      const analyzer = new FinopsAnalyzer(tmpDir);
      
      const costData = {
        totalCost: 150,
        byResource: { 'resource-1': 100, 'resource-2': 50 }
      };

      analyzer.saveCostData(costData);
      
      const trend = analyzer.getTrend();
      expect(trend.length).toBe(1);
      expect(trend[0].totalCost).toBe(150);
    });

    it('should track multiple trend entries over time', () => {
      const analyzer = new FinopsAnalyzer(tmpDir);
      
      analyzer.saveCostData({ totalCost: 100 });
      analyzer.saveCostData({ totalCost: 150 });
      analyzer.saveCostData({ totalCost: 200 });
      
      const trend = analyzer.getTrend();
      expect(trend.length).toBe(3);
      expect(trend[0].totalCost).toBe(100);
      expect(trend[2].totalCost).toBe(200);
    });
  });

  /**
   * FINOPS-04: Cost Optimization Recommendations
   * Verify optimization recommendations are generated
   */
  describe('FINOPS-04: Cost Optimization', () => {
    it('should generate rightsizing recommendations for underutilized resources', () => {
      const analyzer = new FinopsAnalyzer(tmpDir);
      
      const resources = {
        'overprovisioned-vm': { 
          cost: 100, 
          category: 'compute', 
          utilization: 20  // Low utilization triggers recommendation
        },
        'efficient-vm': { 
          cost: 50, 
          category: 'compute', 
          utilization: 80 
        }
      };

      const analysis = analyzer.analyzeCosts(resources);
      
      expect(analysis.recommendations.length).toBe(1);
      expect(analysis.recommendations[0].resource).toBe('overprovisioned-vm');
      expect(analysis.recommendations[0].type).toBe('rightsize');
      expect(analysis.recommendations[0].potentialSavings).toBe(40); // 40% of 100
    });

    it('should generate cost reporter recommendations', () => {
      const reporter = new CostReporter(tmpDir);
      
      // Create metrics file with high-cost phases
      const metricsPath = path.join(tmpDir, '.planning', 'metrics.json');
      fs.mkdirSync(path.dirname(metricsPath), { recursive: true });
      fs.writeFileSync(metricsPath, JSON.stringify({
        version: '1.0',
        entries: [
          { phase: 20, provider: 'claude', cost_usd: 15, input_tokens: 1000, output_tokens: 500 },
          { phase: 21, provider: 'openai', cost_usd: 8, input_tokens: 500, output_tokens: 250 }
        ]
      }));

      const report = reporter.generateReport();
      
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.category === 'phase')).toBe(true);
    });

    it('should identify high-cost phases in recommendations', () => {
      const reporter = new CostReporter(tmpDir);
      
      const metricsPath = path.join(tmpDir, '.planning', 'metrics.json');
      fs.mkdirSync(path.dirname(metricsPath), { recursive: true });
      fs.writeFileSync(metricsPath, JSON.stringify({
        version: '1.0',
        entries: [
          { phase: 'expensive-phase', provider: 'claude', cost_usd: 25 }
        ]
      }));

      const report = reporter.generateReport();
      
      const phaseRecommendation = report.recommendations.find(r => r.phase === 'expensive-phase');
      expect(phaseRecommendation).toBeDefined();
      expect(phaseRecommendation?.suggestion).toContain('High cost');
    });
  });

  /**
   * FINOPS-05: Spot Instance Management
   * Verify spot instance suitability analysis
   */
  describe('FINOPS-05: Spot Instance Management', () => {
    it('should analyze workload for spot suitability', () => {
      const manager = new SpotManager(tmpDir);
      
      const workloads = {
        'batch-job': {
          faultTolerant: true,
          batchProcessing: true,
          stateful: false,
          timeSensitive: false,
          cost: 100
        },
        'critical-service': {
          faultTolerant: false,
          batchProcessing: false,
          stateful: true,
          timeSensitive: true,
          cost: 200
        }
      };

      const recommendations = manager.analyzeWorkload(workloads);
      
      expect(recommendations.workloads.length).toBe(2);
      
      const batchJob = recommendations.workloads.find(w => w.name === 'batch-job');
      expect(batchJob?.spotSuitable).toBe(true);
      expect(batchJob?.suitabilityScore).toBeGreaterThanOrEqual(70);
      
      const criticalService = recommendations.workloads.find(w => w.name === 'critical-service');
      expect(criticalService?.spotSuitable).toBe(false);
      expect(criticalService?.suitabilityScore).toBeLessThan(70);
    });

    it('should calculate potential savings from spot instances', () => {
      const manager = new SpotManager(tmpDir);
      
      const workloads = {
        'spot-candidate': {
          faultTolerant: true,
          batchProcessing: true,
          cost: 100
        }
      };

      const recommendations = manager.analyzeWorkload(workloads);
      
      expect(recommendations.totalPotentialSavings).toBeGreaterThan(0);
      // 70% savings rate * 100% suitability = 70
      expect(recommendations.totalPotentialSavings).toBe(70);
    });

    it('should save spot recommendations to file', () => {
      const manager = new SpotManager(tmpDir);
      
      const recommendations = {
        timestamp: new Date().toISOString(),
        workloads: [{
          name: 'test-workload',
          spotSuitable: true,
          suitabilityScore: 80,
          reasons: ['Fault tolerant'],
          currentCost: 100,
          potentialSavings: 70,
          recommendation: 'Use spot instances'
        }],
        totalPotentialSavings: 70
      };

      manager.saveRecommendations(recommendations);
      
      const recommendationsPath = path.join(tmpDir, '.planning', 'finops', 'spot-recommendations.json');
      expect(fs.existsSync(recommendationsPath)).toBe(true);
      
      const saved = JSON.parse(fs.readFileSync(recommendationsPath, 'utf8'));
      expect(saved.workloads.length).toBe(1);
    });
  });

  /**
   * FINOPS-06: Multi-Provider Cost Comparison
   * Verify costs can be tracked and compared across providers
   */
  describe('FINOPS-06: Multi-Provider Comparison', () => {
    it('should track costs from multiple providers', async () => {
      const tracker = new CostTracker(tmpDir);

      await tracker.record({
        phase: 20,
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        cost_usd: 0.01
      });

      await tracker.record({
        phase: 20,
        provider: 'openai',
        model: 'gpt-4',
        cost_usd: 0.03
      });

      await tracker.record({
        phase: 20,
        provider: 'qwen',
        model: 'qwen-max',
        cost_usd: 0.005
      });

      const agg = tracker.aggregate();
      
      expect(agg.by_provider['claude']?.cost).toBe(0.01);
      expect(agg.by_provider['openai']?.cost).toBe(0.03);
      expect(agg.by_provider['qwen']?.cost).toBe(0.005);
    });

    it('should compare provider costs in report', () => {
      const reporter = new CostReporter(tmpDir);
      
      const metricsPath = path.join(tmpDir, '.planning', 'metrics.json');
      fs.mkdirSync(path.dirname(metricsPath), { recursive: true });
      fs.writeFileSync(metricsPath, JSON.stringify({
        version: '1.0',
        entries: [
          { provider: 'claude', cost_usd: 10 },
          { provider: 'openai', cost_usd: 15 },
          { provider: 'qwen', cost_usd: 3 }
        ]
      }));

      const report = reporter.generateReport();
      
      expect(report.byProvider['claude']?.cost).toBe(10);
      expect(report.byProvider['openai']?.cost).toBe(15);
      expect(report.byProvider['qwen']?.cost).toBe(3);
    });

    it('should generate provider-specific recommendations', () => {
      const reporter = new CostReporter(tmpDir);
      
      const metricsPath = path.join(tmpDir, '.planning', 'metrics.json');
      fs.mkdirSync(path.dirname(metricsPath), { recursive: true });
      fs.writeFileSync(metricsPath, JSON.stringify({
        version: '1.0',
        entries: [
          { provider: 'expensive-provider', cost_usd: 50 }
        ]
      }));

      const report = reporter.generateReport();
      
      const providerRec = report.recommendations.find(r => r.provider === 'expensive-provider');
      expect(providerRec).toBeDefined();
      expect(providerRec?.suggestion).toContain('alternative');
    });
  });

  /**
   * FINOPS-07: Budget Alerts and Notifications
   * Verify alerts are triggered at correct thresholds
   */
  describe('FINOPS-07: Budget Alerts', () => {
    it('should trigger info alert at 50% threshold', () => {
      const alerts = new CostAlerts(tmpDir);
      
      const triggered = alerts.checkThresholds({
        percentUsed: 50,
        totalSpent: 50,
        budget: 100
      });
      
      expect(triggered.length).toBe(1);
      expect(triggered[0].threshold).toBe(THRESHOLDS.INFO);
      expect(triggered[0].level).toBe('info');
    });

    it('should trigger warning alert at 75% threshold', () => {
      const alerts = new CostAlerts(tmpDir);
      
      const triggered = alerts.checkThresholds({
        percentUsed: 75,
        totalSpent: 75,
        budget: 100
      });
      
      expect(triggered.length).toBe(2);
      expect(triggered.some(a => a.threshold === THRESHOLDS.WARNING)).toBe(true);
    });

    it('should trigger critical alert at 90% threshold', () => {
      const alerts = new CostAlerts(tmpDir);
      
      const triggered = alerts.checkThresholds({
        percentUsed: 90,
        totalSpent: 90,
        budget: 100
      });
      
      expect(triggered.length).toBe(3);
      expect(triggered.some(a => a.threshold === THRESHOLDS.CRITICAL)).toBe(true);
    });

    it('should prevent duplicate alerts within 24h window', async () => {
      const alerts = new CostAlerts(tmpDir);
      
      const alert = {
        threshold: 50,
        level: 'info',
        percentUsed: 50,
        totalSpent: 50,
        budget: 100,
        message: 'Test alert',
        timestamp: new Date().toISOString()
      };

      await alerts.logAlert(alert);
      await alerts.logAlert(alert); // Try to log same alert
      
      const loggedAlerts = alerts.getAlerts();
      expect(loggedAlerts.length).toBe(1);
    });

    it('should allow different threshold alerts', async () => {
      const alerts = new CostAlerts(tmpDir);

      await alerts.logAlert({
        threshold: 50,
        level: 'info',
        percentUsed: 50,
        totalSpent: 50,
        budget: 100,
        message: '50% alert',
        timestamp: new Date().toISOString()
      });

      await alerts.logAlert({
        threshold: 75,
        level: 'warning',
        percentUsed: 75,
        totalSpent: 75,
        budget: 100,
        message: '75% alert',
        timestamp: new Date().toISOString()
      });

      const loggedAlerts = alerts.getAlerts();
      expect(loggedAlerts.length).toBe(2);
    });

    it('should integrate alerts with budget check', async () => {
      const tracker = new CostTracker(tmpDir);
      tracker.setBudget(100.0);

      await tracker.record({
        phase: 20,
        provider: 'claude',
        cost_usd: 75.0
      });

      const result = await tracker.checkBudget();
      
      expect(result.alerts).toBeDefined();
      expect(result.alerts?.length).toBeGreaterThan(0);
    });
  });
});
