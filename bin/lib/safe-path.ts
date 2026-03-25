#!/usr/bin/env node

/**
 * EZ Safe Path — Path traversal prevention utility
 *
 * Prevents path traversal attacks by:
 * - Resolving and validating paths against base directory
 * - Blocking paths that escape base directory
 * - Handling Windows and Unix path formats
 * - Logging path traversal attempts for security audit
 *
 * Usage:
 *   import { normalizePath, isPathSafe, validatePathExists } from './safe-path.js';
 *   const safePath = normalizePath(process.cwd(), userPath);
 */

import * as path from 'path';
import * as fs from 'fs';
import Logger from './logger.js';

const logger = new Logger();

/**
 * Normalize and validate a user-provided path against a base directory
 * @param baseDir - Base directory (trusted)
 * @param userPath - User-provided path (untrusted)
 * @returns Resolved absolute path if safe
 * @throws Error If path traversal detected
 */
export function normalizePath(baseDir: string, userPath: string): string {
  // Resolve both paths to absolute
  const resolvedBase = path.resolve(baseDir);
  const resolvedUser = path.resolve(baseDir, userPath);

  // Normalize for comparison (handle Windows backslashes)
  const normalizedBase = resolvedBase + path.sep;

  // Check if user path is within base directory
  const isWithin =
    resolvedUser === resolvedBase ||
    resolvedUser.startsWith(normalizedBase);

  if (!isWithin) {
    logger.error('Path traversal detected', {
      baseDir: resolvedBase,
      userPath,
      resolvedUser,
      timestamp: new Date().toISOString()
    });
    throw new Error(`Path traversal detected: ${userPath}`);
  }

  return resolvedUser;
}

/**
 * Check if a path is safe (within base directory) without throwing
 * @param baseDir - Base directory (trusted)
 * @param userPath - User-provided path (untrusted)
 * @returns True if path is safe
 */
export function isPathSafe(baseDir: string, userPath: string): boolean {
  try {
    normalizePath(baseDir, userPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate path exists and is safe
 * @param baseDir - Base directory
 * @param userPath - User-provided path
 * @returns Resolved path if exists and safe
 * @throws Error If not found or traversal detected
 */
export function validatePathExists(baseDir: string, userPath: string): string {
  const resolvedPath = normalizePath(baseDir, userPath);

  if (!fs.existsSync(resolvedPath)) {
    logger.error('Path does not exist', {
      baseDir,
      userPath,
      resolvedPath,
      timestamp: new Date().toISOString()
    });
    throw new Error(`Path does not exist: ${userPath}`);
  }

  return resolvedPath;
}

/**
 * Safely read a file with path traversal protection
 * @param baseDir - Base directory (trusted)
 * @param userPath - User-provided path (untrusted)
 * @param encoding - File encoding (default: 'utf-8')
 * @returns File contents or null if not found
 */
export function safeReadFile(
  baseDir: string,
  userPath: string,
  encoding: BufferEncoding = 'utf-8'
): string | null {
  try {
    const resolvedPath = normalizePath(baseDir, userPath);
    return fs.readFileSync(resolvedPath, encoding);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.warn('safeReadFile failed', {
      baseDir,
      userPath,
      error: errorMessage
    });
    return null;
  }
}

/**
 * Normalize a path to always use forward slashes (cross-platform)
 * @param p - Path to normalize
 * @returns Path with forward slashes
 */
export function toPosixPath(p: string): string {
  return p.split(path.sep).join('/');
}
