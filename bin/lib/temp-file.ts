#!/usr/bin/env node

/**
 * EZ Temp File — Secure temporary file handler
 *
 * Creates secure temp files with fs.mkdtemp(), automatic cleanup on exit,
 * and path validation to prevent traversal attacks.
 *
 * Usage:
 *   import { createTempFile, cleanupAll } from './temp-file.js';
 *   const tempFile = await createTempFile('prefix-');
 *   // ... use temp file ...
 *   // Automatically cleaned up on process exit
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import Logger from './logger.js';

const logger = new Logger();

// ─── Type Definitions ────────────────────────────────────────────────────────

/**
 * Temp resource type
 */
export type TempResourceType = 'file' | 'dir';

/**
 * Temp resource tracking object
 */
export interface TempResource {
  type: TempResourceType;
  path: string;
}

/**
 * Options for temp file operations
 */
export interface TempFileOptions {
  validateBase?: string;
}

/**
 * Result of temp file creation with cleanup function
 */
export interface TempFileResult {
  path: string;
  cleanup: () => Promise<void>;
}

// ─── Module State ────────────────────────────────────────────────────────────

// Track all created temp resources for cleanup
const tempResources = new Set<TempResource>();
let cleanupRegistered = false;

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Generate a secure random suffix for temp names
 * @returns Random hex string
 */
export function generateSecureSuffix(): string {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Validate that a path is safe (no traversal attacks)
 * @param basePath - Base directory
 * @param targetPath - Target path to validate
 * @returns True if safe
 */
export function isPathSafe(basePath: string, targetPath: string): boolean {
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(targetPath);

  // Ensure target starts with base (is inside base)
  const normalizedBase = resolvedBase + path.sep;
  return resolvedTarget === resolvedBase ||
         resolvedTarget.startsWith(normalizedBase);
}

/**
 * Register cleanup handlers (called automatically)
 */
function registerCleanup(): void {
  if (cleanupRegistered) return;
  cleanupRegistered = true;

  const cleanupHandler = async () => {
    if (tempResources.size > 0) {
      await cleanupAll();
    }
  };

  // Register for various exit scenarios
  process.on('exit', () => {
    // Synchronous cleanup for exit event
    if (tempResources.size > 0) {
      logger.debug('Synchronous temp cleanup on exit');
    }
  });

  process.on('SIGINT', async () => {
    await cleanupHandler();
    process.exit(130);
  });

  process.on('SIGTERM', async () => {
    await cleanupHandler();
    process.exit(143);
  });

  process.on('beforeExit', async () => {
    await cleanupHandler();
  });

  // Handle uncaught errors
  process.on('uncaughtException', async (err) => {
    logger.error('Uncaught exception, cleaning up temps...', {
      error: err instanceof Error ? err.message : 'Unknown'
    });
    await cleanupHandler();
    process.exit(1);
  });

  logger.debug('Temp cleanup handlers registered');
}

// ─── Main Functions ──────────────────────────────────────────────────────────

/**
 * Create a secure temporary directory
 * @param prefix - Prefix for temp directory name
 * @param customBase - Custom base directory (default: os.tmpdir())
 * @returns Path to created temp directory
 */
export async function createTempDir(prefix = 'ez-', customBase: string | null = null): Promise<string> {
  const baseDir = customBase || os.tmpdir();
  const tempPath = await fs.promises.mkdtemp(path.join(baseDir, prefix));

  logger.debug(`Created temp directory: ${tempPath}`);
  tempResources.add({ type: 'dir', path: tempPath });

  registerCleanup();

  return tempPath;
}

/**
 * Create a secure temporary file
 * @param prefix - Prefix for temp file name
 * @param customBase - Custom base directory (default: os.tmpdir())
 * @param content - Optional initial content
 * @returns Path to created temp file
 */
export async function createTempFile(
  prefix = 'ez-',
  customBase: string | null = null,
  content = ''
): Promise<string> {
  const baseDir = customBase || os.tmpdir();
  const fileName = `${prefix}${generateSecureSuffix()}`;
  const tempPath = path.join(baseDir, fileName);

  await fs.promises.writeFile(tempPath, content, 'utf-8');

  logger.debug(`Created temp file: ${tempPath}`);
  tempResources.add({ type: 'file', path: tempPath });

  registerCleanup();

  return tempPath;
}

/**
 * Create a temp file and return with cleanup function
 * @param prefix - Prefix for temp file name
 * @param customBase - Custom base directory (default: os.tmpdir())
 * @param content - Optional initial content
 * @returns TempFileResult with path and cleanup function
 */
export async function createTempFileWithCleanup(
  prefix = 'ez-',
  customBase: string | null = null,
  content = ''
): Promise<TempFileResult> {
  const tempPath = await createTempFile(prefix, customBase, content);

  return {
    path: tempPath,
    cleanup: async () => {
      await cleanupTemp(tempPath);
    }
  };
}

/**
 * Write content to a temp file safely
 * @param tempPath - Path to temp file
 * @param content - Content to write
 * @param options - Write options
 */
export async function writeToTemp(
  tempPath: string,
  content: string,
  options: TempFileOptions = {}
): Promise<void> {
  const { validateBase = os.tmpdir() } = options;

  if (!isPathSafe(validateBase, tempPath)) {
    throw new Error(`Path traversal detected: ${tempPath}`);
  }

  await fs.promises.writeFile(tempPath, content, 'utf-8');
  logger.debug(`Written to temp file: ${tempPath}`);
}

/**
 * Read content from a temp file safely
 * @param tempPath - Path to temp file
 * @param options - Read options
 * @returns File content
 */
export async function readFromTemp(
  tempPath: string,
  options: TempFileOptions = {}
): Promise<string> {
  const { validateBase = os.tmpdir() } = options;

  if (!isPathSafe(validateBase, tempPath)) {
    throw new Error(`Path traversal detected: ${tempPath}`);
  }

  const content = await fs.promises.readFile(tempPath, 'utf-8');
  logger.debug(`Read from temp file: ${tempPath}`);

  return content;
}

/**
 * Clean up a specific temp resource
 * @param tempPath - Path to temp file or directory
 */
export async function cleanupTemp(tempPath: string): Promise<void> {
  const resolvedPath = path.resolve(tempPath);

  for (const resource of Array.from(tempResources)) {
    if (path.resolve(resource.path) === resolvedPath) {
      try {
        if (resource.type === 'dir') {
          await fs.promises.rm(resolvedPath, { recursive: true, force: true });
          logger.debug(`Cleaned up temp directory: ${resolvedPath}`);
        } else {
          await fs.promises.unlink(resolvedPath);
          logger.debug(`Cleaned up temp file: ${resolvedPath}`);
        }
        tempResources.delete(resource);
      } catch (err) {
        logger.warn(`Failed to cleanup temp: ${resolvedPath}`, {
          error: err instanceof Error ? err.message : 'Unknown'
        });
      }
      break;
    }
  }
}

/**
 * Clean up all tracked temp resources
 */
export async function cleanupAll(): Promise<void> {
  logger.info(`Cleaning up ${tempResources.size} temp resources...`);

  const cleanupPromises: Promise<void>[] = [];
  for (const resource of Array.from(tempResources)) {
    cleanupPromises.push(
      cleanupTemp(resource.path).catch(err => {
        logger.warn(`Cleanup failed for ${resource.path}: ${err instanceof Error ? err.message : 'Unknown'}`);
      })
    );
  }

  await Promise.all(cleanupPromises);
  logger.info('Temp cleanup complete');
}

/**
 * Get list of tracked temp resources
 * @returns Array of {type, path} objects
 */
export function getTrackedTemps(): TempResource[] {
  return Array.from(tempResources);
}

// Default export for backward compatibility
export default {
  createTempDir,
  createTempFile,
  createTempFileWithCleanup,
  writeToTemp,
  readFromTemp,
  cleanupTemp,
  cleanupAll,
  getTrackedTemps,
  isPathSafe,
  generateSecureSuffix
};
