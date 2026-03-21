/**
 * Code Complexity Analyzer — Automated code complexity analysis
 * 
 * Provides:
 * - analyzeComplexity(rootPath): ESLint-based cyclomatic complexity analysis
 * - detectLargeFiles(rootPath, thresholds): Finds files exceeding line/size thresholds
 * - detectDuplicateCode(rootPath): Chunk-based hash comparison for duplicate detection
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class CodeComplexityAnalyzer {
  constructor(rootPath) {
    this.rootPath = rootPath;
    this.defaultThresholds = {
      lines: 500,
      sizeKB: 100
    };
  }

  /**
   * Analyze code complexity using ESLint rules
   * @param {string} rootPath - Root directory to analyze
   * @returns {Promise<Array>} Array of complexity issues with file, line, rule, severity, message, score
   */
  async analyzeComplexity(rootPath = this.rootPath) {
    const issues = [];

    try {
      // Try to use ESLint if available
      const eslintPath = path.join(rootPath, 'node_modules', 'eslint');
      if (fs.existsSync(eslintPath)) {
        const { ESLint } = require(eslintPath);

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
                  file: result.filePath,
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
        return this._analyzeComplexityFallback(rootPath);
      }
    } catch (err) {
      // Fallback if ESLint analysis fails
      console.warn(`Warning: ESLint analysis failed: ${err.message}`);
      return this._analyzeComplexityFallback(rootPath);
    }

    return issues;
  }

  /**
   * Fallback complexity analysis without ESLint
   * @private
   */
  _analyzeComplexityFallback(rootPath) {
    const issues = [];
    const srcDir = path.join(rootPath, 'src');

    if (!fs.existsSync(srcDir)) return issues;

    const files = this._getSourceFiles(srcDir);

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
      } catch (err) {
        // Ignore read errors
      }
    }

    return issues;
  }

  /**
   * Detect large files exceeding thresholds
   * @param {string} rootPath - Root directory to analyze
   * @param {object} thresholds - Thresholds object with lines and sizeKB
   * @returns {Array} Array of large file objects with file, lines, sizeKB, severity, score
   */
  detectLargeFiles(rootPath = this.rootPath, thresholds = this.defaultThresholds) {
    const results = [];
    const srcDir = path.join(rootPath, 'src');

    if (!fs.existsSync(srcDir)) return results;

    const files = this._getSourceFiles(srcDir);

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
      } catch (err) {
        // Ignore read errors
      }
    }

    // Sort by lines descending
    results.sort((a, b) => b.lines - a.lines);

    return results;
  }

  /**
   * Detect duplicate code using chunk hashing
   * @param {string} rootPath - Root directory to analyze
   * @returns {Array} Array of duplicate objects with hash, occurrences, fileCount, severity, score
   */
  detectDuplicateCode(rootPath = this.rootPath) {
    const srcDir = path.join(rootPath, 'src');
    if (!fs.existsSync(srcDir)) return [];

    const files = this._getSourceFiles(srcDir);
    const chunks = [];
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
      } catch (err) {
        // Ignore read errors
      }
    }

    // Group by hash
    const byHash = {};
    for (const chunk of chunks) {
      if (!byHash[chunk.hash]) {
        byHash[chunk.hash] = [];
      }
      byHash[chunk.hash].push(chunk);
    }

    // Find duplicates (same hash in different files)
    const duplicates = [];
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
   * @private
   */
  _getSourceFiles(dir, files = [], depth = 0) {
    if (depth > 5 || dir.includes('node_modules') || dir.includes('dist') || dir.includes('build')) {
      return files;
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          this._getSourceFiles(fullPath, files, depth + 1);
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (err) {
      // Ignore errors
    }

    return files;
  }

  /**
   * Get complexity summary
   * @param {Array} issues - Complexity issues
   * @returns {object} Summary object
   */
  getSummary(issues = []) {
    const summary = {
      total: issues.length,
      bySeverity: {
        High: 0,
        Medium: 0,
        Low: 0
      },
      byRule: {},
      affectedFiles: new Set()
    };

    for (const issue of issues) {
      summary.bySeverity[issue.severity] = (summary.bySeverity[issue.severity] || 0) + 1;
      summary.byRule[issue.rule] = (summary.byRule[issue.rule] || 0) + 1;
      if (issue.file) {
        summary.affectedFiles.add(issue.file);
      }
    }

    summary.affectedFiles = summary.affectedFiles.size;

    return summary;
  }
}

module.exports = { CodeComplexityAnalyzer };
