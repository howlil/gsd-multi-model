#!/usr/bin/env node

/**
 * GSD Lib Index — Central export for all GSD libraries
 * 
 * Provides single import point for all utility modules.
 * 
 * Usage:
 *   const lib = require('./index.cjs');
 *   const logger = new lib.Logger();
 *   const git = new lib.GitUtils(process.cwd());
 */

const path = require('path');
const fs = require('fs');

// Core utilities
const Logger = require('./logger.cjs');
const LoggerInstance = new Logger();

// File system
const fsUtils = require('./fs-utils.cjs');

// Security
const safeExec = require('./safe-exec.cjs');
const safePath = require('./safe-path.cjs');
const auth = require('./auth.cjs');
const auditExec = require('./audit-exec.cjs');

// Git
const GitUtils = require('./git-utils.cjs');

// Reliability
const retry = require('./retry.cjs');
const CircuitBreaker = require('./circuit-breaker.cjs');

// Concurrency
const fileLock = require('./file-lock.cjs');
const tempFile = require('./temp-file.cjs');

// Health & Testing
const healthCheck = require('./health-check.cjs');
const timeoutExec = require('./timeout-exec.cjs');

// Multi-model
const modelProvider = require('./model-provider.cjs');

// Adapters
const assistantAdapter = require('./assistant-adapter.cjs');

module.exports = {
  // Core
  Logger,
  logger: LoggerInstance,
  
  // File system
  ...fsUtils,
  
  // Security
  ...safeExec,
  ...safePath,
  ...auth,
  ...auditExec,
  
  // Git
  GitUtils,
  
  // Reliability
  ...retry,
  CircuitBreaker,
  
  // Concurrency
  ...fileLock,
  ...tempFile,
  
  // Health & Testing
  ...healthCheck,
  ...timeoutExec,
  
  // Multi-model
  ...modelProvider,
  
  // Adapters
  ...assistantAdapter,
  
  // Version info
  version: '2.0.0',
  
  /**
   * Get health status of all modules
   */
  getHealthStatus() {
    return {
      version: this.version,
      nodeVersion: process.version,
      platform: process.platform,
      modules: {
        logger: 'ok',
        fsUtils: 'ok',
        safeExec: 'ok',
        safePath: 'ok',
        auth: auth.isKeychainAvailable() ? 'keychain' : 'fallback',
        gitUtils: 'ok',
        retry: 'ok',
        circuitBreaker: 'ok',
        fileLock: 'ok',
        tempFile: 'ok',
        modelProvider: 'ok',
        assistantAdapter: 'ok'
      }
    };
  }
};
