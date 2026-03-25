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
 *   import PackageManagerService from './package-manager-service.js';
 *   const service = new PackageManagerService(cwd);
 *   await service.initialize();
 *   await service.install({ frozenLockfile: true });
 *   await service.add(['lodash'], { dev: true });
 */

import Logger from './logger.js';
import { PackageManagerDetector, type DetectionResult, type PackageManagerType } from './package-manager-detector.js';
import { PackageManagerExecutor, type InstallOptions, type AddOptions, type RemoveOptions } from './package-manager-executor.js';
import { LockfileValidator } from './lockfile-validator.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface ServiceConfig {
  cwd?: string;
}

export interface PackageManagerInfo {
  manager: PackageManagerType;
  source: string;
  cwd: string;
  lockfile?: string | undefined;
}

export interface InitializeOptions {
  forceManager?: PackageManagerType | undefined;
}

// ─── Package Manager Service Class ──────────────────────────────────────────

/**
 * Package Manager Service class
 * Provides unified interface for package manager operations
 */
export class PackageManagerService {
  private readonly cwd: string;
  private readonly logger: Logger;
  private readonly detector: PackageManagerDetector;
  private readonly validator: LockfileValidator;
  private executor: PackageManagerExecutor | null;
  private currentManager: PackageManagerType | null;
  private detectionSource: string | null;
  private initialized: boolean;

  /**
   * Create a PackageManagerService instance
   * @param config - Configuration options
   */
  constructor(config: ServiceConfig = {}) {
    this.cwd = config.cwd ?? process.cwd();
    this.logger = new Logger();
    this.detector = new PackageManagerDetector({ cwd: this.cwd });
    this.validator = new LockfileValidator({ cwd: this.cwd });
    this.executor = null;
    this.currentManager = null;
    this.detectionSource = null;
    this.initialized = false;
  }

  /**
   * Initialize the package manager service
   * @param options - Initialization options
   * @returns Promise that resolves when initialized
   */
  async initialize(options: InitializeOptions = {}): Promise<void> {
    const { forceManager } = options;

    this.logger.info('Initializing package manager service', {
      cwd: this.cwd,
      forceManager
    });

    // Detect package manager
    let detection: DetectionResult;
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
    this.executor = new PackageManagerExecutor(detection.manager, { cwd: this.cwd });
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
        packageCount: lockfileValidation.packageCount ?? lockfileValidation.entryCount
      });
    }

    this.initialized = true;
  }

  /**
   * Ensure service is initialized
   * @private
   * @returns Promise that resolves when initialized
   */
  private async _ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Install dependencies
   * @param options - Install options
   * @returns Command output
   */
  async install(options: InstallOptions = {}): Promise<string> {
    await this._ensureInitialized();

    this.logger.info('Installing dependencies', {
      manager: this.currentManager,
      options
    });

    if (!this.executor) {
      throw new Error('Service not initialized');
    }

    return await this.executor.install(options);
  }

  /**
   * Add package(s) to project
   * @param packages - Package name(s) to add
   * @param options - Add options
   * @returns Command output
   */
  async add(packages: string | string[], options: AddOptions = {}): Promise<string> {
    await this._ensureInitialized();

    const packageArray = Array.isArray(packages) ? packages : [packages];

    this.logger.info('Adding packages', {
      manager: this.currentManager,
      packages: packageArray,
      options
    });

    if (!this.executor) {
      throw new Error('Service not initialized');
    }

    return await this.executor.add(packageArray, options);
  }

  /**
   * Remove package(s) from project
   * @param packages - Package name(s) to remove
   * @param options - Remove options
   * @returns Command output
   */
  async remove(packages: string | string[], options: RemoveOptions = {}): Promise<string> {
    await this._ensureInitialized();

    const packageArray = Array.isArray(packages) ? packages : [packages];

    this.logger.info('Removing packages', {
      manager: this.currentManager,
      packages: packageArray,
      options
    });

    if (!this.executor) {
      throw new Error('Service not initialized');
    }

    return await this.executor.remove(packageArray, options);
  }

  /**
   * Get current package manager information
   * @returns Package manager info
   */
  getInfo(): PackageManagerInfo {
    return {
      manager: this.currentManager ?? 'npm',
      source: this.detectionSource ?? 'unknown',
      cwd: this.cwd,
      lockfile: this.currentManager ? this.detector.getLockfilePath(this.currentManager) : undefined
    };
  }
}

// ─── Default Export ─────────────────────────────────────────────────────────

export default PackageManagerService;
