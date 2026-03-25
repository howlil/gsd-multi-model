#!/usr/bin/env node

/**
 * Build Hooks — Copy EZ hooks to dist for installation (OOP Refactored)
 *
 * Hooks are compiled by tsup to dist/hooks/, then copied to hooks/dist/ for installation.
 *
 * @packageDocumentation
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { BaseCliHandler } from '../bin/lib/base-cli-handler.js';
import { FileOperations } from '../bin/lib/file-operations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Type Definitions ────────────────────────────────────────────────────────

/**
 * Hook definition interface
 */
export interface HookDefinition {
  /** Hook filename */
  name: string;
  /** Source directory path */
  source: string;
  /** Destination directory path */
  destination: string;
}

// ─── BuildHookManager Class ──────────────────────────────────────────────────

/**
 * BuildHookManager — Manages build hook copying
 *
 * @class BuildHookManager
 * @extends {BaseCliHandler}
 */
export class BuildHookManager extends BaseCliHandler {
  private hookCopier: HookCopier;
  private hooksSrcDir: string;
  private hooksDestDir: string;

  /**
   * Create a BuildHookManager instance
   */
  constructor() {
    super();
    const fileOps = new FileOperations();
    this.hookCopier = new HookCopier(fileOps);
    this.hooksSrcDir = path.join(__dirname, '..', 'dist', 'hooks');
    this.hooksDestDir = path.join(__dirname, '..', 'hooks', 'dist');
  }

  /**
   * Execute the build process
   */
  execute(): void {
    const hooks = this.getHooks();
    const count = this.hookCopier.copyAllHooks(hooks);
    this.log(`\nBuild complete. Copied ${count} hook(s).`, 'green');
  }

  /**
   * Get list of hooks to copy
   * @returns {HookDefinition[]} Array of hook definitions
   */
  getHooks(): HookDefinition[] {
    return [
      {
        name: 'ez-check-update.js',
        source: this.hooksSrcDir,
        destination: this.hooksDestDir,
      },
      {
        name: 'ez-context-monitor.js',
        source: this.hooksSrcDir,
        destination: this.hooksDestDir,
      },
      {
        name: 'ez-statusline.js',
        source: this.hooksSrcDir,
        destination: this.hooksDestDir,
      },
    ];
  }
}

// ─── HookCopier Class ────────────────────────────────────────────────────────

/**
 * HookCopier — Copies hook files
 *
 * @class HookCopier
 */
export class HookCopier {
  private fileOps: FileOperations;

  /**
   * Create a HookCopier instance
   * @param fileOps - FileOperations instance
   */
  constructor(fileOps: FileOperations) {
    this.fileOps = fileOps;
  }

  /**
   * Copy a single hook
   * @param hook - Hook definition
   * @returns {boolean} True if successful
   */
  copyHook(hook: HookDefinition): boolean {
    if (!this.validateSource(hook)) {
      console.warn(`Warning: ${hook.name} not found in ${hook.source}, skipping`);
      return false;
    }

    const srcPath = path.join(hook.source, hook.name);
    const destPath = path.join(hook.destination, hook.name);

    try {
      console.log(`Copying ${hook.name}...`);
      this.fileOps.copyFile(srcPath, destPath);
      console.log(`  → ${destPath}`);
      return true;
    } catch (error) {
      console.warn(`Warning: Failed to copy ${hook.name}: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Copy all hooks
   * @param hooks - Array of hook definitions
   * @returns {number} Number of successfully copied hooks
   */
  copyAllHooks(hooks: HookDefinition[]): number {
    let count = 0;

    // Ensure destination directory exists
    if (hooks.length > 0 && hooks[0]) {
      this.fileOps.ensureDirectory(hooks[0].destination);
    }

    // Check if source directory exists
    if (hooks.length > 0 && hooks[0] && !this.fileOps.directoryExists(hooks[0].source)) {
      console.warn('Warning: dist/hooks/ not found. Run npm run build first.');
      return 0;
    }

    for (const hook of hooks) {
      if (this.copyHook(hook)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Validate hook source exists
   * @param hook - Hook definition
   * @returns {boolean} True if source exists
   */
  validateSource(hook: HookDefinition): boolean {
    const srcPath = path.join(hook.source, hook.name);
    return this.fileOps.fileExists(srcPath);
  }
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

const manager = new BuildHookManager();
manager.execute();
