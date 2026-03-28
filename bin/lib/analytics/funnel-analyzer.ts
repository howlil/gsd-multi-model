#!/usr/bin/env node
/**
 * FunnelAnalyzer - Conversion funnel tracking
 * 
 * Defines multi-step funnels, tracks user progression through steps,
 * calculates conversion rates per step, and identifies drop-off points.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Funnel step definition
 */
export interface FunnelStep {
  name: string;
  order: number;
}

/**
 * Funnel definition
 */
export interface FunnelDefinition {
  name: string;
  steps: FunnelStep[];
}

/**
 * Funnel record
 */
export interface Funnel {
  name: string;
  steps: FunnelStep[];
  createdAt: string;
}

/**
 * Conversion record
 */
export interface Conversion {
  userId: string;
  steps: string[];
  timestamp: string;
}

/**
 * Conversion rate step data
 */
export interface ConversionRateStep {
  name: string;
  users: number;
  rate: number;
}

/**
 * Conversion rates result
 */
export interface ConversionRatesResult {
  funnel: string;
  steps: ConversionRateStep[];
}

/**
 * Drop-off point data
 */
export interface DropOffPoint {
  fromStep: string;
  toStep: string;
  dropRate: number;
}

/**
 * Drop-off result
 */
export interface DropOffResult {
  points: DropOffPoint[];
  totalUsers: number;
}

/**
 * Funnel comparison metrics
 */
export interface FunnelMetrics {
  totalUsers: number;
  conversionRate: number;
  steps: ConversionRateStep[];
}

/**
 * Funnels data file structure
 */
interface FunnelsData {
  funnels: Funnel[];
  conversions: Record<string, Conversion[]>;
}

/**
 * FunnelAnalyzer class for conversion funnel analysis
 */
export class FunnelAnalyzer {
  private readonly dataPath: string;

  /**
   * Create FunnelAnalyzer instance
   * @param projectRoot - Root directory for project (default: cwd)
   */
  constructor(private readonly projectRoot: string = process.cwd()) {
    this.dataPath = path.join(this.projectRoot, '.planning', 'funnels.json');
    this.ensureFile();
  }

  /**
   * Define a new funnel
   * Creates funnel with ordered steps
   * @param funnel - Funnel definition
   */
  async defineFunnel(funnel: FunnelDefinition): Promise<void> {
    const data = this.getFunnelsData();
    
    // Sort steps by order
    const sortedSteps = [...funnel.steps].sort((a, b) => a.order - b.order);
    
    const funnelRecord: Funnel = {
      name: funnel.name,
      steps: sortedSteps,
      createdAt: new Date().toISOString()
    };

    data.funnels.push(funnelRecord);
    
    if (!data.conversions[funnel.name]) {
      data.conversions[funnel.name] = [];
    }
    
    this.saveFunnelsData(data);
  }

  /**
   * Track user conversion
   * Records user progression through funnel
   * @param funnelName - Name of funnel
   * @param userId - User ID
   * @param completedSteps - Array of completed step names
   */
  async trackConversion(funnelName: string, userId: string, completedSteps: string[]): Promise<void> {
    const data = this.getFunnelsData();
    
    if (!data.conversions[funnelName]) {
      data.conversions[funnelName] = [];
    }

    const conversion: Conversion = {
      userId,
      steps: completedSteps,
      timestamp: new Date().toISOString()
    };

    data.conversions[funnelName].push(conversion);
    this.saveFunnelsData(data);
  }

  /**
   * Get conversion rates
   * Returns percentage at each step
   * @param funnelName - Name of funnel
   * @returns Conversion rates result
   */
  async getConversionRates(funnelName: string): Promise<ConversionRatesResult> {
    const data = this.getFunnelsData();
    const funnel = data.funnels.find(f => f.name === funnelName);
    
    if (!funnel) {
      return { funnel: funnelName, steps: [] };
    }

    const conversions = data.conversions[funnelName] || [];
    const totalUsers = new Set(conversions.map(c => c.userId)).size;

    const steps: ConversionRateStep[] = funnel.steps.map(step => {
      const usersAtStep = new Set(
        conversions
          .filter(c => c.steps.includes(step.name))
          .map(c => c.userId)
      ).size;

      return {
        name: step.name,
        users: usersAtStep,
        rate: totalUsers > 0 ? Math.round((usersAtStep / totalUsers) * 100) : 0
      };
    });

    return { funnel: funnelName, steps };
  }

  /**
   * Get drop-off points
   * Identifies biggest conversion losses between steps
   * @param funnelName - Name of funnel
   * @returns Drop-off result
   */
  async getDropOffPoints(funnelName: string): Promise<DropOffResult> {
    const data = this.getFunnelsData();
    const funnel = data.funnels.find(f => f.name === funnelName);
    
    if (!funnel) {
      return { points: [], totalUsers: 0 };
    }

    const conversions = data.conversions[funnelName] || [];
    const totalUsers = new Set(conversions.map(c => c.userId)).size;

    // Get user counts per step
    const stepCounts = funnel.steps.map(step => {
      const usersAtStep = new Set(
        conversions
          .filter(c => c.steps.includes(step.name))
          .map(c => c.userId)
      ).size;
      return { name: step.name, users: usersAtStep };
    });

    // Calculate drop-off between consecutive steps
    const points: DropOffPoint[] = [];
    for (let i = 0; i < stepCounts.length - 1; i++) {
      const current = stepCounts[i];
      const next = stepCounts[i + 1];
      
      if (current.users > 0 && next.users < current.users) {
        const dropRate = Math.round(((current.users - next.users) / current.users) * 100);
        points.push({
          fromStep: current.name,
          toStep: next.name,
          dropRate
        });
      }
    }

    return { points, totalUsers };
  }

  /**
   * Compare funnels
   * Returns comparative metrics between funnels
   * @param funnelNames - Array of funnel names to compare
   * @returns Object with metrics per funnel
   */
  async compareFunnels(funnelNames: string[]): Promise<Record<string, FunnelMetrics>> {
    const result: Record<string, FunnelMetrics> = {};

    for (const name of funnelNames) {
      const rates = await this.getConversionRates(name);
      const data = this.getFunnelsData();
      const funnel = data.funnels.find(f => f.name === name);
      const conversions = data.conversions[name] || [];
      
      const totalUsers = new Set(conversions.map(c => c.userId)).size;
      
      // Calculate conversion rate (users who completed all steps)
      let completedAll = 0;
      if (funnel) {
        const allStepNames = funnel.steps.map(s => s.name);
        completedAll = conversions.filter(c => 
          allStepNames.every(step => c.steps.includes(step))
        ).length;
      }
      const conversionRate = totalUsers > 0 ? Math.round((completedAll / totalUsers) * 100) : 0;

      result[name] = {
        totalUsers,
        conversionRate,
        steps: rates.steps
      };
    }

    return result;
  }

  /**
   * Get funnels data from file
   * @returns Funnels data object
   */
  private getFunnelsData(): FunnelsData {
    if (!fs.existsSync(this.dataPath)) {
      return { funnels: [], conversions: {} };
    }
    const content = fs.readFileSync(this.dataPath, 'utf8');
    return JSON.parse(content) as FunnelsData;
  }

  /**
   * Save funnels data to file
   * @param data - Funnels data to save
   */
  private saveFunnelsData(data: FunnelsData): void {
    const dir = path.dirname(this.dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Ensure funnels data file exists
   */
  private ensureFile(): void {
    const dir = path.dirname(this.dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.dataPath)) {
      fs.writeFileSync(this.dataPath, JSON.stringify({ funnels: [], conversions: {} }, null, 2), 'utf8');
    }
  }
}
