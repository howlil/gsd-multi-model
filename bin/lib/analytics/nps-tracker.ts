/**
 * NPS Tracker — NPS survey prompt and score tracking
 * Calculates Net Promoter Score from user responses
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * NPS score category
 */
export type NpsCategory = 'promoter' | 'passive' | 'detractor';

/**
 * NPS score entry
 */
export interface NpsScoreEntry {
  /** Score value (0-10) */
  score: number;
  /** Score category */
  category: NpsCategory;
  /** Timestamp of score */
  timestamp: string;
  /** Optional metadata */
  [key: string]: unknown;
}

/**
 * NPS calculation result
 */
export interface NpsResult {
  /** Net Promoter Score (-100 to 100) */
  score: number;
  /** Number of promoters (9-10) */
  promoters: number;
  /** Number of passives (7-8) */
  passives: number;
  /** Number of detractors (0-6) */
  detractors: number;
  /** Total number of responses */
  total: number;
}

/**
 * NPS trend entry
 */
export interface NpsTrendEntry {
  /** Timestamp */
  timestamp: string;
  /** NPS score at this point */
  nps: number;
  /** Total responses at this point */
  total: number;
}

export class NpsTracker {
  private cwd: string;
  private scoresPath: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.scoresPath = path.join(this.cwd, '.planning', 'analytics', 'nps-scores.json');
    this.ensureFile();
  }

  /**
   * Record an NPS score
   * @param score - Score 0-10
   * @param metadata - Optional metadata
   */
  recordScore(score: number, metadata: Record<string, unknown> = {}): void {
    if (score < 0 || score > 10) {
      throw new Error('NPS score must be between 0 and 10');
    }

    const data: NpsScoreEntry = {
      score,
      category: this.categorizeScore(score),
      timestamp: new Date().toISOString(),
      ...metadata
    };

    const scores = this.getScores();
    scores.push(data);
    fs.writeFileSync(this.scoresPath, JSON.stringify(scores, null, 2), 'utf8');
  }

  /**
   * Calculate current NPS
   * @returns NPS result { score, promoters, passives, detractors }
   */
  calculateNPS(): NpsResult {
    const scores = this.getScores();
    if (scores.length === 0) {
      return { score: 0, promoters: 0, passives: 0, detractors: 0, total: 0 };
    }

    const promoters = scores.filter(s => s.score >= 9).length;
    const passives = scores.filter(s => s.score >= 7 && s.score <= 8).length;
    const detractors = scores.filter(s => s.score <= 6).length;
    const total = scores.length;

    const nps = Math.round(((promoters - detractors) / total) * 100);

    return { score: nps, promoters, passives, detractors, total };
  }

  /**
   * Get NPS trend over time
   * @returns Trend data
   */
  getTrend(): NpsTrendEntry[] {
    const scores = this.getScores();
    const trend: NpsTrendEntry[] = [];
    const cumulative: NpsScoreEntry[] = [];

    for (const score of scores) {
      cumulative.push(score);
      const nps = this.calculateNPSFromScores(cumulative);
      trend.push({
        timestamp: score.timestamp,
        nps: nps.score,
        total: cumulative.length
      });
    }

    return trend;
  }

  /**
   * Categorize score
   * @param score - Score 0-10
   * @returns Category
   */
  private categorizeScore(score: number): NpsCategory {
    if (score >= 9) return 'promoter';
    if (score >= 7) return 'passive';
    return 'detractor';
  }

  /**
   * Calculate NPS from array of scores
   * @param scores - Array of score objects
   * @returns NPS result
   */
  private calculateNPSFromScores(scores: NpsScoreEntry[]): NpsResult {
    const promoters = scores.filter(s => s.score >= 9).length;
    const detractors = scores.filter(s => s.score <= 6).length;
    const total = scores.length;
    return { score: Math.round(((promoters - detractors) / total) * 100), promoters, passives: 0, detractors, total };
  }

  /**
   * Get all scores
   * @returns All scores
   */
  getScores(): NpsScoreEntry[] {
    if (!fs.existsSync(this.scoresPath)) return [];
    return JSON.parse(fs.readFileSync(this.scoresPath, 'utf8'));
  }

  /**
   * Ensure scores file exists
   */
  private ensureFile(): void {
    const dir = path.dirname(this.scoresPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.scoresPath)) {
      fs.writeFileSync(this.scoresPath, '[]', 'utf8');
    }
  }
}

/**
 * Record an NPS score
 * @param score - Score 0-10
 * @param metadata - Metadata
 * @param cwd - Working directory
 */
export function recordScore(score: number, metadata: Record<string, unknown> = {}, cwd?: string): void {
  const tracker = new NpsTracker(cwd);
  return tracker.recordScore(score, metadata);
}

/**
 * Calculate current NPS
 * @param cwd - Working directory
 * @returns NPS result
 */
export function calculateNPS(cwd?: string): NpsResult {
  const tracker = new NpsTracker(cwd);
  return tracker.calculateNPS();
}
