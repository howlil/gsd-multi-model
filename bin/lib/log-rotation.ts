#!/usr/bin/env node

/**
 * Log Rotation Utility
 *
 * Automatically deletes EZ Agents logs older than 7 days to prevent git spam.
 * Run this weekly or add to CI/CD cleanup job.
 *
 * Usage: node ez-agents/bin/lib/log-rotation.ts [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';

const LOGS_DIR = path.join(process.cwd(), '.planning', 'logs');
const MAX_AGE_DAYS = 7;
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Rotation result statistics
 */
export interface RotationResult {
  deleted: number;
  kept: number;
  totalSize: number;
  dryRun: boolean;
}

/**
 * Format bytes to human-readable string
 * @param bytes - Number of bytes
 * @returns Formatted string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Rotate logs by deleting old files
 * @returns Rotation result statistics
 */
export function rotateLogs(): RotationResult {
  if (!fs.existsSync(LOGS_DIR)) {
    console.log('Logs directory not found:', LOGS_DIR);
    return { deleted: 0, kept: 0, totalSize: 0, dryRun: DRY_RUN };
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);

  const files = fs.readdirSync(LOGS_DIR);
  const logFiles = files.filter(f => f.endsWith('.log'));

  let deleted = 0;
  let kept = 0;
  let totalSize = 0;

  logFiles.forEach(file => {
    const filePath = path.join(LOGS_DIR, file);
    const stats = fs.statSync(filePath);

    if (stats.mtime < cutoff) {
      if (DRY_RUN) {
        console.log(`[DRY-RUN] Would delete: ${file} (${formatBytes(stats.size)})`);
      } else {
        fs.unlinkSync(filePath);
        console.log(`Deleted: ${file}`);
      }
      deleted++;
      totalSize += stats.size;
    } else {
      kept++;
    }
  });

  console.log(`\n${DRY_RUN ? '[DRY-RUN] ' : ''}Log Rotation Complete`);
  console.log(`  Deleted: ${deleted} files (${formatBytes(totalSize)})`);
  console.log(`  Kept: ${kept} files (last ${MAX_AGE_DAYS} days)`);

  return { deleted, kept, totalSize, dryRun: DRY_RUN };
}

export default { rotateLogs };
