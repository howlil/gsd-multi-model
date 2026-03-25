#!/usr/bin/env node

/**
 * EZ FS Utils — Cross-platform file system utilities
 *
 * Replaces Unix commands (find, grep, head, tail) with
 * cross-platform JavaScript implementations.
 *
 * Usage:
 *   import { findFiles, grepContent, readFirstLines } from './fs-utils.js';
 *   const files = await findFiles('./src', [/\.ts$/]);
 */

import * as fs from 'fs';
import * as path from 'path';
import Logger, { defaultLogger as logger } from './logger.js';

interface FindFilesOptions {
  maxDepth?: number;
  exclude?: string[];
}

/**
 * Find files matching patterns (cross-platform find replacement)
 * @param dir - Directory to search
 * @param patterns - File patterns to match
 * @param options - Search options
 * @returns Array of matching file paths
 */
function findFiles(dir: string, patterns: RegExp[], options: FindFilesOptions = {}): string[] {
  const { maxDepth = 5, exclude = ['node_modules', '.git', '.planning'] } = options;
  const results: string[] = [];

  function recurse(currentDir: string, depth: number): void {
    if (depth > maxDepth) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      const error = err as Error;
      logger.warn('Cannot read directory', { dir: currentDir, error: error.message });
      return;
    }

    for (const entry of entries) {
      if (exclude.includes(entry.name)) continue;

      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        recurse(fullPath, depth + 1);
      } else if (patterns.some(p => p.test(entry.name))) {
        results.push(fullPath);
      }
    }
  }

  recurse(dir, 0);
  return results;
}

interface GrepResult {
  line: string;
  lineNumber: number;
  match?: string;
}

/**
 * Search file content (cross-platform grep replacement)
 * @param filePath - File to search
 * @param pattern - Pattern to match
 * @returns Array of { line, lineNumber, match }
 */
function grepContent(filePath: string, pattern: RegExp): GrepResult[] {
  const results: GrepResult[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        const matchResult = line.match(pattern)?.[0];
        results.push({
          line: line.trim(),
          lineNumber: index + 1,
          ...(matchResult !== undefined ? { match: matchResult } : {})
        });
      }
    });
  } catch (err) {
    const error = err as Error;
    logger.warn('Cannot read file for grep', { filePath, error: error.message });
  }

  return results;
}

/**
 * Read first N lines (cross-platform head replacement)
 * @param filePath - File to read
 * @param count - Number of lines
 * @returns Array of lines
 */
function readFirstLines(filePath: string, count = 10): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').slice(0, count);
  } catch (err) {
    const error = err as Error;
    logger.warn('Cannot read file', { filePath, error: error.message });
    return [];
  }
}

/**
 * Read last N lines (cross-platform tail replacement)
 * @param filePath - File to read
 * @param count - Number of lines
 * @returns Array of lines
 */
function readLastLines(filePath: string, count = 10): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    return lines.slice(-count);
  } catch (err) {
    const error = err as Error;
    logger.warn('Cannot read file', { filePath, error: error.message });
    return [];
  }
}

/**
 * Count lines in file (cross-platform wc -l replacement)
 * @param filePath - File to count
 * @returns Line count
 */
function countLines(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch (err) {
    const error = err as Error;
    logger.warn('Cannot count lines', { filePath, error: error.message });
    return 0;
  }
}

/**
 * Ensure directory exists
 * @param dirPath - Directory path
 */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.debug('Directory created', { dir: dirPath });
  }
}

export {
  findFiles,
  grepContent,
  readFirstLines,
  readLastLines,
  countLines,
  ensureDir
};

export type { FindFilesOptions, GrepResult };
