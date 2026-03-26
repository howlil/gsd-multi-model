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
  /** Cohort name */
  name: string;
  /** Cohort start date */
  startDate: string;
  /** Cohort end date */
  endDate: string;
  /** Cohort criteria */
  criteria?: { event?: string };
  /** User IDs in cohort */
  users?: string[];
  /** Cohort size */
  size?: number;
  /** Creation timestamp */
  createdAt?: string;
}

/**
 * Cohorts data structure
 */
export interface CohortsData {
  /** Cohorts array */
  cohorts: Cohort[];
  /** User memberships */
  memberships: Record<string, string[]>;
  /** Activity records */
  activities?: Record<string, { userId: string; timestamp: string }[]>;
  /** Activity records by user */
  activities: Record<string, ActivityRecord[]>;
}

/**
 * Activity record
 */
export interface ActivityRecord {
  /** User ID */
  userId: string;
  /** Activity timestamp */
  timestamp: string;
  /** Activity type */
  type?: string;
}

/**
 * Retention period result
 */
export interface RetentionPeriod {
  /** Period name */
  period: string;
  /** Retention rate percentage */
  rate: number;
  /** Active users count */
  activeUsers?: number;
}

/**
 * Retention analysis result
 */
export interface RetentionResult {
  /** Cohort name */
  cohort: string;
  /** Retention data by period */
  periods: RetentionPeriod[];
  /** Initial cohort size */
  initialSize?: number;
}

/**
 * Cohort definition input
 */
export interface CohortDefinition {
  /** Cohort name */
  name: string;
  /** Start date */
  startDate: string;
  /** End date */
  endDate: string;
  /** Cohort criteria */
  criteria?: { event?: string };
}

/**
 * Period definition
 */
export interface Period {
  /** Period name */
  name: string;
}

export class CohortAnalyzer {
  private readonly cwd: string;
  private readonly cohortsPath: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.cohortsPath = path.join(this.cwd, '.planning', 'cohorts.json');
    this.ensureFile();
  }

  /**
   * Define a cohort
   * @param cohort - Cohort definition { name, startDate, endDate, criteria }
   */
  async defineCohort(cohort: CohortDefinition): Promise<void> {
    const data = this.getCohortsData();
    
    const newCohort: Cohort = {
      name: cohort.name,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      criteria: cohort.criteria,
      users: [],
      size: 0,
      createdAt: new Date().toISOString()
    };

    data.cohorts.push(newCohort);
    this.saveCohortsData(data);
  }

  /**
   * Add user to cohort
   * @param userId - User ID
   * @param signupDate - User signup date
   */
  async addUserToCohort(userId: string, signupDate: string): Promise<void> {
    const data = this.getCohortsData();
    const signupTs = new Date(signupDate).getTime();

    // Find matching cohort
    for (const cohort of data.cohorts) {
      const startTs = new Date(cohort.startDate).getTime();
      const endTs = new Date(cohort.endDate).getTime();

      if (signupTs >= startTs && signupTs <= endTs) {
        if (!data.memberships[cohort.name]) {
          data.memberships[cohort.name] = [];
        }
        if (!data.memberships[cohort.name].includes(userId)) {
          data.memberships[cohort.name].push(userId);
        }
      }
    }

    this.saveCohortsData(data);
  }

  /**
   * Calculate retention for a cohort
   * @param cohortName - Cohort name
   * @param periods - Time periods to analyze
   * @returns Retention data
   */
  calculateRetention(cohortName: string, options?: { period?: string }): RetentionResult {
    const data = this.getCohortsData();
    const cohort = data.cohorts.find(c => c.name === cohortName);

    if (!cohort) {
      throw new Error(`Cohort ${cohortName} not found`);
    }

    const members = data.memberships[cohortName] || [];
    const initialSize = members.length;
    const periods: RetentionPeriod[] = [];
    
    // Calculate retention by week (default 4 weeks)
    const activities = data.activities || {};
    const cohortObj = data.cohorts.find(c => c.name === cohortName);
    const cohortStart = cohortObj ? new Date(cohortObj.startDate).getTime() : Date.now();
    
    for (let week = 0; week < 4; week++) {
      let activeCount = 0;
      const weekMs = (week + 1) * 7 * 24 * 60 * 60 * 1000;
      
      for (const userActivities of Object.values(activities)) {
        for (const activity of userActivities) {
          const activityTime = new Date(activity.timestamp).getTime();
          const weeksSinceCohort = Math.floor((activityTime - cohortStart) / (7 * 24 * 60 * 60 * 1000));
          if (weeksSinceCohort === week) activeCount++;
        }
      }
      
      periods.push({
        period: 'week_' + week,
        rate: initialSize > 0 ? Math.round((activeCount / initialSize) * 100) : 0
      });
    }

    return { cohort: cohortName, periods, initialSize };
  }

  /**
   * Compare cohorts
   * @param cohortNames - Array of cohort names to compare
   * @returns Comparative metrics
   */
  async compareCohorts(cohortNames: string[]): Promise<{ cohorts: Array<{ name: string; size: number; retention?: number }> }> {
    const data = this.getCohortsData();
    const cohorts = cohortNames.map(name => {
      const members = data.memberships[name] || [];
      return {
        name,
        size: members.length,
        retention: members.length > 0 ? 100 : 0
      };
    });
    
    return { cohorts };
  }

  /**
   * Get cohort metrics
   * @param cohortName - Cohort name
   * @returns Cohort metrics
   */
  async getCohortMetrics(cohortName: string): Promise<{ cohort: string; size: number; activity?: number; lifetimeValue?: number }> {
    const data = this.getCohortsData();
    const cohort = data.cohorts.find(c => c.name === cohortName);

    if (!cohort) {
      throw new Error(`Cohort ${cohortName} not found`);
    }

    const members = data.memberships[cohortName] || [];

    return {
      cohort: cohortName,
      size: members.length,
      activity: members.length > 0 ? 100 : 0,
      lifetimeValue: members.length * 10 // Placeholder
    };
  }

  /**
   * Get cohorts data
   * @returns Cohorts data
   */
  private getCohortsData(): CohortsData {
    if (!fs.existsSync(this.cohortsPath)) {
      return { cohorts: [], memberships: {} };
    }
    return JSON.parse(fs.readFileSync(this.cohortsPath, 'utf8'));
  }

  /**
   * Save cohorts data
   * @param data - Data to save
   */
  private saveCohortsData(data: CohortsData): void {
    fs.writeFileSync(this.cohortsPath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Ensure cohorts file exists
   */
  
  /**
   * Record user activity
   */
  async recordActivity(userId: string, timestamp: string): Promise<void> {
    const data = this.getCohortsData();
    if (!data.activities) data.activities = {};
    if (!data.activities[userId]) data.activities[userId] = [];
    data.activities[userId].push({ userId, timestamp });
    this.saveCohortsData(data);
  }

  private ensureFile(): void {
    const dir = path.dirname(this.cohortsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.cohortsPath)) {
      fs.writeFileSync(this.cohortsPath, JSON.stringify({ cohorts: [], memberships: {} }, null, 2), 'utf8');
    }
  }
}

/**
 * Define a cohort
 * @param cohort - Cohort definition
 * @param cwd - Working directory
 */
export async function defineCohort(cohort: CohortDefinition, cwd?: string): Promise<void> {
  const analyzer = new CohortAnalyzer(cwd);
  return analyzer.defineCohort(cohort);
}

/**
 * Add user to cohort
 * @param userId - User ID
 * @param signupDate - Signup date
 * @param cwd - Working directory
 */
export async function addUserToCohort(userId: string, signupDate: string, cwd?: string): Promise<void> {
  const analyzer = new CohortAnalyzer(cwd);
  return analyzer.addUserToCohort(userId, signupDate);
}

/**
 * Calculate cohort retention
 * @param cohortName - Cohort name
 * @param periods - Periods to analyze
 * @param cwd - Working directory
 * @returns Retention data
 */
export async function calculateRetention(cohortName: string, periods: Period[], cwd?: string): Promise<RetentionResult> {
  const analyzer = new CohortAnalyzer(cwd);
  return analyzer.calculateRetention(cohortName, periods);
}
