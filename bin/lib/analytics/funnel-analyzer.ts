/**
 * Funnel Analyzer — User funnel step tracking and drop-off analysis
 * Tracks conversion through defined funnel steps
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Funnel step definition
 */
export interface FunnelStepDef {
  /** Step name */
  name: string;
  /** Step order */
  order: number;
}

/**
 * Funnel definition
 */
export interface Funnel {
  /** Funnel name */
  name: string;
  /** Funnel steps in order */
  steps: FunnelStepDef[];
  /** Creation timestamp */
  createdAt?: string;
}

/**
 * User conversion record
 */
export interface ConversionRecord {
  /** User ID */
  userId: string;
  /** Steps completed */
  steps: string[];
  /** Timestamp */
  timestamp: string;
}

/**
 * Funnel data structure
 */
export interface FunnelsData {
  /** Funnels array */
  funnels: Funnel[];
  /** Conversion records by funnel name */
  conversions: Record<string, ConversionRecord[]>;
}

/**
 * Funnel step analysis
 */
export interface FunnelStep {
  /** Step name */
  name: string;
  /** Number of users at this step */
  users: number;
  /** Conversion rate percentage */
  conversionRate?: number;
}

/**
 * Drop-off analysis between steps
 */
export interface DropOffAnalysis {
  /** From step */
  from: string;
  /** To step */
  to: string;
  /** Number of users who dropped off */
  dropOff: number;
  /** Drop-off rate percentage */
  dropOffRate: number;
}

/**
 * Funnel analysis result
 */
export interface FunnelAnalysisResult {
  /** Funnel steps with user counts */
  steps: FunnelStep[];
  /** Drop-off analysis between steps */
  dropOff: DropOffAnalysis[];
  /** Total number of users */
  totalUsers: number;
  /** Conversion rate */
  conversionRate?: number;
}

/**
 * Funnel definition input
 */
export interface FunnelDefinition {
  /** Funnel name */
  name: string;
  /** Funnel steps */
  steps: FunnelStepDef[];
}

export class FunnelAnalyzer {
  private readonly cwd: string;
  private readonly funnelsPath: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.funnelsPath = path.join(this.cwd, '.planning', 'funnels.json');
    this.ensureFile();
  }

  /**
   * Define a funnel with ordered steps
   * @param funnel - Funnel definition { name, steps }
   */
  async defineFunnel(funnel: FunnelDefinition): Promise<void> {
    const data = this.getFunnelsData();
    
    // Sort steps by order
    const sortedSteps = [...funnel.steps].sort((a, b) => a.order - b.order);
    
    const newFunnel: Funnel = {
      name: funnel.name,
      steps: sortedSteps,
      createdAt: new Date().toISOString()
    };

    data.funnels.push(newFunnel);
    if (!data.conversions[funnel.name]) {
      data.conversions[funnel.name] = [];
    }
    this.saveFunnelsData(data);
  }

  /**
   * Track user conversion through funnel
   * @param funnelName - Funnel name
   * @param userId - User ID
   * @param completedSteps - Array of step names completed
   */
  async trackConversion(funnelName: string, userId: string, completedSteps: string[]): Promise<void> {
    const data = this.getFunnelsData();
    
    if (!data.conversions[funnelName]) {
      data.conversions[funnelName] = [];
    }

    data.conversions[funnelName].push({
      userId,
      steps: completedSteps,
      timestamp: new Date().toISOString()
    });

    this.saveFunnelsData(data);
  }

  /**
   * Get conversion rates for funnel
   * @param funnelName - Funnel name
   * @returns Conversion rates by step
   */
  async getConversionRates(funnelName: string): Promise<{ funnel: string; steps: Array<{ name: string; users: number; rate: number }> }> {
    const data = this.getFunnelsData();
    const funnel = data.funnels.find(f => f.name === funnelName);
    
    if (!funnel) {
      throw new Error(`Funnel ${funnelName} not found`);
    }

    const conversions = data.conversions[funnelName] || [];
    const stepCounts: Record<string, number> = {};
    const userSteps: Record<string, Set<string>> = {};

    // Count unique users at each step
    for (const conv of conversions) {
      if (!userSteps[conv.userId]) {
        userSteps[conv.userId] = new Set();
      }
      for (const step of conv.steps) {
        userSteps[conv.userId].add(step);
      }
    }

    // Count users at each step
    for (const userStepSet of Object.values(userSteps)) {
      for (const step of userStepSet) {
        stepCounts[step] = (stepCounts[step] || 0) + 1;
      }
    }

    const totalUsers = Object.keys(userSteps).length;
    const steps: FunnelStep[] = funnel.steps.map(step => ({
      name: step.name,
      users: stepCounts[step.name] || 0,
      conversionRate: totalUsers > 0 ? Math.round(((stepCounts[step.name] || 0) / totalUsers) * 100) : 0
    }));

    const stepsWithRate = funnel.steps.map(step => ({
      name: step.name,
      users: stepCounts[step.name] || 0,
      rate: totalUsers > 0 ? Math.round(((stepCounts[step.name] || 0) / totalUsers) * 100) : 0
    }));
    
    return { funnel: funnelName, steps: stepsWithRate };
  }

  /**
   * Get drop-off points in funnel
   * @param funnelName - Funnel name
   * @returns Drop-off analysis
   */
  
  async getDropOffPoints(funnelName: string): Promise<{ points: Array<{ fromStep: string; toStep: string; dropRate: number }>; totalUsers: number }> {
    const data = this.getFunnelsData();
    const funnel = data.funnels.find(f => f.name === funnelName);
    
    if (!funnel) {
      throw new Error(`Funnel ${funnelName} not found`);
    }

    const conversions = data.conversions[funnelName] || [];
    const stepCounts: Record<string, number> = {};
    const userSteps: Record<string, Set<string>> = {};

    for (const conv of conversions) {
      if (!userSteps[conv.userId]) {
        userSteps[conv.userId] = new Set();
      }
      for (const step of conv.steps) {
        userSteps[conv.userId].add(step);
      }
    }

    for (const userStepSet of Object.values(userSteps)) {
      for (const step of userStepSet) {
        stepCounts[step] = (stepCounts[step] || 0) + 1;
      }
    }

    const totalUsers = Object.keys(userSteps).length;
    const points: Array<{ fromStep: string; toStep: string; dropRate: number }> = [];
    
    for (let i = 0; i < funnel.steps.length - 1; i++) {
      const currentStep = funnel.steps[i];
      const nextStep = funnel.steps[i + 1];
      const current = stepCounts[currentStep.name] || 0;
      const next = stepCounts[nextStep.name] || 0;
      const dropRate = current > 0 ? Math.round(((current - next) / current) * 100) : 0;
      
      points.push({
        fromStep: currentStep.name,
        toStep: nextStep.name,
        dropRate
      });
    }

    return { points, totalUsers };
  }


  /**
   * Compare multiple funnels
   * @param funnelNames - Array of funnel names to compare
   * @returns Comparative metrics
   */
  async compareFunnels(funnelNames: string[]): Promise<Record<string, { totalUsers: number; conversionRate?: number; steps: number }>> {
    const data = this.getFunnelsData();
    const result: Record<string, { totalUsers: number; conversionRate?: number; steps: number }> = {};

    for (const name of funnelNames) {
      const funnel = data.funnels.find(f => f.name === name);
      if (!funnel) continue;

      const conversions = data.conversions[name] || [];
      const uniqueUsers = new Set(conversions.map(c => c.userId));
      
      // Find users who completed all steps
      const completedAll = conversions.filter(c => c.steps.length === funnel.steps.length).length;
      
      result[name] = {
        totalUsers: uniqueUsers.size,
        conversionRate: uniqueUsers.size > 0 ? Math.round((completedAll / uniqueUsers.size) * 100) : 0,
        steps: funnel.steps.length
      };
    }

    return result;
  }

  /**
   * Get all funnels data
   * @returns Funnels data
   */
  private getFunnelsData(): FunnelsData {
    if (!fs.existsSync(this.funnelsPath)) {
      return { funnels: [], conversions: {} };
    }
    return JSON.parse(fs.readFileSync(this.funnelsPath, 'utf8'));
  }

  /**
   * Save funnels data
   * @param data - Data to save
   */
  private saveFunnelsData(data: FunnelsData): void {
    fs.writeFileSync(this.funnelsPath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Ensure funnels file exists
   */
  private ensureFile(): void {
    const dir = path.dirname(this.funnelsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.funnelsPath)) {
      fs.writeFileSync(this.funnelsPath, JSON.stringify({ funnels: [], conversions: {} }, null, 2), 'utf8');
    }
  }
}

/**
 * Define a funnel
 * @param funnel - Funnel definition
 * @param cwd - Working directory
 */
export async function defineFunnel(funnel: FunnelDefinition, cwd?: string): Promise<void> {
  const analyzer = new FunnelAnalyzer(cwd);
  return analyzer.defineFunnel(funnel);
}

/**
 * Track conversion
 * @param funnelName - Funnel name
 * @param userId - User ID
 * @param completedSteps - Completed steps
 * @param cwd - Working directory
 */
export async function trackConversion(funnelName: string, userId: string, completedSteps: string[], cwd?: string): Promise<void> {
  const analyzer = new FunnelAnalyzer(cwd);
  return analyzer.trackConversion(funnelName, userId, completedSteps);
}

/**
 * Get conversion rates
 * @param funnelName - Funnel name
 * @param cwd - Working directory
 */
export async function getConversionRates(funnelName: string, cwd?: string): Promise<{ steps: FunnelStep[]; totalUsers: number }> {
  const analyzer = new FunnelAnalyzer(cwd);
  return analyzer.getConversionRates(funnelName);
}

/**
 * Get drop-off points
 * @param funnelName - Funnel name
 * @param cwd - Working directory
 */
export async function getDropOffPoints(funnelName: string, cwd?: string): Promise<{ steps: FunnelStep[]; dropOff: DropOffAnalysis[]; totalUsers: number }> {
  const analyzer = new FunnelAnalyzer(cwd);
  return analyzer.getDropOffPoints(funnelName);
}

/**
 * Compare funnels
 * @param funnelNames - Funnel names
 * @param cwd - Working directory
 */
export async function compareFunnels(funnelNames: string[], cwd?: string): Promise<Record<string, { totalUsers: number; conversionRate?: number; steps: number }>> {
  const analyzer = new FunnelAnalyzer(cwd);
  return analyzer.compareFunnels(funnelNames);
}
