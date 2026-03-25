/**
 * Regression Detector — Baseline comparison and regression flagging
 * Flags >10% degradation with severity levels
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Regression finding
 */
export interface RegressionFinding {
  /** Metric name */
  metric: string;
  /** Current value */
  current: number;
  /** Baseline value */
  baseline: number;
  /** Change percentage */
  changePercent: number;
  /** Severity level */
  severity: 'critical' | 'high' | 'medium';
}

/**
 * Baseline metadata
 */
interface BaselineMetadata {
  /** Baseline name */
  name: string;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Baseline metrics structure
 */
interface BaselineMetrics {
  /** Metric values */
  [key: string]: number | BaselineMetadata;
  metadata?: BaselineMetadata;
}

export class RegressionDetector {
  /**
   * Detect regressions by comparing current metrics against baseline
   * @param current - Current metrics
   * @param baseline - Baseline metrics
   * @param threshold - Regression threshold percentage (default: 10)
   * @returns Array of regression findings
   */
  detectRegressions(current: Record<string, number>, baseline: Record<string, number>, threshold: number = 10): RegressionFinding[] {
    const regressions: RegressionFinding[] = [];

    for (const [metric, currentValue] of Object.entries(current)) {
      const baselineValue = baseline[metric];
      if (baselineValue === undefined || baselineValue === 0) continue;

      const change = ((currentValue - baselineValue) / baselineValue) * 100;

      if (change > threshold) {
        regressions.push({
          metric,
          current: currentValue,
          baseline: baselineValue,
          changePercent: Math.round(change * 100) / 100,
          severity: change > 50 ? 'critical' : change > 20 ? 'high' : 'medium'
        });
      }
    }

    return regressions;
  }

  /**
   * Save baseline metrics
   * @param metrics - Metrics to save
   * @param name - Baseline name
   * @param cwd - Working directory
   */
  saveBaseline(metrics: Record<string, number>, name: string = 'default', cwd?: string): void {
    const baselinePath = path.join(cwd || process.cwd(), '.planning', 'perf-baselines', `${name}.json`);

    // Ensure directory exists
    const dir = path.dirname(baselinePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const baseline: BaselineMetrics = {
      ...metrics,
      metadata: {
        name,
        createdAt: new Date().toISOString()
      }
    };

    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
  }

  /**
   * Load baseline metrics
   * @param name - Baseline name
   * @param cwd - Working directory
   * @returns Baseline metrics or null
   */
  loadBaseline(name: string = 'default', cwd?: string): BaselineMetrics | null {
    const baselinePath = path.join(cwd || process.cwd(), '.planning', 'perf-baselines', `${name}.json`);

    if (!fs.existsSync(baselinePath)) return null;

    return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  }
}

/**
 * Detect regressions by comparing current metrics against baseline
 * @param current - Current metrics
 * @param baseline - Baseline metrics
 * @param threshold - Regression threshold percentage (default: 10)
 * @returns Array of regression findings
 */
export function detectRegressions(current: Record<string, number>, baseline: Record<string, number>, threshold: number = 10): RegressionFinding[] {
  const detector = new RegressionDetector();
  return detector.detectRegressions(current, baseline, threshold);
}
