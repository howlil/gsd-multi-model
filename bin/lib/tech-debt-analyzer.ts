/**
 * Tech Debt Analyzer — Automated tech debt hotspot identification
 *
 * Provides:
 * - detectDebtMarkers(rootPath): Finds TODO/FIXME/HACK/XXX/BUG/DEPRECATED comments with severity scores
 * - analyzeDependencyRisk(rootPath): npm audit parsing for vulnerabilities
 * - aggregateFindings(debtMarkers, complexityIssues, largeFiles, duplicates): Combines all findings with severity scores
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface DebtMarkerPattern {
  marker: string;
  severity: string;
  weight: number;
}

export interface DebtMarker {
  file: string;
  line: number;
  marker: string;
  severity: string;
  weight: number;
  content: string;
  age: string | null;
}

export interface DependencyRisk {
  type: string;
  package: string;
  severity: string;
  message: string;
  score: number;
  via?: string[];
  recommendation?: string;
}

export interface TechDebtFinding {
  type: string;
  file?: string;
  line?: number;
  severity?: string;
  score: number;
  description: string;
  [key: string]: unknown;
}

export interface TechDebtSummary {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  topIssues: TechDebtFinding[];
}

export interface FileTechDebt {
  file: string;
  issues: TechDebtFinding[];
  totalScore: number;
}

// ─── TechDebtAnalyzer Class ──────────────────────────────────────────────────

export class TechDebtAnalyzer {
  private rootPath: string;
  private patterns: DebtMarkerPattern[];

  /**
   * Create a TechDebtAnalyzer instance
   * @param rootPath - Root directory to analyze
   */
  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.patterns = [
      { marker: 'TODO', severity: 'Low', weight: 1 },
      { marker: 'FIXME', severity: 'Medium', weight: 2 },
      { marker: 'HACK', severity: 'Medium', weight: 2 },
      { marker: 'XXX', severity: 'High', weight: 3 },
      { marker: 'BUG', severity: 'High', weight: 3 },
      { marker: 'DEPRECATED', severity: 'Critical', weight: 4 },
      { marker: 'OPTIMIZE', severity: 'Low', weight: 1 },
      { marker: 'REFACTOR', severity: 'Medium', weight: 2 }
    ];
  }

  /**
   * Detect debt markers in codebase
   * @param rootPath - Root directory to analyze
   * @returns Array of debt marker objects with file, line, marker, severity, weight, content
   */
  detectDebtMarkers(rootPath: string = this.rootPath): DebtMarker[] {
    const results: DebtMarker[] = [];
    const srcDirs = ['src', 'app', 'lib', 'commands', 'bin', 'agents', 'hooks'];

    for (const pattern of this.patterns) {
      for (const srcDir of srcDirs) {
        const searchPath = path.join(rootPath, srcDir);
        if (!fs.existsSync(searchPath)) continue;

        // Try grep on Unix-like systems
        try {
          const output = execSync(
            `grep -rn "${pattern.marker}" "${searchPath}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.cjs" --include="*.mjs" 2>nul`,
            { cwd: rootPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
          );

          const lines = output.trim().split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;

            const parts = line.split(':');
            if (parts.length < 3) continue;

            const filePath = parts[0]!;
            const lineNum = parseInt(parts[1]!, 10);
            const content = parts.slice(2).join(':').trim();

            results.push({
              file: filePath,
              line: lineNum,
              marker: pattern.marker,
              severity: pattern.severity,
              weight: pattern.weight,
              content: content.substring(0, 200),
              age: null
            });
          }
        } catch (err) {
          const error = err as NodeJS.ErrnoException;
          // grep not available or no matches, use fallback
          if (error.code === 'ENOENT' || (error as any).status === 1) {
            // Use pure JavaScript fallback
            const fallbackResults = this.detectDebtMarkersJS(searchPath, pattern);
            results.push(...fallbackResults);
          }
          // Other errors are ignored (grep returns non-zero if no matches)
        }
      }
    }

    // Sort by severity (Critical first)
    results.sort((a, b) => b.weight - a.weight || a.file.localeCompare(b.file));

    return results;
  }

  /**
   * Pure JavaScript fallback for debt marker detection (Windows compatibility)
   */
  private detectDebtMarkersJS(dir: string, pattern: DebtMarkerPattern): DebtMarker[] {
    const results: DebtMarker[] = [];
    const fileExtensions = ['.ts', '.tsx', '.js', '.cjs', '.mjs'];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Recurse into subdirectory
          results.push(...this.detectDebtMarkersJS(fullPath, pattern));
        } else if (entry.isFile() && fileExtensions.includes(path.extname(entry.name))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i]!;
              if (line.includes(pattern.marker)) {
                results.push({
                  file: fullPath,
                  line: i + 1,
                  marker: pattern.marker,
                  severity: pattern.severity,
                  weight: pattern.weight,
                  content: line.trim().substring(0, 200),
                  age: null
                });
              }
            }
          } catch {
            // Ignore read errors
          }
        }
      }
    } catch {
      // Ignore directory read errors
    }

    return results;
  }

  /**
   * Analyze dependency risk from npm audit
   * @param rootPath - Root directory to analyze
   * @returns Array of vulnerability objects with type, package, severity, message, score
   */
  analyzeDependencyRisk(rootPath: string = this.rootPath): DependencyRisk[] {
    const risks: DependencyRisk[] = [];

    try {
      const auditOutput = execSync('npm audit --json', {
        cwd: rootPath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      const audit = JSON.parse(auditOutput);
      const vulnerabilities = audit.vulnerabilities || {};

      for (const [pkgName, vuln] of Object.entries(vulnerabilities)) {
        const severity = (vuln as any).severity || 'medium';
        const score = severity === 'critical' ? 4 : severity === 'high' ? 3 : severity === 'medium' ? 2 : 1;

        risks.push({
          type: 'security',
          package: pkgName,
          severity: severity.charAt(0).toUpperCase() + severity.slice(1),
          message: `${pkgName}@${(vuln as any).vulnerable_versions || 'unknown'} has ${severity} vulnerability`,
          score,
          via: (vuln as any).via || [],
          recommendation: (vuln as any).recommendation || 'Update to latest version'
        });
      }
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      // npm audit may fail or return no vulnerabilities
      if ((error as any).status !== 1) {
        console.warn(`Warning: npm audit failed: ${error.message}`);
      }
    }

    // Sort by severity
    risks.sort((a, b) => b.score - a.score);

    return risks;
  }

  /**
   * Aggregate all findings into a single report
   * @param debtMarkers - Debt markers from detectDebtMarkers
   * @param complexityIssues - Complexity issues from CodeComplexityAnalyzer
   * @param largeFiles - Large files from CodeComplexityAnalyzer
   * @param duplicates - Duplicate code from CodeComplexityAnalyzer
   * @param dependencyRisks - Dependency risks from analyzeDependencyRisk
   * @returns Aggregated findings sorted by score
   */
  aggregateFindings(
    debtMarkers: DebtMarker[] = [],
    complexityIssues: unknown[] = [],
    largeFiles: unknown[] = [],
    duplicates: unknown[] = [],
    dependencyRisks: DependencyRisk[] = []
  ): TechDebtFinding[] {
    const allFindings: TechDebtFinding[] = [];

    // Add debt markers
    for (const marker of debtMarkers) {
      allFindings.push({
        ...marker,
        type: 'debt_marker',
        score: marker.weight,
        description: `${marker.marker}: ${marker.content}`
      });
    }

    // Add complexity issues
    for (const issue of complexityIssues) {
      const issueObj = issue as Record<string, unknown>;
      allFindings.push({
        ...issueObj,
        type: 'complexity',
        description: issueObj.message as string || ''
      } as TechDebtFinding);
    }

    // Add large files
    for (const file of largeFiles) {
      const fileObj = file as Record<string, unknown>;
      allFindings.push({
        ...fileObj,
        type: 'large_file',
        description: `Large file: ${fileObj.lines} lines, ${fileObj.sizeKB}KB`
      } as TechDebtFinding);
    }

    // Add duplicates
    for (const dup of duplicates) {
      const dupObj = dup as Record<string, unknown>;
      allFindings.push({
        ...dupObj,
        type: 'duplicate',
        description: `Duplicate code in ${dupObj.fileCount} files`
      } as TechDebtFinding);
    }

    // Add dependency risks
    for (const risk of dependencyRisks) {
      allFindings.push({
        ...risk,
        type: 'dependency',
        description: risk.message
      });
    }

    // Sort by score descending
    allFindings.sort((a, b) => b.score - a.score || ((a.file || '').localeCompare(b.file || '') || 0));

    return allFindings;
  }

  /**
   * Get summary of tech debt
   * @param findings - Aggregated findings
   * @returns Summary object
   */
  getSummary(findings: TechDebtFinding[] = []): TechDebtSummary {
    const summary: TechDebtSummary = {
      total: findings.length,
      byType: {},
      bySeverity: {
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0
      },
      topIssues: []
    };

    for (const finding of findings) {
      // Count by type
      summary.byType[finding.type] = (summary.byType[finding.type] || 0) + 1;

      // Count by severity
      const severity = finding.severity || 'Medium';
      if (summary.bySeverity[severity] !== undefined) {
        summary.bySeverity[severity]++;
      }
    }

    // Get top 10 issues
    summary.topIssues = findings.slice(0, 10);

    return summary;
  }

  /**
   * Get tech debt by file
   * @param findings - Aggregated findings
   * @returns Object mapping file paths to their issues
   */
  getByFile(findings: TechDebtFinding[] = []): FileTechDebt[] {
    const byFile: Record<string, FileTechDebt> = {};

    for (const finding of findings) {
      if (!finding.file) continue;

      if (!byFile[finding.file]) {
        byFile[finding.file] = {
          file: finding.file,
          issues: [],
          totalScore: 0
        };
      }

      byFile[finding.file]!.issues.push(finding);
      byFile[finding.file]!.totalScore += finding.score || 0;
    }

    // Sort by total score
    return Object.values(byFile).sort((a, b) => b.totalScore - a.totalScore);
  }
}
