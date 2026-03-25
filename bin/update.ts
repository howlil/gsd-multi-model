#!/usr/bin/env node

/**
 * EZ Agents Update — Check and install updates (OOP Refactored)
 *
 * Usage:
 *   ez-agents-update              # Check for updates
 *   ez-agents-update --check      # Check only
 *   ez-agents-update --force      # Force reinstall
 *   ez-agents-update --changelog  # Show changelog
 *
 * @packageDocumentation
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { BaseCliHandler } from './lib/base-cli-handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_NAME = 'ez-agents';
const REPO_URL = 'https://github.com/howlil/ez-agents.git';

// ─── Updater Class ───────────────────────────────────────────────────────────

/**
 * Main Updater class for EZ Agents
 *
 * @class Updater
 * @extends {BaseCliHandler}
 */
export class Updater extends BaseCliHandler {
  private args: string[];
  private versionChecker: VersionChecker;
  private updateInstaller: UpdateInstaller;
  private changelogReader: ChangelogReader;

  /**
   * Create an Updater instance
   * @param args - Command line arguments (defaults to process.argv.slice(2))
   */
  constructor(args: string[] = process.argv.slice(2)) {
    super();
    this.args = args;
    this.versionChecker = new VersionChecker();
    this.updateInstaller = new UpdateInstaller(this.versionChecker);
    this.changelogReader = new ChangelogReader();
  }

  /**
   * Execute the update command
   */
  execute(): void {
    const command = this.parseCommand();

    switch (command) {
      case 'check':
        this.checkUpdate();
        break;
      case 'install':
        this.installUpdate(false);
        break;
      case 'force':
        this.installUpdate(true);
        break;
      case 'changelog':
        this.showChangelog();
        break;
      case 'help':
      default:
        this.showHelp();
        break;
    }
  }

  /**
   * Parse command from arguments
   * @returns {'check' | 'install' | 'force' | 'changelog' | 'help'} Command to execute
   */
  parseCommand(): 'check' | 'install' | 'force' | 'changelog' | 'help' {
    if (this.args.includes('--help') || this.args.includes('-h')) {
      return 'help';
    }
    if (this.args.includes('--changelog')) {
      return 'changelog';
    }
    if (this.args.includes('--check')) {
      return 'check';
    }
    if (this.args.includes('--force')) {
      return 'force';
    }
    return 'install';
  }

  /**
   * Check for updates
   */
  private checkUpdate(): void {
    const current = this.versionChecker.getCurrentVersion();
    const latest = this.versionChecker.getLatestVersion();

    this.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    this.log(' EZ Agents Update Check', 'bold');
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');

    this.log(`Current version: ${this.colors.bold}v${current}${this.colors.reset}`);

    if (!latest) {
      this.log('Unable to check for updates (no network or repo unavailable)', 'yellow');
      return;
    }

    this.log(`Latest version:  ${this.colors.bold}v${latest}${this.colors.reset}\n`);

    if (current === latest) {
      this.log('✓ You are on the latest version!\n', 'green');
      return;
    }

    this.log(`⚡ Update available: v${current} → v${latest}\n`, 'yellow');
    this.log('To update, run:\n', 'blue');
    this.log(`  npm install -g ${PACKAGE_NAME}@latest\n`, 'green');
    this.log('Or force reinstall:\n', 'blue');
    this.log(`  ez-agents-update --force\n`, 'green');
  }

  /**
   * Install update
   * @param force - Force reinstall even if up-to-date
   */
  private installUpdate(force: boolean): void {
    this.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    this.log(' EZ Agents Update', 'bold');
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');

    try {
      this.updateInstaller.install(force);
      this.log('\n✓ Update complete!\n', 'green');
      this.log('Restart your terminal or run:\n', 'blue');
      this.log(`  ez-agents --version\n`, 'green');
    } catch (error) {
      this.log('\n✗ Update failed\n', 'red');
      this.log('Try manual install:\n', 'yellow');
      this.log(`  npm install -g ${PACKAGE_NAME}@latest\n`, 'blue');
      process.exit(1);
    }
  }

  /**
   * Show changelog
   */
  private showChangelog(): void {
    this.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    this.log(' EZ Agents Changelog', 'bold');
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');

    const content = this.changelogReader.read(50);
    this.log(content);
  }

  /**
   * Show help
   */
  private showHelp(): void {
    this.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ Agents Update — Check and Install Updates
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usage:
  ez-agents-update [options]

Options:
  --check      Check for updates (don't install)
  --force      Force reinstall even if up-to-date
  --changelog  Show changelog
  --help       Show this help message

Examples:
  ez-agents-update              # Check and prompt to update
  ez-agents-update --check      # Check only
  ez-agents-update --force      # Force reinstall
  ez-agents-update --changelog  # View changelog

Manual Update:
  npm install -g ez-agents@latest
`);
  }
}

// ─── VersionChecker Class ────────────────────────────────────────────────────

/**
 * VersionChecker — Checks current and latest versions
 *
 * @class VersionChecker
 */
export class VersionChecker {
  /**
   * Get current installed version
   * @returns {string} Current version
   */
  getCurrentVersion(): string {
    try {
      const pkgPath = path.join(__dirname, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      return pkg.version;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get latest version from npm
   * @returns {string | null} Latest version or null if unavailable
   */
  getLatestVersion(): string | null {
    try {
      const output = execSync(`npm view ${PACKAGE_NAME} version`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 10000,
      });
      return output.trim();
    } catch {
      // Fallback: check GitHub repo
      try {
        const output = execSync(`npm view git+${REPO_URL} version`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
          timeout: 10000,
        });
        return output.trim();
      } catch {
        return null;
      }
    }
  }

  /**
   * Check if update is available
   * @returns {boolean} True if update available
   */
  hasUpdate(): boolean {
    const current = this.getCurrentVersion();
    const latest = this.getLatestVersion();

    if (!latest) {
      return false;
    }

    return current !== latest;
  }
}

// ─── UpdateInstaller Class ───────────────────────────────────────────────────

/**
 * UpdateInstaller — Installs updates
 *
 * @class UpdateInstaller
 */
export class UpdateInstaller {
  private versionChecker: VersionChecker;

  /**
   * Create an UpdateInstaller instance
   * @param versionChecker - VersionChecker instance
   */
  constructor(versionChecker: VersionChecker) {
    this.versionChecker = versionChecker;
  }

  /**
   * Install update
   * @param force - Force reinstall
   */
  install(force: boolean): void {
    const current = this.versionChecker.getCurrentVersion();
    const latest = this.versionChecker.getLatestVersion();

    if (!latest) {
      throw new Error('Unable to check for updates');
    }

    if (current === latest && !force) {
      console.log('Already on latest version');
      return;
    }

    console.log(`Updating: v${current} → v${latest}...`);

    execSync(`npm install -g ${PACKAGE_NAME}@latest`, {
      stdio: 'inherit',
      timeout: 120000,
    });
  }

  /**
   * Force reinstall
   */
  forceInstall(): void {
    this.install(true);
  }

  /**
   * Validate installation
   * @returns {boolean} True if installation successful
   */
  validateInstall(): boolean {
    try {
      const output = execSync(`npm list -g ${PACKAGE_NAME}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      return output.includes(PACKAGE_NAME);
    } catch {
      return false;
    }
  }
}

// ─── ChangelogReader Class ───────────────────────────────────────────────────

/**
 * ChangelogReader — Reads and formats changelog
 *
 * @class ChangelogReader
 */
export class ChangelogReader {
  /**
   * Read changelog
   * @param maxLines - Maximum lines to read (default: 50)
   * @returns {string} Formatted changelog
   */
  read(maxLines: number = 50): string {
    try {
      const changelogPath = path.join(__dirname, 'CHANGELOG.md');

      if (fs.existsSync(changelogPath)) {
        const content = fs.readFileSync(changelogPath, 'utf-8');
        const lines = content.split('\n').slice(0, maxLines);
        return lines.join('\n');
      } else {
        return `CHANGELOG.md not found\n\nView online: ${REPO_URL}/blob/main/CHANGELOG.md\n`;
      }
    } catch {
      return 'Unable to read changelog';
    }
  }

  /**
   * Get latest version from changelog
   * @returns {string} Latest version
   */
  getLatestVersion(): string {
    try {
      const changelogPath = path.join(__dirname, 'CHANGELOG.md');
      if (fs.existsSync(changelogPath)) {
        const content = fs.readFileSync(changelogPath, 'utf-8');
        const match = content.match(/## \[(\d+\.\d+\.\d+)\]/);
        if (match && match[1]) {
          return match[1];
        }
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

// Create and execute updater
const updater = new Updater();
updater.execute();
