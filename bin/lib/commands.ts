/**
 * Commands — Standalone utility commands
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  safeReadFile,
  loadConfig,
  isGitIgnored,
  execGit,
  normalizePhaseName,
  comparePhaseNum,
  getArchivedPhaseDirs,
  generateSlugInternal,
  getMilestoneInfo,
  resolveModelInternal,
  MODEL_PROFILES,
  toPosixPath,
  output,
  error,
  findPhaseInternal
} from './core.js';
import { extractFrontmatter } from './frontmatter.js';
import Logger, { defaultLogger as logger } from './logger.js';

interface TodoEntry {
  file: string;
  created: string;
  title: string;
  area: string;
  path: string;
}

interface ListTodosResult {
  count: number;
  todos: TodoEntry[];
}

interface HistoryDigest {
  phases: Record<string, { name: string; provides: string[]; affects: string[]; patterns: string[] }>;
  decisions: Array<{ phase: string; decision: string }>;
  tech_stack: string[];
}

interface WebSearchOptions {
  limit?: number;
  freshness?: string;
}

interface WebSearchResult {
  title: string;
  url: string;
  description: string;
  age: string | null;
}

interface PhaseProgress {
  number: string;
  name: string;
  plans: number;
  summaries: number;
  status: string;
}

interface ProgressResult {
  milestone_version: string;
  milestone_name: string;
  phases: PhaseProgress[];
  total_plans: number;
  total_summaries: number;
  percent: number;
}

interface ScaffoldOptions {
  phase?: string;
  name?: string;
}

interface StatsResult {
  milestone_version: string;
  milestone_name: string;
  phases: PhaseProgress[];
  phases_completed: number;
  phases_total: number;
  total_plans: number;
  total_summaries: number;
  percent: number;
  requirements_total: number;
  requirements_complete: number;
  git_commits: number;
  git_first_commit_date: string | null;
  last_activity: string | null;
}

function cmdGenerateSlug(text: string | undefined, raw: boolean | undefined): void {
  if (!text) {
    error('text required for slug generation');
  }

  const slug = text!
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const result = { slug };
  output(result, raw, slug);
}

function cmdCurrentTimestamp(format: string | undefined, raw: boolean | undefined): void {
  const now = new Date();
  let result: string;

  switch (format) {
    case 'date':
      result = now.toISOString().split('T')[0];
      break;
    case 'filename':
      result = now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
      break;
    case 'full':
    default:
      result = now.toISOString();
      break;
  }

  output({ timestamp: result } as unknown as Record<string, unknown>, raw, result);
}

function cmdListTodos(cwd: string, area: string | undefined, raw: boolean | undefined): ListTodosResult {
  const pendingDir = path.join(cwd, '.planning', 'todos', 'pending');

  let count = 0;
  const todos: TodoEntry[] = [];

  try {
    const files = fs.readdirSync(pendingDir).filter(f => f.endsWith('.md'));

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(pendingDir, file), 'utf-8');
        const createdMatch = content.match(/^created:\s*(.+)$/m);
        const titleMatch = content.match(/^title:\s*(.+)$/m);
        const areaMatch = content.match(/^area:\s*(.+)$/m);

        const todoArea = areaMatch ? areaMatch[1]?.trim() ?? 'general' : 'general';

        // Apply area filter if specified
        if (area && todoArea !== area) continue;

        count++;
        todos.push({
          file,
          created: createdMatch ? createdMatch[1]?.trim() ?? 'unknown' : 'unknown',
          title: titleMatch ? titleMatch[1]?.trim() ?? 'Untitled' : 'Untitled',
          area: todoArea,
          path: toPosixPath(path.join('.planning', 'todos', 'pending', file)),
        });
      } catch (err) {
        const error = err as Error;
        logger.warn('Failed to parse todo file in cmdListTodos', { file, error: error.message });
      }
    }
  } catch (err) {
    const error = err as Error;
    logger.warn('Failed to list pending todos in cmdListTodos', { pendingDir, error: error.message });
  }

  const result = { count, todos };
  output(result, raw, count.toString());
  return result;
}

function cmdVerifyPathExists(cwd: string, targetPath: string | undefined, raw: boolean | undefined): void {
  if (!targetPath) {
    error('path required for verification');
  }

  const fullPath = path.isAbsolute(targetPath!) ? targetPath! : path.join(cwd, targetPath!);

  try {
    const stats = fs.statSync(fullPath);
    const type = stats.isDirectory() ? 'directory' : stats.isFile() ? 'file' : 'other';
    const result = { exists: true, type };
    output(result, raw, 'true');
  } catch (err) {
    const error = err as Error;
    logger.warn('Path verification failed in cmdVerifyPathExists', { fullPath, error: error.message });
    const result = { exists: false, type: null };
    output(result, raw, 'false');
  }
}

function cmdHistoryDigest(cwd: string, raw: boolean | undefined): HistoryDigest {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const digest: HistoryDigest = { phases: {}, decisions: [], tech_stack: [] };

  // Collect all phase directories: archived + current
  const allPhaseDirs: Array<{ name: string; fullPath: string; milestone: string | null }> = [];

  // Add archived phases first (oldest milestones first)
  const archived = getArchivedPhaseDirs(cwd);
  for (const a of archived) {
    allPhaseDirs.push({ name: a.name, fullPath: a.fullPath, milestone: a.milestone });
  }

  // Add current phases
  if (fs.existsSync(phasesDir)) {
    try {
      const currentDirs = fs.readdirSync(phasesDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name)
        .sort();
      for (const dir of currentDirs) {
        allPhaseDirs.push({ name: dir, fullPath: path.join(phasesDir, dir), milestone: null });
      }
    } catch (err) {
      const error = err as Error;
      logger.warn('Failed to enumerate current phase directories in cmdHistoryDigest', { phasesDir, error: error.message });
    }
  }

  if (allPhaseDirs.length === 0) {
    output(digest as unknown as Record<string, unknown>, raw);
    return digest;
  }

  try {
    for (const { name: dir, fullPath: dirPath } of allPhaseDirs) {
      const summaries = fs.readdirSync(dirPath).filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');

      for (const summary of summaries) {
        try {
          const content = fs.readFileSync(path.join(dirPath, summary), 'utf-8');
          const fm = extractFrontmatter(content);

          const phaseNum = (fm.phase as string) ?? dir.split('-')[0] ?? 'unknown';

          if (!digest.phases[phaseNum]) {
            digest.phases[phaseNum] = {
              name: (fm.name as string) ?? dir.split('-').slice(1).join(' ') ?? 'Unknown',
              provides: [],
              affects: [],
              patterns: []
            };
          }

          // Merge provides
          const depGraph = fm['dependency-graph'] as Record<string, string[]> | undefined;
          if (depGraph && depGraph.provides) {
            depGraph.provides.forEach((p: string) => digest.phases[phaseNum].provides.push(p));
          } else if (fm.provides && Array.isArray(fm.provides)) {
            (fm.provides as string[]).forEach((p: string) => digest.phases[phaseNum].provides.push(p));
          }

          // Merge affects
          if (depGraph && depGraph.affects) {
            depGraph.affects.forEach((a: string) => digest.phases[phaseNum].affects.push(a));
          }

          // Merge patterns
          if (fm['patterns-established'] && Array.isArray(fm['patterns-established'])) {
            (fm['patterns-established'] as string[]).forEach((p: string) => digest.phases[phaseNum].patterns.push(p));
          }

          // Merge decisions
          if (fm['key-decisions'] && Array.isArray(fm['key-decisions'])) {
            (fm['key-decisions'] as string[]).forEach((d: string) => {
              digest.decisions.push({ phase: phaseNum, decision: d });
            });
          }

          // Merge tech stack
          const techStack = fm['tech-stack'] as { added?: (string | { name: string })[] } | undefined;
          if (techStack && techStack.added) {
            techStack.added.forEach((t: string | { name: string }) => digest.tech_stack.push(typeof t === 'string' ? t : t.name));
          }

        } catch (err) {
          const error = err as Error;
          logger.warn('Skipping malformed summary in cmdHistoryDigest', { summary, dirPath, error: error.message });
        }
      }
    }

    output(digest as unknown as Record<string, unknown>, raw);
  } catch (err) {
    const errObj = err as Error;
    logger.error('Failed to generate history digest', { error: errObj.message });
    output({ error: 'Failed to generate history digest' } as unknown as Record<string, unknown>, raw, 'failed');
  }

  return digest;
}

function cmdResolveModel(cwd: string, agentType: string | undefined, raw: boolean | undefined): void {
  if (!agentType) {
    error('agent-type required');
  }

  const config = loadConfig(cwd);
  const profile = config.model_profile ?? 'balanced';
  const model = resolveModelInternal(cwd, agentType!);

  const agentModels = MODEL_PROFILES[agentType as keyof typeof MODEL_PROFILES];
  const result = agentModels
    ? { model, profile }
    : { model, profile, unknown_agent: true };
  output(result as unknown as Record<string, unknown>, raw, model);
}

async function cmdCommit(cwd: string, message: string | undefined, files: string[] | undefined, raw: boolean | undefined, amend: boolean | undefined): Promise<void> {
  if (!message && !amend) {
    error('commit message required');
  }

  const config = loadConfig(cwd);

  // Check commit_docs config
  if (!config.commit_docs) {
    const result = { committed: false, hash: null, reason: 'skipped_commit_docs_false' };
    output(result, raw, 'skipped');
    return;
  }

  // Check if .planning is gitignored
  if (await isGitIgnored(cwd, '.planning')) {
    const result = { committed: false, hash: null, reason: 'skipped_gitignored' };
    output(result, raw, 'skipped');
    return;
  }

  // Stage files
  const filesToStage = files && files.length > 0 ? files : ['.planning/'];
  for (const file of filesToStage) {
    await execGit(cwd, ['add', file]);
  }

  // Commit
  const commitArgs = amend ? ['commit', '--amend', '--no-edit'] : ['commit', '-m', message ?? ''];
  const commitResult = await execGit(cwd, commitArgs);
  if (commitResult.exitCode !== 0) {
    if (commitResult.stdout.includes('nothing to commit') || commitResult.stderr.includes('nothing to commit')) {
      const result = { committed: false, hash: null, reason: 'nothing_to_commit' };
      output(result, raw, 'nothing');
      return;
    }
    const result = { committed: false, hash: null, reason: 'nothing_to_commit', error: commitResult.stderr };
    output(result, raw, 'nothing');
    return;
  }

  // Get short hash
  const hashResult = await execGit(cwd, ['rev-parse', '--short', 'HEAD']);
  const hash = hashResult.exitCode === 0 ? hashResult.stdout : null;
  const result = { committed: true, hash, reason: 'committed' };
  output(result, raw, hash ?? 'committed');
}

interface Decision {
  summary: string;
  rationale: string | null;
}

interface SummaryExtractResult {
  path: string;
  one_liner: string | null;
  key_files: string[];
  tech_added: string[];
  patterns: string[];
  decisions: Decision[];
  requirements_completed: string[];
}

function cmdSummaryExtract(cwd: string, summaryPath: string | undefined, fields: string[] | undefined, raw: boolean | undefined): void {
  if (!summaryPath) {
    error('summary-path required for summary-extract');
  }

  const fullPath = path.join(cwd, summaryPath!);

  if (!fs.existsSync(fullPath)) {
    output({ error: 'File not found', path: summaryPath } as unknown as Record<string, unknown>, raw);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const fm = extractFrontmatter(content);

  // Parse key-decisions into structured format
  const parseDecisions = (decisionsList: unknown): Decision[] => {
    if (!decisionsList || !Array.isArray(decisionsList)) return [];
    return decisionsList.map(d => {
      const decision = String(d);
      const colonIdx = decision.indexOf(':');
      if (colonIdx > 0) {
        return {
          summary: decision.substring(0, colonIdx).trim(),
          rationale: decision.substring(colonIdx + 1).trim(),
        };
      }
      return { summary: decision, rationale: null };
    });
  };

  // Build full result
  const fullResult: SummaryExtractResult = {
    path: summaryPath!,
    one_liner: (fm['one-liner'] as string) ?? null,
    key_files: Array.isArray(fm['key-files']) ? (fm['key-files'] as string[]) : [],
    tech_added: ((fm['tech-stack'] as { added?: string[] })?.added) ?? [],
    patterns: Array.isArray(fm['patterns-established']) ? (fm['patterns-established'] as string[]) : [],
    decisions: parseDecisions(fm['key-decisions']),
    requirements_completed: Array.isArray(fm['requirements-completed']) ? (fm['requirements-completed'] as string[]) : [],
  };

  // If fields specified, filter to only those fields
  if (fields && fields.length > 0) {
    const filtered: Record<string, unknown> = { path: summaryPath! };
    for (const field of fields) {
      if (fullResult[field as keyof SummaryExtractResult] !== undefined) {
        filtered[field] = fullResult[field as keyof SummaryExtractResult];
      }
    }
    output(filtered as unknown as Record<string, unknown>, raw);
    return;
  }

  output(fullResult as unknown as Record<string, unknown>, raw);
}

async function cmdWebsearch(query: string | undefined, options: WebSearchOptions | undefined, raw: boolean | undefined): Promise<void> {
  // Validate API key properly - check existence, length, and not a placeholder
  const apiKey = process.env.BRAVE_API_KEY;
  const hasValidApiKey = !!apiKey &&
    typeof apiKey === 'string' &&
    apiKey.length >= 20 &&
    !apiKey.toLowerCase().includes('your-key') &&
    !apiKey.toLowerCase().includes('placeholder');

  if (!hasValidApiKey) {
    // No key = silent skip, agent falls back to built-in WebSearch
    output({ available: false, reason: 'BRAVE_API_KEY not set or invalid' } as unknown as Record<string, unknown>, raw, '');
    return;
  }

  if (!query) {
    output({ available: false, error: 'Query required' } as unknown as Record<string, unknown>, raw, '');
    return;
  }

  const params = new URLSearchParams({
    q: query,
    count: String(options?.limit ?? 10),
    country: 'us',
    search_lang: 'en',
    text_decorations: 'false'
  });

  if (options?.freshness) {
    params.set('freshness', options.freshness);
  }

  try {
    const response = await (globalThis as unknown as { fetch: typeof fetch }).fetch(
      `https://api.search.brave.com/res/v1/web/search?${params}`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey
        }
      }
    );

    if (!response.ok) {
      output({ available: false, error: `API error: ${response.status}` } as unknown as Record<string, unknown>, raw, '');
      return;
    }

    const data = await response.json() as { web?: { results?: Array<{ title: string; url: string; description: string; age?: string }> } };

    const results = (data.web?.results ?? []).map(r => ({
      title: r.title,
      url: r.url,
      description: r.description,
      age: r.age ?? null
    }));

    output({
      available: true,
      query,
      count: results.length,
      results
    } as unknown as Record<string, unknown>, raw, results.map(r => `${r.title}\n${r.url}\n${r.description}`).join('\n\n'));
  } catch (err) {
    const error = err as Error;
    logger.warn('Websearch request failed in cmdWebsearch', { query, error: error.message });
    output({ available: false, error: error.message } as unknown as Record<string, unknown>, raw, '');
  }
}

function cmdProgressRender(cwd: string, format: string | undefined, raw: boolean | undefined): void {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const milestone = getMilestoneInfo(cwd);

  const phases: PhaseProgress[] = [];
  let totalPlans = 0;
  let totalSummaries = 0;

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort((a, b) => comparePhaseNum(a, b));

    for (const dir of dirs) {
      const dm = dir.match(/^(\d+(?:\.\d+)*)-?(.*)/);
      const phaseNum = dm && dm[1] ? dm[1] : dir;
      const phaseName = dm && dm[2] ? dm[2].replace(/-/g, ' ') : '';
      const phaseFiles = fs.readdirSync(path.join(phasesDir, dir));
      const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').length;
      const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md').length;

      totalPlans += plans;
      totalSummaries += summaries;

      let status: string;
      if (plans === 0) status = 'Pending';
      else if (summaries >= plans) status = 'Complete';
      else if (summaries > 0) status = 'In Progress';
      else status = 'Planned';

      phases.push({ number: phaseNum, name: phaseName, plans, summaries, status });
    }
  } catch (err) {
    const error = err as Error;
    logger.warn('Failed to enumerate phase directories in cmdProgressRender', { phasesDir, error: error.message });
  }

  const percent = totalPlans > 0 ? Math.min(100, Math.round((totalSummaries / totalPlans) * 100)) : 0;

  if (format === 'table') {
    // Render markdown table
    const barWidth = 10;
    const filled = Math.round((percent / 100) * barWidth);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);
    let out = `# ${milestone.version || 'Unknown'} ${milestone.name || ''}\n\n`;
    out += `**Progress:** [${bar}] ${totalSummaries}/${totalPlans} plans (${percent}%)\n\n`;
    out += `| Phase | Name | Plans | Status |\n`;
    out += `|-------|------|-------|--------|\n`;
    for (const p of phases) {
      out += `| ${p.number} | ${p.name} | ${p.summaries}/${p.plans} | ${p.status} |\n`;
    }
    output({ rendered: out }, raw, out);
  } else if (format === 'bar') {
    const barWidth = 20;
    const filled = Math.round((percent / 100) * barWidth);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);
    const text = `[${bar}] ${totalSummaries}/${totalPlans} plans (${percent}%)`;
    output({ bar: text, percent, completed: totalSummaries, total: totalPlans }, raw, text);
  } else {
    // JSON format
    output({
      milestone_version: milestone.version || '',
      milestone_name: milestone.name || '',
      phases,
      total_plans: totalPlans,
      total_summaries: totalSummaries,
      percent,
    }, raw);
  }
}

function cmdTodoComplete(cwd: string, filename: string | undefined, raw: boolean | undefined): void {
  if (!filename) {
    error('filename required for todo complete');
  }

  const pendingDir = path.join(cwd, '.planning', 'todos', 'pending');
  const completedDir = path.join(cwd, '.planning', 'todos', 'completed');
  const sourcePath = path.join(pendingDir, filename!);

  if (!fs.existsSync(sourcePath)) {
    error(`Todo not found: ${filename}`);
  }

  // Ensure completed directory exists
  fs.mkdirSync(completedDir, { recursive: true });

  // Read, add completion timestamp, move
  let content = fs.readFileSync(sourcePath, 'utf-8');
  const today = new Date().toISOString().split('T')[0];
  content = `completed: ${today}\n` + content;

  fs.writeFileSync(path.join(completedDir, filename!), content, 'utf-8');
  fs.unlinkSync(sourcePath);

  output({ completed: true, file: filename!, date: today } as unknown as Record<string, unknown>, raw, 'completed');
}

function cmdScaffold(cwd: string, type: string | undefined, options: ScaffoldOptions | undefined, raw: boolean | undefined): void {
  const { phase, name } = options ?? {};
  const padded = phase ? normalizePhaseName(phase) : '00';
  const today = new Date().toISOString().split('T')[0];

  // Find phase directory
  const phaseInfo = phase ? findPhaseInternal(cwd, phase) : null;
  const phaseDir = phaseInfo?.directory ? path.join(cwd, phaseInfo.directory) : null;

  if (phase && !phaseDir && type !== 'phase-dir') {
    error(`Phase ${phase} directory not found`);
  }

  let filePath: string | undefined;
  let content: string | undefined;

  switch (type) {
    case 'context': {
      if (!phaseDir) {
        error('Phase directory not found for context scaffold');
      }
      filePath = path.join(phaseDir!, `${padded}-CONTEXT.md`);
      content = `---\nphase: "${padded}"\nname: "${name ?? phaseInfo?.phase_name ?? 'Unnamed'}"\ncreated: ${today}\n---\n\n# Phase ${phase}: ${name ?? phaseInfo?.phase_name ?? 'Unnamed'} — Context\n\n## Decisions\n\n_Decisions will be captured during /ez-discuss-phase ${phase}_\n\n## Discretion Areas\n\n_Areas where the executor can use judgment_\n\n## Deferred Ideas\n\n_Ideas to consider later_\n`;
      break;
    }
    case 'uat': {
      if (!phaseDir) {
        error('Phase directory not found for uat scaffold');
      }
      filePath = path.join(phaseDir!, `${padded}-UAT.md`);
      content = `---\nphase: "${padded}"\nname: "${name ?? phaseInfo?.phase_name ?? 'Unnamed'}"\ncreated: ${today}\nstatus: pending\n---\n\n# Phase ${phase}: ${name ?? phaseInfo?.phase_name ?? 'Unnamed'} — User Acceptance Testing\n\n## Test Results\n\n| # | Test | Status | Notes |\n|---|------|--------|-------|\n\n## Summary\n\n_Pending UAT_\n`;
      break;
    }
    case 'verification': {
      if (!phaseDir) {
        error('Phase directory not found for verification scaffold');
      }
      filePath = path.join(phaseDir!, `${padded}-VERIFICATION.md`);
      content = `---\nphase: "${padded}"\nname: "${name ?? phaseInfo?.phase_name ?? 'Unnamed'}"\ncreated: ${today}\nstatus: pending\n---\n\n# Phase ${phase}: ${name ?? phaseInfo?.phase_name ?? 'Unnamed'} — Verification\n\n## Goal-Backward Verification\n\n**Phase Goal:** [From ROADMAP.md]\n\n## Checks\n\n| # | Requirement | Status | Evidence |\n|---|------------|--------|----------|\n\n## Result\n\n_Pending verification_\n`;
      break;
    }
    case 'phase-dir': {
      if (!phase || !name) {
        error('phase and name required for phase-dir scaffold');
      }
      const slug = generateSlugInternal(name!);
      const dirName = `${padded}-${slug}`;
      const phasesParent = path.join(cwd, '.planning', 'phases');
      fs.mkdirSync(phasesParent, { recursive: true });
      const dirPath = path.join(phasesParent, dirName);
      fs.mkdirSync(dirPath, { recursive: true });
      output({ created: true, directory: `.planning/phases/${dirName}`, path: dirPath } as unknown as Record<string, unknown>, raw, dirPath);
      return;
    }
    default:
      error(`Unknown scaffold type: ${type}. Available: context, uat, verification, phase-dir`);
  }

  if (filePath && fs.existsSync(filePath)) {
    output({ created: false, reason: 'already_exists', path: filePath } as unknown as Record<string, unknown>, raw, 'exists');
    return;
  }

  if (filePath && content) {
    fs.writeFileSync(filePath, content, 'utf-8');
    const relPath = toPosixPath(path.relative(cwd, filePath));
    output({ created: true, path: relPath } as unknown as Record<string, unknown>, raw, relPath);
  }
}

async function cmdStats(cwd: string, format: string | undefined, raw: boolean | undefined): Promise<void> {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const reqPath = path.join(cwd, '.planning', 'REQUIREMENTS.md');
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  const milestone = getMilestoneInfo(cwd);

  // Phase & plan stats (reuse progress pattern)
  const phases: PhaseProgress[] = [];
  let totalPlans = 0;
  let totalSummaries = 0;

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort((a, b) => comparePhaseNum(a, b));

    for (const dir of dirs) {
      const dm = dir.match(/^(\d+(?:\.\d+)*)-?(.*)/);
      const phaseNum = dm && dm[1] ? dm[1] : dir;
      const phaseName = dm && dm[2] ? dm[2].replace(/-/g, ' ') : '';
      const phaseFiles = fs.readdirSync(path.join(phasesDir, dir));
      const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').length;
      const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md').length;

      totalPlans += plans;
      totalSummaries += summaries;

      let status: string;
      if (plans === 0) status = 'Pending';
      else if (summaries >= plans) status = 'Complete';
      else if (summaries > 0) status = 'In Progress';
      else status = 'Planned';

      phases.push({ number: phaseNum, name: phaseName, plans, summaries, status });
    }
  } catch (err) {
    const error = err as Error;
    logger.warn('Failed to enumerate phase directories in cmdStats', { phasesDir, error: error.message });
  }

  const percent = totalPlans > 0 ? Math.min(100, Math.round((totalSummaries / totalPlans) * 100)) : 0;

  // Requirements stats
  let requirementsTotal = 0;
  let requirementsComplete = 0;
  try {
    if (fs.existsSync(reqPath)) {
      const reqContent = fs.readFileSync(reqPath, 'utf-8');
      const checked = reqContent.match(/^- \[x\] \*\*/gm);
      const unchecked = reqContent.match(/^- \[ \] \*\*/gm);
      requirementsComplete = checked ? checked.length : 0;
      requirementsTotal = requirementsComplete + (unchecked ? unchecked.length : 0);
    }
  } catch (err) {
    const error = err as Error;
    logger.warn('Failed to parse REQUIREMENTS.md in cmdStats', { reqPath, error: error.message });
  }

  // Last activity from STATE.md
  let lastActivity: string | null = null;
  try {
    if (fs.existsSync(statePath)) {
      const stateContent = fs.readFileSync(statePath, 'utf-8');
      const activityMatch = stateContent.match(/\*\*Last Activity:\*\*\s*(.+)/);
      if (activityMatch) lastActivity = activityMatch[1]?.trim() ?? null;
    }
  } catch (err) {
    const error = err as Error;
    logger.warn('Failed to read STATE.md in cmdStats', { statePath, error: error.message });
  }

  // Git stats
  let gitCommits = 0;
  let gitFirstCommitDate: string | null = null;
  try {
    const commitCountResult = await execGit(cwd, ['rev-list', '--count', 'HEAD']);
    gitCommits = parseInt(commitCountResult.stdout.trim(), 10) || 0;
    const firstDateResult = await execGit(cwd, ['log', '--reverse', '--format=%as', '--max-count=1']);
    gitFirstCommitDate = firstDateResult.stdout.trim() || null;
  } catch (err) {
    const error = err as Error;
    logger.warn('Failed to compute git stats in cmdStats', { cwd, error: error.message });
  }

  const completedPhases = phases.filter(p => p.status === 'Complete').length;

  const result: StatsResult = {
    milestone_version: milestone.version || '',
    milestone_name: milestone.name || '',
    phases,
    phases_completed: completedPhases,
    phases_total: phases.length,
    total_plans: totalPlans,
    total_summaries: totalSummaries,
    percent,
    requirements_total: requirementsTotal,
    requirements_complete: requirementsComplete,
    git_commits: gitCommits,
    git_first_commit_date: gitFirstCommitDate,
    last_activity: lastActivity,
  };

  if (format === 'table') {
    const barWidth = 10;
    const filled = Math.round((percent / 100) * barWidth);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);
    let out = `# ${milestone.version || 'Unknown'} ${milestone.name || ''} — Statistics\n\n`;
    out += `**Progress:** [${bar}] ${totalSummaries}/${totalPlans} plans (${percent}%)\n`;
    out += `**Phases:** ${completedPhases}/${phases.length} complete\n`;
    if (requirementsTotal > 0) {
      out += `**Requirements:** ${requirementsComplete}/${requirementsTotal} complete\n`;
    }
    out += '\n';
    out += `| Phase | Name | Plans | Completed | Status |\n`;
    out += `|-------|------|-------|-----------|--------|\n`;
    for (const p of phases) {
      out += `| ${p.number} | ${p.name} | ${p.plans} | ${p.summaries} | ${p.status} |\n`;
    }
    if (gitCommits > 0) {
      out += `\n**Git:** ${gitCommits} commits`;
      if (gitFirstCommitDate) out += ` (since ${gitFirstCommitDate})`;
      out += '\n';
    }
    if (lastActivity) out += `**Last activity:** ${lastActivity}\n`;
    output({ rendered: out } as unknown as Record<string, unknown>, raw, out);
  } else {
    output(result as unknown as Record<string, unknown>, raw);
  }
}

export {
  cmdGenerateSlug,
  cmdCurrentTimestamp,
  cmdListTodos,
  cmdVerifyPathExists,
  cmdHistoryDigest,
  cmdResolveModel,
  cmdCommit,
  cmdSummaryExtract,
  cmdWebsearch,
  cmdProgressRender,
  cmdTodoComplete,
  cmdScaffold,
  cmdStats,
};
