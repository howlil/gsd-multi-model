#!/usr/bin/env node

/**
 * Tier Manager — Multi-tier release strategy management
 *
 * Manages MVP / Medium / Enterprise tier definitions, validation,
 * and promotion logic for /ez:release workflows.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────

export type TierId = 'mvp' | 'medium' | 'enterprise';

export interface TierDefinition {
  name: string;
  label: string;
  moscow_scope: string[];
  coverage_threshold: number;
  git_strategy: string;
  checklist_count: number;
  rollback_window_minutes: number;
  description: string;
}

export interface TierWithId extends TierDefinition {
  id: TierId;
}

export interface GitStrategy {
  strategy: string;
  releaseBranchPrefix: string | null;
  targetBranch: string;
  syncBranch: string | null;
  description: string;
}

export interface CoverageCheck {
  passes: boolean;
  threshold: number;
  actual: number;
  gap: number;
}

export interface FeatureFlagConfig {
  enabled_moscow: string[];
  disabled_moscow: string[];
  flag_config: {
    ENABLE_SHOULD_FEATURES: boolean;
    ENABLE_COULD_FEATURES: boolean;
  };
}

export interface ReleaseConfig {
  tier: string;
  tiers: {
    mvp: {
      moscow_scope: string[];
      coverage: number;
      git: string;
      checklist_items: number;
    };
    medium: {
      moscow_scope: string[];
      coverage: number;
      git: string;
      checklist_items: number;
    };
    enterprise: {
      moscow_scope: string[];
      coverage: number;
      git: string;
      checklist_items: number;
    };
  };
}

export interface ReleaseValidationResult {
  valid: boolean;
  tier: string;
  tierDef: TierDefinition;
  blockers: string[];
  warnings: string[];
  summary: string;
}

export interface ReleaseChecks {
  coverage?: number;
  secretsFound?: number;
  auditPassed?: boolean;
  hasProdTodos?: boolean;
}

// ─────────────────────────────────────────────
// Tier Definitions
// ─────────────────────────────────────────────

const TIER_DEFINITIONS: Record<TierId, TierDefinition> = {
  mvp: {
    name: 'MVP',
    label: 'Minimum Viable Product',
    moscow_scope: ['must'],
    coverage_threshold: 60,
    git_strategy: 'trunk',
    checklist_count: 6,
    rollback_window_minutes: 30,
    description: 'Core @must features only. Ship in hours.'
  },
  medium: {
    name: 'Medium',
    label: 'Production Ready',
    moscow_scope: ['must', 'should'],
    coverage_threshold: 80,
    git_strategy: 'github-flow',
    checklist_count: 18,
    rollback_window_minutes: 15,
    description: 'Must + Should features. Real users, proper testing.'
  },
  enterprise: {
    name: 'Enterprise',
    label: 'Compliance Grade',
    moscow_scope: ['must', 'should', 'could'],
    coverage_threshold: 95,
    git_strategy: 'gitflow',
    checklist_count: 30,
    rollback_window_minutes: 5,
    description: 'All MoSCoW priorities. Regulated industries, enterprise customers.'
  }
};

const TIER_ORDER: TierId[] = ['mvp', 'medium', 'enterprise'];

// ─────────────────────────────────────────────
// Tier Accessors
// ─────────────────────────────────────────────

/**
 * Get tier definition
 * @param tier - Tier identifier
 * @returns Tier definition with ID
 * @throws Error if tier is invalid
 */
export function getTier(tier: string): TierWithId {
  const def = TIER_DEFINITIONS[tier.toLowerCase() as TierId];
  if (!def) {
    throw new Error(`Unknown tier: ${tier}. Must be one of: ${TIER_ORDER.join(', ')}`);
  }
  return { ...def, id: tier.toLowerCase() as TierId };
}

/**
 * Get all tier definitions
 * @returns Array of all tier definitions with IDs
 */
export function getAllTiers(): TierWithId[] {
  return TIER_ORDER.map(t => ({ id: t, ...TIER_DEFINITIONS[t] }));
}

/**
 * Check if a tier is valid
 * @param tier - Tier identifier to check
 * @returns True if tier is valid
 */
export function isValidTier(tier: string): boolean {
  return TIER_ORDER.includes(tier.toLowerCase() as TierId);
}

/**
 * Get the tier index (0=mvp, 1=medium, 2=enterprise)
 * @param tier - Tier identifier
 * @returns Tier index
 */
export function getTierIndex(tier: string): number {
  return TIER_ORDER.indexOf(tier.toLowerCase() as TierId);
}

/**
 * Check if target tier is a promotion from current tier
 * @param current - Current tier
 * @param target - Target tier
 * @returns True if target is a promotion
 */
export function isPromotion(current: string, target: string): boolean {
  return getTierIndex(target) > getTierIndex(current);
}

/**
 * Get the tier below (for prerequisite checking)
 * @param tier - Tier identifier
 * @returns Previous tier ID or null if at lowest tier
 */
export function getPreviousTier(tier: string): TierId | null {
  const idx = getTierIndex(tier);
  return idx > 0 ? TIER_ORDER[idx - 1] : null;
}

// ─────────────────────────────────────────────
// Git Strategy
// ─────────────────────────────────────────────

/**
 * Get git strategy for a tier
 * @param tier - Tier identifier
 * @returns Git strategy configuration
 */
export function getGitStrategy(tier: string): GitStrategy {
  const def = getTier(tier);

  const strategies: Record<string, GitStrategy> = {
    trunk: {
      strategy: 'trunk',
      releaseBranchPrefix: null,
      targetBranch: 'main',
      syncBranch: null,
      description: 'Tag directly on main. No release branch.'
    },
    'github-flow': {
      strategy: 'github-flow',
      releaseBranchPrefix: 'release',
      targetBranch: 'main',
      syncBranch: null,
      description: 'release/vX.Y.Z branch → PR → main'
    },
    gitflow: {
      strategy: 'gitflow',
      releaseBranchPrefix: 'release',
      targetBranch: 'main',
      syncBranch: 'develop',
      description: 'release/vX.Y.Z from develop → main → tag → sync develop'
    }
  };

  return strategies[def.git_strategy];
}

/**
 * Generate release branch name for version
 * @param tier - Tier identifier
 * @param version - Semver without 'v' prefix
 * @returns Branch name or null for trunk-based
 */
export function getReleaseBranchName(tier: string, version: string): string | null {
  const strategy = getGitStrategy(tier);
  if (!strategy.releaseBranchPrefix) return null; // trunk-based
  return `${strategy.releaseBranchPrefix}/v${version}`;
}

/**
 * Generate hotfix branch name
 * @param name - Slug for the fix
 * @returns Hotfix branch name
 */
export function getHotfixBranchName(name: string): string {
  const slug = name.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').toLowerCase();
  return `hotfix/${slug}`;
}

// ─────────────────────────────────────────────
// Coverage Validation
// ─────────────────────────────────────────────

/**
 * Check if coverage meets tier threshold
 * @param tier - Tier identifier
 * @param coveragePct - Coverage percentage
 * @returns Coverage check result
 */
export function checkCoverage(tier: string, coveragePct: number): CoverageCheck {
  const def = getTier(tier);
  const passes = coveragePct >= def.coverage_threshold;
  return {
    passes,
    threshold: def.coverage_threshold,
    actual: coveragePct,
    gap: passes ? 0 : def.coverage_threshold - coveragePct
  };
}

// ─────────────────────────────────────────────
// Feature Flag Helpers
// ─────────────────────────────────────────────

/**
 * Get feature flags that should be enabled for a tier
 * @param tier - Tier identifier
 * @returns Feature flag configuration
 */
export function getFeatureFlagConfig(tier: string): FeatureFlagConfig {
  const def = getTier(tier);
  const all = ['must', 'should', 'could'];
  const enabled = def.moscow_scope;
  const disabled = all.filter(m => !enabled.includes(m));

  return {
    enabled_moscow: enabled,
    disabled_moscow: disabled,
    flag_config: {
      ENABLE_SHOULD_FEATURES: enabled.includes('should'),
      ENABLE_COULD_FEATURES: enabled.includes('could')
    }
  };
}

// ─────────────────────────────────────────────
// Config Integration
// ─────────────────────────────────────────────

/**
 * Build release config section for .planning/config.json
 * @param currentTier - Current tier identifier
 * @returns Release configuration
 */
export function buildReleaseConfig(currentTier: string = 'mvp'): ReleaseConfig {
  return {
    tier: currentTier,
    tiers: {
      mvp: {
        moscow_scope: TIER_DEFINITIONS.mvp.moscow_scope,
        coverage: TIER_DEFINITIONS.mvp.coverage_threshold,
        git: TIER_DEFINITIONS.mvp.git_strategy,
        checklist_items: TIER_DEFINITIONS.mvp.checklist_count
      },
      medium: {
        moscow_scope: TIER_DEFINITIONS.medium.moscow_scope,
        coverage: TIER_DEFINITIONS.medium.coverage_threshold,
        git: TIER_DEFINITIONS.medium.git_strategy,
        checklist_items: TIER_DEFINITIONS.medium.checklist_count
      },
      enterprise: {
        moscow_scope: TIER_DEFINITIONS.enterprise.moscow_scope,
        coverage: TIER_DEFINITIONS.enterprise.coverage_threshold,
        git: TIER_DEFINITIONS.enterprise.git_strategy,
        checklist_items: TIER_DEFINITIONS.enterprise.checklist_count
      }
    }
  };
}

/**
 * Load current tier from config.json
 * @param configPath - Path to .planning/config.json
 * @returns Current tier identifier
 */
export function loadCurrentTier(configPath: string): TierId {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return (config.release && config.release.tier) || 'mvp';
  } catch {
    return 'mvp';
  }
}

/**
 * Save current tier to config.json
 * @param configPath - Path to .planning/config.json
 * @param tier - Tier identifier to save
 * @throws Error if tier is invalid
 */
export function saveCurrentTier(configPath: string, tier: string): void {
  if (!isValidTier(tier)) throw new Error(`Invalid tier: ${tier}`);

  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    // file doesn't exist yet
  }

  if (!config.release) config.release = {};
  const releaseConfig = config.release as Record<string, unknown>;
  releaseConfig.tier = tier.toLowerCase();
  if (!releaseConfig.tiers) {
    const fullConfig = buildReleaseConfig(tier);
    Object.assign(releaseConfig, fullConfig);
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

// ─────────────────────────────────────────────
// Validation Summary
// ─────────────────────────────────────────────

/**
 * Generate a tier validation summary
 * @param tier - Tier identifier
 * @param checks - Validation checks
 * @returns Validation result
 */
export function validateRelease(tier: string, checks: ReleaseChecks = {}): ReleaseValidationResult {
  const def = getTier(tier);
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Coverage check
  if (checks.coverage !== undefined) {
    const cov = checkCoverage(tier, checks.coverage);
    if (!cov.passes) {
      warnings.push(`Coverage ${checks.coverage}% is below ${tier} threshold (${def.coverage_threshold}%)`);
    }
  }

  // Security checks
  if (checks.secretsFound && checks.secretsFound > 0) {
    blockers.push(`${checks.secretsFound} potential secret(s) found in committed files`);
  }
  if (checks.auditPassed === false) {
    blockers.push('npm audit found critical vulnerabilities');
  }
  if (checks.hasProdTodos) {
    warnings.push('Production TODO/FIXME comments found in src/');
  }

  const valid = blockers.length === 0;

  return {
    valid,
    tier,
    tierDef: def,
    blockers,
    warnings,
    summary: valid
      ? `${def.name} release validated (${warnings.length} warnings)`
      : `${def.name} release BLOCKED (${blockers.length} blockers)`
  };
}

export default {
  getTier,
  getAllTiers,
  isValidTier,
  getTierIndex,
  isPromotion,
  getPreviousTier,
  getGitStrategy,
  getReleaseBranchName,
  getHotfixBranchName,
  checkCoverage,
  getFeatureFlagConfig,
  buildReleaseConfig,
  loadCurrentTier,
  saveCurrentTier,
  validateRelease,
  TIER_DEFINITIONS,
  TIER_ORDER
};
