/**
 * Funnel Analyzer — User funnel step tracking and drop-off analysis
 * Tracks conversion through defined funnel steps
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Funnel step tracking entry
 */
interface StepEntry {
  /** Step name */
  step: string;
  /** Timestamp of step completion */
  timestamp: string;
}

/**
 * Funnel data structure
 */
interface FunnelData {
  /** Funnel steps in order */
  steps: string[];
  /** User progressions */
  users: Record<string, StepEntry[]>;
}

/**
 * Funnel step analysis
 */
export interface FunnelStep {
  /** Step name */
  name: string;
  /** Number of users at this step */
  users: number;
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
}

export class FunnelAnalyzer {
  private cwd: string;
  private funnelPath: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.funnelPath = path.join(this.cwd, '.planning', 'analytics', 'funnels.json');
    this.ensureFile();
  }

  /**
   * Track user progression through funnel step
   * @param funnelName - Funnel name
   * @param userId - User ID
   * @param step - Current step name
   */
  trackStep(funnelName: string, userId: string, step: string): void {
    const funnels = this.getFunnels();

    if (!funnels[funnelName]) {
      funnels[funnelName] = { steps: [], users: {} };
    }

    const funnel = funnels[funnelName];
    if (!funnel) return;

    // Add step if new
    if (!funnel.steps.includes(step)) {
      funnel.steps.push(step);
    }

    // Track user progression
    if (!funnel.users[userId]) {
      funnel.users[userId] = [];
    }
    const userProgress = funnel.users[userId];
    if (userProgress) {
      userProgress.push({ step, timestamp: new Date().toISOString() });
    }

    this.saveFunnels(funnels);
  }

  /**
   * Analyze funnel conversion
   * @param funnelName - Funnel name
   * @returns Funnel analysis { steps, dropOff }
   */
  analyzeFunnel(funnelName: string): FunnelAnalysisResult {
    const funnels = this.getFunnels();
    const funnel = funnels[funnelName] as FunnelData;

    if (!funnel || funnel.steps.length === 0) {
      return { steps: [], dropOff: [], totalUsers: 0 };
    }

    const stepCounts: Record<string, number> = {};
    const userSteps: Record<string, number> = {};

    // Count users at each step
    for (const [userId, steps] of Object.entries(funnel.users)) {
      const uniqueSteps = Array.from(new Set(steps.map(s => s.step)));
      for (const step of uniqueSteps) {
        stepCounts[step] = (stepCounts[step] || 0) + 1;
      }
      userSteps[userId] = uniqueSteps.length;
    }

    // Calculate drop-off between steps
    const dropOff: DropOffAnalysis[] = [];
    for (let i = 0; i < funnel.steps.length - 1; i++) {
      const currentStep = funnel.steps[i];
      const nextStep = funnel.steps[i + 1];
      if (!currentStep || !nextStep) continue;
      const current = stepCounts[currentStep] || 0;
      const next = stepCounts[nextStep] || 0;
      dropOff.push({
        from: currentStep,
        to: nextStep,
        dropOff: current - next,
        dropOffRate: current > 0 ? Math.round(((current - next) / current) * 100) : 0
      });
    }

    return {
      steps: funnel.steps.map(step => ({
        name: step,
        users: stepCounts[step] || 0
      })),
      dropOff,
      totalUsers: Object.keys(funnel.users).length
    };
  }

  /**
   * Get all funnels
   * @returns All funnels
   */
  getFunnels(): Record<string, FunnelData> {
    if (!fs.existsSync(this.funnelPath)) return {};
    return JSON.parse(fs.readFileSync(this.funnelPath, 'utf8'));
  }

  /**
   * Save funnels
   * @param funnels - Funnels to save
   */
  private saveFunnels(funnels: Record<string, FunnelData>): void {
    fs.writeFileSync(this.funnelPath, JSON.stringify(funnels, null, 2), 'utf8');
  }

  /**
   * Ensure funnels file exists
   */
  private ensureFile(): void {
    const dir = path.dirname(this.funnelPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.funnelPath)) {
      fs.writeFileSync(this.funnelPath, '{}', 'utf8');
    }
  }
}

/**
 * Track funnel step
 * @param funnelName - Funnel name
 * @param userId - User ID
 * @param step - Step name
 * @param cwd - Working directory
 */
export function trackStep(funnelName: string, userId: string, step: string, cwd?: string): void {
  const analyzer = new FunnelAnalyzer(cwd);
  return analyzer.trackStep(funnelName, userId, step);
}

/**
 * Analyze funnel
 * @param funnelName - Funnel name
 * @param cwd - Working directory
 * @returns Funnel analysis
 */
export function analyzeFunnel(funnelName: string, cwd?: string): FunnelAnalysisResult {
  const analyzer = new FunnelAnalyzer(cwd);
  return analyzer.analyzeFunnel(funnelName);
}
