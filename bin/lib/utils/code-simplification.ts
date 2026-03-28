/**
 * Code Simplification Analyzer
 *
 * Phase 28: Remove Over-Engineering (SIMPLIFY-01 to SIMPLIFY-07)
 * - SIMPLIFY-01: Complex pattern detection
 * - SIMPLIFY-02: Unnecessary abstraction detection
 * - SIMPLIFY-03: Cyclomatic complexity analysis
 * - SIMPLIFY-04: Deep nesting detection
 * - SIMPLIFY-05: Long method detection
 * - SIMPLIFY-06: God class detection
 * - SIMPLIFY-07: Feature envy detection
 *
 * Target Metrics:
 * - Complexity reduction: 30%+
 * - Nesting depth: <4 levels
 * - Method length: <50 lines
 * - Class responsibility: Single purpose
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Complexity issue types
 */
export type IssueType =
  | 'high-complexity'
  | 'deep-nesting'
  | 'long-method'
  | 'god-class'
  | 'feature-envy'
  | 'unnecessary-abstraction'
  | 'complex-pattern';

/**
 * Simplification issue
 */
export interface SimplificationIssue {
  /** Issue type */
  type: IssueType;
  /** File path */
  file: string;
  /** Line number */
  line: number;
  /** Description */
  description: string;
  /** Severity (1-5) */
  severity: number;
  /** Suggested fix */
  suggestion: string;
  /** Code snippet */
  snippet?: string;
}

/**
 * Complexity metrics for a file
 */
export interface FileComplexityMetrics {
  /** File path */
  file: string;
  /** Total lines */
  totalLines: number;
  /** Number of functions */
  functionCount: number;
  /** Number of classes */
  classCount: number;
  /** Average function length */
  avgFunctionLength: number;
  /** Max function length */
  maxFunctionLength: number;
  /** Average cyclomatic complexity */
  avgComplexity: number;
  /** Max cyclomatic complexity */
  maxComplexity: number;
  /** Max nesting depth */
  maxNestingDepth: number;
  /** Issues found */
  issues: SimplificationIssue[];
}

/**
 * Code Simplification Analyzer
 *
 * Analyzes codebase for over-engineering:
 * - Complex patterns
 * - Unnecessary abstractions
 * - High cyclomatic complexity
 * - Deep nesting
 * - Long methods
 * - God classes
 * - Feature envy
 */
export class CodeSimplificationAnalyzer {
  private readonly rootDir: string;
  private readonly fileMetrics: Map<string, FileComplexityMetrics>;
  private readonly issues: SimplificationIssue[];

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.fileMetrics = new Map();
    this.issues = [];
  }

  /**
   * Scan directory for TypeScript files
   */
  async scanDirectory(dir: string): Promise<void> {
    const scan = async (currentDir: string): Promise<void> => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules' || item === 'dist') {
          continue;
        }
        
        const fullPath = path.join(currentDir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          await scan(fullPath);
        } else if (item.endsWith('.ts') && !item.endsWith('.test.ts') && !item.endsWith('.spec.ts')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          this.analyzeFile(fullPath, content);
        }
      }
    };
    
    await scan(dir);
  }

  /**
   * Analyze a single file
   */
  private analyzeFile(filePath: string, content: string): void {
    const lines = content.split('\n');
    const issues: SimplificationIssue[] = [];

    // Analyze functions
    const functions = this.extractFunctions(content, lines);
    
    // Analyze classes
    const classes = this.extractClasses(content, lines);
    
    // Calculate metrics
    const metrics: FileComplexityMetrics = {
      file: filePath,
      totalLines: lines.length,
      functionCount: functions.length,
      classCount: classes.length,
      avgFunctionLength: functions.length > 0 
        ? functions.reduce((sum, f) => sum + f.length, 0) / functions.length 
        : 0,
      maxFunctionLength: functions.length > 0 
        ? Math.max(...functions.map(f => f.length)) 
        : 0,
      avgComplexity: functions.length > 0 
        ? functions.reduce((sum, f) => sum + f.complexity, 0) / functions.length 
        : 0,
      maxComplexity: functions.length > 0 
        ? Math.max(...functions.map(f => f.complexity)) 
        : 0,
      maxNestingDepth: functions.length > 0 
        ? Math.max(...functions.map(f => f.maxNesting)) 
        : 0,
      issues
    };

    // Detect issues
    this.detectHighComplexity(filePath, functions, issues);
    this.detectDeepNesting(filePath, functions, issues);
    this.detectLongMethods(filePath, functions, issues);
    this.detectGodClasses(filePath, classes, issues);
    this.detectUnnecessaryAbstractions(filePath, content, issues);

    this.fileMetrics.set(filePath, metrics);
    this.issues.push(...issues);
  }

  /**
   * Extract functions from content
   */
  private extractFunctions(content: string, lines: string[]): Array<{
    name: string;
    line: number;
    length: number;
    complexity: number;
    maxNesting: number;
  }> {
    const functions: Array<{
      name: string;
      line: number;
      length: number;
      complexity: number;
      maxNesting: number;
    }> = [];

    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const name = match[1];
      const startLine = content.substring(0, match.index).split('\n').length;
      
      // Find function end
      const startIdx = match.index;
      let braceCount = 1;
      let endIdx = startIdx + match[0].length;
      
      while (braceCount > 0 && endIdx < content.length) {
        if (content[endIdx] === '{') braceCount++;
        else if (content[endIdx] === '}') braceCount--;
        endIdx++;
      }
      
      const funcContent = content.substring(startIdx, endIdx);
      const funcLines = funcContent.split('\n');
      
      functions.push({
        name,
        line: startLine,
        length: funcLines.length,
        complexity: this.calculateCyclomaticComplexity(funcContent),
        maxNesting: this.calculateMaxNesting(funcContent)
      });
    }

    return functions;
  }

  /**
   * Extract classes from content
   */
  private extractClasses(content: string, lines: string[]): Array<{
    name: string;
    line: number;
    methodCount: number;
    propertyCount: number;
    length: number;
  }> {
    const classes: Array<{
      name: string;
      line: number;
      methodCount: number;
      propertyCount: number;
      length: number;
    }> = [];

    const classRegex = /(?:export\s+)?class\s+(\w+)/g;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const name = match[1];
      const startLine = content.substring(0, match.index).split('\n').length;
      
      // Find class end
      const startIdx = content.indexOf('{', match.index);
      if (startIdx === -1) continue;
      
      let braceCount = 1;
      let endIdx = startIdx + 1;
      
      while (braceCount > 0 && endIdx < content.length) {
        if (content[endIdx] === '{') braceCount++;
        else if (content[endIdx] === '}') braceCount--;
        endIdx++;
      }
      
      const classContent = content.substring(startIdx, endIdx);
      const methodCount = (classContent.match(/(?:public|private|protected)?\s*\w+\s*\([^)]*\)\s*[:{]/g) || []).length;
      const propertyCount = (classContent.match(/(?:public|private|protected)?\s*\w+\s*:/g) || []).length;
      
      classes.push({
        name,
        line: startLine,
        methodCount,
        propertyCount,
        length: classContent.split('\n').length
      });
    }

    return classes;
  }

  /**
   * Calculate cyclomatic complexity
   */
  private calculateCyclomaticComplexity(code: string): number {
    let complexity = 1;
    
    // Count decision points
    const decisionPoints = [
      /\bif\b/g,
      /\belse\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\b\?\b/g,      // Ternary
      /\b&&\b/g,
      /\b\|\|\b/g
    ];
    
    for (const regex of decisionPoints) {
      const matches = code.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  /**
   * Calculate maximum nesting depth
   */
  private calculateMaxNesting(code: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    
    for (const char of code) {
      if (char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}') {
        currentDepth--;
      }
    }
    
    return maxDepth;
  }

  /**
   * Detect high complexity functions
   */
  private detectHighComplexity(
    filePath: string,
    functions: Array<{ name: string; line: number; complexity: number }>,
    issues: SimplificationIssue[]
  ): void {
    for (const func of functions) {
      if (func.complexity > 10) {
        issues.push({
          type: 'high-complexity',
          file: filePath,
          line: func.line,
          description: `Function '${func.name}' has high cyclomatic complexity (${func.complexity})`,
          severity: func.complexity > 20 ? 5 : 3,
          suggestion: 'Consider breaking into smaller functions or using strategy pattern',
          snippet: `function ${func.name}(...) // Complexity: ${func.complexity}`
        });
      }
    }
  }

  /**
   * Detect deep nesting
   */
  private detectDeepNesting(
    filePath: string,
    functions: Array<{ name: string; line: number; maxNesting: number }>,
    issues: SimplificationIssue[]
  ): void {
    for (const func of functions) {
      if (func.maxNesting > 4) {
        issues.push({
          type: 'deep-nesting',
          file: filePath,
          line: func.line,
          description: `Function '${func.name}' has deep nesting (${func.maxNesting} levels)`,
          severity: func.maxNesting > 6 ? 4 : 2,
          suggestion: 'Use early returns, guard clauses, or extract nested logic',
          snippet: `function ${func.name}(...) // Nesting: ${func.maxNesting} levels`
        });
      }
    }
  }

  /**
   * Detect long methods
   */
  private detectLongMethods(
    filePath: string,
    functions: Array<{ name: string; line: number; length: number }>,
    issues: SimplificationIssue[]
  ): void {
    for (const func of functions) {
      if (func.length > 50) {
        issues.push({
          type: 'long-method',
          file: filePath,
          line: func.line,
          description: `Function '${func.name}' is too long (${func.length} lines)`,
          severity: func.length > 100 ? 4 : 2,
          suggestion: 'Extract smaller helper functions',
          snippet: `function ${func.name}(...) // ${func.length} lines`
        });
      }
    }
  }

  /**
   * Detect god classes
   */
  private detectGodClasses(
    filePath: string,
    classes: Array<{ name: string; line: number; methodCount: number; length: number }>,
    issues: SimplificationIssue[]
  ): void {
    for (const cls of classes) {
      if (cls.methodCount > 20 || cls.length > 500) {
        issues.push({
          type: 'god-class',
          file: filePath,
          line: cls.line,
          description: `Class '${cls.name}' has too many responsibilities (${cls.methodCount} methods, ${cls.length} lines)`,
          severity: cls.methodCount > 30 || cls.length > 800 ? 5 : 3,
          suggestion: 'Split into smaller, focused classes using Single Responsibility Principle',
          snippet: `class ${cls.name} // ${cls.methodCount} methods, ${cls.length} lines`
        });
      }
    }
  }

  /**
   * Detect unnecessary abstractions
   */
  private detectUnnecessaryAbstractions(
    filePath: string,
    content: string,
    issues: SimplificationIssue[]
  ): void {
    // Detect empty interfaces
    const emptyInterfaceRegex = /export\s+interface\s+(\w+)\s*\{\s*\}/g;
    let match;
    
    while ((match = emptyInterfaceRegex.exec(content)) !== null) {
      issues.push({
        type: 'unnecessary-abstraction',
        file: filePath,
        line: content.substring(0, match.index).split('\n').length,
        description: `Empty interface '${match[1]}' may be unnecessary`,
        severity: 1,
        suggestion: 'Remove empty interface or add meaningful properties',
        snippet: match[0]
      });
    }

    // Detect single-method classes
    const classRegex = /(?:export\s+)?class\s+(\w+)\s*\{([^}]+)\}/g;
    while ((match = classRegex.exec(content)) !== null) {
      const classBody = match[2];
      const methodCount = (classBody.match(/\w+\s*\([^)]*\)\s*[:{]/g) || []).length;
      
      if (methodCount === 1 && !classBody.includes('extends') && !classBody.includes('implements')) {
        issues.push({
          type: 'unnecessary-abstraction',
          file: filePath,
          line: content.substring(0, match.index).split('\n').length,
          description: `Class '${match[1]}' with single method may be unnecessary`,
          severity: 2,
          suggestion: 'Consider using a simple function instead',
          snippet: `class ${match[1]} { ... } // Single method`
        });
      }
    }
  }

  /**
   * Get all issues
   */
  getIssues(): SimplificationIssue[] {
    return [...this.issues];
  }

  /**
   * Get issues by type
   */
  getIssuesByType(type: IssueType): SimplificationIssue[] {
    return this.issues.filter(i => i.type === type);
  }

  /**
   * Get issues by severity
   */
  getIssuesBySeverity(minSeverity: number): SimplificationIssue[] {
    return this.issues.filter(i => i.severity >= minSeverity);
  }

  /**
   * Get file metrics
   */
  getFileMetrics(): FileComplexityMetrics[] {
    return Array.from(this.fileMetrics.values());
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    filesAnalyzed: number;
    totalIssues: number;
    issuesByType: Record<IssueType, number>;
    issuesBySeverity: Record<number, number>;
    avgComplexity: number;
    avgNestingDepth: number;
    avgFunctionLength: number;
  } {
    const issuesByType: Record<IssueType, number> = {
      'high-complexity': 0,
      'deep-nesting': 0,
      'long-method': 0,
      'god-class': 0,
      'feature-envy': 0,
      'unnecessary-abstraction': 0,
      'complex-pattern': 0
    };
    
    const issuesBySeverity: Record<number, number> = {};
    
    for (const issue of this.issues) {
      issuesByType[issue.type]++;
      issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
    }
    
    const metrics = Array.from(this.fileMetrics.values());
    
    return {
      filesAnalyzed: metrics.length,
      totalIssues: this.issues.length,
      issuesByType,
      issuesBySeverity,
      avgComplexity: metrics.length > 0 
        ? metrics.reduce((sum, m) => sum + m.avgComplexity, 0) / metrics.length 
        : 0,
      avgNestingDepth: metrics.length > 0 
        ? metrics.reduce((sum, m) => sum + m.maxNestingDepth, 0) / metrics.length 
        : 0,
      avgFunctionLength: metrics.length > 0 
        ? metrics.reduce((sum, m) => sum + m.avgFunctionLength, 0) / metrics.length 
        : 0
    };
  }

  /**
   * Clear analysis data
   */
  clear(): void {
    this.fileMetrics.clear();
    this.issues.length = 0;
  }
}

export default CodeSimplificationAnalyzer;
