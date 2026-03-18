#!/usr/bin/env node

/**
 * EZ Safe Path — Path traversal prevention utility
 * 
 * Prevents path traversal attacks by:
 * - Resolving and validating paths against base directory
 * - Blocking paths that escape base directory
 * - Handling Windows and Unix path formats
 * - Logging blocked attempts for security audit
 * 
 * Usage:
 *   const { normalizePath, isPathSafe, safeReadFile } = require('./safe-path.cjs');
 *   const safePath = normalizePath(process.cwd(), userPath);
 */

const path = require('path');
const fs = require('fs');
const Logger = require('./logger.cjs');
const logger = new Logger();

/**
 * Normalize and validate a user-provided path against a base directory
 * @param {string} baseDir - Base directory (trusted)
 * @param {string} userPath - User-provided path (untrusted)
 * @returns {string} - Resolved absolute path if safe
 * @throws {Error} If path traversal detected
 */
function normalizePath(baseDir, userPath) {
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
 * @param {string} baseDir - Base directory (trusted)
 * @param {string} userPath - User-provided path (untrusted)
 * @returns {boolean} - True if path is safe
 */
function isPathSafe(baseDir, userPath) {
  try {
    normalizePath(baseDir, userPath);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Validate path exists and is safe
 * @param {string} baseDir - Base directory
 * @param {string} userPath - User-provided path
 * @returns {string} - Resolved path if exists and safe
 * @throws {Error} If not found or traversal detected
 */
function validatePathExists(baseDir, userPath) {
  const resolvedPath = normalizePath(baseDir, userPath);
  
  if (!fs.existsSync(resolvedPath)) {
    logger.warn('Path does not exist', {
      resolvedPath,
      userPath
    });
    throw new Error(`Path not found: ${userPath}`);
  }
  
  return resolvedPath;
}

/**
 * Safely read a file (validates path before reading)
 * @param {string} baseDir - Base directory
 * @param {string} userPath - User-provided path
 * @param {string} encoding - File encoding (default: utf-8)
 * @returns {string} - File content
 * @throws {Error} If path unsafe or file not found
 */
function safeReadFile(baseDir, userPath, encoding = 'utf-8') {
  const resolvedPath = validatePathExists(baseDir, userPath);
  
  logger.debug('Reading file', { resolvedPath, userPath });
  
  return fs.readFileSync(resolvedPath, encoding);
}

/**
 * Get relative path from base, with validation
 * @param {string} baseDir - Base directory
 * @param {string} fullPath - Full path to convert
 * @returns {string} - Relative path or throws if outside base
 */
function toRelativePath(baseDir, fullPath) {
  const resolvedFull = path.resolve(fullPath);
  const resolvedBase = path.resolve(baseDir);
  
  if (!isPathSafe(baseDir, resolvedFull)) {
    throw new Error(`Path outside base: ${fullPath}`);
  }
  
  return path.relative(resolvedBase, resolvedFull);
}

module.exports = {
  normalizePath,
  isPathSafe,
  validatePathExists,
  safeReadFile,
  toRelativePath
};
