/**
 * Perf Baseline — Save and load performance baselines
 * Stores baselines in .planning/perf-baselines/
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Baseline metadata
 */
export interface BaselineMetadata {
  /** Baseline name */
  name: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Baseline metrics structure
 */
export interface BaselineMetrics {
  /** Metric values */
  [key: string]: number | string | BaselineMetadata | undefined;
  metadata?: BaselineMetadata;
}

export class PerfBaseline {
  private cwd: string;
  private baselinesDir: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.baselinesDir = path.join(this.cwd, '.planning', 'perf-baselines');
  }

  /**
   * Save baseline metrics
   * @param metrics - Metrics to save
   * @param name - Baseline name
   * @returns Path to saved baseline
   */
  saveBaseline(metrics: Record<string, number>, name: string = 'default'): string {
    // Ensure directory exists
    if (!fs.existsSync(this.baselinesDir)) {
      fs.mkdirSync(this.baselinesDir, { recursive: true });
    }

    const baselinePath = path.join(this.baselinesDir, `${name}.json`);
    const baseline: BaselineMetrics = {
      ...metrics,
      metadata: {
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2), 'utf8');
    return baselinePath;
  }

  /**
   * Load baseline metrics
   * @param name - Baseline name
   * @returns Baseline metrics or null
   */
  loadBaseline(name: string = 'default'): BaselineMetrics | null {
    const baselinePath = path.join(this.baselinesDir, `${name}.json`);

    if (!fs.existsSync(baselinePath)) return null;

    return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  }

  /**
   * List all available baselines
   * @returns Array of baseline names
   */
  listBaselines(): string[] {
    if (!fs.existsSync(this.baselinesDir)) return [];

    return fs.readdirSync(this.baselinesDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }

  /**
   * Delete a baseline
   * @param name - Baseline name
   * @returns Success
   */
  deleteBaseline(name: string): boolean {
    const baselinePath = path.join(this.baselinesDir, `${name}.json`);

    if (!fs.existsSync(baselinePath)) return false;

    fs.unlinkSync(baselinePath);
    return true;
  }
}

/**
 * Save baseline metrics
 * @param metrics - Metrics to save
 * @param name - Baseline name
 * @returns Path to saved baseline
 */
export function saveBaseline(metrics: Record<string, number>, name: string = 'default'): string {
  const baseline = new PerfBaseline();
  return baseline.saveBaseline(metrics, name);
}

/**
 * Load baseline metrics
 * @param name - Baseline name
 * @returns Baseline metrics or null
 */
export function loadBaseline(name: string = 'default'): BaselineMetrics | null {
  const baseline = new PerfBaseline();
  return baseline.loadBaseline(name);
}
