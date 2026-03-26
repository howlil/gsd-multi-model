/**
 * Core — Shared utilities, constants, and internal helpers
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { safeExec } from './safe-exec.js';
import { auditExec } from './audit-exec.js';
import { defaultLogger as logger } from './logger.js';

/** Normalize a relative path to always use forward slashes (cross-platform). */
function toPosixPath(p: string): string {
  return p.split(path.sep).join('/');
}

// ─── Model Profile Table ─────────────────────────────────────────────────────

interface ModelProfile {
  quality: string;
  balanced: string;
  budget: string;
}

interface ModelProfiles {
  [key: string]: ModelProfile;
}

const MODEL_PROFILES: ModelProfiles = {
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

// ─── Output helpers ───────────────────────────────────────────────────────────

/**
 * Output result to stdout
 * @param result - Result object to output
 * @param raw - Whether to output raw value
 * @param rawValue - Raw value to output if raw mode
 */
function output(result: Record<string, unknown>, raw?: boolean, rawValue?: string): void {
  if (raw && rawValue !== undefined) {
    process.stdout.write(String(rawValue));
  } else {
    const json = JSON.stringify(result, null, 2);
    // Large payloads exceed Claude Code's Bash tool buffer (~50KB).
    // Write to tmpfile and output the path prefixed with @file: so callers can detect it.
    if (json.length > 50000) {
      const tmpPath = path.join(os.tmpdir(), `${Date.now()}.json`);
      fs.writeFileSync(tmpPath, json, 'utf-8');
      process.stdout.write('@file:' + tmpPath);
    } else {
      process.stdout.write(json);
    }
  }
  process.exit(0);
}

/**
 * Output error message to stderr and exit
 * @param message - Error message
 */
function error(message: string): void {
  process.stderr.write('Error: ' + message + '\n');
  process.exit(1);
}

// ─── File & Config utilities ──────────────────────────────────────────────────

/**
 * Safely read a file, returning null on error
 * @param filePath - Path to file
 * @returns File content or null
 */
function safeReadFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    const error = err as Error;
    logger.warn('safeReadFile failed', { filePath, error: error.message });
    return null;
  }
}

interface Config {
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
  model_overrides?: Record<string, string> | null;
}

interface NestedField {
  section: string;
  field: string;
}

/**
 * Load configuration from .planning/config.json
 * @param cwd - Working directory
 * @returns Configuration object
 */
function loadConfig(cwd: string): Config {
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
  };

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // Migrate deprecated "depth" key to "granularity" with value mapping
    if ('depth' in parsed && !('granularity' in parsed)) {
      const depthToGranularity: Record<string, string> = { quick: 'coarse', standard: 'standard', comprehensive: 'fine' };
      parsed.granularity = depthToGranularity[parsed.depth as string] || parsed.depth;
      delete parsed.depth;
      try {
        fs.writeFileSync(configPath, JSON.stringify(parsed, null, 2), 'utf-8');
      } catch (err) {
        const error = err as Error;
        logger.warn('Failed to persist migrated config depth->granularity', { configPath, error: error.message });
      }
    }

    const get = (key: string, nested?: NestedField): unknown => {
      if (parsed[key] !== undefined) return parsed[key];
      if (nested && parsed[nested.section] && (parsed[nested.section] as Record<string, unknown>)[nested.field] !== undefined) {
        return (parsed[nested.section] as Record<string, unknown>)[nested.field];
      }
      return undefined;
    };

    const parallelization = (() => {
      const val = get('parallelization');
      if (typeof val === 'boolean') return val;
      if (typeof val === 'object' && val !== null && 'enabled' in val) return (val as Record<string, unknown>).enabled as boolean;
      return defaults.parallelization;
    })();

    return {
      model_profile: get('model_profile') as string ?? defaults.model_profile,
      commit_docs: get('commit_docs', { section: 'planning', field: 'commit_docs' }) as boolean ?? defaults.commit_docs,
      search_gitignored: get('search_gitignored', { section: 'planning', field: 'search_gitignored' }) as boolean ?? defaults.search_gitignored,
      branching_strategy: get('branching_strategy', { section: 'git', field: 'branching_strategy' }) as string ?? defaults.branching_strategy,
      phase_branch_template: get('phase_branch_template', { section: 'git', field: 'phase_branch_template' }) as string ?? defaults.phase_branch_template,
      milestone_branch_template: get('milestone_branch_template', { section: 'git', field: 'milestone_branch_template' }) as string ?? defaults.milestone_branch_template,
      research: get('research', { section: 'workflow', field: 'research' }) as boolean ?? defaults.research,
      plan_checker: get('plan_checker', { section: 'workflow', field: 'plan_check' }) as boolean ?? defaults.plan_checker,
      verifier: get('verifier', { section: 'workflow', field: 'verifier' }) as boolean ?? defaults.verifier,
      nyquist_validation: get('nyquist_validation', { section: 'workflow', field: 'nyquist_validation' }) as boolean ?? defaults.nyquist_validation,
      parallelization,
      brave_search: get('brave_search') as boolean ?? defaults.brave_search,
      model_overrides: parsed.model_overrides as Record<string, string> | null ?? null,
    };
  } catch (err) {
    const error = err as Error;
    logger.warn('Failed to load config, using defaults', { configPath, error: error.message });
    return defaults;
  }
}

// ─── Git utilities ────────────────────────────────────────────────────────────

/**
 * Check if a path is gitignored
 * @param cwd - Working directory
 * @param targetPath - Path to check
 * @returns True if gitignored
 */
async function isGitIgnored(cwd: string, targetPath: string): Promise<boolean> {
  try {
    // --no-index checks .gitignore rules regardless of whether the file is tracked.
    const safePath = targetPath.replace(/[^a-zA-Z0-9._\-/]/g, '');
    await auditExec('git', ['check-ignore', '-q', '--no-index', '--', safePath], {
      context: 'isGitIgnored',
      timeout: 5000
    });
    return true;
  } catch (err) {
    const error = err as Error;
    logger.warn('git check-ignore failed, assuming not ignored', { targetPath, error: error.message });
    return false;
  }
}

interface GitResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Execute a git command
 * @param cwd - Working directory
 * @param args - Git arguments
 * @returns Git execution result
 */
async function execGit(cwd: string, args: string[]): Promise<GitResult> {
  try {
    const stdout = await auditExec('git', args, {
      context: 'execGit',
      timeout: 30000
    });
    return { exitCode: 0, stdout: stdout.trim(), stderr: '' };
  } catch (err) {
    const error = err as Error & { status?: number; stdout?: string; stderr?: string };
    logger.warn('execGit failed', { args, error: error.message });
    return {
      exitCode: error.status ?? 1,
      stdout: (error.stdout ?? '').toString().trim(),
      stderr: (error.stderr ?? '').toString().trim(),
    };
  }
}

// ─── Phase utilities ──────────────────────────────────────────────────────────

/**
 * Escape special regex characters
 * @param value - String to escape
 * @returns Escaped string
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize phase name to padded format
 * @param phase - Phase name
 * @returns Normalized phase name
 */
function normalizePhaseName(phase: string | number): string {
  const phaseStr = String(phase);
  const match = phaseStr.match(/^(\d+)([A-Z])?((?:\.\d+)*)/i);
  if (!match) return phaseStr;
  const padded = (match[1] ?? '').padStart(2, '0');
  const letter = match[2] ? match[2].toUpperCase() : '';
  const decimal = match[3] || '';
  return padded + letter + decimal;
}

/**
 * Compare phase numbers for sorting
 * @param a - First phase
 * @param b - Second phase
 * @returns Comparison result
 */
function comparePhaseNum(a: string | number, b: string | number): number {
  const pa = String(a).match(/^(\d+)([A-Z])?((?:\.\d+)*)/i);
  const pb = String(b).match(/^(\d+)([A-Z])?((?:\.\d+)*)/i);
  if (!pa || !pb) return String(a).localeCompare(String(b));
  const intDiff = parseInt(pa[1] ?? '0', 10) - parseInt(pb[1] ?? '0', 10);
  if (intDiff !== 0) return intDiff;
  // No letter sorts before letter: 12 < 12A < 12B
  const la = (pa[2] || '').toUpperCase();
  const lb = (pb[2] || '').toUpperCase();
  if (la !== lb) {
    if (!la) return -1;
    if (!lb) return 1;
    return la < lb ? -1 : 1;
  }
  // Segment-by-segment decimal comparison
  const aDecParts = pa[3] ? pa[3].slice(1).split('.').map(p => parseInt(p, 10)) : [];
  const bDecParts = pb[3] ? pb[3].slice(1).split('.').map(p => parseInt(p, 10)) : [];
  const maxLen = Math.max(aDecParts.length, bDecParts.length);
  if (aDecParts.length === 0 && bDecParts.length > 0) return -1;
  if (bDecParts.length === 0 && aDecParts.length > 0) return 1;
  for (let i = 0; i < maxLen; i++) {
    const av = Number.isFinite(aDecParts[i] ?? NaN) ? aDecParts[i]! : 0;
    const bv = Number.isFinite(bDecParts[i] ?? NaN) ? bDecParts[i]! : 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

interface PhaseSearchResult {
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

/**
 * Search for a phase directory
 * @param baseDir - Base directory to search
 * @param relBase - Relative base path
 * @param normalized - Normalized phase name
 * @returns Phase search result or null
 */
function searchPhaseInDir(baseDir: string, relBase: string, normalized: string): PhaseSearchResult | null {
  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort((a, b) => comparePhaseNum(a, b));
    const match = dirs.find(d => d.startsWith(normalized));
    if (!match) return null;

    const dirMatch = match.match(/^(\d+[A-Z]?(?:\.\d+)*)-?(.*)/i);
    const phaseNumber = dirMatch ? dirMatch[1] : normalized;
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
      phase_number: phaseNumber ?? '',
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
    const error = err as Error;
    logger.warn('Failed to search phase directory', { baseDir, normalized, error: error.message });
    return null;
  }
}

/**
 * Find phase internally
 * @param cwd - Working directory
 * @param phase - Phase identifier
 * @returns Phase search result or null
 */
function findPhaseInternal(cwd: string, phase: string): PhaseSearchResult | null {
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
      const versionMatch = archiveName.match(/^(v[\d.]+)-phases$/);
      const version: string = versionMatch?.[1] ?? '';
      const archivePath = path.join(milestonesDir, archiveName);
      const relBase = '.planning/milestones/' + archiveName;
      const result = searchPhaseInDir(archivePath, relBase, normalized);
      if (result) {
        result.archived = version;
        return result;
      }
    }
  } catch (err) {
    const error = err as Error;
    logger.warn('Failed while searching archived milestone phases', { milestonesDir, error: error.message });
  }

  return null;
}

interface ArchivedPhaseDir {
  name: string;
  milestone: string;
  basePath: string;
  fullPath: string;
}

/**
 * Get archived phase directories
 * @param cwd - Working directory
 * @returns Array of archived phase directories
 */
function getArchivedPhaseDirs(cwd: string): ArchivedPhaseDir[] {
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
      const versionMatch = archiveName.match(/^(v[\d.]+)-phases$/);
      const version = versionMatch?.[1] ?? '';
      const archivePath = path.join(milestonesDir, archiveName);
      const entries = fs.readdirSync(archivePath, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort((a, b) => comparePhaseNum(a, b));

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
    const error = err as Error;
    logger.warn('Failed to enumerate archived phase directories', { milestonesDir, error: error.message });
  }

  return results;
}

// ─── Roadmap & model utilities ────────────────────────────────────────────────

interface RoadmapPhaseResult {
  found: boolean;
  phase_number: string;
  phase_name: string;
  goal: string | null;
  section: string;
}

/**
 * Get roadmap phase info
 * @param cwd - Working directory
 * @param phaseNum - Phase number
 * @returns Roadmap phase result or null
 */
function getRoadmapPhaseInternal(cwd: string, phaseNum: string | number): RoadmapPhaseResult | null {
  if (!phaseNum) return null;
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  if (!fs.existsSync(roadmapPath)) return null;

  try {
    const content = fs.readFileSync(roadmapPath, 'utf-8');
    const escapedPhase = escapeRegex(phaseNum.toString());
    const phasePattern = new RegExp(`#{2,4}\\s*Phase\\s+${escapedPhase}:\\s*([^\\n]+)`, 'i');
    const headerMatch = content.match(phasePattern);
    if (!headerMatch) return null;

    const phaseName = headerMatch[1]?.trim() ?? '';
    const headerIndex = headerMatch.index ?? 0;
    const restOfContent = content.slice(headerIndex);
    const nextHeaderMatch = restOfContent.match(/\n#{2,4}\s+Phase\s+\d/i);
    const sectionEnd = nextHeaderMatch ? headerIndex + (nextHeaderMatch.index ?? 0) : content.length;
    const section = content.slice(headerIndex, sectionEnd).trim();

    const goalMatch = section.match(/\*\*Goal:\*\*\s*([^\n]+)/i);
    const goal = goalMatch?.[1]?.trim() ?? null;

    return {
      found: true,
      phase_number: phaseNum.toString(),
      phase_name: phaseName,
      goal,
      section,
    };
  } catch (err) {
    const error = err as Error;
    logger.warn('Failed to read roadmap phase metadata', { roadmapPath, phaseNum, error: error.message });
    return null;
  }
}

/**
 * Resolve model for agent type
 * @param cwd - Working directory
 * @param agentType - Agent type
 * @returns Model name
 */
function resolveModelInternal(cwd: string, agentType: string): string {
  const config = loadConfig(cwd);

  // Check per-agent override first
  const override = config.model_overrides?.[agentType];
  if (override) {
    return override === 'opus' ? 'inherit' : override;
  }

  // Fall back to profile lookup
  const profile = config.model_profile || 'balanced';
  const agentModels = MODEL_PROFILES[agentType];
  if (!agentModels) return 'sonnet';
  const resolved = agentModels[profile] || agentModels['balanced'] || 'sonnet';
  return resolved === 'opus' ? 'inherit' : resolved;
}

// ─── Misc utilities ───────────────────────────────────────────────────────────

/**
 * Check if path exists
 * @param cwd - Working directory
 * @param targetPath - Target path
 * @returns True if exists
 */
function pathExistsInternal(cwd: string, targetPath: string): boolean {
  const fullPath = path.isAbsolute(targetPath) ? targetPath : path.join(cwd, targetPath);
  try {
    fs.statSync(fullPath);
    return true;
  } catch (err) {
    const error = err as Error;
    logger.warn('Path existence check failed', { fullPath, error: error.message });
    return false;
  }
}

/**
 * Generate slug from text
 * @param text - Text to slugify
 * @returns Slug string or null
 */
function generateSlugInternal(text: string): string | null {
  if (!text) return null;
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

interface MilestoneInfo {
  version: string;
  name: string;
}

/**
 * Get milestone info from ROADMAP.md
 * @param cwd - Working directory
 * @returns Milestone info
 */
function getMilestoneInfo(cwd: string): MilestoneInfo {
  try {
    const roadmap = fs.readFileSync(path.join(cwd, '.planning', 'ROADMAP.md'), 'utf-8');

    // First: check for list-format roadmaps using 🚧 (in-progress) marker
    const inProgressMatch = roadmap.match(/🚧\s*\*\*v(\d+\.\d+)\s+([^*]+)\*\*/);
    if (inProgressMatch) {
      return {
        version: 'v' + inProgressMatch[1],
        name: inProgressMatch[2]?.trim() ?? '',
      };
    }

    // Second: heading-format roadmaps
    const cleaned = roadmap.replace(/<details>[\s\S]*?<\/details>/gi, '');
    const headingMatch = cleaned.match(/## .*v(\d+\.\d+)[:\s]+([^\n(]+)/);
    if (headingMatch) {
      return {
        version: 'v' + headingMatch[1],
        name: headingMatch[2]?.trim() ?? '',
      };
    }
    // Fallback: try bare version match
    const versionMatch = cleaned.match(/v(\d+\.\d+)/);
    return {
      version: versionMatch ? versionMatch[0] : 'v1.0',
      name: 'milestone',
    };
  } catch (err) {
    const error = err as Error;
    logger.warn('Failed to load milestone info, using fallback', { error: error.message });
    return { version: 'v1.0', name: 'milestone' };
  }
}

/**
 * Filter function type for milestone phase filtering
 */
interface MilestonePhaseFilter {
  (dirName: string): boolean;
  phaseCount: number;
}

/**
 * Get milestone phase filter function
 * @param cwd - Working directory
 * @returns Filter function
 */
function getMilestonePhaseFilter(cwd: string): MilestonePhaseFilter {
  const milestonePhaseNums = new Set<string>();
  try {
    const roadmap = fs.readFileSync(path.join(cwd, '.planning', 'ROADMAP.md'), 'utf-8');
    const phasePattern = /#{2,4}\s*Phase\s+(\d+[A-Z]?(?:\.\d+)*)\s*:/gi;
    let m: RegExpExecArray | null;
    while ((m = phasePattern.exec(roadmap)) !== null) {
      const phaseNum = m[1];
      if (phaseNum) {
        milestonePhaseNums.add(phaseNum);
      }
    }
  } catch (err) {
    const error = err as Error;
    logger.warn('Failed to parse milestone phases from roadmap', { error: error.message });
  }

  if (milestonePhaseNums.size === 0) {
    const passAll = () => true;
    passAll.phaseCount = 0;
    return passAll;
  }

  const normalized = new Set(
    [...milestonePhaseNums].map(n => (n.replace(/^0+/, '') || '0').toLowerCase())
  );

  const isDirInMilestone = (dirName: string): boolean => {
    const m = dirName.match(/^0*(\d+[A-Za-z]?(?:\.\d+)*)/);
    if (!m) return false;
    return normalized.has((m[1] ?? '').toLowerCase());
  };
  isDirInMilestone.phaseCount = milestonePhaseNums.size;
  return isDirInMilestone;
}

export {
  MODEL_PROFILES,
  output,
  error,
  safeReadFile,
  loadConfig,
  isGitIgnored,
  execGit,
  escapeRegex,
  normalizePhaseName,
  comparePhaseNum,
  searchPhaseInDir,
  findPhaseInternal,
  getArchivedPhaseDirs,
  getRoadmapPhaseInternal,
  resolveModelInternal,
  pathExistsInternal,
  generateSlugInternal,
  getMilestoneInfo,
  getMilestonePhaseFilter,
  toPosixPath,
};

export type {
  ModelProfile,
  ModelProfiles,
  Config,
  GitResult,
  PhaseSearchResult,
  ArchivedPhaseDir,
  RoadmapPhaseResult,
  MilestoneInfo,
  MilestonePhaseFilter
};
