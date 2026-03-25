/**
 * Core — Shared utilities, constants, and internal helpers
 */

import * as fs from 'fs';
import * as path from 'path';
import { auditExec } from './safe-exec.js';
import { defaultLogger as logger } from './logger.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface ModelProfile {
  quality: string;
  balanced: string;
  budget: string;
}

export interface PhaseInfo {
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
  archived?: string;
}

export interface ArchivedPhaseDir {
  name: string;
  milestone: string;
  basePath: string;
  fullPath: string;
}

export interface Config {
  model_profile: string;
  commit_docs: boolean;
  search_gitignored: boolean;
  branching_strategy: string;
  phase_branch_template: string;
  milestone_branch_template: string;
  research: boolean;
  plan_checker: boolean;
  verifier: boolean;
  nyquist_validation: boolean;
  parallelization: boolean;
  brave_search: boolean;
  model_overrides: Record<string, any> | null;
}

export interface MilestoneInfo {
  version: string;
  name: string;
}

// ─── Path helpers ────────────────────────────────────────────────────────────

/** Normalize a relative path to always use forward slashes (cross-platform). */
export function toPosixPath(p: string): string {
  return p.split(path.sep).join('/');
}

// ─── Model Profile Table ─────────────────────────────────────────────────────

export const MODEL_PROFILES: Record<string, ModelProfile> = {
  'ez-planner':              { quality: 'opus', balanced: 'opus',   budget: 'sonnet' },
  'ez-roadmapper':           { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  'ez-executor':             { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  'ez-phase-researcher':     { quality: 'opus', balanced: 'sonnet', budget: 'haiku' },
  'ez-project-researcher':   { quality: 'opus', balanced: 'sonnet', budget: 'haiku' },
  'ez-debugger':             { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  'ez-codebase-mapper':      { quality: 'sonnet', balanced: 'haiku', budget: 'haiku' },
  'ez-verifier':             { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
  'ez-plan-checker':         { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
  'ez-ui-auditor':           { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
};

/**
 * Get model for an agent based on profile
 * @param agent - Agent name (e.g., 'ez-planner')
 * @param profile - Model profile ('quality', 'balanced', 'budget')
 * @returns Model name or 'inherit' if not found
 */
export function getModelForAgent(agent: string, profile: string): string {
  const agentProfile = MODEL_PROFILES[agent];
  if (!agentProfile) {
    logger.warn('Unknown agent in model profile table', { agent });
    return 'inherit';
  }
  return agentProfile[profile as keyof ModelProfile] || agentProfile.balanced || 'inherit';
}

// ─── Output helpers ───────────────────────────────────────────────────────────

/**
 * Output result as JSON or write to file for large payloads
 * @param result - Result object to output
 * @param raw - If true, output raw value
 * @param rawValue - Raw value to output if raw is true
 */
export function output(result: any, raw?: boolean, rawValue?: any): void {
  if (raw && rawValue !== undefined) {
    process.stdout.write(String(rawValue));
  } else {
    const json = JSON.stringify(result, null, 2);
    // Large payloads exceed Claude Code's Bash tool buffer (~50KB).
    // Write to tmpfile and output the path prefixed with @file: so callers can detect it.
    if (json.length > 50000) {
      const tmpPath = path.join(require('os').tmpdir(), `${Date.now()}.json`);
      fs.writeFileSync(tmpPath, json, 'utf-8');
      process.stdout.write('@file:' + tmpPath);
    } else {
      process.stdout.write(json);
    }
  }
  process.exit(0);
}

/**
 * Output error message and exit
 * @param message - Error message
 */
export function error(message: string): void {
  process.stderr.write('Error: ' + message + '\n');
  process.exit(1);
}

// ─── File & Config utilities ──────────────────────────────────────────────────

/**
 * Safely read a file, returning null if not found
 * @param filePath - Path to file
 * @returns File contents or null
 */
export function safeReadFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.warn('safeReadFile failed', { filePath, error: errorMessage });
    return null;
  }
}

/**
 * Load project configuration from .planning/config.json
 * @param cwd - Current working directory
 * @returns Configuration object with defaults
 */
export function loadConfig(cwd: string): Config {
  const configPath = path.join(cwd, '.planning', 'config.json');
  const defaults: Config = {
    model_profile: 'balanced',
    commit_docs: true,
    search_gitignored: false,
    branching_strategy: 'none',
    phase_branch_template: 'ez/phase-{phase}-{slug}',
    milestone_branch_template: 'ez/{milestone}-{slug}',
    research: true,
    plan_checker: true,
    verifier: true,
    nyquist_validation: true,
    parallelization: true,
    brave_search: false,
    model_overrides: null,
  };

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);

    // Migrate deprecated "depth" key to "granularity" with value mapping
    if ('depth' in parsed && !('granularity' in parsed)) {
      const depthToGranularity: Record<string, string> = { quick: 'coarse', standard: 'standard', comprehensive: 'fine' };
      parsed.granularity = depthToGranularity[parsed.depth] || parsed.depth;
      delete parsed.depth;
      try {
        fs.writeFileSync(configPath, JSON.stringify(parsed, null, 2), 'utf-8');
      } catch (err) {
        logger.warn('Failed to persist migrated config depth->granularity', { configPath, error: err instanceof Error ? err.message : 'Unknown' });
      }
    }

    const get = (key: string, nested?: { section: string; field: string }): any => {
      if (parsed[key] !== undefined) return parsed[key];
      if (nested && parsed[nested.section] && parsed[nested.section][nested.field] !== undefined) {
        return parsed[nested.section][nested.field];
      }
      return undefined;
    };

    const parallelization = (() => {
      const val = get('parallelization');
      if (typeof val === 'boolean') return val;
      if (typeof val === 'object' && val !== null && 'enabled' in val) return val.enabled;
      return defaults.parallelization;
    })();

    return {
      model_profile: get('model_profile') ?? defaults.model_profile,
      commit_docs: get('commit_docs', { section: 'planning', field: 'commit_docs' }) ?? defaults.commit_docs,
      search_gitignored: get('search_gitignored', { section: 'planning', field: 'search_gitignored' }) ?? defaults.search_gitignored,
      branching_strategy: get('branching_strategy', { section: 'git', field: 'branching_strategy' }) ?? defaults.branching_strategy,
      phase_branch_template: get('phase_branch_template', { section: 'git', field: 'phase_branch_template' }) ?? defaults.phase_branch_template,
      milestone_branch_template: get('milestone_branch_template', { section: 'git', field: 'milestone_branch_template' }) ?? defaults.milestone_branch_template,
      research: get('research', { section: 'workflow', field: 'research' }) ?? defaults.research,
      plan_checker: get('plan_checker', { section: 'workflow', field: 'plan_check' }) ?? defaults.plan_checker,
      verifier: get('verifier', { section: 'workflow', field: 'verifier' }) ?? defaults.verifier,
      nyquist_validation: get('nyquist_validation', { section: 'workflow', field: 'nyquist_validation' }) ?? defaults.nyquist_validation,
      parallelization,
      brave_search: get('brave_search') ?? defaults.brave_search,
      model_overrides: parsed.model_overrides || null,
    };
  } catch (err) {
    logger.warn('Failed to load config, using defaults', { configPath, error: err instanceof Error ? err.message : 'Unknown' });
    return defaults;
  }
}

// ─── Git utilities ────────────────────────────────────────────────────────────

/**
 * Check if a path is git-ignored
 * @param cwd - Current working directory
 * @param targetPath - Path to check
 * @returns True if path is git-ignored
 */
export async function isGitIgnored(cwd: string, targetPath: string): Promise<boolean> {
  try {
    // --no-index checks .gitignore rules regardless of whether the file is tracked.
    const safePath = targetPath.replace(/[^a-zA-Z0-9._\-/]/g, '');
    await auditExec('git', ['check-ignore', '-q', '--no-index', '--', safePath], {
      cwd,
      context: 'isGitIgnored',
      timeout: 5000
    });
    return true;
  } catch (err) {
    logger.warn('git check-ignore failed, assuming not ignored', { targetPath, error: err instanceof Error ? err.message : 'Unknown' });
    return false;
  }
}

/**
 * Execute a git command and return result
 * @param cwd - Current working directory
 * @param args - Git command arguments
 * @returns Git command result
 */
export async function execGit(cwd: string, args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    const stdout = await auditExec('git', args, {
      cwd,
      context: 'execGit',
      timeout: 30000
    });
    return { exitCode: 0, stdout: stdout.trim(), stderr: '' };
  } catch (err) {
    logger.warn('execGit failed', { args, error: err instanceof Error ? err.message : 'Unknown' });
    return {
      exitCode: (err as any).status ?? 1,
      stdout: ((err as any).stdout ?? '').toString().trim(),
      stderr: ((err as any).stderr ?? '').toString().trim(),
    };
  }
}

// ─── Phase utilities ──────────────────────────────────────────────────────────

/**
 * Escape special regex characters in a string
 * @param value - String to escape
 * @returns Escaped string
 */
export function escapeRegex(value: string): string {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize a phase identifier (e.g., "1" → "01", "12a.1" → "12A.1")
 * @param phase - Phase identifier
 * @returns Normalized phase identifier
 */
export function normalizePhaseName(phase: string | number): string {
  const match = String(phase).match(/^(\d+)([A-Z])?((?:\.\d+)*)/i);
  if (!match) return String(phase);
  const padded = match[1]!.padStart(2, '0');
  const letter = match[2] ? match[2].toUpperCase() : '';
  const decimal = match[3] || '';
  return padded + letter + decimal;
}

/**
 * Compare two phase identifiers for sorting
 * @param a - First phase identifier
 * @param b - Second phase identifier
 * @returns Comparison result (-1, 0, or 1)
 */
export function comparePhaseNum(a: string | number, b: string | number): number {
  const pa = String(a).match(/^(\d+)([A-Z])?((?:\.\d+)*)/i);
  const pb = String(b).match(/^(\d+)([A-Z])?((?:\.\d+)*)/i);
  if (!pa || !pb) return String(a).localeCompare(String(b));

  const intDiff = parseInt(pa[1]!, 10) - parseInt(pb[1]!, 10);
  if (intDiff !== 0) return intDiff;

  // No letter sorts before letter: 12 < 12A < 12B
  const la = (pa[2] || '').toUpperCase();
  const lb = (pb[2] || '').toUpperCase();
  if (la !== lb) {
    if (!la) return -1;
    if (!lb) return 1;
    return la < lb ? -1 : 1;
  }

  // Segment-by-segment decimal comparison: 12A < 12A.1 < 12A.1.2 < 12A.2
  const aDecParts = pa[3] ? pa[3].slice(1).split('.').map(p => parseInt(p, 10)) : [];
  const bDecParts = pb[3] ? pb[3].slice(1).split('.').map(p => parseInt(p, 10)) : [];
  const maxLen = Math.max(aDecParts.length, bDecParts.length);

  if (aDecParts.length === 0 && bDecParts.length > 0) return -1;
  if (bDecParts.length === 0 && aDecParts.length > 0) return 1;

  for (let i = 0; i < maxLen; i++) {
    const av = Number.isFinite(aDecParts[i]!) ? aDecParts[i]! : 0;
    const bv = Number.isFinite(bDecParts[i]!) ? bDecParts[i]! : 0;
    if (av !== bv) return av - bv;
  }

  return 0;
}

/**
 * Search for a phase in a directory
 * @param baseDir - Base directory to search
 * @param relBase - Relative base path for result
 * @param normalized - Normalized phase identifier
 * @returns Phase info or null
 */
function searchPhaseInDir(
  baseDir: string,
  relBase: string,
  normalized: string
): PhaseInfo | null {
  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    const dirs = entries
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .sort((a, b) => comparePhaseNum(a, b));
    
    const match = dirs.find(d => d.startsWith(normalized));
    if (!match) return null;

    const dirMatch = match.match(/^(\d+[A-Z]?(?:\.\d+)*)-?(.*)/i);
    const phaseNumber = dirMatch ? dirMatch[1]! : normalized;
    const phaseName = dirMatch && dirMatch[2] ? dirMatch[2] : null;
    const phaseDir = path.join(baseDir, match);
    const phaseFiles = fs.readdirSync(phaseDir);

    const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').sort();
    const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md').sort();
    const hasResearch = phaseFiles.some(f => f.endsWith('-RESEARCH.md') || f === 'RESEARCH.md');
    const hasContext = phaseFiles.some(f => f.endsWith('-CONTEXT.md') || f === 'CONTEXT.md');
    const hasVerification = phaseFiles.some(f => f.endsWith('-VERIFICATION.md') || f === 'VERIFICATION.md');

    const completedPlanIds = new Set(
      summaries.map(s => s.replace('-SUMMARY.md', '').replace('SUMMARY.md', ''))
    );
    const incompletePlans = plans.filter(p => {
      const planId = p.replace('-PLAN.md', '').replace('PLAN.md', '');
      return !completedPlanIds.has(planId);
    });

    return {
      found: true,
      directory: toPosixPath(path.join(relBase, match)),
      phase_number: phaseNumber,
      phase_name: phaseName,
      phase_slug: phaseName ? phaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : null,
      plans,
      summaries,
      incomplete_plans: incompletePlans,
      has_research: hasResearch,
      has_context: hasContext,
      has_verification: hasVerification,
    };
  } catch (err) {
    logger.warn('Failed to search phase directory', { baseDir, normalized, error: err instanceof Error ? err.message : 'Unknown' });
    return null;
  }
}

/**
 * Find a phase by identifier in the project
 * @param cwd - Current working directory
 * @param phase - Phase identifier
 * @returns Phase info or null
 */
export function findPhase(cwd: string, phase: string | number): PhaseInfo | null {
  if (!phase) return null;

  const phasesDir = path.join(cwd, '.planning', 'phases');
  const normalized = normalizePhaseName(phase);

  // Search current phases first
  const current = searchPhaseInDir(phasesDir, '.planning/phases', normalized);
  if (current) return current;

  // Search archived milestone phases (newest first)
  const milestonesDir = path.join(cwd, '.planning', 'milestones');
  if (!fs.existsSync(milestonesDir)) return null;

  try {
    const milestoneEntries = fs.readdirSync(milestonesDir, { withFileTypes: true });
    const archiveDirs = milestoneEntries
      .filter(e => e.isDirectory() && /^v[\d.]+-phases$/.test(e.name))
      .map(e => e.name)
      .sort()
      .reverse();

    for (const archiveName of archiveDirs) {
      const version = archiveName.match(/^(v[\d.]+)-phases$/)?.[1] ?? '';
      const archivePath = path.join(milestonesDir, archiveName);
      const relBase = '.planning/milestones/' + archiveName;
      const result = searchPhaseInDir(archivePath, relBase, normalized);
      if (result) {
        result.archived = version;
        return result;
      }
    }
  } catch (err) {
    logger.warn('Failed while searching archived milestone phases', { milestonesDir, error: err instanceof Error ? err.message : 'Unknown' });
  }

  return null;
}

/**
 * Get all archived phase directories
 * @param cwd - Current working directory
 * @returns Array of archived phase directory info
 */
export function getArchivedPhaseDirs(cwd: string): ArchivedPhaseDir[] {
  const milestonesDir = path.join(cwd, '.planning', 'milestones');
  const results: ArchivedPhaseDir[] = [];

  if (!fs.existsSync(milestonesDir)) return results;

  try {
    const milestoneEntries = fs.readdirSync(milestonesDir, { withFileTypes: true });
    // Find v*-phases directories, sort newest first
    const phaseDirs = milestoneEntries
      .filter(e => e.isDirectory() && /^v[\d.]+-phases$/.test(e.name))
      .map(e => e.name)
      .sort()
      .reverse();

    for (const archiveName of phaseDirs) {
      const version = archiveName.match(/^(v[\d.]+)-phases$/)?.[1] ?? '';
      const archivePath = path.join(milestonesDir, archiveName);
      const entries = fs.readdirSync(archivePath, { withFileTypes: true });
      const dirs = entries
        .filter(e => e.isDirectory())
        .map(e => e.name)
        .sort((a, b) => comparePhaseNum(a, b));

      for (const dir of dirs) {
        results.push({
          name: dir,
          milestone: version,
          basePath: path.join('.planning', 'milestones', archiveName),
          fullPath: path.join(archivePath, dir),
        });
      }
    }
  } catch (err) {
    logger.warn('Failed to enumerate archived phase directories', { milestonesDir, error: err instanceof Error ? err.message : 'Unknown' });
  }

  return results;
}

// ─── Internal helpers (for commands.ts) ──────────────────────────────────────

/**
 * Get milestone info from STATE.md
 * @param cwd - Current working directory
 * @returns Milestone info
 */
export function getMilestoneInfo(cwd: string): MilestoneInfo {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  const defaults: MilestoneInfo = { version: 'v5.0.0', name: 'Complete TypeScript Migration' };

  try {
    if (!fs.existsSync(statePath)) return defaults;
    const content = fs.readFileSync(statePath, 'utf-8');
    const versionMatch = content.match(/\*\*Milestone:\*\*\s*v?([\d.]+)/i);
    const nameMatch = content.match(/\*\*Milestone Name:\*\*\s*(.+)/i);

    return {
      version: versionMatch ? `v${versionMatch[1]!}` : defaults.version,
      name: nameMatch ? nameMatch[1]!.trim() : defaults.name,
    };
  } catch (err) {
    logger.warn('Failed to read milestone info from STATE.md', { statePath, error: err instanceof Error ? err.message : 'Unknown' });
    return defaults;
  }
}

/**
 * Get a filter function to check if a phase directory belongs to the current milestone
 * based on ROADMAP.md phase headings.
 * If no ROADMAP exists or no phases are listed, returns a pass-all filter.
 * @param cwd - Current working directory
 * @returns Filter function with phaseCount property
 */
export function getMilestonePhaseFilter(cwd: string): (dirName: string) => boolean & { phaseCount: number } {
  const milestonePhaseNums = new Set<string>();
  try {
    const roadmap = fs.readFileSync(path.join(cwd, '.planning', 'ROADMAP.md'), 'utf-8');
    const phasePattern = /#{2,4}\s*Phase\s+(\d+[A-Z]?(?:\.\d+)*)\s*:/gi;
    let m;
    while ((m = phasePattern.exec(roadmap)) !== null) {
      milestonePhaseNums.add(m[1]!);
    }
  } catch (err) {
    logger.warn('Failed to parse milestone phases from roadmap', { error: err instanceof Error ? err.message : 'Unknown' });
  }

  if (milestonePhaseNums.size === 0) {
    const passAll = () => true;
    passAll.phaseCount = 0;
    return passAll as (dirName: string) => boolean & { phaseCount: number };
  }

  const normalized = new Set(
    [...milestonePhaseNums].map(n => (n.replace(/^0+/, '') || '0').toLowerCase())
  );

  function isDirInMilestone(dirName: string): boolean {
    const m = dirName.match(/^0*(\d+[A-Za-z]?(?:\.\d+)*)/);
    if (!m) return false;
    return normalized.has(m[1]!.toLowerCase());
  }
  (isDirInMilestone as any).phaseCount = milestonePhaseNums.size;
  return isDirInMilestone as (dirName: string) => boolean & { phaseCount: number };
}

/**
 * Generate a URL-safe slug (internal version)
 * @param text - Text to slugify
 * @returns Slug string
 */
export function generateSlugInternal(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolve model for an agent type (internal version)
 * @param cwd - Current working directory
 * @param agentType - Agent type
 * @returns Model name
 */
export function resolveModelInternal(cwd: string, agentType: string): string {
  const config = loadConfig(cwd);
  const profile = config.model_profile || 'balanced';
  return getModelForAgent(agentType, profile);
}

// Export additional utilities from other sections of core.cjs
// (Roadmap utilities, milestone helpers, etc. can be added as needed)
