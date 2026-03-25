/**
 * Lockfile Validator — Validate package manager lockfiles
 *
 * Validates lockfile integrity for npm, yarn, and pnpm:
 * - npm: package-lock.json (JSON format with lockfileVersion)
 * - yarn: yarn.lock (YAML-like format with metadata header)
 * - pnpm: pnpm-lock.yaml (YAML format with lockfileVersion)
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { defaultLogger as logger } from './logger.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

export type PackageManagerType = 'npm' | 'yarn' | 'pnpm' | 'bun';

export interface LockfileValidationResult {
  valid: boolean;
  reason?: string;
  message?: string;
  lockfileVersion?: number;
  packageCount?: number;
  entryCount?: number;
}

export interface LockfileConfig {
  cwd?: string;
}

// ─── Lockfile Validator Class ───────────────────────────────────────────────

/**
 * Lockfile Validator class
 * Validates lockfile integrity for different package managers
 */
export class LockfileValidator {
  private readonly cwd: string;

  /**
   * Create a LockfileValidator instance
   * @param config - Configuration options
   */
  constructor(config: LockfileConfig = {}) {
    this.cwd = config.cwd ?? process.cwd();
  }

  /**
   * Validate lockfile for a specific package manager
   * @param manager - Package manager name ('npm', 'yarn', or 'pnpm')
   * @returns Validation result with typed fields
   */
  validate(manager: PackageManagerType): LockfileValidationResult {
    const lockfilePath = this.getLockfilePath(manager);

    logger.debug('Validating lockfile', {
      manager,
      lockfilePath,
      cwd: this.cwd
    });

    // Check file existence
    if (!existsSync(lockfilePath)) {
      logger.debug('Lockfile not found', { lockfilePath });
      return {
        valid: false,
        reason: 'lockfile_missing',
        message: `No ${join(lockfilePath, '..').split('\\').pop()}/${lockfilePath.split('\\').pop()} found`
      };
    }

    try {
      const content = readFileSync(lockfilePath, 'utf-8');

      switch (manager) {
        case 'npm':
          return this.validateNpmLockfile(content);
        case 'yarn':
          return this.validateYarnLockfile(content);
        case 'pnpm':
          return this.validatePnpmLockfile(content);
        default:
          return {
            valid: false,
            reason: 'unknown_manager',
            message: `Unknown package manager: ${manager}`
          };
      }
    } catch (err) {
      logger.error('Lockfile read error', {
        manager,
        lockfilePath,
        error: err instanceof Error ? err.message : 'Unknown'
      });
      return {
        valid: false,
        reason: 'read_error',
        message: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate npm lockfile (package-lock.json)
   * @param content - Lockfile content
   * @returns Validation result
   */
  private validateNpmLockfile(content: string): LockfileValidationResult {
    try {
      const lockfile = JSON.parse(content);

      // Check required fields
      if (!lockfile.lockfileVersion) {
        return {
          valid: false,
          reason: 'invalid_format',
          message: 'Missing lockfileVersion field'
        };
      }

      if (!lockfile.packages && !lockfile.dependencies) {
        return {
          valid: false,
          reason: 'empty_lockfile',
          message: 'Lockfile has no dependencies'
        };
      }

      const packageCount = Object.keys(lockfile.packages ?? lockfile.dependencies ?? {}).length;

      logger.debug('npm lockfile valid', {
        lockfileVersion: lockfile.lockfileVersion,
        packageCount
      });

      return {
        valid: true,
        lockfileVersion: lockfile.lockfileVersion,
        packageCount
      };
    } catch (err) {
      logger.debug('npm lockfile invalid JSON', { error: err instanceof Error ? err.message : 'Unknown' });
      return {
        valid: false,
        reason: 'invalid_json',
        message: `Invalid JSON: ${err instanceof Error ? err.message : 'Unknown'}`
      };
    }
  }

  /**
   * Validate yarn lockfile (yarn.lock)
   * @param content - Lockfile content
   * @returns Validation result
   */
  private validateYarnLockfile(content: string): LockfileValidationResult {
    // Yarn lockfile is YAML-like format
    // Check for basic structure: __metadata__ (Yarn 2+) or "# yarn lockfile v" (Yarn 1)
    const hasYarn2Metadata = content.includes('__metadata:');
    const hasYarn1Header = /^# yarn lockfile v/i.test(content);

    if (!hasYarn2Metadata && !hasYarn1Header) {
      logger.debug('yarn lockfile invalid format');
      return {
        valid: false,
        reason: 'invalid_format',
        message: 'Invalid yarn.lock format'
      };
    }

    // Count dependency entries (lines starting with package name pattern)
    const entryCount = (content.match(/^"?[^@\s]+@/gm) || []).length;

    logger.debug('yarn lockfile valid', {
      version: hasYarn2Metadata ? '2+' : '1',
      entryCount
    });

    return {
      valid: true,
      entryCount
    };
  }

  /**
   * Validate pnpm lockfile (pnpm-lock.yaml)
   * @param content - Lockfile content
   * @returns Validation result
   */
  private validatePnpmLockfile(content: string): LockfileValidationResult {
    // Check for lockfileVersion
    const versionMatch = content.match(/^lockfileVersion:\s*(\d+)/m);
    if (!versionMatch) {
      logger.debug('pnpm lockfile missing lockfileVersion');
      return {
        valid: false,
        reason: 'invalid_format',
        message: 'Missing lockfileVersion in pnpm-lock.yaml'
      };
    }

    const lockfileVersion = parseInt(versionMatch[1]!, 10);

    // Count dependency entries (lines starting with "  /" which are package specs)
    const entryCount = (content.match(/^  \/[^:]+:/gm) || []).length;

    logger.debug('pnpm lockfile valid', {
      lockfileVersion,
      entryCount
    });

    return {
      valid: true,
      lockfileVersion,
      entryCount
    };
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
}

// ─── Default Export ─────────────────────────────────────────────────────────

export default LockfileValidator;
