#!/usr/bin/env node

/**
 * File Access Service
 *
 * Provides file reading capabilities with glob pattern support.
 * Uses micromatch for glob matching with support for negation and brace expansion.
 */

import * as fs from 'fs';
import * as path from 'path';
import micromatch = require('micromatch');
import { FileAccessError } from './context-errors.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

/**
 * File object with path and content
 */
export interface FileObject {
  path: string;
  content: string;
}

/**
 * File info with metadata
 */
export interface FileInfo {
  path: string;
  size: number;
  mtime: Date;
  isDirectory: boolean;
  isFile: boolean;
}

/**
 * Options for file access service
 */
export interface FileAccessOptions {
  cwd?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_FILE_COUNT = 1000;

// ─── Class Definition ────────────────────────────────────────────────────────

/**
 * File Access Service class for reading files with glob pattern support
 */
export class FileAccessService {
  private readonly cwd: string;

  /**
   * Create a new FileAccessService instance
   * @param cwd - Current working directory (defaults to process.cwd())
   */
  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
  }

  /**
   * Read files matching patterns
   * @param patterns - File patterns (glob or single path)
   * @returns Array of file objects
   * @throws FileAccessError - On file access errors
   */
  readFiles(patterns: string | string[]): FileObject[] {
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];

    // Get all files recursively
    const allFiles = this._getAllFiles(this.cwd);

    // Convert paths to relative paths from cwd
    const relativeFiles = allFiles.map(f => {
      const relPath = path.relative(this.cwd, f);
      // Convert to POSIX style paths for glob matching
      return relPath.replace(/\\/g, '/');
    });

    // Filter with micromatch
    const matchedFiles = micromatch(relativeFiles, patternArray, {
      dot: false, // Don't match hidden files/directories by default
      nocase: false
    });

    // Check max file count
    if (matchedFiles.length > MAX_FILE_COUNT) {
      throw new FileAccessError(
        matchedFiles[0]!,
        `Max file count exceeded: ${matchedFiles.length} > ${MAX_FILE_COUNT}`
      );
    }

    // Read file contents
    const results = matchedFiles.map(filePath => {
      const fullPath = path.join(this.cwd, filePath);

      if (!fs.existsSync(fullPath)) {
        throw new FileAccessError(filePath, 'File not found');
      }

      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        return {
          path: filePath,
          content
        };
      } catch (err) {
        const error = err as NodeJS.ErrnoException;
        if (error.code === 'EACCES') {
          throw new FileAccessError(filePath, 'Permission denied');
        }
        throw new FileAccessError(filePath, error.message);
      }
    });

    return results;
  }

  /**
   * Get all files recursively from a directory
   * @param dir - Directory to scan
   * @returns Array of file paths
   * @private
   */
  private _getAllFiles(dir: string): string[] {
    const files: string[] = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip hidden directories (starting with .)
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const subFiles = this._getAllFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      // Ignore permission errors during directory traversal
      if (error.code !== 'EACCES') {
        throw err;
      }
    }

    return files;
  }

  /**
   * Normalize a file path (convert Windows paths to Unix style)
   * @param filePath - The path to normalize
   * @returns Normalized path
   * @throws FileAccessError - On path traversal attempts
   */
  normalizePath(filePath: string): string {
    // Convert Windows backslashes to forward slashes
    const normalized = filePath.replace(/\\/g, '/');

    // Check for path traversal attempts
    if (normalized.includes('..')) {
      throw new FileAccessError(filePath, 'Path traversal not allowed');
    }

    return normalized;
  }

  /**
   * Validate a file path
   * @param filePath - The path to validate
   * @returns True if valid
   */
  validatePath(filePath: string): boolean {
    // Reject paths with null bytes
    if (filePath.includes('\x00')) {
      return false;
    }

    // Resolve the path
    const resolvedPath = path.resolve(this.cwd, filePath);

    // Check if path is within cwd (prevent access outside project)
    const normalizedCwd = path.resolve(this.cwd).replace(/\\/g, '/');
    const normalizedResolved = resolvedPath.replace(/\\/g, '/');

    // Path must be within or equal to cwd
    if (!normalizedResolved.startsWith(normalizedCwd)) {
      return false;
    }

    return true;
  }

  /**
   * Check if a file exists
   * @param filePath - Path to check
   * @returns True if file exists
   */
  fileExists(filePath: string): boolean {
    const fullPath = path.join(this.cwd, filePath);
    return fs.existsSync(fullPath);
  }

  /**
   * Read a single file
   * @param filePath - Path to the file
   * @returns File object or null
   * @throws FileAccessError - On file access errors
   */
  readFile(filePath: string): FileObject | null {
    const results = this.readFiles([filePath]);
    return results[0] || null;
  }

  /**
   * Get file info (size, modified time, etc.)
   * @param filePath - Path to the file
   * @returns File info
   * @throws FileAccessError - On file access errors
   */
  getFileInfo(filePath: string): FileInfo {
    const fullPath = path.join(this.cwd, filePath);

    if (!fs.existsSync(fullPath)) {
      throw new FileAccessError(filePath, 'File not found');
    }

    const stats = fs.statSync(fullPath);

    return {
      path: filePath,
      size: stats.size,
      mtime: stats.mtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    };
  }
}

// Default export for backward compatibility
export default FileAccessService;
