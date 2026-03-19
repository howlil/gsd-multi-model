#!/usr/bin/env node

/**
 * Package Manager Detector — Auto-detect available package managers
 *
 * Detects package managers (npm, yarn, pnpm) using a multi-layer strategy:
 * 1. Configuration override (.planning/config.json)
 * 2. Lockfile presence (pnpm-lock.yaml, yarn.lock, package-lock.json)
 * 3. System availability (which pnpm/yarn/npm)
 * 4. Fallback to npm (always available with Node)
 *
 * Usage:
 *   const PackageManagerDetector = require('./package-manager-detector.cjs');
 *   const detector = new PackageManagerDetector(cwd);
 *   const result = detector.detect();
 *   // Returns: { manager, source, confidence, lockfilePath? }
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const Logger = require('./logger.cjs');

/**
 * Package Manager Detector class
 * Detects available package managers with priority-based strategy
 */
class PackageManagerDetector {
  /**
   * Create a PackageManagerDetector instance
   * @param {string} cwd - Working directory (default: process.cwd())
   */
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.logger = new Logger();
    this.config = this.loadConfig();
  }

  /**
   * Detect package manager with priority-based strategy
   * @returns {Object} Detection result { manager, source, confidence, lockfilePath? }
   */
  detect() {
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
      const preferred = availableManagers.find(m => m === 'pnpm') ||
                       availableManagers.find(m => m === 'yarn') ||
                       availableManagers[0];
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
   * @returns {string|null} Package manager name or null
   */
  _detectFromConfig() {
    const configManager = this.config?.packageManager?.default;
    if (configManager && this.isPackageManagerInstalled(configManager)) {
      return configManager;
    }
    return null;
  }

  /**
   * Detect package manager from lockfile presence
   * @returns {string|null} Package manager name or null
   */
  detectFromLockfile() {
    const lockfiles = {
      'pnpm-lock.yaml': 'pnpm',
      'yarn.lock': 'yarn',
      'package-lock.json': 'npm'
    };

    for (const [lockfile, manager] of Object.entries(lockfiles)) {
      const lockfilePath = path.join(this.cwd, lockfile);
      if (fs.existsSync(lockfilePath)) {
        return manager;
      }
    }
    return null;
  }

  /**
   * Get all available package managers installed on the system
   * @returns {string[]} Array of available manager names
   */
  getAvailableManagers() {
    const managers = ['pnpm', 'yarn', 'npm'];
    const available = [];

    for (const manager of managers) {
      if (this.isPackageManagerInstalled(manager)) {
        available.push(manager);
      }
    }

    return available;
  }

  /**
   * Check if a specific package manager is installed
   * @param {string} manager - Package manager name
   * @returns {boolean} True if installed
   */
  isPackageManagerInstalled(manager) {
    try {
      execFileSync(manager, ['--version'], {
        stdio: 'pipe',
        shell: false
      });
      return true;
    } catch (err) {
      this.logger.debug('Package manager not installed', { manager, error: err.message });
      return false;
    }
  }

  /**
   * Get the lockfile path for a specific package manager
   * @param {string} manager - Package manager name
   * @returns {string} Full path to lockfile
   */
  getLockfilePath(manager) {
    const lockfiles = {
      'pnpm': 'pnpm-lock.yaml',
      'yarn': 'yarn.lock',
      'npm': 'package-lock.json'
    };
    return path.join(this.cwd, lockfiles[manager] || 'package-lock.json');
  }

  /**
   * Load configuration from .planning/config.json
   * @returns {Object} Configuration object
   */
  loadConfig() {
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

module.exports = PackageManagerDetector;
