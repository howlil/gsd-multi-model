/**
 * Code Churn Analyzer — Automated code churn analysis
 *
 * Provides:
 * - analyzeChurn(rootPath, days): Calculate code churn over specified period
 * - getChurnRiskLevel(churnPct): Determine risk level based on churn percentage
 * - getChurnByFile(rootPath, days): Get churn breakdown by file
 *
 * 10x Engineer Standard: Code Churn < 20% in 14 days
 * Google Data: High churn (>20%) = 2x bug risk
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface ChurnResult {
  file: string;
  addedLines: number;
  deletedLines: number;
  modifiedLines: number;
  totalChurn: number;
  churnPct: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ChurnSummary {
  totalAdded: number;
  totalDeleted: number;
  totalModified: number;
  totalLines: number;
  churnPct: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  filesAnalyzed: number;
  highChurnFiles: string[];
}

export interface ChurnRiskThresholds {
  low: number;
  medium: number;
  high: number;
}

// ─── CodeChurnAnalyzer Class ─────────────────────────────────────────────────

export class CodeChurnAnalyzer {
  private readonly rootPath: string;
  private readonly defaultDays: number;
  private readonly thresholds: ChurnRiskThresholds;

  /**
   * Create a CodeChurnAnalyzer instance
   * @param rootPath - Root directory to analyze
   * @param days - Number of days to analyze (default: 14)
   */
  constructor(rootPath: string, days: number = 14) {
    this.rootPath = rootPath;
    this.defaultDays = days;
    
    // 10x Engineer Standards (Google SWE data)
    this.thresholds = {
      low: 10,      // < 10% = LOW risk
      medium: 20,   // 10-20% = MEDIUM risk
      high: 20      // > 20% = HIGH risk (2x bug rate)
    };
  }

  /**
   * Analyze code churn over specified period
   * @param rootPath - Root directory to analyze
   * @param days - Number of days (default: 14)
   * @returns Churn summary with risk level
   */
  async analyzeChurn(rootPath: string = this.rootPath, days: number = this.defaultDays): Promise<ChurnSummary> {
    const summary: ChurnSummary = {
      totalAdded: 0,
      totalDeleted: 0,
      totalModified: 0,
      totalLines: 0,
      churnPct: 0,
      riskLevel: 'LOW',
      filesAnalyzed: 0,
      highChurnFiles: []
    };

    try {
      // Get git diff stats for specified period
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);
      const sinceStr = sinceDate.toISOString().split('T')[0];

      const gitLog = execSync(
        `git log --since="${sinceStr}" --numstat --pretty=format:"%H"`,
        { cwd: rootPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );

      // Parse git log output
      const lines = gitLog.split('\n');
      const fileStats: Map<string, { added: number; deleted: number }> = new Map();

      for (const line of lines) {
        if (!line.trim() || /^[0-9a-f]{40}$/.test(line)) {
          continue; // Skip empty lines and commit hashes
        }

        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
          const added = parseInt(parts[0]) || 0;
          const deleted = parseInt(parts[1]) || 0;
          const file = parts[2];

          // Skip binary files and non-source files
          if (added === '-' || deleted === '-' || !this.isSourceFile(file)) {
            continue;
          }

          const existing = fileStats.get(file) || { added: 0, deleted: 0 };
          existing.added += added;
          existing.deleted += deleted;
          fileStats.set(file, existing);
        }
      }

      // Calculate churn for each file
      const results: ChurnResult[] = [];
      for (const [file, stats] of fileStats.entries()) {
        const filePath = path.join(rootPath, file);
        const totalLines = this.countLines(filePath);
        const churn = stats.added + stats.deleted;
        const churnPct = totalLines > 0 ? (churn / totalLines) * 100 : 0;

        results.push({
          file,
          addedLines: stats.added,
          deletedLines: stats.deleted,
          modifiedLines: churn,
          totalChurn: churn,
          churnPct,
          riskLevel: this.getChurnRiskLevel(churnPct)
        });

        summary.totalAdded += stats.added;
        summary.totalDeleted += stats.deleted;
        summary.totalLines += totalLines;
        summary.filesAnalyzed++;

        if (churnPct > this.thresholds.high) {
          summary.highChurnFiles.push(file);
        }
      }

      // Calculate overall churn percentage
      const totalChurn = summary.totalAdded + summary.totalDeleted;
      summary.churnPct = summary.totalLines > 0 
        ? (totalChurn / summary.totalLines) * 100 
        : 0;
      summary.riskLevel = this.getChurnRiskLevel(summary.churnPct);
      summary.totalModified = totalChurn;

    } catch (err) {
      const error = err as Error;
      console.warn(`Warning: Code churn analysis failed: ${error.message}`);
      
      // Return empty summary on error
      summary.riskLevel = 'LOW';
    }

    return summary;
  }

  /**
   * Get churn risk level based on percentage
   * @param churnPct - Churn percentage
   * @returns Risk level
   */
  getChurnRiskLevel(churnPct: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (churnPct < this.thresholds.low) {
      return 'LOW';
    } else if (churnPct < this.thresholds.medium) {
      return 'MEDIUM';
    } else {
      return 'HIGH';
    }
  }

  /**
   * Get churn breakdown by file
   * @param rootPath - Root directory
   * @param days - Number of days
   * @returns Array of churn results per file
   */
  async getChurnByFile(rootPath: string = this.rootPath, days: number = this.defaultDays): Promise<ChurnResult[]> {
    const summary = await this.analyzeChurn(rootPath, days);
    const results: ChurnResult[] = [];

    // Re-parse to get per-file breakdown
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceStr = sinceDate.toISOString().split('T')[0];

    try {
      const gitLog = execSync(
        `git log --since="${sinceStr}" --numstat --pretty=format:"%H"`,
        { cwd: rootPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );

      const lines = gitLog.split('\n');
      const fileStats: Map<string, { added: number; deleted: number }> = new Map();

      for (const line of lines) {
        if (!line.trim() || /^[0-9a-f]{40}$/.test(line)) {
          continue;
        }

        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
          const added = parseInt(parts[0]) || 0;
          const deleted = parseInt(parts[1]) || 0;
          const file = parts[2];

          if (added === '-' || deleted === '-' || !this.isSourceFile(file)) {
            continue;
          }

          const existing = fileStats.get(file) || { added: 0, deleted: 0 };
          existing.added += added;
          existing.deleted += deleted;
          fileStats.set(file, existing);
        }
      }

      for (const [file, stats] of fileStats.entries()) {
        const filePath = path.join(rootPath, file);
        const totalLines = this.countLines(filePath);
        const churn = stats.added + stats.deleted;
        const churnPct = totalLines > 0 ? (churn / totalLines) * 100 : 0;

        results.push({
          file,
          addedLines: stats.added,
          deletedLines: stats.deleted,
          modifiedLines: churn,
          totalChurn: churn,
          churnPct,
          riskLevel: this.getChurnRiskLevel(churnPct)
        });
      }
    } catch (err) {
      console.warn(`Warning: Failed to get churn by file: ${(err as Error).message}`);
    }

    return results;
  }

  /**
   * Check if file is a source file
   */
  private isSourceFile(file: string): boolean {
    const sourceExtensions = [
      '.ts', '.tsx', '.js', '.jsx',
      '.py', '.java', '.go', '.rs',
      '.rb', '.php', '.swift', '.kt'
    ];
    return sourceExtensions.some(ext => file.endsWith(ext));
  }

  /**
   * Count lines in file
   */
  private countLines(filePath: string): number {
    try {
      if (!fs.existsSync(filePath)) {
        return 0;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      return content.split('\n').length;
    } catch {
      return 0;
    }
  }
}

/**
 * Convenience function for CLI usage
 * @param rootPath - Root directory
 * @param days - Number of days
 * @returns Churn summary
 */
export async function analyzeCodeChurn(rootPath: string = process.cwd(), days: number = 14): Promise<ChurnSummary> {
  const analyzer = new CodeChurnAnalyzer(rootPath, days);
  return await analyzer.analyzeChurn();
}

export default CodeChurnAnalyzer;
