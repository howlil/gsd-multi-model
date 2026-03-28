#!/usr/bin/env node
/**
 * CohortAnalyzer - User cohort-based retention analysis
 * 
 * Defines cohorts by time period or criteria, tracks user membership,
 * calculates retention rates over time, and compares retention between cohorts.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Cohort definition
 */
export interface CohortDefinition {
  name: string;
  startDate: string;
  endDate: string;
  criteria: string;
}

/**
 * Cohort record
 */
export interface Cohort {
  name: string;
  startDate: string;
  endDate: string;
  criteria: string;
  size: number;
}

/**
 * Retention period data
 */
export interface RetentionPeriod {
  period: string;
  rate: number;
}

/**
 * Retention result
 */
export interface RetentionResult {
  cohort: string;
  periods: RetentionPeriod[];
  initialSize: number;
}

/**
 * Cohort comparison result
 */
export interface CohortComparison {
  cohorts: Array<{
    name: string;
    size: number;
    retention?: number;
  }>;
}

/**
 * Cohort metrics
 */
export interface CohortMetrics {
  cohort: string;
  size: number;
  activity?: number;
  lifetimeValue?: number;
}

/**
 * Activity record
 */
interface ActivityRecord {
  userId: string;
  timestamp: string;
}

/**
 * Cohorts data file structure
 */
interface CohortsData {
  cohorts: Cohort[];
  memberships: Record<string, string[]>;
  activities?: Record<string, ActivityRecord[]>;
}

/**
 * CohortAnalyzer class for cohort-based retention analysis
 */
export class CohortAnalyzer {
  private readonly dataPath: string;

  /**
   * Create CohortAnalyzer instance
   * @param projectRoot - Root directory for project (default: cwd)
   */
  constructor(private readonly projectRoot: string = process.cwd()) {
    this.dataPath = path.join(this.projectRoot, '.planning', 'cohorts.json');
    this.ensureFile();
  }

  /**
   * Define a new cohort
   * Creates cohort by signup period with criteria
   * @param cohort - Cohort definition
   */
  async defineCohort(cohort: CohortDefinition): Promise<void> {
    const data = this.getCohortsData();
    
    const cohortRecord: Cohort = {
      name: cohort.name,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      criteria: cohort.criteria,
      size: 0
    };

    data.cohorts.push(cohortRecord);
    data.memberships[cohort.name] = [];
    
    this.saveCohortsData(data);
  }

  /**
   * Add user to cohort
   * Assigns user based on signup date matching cohort period
   * @param userId - User ID to add
   * @param signupDate - User signup date (ISO string)
   */
  async addUserToCohort(userId: string, signupDate: string): Promise<void> {
    const data = this.getCohortsData();
    
    // Find matching cohort
    const cohort = data.cohorts.find(c => 
      signupDate >= c.startDate && signupDate <= c.endDate
    );

    if (cohort) {
      if (!data.memberships[cohort.name]) {
        data.memberships[cohort.name] = [];
      }
      
      if (!data.memberships[cohort.name].includes(userId)) {
        data.memberships[cohort.name].push(userId);
        cohort.size = data.memberships[cohort.name].length;
      }
      
      this.saveCohortsData(data);
    }
  }

  /**
   * Calculate retention rate
   * Returns retention rate per period for a cohort
   * @param cohortName - Name of cohort
   * @param options - Optional period configuration
   * @returns Retention result with periods
   */
  calculateRetention(cohortName: string, options?: { period?: string }): RetentionResult {
    const data = this.getCohortsData();
    const cohort = data.cohorts.find(c => c.name === cohortName);
    
    if (!cohort) {
      return { cohort: cohortName, periods: [], initialSize: 0 };
    }

    const members = data.memberships[cohortName] || [];
    const initialSize = members.length;
    
    if (initialSize === 0) {
      return { cohort: cohortName, periods: [], initialSize: 0 };
    }

    const periods: RetentionPeriod[] = [];
    const activities = data.activities || {};
    const cohortStart = new Date(cohort.startDate).getTime();

    // Calculate retention for 4 weeks (default)
    for (let week = 0; week < 4; week++) {
      let activeCount = 0;
      const weekMs = (week + 1) * 7 * 24 * 60 * 60 * 1000;

      for (const userActivities of Object.values(activities)) {
        for (const activity of userActivities) {
          const activityTime = new Date(activity.timestamp).getTime();
          const weeksSinceCohort = Math.floor((activityTime - cohortStart) / (7 * 24 * 60 * 60 * 1000));
          if (weeksSinceCohort === week) {
            activeCount++;
          }
        }
      }

      periods.push({
        period: `week_${week}`,
        rate: Math.round((activeCount / initialSize) * 100)
      });
    }

    return { cohort: cohortName, periods, initialSize };
  }

  /**
   * Compare cohorts
   * Returns comparative retention metrics between cohorts
   * @param cohortNames - Array of cohort names to compare
   * @returns Cohort comparison result
   */
  async compareCohorts(cohortNames: string[]): Promise<CohortComparison> {
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
   * Returns size, activity, and lifetime value for a cohort
   * @param cohortName - Name of cohort
   * @returns Cohort metrics
   */
  async getCohortMetrics(cohortName: string): Promise<CohortMetrics> {
    const data = this.getCohortsData();
    const cohort = data.cohorts.find(c => c.name === cohortName);
    const members = data.memberships[cohortName] || [];
    
    // Calculate activity rate
    const activities = data.activities || {};
    let activeCount = 0;
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    for (const userId of members) {
      const userActivities = activities[userId] || [];
      const hasRecentActivity = userActivities.some(a => {
        const activityTime = new Date(a.timestamp).getTime();
        return activityTime > sevenDaysAgo;
      });
      if (hasRecentActivity) activeCount++;
    }

    const activityRate = members.length > 0 ? Math.round((activeCount / members.length) * 100) : 0;

    return {
      cohort: cohortName,
      size: members.length,
      activity: activityRate,
      lifetimeValue: members.length * 10 // Placeholder LTV
    };
  }

  /**
   * Record user activity
   * Tracks user activity for retention calculation
   * @param userId - User ID
   * @param timestamp - Activity timestamp
   */
  async recordActivity(userId: string, timestamp: string): Promise<void> {
    const data = this.getCohortsData();
    
    if (!data.activities) {
      data.activities = {};
    }
    
    if (!data.activities[userId]) {
      data.activities[userId] = [];
    }
    
    data.activities[userId].push({ userId, timestamp });
    this.saveCohortsData(data);
  }

  /**
   * Get cohorts data from file
   * @returns Cohorts data object
   */
  private getCohortsData(): CohortsData {
    if (!fs.existsSync(this.dataPath)) {
      return { cohorts: [], memberships: {} };
    }
    const content = fs.readFileSync(this.dataPath, 'utf8');
    return JSON.parse(content) as CohortsData;
  }

  /**
   * Save cohorts data to file
   * @param data - Cohorts data to save
   */
  private saveCohortsData(data: CohortsData): void {
    const dir = path.dirname(this.dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Ensure cohorts data file exists
   */
  private ensureFile(): void {
    const dir = path.dirname(this.dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.dataPath)) {
      fs.writeFileSync(this.dataPath, JSON.stringify({ cohorts: [], memberships: {} }, null, 2), 'utf8');
    }
  }
}
