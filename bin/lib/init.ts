/**
 * Init — Compound init commands for workflow bootstrapping
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  loadConfig,
  resolveModelInternal,
  findPhaseInternal,
  getRoadmapPhaseInternal,
  pathExistsInternal,
  generateSlugInternal,
  getMilestoneInfo,
  normalizePhaseName,
  toPosixPath,
  output,
  error,
  type PhaseSearchResult,
  type MilestoneInfo
} from './core.js';
import { defaultLogger as logger } from './logger.js';
import { findFiles } from './fs-utils.js';
import { execWithTimeout } from './timeout-exec.js';
import { cmdListTodos } from './commands.js';

interface InitExecutePhaseResult {
  executor_model: string;
  verifier_model: string;
  commit_docs: boolean;
  parallelization: boolean;
  branching_strategy: string;
  phase_branch_template: string;
  milestone_branch_template: string;
  verifier_enabled: boolean;
  phase_found: boolean;
  phase_dir: string | null;
  phase_number: string | null;
  phase_name: string | null;
  phase_slug: string | null;
  phase_req_ids: string | null;
  plans: string[];
  summaries: string[];
  incomplete_plans: string[];
  plan_count: number;
  incomplete_count: number;
  branch_name: string | null;
  milestone_version: string;
  milestone_name: string;
  milestone_slug: string | null;
  state_exists: boolean;
  roadmap_exists: boolean;
  config_exists: boolean;
  state_path: string;
  roadmap_path: string;
  config_path: string;
}

interface InitPlanPhaseResult {
  researcher_model: string;
  planner_model: string;
  checker_model: string;
  research_enabled: boolean;
  plan_checker_enabled: boolean;
  nyquist_validation_enabled: boolean;
  commit_docs: boolean;
  phase_found: boolean;
  phase_dir: string | null;
  phase_number: string | null;
  phase_name: string | null;
  phase_slug: string | null;
  padded_phase: string | null;
  phase_req_ids: string | null;
  has_research: boolean;
  has_context: boolean;
  has_plans: boolean;
  plan_count: number;
  planning_exists: boolean;
  roadmap_exists: boolean;
  state_path: string;
  roadmap_path: string;
  requirements_path: string;
  context_path?: string;
  research_path?: string;
  verification_path?: string;
  uat_path?: string;
}

interface InitNewProjectResult {
  researcher_model: string;
  roadmapper_model: string;
  commit_docs: boolean;
  project_exists: boolean;
  has_codebase_map: boolean;
  planning_exists: boolean;
  has_existing_code: boolean;
  has_package_file: boolean;
  is_brownfield: boolean;
  needs_codebase_map: boolean;
  has_git: boolean;
  brave_search_available: boolean;
  project_path: string;
}

interface InitNewMilestoneResult {
  researcher_model: string;
  roadmapper_model: string;
  commit_docs: boolean;
  research_enabled: boolean;
  current_milestone: string;
  current_milestone_name: string;
  project_exists: boolean;
  roadmap_exists: boolean;
  state_exists: boolean;
  project_path: string;
  roadmap_path: string;
  state_path: string;
}

interface InitQuickResult {
  planner_model: string;
  executor_model: string;
  checker_model: string;
  verifier_model: string;
  commit_docs: boolean;
  quick_id: string;
  slug: string | null;
  description: string | null;
  date: string;
  timestamp: string;
  quick_dir: string;
  task_dir: string | null;
  roadmap_exists: boolean;
  planning_exists: boolean;
}

interface InitResumeResult {
  state_exists: boolean;
  roadmap_exists: boolean;
  project_exists: boolean;
  planning_exists: boolean;
  state_path: string;
  roadmap_path: string;
  project_path: string;
  has_interrupted_agent: boolean;
  interrupted_agent_id: string | null;
  commit_docs: boolean;
}

interface InitVerifyWorkResult {
  planner_model: string;
  checker_model: string;
  commit_docs: boolean;
  phase_found: boolean;
  phase_dir: string | null;
  phase_number: string | null;
  phase_name: string | null;
  has_verification: boolean;
}

interface InitPhaseOpResult {
  commit_docs: boolean;
  brave_search: boolean;
  phase_found: boolean;
  phase_dir: string | null;
  phase_number: string | null;
  phase_name: string | null;
  phase_slug: string | null;
  padded_phase: string | null;
  has_research: boolean;
  has_context: boolean;
  has_plans: boolean;
  has_verification: boolean;
  plan_count: number;
  roadmap_exists: boolean;
  planning_exists: boolean;
  state_path: string;
  roadmap_path: string;
  requirements_path: string;
  context_path?: string;
  research_path?: string;
  verification_path?: string;
  uat_path?: string;
}

interface InitTodosResult {
  commit_docs: boolean;
  date: string;
  timestamp: string;
  todo_count: number;
  todos: string[];
  area_filter: string | null;
  pending_dir: string;
  completed_dir: string;
  planning_exists: boolean;
  todos_dir_exists: boolean;
  pending_dir_exists: boolean;
}

interface InitMilestoneOpResult {
  commit_docs: boolean;
  milestone_version: string;
  milestone_name: string;
  milestone_slug: string | null;
  phase_count: number;
  completed_phases: number;
  all_phases_complete: boolean;
  archived_milestones: string[];
  archive_count: number;
  project_exists: boolean;
  roadmap_exists: boolean;
  state_exists: boolean;
  archive_exists: boolean;
  phases_dir_exists: boolean;
}

interface InitMapCodebaseResult {
  mapper_model: string;
  commit_docs: boolean;
  search_gitignored: boolean;
  parallelization: boolean;
  codebase_dir: string;
  existing_maps: string[];
  has_maps: boolean;
  planning_exists: boolean;
  codebase_dir_exists: boolean;
}

interface PhaseProgressInfo {
  number: string;
  name: string | null;
  directory: string;
  status: 'complete' | 'in_progress' | 'researched' | 'pending';
  plan_count: number;
  summary_count: number;
  has_research: boolean;
}

interface InitProgressResult {
  executor_model: string;
  planner_model: string;
  commit_docs: boolean;
  milestone_version: string;
  milestone_name: string;
  phases: PhaseProgressInfo[];
  phase_count: number;
  completed_count: number;
  in_progress_count: number;
  current_phase: PhaseProgressInfo | null;
  next_phase: PhaseProgressInfo | null;
  paused_at: string | null;
  has_work_in_progress: boolean;
  project_exists: boolean;
  roadmap_exists: boolean;
  state_exists: boolean;
  state_path: string;
  roadmap_path: string;
  project_path: string;
  config_path: string;
}

/**
 * Execute phase initialization command
 * @param cwd - Working directory
 * @param phase - Phase identifier
 * @param raw - Raw output flag
 */
export function cmdInitExecutePhase(cwd: string, phase: string, raw?: boolean): void {
  if (!phase) {
    error('phase required for init execute-phase');
  }

  const config = loadConfig(cwd);
  const phaseInfo = findPhaseInternal(cwd, phase);
  const milestone = getMilestoneInfo(cwd);

  const roadmapPhase = getRoadmapPhaseInternal(cwd, phase);
  const reqMatch = roadmapPhase?.section?.match(/^\*\*Requirements\*\*:[^\S\n]*([^\n]*)$/m);
  const reqExtracted = reqMatch
    ? reqMatch[1].replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean).join(', ')
    : null;
  const phase_req_ids = (reqExtracted && reqExtracted !== 'TBD') ? reqExtracted : null;

  const result: InitExecutePhaseResult = {
    // Models
    executor_model: resolveModelInternal(cwd, 'ez-executor'),
    verifier_model: resolveModelInternal(cwd, 'ez-verifier'),

    // Config flags
    commit_docs: config.commit_docs,
    parallelization: config.parallelization,
    branching_strategy: config.branching_strategy,
    phase_branch_template: config.phase_branch_template,
    milestone_branch_template: config.milestone_branch_template,
    verifier_enabled: config.verifier,

    // Phase info
    phase_found: !!phaseInfo,
    phase_dir: phaseInfo?.directory || null,
    phase_number: phaseInfo?.phase_number || null,
    phase_name: phaseInfo?.phase_name || null,
    phase_slug: phaseInfo?.phase_slug || null,
    phase_req_ids,

    // Plan inventory
    plans: phaseInfo?.plans || [],
    summaries: phaseInfo?.summaries || [],
    incomplete_plans: phaseInfo?.incomplete_plans || [],
    plan_count: phaseInfo?.plans?.length || 0,
    incomplete_count: phaseInfo?.incomplete_plans?.length || 0,

    // Branch name (pre-computed)
    branch_name: config.branching_strategy === 'phase' && phaseInfo
      ? config.phase_branch_template
          .replace('{phase}', phaseInfo.phase_number)
          .replace('{slug}', phaseInfo.phase_slug || 'phase')
      : config.branching_strategy === 'milestone'
        ? config.milestone_branch_template
            .replace('{milestone}', milestone.version)
            .replace('{slug}', generateSlugInternal(milestone.name) || 'milestone')
        : null,

    // Milestone info
    milestone_version: milestone.version,
    milestone_name: milestone.name,
    milestone_slug: generateSlugInternal(milestone.name),

    // File existence
    state_exists: pathExistsInternal(cwd, '.planning/STATE.md'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    config_exists: pathExistsInternal(cwd, '.planning/config.json'),
    // File paths
    state_path: '.planning/STATE.md',
    roadmap_path: '.planning/ROADMAP.md',
    config_path: '.planning/config.json',
  };

  output(result as unknown as Record<string, unknown>, raw);
}

/**
 * Plan phase initialization command
 * @param cwd - Working directory
 * @param phase - Phase identifier
 * @param raw - Raw output flag
 */
export function cmdInitPlanPhase(cwd: string, phase: string, raw?: boolean): void {
  if (!phase) {
    error('phase required for init plan-phase');
  }

  const config = loadConfig(cwd);
  const phaseInfo = findPhaseInternal(cwd, phase);

  const roadmapPhase = getRoadmapPhaseInternal(cwd, phase);
  const reqMatch = roadmapPhase?.section?.match(/^\*\*Requirements\*\*:[^\S\n]*([^\n]*)$/m);
  const reqExtracted = reqMatch
    ? reqMatch[1].replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean).join(', ')
    : null;
  const phase_req_ids = (reqExtracted && reqExtracted !== 'TBD') ? reqExtracted : null;

  const result: InitPlanPhaseResult = {
    // Models
    researcher_model: resolveModelInternal(cwd, 'ez-phase-researcher'),
    planner_model: resolveModelInternal(cwd, 'ez-planner'),
    checker_model: resolveModelInternal(cwd, 'ez-plan-checker'),

    // Workflow flags
    research_enabled: config.research,
    plan_checker_enabled: config.plan_checker,
    nyquist_validation_enabled: config.nyquist_validation,
    commit_docs: config.commit_docs,

    // Phase info
    phase_found: !!phaseInfo,
    phase_dir: phaseInfo?.directory || null,
    phase_number: phaseInfo?.phase_number || null,
    phase_name: phaseInfo?.phase_name || null,
    phase_slug: phaseInfo?.phase_slug || null,
    padded_phase: phaseInfo?.phase_number ? normalizePhaseName(phaseInfo.phase_number) : null,
    phase_req_ids,

    // Existing artifacts
    has_research: phaseInfo?.has_research || false,
    has_context: phaseInfo?.has_context || false,
    has_plans: (phaseInfo?.plans?.length || 0) > 0,
    plan_count: phaseInfo?.plans?.length || 0,

    // Environment
    planning_exists: pathExistsInternal(cwd, '.planning'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),

    // File paths
    state_path: '.planning/STATE.md',
    roadmap_path: '.planning/ROADMAP.md',
    requirements_path: '.planning/REQUIREMENTS.md',
  };

  if (phaseInfo?.directory) {
    // Find *-CONTEXT.md in phase directory
    const phaseDirFull = path.join(cwd, phaseInfo.directory);
    try {
      const files = fs.readdirSync(phaseDirFull);
      const contextFile = files.find(f => f.endsWith('-CONTEXT.md') || f === 'CONTEXT.md');
      if (contextFile) {
        result.context_path = toPosixPath(path.join(phaseInfo.directory, contextFile));
      }
      const researchFile = files.find(f => f.endsWith('-RESEARCH.md') || f === 'RESEARCH.md');
      if (researchFile) {
        result.research_path = toPosixPath(path.join(phaseInfo.directory, researchFile));
      }
      const verificationFile = files.find(f => f.endsWith('-VERIFICATION.md') || f === 'VERIFICATION.md');
      if (verificationFile) {
        result.verification_path = toPosixPath(path.join(phaseInfo.directory, verificationFile));
      }
      const uatFile = files.find(f => f.endsWith('-UAT.md') || f === 'UAT.md');
      if (uatFile) {
        result.uat_path = toPosixPath(path.join(phaseInfo.directory, uatFile));
      }
    } catch (err) {
      logger.warn('Failed to inspect phase artifacts in cmdInitPlanPhase', { phaseDirFull, error: (err as Error).message });
    }
  }

  output(result as unknown as Record<string, unknown>, raw);
}

/**
 * New project initialization command
 * @param cwd - Working directory
 * @param raw - Raw output flag
 */
export async function cmdInitNewProject(cwd: string, raw?: boolean): Promise<void> {
  const config = loadConfig(cwd);

  // Detect Brave Search API key availability (prefer ~/.ez)
  const homedir = os.homedir();
  const braveKeyCandidates = [
    path.join(homedir, '.ez', 'brave_api_key'),
  ];
  const hasBraveSearch = !!(process.env.BRAVE_API_KEY || braveKeyCandidates.some(p => fs.existsSync(p)));

  // Detect existing code
  let hasCode = false;
  let hasPackageFile = false;
  try {
    const codeFiles = findFiles(cwd, [
      /\.ts$/,
      /\.js$/,
      /\.py$/,
      /\.go$/,
      /\.rs$/,
      /\.swift$/,
      /\.java$/,
    ], {
      maxDepth: 3,
      exclude: ['node_modules', '.git'],
    });
    hasCode = codeFiles.length > 0;
  } catch (err) {
    logger.warn('Failed to detect existing source files in cmdInitNewProject', { cwd, error: (err as Error).message });
  }

  hasPackageFile = pathExistsInternal(cwd, 'package.json') ||
                   pathExistsInternal(cwd, 'requirements.txt') ||
                   pathExistsInternal(cwd, 'Cargo.toml') ||
                   pathExistsInternal(cwd, 'go.mod') ||
                   pathExistsInternal(cwd, 'Package.swift');

  let hasGit = pathExistsInternal(cwd, '.git');
  try {
    const gitProbe = await execWithTimeout('git', ['rev-parse', '--is-inside-work-tree'], { timeout: 5000, fallback: '' });
    if (gitProbe === '') {
      logger.info('Fallback activated during init new-project git probe', { command: 'git rev-parse --is-inside-work-tree' });
    } else {
      hasGit = gitProbe.trim() === 'true' || hasGit;
    }
  } catch (err) {
    logger.warn('Init new-project git probe failed without fallback', { error: (err as Error).message });
  }

  const result: InitNewProjectResult = {
    // Models
    researcher_model: resolveModelInternal(cwd, 'ez-project-researcher'),
    roadmapper_model: resolveModelInternal(cwd, 'ez-roadmapper'),

    // Config
    commit_docs: config.commit_docs,

    // Existing state
    project_exists: pathExistsInternal(cwd, '.planning/PROJECT.md'),
    has_codebase_map: pathExistsInternal(cwd, '.planning/codebase'),
    planning_exists: pathExistsInternal(cwd, '.planning'),

    // Brownfield detection
    has_existing_code: hasCode,
    has_package_file: hasPackageFile,
    is_brownfield: hasCode || hasPackageFile,
    needs_codebase_map: (hasCode || hasPackageFile) && !pathExistsInternal(cwd, '.planning/codebase'),

    // Git state
    has_git: hasGit,

    // Enhanced search
    brave_search_available: hasBraveSearch,

    // File paths
    project_path: '.planning/PROJECT.md',
  };

  output(result as unknown as Record<string, unknown>, raw);
}

/**
 * New milestone initialization command
 * @param cwd - Working directory
 * @param raw - Raw output flag
 */
export function cmdInitNewMilestone(cwd: string, raw?: boolean): void {
  const config = loadConfig(cwd);
  const milestone = getMilestoneInfo(cwd);

  const result: InitNewMilestoneResult = {
    // Models
    researcher_model: resolveModelInternal(cwd, 'ez-project-researcher'),
    roadmapper_model: resolveModelInternal(cwd, 'ez-roadmapper'),

    // Config
    commit_docs: config.commit_docs,
    research_enabled: config.research,

    // Current milestone
    current_milestone: milestone.version,
    current_milestone_name: milestone.name,

    // File existence
    project_exists: pathExistsInternal(cwd, '.planning/PROJECT.md'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    state_exists: pathExistsInternal(cwd, '.planning/STATE.md'),

    // File paths
    project_path: '.planning/PROJECT.md',
    roadmap_path: '.planning/ROADMAP.md',
    state_path: '.planning/STATE.md',
  };

  output(result as unknown as Record<string, unknown>, raw);
}

/**
 * Quick task initialization command
 * @param cwd - Working directory
 * @param description - Task description
 * @param raw - Raw output flag
 */
export function cmdInitQuick(cwd: string, description: string, raw?: boolean): void {
  const config = loadConfig(cwd);
  const now = new Date();
  const slug = description ? generateSlugInternal(description)?.substring(0, 40) : null;

  // Generate collision-resistant quick task ID: YYMMDD-xxx
  // xxx = 2-second precision blocks since midnight, encoded as 3-char Base36 (lowercase)
  // Range: 000 (00:00:00) to xbz (23:59:58), guaranteed 3 chars for any time of day.
  // Provides ~2s uniqueness window per user — practically collision-free across a team.
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateStr = yy + mm + dd;
  const secondsSinceMidnight = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const timeBlocks = Math.floor(secondsSinceMidnight / 2);
  const timeEncoded = timeBlocks.toString(36).padStart(3, '0');
  const quickId = dateStr + '-' + timeEncoded;

  const result: InitQuickResult = {
    // Models
    planner_model: resolveModelInternal(cwd, 'ez-planner'),
    executor_model: resolveModelInternal(cwd, 'ez-executor'),
    checker_model: resolveModelInternal(cwd, 'ez-plan-checker'),
    verifier_model: resolveModelInternal(cwd, 'ez-verifier'),

    // Config
    commit_docs: config.commit_docs,

    // Quick task info
    quick_id: quickId,
    slug: slug,
    description: description || null,

    // Timestamps
    date: now.toISOString().split('T')[0],
    timestamp: now.toISOString(),

    // Paths
    quick_dir: '.planning/quick',
    task_dir: slug ? `.planning/quick/${quickId}-${slug}` : null,

    // File existence
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    planning_exists: pathExistsInternal(cwd, '.planning'),

  };

  output(result as unknown as Record<string, unknown>, raw);
}

/**
 * Resume initialization command
 * @param cwd - Working directory
 * @param raw - Raw output flag
 */
export function cmdInitResume(cwd: string, raw?: boolean): void {
  const config = loadConfig(cwd);

  // Check for interrupted agent
  let interruptedAgentId: string | null = null;
  try {
    interruptedAgentId = fs.readFileSync(path.join(cwd, '.planning', 'current-agent-id.txt'), 'utf-8').trim();
  } catch (err) {
    logger.warn('Failed to read current-agent-id marker in cmdInitResume', { cwd, error: (err as Error).message });
  }

  const result: InitResumeResult = {
    // File existence
    state_exists: pathExistsInternal(cwd, '.planning/STATE.md'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    project_exists: pathExistsInternal(cwd, '.planning/PROJECT.md'),
    planning_exists: pathExistsInternal(cwd, '.planning'),

    // File paths
    state_path: '.planning/STATE.md',
    roadmap_path: '.planning/ROADMAP.md',
    project_path: '.planning/PROJECT.md',

    // Agent state
    has_interrupted_agent: !!interruptedAgentId,
    interrupted_agent_id: interruptedAgentId,

    // Config
    commit_docs: config.commit_docs,
  };

  output(result as unknown as Record<string, unknown>, raw);
}

/**
 * Verify work initialization command
 * @param cwd - Working directory
 * @param phase - Phase identifier
 * @param raw - Raw output flag
 */
export function cmdInitVerifyWork(cwd: string, phase: string, raw?: boolean): void {
  if (!phase) {
    error('phase required for init verify-work');
  }

  const config = loadConfig(cwd);
  const phaseInfo = findPhaseInternal(cwd, phase);

  const result: InitVerifyWorkResult = {
    // Models
    planner_model: resolveModelInternal(cwd, 'ez-planner'),
    checker_model: resolveModelInternal(cwd, 'ez-plan-checker'),

    // Config
    commit_docs: config.commit_docs,

    // Phase info
    phase_found: !!phaseInfo,
    phase_dir: phaseInfo?.directory || null,
    phase_number: phaseInfo?.phase_number || null,
    phase_name: phaseInfo?.phase_name || null,

    // Existing artifacts
    has_verification: phaseInfo?.has_verification || false,
  };

  output(result as unknown as Record<string, unknown>, raw);
}

/**
 * Phase operation initialization command
 * @param cwd - Working directory
 * @param phase - Phase identifier
 * @param raw - Raw output flag
 */
export function cmdInitPhaseOp(cwd: string, phase: string, raw?: boolean): void {
  const config = loadConfig(cwd);
  let phaseInfo = findPhaseInternal(cwd, phase);

  // Fallback to ROADMAP.md if no directory exists (e.g., Plans: TBD)
  if (!phaseInfo) {
    const roadmapPhase = getRoadmapPhaseInternal(cwd, phase);
    if (roadmapPhase?.found) {
      const phaseName = roadmapPhase.phase_name;
      phaseInfo = {
        found: true,
        directory: null,
        phase_number: roadmapPhase.phase_number,
        phase_name: phaseName,
        phase_slug: phaseName ? phaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : null,
        plans: [],
        summaries: [],
        incomplete_plans: [],
        has_research: false,
        has_context: false,
        has_verification: false,
      } as PhaseSearchResult;
    }
  }

  const result: InitPhaseOpResult = {
    // Config
    commit_docs: config.commit_docs,
    brave_search: config.brave_search,

    // Phase info
    phase_found: !!phaseInfo,
    phase_dir: phaseInfo?.directory || null,
    phase_number: phaseInfo?.phase_number || null,
    phase_name: phaseInfo?.phase_name || null,
    phase_slug: phaseInfo?.phase_slug || null,
    padded_phase: phaseInfo?.phase_number ? normalizePhaseName(phaseInfo.phase_number) : null,

    // Existing artifacts
    has_research: phaseInfo?.has_research || false,
    has_context: phaseInfo?.has_context || false,
    has_plans: (phaseInfo?.plans?.length || 0) > 0,
    has_verification: phaseInfo?.has_verification || false,
    plan_count: phaseInfo?.plans?.length || 0,

    // File existence
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    planning_exists: pathExistsInternal(cwd, '.planning'),

    // File paths
    state_path: '.planning/STATE.md',
    roadmap_path: '.planning/ROADMAP.md',
    requirements_path: '.planning/REQUIREMENTS.md',
  };

  if (phaseInfo?.directory) {
    const phaseDirFull = path.join(cwd, phaseInfo.directory);
    try {
      const files = fs.readdirSync(phaseDirFull);
      const contextFile = files.find(f => f.endsWith('-CONTEXT.md') || f === 'CONTEXT.md');
      if (contextFile) {
        result.context_path = toPosixPath(path.join(phaseInfo.directory, contextFile));
      }
      const researchFile = files.find(f => f.endsWith('-RESEARCH.md') || f === 'RESEARCH.md');
      if (researchFile) {
        result.research_path = toPosixPath(path.join(phaseInfo.directory, researchFile));
      }
      const verificationFile = files.find(f => f.endsWith('-VERIFICATION.md') || f === 'VERIFICATION.md');
      if (verificationFile) {
        result.verification_path = toPosixPath(path.join(phaseInfo.directory, verificationFile));
      }
      const uatFile = files.find(f => f.endsWith('-UAT.md') || f === 'UAT.md');
      if (uatFile) {
        result.uat_path = toPosixPath(path.join(phaseInfo.directory, uatFile));
      }
    } catch (err) {
      logger.warn('Failed to inspect phase artifacts in cmdInitPhaseOp', { phaseDirFull, error: (err as Error).message });
    }
  }

  output(result as unknown as Record<string, unknown>, raw);
}

/**
 * Todos initialization command
 * @param cwd - Working directory
 * @param area - Area filter
 * @param raw - Raw output flag
 */
export function cmdInitTodos(cwd: string, area: string, raw?: boolean): void {
  // Reuse cmdListTodos from commands.cjs and add init-specific metadata
  const config = loadConfig(cwd);
  const now = new Date();
  const todosResult = cmdListTodos(cwd, area, true); // Get raw result

  const result: InitTodosResult = {
    // Config
    commit_docs: config.commit_docs,

    // Timestamps
    date: now.toISOString().split('T')[0],
    timestamp: now.toISOString(),

    // Todo inventory (from cmdListTodos)
    todo_count: todosResult.count,
    todos: todosResult.todos,
    area_filter: area || null,

    // Paths
    pending_dir: '.planning/todos/pending',
    completed_dir: '.planning/todos/completed',

    // File existence
    planning_exists: pathExistsInternal(cwd, '.planning'),
    todos_dir_exists: pathExistsInternal(cwd, '.planning/todos'),
    pending_dir_exists: pathExistsInternal(cwd, '.planning/todos/pending'),
  };

  output(result as unknown as Record<string, unknown>, raw);
}

/**
 * Milestone operation initialization command
 * @param cwd - Working directory
 * @param raw - Raw output flag
 */
export function cmdInitMilestoneOp(cwd: string, raw?: boolean): void {
  const config = loadConfig(cwd);
  const milestone = getMilestoneInfo(cwd);

  // Count phases
  let phaseCount = 0;
  let completedPhases = 0;
  const phasesDir = path.join(cwd, '.planning', 'phases');
  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    phaseCount = dirs.length;

    // Count phases with summaries (completed)
    for (const dir of dirs) {
      try {
        const phaseFiles = fs.readdirSync(path.join(phasesDir, dir));
        const hasSummary = phaseFiles.some(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
        if (hasSummary) completedPhases++;
      } catch (err) {
        logger.warn('Failed to inspect phase directory in cmdInitMilestoneOp', { dir, error: (err as Error).message });
      }
    }
  } catch (err) {
    logger.warn('Failed to list phase directories in cmdInitMilestoneOp', { phasesDir, error: (err as Error).message });
  }

  // Check archive
  const archiveDir = path.join(cwd, '.planning', 'archive');
  let archivedMilestones: string[] = [];
  try {
    archivedMilestones = fs.readdirSync(archiveDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);
  } catch (err) {
    logger.warn('Failed to list archived milestones in cmdInitMilestoneOp', { archiveDir, error: (err as Error).message });
  }

  const result: InitMilestoneOpResult = {
    // Config
    commit_docs: config.commit_docs,

    // Current milestone
    milestone_version: milestone.version,
    milestone_name: milestone.name,
    milestone_slug: generateSlugInternal(milestone.name),

    // Phase counts
    phase_count: phaseCount,
    completed_phases: completedPhases,
    all_phases_complete: phaseCount > 0 && phaseCount === completedPhases,

    // Archive
    archived_milestones: archivedMilestones,
    archive_count: archivedMilestones.length,

    // File existence
    project_exists: pathExistsInternal(cwd, '.planning/PROJECT.md'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    state_exists: pathExistsInternal(cwd, '.planning/STATE.md'),
    archive_exists: pathExistsInternal(cwd, '.planning/archive'),
    phases_dir_exists: pathExistsInternal(cwd, '.planning/phases'),
  };

  output(result as unknown as Record<string, unknown>, raw);
}

/**
 * Map codebase initialization command
 * @param cwd - Working directory
 * @param raw - Raw output flag
 */
export function cmdInitMapCodebase(cwd: string, raw?: boolean): void {
  const config = loadConfig(cwd);

  // Check for existing codebase maps
  const codebaseDir = path.join(cwd, '.planning', 'codebase');
  let existingMaps: string[] = [];
  try {
    existingMaps = fs.readdirSync(codebaseDir).filter(f => f.endsWith('.md'));
  } catch (err) {
    logger.warn('Failed to list codebase map files in cmdInitMapCodebase', { codebaseDir, error: (err as Error).message });
  }

  const result: InitMapCodebaseResult = {
    // Models
    mapper_model: resolveModelInternal(cwd, 'ez-codebase-mapper'),

    // Config
    commit_docs: config.commit_docs,
    search_gitignored: config.search_gitignored,
    parallelization: config.parallelization,

    // Paths
    codebase_dir: '.planning/codebase',

    // Existing maps
    existing_maps: existingMaps,
    has_maps: existingMaps.length > 0,

    // File existence
    planning_exists: pathExistsInternal(cwd, '.planning'),
    codebase_dir_exists: pathExistsInternal(cwd, '.planning/codebase'),
  };

  output(result as unknown as Record<string, unknown>, raw);
}

/**
 * Progress initialization command
 * @param cwd - Working directory
 * @param raw - Raw output flag
 */
export function cmdInitProgress(cwd: string, raw?: boolean): void {
  const config = loadConfig(cwd);
  const milestone = getMilestoneInfo(cwd);

  // Analyze phases
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const phases: PhaseProgressInfo[] = [];
  let currentPhase: PhaseProgressInfo | null = null;
  let nextPhase: PhaseProgressInfo | null = null;

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();

    for (const dir of dirs) {
      const match = dir.match(/^(\d+(?:\.\d+)*)-?(.*)/);
      const phaseNumber = match ? match[1] : dir;
      const phaseName = match && match[2] ? match[2] : null;

      const phasePath = path.join(phasesDir, dir);
      const phaseFiles = fs.readdirSync(phasePath);

      const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md');
      const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
      const hasResearch = phaseFiles.some(f => f.endsWith('-RESEARCH.md') || f === 'RESEARCH.md');

      const status = summaries.length >= plans.length && plans.length > 0 ? 'complete' :
                     plans.length > 0 ? 'in_progress' :
                     hasResearch ? 'researched' : 'pending';

      const phaseInfo: PhaseProgressInfo = {
        number: phaseNumber,
        name: phaseName,
        directory: '.planning/phases/' + dir,
        status,
        plan_count: plans.length,
        summary_count: summaries.length,
        has_research: hasResearch,
      };

      phases.push(phaseInfo);

      // Find current (first incomplete with plans) and next (first pending)
      if (!currentPhase && (status === 'in_progress' || status === 'researched')) {
        currentPhase = phaseInfo;
      }
      if (!nextPhase && status === 'pending') {
        nextPhase = phaseInfo;
      }
    }
  } catch (err) {
    logger.warn('Failed to analyze phase progress in cmdInitProgress', { phasesDir, error: (err as Error).message });
  }

  // Check for paused work
  let pausedAt: string | null = null;
  try {
    const state = fs.readFileSync(path.join(cwd, '.planning', 'STATE.md'), 'utf-8');
    const pauseMatch = state.match(/\*\*Paused At:\*\*\s*(.+)/);
    if (pauseMatch) pausedAt = pauseMatch[1].trim();
  } catch (err) {
    logger.warn('Failed to read paused state in cmdInitProgress', { cwd, error: (err as Error).message });
  }

  const result: InitProgressResult = {
    // Models
    executor_model: resolveModelInternal(cwd, 'ez-executor'),
    planner_model: resolveModelInternal(cwd, 'ez-planner'),

    // Config
    commit_docs: config.commit_docs,

    // Milestone
    milestone_version: milestone.version,
    milestone_name: milestone.name,

    // Phase overview
    phases,
    phase_count: phases.length,
    completed_count: phases.filter(p => p.status === 'complete').length,
    in_progress_count: phases.filter(p => p.status === 'in_progress').length,

    // Current state
    current_phase: currentPhase,
    next_phase: nextPhase,
    paused_at: pausedAt,
    has_work_in_progress: !!currentPhase,

    // File existence
    project_exists: pathExistsInternal(cwd, '.planning/PROJECT.md'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    state_exists: pathExistsInternal(cwd, '.planning/STATE.md'),
    // File paths
    state_path: '.planning/STATE.md',
    roadmap_path: '.planning/ROADMAP.md',
    project_path: '.planning/PROJECT.md',
    config_path: '.planning/config.json',
  };

  output(result as unknown as Record<string, unknown>, raw);
}
