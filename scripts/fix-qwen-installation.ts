#!/usr/bin/env node

/**
 * Fix Qwen Code Installation (OOP Refactored)
 *
 * This script fixes the Qwen Code installation by copying ez-agents commands
 * to the correct ~/.qwen/commands/ez/ directory instead of ~/.qwen/skills/
 *
 * Usage: node fix-qwen-installation.ts
 *
 * @packageDocumentation
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BaseCliHandler } from '../bin/lib/base-cli-handler.js';
import { FileOperations } from '../bin/lib/file-operations.js';
import { ConfigDirectoryResolver } from '../bin/lib/config-directory-resolver.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

/**
 * Installation status interface
 */
export interface InstallationStatus {
  /** Whether ez-agents is installed */
  installed: boolean;
  /** Installation path */
  path: string | null;
  /** Existing skill directories */
  skills: string[];
}

/**
 * Verification result interface
 */
export interface VerificationResult {
  /** Whether verification passed */
  passed: boolean;
  /** Number of commands found */
  commandCount: number;
}

// ─── QwenFixer Class ─────────────────────────────────────────────────────────

/**
 * QwenFixer — Main class for fixing Qwen installation
 *
 * @class QwenFixer
 * @extends {BaseCliHandler}
 */
export class QwenFixer extends BaseCliHandler {
  private diagnosticService: DiagnosticService;
  private repairService: RepairService;
  private qwenDir: string;
  private commandsDir: string;

  /**
   * Create a QwenFixer instance
   */
  constructor() {
    super();
    const fileOps = new FileOperations();
    this.diagnosticService = new DiagnosticService(fileOps);
    this.repairService = new RepairService(fileOps);
    this.qwenDir = this.getQwenDirectory();
    this.commandsDir = path.join(this.qwenDir, 'commands', 'ez');
  }

  /**
   * Execute the fix process
   */
  execute(): void {
    this.log('Fixing Qwen Code Installation', 'cyan');
    this.log('');

    // Step 1: Create commands directory
    this.log('Step 1: Creating commands directory', 'cyan');
    const ezCommandsDir = this.repairService.createCommandsDirectory(this.qwenDir);
    this.log(`✓ Created ${ezCommandsDir}`, 'green');
    this.log('');

    // Step 2: Copy workflow files
    this.log('Step 2: Copying ez-agents commands', 'cyan');
    const status = this.diagnosticService.validateInstallation();
    const sourceDir = status.path && fs.existsSync(path.join(status.path, 'workflows'))
      ? path.join(status.path, 'workflows')
      : null;

    if (sourceDir && fs.existsSync(sourceDir)) {
      const count = this.repairService.copyWorkflows(sourceDir, this.commandsDir);
      this.log(`\n✓ Copied ${count} commands\n`, 'green');
    } else {
      this.log('Note: No workflows found to copy', 'yellow');
      this.log(`The commands will be available after running ${this.colors.cyan}ez-agents --qwen --global${this.colors.reset} again\n`);
    }

    // Step 3: Verify installation
    this.log('Step 3: Verifying installation', 'cyan');
    this.verifyInstallation();
  }

  /**
   * Get Qwen directory path
   * @returns {string} Qwen config directory
   */
  getQwenDirectory(): string {
    const resolver = new ConfigDirectoryResolver('qwen', process.env.QWEN_CONFIG_DIR || null);
    return resolver.resolve(true);
  }

  /**
   * Verify installation
   */
  private verifyInstallation(): void {
    if (fs.existsSync(this.commandsDir)) {
      const commandFiles = fs.readdirSync(this.commandsDir).filter(f => f.endsWith('.md'));
      this.log(`✓ Found ${commandFiles.length} command files in ${this.commandsDir}`, 'green');

      if (commandFiles.length > 0) {
        this.log(`\nSuccess! EZ Agents commands are now available in Qwen Code\n`, 'green');
        this.log('Available commands:', 'green');

        // Show first 10 commands
        const sampleCommands = commandFiles.slice(0, 10).map(f => f.replace('.md', ''));
        sampleCommands.forEach(cmd => {
          this.log(`  ${this.colors.cyan}/ez:${cmd}${this.colors.reset}`);
        });

        if (commandFiles.length > 10) {
          this.log(`  ... and ${commandFiles.length - 10} more`);
        }

        this.log(`\nUsage:`, 'green');
        this.log(`  Open a project in Qwen Code and run:`, 'blue');
        this.log(`  ${this.colors.cyan}/ez:help${this.colors.reset} - Show all available commands`, 'blue');
        this.log(`  ${this.colors.cyan}/ez:new-project${this.colors.reset} - Initialize new project`, 'blue');
        this.log(`  ${this.colors.cyan}/ez:quick${this.colors.reset} - Quick start\n`, 'blue');
      }
    } else {
      this.log('✗ Commands directory not created', 'red');
    }

    this.log('Note: You may need to restart Qwen Code for changes to take effect\n', 'cyan');
  }
}

// ─── DiagnosticService Class ─────────────────────────────────────────────────

/**
 * DiagnosticService — Diagnoses installation issues
 *
 * @class DiagnosticService
 */
export class DiagnosticService {
  private fileOps: FileOperations;

  /**
   * Create a DiagnosticService instance
   * @param fileOps - FileOperations instance
   */
  constructor(fileOps: FileOperations) {
    this.fileOps = fileOps;
  }

  /**
   * Find ez-agents installation
   * @param qwenDir - Qwen config directory
   * @returns {string | null} Installation path or null
   */
  findInstallation(qwenDir: string): string | null {
    const possibleLocations = [
      path.join(qwenDir, 'ez-agents'),
      path.join(qwenDir, '.ez-agents'),
      path.join(os.homedir(), '.ez-agents'),
    ];

    for (const loc of possibleLocations) {
      if (this.fileOps.directoryExists(loc)) {
        return loc;
      }
    }

    return null;
  }

  /**
   * Find existing skill directories
   * @param qwenDir - Qwen config directory
   * @returns {string[]} Array of skill directory names
   */
  findSkills(qwenDir: string): string[] {
    const skillsDir = path.join(qwenDir, 'skills');

    if (!this.fileOps.directoryExists(skillsDir)) {
      return [];
    }

    try {
      const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
      return entries
        .filter(d => d.isDirectory() && d.name.startsWith('ez-'))
        .map(d => d.name);
    } catch {
      return [];
    }
  }

  /**
   * Validate installation status
   * @returns {InstallationStatus} Installation status
   */
  validateInstallation(): InstallationStatus {
    const qwenDir = process.env.QWEN_CONFIG_DIR
      ? path.resolve(process.env.QWEN_CONFIG_DIR)
      : path.join(os.homedir(), '.qwen');

    const installationPath = this.findInstallation(qwenDir);
    const skills = this.findSkills(qwenDir);

    return {
      installed: installationPath !== null,
      path: installationPath,
      skills,
    };
  }
}

// ─── RepairService Class ─────────────────────────────────────────────────────

/**
 * RepairService — Repairs installation issues
 *
 * @class RepairService
 */
export class RepairService {
  private fileOps: FileOperations;

  /**
   * Create a RepairService instance
   * @param fileOps - FileOperations instance
   */
  constructor(fileOps: FileOperations) {
    this.fileOps = fileOps;
  }

  /**
   * Create commands directory
   * @param qwenDir - Qwen config directory
   * @returns {string} Commands directory path
   */
  createCommandsDirectory(qwenDir: string): string {
    const ezCommandsDir = path.join(qwenDir, 'commands', 'ez');
    this.fileOps.ensureDirectory(ezCommandsDir);
    return ezCommandsDir;
  }

  /**
   * Copy workflow files
   * @param sourceDir - Source directory
   * @param destDir - Destination directory
   * @returns {number} Number of files copied
   */
  copyWorkflows(sourceDir: string, destDir: string): number {
    const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.md'));
    let count = 0;

    for (const file of files) {
      const srcFile = path.join(sourceDir, file);
      const destFile = path.join(destDir, file);

      try {
        let content = this.fileOps.readFile(srcFile);

        // Update references from skills/ to commands/
        content = content.replace(/~\/\.qwen\/skills\//g, '~/.qwen/commands/');
        content = content.replace(/\.qwen\/skills\//g, '.qwen/commands/');

        this.fileOps.writeFile(destFile, content);
        console.log(`✓ Copied ${file}`);
        count++;
      } catch (error) {
        console.warn(`✗ Failed to copy ${file}: ${(error as Error).message}`);
      }
    }

    return count;
  }

  /**
   * Update references in content
   * @param content - File content
   * @returns {string} Updated content
   */
  updateReferences(content: string): string {
    return content
      .replace(/~\/\.qwen\/skills\//g, '~/.qwen/commands/')
      .replace(/\.qwen\/skills\//g, '.qwen/commands/');
  }
}

// ─── InstallationVerifier Class ──────────────────────────────────────────────

/**
 * InstallationVerifier — Verifies installation
 *
 * @class InstallationVerifier
 */
export class InstallationVerifier {
  /**
   * Verify installation
   * @param commandsDir - Commands directory
   * @returns {VerificationResult} Verification result
   */
  verify(commandsDir: string): VerificationResult {
    if (!fs.existsSync(commandsDir)) {
      return { passed: false, commandCount: 0 };
    }

    const commandFiles = fs.readdirSync(commandsDir).filter(f => f.endsWith('.md'));
    return {
      passed: commandFiles.length > 0,
      commandCount: commandFiles.length,
    };
  }

  /**
   * List available commands
   * @param commandsDir - Commands directory
   * @returns {string[]} Array of command names
   */
  listCommands(commandsDir: string): string[] {
    if (!fs.existsSync(commandsDir)) {
      return [];
    }

    return fs.readdirSync(commandsDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''));
  }
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

const fixer = new QwenFixer();
fixer.execute();
