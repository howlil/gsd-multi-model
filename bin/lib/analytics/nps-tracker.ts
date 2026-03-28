#!/usr/bin/env node
/**
 * NPSTracker - Net Promoter Score tracking for user satisfaction measurement
 * 
 * Records user feedback scores (0-10), categorizes responses,
 * calculates NPS metric, and tracks trends over time.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * NPS response categories
 */
export type NpsCategory = 'promoter' | 'passive' | 'detractor';

/**
 * NPS response data structure
 */
export interface NpsResponse {
  userId?: string;
  score: number;
  feedback?: string;
  category?: NpsCategory;
  timestamp?: string | number;
  [key: string]: unknown;
}

/**
 * NPS result with score breakdown
 */
export interface NpsResult {
  nps: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  totalResponses: number;
}

/**
 * Trend period data
 */
export interface TrendPeriod {
  period: string;
  nps: number;
  startDate: string;
  endDate: string;
}

/**
 * Trend options for configuration
 */
export interface TrendOptions {
  periods?: number;
  periodType?: 'day' | 'week' | 'month';
}

/**
 * NPS trend result
 */
export interface NpsTrend {
  periods: TrendPeriod[];
  direction: 'improving' | 'declining' | 'stable';
}

/**
 * NPS data file structure
 */
interface NpsData {
  responses: NpsResponse[];
}

/**
 * NPSTracker class for tracking Net Promoter Score
 */
export class NPSTracker {
  private readonly npsPath: string;

  /**
   * Create NPSTracker instance
   * @param projectRoot - Root directory for project (default: cwd)
   */
  constructor(private readonly projectRoot: string = process.cwd()) {
    this.npsPath = path.join(this.projectRoot, '.planning', 'nps.json');
    this.ensureFile();
  }

  /**
   * Record an NPS response
   * Validates score, categorizes response, and persists to file
   * @param response - NPS response with score (0-10)
   */
  async recordResponse(response: NpsResponse): Promise<void> {
    // Validate score range
    if (response.score < 0 || response.score > 10) {
      throw new Error('NPS score must be between 0 and 10');
    }

    // Categorize response
    const category = this.categorizeScore(response.score);
    
    // Create response record with timestamp
    const record: NpsResponse = {
      ...response,
      category,
      timestamp: response.timestamp ?? new Date().toISOString()
    };

    // Get existing data and append
    const data = this.getNpsData();
    data.responses.push(record);
    this.saveNpsData(data);
  }

  /**
   * Calculate NPS score
   * NPS = %promoters - %detractors (rounded to integer)
   * @returns NPS result with breakdown
   */
  calculateScore(): NpsResult {
    const data = this.getNpsData();
    const responses = data.responses;

    const promoters = responses.filter(r => r.category === 'promoter').length;
    const passives = responses.filter(r => r.category === 'passive').length;
    const detractors = responses.filter(r => r.category === 'detractor').length;
    const total = responses.length;

    const promoterPct = total > 0 ? (promoters / total) * 100 : 0;
    const detractorPct = total > 0 ? (detractors / total) * 100 : 0;
    const nps = Math.round(promoterPct - detractorPct);

    return {
      nps,
      promoters,
      passives,
      detractors,
      total,
      totalResponses: total
    };
  }

  /**
   * Get NPS trend over time periods
   * @param options - Trend configuration options
   * @returns Trend data with periods and direction
   */
  getTrendWithOptions(options?: TrendOptions): NpsTrend {
    const periodType = options?.periodType ?? 'week';
    const numPeriods = options?.periods ?? 4;
    
    const data = this.getNpsData();
    const responses = data.responses;

    if (responses.length === 0) {
      return { periods: [], direction: 'stable' };
    }

    // Sort responses by timestamp
    const sorted = [...responses].sort((a, b) => {
      const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : (a.timestamp ?? 0);
      const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : (b.timestamp ?? 0);
      return timeA - timeB;
    });

    // Calculate period duration in ms
    const periodMs = this.getPeriodDuration(periodType);
    const now = Date.now();
    const periods: TrendPeriod[] = [];

    // Group responses by period
    for (let i = 0; i < numPeriods; i++) {
      const periodEnd = now - (i * periodMs);
      const periodStart = periodEnd - periodMs;
      
      const periodResponses = sorted.filter(r => {
        const time = typeof r.timestamp === 'string' ? new Date(r.timestamp).getTime() : (r.timestamp ?? 0);
        return time >= periodStart && time < periodEnd;
      });

      const promoters = periodResponses.filter(r => r.category === 'promoter').length;
      const detractors = periodResponses.filter(r => r.category === 'detractor').length;
      const total = periodResponses.length;

      const nps = total > 0 ? Math.round((promoters / total) * 100 - (detractors / total) * 100) : 0;

      periods.unshift({
        period: `${periodType}_${i + 1}`,
        nps,
        startDate: new Date(periodStart).toISOString(),
        endDate: new Date(periodEnd).toISOString()
      });
    }

    // Determine trend direction
    const direction = this.determineTrendDirection(periods);

    return { periods, direction };
  }

  /**
   * Categorize score into promoter/passive/detractor
   * @param score - NPS score (0-10)
   * @returns Category string
   */
  private categorizeScore(score: number): NpsCategory {
    if (score >= 9) return 'promoter';
    if (score >= 7) return 'passive';
    return 'detractor';
  }

  /**
   * Determine trend direction from periods
   * @param periods - Array of trend periods
   * @returns Trend direction
   */
  private determineTrendDirection(periods: TrendPeriod[]): 'improving' | 'declining' | 'stable' {
    if (periods.length < 2) return 'stable';

    const firstNps = periods[0]?.nps ?? 0;
    const lastNps = periods[periods.length - 1]?.nps ?? 0;
    const diff = lastNps - firstNps;

    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }

  /**
   * Get period duration in milliseconds
   * @param periodType - Type of period
   * @returns Duration in ms
   */
  private getPeriodDuration(periodType: string): number {
    switch (periodType) {
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Get NPS data from file
   * @returns NPS data object
   */
  private getNpsData(): NpsData {
    if (!fs.existsSync(this.npsPath)) {
      return { responses: [] };
    }
    const content = fs.readFileSync(this.npsPath, 'utf8');
    return JSON.parse(content) as NpsData;
  }

  /**
   * Save NPS data to file
   * @param data - NPS data to save
   */
  private saveNpsData(data: NpsData): void {
    const dir = path.dirname(this.npsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.npsPath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Ensure NPS data file exists
   */
  private ensureFile(): void {
    const dir = path.dirname(this.npsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.npsPath)) {
      fs.writeFileSync(this.npsPath, JSON.stringify({ responses: [] }, null, 2), 'utf8');
    }
  }
}
