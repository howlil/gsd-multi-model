#!/usr/bin/env node

/**
 * Package Manager Detector — Auto-detect available package managers
 *
 * Detects package managers (npm, yarn, pnpm, bun) using a multi-layer strategy:
 * 1. Configuration override (.planning/config.json)
 * 2. Lockfile presence (pnpm-lock.yaml, yarn.lock, package-lock.json)
 * 3. System availability (which pnpm/yarn/npm/bun)
 * 4. Fallback to npm (always available with Node)
 *
 * Usage:
 *   import PackageManagerDetector from './package-manager-detector.js';
 *   const detector = new PackageManagerDetector(cwd);
 *   const result = detector.detect();
 *   // Returns: { manager, source, confidence, lockfilePath? }
 */

import { execFileSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Logger } from './logger.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

export type PackageManagerType = 'npm' | 'yarn' | 'pnpm' | 'bun';

export type DetectionSource = 'config' | 'lockfile' | 'system' | 'fallback' | 'override';

export type DetectionConfidence = 'high' | 'medium' | 'low';

export interface DetectionResult {
  manager: PackageManagerType;
  source: DetectionSource;
  confidence: DetectionConfidence;
  lockfilePath?: string;
  configPath?: string;
  available?: PackageManagerType[];
  reason?: string;
}

export interface PackageManagerConfig {
  packageManager?: {
    default?: PackageManagerType;
  };
}

export interface PackageManagerDetectorConfig {
  cwd?: string;
}

// ─── Package Manager Detector Class ─────────────────────────────────────────

/**
 * Package Manager Detector class
 * Detects available package managers with priority-based strategy
 */
export class PackageManagerDetector {
  private readonly cwd: string;
  private readonly logger: Logger;
  private readonly config: PackageManagerConfig;

  /**
   * Create a PackageManagerDetector instance
   * @param config - Configuration options
   */
  constructor(config: PackageManagerDetectorConfig = {}) {
    this.cwd = config.cwd ?? process.cwd();
    this.logger = new Logger();
    this.config = this.loadConfig();
  }

  /**
   * Detect package manager with priority-based strategy
   * @returns Detection result with manager, source, and confidence
   */
  detect(): DetectionResult {
    this.logger.info('Starting package manager detection', { cwd: this.cwd });

    // Layer 1: Configuration override
    const configManager = this._detectFromConfig();
    if (configManager) {
      this.logger.info('Package manager detected from config', { manager: configManager });
      return {
        manager: configManager,
        source: 'config',
        confidence: 'high',
        configPath: '.planning/config.json'
      };
    }

    // Layer 2: Lockfile detection
    const lockfileManager = this.detectFromLockfile();
    if (lockfileManager) {
      const lockfilePath = this.getLockfilePath(lockfileManager);
      this.logger.info('Package manager detected from lockfile', {
        manager: lockfileManager,
        lockfilePath
      });
      return {
        manager: lockfileManager,
        source: 'lockfile',
        confidence: 'high',
        lockfilePath
      };
    }

    // Layer 3: System availability
    const availableManagers = this.getAvailableManagers();
    if (availableManagers.length > 0) {
      // Prefer pnpm > yarn > npm (performance order)
      const preferred =
        availableManagers.find((m) => m === 'pnpm') ||
        availableManagers.find((m) => m === 'yarn') ||
        availableManagers.find((m) => m === 'bun') ||
        availableManagers[0]!;

      this.logger.info('Package manager detected from system', {
        manager: preferred,
        available: availableManagers
      });
      return {
        manager: preferred,
        source: 'system',
        confidence: 'medium',
        available: availableManagers
      };
    }

    // Layer 4: Fallback to npm
    this.logger.warn('No package manager detected, falling back to npm');
    return {
      manager: 'npm',
      source: 'fallback',
      confidence: 'low',
      reason: 'No other package manager detected'
    };
  }

  /**
   * Detect package manager from configuration
   * @private
   * @returns Package manager name or null
   */
  private _detectFromConfig(): PackageManagerType | null {
    const configManager = this.config.packageManager?.default;
    if (configManager && this.isPackageManagerInstalled(configManager)) {
      return configManager;
    }
    return null;
  }

  /**
   * Detect package manager from lockfile presence
   * @returns Package manager name or null
   */
  detectFromLockfile(): PackageManagerType | null {
    const lockfiles: Record<string, PackageManagerType> = {
      'pnpm-lock.yaml': 'pnpm',
      'yarn.lock': 'yarn',
      'package-lock.json': 'npm',
      'bun.lockb': 'bun'
    };

    for (const [lockfile, manager] of Object.entries(lockfiles)) {
      const lockfilePath = join(this.cwd, lockfile);
      if (existsSync(lockfilePath)) {
        return manager;
      }
    }
    return null;
  }

  /**
   * Get all available package managers installed on the system
   * @returns Array of available manager names
   */
  getAvailableManagers(): PackageManagerType[] {
    const managers: PackageManagerType[] = ['pnpm', 'yarn', 'npm', 'bun'];
    const available: PackageManagerType[] = [];

    for (const manager of managers) {
      if (this.isPackageManagerInstalled(manager)) {
        available.push(manager);
      }
    }

    return available;
  }

  /**
   * Check if a specific package manager is installed
   * @param manager - Package manager name
   * @returns True if installed
   */
  isPackageManagerInstalled(manager: PackageManagerType): boolean {
    try {
      execFileSync(manager, ['--version'], {
        stdio: 'pipe',
        shell: false
      });
      return true;
    } catch (err) {
      this.logger.debug('Package manager not installed', {
        manager,
        error: err instanceof Error ? err.message : 'Unknown'
      });
      return false;
    }
  }

  /**
   * Get the lockfile path for a specific package manager
   * @param manager - Package manager name
   * @returns Full path to lockfile
   */
  getLockfilePath(manager: PackageManagerType): string {
    const lockfiles: Record<PackageManagerType, string> = {
      'npm': 'package-lock.json',
      'yarn': 'yarn.lock',
      'pnpm': 'pnpm-lock.yaml',
      'bun': 'bun.lockb'
    };
    return join(this.cwd, lockfiles[manager] ?? 'package-lock.json');
  }

  /**
   * Load configuration from .planning/config.json
   * @returns Configuration object
   */
  loadConfig(): PackageManagerConfig {
    const configPath = join(this.cwd, '.planning', 'config.json');
    try {
      if (existsSync(configPath)) {
        const content = readFileSync(configPath, 'utf-8');
        return JSON.parse(content) as PackageManagerConfig;
      }
    } catch (err) {
      this.logger.warn('Failed to load config', {
        path: configPath,
        error: err instanceof Error ? err.message : 'Unknown'
      });
    }
    return {};
  }
}

// ─── Default Export ─────────────────────────────────────────────────────────

export default PackageManagerDetector;
