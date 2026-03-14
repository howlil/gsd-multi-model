#!/usr/bin/env node

/**
 * GSD FS Utils — Cross-platform file system utilities
 * 
 * Replaces Unix commands (find, grep, head, tail) with
 * cross-platform JavaScript implementations.
 * 
 * Usage:
 *   const { findFiles, grepContent, readLines } = require('./fs-utils.cjs');
 *   const files = await findFiles('./src', /\.js$/);
 */

const fs = require('fs');
const path = require('path');
const Logger = require('./logger.cjs');
const logger = new Logger();

/**
 * Find files matching patterns (cross-platform find replacement)
 * @param {string} dir - Directory to search
 * @param {RegExp[]} patterns - File patterns to match
 * @param {Object} options - Search options
 * @returns {string[]} - Array of matching file paths
 */
function findFiles(dir, patterns, options = {}) {
  const { maxDepth = 5, exclude = ['node_modules', '.git', '.planning'] } = options;
  const results = [];

  function recurse(currentDir, depth) {
    if (depth > maxDepth) return;
    
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      logger.warn('Cannot read directory', { dir: currentDir, error: err.message });
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

/**
 * Search file content (cross-platform grep replacement)
 * @param {string} filePath - File to search
 * @param {RegExp} pattern - Pattern to match
 * @returns {Object[]} - Array of { line, lineNumber, match }
 */
function grepContent(filePath, pattern) {
  const results = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        results.push({
          line: line.trim(),
          lineNumber: index + 1,
          match: line.match(pattern)?.[0]
        });
      }
    });
  } catch (err) {
    logger.warn('Cannot read file for grep', { filePath, error: err.message });
  }
  
  return results;
}

/**
 * Read first N lines (cross-platform head replacement)
 * @param {string} filePath - File to read
 * @param {number} count - Number of lines
 * @returns {string[]} - Array of lines
 */
function readFirstLines(filePath, count = 10) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').slice(0, count);
  } catch (err) {
    logger.warn('Cannot read file', { filePath, error: err.message });
    return [];
  }
}

/**
 * Read last N lines (cross-platform tail replacement)
 * @param {string} filePath - File to read
 * @param {number} count - Number of lines
 * @returns {string[]} - Array of lines
 */
function readLastLines(filePath, count = 10) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    return lines.slice(-count);
  } catch (err) {
    logger.warn('Cannot read file', { filePath, error: err.message });
    return [];
  }
}

/**
 * Count lines in file (cross-platform wc -l replacement)
 * @param {string} filePath - File to count
 * @returns {number} - Line count
 */
function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch (err) {
    logger.warn('Cannot count lines', { filePath, error: err.message });
    return 0;
  }
}

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.debug('Directory created', { dir: dirPath });
  }
}

module.exports = {
  findFiles,
  grepContent,
  readFirstLines,
  readLastLines,
  countLines,
  ensureDir
};
