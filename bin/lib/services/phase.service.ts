/**
 * PhaseService — Manages phase-related operations
 *
 * Encapsulates phase discovery, normalization, and search logic
 * by delegating to core utility functions (DRY principle).
 */

import * as fs from 'fs';
import * as path from 'path';
import { defaultLogger as logger } from '../logger.js';
import {
  normalizePhaseName,
  comparePhaseNum,
  searchPhaseInDir,
  findPhaseInternal,
  getArchivedPhaseDirs,
} from '../core.js';

export interface PhaseSearchResult {
  found: boolean;
  directory: string;
  phase_number: string;
  phase_name: string | null;
  phase_slug: string | null;
  plans: string[];
  summaries: string[];
  incomplete_plans: string[];
  has_research: boolean;
  has_context: boolean;
  has_verification: boolean;
  archived?: string | undefined;
}

export interface ArchivedPhaseDir {
  name: string;
  milestone: string;
  basePath: string;
  fullPath: string;
}

/**
 * PhaseService class for phase-related business logic.
 * Delegates to core utility functions to avoid code duplication.
 */
export class PhaseService {
  private readonly cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  /**
   * Normalize phase name to padded format (e.g., "1A" → "01A")
   * Delegates to core.normalizePhaseName (DRY principle).
   */
  normalizePhaseName(phase: string | number): string {
    return normalizePhaseName(phase);
  }

  /**
   * Compare phase numbers for sorting
   * Delegates to core.comparePhaseNum (DRY principle).
   */
  comparePhaseNum(a: string | number, b: string | number): number {
    return comparePhaseNum(a, b);
  }

  /**
   * Search for a phase directory
   * Delegates to core.searchPhaseInDir (DRY principle).
   */
  searchPhaseInDir(
    baseDir: string,
    relBase: string,
    normalized: string
  ): PhaseSearchResult | null {
    return searchPhaseInDir(baseDir, relBase, normalized);
  }

  /**
   * Find phase directory (current + archived)
   * Delegates to core.findPhaseInternal (DRY principle).
   */
  find(phase: string): PhaseSearchResult | null {
    return findPhaseInternal(this.cwd, phase);
  }

  /**
   * Get all archived phase directories
   * Delegates to core.getArchivedPhaseDirs (DRY principle).
   */
  getArchived(): ArchivedPhaseDir[] {
    return getArchivedPhaseDirs(this.cwd);
  }
}
