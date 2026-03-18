#!/usr/bin/env node

/**
 * EZ File Lock — File locking utility for concurrent write protection
 * 
 * Uses proper-lockfile to prevent concurrent writes to planning files
 * Includes deadlock detection (30s timeout) and automatic lock cleanup
 * 
 * Fallback: Uses simple lock file mechanism if proper-lockfile is not available
 * 
 * Usage:
 *   const { withLock, isLocked, ifUnlocked } = require('./file-lock.cjs');
 *   await withLock('.planning/STATE.md', async () => {
 *     // Safe to write - no other process can modify this file
 *   });
 */

const fs = require('fs');
const path = require('path');
const Logger = require('./logger.cjs');
const logger = new Logger();

// Try to load proper-lockfile, fallback to simple implementation
let properLockfile = null;
try {
  properLockfile = require('proper-lockfile');
} catch (err) {
  logger.warn('proper-lockfile not available, using fallback implementation');
}

const DEFAULT_OPTIONS = {
  staleTime: 30000,     // Lock considered stale after 30s
  update: 10000,        // Update lock every 10s to prevent stale
  retries: {
    retries: 10,
    factor: 1.1,
    minTimeout: 100,
    maxTimeout: 1000,
    randomize: true
  }
};

// Simple lock file implementation (fallback)
const LOCK_SUFFIX = '.lock';
const lockHolders = new Map(); // Track locks held by this process

/**
 * Get lock file path
 * @param {string} filePath - Original file path
 * @returns {string} - Lock file path
 */
function getLockPath(filePath) {
  return filePath + LOCK_SUFFIX;
}

/**
 * Simple lock acquisition (fallback when proper-lockfile unavailable)
 */
async function simpleLock(filePath, options = {}) {
  const lockPath = getLockPath(filePath);
  const startTime = Date.now();
  const timeout = options.timeout || 30000;
  const staleTime = options.staleTime || 30000;
  
  while (Date.now() - startTime < timeout) {
    try {
      // Check if lock file exists and is not stale
      if (fs.existsSync(lockPath)) {
        const stats = fs.statSync(lockPath);
        const age = Date.now() - stats.mtimeMs;
        
        if (age < staleTime) {
          // Lock is held by another process, wait and retry
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        // Lock is stale, remove it
        try {
          fs.unlinkSync(lockPath);
        } catch (err) {
          // Ignore - another process might have removed it
        }
      }
      
      // Try to create lock file (using 'wx' flag to fail if it exists)
      fs.writeFileSync(lockPath, JSON.stringify({
        pid: process.pid,
        timestamp: Date.now()
      }), { encoding: 'utf-8', flag: 'wx' });
      
      lockHolders.set(filePath, lockPath);
      
      return {
        release: async () => {
          try {
            if (fs.existsSync(lockPath)) {
              fs.unlinkSync(lockPath);
            }
            lockHolders.delete(filePath);
          } catch (err) {
            logger.warn(`Failed to release lock: ${lockPath}`, { error: err.message });
          }
        }
      };
    } catch (err) {
      // Lock acquisition failed, wait and retry
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  throw new Error(`Lock acquisition timed out after ${timeout}ms`);
}

/**
 * Execute an operation with file lock
 * @param {string} filePath - Path to file to lock
 * @param {Function} operation - Async function to execute while locked
 * @param {Object} options - Lock options
 * @returns {Promise<any>} - Result of operation
 */
async function withLock(filePath, operation, options = {}) {
  const lockOptions = { ...DEFAULT_OPTIONS, ...options };
  const absolutePath = path.resolve(filePath);
  
  // Ensure file exists
  if (!fs.existsSync(absolutePath)) {
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(absolutePath, '', 'utf-8');
  }
  
  let release = null;
  const startTime = Date.now();
  
  try {
    logger.debug(`Attempting to acquire lock: ${absolutePath}`);
    
    if (properLockfile) {
      // Use proper-lockfile
      release = await properLockfile.lock(absolutePath, lockOptions);
    } else {
      // Use simple fallback
      const lockResult = await simpleLock(absolutePath, lockOptions);
      release = lockResult.release;
    }
    
    const acquireTime = Date.now() - startTime;
    logger.debug(`Lock acquired: ${absolutePath} (${acquireTime}ms)`);
    
    const result = await operation();
    return result;
  } catch (err) {
    const waitTime = Date.now() - startTime;
    if (err.message.includes('timed out') || err.code === 'ELOCKED') {
      logger.error(`File locked by another process: ${absolutePath}`, { 
        waited: waitTime,
        timeout: lockOptions.timeout || 30000
      });
      throw new Error(`File locked: ${filePath} (waited ${waitTime}ms)`);
    }
    logger.error(`Lock acquisition failed: ${absolutePath}`, { 
      error: err.message,
      waited: waitTime 
    });
    throw err;
  } finally {
    if (release) {
      try {
        await release();
        logger.debug(`Lock released: ${absolutePath}`);
      } catch (err) {
        logger.warn(`Failed to release lock: ${absolutePath}`, { 
          error: err.message 
        });
      }
    }
  }
}

/**
 * Check if a file is currently locked
 * @param {string} filePath - Path to file
 * @returns {Promise<boolean>} - True if locked
 */
async function isLocked(filePath) {
  const absolutePath = path.resolve(filePath);
  
  if (properLockfile) {
    if (!fs.existsSync(absolutePath)) {
      return false;
    }
    return properLockfile.check(absolutePath);
  }
  
  // Simple fallback
  const lockPath = getLockPath(filePath);
  if (!fs.existsSync(lockPath)) {
    return false;
  }
  
  // Check if lock is stale
  try {
    const stats = fs.statSync(lockPath);
    const age = Date.now() - stats.mtimeMs;
    const staleTime = 30000;
    
    if (age >= staleTime) {
      // Lock is stale, remove it
      fs.unlinkSync(lockPath);
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Execute operation only if file is not locked
 * @param {string} filePath - Path to file
 * @param {Function} operation - Async function to execute
 * @param {any} fallback - Value to return if file is locked
 * @returns {Promise<any>} - Result of operation or fallback
 */
async function ifUnlocked(filePath, operation, fallback = null) {
  const locked = await isLocked(filePath);
  if (locked) {
    logger.debug(`File locked, using fallback: ${filePath}`);
    return fallback;
  }
  return withLock(filePath, operation);
}

module.exports = { withLock, isLocked, ifUnlocked };
