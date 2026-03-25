/**
 * Roadmap — Roadmap parsing and update operations
 */

import * as fs from 'fs';
import * as path from 'path';
import { escapeRegex, output, error } from './core.js';
import { safePlanningWriteSync } from './planning-write.js';
import type { PhaseStatus } from './phase.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

/**
 * Phase information for roadmap representation
 */
export interface PhaseInfo {
  number: string;
  name: string;
  plans: string[];
  status: PhaseStatus;
}

/**
 * Roadmap analysis result
 */
export interface RoadmapAnalysis {
  milestones: string[];
  phases: Array<{
    number: string;
    name: string;
    goal?: string;
    complete?: boolean;
  }>;
  current_phase?: string | null;
}

// ─── Command Functions ───────────────────────────────────────────────────────

/**
 * Get phase information from ROADMAP.md
 */
export function roadmapGetPhase(cwd: string, phaseNum: string, raw?: boolean): void {
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');

  if (!fs.existsSync(roadmapPath)) {
    output({ found: false, error: 'ROADMAP.md not found' }, raw, '');
    return;
  }

  try {
    const content = fs.readFileSync(roadmapPath, 'utf-8');

    // Escape special regex chars in phase number
    const escapedPhase = escapeRegex(phaseNum);

    // Match "## Phase X:", "### Phase X:", or "#### Phase X:" with optional name
    const phasePattern = new RegExp(
      `#{2,4}\\s*Phase\\s+${escapedPhase}:\\s*([^\n]+)`,
      'i'
    );
    const headerMatch = content.match(phasePattern);

    if (!headerMatch) {
      // Fallback: check if phase exists in summary list but missing detail section
      const checklistPattern = new RegExp(
        `-\\s*\\[[ x]\\]\\s*\\*\\*Phase\\s+${escapedPhase}:\\s*([^*]+)\\*\\*`,
        'i'
      );
      const checklistMatch = content.match(checklistPattern);

      if (checklistMatch && checklistMatch[1]) {
        // Phase exists in summary but missing detail section - malformed ROADMAP
        output({
          found: false,
          phase_number: phaseNum,
          phase_name: checklistMatch[1].trim(),
          error: 'malformed_roadmap',
          message: `Phase ${phaseNum} exists in summary list but missing detail section. ROADMAP.md needs both formats.`
        }, raw, '');
        return;
      }

      output({ found: false, phase_number: phaseNum }, raw, '');
      return;
    }

    const phaseName = headerMatch[1]!.trim();
    const headerIndex = headerMatch.index || 0;

    // Find the end of this section
    const restOfContent = content.slice(headerIndex);
    const nextHeaderMatch = restOfContent.match(/\n#{2,4}\s+Phase\s+\d/i);
    const sectionEnd = nextHeaderMatch && nextHeaderMatch.index !== undefined
      ? headerIndex + nextHeaderMatch.index
      : content.length;

    const section = content.slice(headerIndex, sectionEnd).trim();

    // Extract goal
    const goalMatch = section.match(/\*\*Goal(?::\*\*|\*\*:)\s*([^\n]+)/i);
    const goal = goalMatch && goalMatch[1] ? goalMatch[1].trim() : null;

    // Extract success criteria as structured array
    const criteriaMatch = section.match(/\*\*Success Criteria\*\*[^\n]*:\s*\n((?:\s*\d+\.\s*[^\n]+\n?)+)/i);
    const success_criteria = criteriaMatch && criteriaMatch[1]
      ? criteriaMatch[1].trim().split('\n')
          .map(line => line.replace(/^\s*\d+\.\s*/, '').trim())
          .filter(Boolean)
      : [];

    output(
      {
        found: true,
        phase_number: phaseNum,
        phase_name: phaseName,
        goal,
        success_criteria,
        section,
      },
      raw,
      section
    );
  } catch (e) {
    error('Failed to read ROADMAP.md: ' + (e instanceof Error ? e.message : 'Unknown'));
  }
}

/**
 * Analyze ROADMAP.md structure
 */
export function roadmapAnalyze(cwd: string, raw?: boolean): void {
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');

  if (!fs.existsSync(roadmapPath)) {
    output({ error: 'ROADMAP.md not found', milestones: [], phases: [], current_phase: null }, raw);
    return;
  }

  try {
    const content = fs.readFileSync(roadmapPath, 'utf-8');

    // Extract milestones
    const milestonePattern = /##\s*Milestone\s+(v[\d.]+[^:\n]*):/gi;
    const milestones: string[] = [];
    let match;
    while ((match = milestonePattern.exec(content)) !== null) {
      if (match[1]) {
        milestones.push(match[1].trim());
      }
    }

    // Extract phases
    const phasePattern = /#{2,4}\s*Phase\s+(\d+(?:\.\d+)*[A-Z]?):?\s*([^\n]*)/gi;
    const phases: Array<{ number: string; name: string; goal?: string; complete?: boolean }> = [];

    while ((match = phasePattern.exec(content)) !== null) {
      const number = match[1] ? match[1].trim() : '';
      const name = match[2] ? match[2].trim() : '';

      // Check if phase has summary (indicating completion)
      const phaseSummaryPattern = new RegExp(
        `-\\s*\\[x\\]\\s*\\*\\*Phase\\s+${escapeRegex(number)}:`,
        'i'
      );
      const complete = phaseSummaryPattern.test(content);

      phases.push({ number, name, complete });
    }

    // Find current phase (first incomplete)
    const currentPhase = phases.find(p => !p.complete)?.number || null;

    const result: RoadmapAnalysis = {
      milestones,
      phases,
      current_phase: currentPhase,
    };

    output(result, raw, JSON.stringify(result, null, 2));
  } catch (e) {
    error('Failed to analyze ROADMAP.md: ' + (e instanceof Error ? e.message : 'Unknown'));
  }
}

/**
 * Update plan progress in ROADMAP.md
 */
export function roadmapUpdatePlanProgress(
  cwd: string,
  phaseNum: string,
  planNum: string,
  status: 'complete' | 'in_progress' | 'pending',
  raw?: boolean
): void {
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');

  if (!fs.existsSync(roadmapPath)) {
    output({ updated: false, error: 'ROADMAP.md not found' }, raw, 'false');
    return;
  }

  try {
    let content = fs.readFileSync(roadmapPath, 'utf-8');
    const escapedPhase = escapeRegex(phaseNum);
    const escapedPlan = escapeRegex(planNum);

    // Find the plan in the phase section
    const planPattern = new RegExp(
      `(\\[\\s*)([x ])(\\s*\\]\\s*\\*\\*Plan\\s+${escapedPhase}[-.]${escapedPlan}:)`,
      'i'
    );

    const match = content.match(planPattern);
    if (!match) {
      output({ updated: false, error: `Plan ${phaseNum}-${planNum} not found` }, raw, 'false');
      return;
    }

    const checkbox = status === 'complete' ? 'x' : ' ';
    content = content.replace(planPattern, `$1${checkbox}$3`);

    safePlanningWriteSync(roadmapPath, content);
    output({ updated: true, phase: phaseNum, plan: planNum, status }, raw, 'true');
  } catch (e) {
    error('Failed to update ROADMAP.md: ' + (e instanceof Error ? e.message : 'Unknown'));
  }
}

/**
 * Update phase status in ROADMAP.md
 */
export function roadmapUpdatePhaseStatus(
  cwd: string,
  phaseNum: string,
  status: 'complete' | 'in_progress' | 'pending',
  raw?: boolean
): void {
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');

  if (!fs.existsSync(roadmapPath)) {
    output({ updated: false, error: 'ROADMAP.md not found' }, raw, 'false');
    return;
  }

  try {
    let content = fs.readFileSync(roadmapPath, 'utf-8');
    const escapedPhase = escapeRegex(phaseNum);

    // Find the phase in the summary section
    const phasePattern = new RegExp(
      `(\\[\\s*)([x ])(\\s*\\]\\s*\\*\\*Phase\\s+${escapedPhase}:)`,
      'i'
    );

    const match = content.match(phasePattern);
    if (!match) {
      output({ updated: false, error: `Phase ${phaseNum} not found` }, raw, 'false');
      return;
    }

    const checkbox = status === 'complete' ? 'x' : ' ';
    content = content.replace(phasePattern, `$1${checkbox}$3`);

    safePlanningWriteSync(roadmapPath, content);
    output({ updated: true, phase: phaseNum, status }, raw, 'true');
  } catch (e) {
    error('Failed to update ROADMAP.md: ' + (e instanceof Error ? e.message : 'Unknown'));
  }
}
