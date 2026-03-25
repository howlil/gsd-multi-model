/**
 * Spot Manager — Spot/preemptible instance management recommendations
 * Analyzes workload patterns and recommends spot vs on-demand instances
 */

import fs from 'fs';
import path from 'path';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface WorkloadCharacteristics {
  faultTolerant?: boolean;
  batchProcessing?: boolean;
  stateful?: boolean;
  timeSensitive?: boolean;
  cost?: number;
  [key: string]: unknown;
}

export interface SuitabilityAnalysis {
  score: number;
  reasons: string[];
}

export interface WorkloadRecommendation {
  name: string;
  spotSuitable: boolean;
  suitabilityScore: number;
  reasons: string[];
  currentCost: number;
  potentialSavings: number;
  recommendation: string;
}

export interface SpotRecommendations {
  timestamp: string;
  workloads: WorkloadRecommendation[];
  totalPotentialSavings: number;
}

// ─── SpotManager Class ───────────────────────────────────────────────────────

export class SpotManager {
  private cwd: string;
  private recommendationsPath: string;

  /**
   * Create a SpotManager instance
   * @param cwd - Working directory (defaults to process.cwd())
   */
  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.recommendationsPath = path.join(this.cwd, '.planning', 'finops', 'spot-recommendations.json');
  }

  /**
   * Analyze workload for spot instance suitability
   * @param workload - Workload characteristics
   * @returns Spot recommendations
   */
  analyzeWorkload(workload: Record<string, WorkloadCharacteristics> = {}): SpotRecommendations {
    const recommendations: SpotRecommendations = {
      timestamp: new Date().toISOString(),
      workloads: [],
      totalPotentialSavings: 0
    };

    for (const [name, characteristics] of Object.entries(workload)) {
      const suitability = this.calculateSpotSuitability(characteristics);
      const savings = this.calculateSavings(characteristics.cost || 0, suitability.score);

      recommendations.workloads.push({
        name,
        spotSuitable: suitability.score >= 70,
        suitabilityScore: suitability.score,
        reasons: suitability.reasons,
        currentCost: characteristics.cost || 0,
        potentialSavings: savings,
        recommendation: suitability.score >= 70 ? 'Use spot instances' : 'Use on-demand'
      });

      recommendations.totalPotentialSavings += savings;
    }

    return recommendations;
  }

  /**
   * Calculate spot suitability score
   * @param characteristics - Workload characteristics
   * @returns Suitability analysis
   */
  private calculateSpotSuitability(characteristics: WorkloadCharacteristics): SuitabilityAnalysis {
    let score = 50; // Base score
    const reasons: string[] = [];

    // Fault tolerant workloads are good for spot
    if (characteristics.faultTolerant) {
      score += 30;
      reasons.push('Fault tolerant workload');
    }

    // Batch processing is good for spot
    if (characteristics.batchProcessing) {
      score += 20;
      reasons.push('Batch processing workload');
    }

    // Stateful workloads are bad for spot
    if (characteristics.stateful) {
      score -= 20;
      reasons.push('Stateful workload (checkpointing recommended)');
    }

    // Time-sensitive workloads are bad for spot
    if (characteristics.timeSensitive) {
      score -= 30;
      reasons.push('Time-sensitive workload');
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      reasons
    };
  }

  /**
   * Calculate potential savings from spot
   * @param currentCost - Current on-demand cost
   * @param suitability - Suitability score
   * @returns Potential savings
   */
  private calculateSavings(currentCost: number, suitability: number): number {
    // Spot instances typically 60-90% cheaper
    const savingsRate = 0.7;
    return Math.round(currentCost * savingsRate * (suitability / 100));
  }

  /**
   * Save recommendations
   * @param recommendations - Recommendations to save
   */
  saveRecommendations(recommendations: SpotRecommendations): void {
    fs.writeFileSync(this.recommendationsPath, JSON.stringify(recommendations, null, 2), 'utf8');
  }
}

// ─── Functional Exports ──────────────────────────────────────────────────────

/**
 * Analyze workload for spot suitability
 * @param workload - Workload characteristics
 * @param cwd - Working directory
 * @returns Spot recommendations
 */
export function analyzeWorkload(workload: Record<string, WorkloadCharacteristics> = {}, cwd?: string): SpotRecommendations {
  const manager = new SpotManager(cwd);
  return manager.analyzeWorkload(workload);
}
