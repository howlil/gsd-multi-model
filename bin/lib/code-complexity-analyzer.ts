/**
 * Code Complexity Analyzer — Automated code complexity analysis
 *
 * Provides:
 * - analyzeComplexity(rootPath): ESLint-based cyclomatic complexity analysis
 * - detectLargeFiles(rootPath, thresholds): Finds files exceeding line/size thresholds
 * - detectDuplicateCode(rootPath): Chunk-based hash comparison for duplicate detection
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface ComplexityIssue {
  file: string;
  line: number;
  rule: string;
  severity: string;
  message: string;
  score: number;
}

export interface LargeFileResult {
  file: string;
  lines: number;
  sizeKB: number;
  severity: string;
  score: number;
}

export interface DuplicateChunk {
  file: string;
  startLine: number;
  endLine: number;
  hash: string;
  content: string;
}

export interface DuplicateCode {
  hash: string;
  occurrences: DuplicateChunk[];
  fileCount: number;
  severity: string;
  score: number;
  files: string[];
}

export interface ComplexityThresholds {
  lines: number;
  sizeKB: number;
}

export interface ComplexitySummary {
  total: number;
  bySeverity: Record<string, number>;
  byRule: Record<string, number>;
  affectedFiles: number | Set<string>;
}

// ─── CodeComplexityAnalyzer Class ────────────────────────────────────────────

export class CodeComplexityAnalyzer {
  private rootPath: string;
  private defaultThresholds: ComplexityThresholds;

  /**
   * Create a CodeComplexityAnalyzer instance
   * @param rootPath - Root directory to analyze
   */
  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.defaultThresholds = {
      lines: 500,
      sizeKB: 100
    };
  }

  /**
   * Analyze code complexity using ESLint rules
   * @param rootPath - Root directory to analyze
   * @returns Array of complexity issues with file, line, rule, severity, message, score
   */
  async analyzeComplexity(rootPath: string = this.rootPath): Promise<ComplexityIssue[]> {
    const issues: ComplexityIssue[] = [];

    try {
      // Try to use ESLint if available
      const eslintPath = path.join(rootPath, 'node_modules', 'eslint');
      if (fs.existsSync(eslintPath)) {
        const { ESLint } = await import(eslintPath);

        const eslint = new ESLint({
          useEslintrc: false,
          overrideConfig: {
            parserOptions: {
              ecmaVersion: 2022,
              sourceType: 'module'
            },
            rules: {
              complexity: ['error', { max: 10 }],
              'max-depth': ['error', { max: 4 }],
              'max-lines': ['error', { max: 300 }],
              'max-params': ['error', { max: 4 }],
              'max-statements': ['error', { max: 30 }]
            }
          }
        });

        const srcDir = path.join(rootPath, 'src');
        if (fs.existsSync(srcDir)) {
          const results = await eslint.lintFiles([`${srcDir}/**/*.ts`, `${srcDir}/**/*.tsx`, `${srcDir}/**/*.js`]);

          for (const result of results) {
            for (const msg of result.messages) {
              if (msg.ruleId && (msg.ruleId.includes('complexity') || msg.ruleId.includes('max-'))) {
                issues.push({
                  file: result.filePath || '',
                  line: msg.line,
                  rule: msg.ruleId,
                  severity: msg.severity === 2 ? 'High' : 'Medium',
                  message: msg.message,
                  score: msg.severity === 2 ? 3 : 2
                });
              }
            }
          }
        }
      } else {
        // Fallback: basic complexity estimation
        return this.analyzeComplexityFallback(rootPath);
      }
    } catch (err) {
      const error = err as Error;
      // Fallback if ESLint analysis fails
      console.warn(`Warning: ESLint analysis failed: ${error.message}`);
      return this.analyzeComplexityFallback(rootPath);
    }

    return issues;
  }

  /**
   * Fallback complexity analysis without ESLint
   */
  private analyzeComplexityFallback(rootPath: string): ComplexityIssue[] {
    const issues: ComplexityIssue[] = [];
    const srcDir = path.join(rootPath, 'src');

    if (!fs.existsSync(srcDir)) return issues;

    const files = this.getSourceFiles(srcDir);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        // Estimate cyclomatic complexity
        let complexity = 1;
        const complexityKeywords = [
          /\bif\s*\(/g,
          /\belse\s+if\s*\(/g,
          /\bfor\s*\(/g,
          /\bwhile\s*\(/g,
          /\bcase\s+/g,
          /\bcatch\s*\(/g,
          /\?\s*/g,
          /\&\&/g,
          /\|\|/g
        ];

        for (const regex of complexityKeywords) {
          const matches = content.match(regex);
          if (matches) {
            complexity += matches.length;
          }
        }

        // Check function complexity
        const functionRegex = /(function\s+\w+|const\s+\w+\s*=\s*(async\s+)?\(.*\)|\w+\s*:\s*(async\s+)?\(.*\))/g;
        let funcMatch;
        while ((funcMatch = functionRegex.exec(content)) !== null) {
          // Count complexity within function
          const funcStart = funcMatch.index;
          let braceCount = 0;
          let funcEnd = funcStart;
          let inFunction = false;

          for (let i = funcStart; i < content.length; i++) {
            if (content[i] === '{') {
              braceCount++;
              inFunction = true;
            } else if (content[i] === '}') {
              braceCount--;
              if (inFunction && braceCount === 0) {
                funcEnd = i;
                break;
              }
            }
          }

          const funcContent = content.substring(funcStart, funcEnd);
          let funcComplexity = 1;

          for (const regex of complexityKeywords) {
            const matches = funcContent.match(regex);
            if (matches) {
              funcComplexity += matches.length;
            }
          }

          if (funcComplexity > 10) {
            const lineNum = content.substring(0, funcStart).split('\n').length;
            issues.push({
              file,
              line: lineNum,
              rule: 'complexity',
              severity: funcComplexity > 20 ? 'High' : 'Medium',
              message: `Function complexity (${funcComplexity}) exceeds recommended maximum (10)`,
              score: funcComplexity > 20 ? 3 : 2
            });
          }
        }

        // Check for high overall complexity
        if (complexity > 50) {
          issues.push({
            file,
            line: 1,
            rule: 'file-complexity',
            severity: 'High',
            message: `File complexity (${complexity}) is very high`,
            score: 3
          });
        }
      } catch {
        // Ignore read errors
      }
    }

    return issues;
  }

  /**
   * Detect large files exceeding thresholds
   * @param rootPath - Root directory to analyze
   * @param thresholds - Thresholds object with lines and sizeKB
   * @returns Array of large file objects with file, lines, sizeKB, severity, score
   */
  detectLargeFiles(rootPath: string = this.rootPath, thresholds: ComplexityThresholds = this.defaultThresholds): LargeFileResult[] {
    const results: LargeFileResult[] = [];
    const srcDir = path.join(rootPath, 'src');

    if (!fs.existsSync(srcDir)) return results;

    const files = this.getSourceFiles(srcDir);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n').length;
        const sizeKB = Buffer.byteLength(content, 'utf8') / 1024;

        if (lines > thresholds.lines || sizeKB > thresholds.sizeKB) {
          results.push({
            file,
            lines,
            sizeKB: Math.round(sizeKB * 100) / 100,
            severity: lines > 1000 ? 'High' : 'Medium',
            score: lines > 1000 ? 3 : 2
          });
        }
      } catch {
        // Ignore read errors
      }
    }

    // Sort by lines descending
    results.sort((a, b) => b.lines - a.lines);

    return results;
  }

  /**
   * Detect duplicate code using chunk hashing
   * @param rootPath - Root directory to analyze
   * @returns Array of duplicate objects with hash, occurrences, fileCount, severity, score
   */
  detectDuplicateCode(rootPath: string = this.rootPath): DuplicateCode[] {
    const srcDir = path.join(rootPath, 'src');
    if (!fs.existsSync(srcDir)) return [];

    const files = this.getSourceFiles(srcDir);
    const chunks: DuplicateChunk[] = [];
    const chunkSize = 10; // lines
    const overlap = 5; // lines

    // Break files into chunks
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length - chunkSize; i += overlap) {
          const chunk = lines.slice(i, i + chunkSize).join('\n').trim();

          // Skip chunks that are mostly empty or comments
          if (chunk.length < 50 || chunk.split('\n').filter(l => l.trim() && !l.trim().startsWith('//')).length < 3) {
            continue;
          }

          const hash = crypto.createHash('md5').update(chunk).digest('hex');

          chunks.push({
            file,
            startLine: i + 1,
            endLine: i + chunkSize,
            hash,
            content: chunk.substring(0, 100) // Truncate for storage
          });
        }
      } catch {
        // Ignore read errors
      }
    }

    // Group by hash
    const byHash: Record<string, DuplicateChunk[]> = {};
    for (const chunk of chunks) {
      if (!byHash[chunk.hash]) {
        byHash[chunk.hash] = [];
      }
      byHash[chunk.hash]!.push(chunk);
    }

    // Find duplicates (same hash in different files)
    const duplicates: DuplicateCode[] = [];
    for (const [hash, items] of Object.entries(byHash)) {
      const uniqueFiles = new Set(items.map(i => i.file));
      if (uniqueFiles.size > 1) {
        duplicates.push({
          hash,
          occurrences: items,
          fileCount: uniqueFiles.size,
          severity: uniqueFiles.size > 3 ? 'High' : 'Medium',
          score: uniqueFiles.size > 3 ? 3 : 2,
          files: Array.from(uniqueFiles)
        });
      }
    }

    // Sort by file count descending
    duplicates.sort((a, b) => b.fileCount - a.fileCount);

    return duplicates;
  }

  /**
   * Get source files from directory
   */
  private getSourceFiles(dir: string, files: string[] = [], depth: number = 0): string[] {
    if (depth > 5 || dir.includes('node_modules') || dir.includes('dist') || dir.includes('build')) {
      return files;
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          this.getSourceFiles(fullPath, files, depth + 1);
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore errors
    }

    return files;
  }

  /**
   * Get complexity summary
   * @param issues - Complexity issues
   * @returns Summary object
   */
  getSummary(issues: ComplexityIssue[] = []): ComplexitySummary {
    const summary: ComplexitySummary = {
      total: issues.length,
      bySeverity: {
        High: 0,
        Medium: 0,
        Low: 0
      },
      byRule: {},
      affectedFiles: new Set<string>()
    };

    for (const issue of issues) {
      summary.bySeverity[issue.severity] = (summary.bySeverity[issue.severity] || 0) + 1;
      summary.byRule[issue.rule] = (summary.byRule[issue.rule] || 0) + 1;
      if (issue.file) {
        (summary.affectedFiles as Set<string>).add(issue.file);
      }
    }

    summary.affectedFiles = (summary.affectedFiles as Set<string>).size;

    return summary;
  }
}
