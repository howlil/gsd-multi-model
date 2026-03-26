/**
 * State — STATE.md operations and progression engine
 */

import * as fs from 'fs';
import * as path from 'path';
import { escapeRegex, loadConfig, output, error } from './core.js';
import { safePlanningWriteSync } from './planning-write.js';
import { defaultLogger as logger } from './logger.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface StateData {
  currentPhase?: string;
  currentPlan?: number;
  status?: string;
  progress?: string;
  lastActivity?: string;
  [key: string]: unknown;
}

export interface MetricOptions {
  phase: string;
  plan: number;
  duration: number;
  tasks?: number;
  files?: number;
}

export interface DecisionOptions {
  phase?: string;
  summary?: string;
  summary_file?: string;
  rationale?: string;
  rationale_file?: string;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Extract a field value from STATE.md content
 * Supports both **Field:** bold and plain Field: format
 */
export function extractStateField(content: string, fieldName: string): string | null {
  const escaped = escapeRegex(fieldName);
  const boldPattern = new RegExp(`\\*\\*${escaped}:\\*\\*\\s*(.+)`, 'i');
  const boldMatch = content.match(boldPattern);
  if (boldMatch) return boldMatch[1]!.trim();

  const plainPattern = new RegExp(`^${escaped}:\\s*(.+)`, 'im');
  const plainMatch = content.match(plainPattern);
  return plainMatch ? plainMatch[1]!.trim() : null;
}

/**
 * Replace a field value in STATE.md content
 * Returns null if field not found
 */
export function replaceStateField(content: string, fieldName: string, newValue: string): string | null {
  const escaped = escapeRegex(fieldName);
  const boldPattern = new RegExp(`(\\*\\*${escaped}:\\*\\*\\s*)(.*)`, 'i');
  if (boldPattern.test(content)) {
    return content.replace(boldPattern, (_match, prefix) => `${prefix}${newValue}`);
  }

  const plainPattern = new RegExp(`(^${escaped}:\\s*)(.*)`, 'im');
  if (plainPattern.test(content)) {
    return content.replace(plainPattern, (_match, prefix) => `${prefix}${newValue}`);
  }

  return null;
}

/**
 * Write STATE.md content with proper handling
 */
export function writeStateMd(statePath: string, content: string): void {
  safePlanningWriteSync(statePath, content);
}
// ─── Command Functions ───────────────────────────────────────────────────────

/**
 * Load project state from STATE.md
 */
export function stateLoad(cwd: string, raw?: boolean): void {
  const config = loadConfig(cwd);
  const planningDir = path.join(cwd, '.planning');

  let stateRaw = '';
  try {
    stateRaw = fs.readFileSync(path.join(planningDir, 'STATE.md'), 'utf-8');
  } catch (err) {
    logger.warn('Failed to read STATE.md in stateLoad', { planningDir, error: err instanceof Error ? err.message : 'Unknown' });
  }

  const configExists = fs.existsSync(path.join(planningDir, 'config.json'));
  const roadmapExists = fs.existsSync(path.join(planningDir, 'ROADMAP.md'));
  const stateExists = stateRaw.length > 0;

  const result = {
    config,
    state_raw: stateRaw,
    state_exists: stateExists,
    roadmap_exists: roadmapExists,
    config_exists: configExists,
  };

  if (raw) {
    const c = config;
    const lines = [
      `model_profile=${c.model_profile}`,
      `commit_docs=${c.commit_docs}`,
      `branching_strategy=${c.branching_strategy}`,
      `phase_branch_template=${c.phase_branch_template}`,
      `milestone_branch_template=${c.milestone_branch_template}`,
      `parallelization=${c.parallelization}`,
      `research=${c.research}`,
      `plan_checker=${c.plan_checker}`,
      `verifier=${c.verifier}`,
      `config_exists=${configExists}`,
      `roadmap_exists=${roadmapExists}`,
      `state_exists=${stateExists}`,
    ];
    process.stdout.write(lines.join('\n'));
    process.exit(0);
  }

  output(result);
}

/**
 * Get a field or section from STATE.md
 */
export function stateGet(cwd: string, section?: string, raw?: boolean): void {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  try {
    const content = fs.readFileSync(statePath, 'utf-8');

    if (!section) {
      output({ content }, raw, content);
      return;
    }

    const fieldEscaped = escapeRegex(section);

    // Check for **field:** value (bold format)
    const boldPattern = new RegExp(`\\*\\*${fieldEscaped}:\\*\\*\\s*(.*)`, 'i');
    const boldMatch = content.match(boldPattern);
    if (boldMatch) {
      output({ [section]: boldMatch[1]!.trim() }, raw, boldMatch[1]!.trim());
      return;
    }

    // Check for field: value (plain format)
    const plainPattern = new RegExp(`^${fieldEscaped}:\\s*(.*)`, 'im');
    const plainMatch = content.match(plainPattern);
    if (plainMatch) {
      output({ [section]: plainMatch[1]!.trim() }, raw, plainMatch[1]!.trim());
      return;
    }

    // Check for ## Section
    const sectionPattern = new RegExp(`##\\s*${fieldEscaped}\\s*\n([\\s\\S]*?)(?=\\n##|$)`, 'i');
    const sectionMatch = content.match(sectionPattern);
    if (sectionMatch) {
      output({ [section]: sectionMatch[1]!.trim() }, raw, sectionMatch[1]!.trim());
      return;
    }

    output({ error: `Section or field "${section}" not found` }, raw, '');
  } catch (err) {
    logger.error('STATE.md not found in stateGet', { statePath, error: err instanceof Error ? err.message : 'Unknown' });
    error('STATE.md not found');
  }
}

/**
 * Patch multiple fields in STATE.md
 */
export function statePatch(cwd: string, patches: Record<string, string>, raw?: boolean): void {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  try {
    let content = fs.readFileSync(statePath, 'utf-8');
    const results: { updated: string[]; failed: string[] } = { updated: [], failed: [] };

    for (const [field, value] of Object.entries(patches)) {
      const updated = replaceStateField(content, field, value);
      if (updated !== null) {
        content = updated;
        results.updated.push(field);
      } else {
        results.failed.push(field);
      }
    }

    if (results.updated.length > 0) {
      writeStateMd(statePath, content);
    }

    output(results, raw, results.updated.length > 0 ? 'true' : 'false');
  } catch (err) {
    logger.error('Failed to patch STATE.md', { statePath, error: err instanceof Error ? err.message : 'Unknown' });
    error('STATE.md not found');
  }
}

/**
 * Update a single field in STATE.md
 */
export function stateUpdate(cwd: string, field: string, value: string, raw?: boolean): void {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  try {
    let content = fs.readFileSync(statePath, 'utf-8');
    const updated = replaceStateField(content, field, value);

    if (updated !== null) {
      writeStateMd(statePath, updated);
      output({ updated: true }, raw, 'true');
    } else {
      output({ updated: false, reason: `Field "${field}" not found in STATE.md` }, raw, 'false');
    }
  } catch (err) {
    logger.error('Failed to update STATE.md', { statePath, field, error: err instanceof Error ? err.message : 'Unknown' });
    output({ updated: false, reason: 'STATE.md not found' }, raw, 'false');
  }
}

/**
 * Advance to the next plan in the phase
 */
export function stateAdvancePlan(cwd: string, raw?: boolean): void {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) {
    output({ error: 'STATE.md not found' }, raw);
    return;
  }

  let content = fs.readFileSync(statePath, 'utf-8');
  const currentPlanStr = extractStateField(content, 'Current Plan');
  const totalPlansStr = extractStateField(content, 'Total Plans in Phase');
  const today = new Date().toISOString().split('T')[0]!;

  const currentPlan = currentPlanStr ? parseInt(currentPlanStr, 10) : NaN;
  const totalPlans = totalPlansStr ? parseInt(totalPlansStr, 10) : NaN;

  if (isNaN(currentPlan) || isNaN(totalPlans)) {
    output({ error: 'Cannot parse Current Plan or Total Plans from STATE.md' }, raw);
    return;
  }

  if (currentPlan >= totalPlans) {
    content = replaceStateField(content, 'Status', 'Phase complete — ready for verification') || content;
    content = replaceStateField(content, 'Last Activity', today) || content;
    writeStateMd(statePath, content);
    output({ 
      advanced: false, 
      reason: 'last_plan', 
      current_plan: currentPlan, 
      total_plans: totalPlans, 
      status: 'ready_for_verification' 
    }, raw, 'false');
  } else {
    const newPlan = currentPlan + 1;
    content = replaceStateField(content, 'Current Plan', String(newPlan)) || content;
    content = replaceStateField(content, 'Status', 'Ready to execute') || content;
    content = replaceStateField(content, 'Last Activity', today) || content;
    writeStateMd(statePath, content);
    output({ 
      advanced: true, 
      previous_plan: currentPlan, 
      current_plan: newPlan, 
      total_plans: totalPlans 
    }, raw, 'true');
  }
}

/**
 * Record a performance metric in STATE.md
 */
export function stateRecordMetric(cwd: string, options: MetricOptions, raw?: boolean): void {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) {
    output({ error: 'STATE.md not found' }, raw);
    return;
  }

  let content = fs.readFileSync(statePath, 'utf-8');
  const { phase, plan, duration, tasks, files } = options;

  if (!phase || !plan || !duration) {
    output({ error: 'phase, plan, and duration required' }, raw);
    return;
  }

  // Find Performance Metrics section and its table
  const metricsPattern = /(##\s*Performance Metrics[\s\S]*?\n\|[^\n]+\n\|[-|\s]+\n)([\s\S]*?)(?=\n##|\n$|$)/i;
  const metricsMatch = content.match(metricsPattern);

  if (metricsMatch) {
    let tableBody = metricsMatch[2]!.trimEnd();
    const newRow = `| Phase ${phase} P${plan} | ${duration} | ${tasks || '-'} tasks | ${files || '-'} files |`;

    if (tableBody.trim() === '' || tableBody.includes('None yet')) {
      tableBody = newRow;
    } else {
      tableBody = tableBody + '\n' + newRow;
    }

    content = content.replace(metricsPattern, (_match, header) => `${header}${tableBody}\n`);
    writeStateMd(statePath, content);
    output({ recorded: true, phase, plan, duration }, raw, 'true');
  } else {
    output({ recorded: false, reason: 'Performance Metrics section not found in STATE.md' }, raw, 'false');
  }
}

// Alias exports for test compatibility
export { extractStateField as stateExtractField, replaceStateField as stateReplaceField };
