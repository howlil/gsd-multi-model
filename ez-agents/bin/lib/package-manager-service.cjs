#!/usr/bin/env node

/**
 * Package Manager Service — Unified package manager operations
 *
 * High-level service that integrates detection, execution, and validation:
 * - Automatic package manager detection with priority-based strategy
 * - Lockfile validation before operations
 * - Unified interface for install, add, remove operations
 * - Configuration-driven defaults from .planning/config.json
 *
 * Usage:
 *   const PackageManagerService = require('./package-manager-service.cjs');
 *   const service = new PackageManagerService(cwd);
 *   await service.initialize();
 *   await service.install({ frozenLockfile: true });
 *   await service.add(['lodash'], { dev: true });
 */

const fs = require('fs');
const path = require('path');
const Logger = require('./logger.cjs');
const PackageManagerDetector = require('./package-manager-detector.cjs');
const PackageManagerExecutor = require('./package-manager-executor.cjs');
const LockfileValidator = require('./lockfile-validator.cjs');

/**
 * Package Manager Service class
 * Provides unified interface for package manager operations
 */
class PackageManagerService {
  /**
   * Create a PackageManagerService instance
   * @param {string} cwd - Working directory (default: process.cwd())
   */
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.logger = new Logger();
    this.detector = new PackageManagerDetector(cwd);
    this.validator = new LockfileValidator(cwd);
    this.executor = null;
    this.currentManager = null;
    this.detectionSource = null;
    this.initialized = false;
    this.config = this._loadConfig();
  }

  /**
   * Initialize the package manager service
   * @param {Object} options - Initialization options
   * @param {string} [options.forceManager] - Force specific package manager
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    const { forceManager } = options;

    this.logger.info('Initializing package manager service', {
      cwd: this.cwd,
      forceManager
    });

    // Detect package manager
    let detection;
    if (forceManager) {
      detection = {
        manager: forceManager,
        source: 'override',
        confidence: 'high'
      };
      this.logger.info('Using forced package manager', { manager: forceManager });
    } else {
      detection = this.detector.detect();
      this.logger.info('Package manager detected', {
        manager: detection.manager,
        source: detection.source,
        confidence: detection.confidence
      });
    }

    // Validate detection
    if (!detection.manager) {
      throw new Error('No package manager detected or available');
    }

    // Create executor
    this.executor = new PackageManagerExecutor(detection.manager, this.cwd);
    this.currentManager = detection.manager;
    this.detectionSource = detection.source;

    // Validate lockfile if present
    const lockfileValidation = this.validator.validate(detection.manager);
    if (!lockfileValidation.valid) {
      this.logger.warn('Lockfile validation failed', {
        manager: detection.manager,
        reason: lockfileValidation.reason,
        message: lockfileValidation.message
      });
    } else {
      this.logger.debug('Lockfile validated', {
        manager: detection.manager,
        lockfileVersion: lockfileValidation.lockfileVersion,
        packageCount: lockfileValidation.packageCount || lockfileValidation.entryCount
      });
    }

    this.initialized = true;
  }

  /**
   * Ensure service is initialized
   * @private
   * @returns {Promise<void>}
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Install dependencies
   * @param {Object} options - Install options
   * @param {boolean} [options.production] - Production install (exclude devDependencies)
   * @param {boolean} [options.frozenLockfile] - Use frozen lockfile (CI/CD safe)
   * @param {boolean} [options.preferOffline] - Prefer offline cache
   * @returns {Promise<string>} Command output
   */
  async install(options = {}) {
    await this._ensureInitialized();

    this.logger.info('Installing dependencies', {
      manager: this.currentManager,
      options
    });

    return await this.executor.install(options);
  }

  /**
   * Add package(s) to project
   * @param {string|string[]} packages - Package name(s) to add
   * @param {Object} options - Add options
   * @param {boolean} [options.dev] - Add as devDependency
   * @param {boolean} [options.peer] - Add as peerDependency
   * @param {boolean} [options.optional] - Add as optionalDependency
   * @param {boolean} [options.global] - Install globally
   * @returns {Promise<string>} Command output
   */
  async add(packages, options = {}) {
    await this._ensureInitialized();

    const packageArray = Array.isArray(packages) ? packages : [packages];

    this.logger.info('Adding packages', {
      manager: this.currentManager,
      packages: packageArray,
      options
    });

    return await this.executor.add(packageArray, options);
  }

  /**
   * Remove package(s) from project
   * @param {string|string[]} packages - Package name(s) to remove
   * @param {Object} options - Remove options
   * @param {boolean} [options.global] - Remove from global install
   * @returns {Promise<string>} Command output
   */
  async remove(packages, options = {}) {
    await this._ensureInitialized();

    const packageArray = Array.isArray(packages) ? packages : [packages];

    this.logger.info('Removing packages', {
      manager: this.currentManager,
      packages: packageArray,
      options
    });

    return await this.executor.remove(packageArray, options);
  }

  /**
   * Get current package manager information
   * @returns {Object} Package manager info
   */
  getInfo() {
    return {
      manager: this.currentManager,
      source: this.detectionSource,
      cwd: this.cwd,
      lockfile: this.detector.getLockfilePath(this.currentManager)
    };
  }

  /**
   * Load configuration from .planning/config.json
   * @private
   * @returns {Object} Configuration object
   */
  _loadConfig() {
    const configPath = path.join(this.cwd, '.planning', 'config.json');
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (err) {
      this.logger.warn('Failed to load config', { path: configPath, error: err.message });
    }
    return {};
  }
}

module.exports = PackageManagerService;
