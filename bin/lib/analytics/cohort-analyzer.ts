/**
 * Cohort Analyzer — Cohort-based usage pattern analysis
 * Groups users by time/behavior and tracks retention
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Cohort definition
 */
export interface Cohort {
  /** Cohort start date */
  startDate: string;
  /** Cohort end date */
  endDate: string;
  /** User IDs in cohort */
  users: string[];
  /** Cohort size */
  size: number;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Retention period result
 */
export interface RetentionPeriod {
  /** Period name */
  period: string;
  /** Number of active users */
  activeUsers: number;
  /** Retention rate percentage */
  retentionRate: number;
}

/**
 * Retention analysis result
 */
export interface RetentionResult {
  /** Cohort name */
  cohort: string;
  /** Retention data by period */
  retention: RetentionPeriod[];
  /** Initial cohort size */
  initialSize: number;
}

/**
 * Period definition
 */
export interface Period {
  /** Period name */
  name: string;
}

export class CohortAnalyzer {
  private cwd: string;
  private cohortsPath: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.cohortsPath = path.join(this.cwd, '.planning', 'analytics', 'cohorts.json');
    this.ensureFile();
  }

  /**
   * Define a cohort by date range
   * @param name - Cohort name
   * @param startDate - Start date (ISO)
   * @param endDate - End date (ISO)
   * @param users - User IDs in cohort
   */
  defineCohort(name: string, startDate: string, endDate: string, users: string[]): void {
    const cohorts = this.getCohorts();

    cohorts[name] = {
      startDate,
      endDate,
      users,
      size: users.length,
      createdAt: new Date().toISOString()
    };

    this.saveCohorts(cohorts);
  }

  /**
   * Calculate retention for a cohort
   * @param cohortName - Cohort name
   * @param periods - Time periods to analyze
   * @returns Retention data
   */
  calculateRetention(cohortName: string, periods: Period[] = []): RetentionResult {
    const cohorts = this.getCohorts();
    const cohort = cohorts[cohortName];

    if (!cohort) {
      return { error: 'Cohort not found' } as unknown as RetentionResult;
    }

    const retention: RetentionPeriod[] = [];
    const initialSize = cohort.size;

    for (const period of periods) {
      const activeUsers = this.getActiveUsersInPeriod(cohortName, period);
      retention.push({
        period: period.name,
        activeUsers: activeUsers.length,
        retentionRate: initialSize > 0 ? Math.round((activeUsers.length / initialSize) * 100) : 0
      });
    }

    return { cohort: cohortName, retention, initialSize };
  }

  /**
   * Get active users in a period
   * @param cohortName - Cohort name
   * @param period - Period definition
   * @returns Active user IDs
   */
  private getActiveUsersInPeriod(cohortName: string, period: Period): string[] {
    // Placeholder - would track actual user activity
    const cohorts = this.getCohorts();
    const cohort = cohorts[cohortName];
    if (!cohort) return [];

    // Return all users for now (placeholder)
    return cohort.users;
  }

  /**
   * Get all cohorts
   * @returns All cohorts
   */
  getCohorts(): Record<string, Cohort> {
    if (!fs.existsSync(this.cohortsPath)) return {};
    return JSON.parse(fs.readFileSync(this.cohortsPath, 'utf8'));
  }

  /**
   * Save cohorts
   * @param cohorts - Cohorts to save
   */
  private saveCohorts(cohorts: Record<string, Cohort>): void {
    fs.writeFileSync(this.cohortsPath, JSON.stringify(cohorts, null, 2), 'utf8');
  }

  /**
   * Ensure cohorts file exists
   */
  private ensureFile(): void {
    const dir = path.dirname(this.cohortsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.cohortsPath)) {
      fs.writeFileSync(this.cohortsPath, '{}', 'utf8');
    }
  }
}

/**
 * Define a cohort
 * @param name - Cohort name
 * @param startDate - Start date
 * @param endDate - End date
 * @param users - User IDs
 * @param cwd - Working directory
 */
export function defineCohort(name: string, startDate: string, endDate: string, users: string[], cwd?: string): void {
  const analyzer = new CohortAnalyzer(cwd);
  return analyzer.defineCohort(name, startDate, endDate, users);
}

/**
 * Calculate cohort retention
 * @param cohortName - Cohort name
 * @param periods - Periods to analyze
 * @param cwd - Working directory
 * @returns Retention data
 */
export function calculateRetention(cohortName: string, periods: Period[], cwd?: string): RetentionResult {
  const analyzer = new CohortAnalyzer(cwd);
  return analyzer.calculateRetention(cohortName, periods);
}
