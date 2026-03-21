/**
 * Tech Debt Analyzer — Automated tech debt hotspot identification
 * 
 * Provides:
 * - detectDebtMarkers(rootPath): Finds TODO/FIXME/HACK/XXX/BUG/DEPRECATED comments with severity scores
 * - analyzeDependencyRisk(rootPath): npm audit parsing for vulnerabilities
 * - aggregateFindings(debtMarkers, complexityIssues, largeFiles, duplicates): Combines all findings with severity scores
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TechDebtAnalyzer {
  constructor(rootPath) {
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
   * @param {string} rootPath - Root directory to analyze
   * @returns {Array} Array of debt marker objects with file, line, marker, severity, weight, content
   */
  detectDebtMarkers(rootPath = this.rootPath) {
    const results = [];
    const srcDirs = ['src', 'app', 'lib', 'commands', 'bin', 'agents', 'hooks'];

    // Try grep first (Unix-like systems), fallback to pure JS for Windows
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

            const filePath = parts[0];
            const lineNum = parseInt(parts[1], 10);
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
          // grep not available or no matches, use fallback
          if (err.code === 'ENOENT' || err.status === 1) {
            // Use pure JavaScript fallback
            const fallbackResults = this._detectDebtMarkersJS(searchPath, pattern);
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
   * @private
   */
  _detectDebtMarkersJS(dir, pattern) {
    const results = [];
    const fileExtensions = ['.ts', '.tsx', '.js', '.cjs', '.mjs'];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Recurse into subdirectory
          results.push(...this._detectDebtMarkersJS(fullPath, pattern));
        } else if (entry.isFile() && fileExtensions.includes(path.extname(entry.name))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
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
          } catch (err) {
            // Ignore read errors
          }
        }
      }
    } catch (err) {
      // Ignore directory read errors
    }

    return results;
  }

  /**
   * Analyze dependency risk from npm audit
   * @param {string} rootPath - Root directory to analyze
   * @returns {Array} Array of vulnerability objects with type, package, severity, message, score
   */
  analyzeDependencyRisk(rootPath = this.rootPath) {
    const risks = [];

    try {
      const auditOutput = execSync('npm audit --json', {
        cwd: rootPath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      const audit = JSON.parse(auditOutput);
      const vulnerabilities = audit.vulnerabilities || {};

      for (const [pkgName, vuln] of Object.entries(vulnerabilities)) {
        const severity = vuln.severity || 'medium';
        const score = severity === 'critical' ? 4 : severity === 'high' ? 3 : severity === 'medium' ? 2 : 1;

        risks.push({
          type: 'security',
          package: pkgName,
          severity: severity.charAt(0).toUpperCase() + severity.slice(1),
          message: `${pkgName}@${vuln.vulnerable_versions || 'unknown'} has ${severity} vulnerability`,
          score,
          via: vuln.via || [],
          recommendation: vuln.recommendation || 'Update to latest version'
        });
      }
    } catch (err) {
      // npm audit may fail or return no vulnerabilities
      if (err.status !== 1) {
        console.warn(`Warning: npm audit failed: ${err.message}`);
      }
    }

    // Sort by severity
    risks.sort((a, b) => b.score - a.score);

    return risks;
  }

  /**
   * Aggregate all findings into a single report
   * @param {Array} debtMarkers - Debt markers from detectDebtMarkers
   * @param {Array} complexityIssues - Complexity issues from CodeComplexityAnalyzer
   * @param {Array} largeFiles - Large files from CodeComplexityAnalyzer
   * @param {Array} duplicates - Duplicate code from CodeComplexityAnalyzer
   * @param {Array} dependencyRisks - Dependency risks from analyzeDependencyRisk
   * @returns {Array} Aggregated findings sorted by score
   */
  aggregateFindings(debtMarkers = [], complexityIssues = [], largeFiles = [], duplicates = [], dependencyRisks = []) {
    const allFindings = [];

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
      allFindings.push({
        ...issue,
        type: 'complexity',
        description: issue.message
      });
    }

    // Add large files
    for (const file of largeFiles) {
      allFindings.push({
        ...file,
        type: 'large_file',
        description: `Large file: ${file.lines} lines, ${file.sizeKB}KB`
      });
    }

    // Add duplicates
    for (const dup of duplicates) {
      allFindings.push({
        ...dup,
        type: 'duplicate',
        description: `Duplicate code in ${dup.fileCount} files`
      });
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
    allFindings.sort((a, b) => b.score - a.score || a.file?.localeCompare(b.file) || 0);

    return allFindings;
  }

  /**
   * Get summary of tech debt
   * @param {Array} findings - Aggregated findings
   * @returns {object} Summary object
   */
  getSummary(findings = []) {
    const summary = {
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
   * @param {Array} findings - Aggregated findings
   * @returns {object} Object mapping file paths to their issues
   */
  getByFile(findings = []) {
    const byFile = {};

    for (const finding of findings) {
      if (!finding.file) continue;

      if (!byFile[finding.file]) {
        byFile[finding.file] = {
          file: finding.file,
          issues: [],
          totalScore: 0
        };
      }

      byFile[finding.file].issues.push(finding);
      byFile[finding.file].totalScore += finding.score || 0;
    }

    // Sort by total score
    return Object.values(byFile).sort((a, b) => b.totalScore - a.totalScore);
  }
}

module.exports = { TechDebtAnalyzer };
