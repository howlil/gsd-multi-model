/**
 * State Conflict Log
 *
 * Provides audit logging for state conflicts with 90-day retention:
 * - Full audit trail (conflict details, strategies, agents, outcome)
 * - Resolution statistics calculation
 * - Period-based conflict retrieval
 * - Automatic cleanup of old entries
 *
 * Log format: JSONL (JSON Lines) - one JSON object per line
 * Stats format: JSON - aggregated statistics
 *
 * @example
 * ```typescript
 * const log = new StateConflictLog(90); // 90-day retention
 *
 * await log.log(conflict);
 * const stats = log.getStats();
 * const marchConflicts = await log.getConflictsByPeriod('2026-03');
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  type StateConflict,
  type ResolutionStats,
  ResolutionStrategy
} from './state-types.js';

/**
 * State Conflict Log
 *
 * Manages conflict audit logging with retention policy
 */
export class StateConflictLog {
  private readonly retentionDays: number;
  private readonly logDir: string;
  private readonly logFile: string;
  private readonly statsFile: string;
  private readonly conflicts: StateConflict[];

  /**
   * Create a new StateConflictLog
   *
   * @param retentionDays - Number of days to retain logs (default: 90)
   */
  constructor(retentionDays: number = 90) {
    this.retentionDays = retentionDays;
    this.logDir = path.join(process.cwd(), '.planning', 'state-conflicts');
    this.logFile = path.join(this.logDir, 'conflict-log.jsonl');
    this.statsFile = path.join(this.logDir, 'resolution-stats.json');
    this.conflicts = [];

    // Ensure log directory exists
    this.ensureLogDir();
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDir(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      // Directory creation failed, will handle in log operations
    }
  }

  /**
   * Log a conflict to the audit trail
   *
   * Appends conflict to JSONL log file with full audit information:
   * - Conflict ID, task ID, phase
   * - Agents involved
   * - Timestamps (detectedAt, resolvedAt)
   * - Resolution strategy and status
   * - State before and after
   * - Resolution notes and escalation level
   *
   * @param conflict - The conflict to log
   */
  async log(conflict: StateConflict): Promise<void> {
    try {
      // Ensure directory exists
      this.ensureLogDir();

      // Append to JSONL file (one JSON per line)
      const line = JSON.stringify(conflict) + '\n';
      await fs.promises.appendFile(this.logFile, line, 'utf-8');

      // Also keep in-memory cache for stats calculation
      this.conflicts.push(conflict);

      // Cleanup old entries
      this.cleanup();

      // Update stats file
      await this.updateStatsFile();
    } catch (error) {
      // Log failure should not crash the system
      console.error('Failed to log conflict:', error);
    }
  }

  /**
   * Get resolution statistics
   *
   * Calculates from log file:
   * - totalConflicts: Count of all conflicts
   * - autoResolutionRate: (resolved without escalation / total) * 100
   * - strategyDistribution: Count by strategy type
   * - averageResolutionTimeMs: Average of (resolvedAt - detectedAt)
   * - escalationRate: (escalated / total) * 100
   * - topProblematicStates: Top 5 states by conflict count
   *
   * @returns Resolution statistics
   */
  getStats(): ResolutionStats {
    const conflicts = this.conflicts;
    const totalConflicts = conflicts.length;

    if (totalConflicts === 0) {
      return {
        totalConflicts: 0,
        autoResolutionRate: 0,
        strategyDistribution: {},
        averageResolutionTimeMs: 0,
        escalationRate: 0,
        topProblematicStates: []
      };
    }

    // Count resolved conflicts (without escalation)
    const autoResolved = conflicts.filter(
      (c) =>
        c.status === 'resolved' &&
        (c.escalationLevel === undefined || c.escalationLevel === 0)
    ).length;

    // Calculate auto-resolution rate
    const autoResolutionRate = autoResolved / totalConflicts;

    // Count strategy distribution
    const strategyDistribution: Record<string, number> = {};
    for (const conflict of conflicts) {
      const strategy = conflict.strategy;
      strategyDistribution[strategy] = (strategyDistribution[strategy] || 0) + 1;
    }

    // Calculate average resolution time
    const resolvedConflicts = conflicts.filter((c) => c.resolvedAt && c.detectedAt);
    const totalResolutionTime = resolvedConflicts.reduce(
      (sum, c) => sum + (c.resolvedAt! - c.detectedAt),
      0
    );
    const averageResolutionTimeMs =
      resolvedConflicts.length > 0 ? totalResolutionTime / resolvedConflicts.length : 0;

    // Calculate escalation rate
    const escalated = conflicts.filter(
      (c) => c.escalationLevel !== undefined && c.escalationLevel > 0
    ).length;
    const escalationRate = escalated / totalConflicts;

    // Find top problematic states
    const stateCounts = new Map<string, number>();
    for (const conflict of conflicts) {
      const stateKey = conflict.taskId || `phase-${conflict.phase}` || 'unknown';
      stateCounts.set(stateKey, (stateCounts.get(stateKey) || 0) + 1);
    }

    const topProblematicStates = Array.from(stateCounts.entries())
      .map(([state, conflicts]) => ({ state, conflicts }))
      .sort((a, b) => b.conflicts - a.conflicts)
      .slice(0, 5);

    return {
      totalConflicts,
      autoResolutionRate,
      strategyDistribution,
      averageResolutionTimeMs,
      escalationRate,
      topProblematicStates
    };
  }

  /**
   * Get conflicts by time period
   *
   * @param period - Period in YYYY-MM format (e.g., "2026-03")
   * @returns Array of conflicts in the specified period
   */
  async getConflictsByPeriod(period: string): Promise<StateConflict[]> {
    try {
      // Parse period (YYYY-MM)
      const [year, month] = period.split('-').map(Number);
      if (!year || !month) {
        return [];
      }

      // Filter conflicts by detectedAt timestamp
      return this.conflicts.filter((conflict) => {
        const date = new Date(conflict.detectedAt);
        return date.getFullYear() === year && date.getMonth() + 1 === month;
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Cleanup old log entries
   *
   * Deletes log entries older than retentionDays.
   * Runs automatically on each log operation.
   */
  cleanup(): void {
    try {
      const cutoffDate = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;

      // Filter out old conflicts from in-memory cache
      const recentConflicts = this.conflicts.filter(
        (c) => c.detectedAt >= cutoffDate
      );

      // If we removed any conflicts, rewrite the log file
      if (recentConflicts.length !== this.conflicts.length) {
        this.conflicts.splice(0, this.conflicts.length, ...recentConflicts);
        this.rewriteLogFile();
      }
    } catch (error) {
      // Cleanup failure should not crash the system
      console.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * Rewrite log file with current conflicts
   */
  private async rewriteLogFile(): Promise<void> {
    try {
      const content = this.conflicts.map((c) => JSON.stringify(c) + '\n').join('');
      await fs.promises.writeFile(this.logFile, content, 'utf-8');
    } catch (error) {
      console.error('Failed to rewrite log file:', error);
    }
  }

  /**
   * Update stats file
   */
  private async updateStatsFile(): Promise<void> {
    try {
      const stats = this.getStats();
      const statsData = {
        period: this.getCurrentPeriod(),
        ...stats,
        updatedAt: new Date().toISOString()
      };
      await fs.promises.writeFile(
        this.statsFile,
        JSON.stringify(statsData, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to update stats file:', error);
    }
  }

  /**
   * Get current period string (YYYY-MM)
   */
  private getCurrentPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Load conflicts from log file
   */
  private async loadConflicts(): Promise<void> {
    try {
      if (fs.existsSync(this.logFile)) {
        const content = await fs.promises.readFile(this.logFile, 'utf-8');
        const lines = content.split('\n').filter((line) => line.trim());
        this.conflicts.splice(
          0,
          this.conflicts.length,
          ...lines.map((line) => JSON.parse(line) as StateConflict)
        );
      }
    } catch (error) {
      // File load failure is non-critical
      console.error('Failed to load conflicts from log file:', error);
    }
  }
}

export default StateConflictLog;
