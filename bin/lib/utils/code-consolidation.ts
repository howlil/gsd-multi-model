/**
 * Code Consolidation Utilities
 *
 * Phase 27: Code Consolidation (CODE-01 to CODE-06)
 * - CODE-01: Dead code detection
 * - CODE-02: Utility consolidation
 * - CODE-03: Duplicate function detection
 * - CODE-04: Similar class merging
 * - CODE-05: Import simplification
 * - CODE-06: Unused export detection
 *
 * Target Metrics:
 * - Dead code removal: 20-30%
 * - Duplicate reduction: 50%+
 * - Import consolidation: 30%+
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

/**
 * Dead code detection result
 */
export interface DeadCodeResult {
  /** File path */
  file: string;
  /** Unused exports */
  unusedExports: string[];
  /** Unused imports */
  unusedImports: string[];
  /** Unreachable code blocks */
  unreachableCode: Array<{ line: number; reason: string }>;
}

/**
 * Duplicate detection result
 */
export interface DuplicateResult {
  /** Hash of duplicate content */
  hash: string;
  /** Files containing duplicate */
  files: Array<{ path: string; line: number }>;
  /** Content snippet */
  snippet: string;
  /** Token count */
  tokenCount: number;
}

/**
 * Import consolidation suggestion
 */
export interface ImportSuggestion {
  /** File path */
  file: string;
  /** Current imports */
  currentImports: string[];
  /** Suggested consolidated import */
  suggestedImport: string;
  /** Lines saved */
  linesSaved: number;
}

/**
 * Code Consolidation Analyzer
 *
 * Analyzes codebase for consolidation opportunities:
 * - Dead code detection
 * - Duplicate detection
 * - Import consolidation
 * - Unused export detection
 */
export class CodeConsolidationAnalyzer {
  private readonly rootDir: string;
  private readonly fileContents: Map<string, string>;
  private readonly functionHashes: Map<string, Array<{ file: string; line: number; name: string }>>;
  private readonly exportUsage: Map<string, Set<string>>;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.fileContents = new Map();
    this.functionHashes = new Map();
    this.exportUsage = new Map();
  }

  /**
   * Scan directory for TypeScript files
   * @param dir - Directory to scan
   * @param patterns - Glob patterns to match
   */
  async scanDirectory(dir: string, patterns: string[] = ['**/*.ts']): Promise<void> {
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
          this.fileContents.set(fullPath, content);
          this.analyzeFile(fullPath, content);
        }
      }
    };
    
    await scan(dir);
  }

  /**
   * Analyze a single file
   * @param filePath - File path
   * @param content - File content
   */
  private analyzeFile(filePath: string, content: string): void {
    const lines = content.split('\n');
    
    // Extract exports
    const exports = this.extractExports(content, filePath);
    
    // Extract imports
    const imports = this.extractImports(content);
    
    // Extract functions and their hashes
    this.extractFunctions(content, filePath, lines);
    
    // Track export usage
    for (const exp of exports) {
      if (!this.exportUsage.has(exp)) {
        this.exportUsage.set(exp, new Set());
      }
    }
  }

  /**
   * Extract exports from file content
   * @param content - File content
   * @param filePath - File path
   * @returns Array of export names
   */
  private extractExports(content: string, filePath: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g;
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    // Also extract named exports from export { } statements
    const namedExportRegex = /export\s*\{([^}]+)\}/g;
    while ((match = namedExportRegex.exec(content)) !== null) {
      const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/).pop()?.trim() || '');
      exports.push(...names.filter(Boolean));
    }
    
    return exports;
  }

  /**
   * Extract imports from file content
   * @param content - File content
   * @returns Array of import statements
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+(?:{[^}]+}\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[0]);
    }
    
    return imports;
  }

  /**
   * Extract functions and compute hashes for duplicate detection
   * @param content - File content
   * @param filePath - File path
   * @param lines - File lines
   */
  private extractFunctions(content: string, filePath: string, lines: string[]): void {
    // Match function declarations
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*(?::\s*\w+[^{]*)?\s*\{/g;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      const funcName = match[1];
      const startIndex = match.index;
      const line = content.substring(0, startIndex).split('\n').length;
      
      // Extract function body (simplified - just for duplicate detection)
      const funcStart = content.indexOf('{', startIndex);
      if (funcStart === -1) continue;
      
      let braceCount = 1;
      let funcEnd = funcStart + 1;
      while (braceCount > 0 && funcEnd < content.length) {
        if (content[funcEnd] === '{') braceCount++;
        else if (content[funcEnd] === '}') braceCount--;
        funcEnd++;
      }
      
      const funcBody = content.substring(funcStart, funcEnd);
      
      // Normalize function body for comparison
      const normalized = this.normalizeCode(funcBody);
      const hash = this.hashFunction(normalized);
      
      if (!this.functionHashes.has(hash)) {
        this.functionHashes.set(hash, []);
      }
      this.functionHashes.get(hash)!.push({
        file: filePath,
        line,
        name: funcName
      });
    }
  }

  /**
   * Normalize code for comparison
   * @param code - Code to normalize
   * @returns Normalized code
   */
  private normalizeCode(code: string): string {
    return code
      .replace(/\/\/.*$/gm, '')           // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '')   // Remove multi-line comments
      .replace(/\s+/g, ' ')               // Normalize whitespace
      .replace(/\b\w+\b/g, (match) => {   // Normalize identifiers
        return match.length > 2 ? 'ID' : match;
      })
      .trim();
  }

  /**
   * Hash normalized function body
   * @param code - Normalized code
   * @returns Hash string
   */
  private hashFunction(code: string): string {
    return createHash('sha256').update(code).digest('hex').substring(0, 16);
  }

  /**
   * Get dead code analysis results
   * @returns Dead code results
   */
  getDeadCodeResults(): DeadCodeResult[] {
    const results: DeadCodeResult[] = [];
    
    for (const [filePath, content] of this.fileContents.entries()) {
      const exports = this.extractExports(content, filePath);
      const imports = this.extractImports(content);
      
      // Find unused exports (simplified - would need full project analysis)
      const unusedExports = exports.filter(exp => {
        // Check if export is used in any other file
        for (const [otherPath, otherContent] of this.fileContents.entries()) {
          if (otherPath !== filePath && otherContent.includes(exp)) {
            return false;
          }
        }
        return true;
      });
      
      // Find unused imports (simplified)
      const unusedImports = imports.filter(imp => {
        const match = imp.match(/import\s*\{([^}]+)\}/);
        if (!match) return false;
        
        const importedNames = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim());
        return importedNames.some(name => !content.includes(name) || name === 'unused');
      });
      
      if (unusedExports.length > 0 || unusedImports.length > 0) {
        results.push({
          file: filePath,
          unusedExports,
          unusedImports,
          unreachableCode: []
        });
      }
    }
    
    return results;
  }

  /**
   * Get duplicate detection results
   * @returns Duplicate results
   */
  getDuplicateResults(): DuplicateResult[] {
    const results: DuplicateResult[] = [];
    
    for (const [hash, locations] of this.functionHashes.entries()) {
      if (locations.length > 1) {
        // Get snippet from first occurrence
        const firstLoc = locations[0];
        const content = this.fileContents.get(firstLoc.file) || '';
        const lines = content.split('\n');
        const snippet = lines.slice(firstLoc.line - 1, firstLoc.line + 4).join('\n');
        
        results.push({
          hash,
          files: locations,
          snippet,
          tokenCount: Math.ceil(snippet.length / 4)
        });
      }
    }
    
    return results;
  }

  /**
   * Get import consolidation suggestions
   * @returns Import suggestions
   */
  getImportSuggestions(): ImportSuggestion[] {
    const suggestions: ImportSuggestion[] = [];
    
    for (const [filePath, content] of this.fileContents.entries()) {
      const imports = this.extractImports(content);
      
      // Group imports by source
      const importGroups = new Map<string, string[]>();
      for (const imp of imports) {
        const match = imp.match(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/);
        if (match) {
          const names = match[1].split(',').map(n => n.trim());
          const source = match[2];
          
          if (!importGroups.has(source)) {
            importGroups.set(source, []);
          }
          importGroups.get(source)!.push(...names);
        }
      }
      
      // Suggest consolidation for multiple imports from same source
      for (const [source, names] of importGroups.entries()) {
        if (names.length > 1) {
          const uniqueNames = [...new Set(names)];
          const currentLines = imports.filter(imp => imp.includes(source)).length;
          const suggestedImport = `import { ${uniqueNames.join(', ')} } from '${source}';`;
          
          suggestions.push({
            file: filePath,
            currentImports: imports.filter(imp => imp.includes(source)),
            suggestedImport,
            linesSaved: currentLines - 1
          });
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Get consolidation summary
   * @returns Summary statistics
   */
  getSummary(): {
    filesAnalyzed: number;
    totalLines: number;
    unusedExports: number;
    duplicateFunctions: number;
    importSuggestions: number;
    estimatedTokenSavings: number;
  } {
    const deadCode = this.getDeadCodeResults();
    const duplicates = this.getDuplicateResults();
    const importSuggestions = this.getImportSuggestions();
    
    let totalLines = 0;
    for (const content of this.fileContents.values()) {
      totalLines += content.split('\n').length;
    }
    
    const unusedExports = deadCode.reduce((sum, r) => sum + r.unusedExports.length, 0);
    const duplicateFunctions = duplicates.length;
    
    // Estimate token savings
    const tokenSavings = (
      unusedExports * 10 +           // ~10 tokens per unused export
      duplicateFunctions * 50 +      // ~50 tokens per duplicate function
      importSuggestions.reduce((sum, s) => sum + s.linesSaved * 5, 0)  // ~5 tokens per line
    );
    
    return {
      filesAnalyzed: this.fileContents.size,
      totalLines,
      unusedExports,
      duplicateFunctions,
      importSuggestions: importSuggestions.length,
      estimatedTokenSavings: tokenSavings
    };
  }

  /**
   * Clear analysis data
   */
  clear(): void {
    this.fileContents.clear();
    this.functionHashes.clear();
    this.exportUsage.clear();
  }
}

export default CodeConsolidationAnalyzer;
