#!/usr/bin/env node

/**
 * EZ Lib Index — Central export for all EZ libraries
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
const GitWorkflowEngine = require('./git-workflow-engine.cjs');
const GitErrors = require('./git-errors.cjs');

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

// Package Manager
const PackageManagerService = require('./package-manager-service.cjs');
const PackageManagerDetector = require('./package-manager-detector.cjs');
const PackageManagerExecutor = require('./package-manager-executor.cjs');
const LockfileValidator = require('./lockfile-validator.cjs');

// BDD & Requirements (Phase 30)
const bddValidator = require('./bdd-validator.cjs');

// Discussion Synthesis (Phase 31)
const discussionSynthesizer = require('./discussion-synthesizer.cjs');

// Tier Management & Release Validation (Phase 32-33)
const TierManager = require('./tier-manager.cjs');
const ReleaseValidator = require('./release-validator.cjs');

// Metrics (Phase 34)
const MetricsTracker = require('./metrics-tracker.cjs');

// Observability (Phase 21)
const MetricsCollector = require('./metrics-collector.cjs');
const { StructuredLogger, createPinoHttpMiddleware, generateCorrelationId } = require('./logger-structured.cjs');
const TracingSDK = require('./tracing-otel.cjs');
const ErrorTracker = require('./error-tracker.cjs');
const ObservabilityEngine = require('./observability-engine.cjs');

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
  GitWorkflowEngine,
  GitErrors,
  
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

  // Package Manager
  PackageManagerService,
  PackageManagerDetector,
  PackageManagerExecutor,
  LockfileValidator,

  // BDD & Requirements (Phase 30)
  ...bddValidator,

  // Discussion Synthesis (Phase 31)
  ...discussionSynthesizer,

  // Tier Management & Release (Phase 32-33)
  TierManager,
  ReleaseValidator,

  // Metrics (Phase 34)
  MetricsTracker,

  // Observability (Phase 21)
  MetricsCollector,
  StructuredLogger,
  createPinoHttpMiddleware,
  generateCorrelationId,
  TracingSDK,
  ErrorTracker,
  ObservabilityEngine,

  // Version info
  version: '3.0.0',
  
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
        gitWorkflowEngine: 'ok',
        gitErrors: 'ok',
        retry: 'ok',
        circuitBreaker: 'ok',
        fileLock: 'ok',
        tempFile: 'ok',
        modelProvider: 'ok',
        assistantAdapter: 'ok',
        metricsCollector: 'ok',
        structuredLogger: 'ok',
        tracingSDK: 'ok',
        errorTracker: 'ok',
        observabilityEngine: 'ok'
      }
    };
  }
};
