/**
 * Phase — Phase CRUD, query, and lifecycle operations
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  escapeRegex,
  normalizePhaseName,
  comparePhaseNum,
  findPhase,
  getArchivedPhaseDirs,
  output,
  error
} from './core.js';
import { defaultLogger as logger } from './logger.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

/**
 * Phase status union type
 */
export type PhaseStatus = 'pending' | 'in-progress' | 'completed' | 'blocked';

/**
 * Options for phase list command
 */
export interface PhaseListOptions {
  type?: 'plans' | 'summaries' | 'all';
  phase?: string;
  includeArchived?: boolean;
}

/**
 * Phase information for command output (internal use)
 */
export interface PhaseCommandInfo {
  found: boolean;
  directory?: string;
  phase_number?: string;
  phase_name?: string;
  files?: string[];
  count: number;
  error?: string;
}

/**
 * Phase information for roadmap representation
 */
export interface PhaseInfo {
  number: string;
  name: string;
  plans: string[];
  status: PhaseStatus;
}

// ─── Command Functions ───────────────────────────────────────────────────────

/**
 * List phases or phase files
 */
export function phasesList(cwd: string, options: PhaseListOptions = {}, raw?: boolean): void {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const { type, phase, includeArchived } = options;

  // If no phases directory, return empty
  if (!fs.existsSync(phasesDir)) {
    if (type) {
      output({ files: [], count: 0 }, raw, '');
    } else {
      output({ directories: [], count: 0 }, raw, '');
    }
    return;
  }

  try {
    // Get all phase directories
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    let dirs = entries.filter(e => e.isDirectory()).map(e => e.name);

    // Include archived phases if requested
    if (includeArchived) {
      const archived = getArchivedPhaseDirs(cwd);
      for (const a of archived) {
        dirs.push(`${a.name} [${a.milestone}]`);
      }
    }

    // Sort numerically
    dirs.sort((a, b) => comparePhaseNum(a, b));

    // If filtering by phase number
    if (phase) {
      const normalized = normalizePhaseName(phase);
      const match = dirs.find(d => d.startsWith(normalized));
      if (!match) {
        output({ files: [], count: 0, phase_dir: null, error: 'Phase not found' }, raw, '');
        return;
      }
      dirs = [match];
    }

    // If listing files of a specific type
    if (type) {
      const files: string[] = [];
      for (const dir of dirs) {
        const dirPath = path.join(phasesDir, dir);
        const dirFiles = fs.readdirSync(dirPath);

        let filtered: string[];
        if (type === 'plans') {
          filtered = dirFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md');
        } else if (type === 'summaries') {
          filtered = dirFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
        } else {
          filtered = dirFiles;
        }

        files.push(...filtered.sort());
      }

      const result = {
        files,
        count: files.length,
        phase_dir: phase && dirs[0] ? dirs[0].replace(/^\d+(?:\.\d+)*-?/, '') : null,
      };
      output(result, raw, files.join('\n'));
      return;
    }

    // Default: list directories
    output({ directories: dirs, count: dirs.length }, raw, dirs.join('\n'));
  } catch (err) {
    logger.error('Failed to list phases in phasesList', { error: err instanceof Error ? err.message : 'Unknown' });
    error('Failed to list phases: ' + (err instanceof Error ? err.message : 'Unknown'));
  }
}

/**
 * Calculate next decimal phase number
 */
export function phaseNextDecimal(cwd: string, basePhase: string, raw?: boolean): void {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const normalized = normalizePhaseName(basePhase);

  // Check if phases directory exists
  if (!fs.existsSync(phasesDir)) {
    output(
      {
        found: false,
        base_phase: normalized,
        next_decimal: normalized + '.1',
        reason: 'phases_dir_not_found'
      },
      raw,
      normalized + '.1'
    );
    return;
  }

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    
    // Find phases that match the base phase
    const matchingDirs = dirs.filter(d => {
      const dirNormalized = normalizePhaseName(d);
      return dirNormalized.startsWith(normalized);
    });

    if (matchingDirs.length === 0) {
      // No existing decimals, return base.1
      output(
        {
          found: true,
          base_phase: normalized,
          next_decimal: normalized + '.1',
          existing_decimals: []
        },
        raw,
        normalized + '.1'
      );
      return;
    }

    // Extract decimal suffixes
    const decimals: number[] = [];
    const decimalPattern = new RegExp(`^${escapeRegex(normalized)}\\.(\\d+)`);
    
    for (const dir of matchingDirs) {
      const match = dir.match(decimalPattern);
      if (match && match[1]) {
        decimals.push(parseInt(match[1], 10));
      }
    }

    if (decimals.length === 0) {
      output(
        {
          found: true,
          base_phase: normalized,
          next_decimal: normalized + '.1',
          existing_decimals: decimals
        },
        raw,
        normalized + '.1'
      );
      return;
    }

    // Return next decimal
    const maxDecimal = Math.max(...decimals);
    const nextDecimal = normalized + '.' + (maxDecimal + 1);

    output(
      {
        found: true,
        base_phase: normalized,
        next_decimal: nextDecimal,
        existing_decimals: decimals.sort((a, b) => a - b)
      },
      raw,
      nextDecimal
    );
  } catch (err) {
    logger.error('Failed to calculate next decimal phase', { error: err instanceof Error ? err.message : 'Unknown' });
    error('Failed to calculate next decimal: ' + (err instanceof Error ? err.message : 'Unknown'));
  }
}

/**
 * Find a phase by identifier
 */
export function findPhaseCmd(cwd: string, phase: string | number, raw?: boolean): void {
  const result = findPhase(cwd, phase);
  
  if (result) {
    output(result, raw, result.directory);
  } else {
    output({ found: false, phase_number: String(phase) }, raw, '');
  }
}

/**
 * Get archived phase directories
 */
export function getArchivedPhasesCmd(cwd: string, raw?: boolean): void {
  const archived = getArchivedPhaseDirs(cwd);
  output({ archived, count: archived.length }, raw, archived.map(a => a.name).join('\n'));
}
