/**
 * Package Manager — Detects and executes package manager operations
 *
 * Supports multiple package managers:
 * - npm
 * - yarn
 * - pnpm
 * - bun
 *
 * Detection priority:
 * 1. Lockfile presence (pnpm-lock.yaml, yarn.lock, etc.)
 * 2. System availability (which pnpm/yarn/bun)
 * 3. Fallback to npm (always available with Node.js)
 *
 * @class PackageManager
 */
export class PackageManager {
  private fs: any;
  private path: any;
  private childProcess: any;
  private cwd: string;

  /**
   * Create a PackageManager instance
   * @param cwd - Current working directory (defaults to process.cwd())
   */
  constructor(cwd: string = process.cwd()) {
    this.fs = require('fs');
    this.path = require('path');
    this.childProcess = require('child_process');
    this.cwd = cwd;
  }

  /**
   * Detect the package manager in use
   * @returns {'npm' | 'yarn' | 'pnpm' | 'bun'} The detected package manager
   */
  detect(): 'npm' | 'yarn' | 'pnpm' | 'bun' {
    // Check for lockfiles
    const lockfiles: Record<string, 'npm' | 'yarn' | 'pnpm' | 'bun'> = {
      'pnpm-lock.yaml': 'pnpm',
      'yarn.lock': 'yarn',
      'package-lock.json': 'npm',
      'bun.lockb': 'bun',
    };

    for (const [lockfile, manager] of Object.entries(lockfiles)) {
      const lockfilePath = this.path.join(this.cwd, lockfile);
      if (this.fs.existsSync(lockfilePath)) {
        return manager;
      }
    }

    // Check system availability
    try {
      this.childProcess.execSync('which pnpm', { stdio: 'ignore' });
      return 'pnpm';
    } catch {
      // Continue to next check
    }

    try {
      this.childProcess.execSync('which yarn', { stdio: 'ignore' });
      return 'yarn';
    } catch {
      // Continue to next check
    }

    try {
      this.childProcess.execSync('which bun', { stdio: 'ignore' });
      return 'bun';
    } catch {
      // Continue to next check
    }

    // Fallback to npm (always available with Node.js)
    return 'npm';
  }

  /**
   * Install packages using the detected package manager
   * @param packages - Array of package names to install
   * @param global - Whether to install globally (default: false)
   * @throws {Error} If installation fails
   */
  install(packages: string[], global: boolean = false): void {
    const manager = this.detect();
    const args = this.getInstallArgs(manager, packages, global);

    try {
      this.childProcess.execSync(`${manager} ${args.join(' ')}`, {
        stdio: 'inherit',
        cwd: this.cwd,
      });
    } catch (error) {
      throw new Error(`Failed to install packages with ${manager}: ${(error as Error).message}`);
    }
  }

  /**
   * Run a command using the detected package manager
   * @param command - The command to run (e.g., 'build', 'test')
   * @returns The command output
   * @throws {Error} If command execution fails
   */
  run(command: string): string {
    const manager = this.detect();
    const args = this.getRunArgs(manager, command);

    try {
      return this.childProcess.execSync(`${manager} ${args.join(' ')}`, {
        encoding: 'utf-8',
        cwd: this.cwd,
      });
    } catch (error) {
      throw new Error(`Failed to run command '${command}' with ${manager}: ${(error as Error).message}`);
    }
  }

  /**
   * Get install arguments for a package manager
   * @param manager - The package manager
   * @param packages - Packages to install
   * @param global - Whether to install globally
   * @returns Array of arguments
   * @private
   */
  private getInstallArgs(
    manager: string,
    packages: string[],
    global: boolean
  ): string[] {
    const args: string[] = ['install'];

    if (global) {
      args.push('-g');
    }

    if (packages.length > 0) {
      args.push(...packages);
    }

    return args;
  }

  /**
   * Get run arguments for a package manager
   * @param manager - The package manager
   * @param command - The command to run
   * @returns Array of arguments
   * @private
   */
  private getRunArgs(manager: string, command: string): string[] {
    // npm and yarn use 'run' for scripts
    if (manager === 'npm' || manager === 'yarn') {
      return ['run', command];
    }

    // pnpm and bun can run scripts directly
    return [command];
  }
}
