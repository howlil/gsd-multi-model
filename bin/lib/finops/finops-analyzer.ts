/**
 * FinOps Analyzer — Cloud resource cost analysis and rightsizing recommendations
 * Analyzes resource usage and provides cost optimization recommendations
 */

import fs from 'fs';
import path from 'path';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface ResourceData {
  cost?: number;
  category?: string;
  utilization?: number;
  [key: string]: unknown;
}

export interface RightsizingRecommendation {
  resource: string;
  type: string;
  reason: string;
  suggestion: string;
  potentialSavings: number;
}

export interface CostAnalysis {
  timestamp: string;
  totalCost: number;
  byResource: Record<string, number>;
  byCategory: Record<string, number>;
  recommendations: RightsizingRecommendation[];
}

export interface CostTrend {
  timestamp: string;
  [key: string]: unknown;
}

// ─── FinopsAnalyzer Class ────────────────────────────────────────────────────

export class FinopsAnalyzer {
  private cwd: string;
  private costsPath: string;

  /**
   * Create a FinopsAnalyzer instance
   * @param cwd - Working directory (defaults to process.cwd())
   */
  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.costsPath = path.join(this.cwd, '.planning', 'finops', 'costs.json');
    this.ensureFile();
  }

  /**
   * Analyze cloud resource costs
   * @param resources - Resource usage data
   * @returns Cost analysis with recommendations
   */
  analyzeCosts(resources: Record<string, ResourceData> = {}): CostAnalysis {
    const analysis: CostAnalysis = {
      timestamp: new Date().toISOString(),
      totalCost: 0,
      byResource: {},
      byCategory: {},
      recommendations: []
    };

    // Analyze each resource
    for (const [name, resource] of Object.entries(resources)) {
      const cost = resource.cost || 0;
      const category = resource.category || 'other';

      analysis.totalCost += cost;
      analysis.byResource[name] = cost;

      if (!analysis.byCategory[category]) {
        analysis.byCategory[category] = 0;
      }
      analysis.byCategory[category] += cost;

      // Generate rightsizing recommendations
      if (resource.utilization !== undefined && resource.utilization < 30) {
        analysis.recommendations.push({
          resource: name,
          type: 'rightsize',
          reason: `Low utilization (${resource.utilization}%)`,
          suggestion: 'Downsize instance or consolidate workloads',
          potentialSavings: Math.round(cost * 0.4)
        });
      }
    }

    return analysis;
  }

  /**
   * Get cost trend over time
   * @returns Cost trend data
   */
  getTrend(): CostTrend[] {
    if (!fs.existsSync(this.costsPath)) return [];
    const costs = JSON.parse(fs.readFileSync(this.costsPath, 'utf8'));
    return costs.trend || [];
  }

  /**
   * Save cost data
   * @param costData - Cost data to save
   */
  saveCostData(costData: Record<string, any>): void {
    const data = {
      timestamp: new Date().toISOString(),
      ...costData
    };

    let existing: { trend: CostTrend[] } = { trend: [] };
    if (fs.existsSync(this.costsPath)) {
      existing = JSON.parse(fs.readFileSync(this.costsPath, 'utf8'));
    }

    existing.trend.push(data);
    fs.writeFileSync(this.costsPath, JSON.stringify(existing, null, 2), 'utf8');
  }

  /**
   * Ensure costs file exists
   */
  private ensureFile(): void {
    const dir = path.dirname(this.costsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.costsPath)) {
      fs.writeFileSync(this.costsPath, '{"trend":[]}', 'utf8');
    }
  }
}

// ─── Functional Exports ──────────────────────────────────────────────────────

/**
 * Analyze cloud resource costs
 * @param resources - Resource usage data
 * @param cwd - Working directory
 * @returns Cost analysis
 */
export function analyzeCosts(resources: Record<string, ResourceData> = {}, cwd?: string): CostAnalysis {
  const analyzer = new FinopsAnalyzer(cwd);
  return analyzer.analyzeCosts(resources);
}
