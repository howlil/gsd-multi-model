#!/usr/bin/env node

/**
 * Package Manager Executor — Execute package manager commands
 *
 * Provides unified interface for npm, yarn, pnpm, and bun operations:
 * - install: Install dependencies from lockfile
 * - add: Add new package(s) to project
 * - remove: Remove package(s) from project
 *
 * Cross-platform execution using execFile (not exec) for security
 * and consistent behavior across Windows, macOS, and Linux.
 *
 * Usage:
 *   import { PackageManagerExecutor, PackageManagerError } from './package-manager-executor.js';
 *   const executor = new PackageManagerExecutor('npm', cwd);
 *   await executor.install({ frozenLockfile: true });
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import Logger from './logger.js';

const execFileAsync = promisify(execFile);

// ─── Type Definitions ────────────────────────────────────────────────────────

export type PackageManagerType = 'npm' | 'yarn' | 'pnpm' | 'bun';

export interface InstallOptions {
  production?: boolean | undefined;
  frozenLockfile?: boolean | undefined;
  preferOffline?: boolean | undefined;
}

export interface AddOptions {
  dev?: boolean | undefined;
  peer?: boolean | undefined;
  optional?: boolean | undefined;
  global?: boolean | undefined;
}

export interface RemoveOptions {
  global?: boolean | undefined;
}

export interface ExecutorConfig {
  cwd?: string;
  timeout?: number;
  maxBuffer?: number;
}

// ─── Error Class ────────────────────────────────────────────────────────────

/**
 * Custom error class for package manager operations
 */
export class PackageManagerError extends Error {
  public readonly manager: PackageManagerType;
  public readonly cmd: string;
  public readonly args: string[];
  public readonly stderr?: string | undefined;
  public readonly stdout?: string | undefined;

  constructor({
    manager,
    cmd,
    args,
    error,
    stderr,
    stdout
  }: {
    manager: PackageManagerType;
    cmd: string;
    args: string[];
    error: string;
    stderr?: string | undefined;
    stdout?: string | undefined;
  }) {
    const message = `[${manager}] ${cmd} ${args.join(' ')} failed: ${error}${stderr ? `\n${stderr}` : ''}`;
    super(message);
    this.name = 'PackageManagerError';
    this.manager = manager;
    this.cmd = cmd;
    this.args = args;
    this.stderr = stderr;
    this.stdout = stdout;
  }
}

// ─── Package Manager Executor Class ─────────────────────────────────────────

/**
 * Package Manager Executor class
 * Executes package manager commands with cross-platform compatibility
 */
export class PackageManagerExecutor {
  private readonly manager: PackageManagerType;
  private readonly cwd: string;
  private readonly logger: Logger;
  private readonly timeout: number;
  private readonly maxBuffer: number;

  /**
   * Create a PackageManagerExecutor instance
   * @param manager - Package manager name ('npm', 'yarn', 'pnpm', or 'bun')
   * @param config - Configuration options
   */
  constructor(manager: PackageManagerType, config: ExecutorConfig = {}) {
    if (!['npm', 'yarn', 'pnpm', 'bun'].includes(manager)) {
      throw new Error(`Unknown package manager: ${manager}. Must be 'npm', 'yarn', 'pnpm', or 'bun'`);
    }

    this.manager = manager;
    this.cwd = config.cwd ?? process.cwd();
    this.logger = new Logger();
    this.timeout = config.timeout ?? 300000; // 5 minutes
    this.maxBuffer = config.maxBuffer ?? 10 * 1024 * 1024; // 10MB buffer
  }

  /**
   * Execute install command
   * @param options - Install options
   * @returns Command output
   */
  async install(options: InstallOptions = {}): Promise<string> {
    const { production, frozenLockfile, preferOffline } = options;

    const args = this._buildInstallArgs({ production, frozenLockfile, preferOffline });

    this.logger.info('Package manager install', {
      manager: this.manager,
      args: args.join(' '),
      cwd: this.cwd
    });

    return await this._execute(this.manager, args);
  }

  /**
   * Add package(s) to project
   * @param packages - Package names to add
   * @param options - Add options
   * @returns Command output
   */
  async add(packages: string[], options: AddOptions = {}): Promise<string> {
    const { dev, peer, optional, global } = options;

    const args = this._buildAddArgs(packages, { dev, peer, optional, global });

    this.logger.info('Package manager add', {
      manager: this.manager,
      packages,
      args: args.join(' '),
      cwd: this.cwd
    });

    return await this._execute(this.manager, args);
  }

  /**
   * Remove package(s) from project
   * @param packages - Package names to remove
   * @param options - Remove options
   * @returns Command output
   */
  async remove(packages: string[], options: RemoveOptions = {}): Promise<string> {
    const { global } = options;

    const args = this._buildRemoveArgs(packages, { global });

    this.logger.info('Package manager remove', {
      manager: this.manager,
      packages,
      args: args.join(' '),
      cwd: this.cwd
    });

    return await this._execute(this.manager, args);
  }

  /**
   * Build install arguments for package manager
   * @private
   * @param options - Install options
   * @returns Command arguments
   */
  private _buildInstallArgs(options: InstallOptions = {}): string[] {
    const { production, frozenLockfile, preferOffline } = options;
    const args: string[] = ['install'];

    // Package-manager-specific production flag
    const prodFlag = this.manager === 'pnpm' ? '--prod' : '--production';

    if (production) args.push(prodFlag);
    if (frozenLockfile) args.push('--frozen-lockfile');
    if (preferOffline) args.push('--prefer-offline');

    return args.filter(Boolean);
  }

  /**
   * Build npm install arguments (deprecated - use _buildInstallArgs)
   * @private
   * @deprecated Use _buildInstallArgs instead
   */
  private _buildNpmInstallArgs(options: InstallOptions = {}): string[] {
    return this._buildInstallArgs(options);
  }

  /**
   * Build yarn install arguments (deprecated - use _buildInstallArgs)
   * @private
   * @deprecated Use _buildInstallArgs instead
   */
  private _buildYarnInstallArgs(options: InstallOptions = {}): string[] {
    return this._buildInstallArgs(options);
  }

  /**
   * Build pnpm install arguments (deprecated - use _buildInstallArgs)
   * @private
   * @deprecated Use _buildInstallArgs instead
   */
  private _buildPnpmInstallArgs(options: InstallOptions = {}): string[] {
    return this._buildInstallArgs(options);
  }

  /**
   * Build bun install arguments (deprecated - use _buildInstallArgs)
   * @private
   * @deprecated Use _buildInstallArgs instead
   */
  private _buildBunInstallArgs(options: InstallOptions = {}): string[] {
    return this._buildInstallArgs(options);
  }

  /**
   * Build add arguments for specific package manager
   * @private
   * @param packages - Package names
   * @param options - Add options
   * @returns Command arguments
   */
  private _buildAddArgs(packages: string[], options: AddOptions = {}): string[] {
    const { dev, peer, optional, global } = options;

    // Package-manager-specific configuration
    const config = {
      npm: { baseCmd: 'install', globalCmd: '-g', devFlag: '--save-dev', peerFlag: '--save-peer', optionalFlag: '--save-optional' },
      yarn: { baseCmd: 'add', globalCmd: 'global', devFlag: '--dev', peerFlag: '--peer', optionalFlag: '--optional' },
      pnpm: { baseCmd: 'add', globalCmd: '-g', devFlag: '--save-dev', peerFlag: '--save-peer', optionalFlag: '--save-optional' },
      bun: { baseCmd: 'add', globalCmd: '-g', devFlag: '--dev', peerFlag: '--peer', optionalFlag: '--optional' },
    } as const;

    const pmConfig = config[this.manager as keyof typeof config] ?? config.npm;
    const args: string[] = [pmConfig.baseCmd];

    if (global) args.push(pmConfig.globalCmd);
    if (dev) args.push(pmConfig.devFlag);
    if (peer) args.push(pmConfig.peerFlag);
    if (optional) args.push(pmConfig.optionalFlag);

    return [...args, ...packages];
  }

  /**
   * Build npm add arguments (deprecated - use _buildAddArgs)
   * @private
   * @deprecated Use _buildAddArgs instead
   */
  private _buildNpmAddArgs(packages: string[], options: AddOptions = {}): string[] {
    return this._buildAddArgs(packages, options);
  }

  /**
   * Build yarn add arguments (deprecated - use _buildAddArgs)
   * @private
   * @deprecated Use _buildAddArgs instead
   */
  private _buildYarnAddArgs(packages: string[], options: AddOptions = {}): string[] {
    return this._buildAddArgs(packages, options);
  }

  /**
   * Build pnpm add arguments (deprecated - use _buildAddArgs)
   * @private
   * @deprecated Use _buildAddArgs instead
   */
  private _buildPnpmAddArgs(packages: string[], options: AddOptions = {}): string[] {
    return this._buildAddArgs(packages, options);
  }

  /**
   * Build bun add arguments (deprecated - use _buildAddArgs)
   * @private
   * @deprecated Use _buildAddArgs instead
   */
  private _buildBunAddArgs(packages: string[], options: AddOptions = {}): string[] {
    return this._buildAddArgs(packages, options);
  }

  /**
   * Build remove arguments for specific package manager
   * @private
   * @param packages - Package names
   * @param options - Remove options
   * @returns Command arguments
   */
  private _buildRemoveArgs(packages: string[], options: RemoveOptions = {}): string[] {
    switch (this.manager) {
      case 'npm':
        return this._buildNpmRemoveArgs(packages, options);
      case 'yarn':
        return this._buildYarnRemoveArgs(packages, options);
      case 'pnpm':
        return this._buildPnpmRemoveArgs(packages, options);
      case 'bun':
        return this._buildBunRemoveArgs(packages, options);
      default:
        throw new Error(`Unknown package manager: ${this.manager}`);
    }
  }

  /**
   * Build npm remove arguments
   * @private
   */
  private _buildNpmRemoveArgs(packages: string[], options: RemoveOptions = {}): string[] {
    const { global } = options;
    const args: string[] = ['uninstall'];

    if (global) args.push('-g');

    return [...args, ...packages];
  }

  /**
   * Build yarn remove arguments
   * @private
   */
  private _buildYarnRemoveArgs(packages: string[], options: RemoveOptions = {}): string[] {
    const { global } = options;
    const args: string[] = ['remove'];

    if (global) args.push('global');

    return [...args, ...packages];
  }

  /**
   * Build pnpm remove arguments
   * @private
   */
  private _buildPnpmRemoveArgs(packages: string[], options: RemoveOptions = {}): string[] {
    const { global } = options;
    const args: string[] = ['remove'];

    if (global) args.push('-g');

    return [...args, ...packages];
  }

  /**
   * Build bun remove arguments
   * @private
   */
  private _buildBunRemoveArgs(packages: string[], options: RemoveOptions = {}): string[] {
    const { global } = options;
    const args: string[] = ['remove'];

    if (global) args.push('-g');

    return [...args, ...packages];
  }

  /**
   * Execute command with cross-platform compatibility
   * @private
   * @param cmd - Command to execute
   * @param args - Command arguments
   * @returns Command output
   */
  private async _execute(cmd: string, args: string[]): Promise<string> {
    const startTime = Date.now();

    this.logger.debug('Package manager command start', {
      manager: this.manager,
      cmd,
      args: args.join(' '),
      cwd: this.cwd
    });

    try {
      const result = await execFileAsync(cmd, args, {
        cwd: this.cwd,
        shell: false, // Use execFile for security (no shell injection)
        maxBuffer: this.maxBuffer,
        timeout: this.timeout
      });

      const duration = Date.now() - startTime;
      this.logger.debug('Package manager command completed', {
        manager: this.manager,
        duration,
        stdout_length: result.stdout?.length ?? 0
      });

      return result.stdout.trim();
    } catch (err) {
      const duration = Date.now() - startTime;
      const error = err as Error & { stderr?: string; stdout?: string };

      this.logger.error('Package manager command failed', {
        manager: this.manager,
        cmd,
        args: args.join(' '),
        duration,
        error: error.message,
        stderr: error.stderr?.trim(),
        stdout: error.stdout?.trim()
      });

      throw new PackageManagerError({
        manager: this.manager,
        cmd,
        args,
        error: error.message,
        stderr: error.stderr?.trim(),
        stdout: error.stdout?.trim()
      });
    }
  }
}

// ─── Default Export ─────────────────────────────────────────────────────────

export default PackageManagerExecutor;
