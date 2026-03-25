/**
 * Dependency Graph — Automated dependency analysis using madge
 *
 * Provides:
 * - build(rootPath, entryPoint): Creates dependency graph using madge for JS/TS files
 * - detectCircular(): Returns array of circular dependency paths
 * - getNodes(), getEdges(), getOrphanFiles(), getLeafFiles(): Graph accessors
 */

import path from 'path';
import fs from 'fs';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface DependencyGraphOptions {
  entry?: string;
  detectCircular?: boolean;
  includeNpm?: boolean;
  tsConfig?: string;
  fileExtensions?: string[];
  extensions?: string[];
  [key: string]: unknown;
}

export interface DependencyGraphNode {
  file: string;
  count: number;
}

export interface DependencyGraphResult {
  nodes: string[];
  edges: Record<string, string[]>;
  circular: string[];
  orphan: string[];
  leafs: string[];
}

// ─── DependencyGraph Class ───────────────────────────────────────────────────

export class DependencyGraph {
  private rootPath: string;
  private options: Required<Omit<DependencyGraphOptions, 'entry'>> & { entry?: string };
  private nodes: string[];
  private edges: Record<string, string[]>;
  private circular: string[];
  private orphan: string[];
  private leafs: string[];
  private graph: unknown;

  /**
   * Create a DependencyGraph instance
   * @param rootPath - Root directory to analyze
   * @param options - Graph options
   */
  constructor(rootPath: string, options: DependencyGraphOptions = {}) {
    this.rootPath = rootPath;
    this.options = {
      entry: options.entry || null,
      detectCircular: options.detectCircular !== false,
      includeNpm: options.includeNpm || false,
      tsConfig: options.tsConfig || 'tsconfig.json',
      fileExtensions: options.fileExtensions || ['.ts', '.tsx', '.js', '.jsx'],
      extensions: options.fileExtensions?.map(ext => ext.replace('.', '')) || ['ts', 'tsx', 'js', 'jsx'],
      ...options
    };
    this.nodes = [];
    this.edges = {};
    this.circular = [];
    this.orphan = [];
    this.leafs = [];
    this.graph = null;
  }

  /**
   * Build dependency graph from root path
   * @param rootPath - Root directory to analyze
   * @param entryPoint - Optional entry point file
   * @returns Graph object with nodes, edges, circular, orphan, leafs
   */
  async build(rootPath: string = this.rootPath, entryPoint: string | null = this.options.entry || null): Promise<DependencyGraphResult> {
    try {
      const madge = await import('madge');

      const config = {
        entry: entryPoint || undefined,
        detectCircular: this.options.detectCircular,
        includeNpm: this.options.includeNpm,
        tsConfig: path.join(rootPath, this.options.tsConfig),
        fileExtensions: this.options.fileExtensions,
        extensions: this.options.extensions
      };

      // Find source files
      const srcDir = path.join(rootPath, 'src');
      const appDir = path.join(rootPath, 'app');
      const libDir = path.join(rootPath, 'lib');

      let searchPath = rootPath;
      if (fs.existsSync(srcDir)) {
        searchPath = srcDir;
      } else if (fs.existsSync(appDir)) {
        searchPath = appDir;
      } else if (fs.existsSync(libDir)) {
        searchPath = libDir;
      }

      // Build glob pattern
      const patterns = this.options.fileExtensions!
        .flatMap(ext => [
          path.join(searchPath, `**/*${ext}`),
          path.join(rootPath, `bin/**/*${ext}`),
          path.join(rootPath, 'commands/**/*${ext}')
        ]);

      // Use madge to analyze dependencies
      const madgeModule = madge as unknown as {
        default: (path: string | string[], config?: Record<string, unknown>) => Promise<{
          nodes: () => string[];
          dependencies: () => Record<string, string[]>;
          circular: () => string[];
          orphan: () => string[];
          leafs: () => string[];
        }>;
      };
      const depGraph = await madgeModule.default(patterns.length > 0 ? patterns : searchPath, {
        ...config,
        tsConfig: fs.existsSync(config.tsConfig!) ? config.tsConfig : undefined
      });

      this.nodes = depGraph.nodes() as string[];
      this.edges = depGraph.dependencies() as Record<string, string[]>;
      this.circular = this.options.detectCircular ? (depGraph.circular() as string[]) : [];
      this.orphan = depGraph.orphan() as string[];
      this.leafs = depGraph.leafs() as string[];
      this.graph = depGraph;

      return {
        nodes: this.nodes,
        edges: this.edges,
        circular: this.circular,
        orphan: this.orphan,
        leafs: this.leafs
      };
    } catch (err) {
      const error = err as Error;
      // If madge fails, create a basic graph from file system
      console.warn(`Warning: Madge analysis failed (${error.message}), using fallback file-based analysis`);
      return this.buildFallback(rootPath);
    }
  }

  /**
   * Detect circular dependencies
   * @returns Array of circular dependency paths
   */
  detectCircular(): string[] {
    return this.circular;
  }

  /**
   * Get all nodes (files) in the graph
   * @returns Array of file paths
   */
  getNodes(): string[] {
    return this.nodes;
  }

  /**
   * Get all edges (import relationships) in the graph
   * @returns Object mapping file paths to their dependencies
   */
  getEdges(): Record<string, string[]> {
    return this.edges;
  }

  /**
   * Get orphan files (files with no imports/exports)
   * @returns Array of orphan file paths
   */
  getOrphanFiles(): string[] {
    return this.orphan;
  }

  /**
   * Get leaf files (files not imported by others)
   * @returns Array of leaf file paths
   */
  getLeafFiles(): string[] {
    return this.leafs;
  }

  /**
   * Get dependency count for a file
   * @param filePath - File path
   * @returns Number of dependencies
   */
  getDependencyCount(filePath: string): number {
    return this.edges[filePath] ? this.edges[filePath]!.length : 0;
  }

  /**
   * Get dependent count (how many files depend on this file)
   * @param filePath - File path
   * @returns Number of files that depend on this file
   */
  getDependentCount(filePath: string): number {
    let count = 0;
    for (const deps of Object.values(this.edges)) {
      if (deps.includes(filePath)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get most depended upon files (hubs)
   * @param limit - Maximum number of results
   * @returns Array of {file, count} objects
   */
  getHubFiles(limit: number = 10): DependencyGraphNode[] {
    const counts: Record<string, number> = {};
    for (const deps of Object.values(this.edges)) {
      for (const dep of deps) {
        counts[dep] = (counts[dep] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .map(([file, count]) => ({ file, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get most dependent files (files with many dependencies)
   * @param limit - Maximum number of results
   * @returns Array of {file, count} objects
   */
  getMostDependentFiles(limit: number = 10): DependencyGraphNode[] {
    return Object.entries(this.edges)
      .map(([file, deps]) => ({ file, count: deps.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Fallback graph builder when madge fails
   */
  private buildFallback(rootPath: string): DependencyGraphResult {
    const result: DependencyGraphResult = {
      nodes: [],
      edges: {},
      circular: [],
      orphan: [],
      leafs: []
    };

    try {
      // Simple file-based analysis
      const files = this.getAllSourceFiles(rootPath);
      result.nodes = files;

      // Create basic edges from import statements
      for (const file of files) {
        const imports = this.extractImports(file);
        result.edges[file] = imports.filter(imp => files.includes(imp));
      }

      // Find orphans (no imports and not imported)
      const importedFiles = new Set<string>();
      for (const deps of Object.values(result.edges)) {
        for (const dep of deps) {
          importedFiles.add(dep);
        }
      }

      result.orphan = files.filter(file => {
        const hasImports = result.edges[file] && result.edges[file]!.length > 0;
        const isImported = importedFiles.has(file);
        return !hasImports && !isImported;
      });

      // Find leafs (not imported by others)
      result.leafs = files.filter(file => !importedFiles.has(file));

      this.nodes = result.nodes;
      this.edges = result.edges;
      this.orphan = result.orphan;
      this.leafs = result.leafs;

      return result;
    } catch (err) {
      const error = err as Error;
      console.warn(`Warning: Fallback graph building failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Get all source files in directory
   */
  private getAllSourceFiles(dir: string, files: string[] = []): string[] {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
          this.getAllSourceFiles(fullPath, files);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (this.options.fileExtensions!.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // Ignore errors
    }
    return files;
  }

  /**
   * Extract imports from a file
   */
  private extractImports(filePath: string): string[] {
    const imports: string[] = [];
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const importRegex = /(?:import|require)\s*[\s\S]*?['"]([^'"]+)['"]/g;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        // Only include relative imports
        if (importPath.startsWith('.')) {
          const resolved = path.resolve(path.dirname(filePath), importPath);
          // Try to find the actual file
          for (const ext of (this.options.fileExtensions || []) as string[]) {
            const withExt = resolved + ext;
            if (fs.existsSync(withExt)) {
              imports.push(withExt);
              break;
            }
          }
          // Also check index files
          for (const ext of (this.options.fileExtensions || []) as string[]) {
            const indexPath = path.join(resolved, `index${ext}`);
            if (fs.existsSync(indexPath)) {
              imports.push(indexPath);
              break;
            }
          }
        }
      }
    } catch {
      // Ignore errors
    }
    return imports;
  }
}
