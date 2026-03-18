#!/usr/bin/env node

/**
 * EZ Temp File — Secure temporary file handler
 * 
 * Creates secure temp files with fs.mkdtemp(), automatic cleanup on exit,
 * and path validation to prevent traversal attacks.
 * 
 * Usage:
 *   const { createTempFile, cleanupAll } = require('./temp-file.cjs');
 *   const tempFile = await createTempFile('prefix-');
 *   // ... use temp file ...
 *   // Automatically cleaned up on process exit
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const Logger = require('./logger.cjs');
const logger = new Logger();

// Track all created temp resources for cleanup
const tempResources = new Set();
let cleanupRegistered = false;

/**
 * Generate a secure random suffix for temp names
 * @returns {string} - Random hex string
 */
function generateSecureSuffix() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Validate that a path is safe (no traversal attacks)
 * @param {string} basePath - Base directory
 * @param {string} targetPath - Target path to validate
 * @returns {boolean} - True if safe
 */
function isPathSafe(basePath, targetPath) {
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(targetPath);
  
  // Ensure target starts with base (is inside base)
  const normalizedBase = resolvedBase + path.sep;
  return resolvedTarget === resolvedBase || 
         resolvedTarget.startsWith(normalizedBase);
}

/**
 * Create a secure temporary directory
 * @param {string} prefix - Prefix for temp directory name
 * @param {string} customBase - Custom base directory (default: os.tmpdir())
 * @returns {Promise<string>} - Path to created temp directory
 */
async function createTempDir(prefix = 'ez-', customBase = null) {
  const baseDir = customBase || os.tmpdir();
  const tempPath = await fs.promises.mkdtemp(path.join(baseDir, prefix));
  
  logger.debug(`Created temp directory: ${tempPath}`);
  tempResources.add({ type: 'dir', path: tempPath });
  
  registerCleanup();
  
  return tempPath;
}

/**
 * Create a secure temporary file
 * @param {string} prefix - Prefix for temp file name
 * @param {string} customBase - Custom base directory (default: os.tmpdir())
 * @param {string} content - Optional initial content
 * @returns {Promise<string>} - Path to created temp file
 */
async function createTempFile(prefix = 'ez-', customBase = null, content = '') {
  const baseDir = customBase || os.tmpdir();
  const fileName = `${prefix}${generateSecureSuffix()}`;
  const tempPath = path.join(baseDir, fileName);
  
  await fs.promises.writeFile(tempPath, content, 'utf-8');
  
  logger.debug(`Created temp file: ${tempPath}`);
  tempResources.add({ type: 'file', path: tempPath });
  
  registerCleanup();
  
  return tempPath;
}

/**
 * Write content to a temp file safely
 * @param {string} tempPath - Path to temp file
 * @param {string} content - Content to write
 * @param {Object} options - Write options
 */
async function writeToTemp(tempPath, content, options = {}) {
  const { validateBase = os.tmpdir() } = options;
  
  if (!isPathSafe(validateBase, tempPath)) {
    throw new Error(`Path traversal detected: ${tempPath}`);
  }
  
  await fs.promises.writeFile(tempPath, content, 'utf-8');
  logger.debug(`Written to temp file: ${tempPath}`);
}

/**
 * Read content from a temp file safely
 * @param {string} tempPath - Path to temp file
 * @param {Object} options - Read options
 * @returns {Promise<string>} - File content
 */
async function readFromTemp(tempPath, options = {}) {
  const { validateBase = os.tmpdir() } = options;
  
  if (!isPathSafe(validateBase, tempPath)) {
    throw new Error(`Path traversal detected: ${tempPath}`);
  }
  
  const content = await fs.promises.readFile(tempPath, 'utf-8');
  logger.debug(`Read from temp file: ${tempPath}`);
  
  return content;
}

/**
 * Clean up a specific temp resource
 * @param {string} tempPath - Path to temp file or directory
 */
async function cleanupTemp(tempPath) {
  const resolvedPath = path.resolve(tempPath);
  
  for (const resource of tempResources) {
    if (path.resolve(resource.path) === resolvedPath) {
      try {
        if (resource.type === 'dir') {
          await fs.promises.rm(resolvedPath, { recursive: true, force: true });
          logger.debug(`Cleaned up temp directory: ${resolvedPath}`);
        } else {
          await fs.promises.unlink(resolvedPath);
          logger.debug(`Cleaned up temp file: ${resolvedPath}`);
        }
        tempResources.delete(resource);
      } catch (err) {
        logger.warn(`Failed to cleanup temp: ${resolvedPath}`, { 
          error: err.message 
        });
      }
      break;
    }
  }
}

/**
 * Clean up all tracked temp resources
 */
async function cleanupAll() {
  logger.info(`Cleaning up ${tempResources.size} temp resources...`);
  
  const cleanupPromises = [];
  for (const resource of tempResources) {
    cleanupPromises.push(
      cleanupTemp(resource.path).catch(err => {
        logger.warn(`Cleanup failed for ${resource.path}: ${err.message}`);
      })
    );
  }
  
  await Promise.all(cleanupPromises);
  logger.info('Temp cleanup complete');
}

/**
 * Register cleanup handlers (called automatically)
 */
function registerCleanup() {
  if (cleanupRegistered) return;
  cleanupRegistered = true;
  
  const cleanupHandler = async () => {
    if (tempResources.size > 0) {
      await cleanupAll();
    }
  };
  
  // Register for various exit scenarios
  process.on('exit', () => {
    // Synchronous cleanup for exit event
    if (tempResources.size > 0) {
      logger.debug('Synchronous temp cleanup on exit');
    }
  });
  
  process.on('SIGINT', async () => {
    await cleanupHandler();
    process.exit(130);
  });
  
  process.on('SIGTERM', async () => {
    await cleanupHandler();
    process.exit(143);
  });
  
  process.on('beforeExit', async () => {
    await cleanupHandler();
  });
  
  // Handle uncaught errors
  process.on('uncaughtException', async (err) => {
    logger.error('Uncaught exception, cleaning up temps...', { 
      error: err.message 
    });
    await cleanupHandler();
    process.exit(1);
  });
  
  logger.debug('Temp cleanup handlers registered');
}

/**
 * Get list of tracked temp resources
 * @returns {Array} - Array of {type, path} objects
 */
function getTrackedTemps() {
  return Array.from(tempResources);
}

module.exports = {
  createTempDir,
  createTempFile,
  writeToTemp,
  readFromTemp,
  cleanupTemp,
  cleanupAll,
  getTrackedTemps,
  isPathSafe,
  generateSecureSuffix
};
