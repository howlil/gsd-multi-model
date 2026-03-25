/**
 * Codebase Analyzer — Automated file structure analysis and module boundary detection
 *
 * Provides:
 * - analyzeStructure(rootPath): File structure with directories, entry points, config files, source dirs
 * - detectModuleBoundaries(structure): Identifies module patterns (components, services, controllers, routes, models)
 * - classifyFile(fullPath, fileName): Categorizes files as entry points, configs, source, tests
 */

import fs from 'fs';
import path from 'path';
import micromatch from 'micromatch';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface DirectoryEntry {
  path: string;
  name: string;
  depth: number;
  hasSource: boolean;
  hasTests: boolean;
}

export interface FileClassification {
  path: string;
  name: string;
  type: string;
  category: string;
  isEntry: boolean;
  isConfig: boolean;
  isSource: boolean;
  isTest: boolean;
  extension: string;
}

export interface CodebaseStructure {
  root: string;
  directories: DirectoryEntry[];
  entryPoints: string[];
  configFiles: string[];
  sourceDirs: string[];
  testDirs: string[];
  files: string[];
}

export interface ModuleBoundary {
  name: string;
  path: string;
  type: string;
  fileCount: number;
  depth: number;
}

// ─── CodebaseAnalyzer Class ──────────────────────────────────────────────────

export class CodebaseAnalyzer {
  private rootPath: string;
  private ignorePatterns: string[];

  /**
   * Create a CodebaseAnalyzer instance
   * @param rootPath - Root directory to analyze
   */
  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.ignorePatterns = [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**',
      '*.log',
      '.env*',
      '.planning/**',
      'vendor/**',
      'target/**',
      '.idea/**',
      '.vscode/**'
    ];
  }

  /**
   * Analyze the structure of a codebase
   * @param rootPath - Root directory to analyze
   * @returns Structure object with directories, entryPoints, configFiles, sourceDirs, testDirs, files
   */
  analyzeStructure(rootPath: string = this.rootPath): CodebaseStructure {
    const structure: CodebaseStructure = {
      root: rootPath,
      directories: [],
      entryPoints: [],
      configFiles: [],
      sourceDirs: [],
      testDirs: [],
      files: []
    };

    this.traverse(rootPath, structure, 0);

    return structure;
  }

  /**
   * Detect module boundaries from structure
   * @param structure - Structure object from analyzeStructure
   * @returns Array of module objects with name, path, type, fileCount
   */
  detectModuleBoundaries(structure: CodebaseStructure): ModuleBoundary[] {
    const modules: ModuleBoundary[] = [];
    const modulePattern = /^(components|services|controllers|routes|models|utils|helpers|lib|middleware|stores|hooks|composables|directives)$/;

    for (const dir of structure.directories) {
      const dirName = path.basename(dir.path);
      const parentDir = path.basename(path.dirname(dir.path));

      if (modulePattern.test(dirName)) {
        const fileCount = this.countFiles(dir.path);
        modules.push({
          name: dirName,
          path: dir.path,
          type: parentDir !== path.basename(structure.root) ? parentDir : 'root',
          fileCount,
          depth: dir.depth
        });
      }
    }

    // Sort by depth first, then by name
    modules.sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name));

    return modules;
  }

  /**
   * Classify a file based on its name and path
   * @param fullPath - Full path to the file
   * @param fileName - File name
   * @param structure - Optional structure object for context
   * @returns Classification with type, category, isEntry, isConfig, isSource, isTest
   */
  classifyFile(fullPath: string, fileName: string, structure: CodebaseStructure | null = null): FileClassification {
    const entryPoints = [
      'index.js', 'index.ts', 'index.tsx', 'index.jsx',
      'main.js', 'main.ts', 'app.js', 'app.ts',
      'server.js', 'server.ts'
    ];
    const configFiles = [
      'package.json', 'tsconfig.json', 'jsconfig.json',
      '.eslintrc', '.eslintrc.js', '.eslintrc.json',
      '.prettierrc', 'vite.config.js', 'vite.config.ts',
      'webpack.config.js', 'rollup.config.js',
      'jest.config.js', 'vitest.config.js',
      'next.config.js', 'nuxt.config.js',
      'tailwind.config.js', 'postcss.config.js'
    ];
    const testExtensions = ['.test.js', '.test.ts', '.test.tsx', '.spec.js', '.spec.ts', '.spec.tsx'];
    const sourceExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.java', '.php', '.rs'];

    const classification: FileClassification = {
      path: fullPath,
      name: fileName,
      type: 'other',
      category: 'other',
      isEntry: false,
      isConfig: false,
      isSource: false,
      isTest: false,
      extension: path.extname(fileName)
    };

    // Check entry points
    if (entryPoints.includes(fileName)) {
      classification.isEntry = true;
      classification.type = 'entry';
      classification.category = 'entry';
    }

    // Check config files
    if (configFiles.some(config => fileName === config || fileName.startsWith(config))) {
      classification.isConfig = true;
      classification.type = 'config';
      classification.category = 'config';
    }

    // Check test files
    if (testExtensions.some(ext => fileName.endsWith(ext)) || fullPath.includes('/test/') || fullPath.includes('/spec/') || fullPath.includes('/tests/')) {
      classification.isTest = true;
      classification.type = 'test';
      classification.category = 'test';
    }

    // Check source files
    if (sourceExtensions.includes(classification.extension) && !classification.isTest && !classification.isConfig) {
      classification.isSource = true;
      classification.type = 'source';
      classification.category = 'source';
    }

    return classification;
  }

  /**
   * Traverse directory tree
   */
  private traverse(dir: string, structure: CodebaseStructure, depth: number = 0): void {
    if (depth > 10 || micromatch.isMatch(dir, this.ignorePatterns)) {
      return;
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (micromatch.isMatch(fullPath, this.ignorePatterns)) {
          continue;
        }

        if (entry.isDirectory()) {
          structure.directories.push({
            path: fullPath,
            name: entry.name,
            depth,
            hasSource: false,
            hasTests: false
          });

          // Check if directory contains source or tests
          const dirContents = fs.readdirSync(fullPath, { withFileTypes: true });
          for (const content of dirContents) {
            if (content.isFile()) {
              const ext = path.extname(content.name);
              if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
                structure.directories[structure.directories.length - 1]!.hasSource = true;
              }
              if (content.name.includes('.test.') || content.name.includes('.spec.')) {
                structure.directories[structure.directories.length - 1]!.hasTests = true;
              }
            }
          }

          this.traverse(fullPath, structure, depth + 1);
        } else if (entry.isFile()) {
          structure.files.push(fullPath);

          const classification = this.classifyFile(fullPath, entry.name);

          if (classification.isEntry) {
            structure.entryPoints.push(fullPath);
          }

          if (classification.isConfig) {
            structure.configFiles.push(fullPath);
          }

          if (classification.isSource && fullPath.includes('/src/')) {
            if (!structure.sourceDirs.includes(dir)) {
              structure.sourceDirs.push(dir);
            }
          }

          if (classification.isTest) {
            if (!structure.testDirs.includes(dir)) {
              structure.testDirs.push(dir);
            }
          }
        }
      }
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      // Ignore permission errors and continue
      if (error.code !== 'EPERM' && error.code !== 'EACCES') {
        console.warn(`Warning: Error traversing ${dir}: ${error.message}`);
      }
    }
  }

  /**
   * Count files in a directory
   */
  private countFiles(dir: string): number {
    let count = 0;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && !micromatch.isMatch(path.join(dir, entry.name), this.ignorePatterns)) {
          count++;
        } else if (entry.isDirectory()) {
          count += this.countFiles(path.join(dir, entry.name));
        }
      }
    } catch {
      // Ignore errors
    }
    return count;
  }
}
