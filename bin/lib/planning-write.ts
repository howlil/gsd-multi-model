/**
 * Planning Write — lock/temp-safe writer for .planning mutations
 */

import * as fs from 'fs';
import * as path from 'path';
import { defaultLogger as logger } from './logger.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface PlanningWriteOptions {
  timeoutMs?: number;
  tempPrefix?: string;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Normalize timeout error for consistent error messages
 * @param err - Error to normalize
 * @param filePath - File path for context
 * @returns Normalized error
 */
function normalizeTimeoutError(err: unknown, filePath: string): Error {
  if (!err) return err as Error;
  const message = (err as Error).message || '';
  if (message.includes('File locked:')) {
    return err as Error;
  }
  if (message.includes('timed out') || (err as NodeJS.ErrnoException).code === 'ELOCKED') {
    return new Error(`File locked: ${filePath}`);
  }
  return err as Error;
}

/**
 * Generate a unique temp file path
 * @param prefix - Temp file prefix
 * @param dir - Directory for temp file
 * @returns Temp file path
 */
function createTempFile(prefix: string, dir: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(16).slice(2);
  return path.join(dir, `${prefix}${timestamp}-${random}.tmp`);
}

// ─── Main Functions ──────────────────────────────────────────────────────────

/**
 * Safely write to .planning directory with async operation
 * @param filePath - Target file path
 * @param content - Content to write
 * @param options - Write options
 */
export async function safePlanningWrite(
  filePath: string,
  content: string,
  options: PlanningWriteOptions = {}
): Promise<void> {
  const {
    tempPrefix = 'ez-write-',
  } = options;

  let tempPath: string | null = null;

  try {
    // Ensure .planning directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create temp file
    tempPath = createTempFile(tempPrefix, path.dirname(filePath));
    fs.writeFileSync(tempPath, content, 'utf-8');

    // Rename temp file to target (atomic on most filesystems)
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    throw normalizeTimeoutError(err, filePath);
  } finally {
    // Clean up temp file if it exists
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (cleanupErr) {
        logger.debug('Temp file cleanup failed', {
          tempPath,
          error: cleanupErr instanceof Error ? cleanupErr.message : 'Unknown'
        });
      }
    }
  }
}

/**
 * Safely write to .planning directory synchronously
 * @param filePath - Target file path
 * @param content - Content to write
 * @param options - Write options
 */
export function safePlanningWriteSync(
  filePath: string,
  content: string,
  options: PlanningWriteOptions = {}
): void {
  const {
    tempPrefix = 'ez-write-',
  } = options;

  let tempPath: string | null = null;

  try {
    // Ensure .planning directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create temp file
    tempPath = createTempFile(tempPrefix, dir);
    fs.writeFileSync(tempPath, content, 'utf-8');

    // Rename temp file to target (atomic on most filesystems)
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    throw normalizeTimeoutError(err, filePath);
  } finally {
    // Clean up temp file if it exists
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (cleanupErr) {
        logger.debug('Temp file cleanup failed (sync)', {
          tempPath,
          error: cleanupErr instanceof Error ? cleanupErr.message : 'Unknown'
        });
      }
    }
  }
}

// Default export for backward compatibility
export default { safePlanningWrite, safePlanningWriteSync };
