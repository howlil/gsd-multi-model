#!/usr/bin/env node

/**
 * EZ Agents Update — Check and install updates
 *
 * Usage:
 *   ez-agents-update              # Check for updates
 *   ez-agents-update --check      # Check only
 *   ez-agents-update --force      # Force reinstall
 *   ez-agents-update --changelog  # Show changelog
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PACKAGE_NAME = 'ez-agents';
const REPO_URL = 'https://github.com/howlil/ez-agents.git';

// Colors for output
const colors: Record<string, string> = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  bold: '\x1b[1m'
};

function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Get current installed version
 */
function getCurrentVersion(): string {
  try {
    const pkg = require('./package.json');
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

/**
 * Get latest version from npm
 */
function getLatestVersion(): string | null {
  try {
    const output = execSync(`npm view ${PACKAGE_NAME} version`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 10000 // 10 second timeout
    });
    return output.trim();
  } catch {
    // Fallback: check GitHub repo
    try {
      const output = execSync(`npm view git+${REPO_URL} version`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 10000 // 10 second timeout
      });
      return output.trim();
    } catch {
      return null;
    }
  }
}

/**
 * Check if update is available
 */
function checkUpdate(): boolean {
  const current = getCurrentVersion();
  const latest = getLatestVersion();

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log(' EZ Agents Update Check', 'bold');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');

  log(`Current version: ${colors.bold}v${current}${colors.reset}`);

  if (!latest) {
    log('Unable to check for updates (no network or repo unavailable)', 'yellow');
    return false;
  }

  log(`Latest version:  ${colors.bold}v${latest}${colors.reset}\n`);

  if (current === latest) {
    log('✓ You are on the latest version!\n', 'green');
    return false;
  }

  log(`⚡ Update available: v${current} → v${latest}\n`, 'yellow');
  log('To update, run:\n', 'blue');
  log(`  npm install -g ${PACKAGE_NAME}@latest\n`, 'green');
  log('Or force reinstall:\n', 'blue');
  log(`  ez-agents-update --force\n`, 'green');

  return true;
}

/**
 * Install update
 */
function installUpdate(force = false): void {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log(' EZ Agents Update', 'bold');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');

  const current = getCurrentVersion();
  const latest = getLatestVersion();

  if (!latest) {
    log('Unable to check for updates', 'red');
    process.exit(1);
  }

  if (current === latest && !force) {
    log('Already on latest version', 'green');
    return;
  }

  log(`Updating: v${current} → v${latest}...\n`, 'blue');

  try {
    execSync(`npm install -g ${PACKAGE_NAME}@latest`, {
      stdio: 'inherit',
      timeout: 120000 // 2 minute timeout for npm install
    });

    log('\n✓ Update complete!\n', 'green');
    log('Restart your terminal or run:\n', 'blue');
    log(`  ez-agents --version\n`, 'green');
  } catch (err) {
    log('\n✗ Update failed\n', 'red');
    log('Try manual install:\n', 'yellow');
    log(`  npm install -g ${PACKAGE_NAME}@latest\n`, 'blue');
    process.exit(1);
  }
}

/**
 * Show changelog
 */
function showChangelog(): void {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log(' EZ Agents Changelog', 'bold');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');

  try {
    const changelogPath = path.join(__dirname, 'CHANGELOG.md');

    if (fs.existsSync(changelogPath)) {
      const content = fs.readFileSync(changelogPath, 'utf-8');
      // Show first 50 lines
      const lines = content.split('\n').slice(0, 50);
      log(lines.join('\n'));
    } else {
      log('CHANGELOG.md not found', 'yellow');
      log(`\nView online: ${REPO_URL}/blob/main/CHANGELOG.md\n`, 'blue');
    }
  } catch (err) {
    log('Unable to read changelog', 'red');
  }
}

/**
 * Show help
 */
function showHelp(): void {
  log(`
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

// Main
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
} else if (args.includes('--changelog')) {
  showChangelog();
} else if (args.includes('--check')) {
  checkUpdate();
} else if (args.includes('--force')) {
  installUpdate(true);
} else {
  const hasUpdate = checkUpdate();
  if (hasUpdate) {
    // Auto-prompt (simple version)
    log('Run "ez-agents-update --force" to update now\n');
  }
}
