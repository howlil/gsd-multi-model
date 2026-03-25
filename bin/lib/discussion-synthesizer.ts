#!/usr/bin/env node

/**
 * Discussion Synthesizer — Reads DISCUSSION.md, extracts consensus and blockers
 *
 * Parses the multi-agent DISCUSSION.md format to extract:
 * - Hard blockers from any agent
 * - Warnings and advisory notes
 * - Consensus status (open | consensus-reached | needs-human)
 * - Go/No-Go recommendation
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseFrontmatter, type ParsedFrontmatterResult } from './frontmatter.js';

// ─────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────

interface DiscussionBlocker {
  agent: string;
  text: string;
}

interface DiscussionWarning {
  agent: string;
  text: string;
}

interface AgentSection {
  agent: string;
  heading: string;
  content: string;
}

interface ConsensusResult {
  status: 'open' | 'consensus-reached' | 'needs-human';
  goNoGo: 'GO' | 'NO-GO' | 'HUMAN-NEEDED';
  rationale: string;
}

interface ParseDiscussionResult {
  found: boolean;
  filePath: string;
  frontmatter: ParsedFrontmatterResult;
  sections: AgentSection[];
  consensus: ConsensusResult;
  blockers: DiscussionBlocker[];
  warnings: DiscussionWarning[];
  hasBlockers?: boolean;
  hasWarnings?: boolean;
}

interface SynthesizeResult {
  proceed: boolean;
  reason: string;
  blockers: DiscussionBlocker[];
  warnings: DiscussionWarning[];
  consensus?: ConsensusResult;
  agentsParticipated: string[];
  frontmatter?: Record<string, unknown>;
}

interface ParticipationCheck {
  needsObserver: boolean;
  needsTechLead: boolean;
  needsScrumMaster: boolean;
  needsRequirements?: boolean;
}

interface ConsensusData {
  goNoGo: 'GO' | 'NO-GO' | 'HUMAN-NEEDED';
  blockers: DiscussionBlocker[];
  warnings: DiscussionWarning[];
  rationale: string;
}

// ─────────────────────────────────────────────
// Parser
// ─────────────────────────────────────────────

/**
 * Parse DISCUSSION.md file
 * @param filePath - Path to DISCUSSION.md
 * @returns Parsed discussion result
 */
export function parseDiscussion(filePath: string): ParseDiscussionResult {
  if (!fs.existsSync(filePath)) {
    return {
      found: false,
      filePath,
      frontmatter: { frontmatter: {}, body: '' },
      sections: [],
      consensus: { status: 'open', goNoGo: 'GO', rationale: 'No discussion file — proceeding' },
      blockers: [],
      warnings: []
    };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Parse YAML frontmatter
  const frontmatter = parseFrontmatter(content);

  // Parse agent sections
  const sections = parseAgentSections(lines);

  // Extract blockers and warnings from all sections
  const blockers: DiscussionBlocker[] = [];
  const warnings: DiscussionWarning[] = [];

  for (const section of sections) {
    const sectionBlockers = extractBlockers(section.content);
    const sectionWarnings = extractWarnings(section.content);
    blockers.push(...sectionBlockers.map(b => ({ agent: section.agent, text: b })));
    warnings.push(...sectionWarnings.map(w => ({ agent: section.agent, text: w })));
  }

  // Parse consensus section
  const consensus = parseConsensus(sections);

  return {
    found: true,
    filePath,
    frontmatter,
    sections,
    consensus,
    blockers,
    warnings,
    hasBlockers: blockers.length > 0,
    hasWarnings: warnings.length > 0
  };
}

/**
 * Parse agent sections from DISCUSSION.md
 * Returns array of { agent, heading, content }
 */
function parseAgentSections(lines: string[]): AgentSection[] {
  const sections: AgentSection[] = [];
  let currentSection: { agent: string; heading: string } | null = null;
  let currentContent: string[] = [];

  const agentHeadings = [
    { pattern: /## Requirements Perspective/, agent: 'requirements' },
    { pattern: /## Tech Lead Perspective/, agent: 'tech-lead' },
    { pattern: /## Observer Perspective/, agent: 'observer' },
    { pattern: /## Scrum Master Perspective/, agent: 'scrum-master' },
    { pattern: /## Consensus/, agent: 'consensus' }
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line starts a known section
    const matchedHeading = agentHeadings.find(h => h.pattern.test(line));

    if (matchedHeading && matchedHeading.agent) {
      // Save previous section
      if (currentSection) {
        sections.push({
          agent: currentSection.agent,
          heading: currentSection.heading!,
          content: currentContent.join('\n').trim()
        });
      }
      currentSection = { agent: matchedHeading.agent, heading: line };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Push last section
  if (currentSection) {
    sections.push({
      agent: currentSection.agent,
      heading: currentSection.heading!,
      content: currentContent.join('\n').trim()
    });
  }

  return sections;
}

/**
 * Extract blocker statements from section content
 * Looks for BLOCKER markers used by agents
 */
function extractBlockers(content: string): string[] {
  const blockers: string[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    if (line.includes('🛑') || line.includes('BLOCKER') || line.match(/\*\*BLOCKER/i)) {
      // Extract the description after the marker
      const cleaned = line
        .replace(/[🛑*]/g, '')
        .replace(/BLOCKER\s*—?\s*/i, '')
        .trim();
      if (cleaned && cleaned.length > 3) {
        blockers.push(cleaned);
      }
    }
  }

  return blockers;
}

/**
 * Extract warning statements from section content
 */
function extractWarnings(content: string): string[] {
  const warnings: string[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    if (line.includes('⚠️') || line.match(/\*\*WARNING/i)) {
      const cleaned = line
        .replace(/[⚠️*]/g, '')
        .replace(/WARNING\s*—?\s*/i, '')
        .trim();
      if (cleaned && cleaned.length > 3) {
        warnings.push(cleaned);
      }
    }
  }

  return warnings;
}

/**
 * Parse consensus section for Go/No-Go status
 */
function parseConsensus(sections: AgentSection[]): ConsensusResult {
  const consensusSection = sections.find(s => s.agent === 'consensus');

  if (!consensusSection) {
    return { status: 'open', goNoGo: 'GO', rationale: 'No consensus section yet' };
  }

  const content = consensusSection.content;

  // Extract Go/No-Go
  let goNoGo: 'GO' | 'NO-GO' | 'HUMAN-NEEDED' = 'GO';
  if (content.match(/NO-GO/i)) goNoGo = 'NO-GO';
  else if (content.match(/HUMAN-NEEDED/i)) goNoGo = 'HUMAN-NEEDED';
  else if (content.match(/^.*GO.*$/m)) goNoGo = 'GO';

  // Extract status
  let status: 'open' | 'consensus-reached' | 'needs-human' = 'open';
  if (content.match(/consensus-reached/i) || goNoGo !== 'GO') status = 'consensus-reached';
  if (goNoGo === 'HUMAN-NEEDED') status = 'needs-human';

  // Extract rationale
  const rationaleMatch = content.match(/### Rationale\n([^\n]+)/);
  const rationale = rationaleMatch ? (rationaleMatch[1] || '').trim() : '';

  return { status, goNoGo, rationale };
}

// ─────────────────────────────────────────────
// Synthesis
// ─────────────────────────────────────────────

/**
 * Synthesize discussion into orchestrator-ready decision
 * @param discussionPath - Path to DISCUSSION.md
 * @returns Synthesis result
 */
export function synthesize(discussionPath: string): SynthesizeResult {
  const discussion = parseDiscussion(discussionPath);

  if (!discussion.found) {
    return {
      proceed: true,
      reason: 'No discussion file — no pre-flight concerns',
      blockers: [],
      warnings: [],
      agentsParticipated: []
    };
  }

  const hasBlockers = discussion.blockers.length > 0;
  const consensusGoNoGo = discussion.consensus.goNoGo;

  // Determine whether to proceed
  let proceed = true;
  let reason = '';

  if (hasBlockers || consensusGoNoGo === 'NO-GO') {
    proceed = false;
    reason = hasBlockers
      ? `${discussion.blockers.length} blocker(s) must be resolved before execution`
      : 'Consensus is NO-GO';
  } else if (consensusGoNoGo === 'HUMAN-NEEDED') {
    proceed = false;
    reason = 'Human input required before proceeding';
  } else {
    proceed = true;
    reason = discussion.warnings.length > 0
      ? `${discussion.warnings.length} warning(s) — proceeding with awareness`
      : 'No blockers found — proceeding';
  }

  const agentsParticipated = discussion.sections
    .filter(s => s.agent !== 'consensus')
    .filter(s => !s.content.includes('{Populated') && s.content.trim().length > 20)
    .map(s => s.agent);

  return {
    proceed,
    reason,
    blockers: discussion.blockers,
    warnings: discussion.warnings,
    consensus: discussion.consensus,
    agentsParticipated,
    frontmatter: discussion.frontmatter as unknown as Record<string, unknown>
  };
}

/**
 * Check if a discussion file needs updating (agents haven't written yet)
 * @param discussionPath - Path to DISCUSSION.md
 * @returns Participation check result
 */
export function checkParticipation(discussionPath: string): ParticipationCheck {
  const discussion = parseDiscussion(discussionPath);

  if (!discussion.found) {
    return { needsObserver: true, needsTechLead: true, needsScrumMaster: true };
  }

  const populated = (agent: string): boolean => {
    const section = discussion.sections.find(s => s.agent === agent);
    return section && !section.content.includes('{Populated') && section.content.trim().length > 20;
  };

  return {
    needsObserver: !populated('observer'),
    needsTechLead: !populated('tech-lead'),
    needsScrumMaster: !populated('scrum-master'),
    needsRequirements: populated('requirements') ? !populated('requirements') : false
  };
}

/**
 * Update consensus section in DISCUSSION.md
 * @param discussionPath - Path to DISCUSSION.md
 * @param consensusData - Consensus data to update
 * @returns True if updated successfully
 */
export async function updateConsensus(discussionPath: string, consensusData: ConsensusData): Promise<boolean> {
  if (!fs.existsSync(discussionPath)) return false;

  const content = fs.readFileSync(discussionPath, 'utf8');

  const blockerList = consensusData.blockers.length > 0
    ? consensusData.blockers.map(b => `- 🛑 ${b.agent}: ${b.text}`).join('\n')
    : 'None';

  const warningList = consensusData.warnings.length > 0
    ? consensusData.warnings.slice(0, 5).map(w => `- ⚠️ ${w.agent}: ${w.text}`).join('\n')
    : 'None';

  const now = new Date().toISOString();
  const status = consensusData.goNoGo === 'GO'
    ? 'consensus-reached'
    : consensusData.goNoGo === 'HUMAN-NEEDED' ? 'needs-human' : 'consensus-reached';

  const consensusSection = `## Consensus

> *Synthesized by orchestrator from above perspectives*

**Status:** ${status}

### Blockers
${blockerList}

### Key Warnings
${warningList}

### Go / No-Go
${consensusData.goNoGo} — ${consensusData.rationale}

### Rationale
${consensusData.rationale}

---

*Discussion opened: {timestamp}*
*Last updated: ${now}*`;

  // Replace existing consensus section or append
  let updated: string;
  if (content.includes('## Consensus')) {
    updated = content.replace(/## Consensus[\s\S]*$/, consensusSection);
  } else {
    updated = content + '\n\n' + consensusSection;
  }

  // Also update frontmatter status
  updated = updated.replace(/^status: .*$/m, `status: ${status}`);

  fs.writeFileSync(discussionPath, updated, 'utf8');
  return true;
}

/**
 * Format synthesis result as human-readable text
 * @param result - Result from synthesize()
 * @returns Formatted text
 */
export function formatSynthesis(result: SynthesizeResult): string {
  const lines: string[] = [];

  lines.push(`## Pre-Flight Discussion Summary`);
  lines.push(`**Decision:** ${result.proceed ? '✓ GO — proceed to execution' : '✗ ' + ((result.consensus?.goNoGo === 'HUMAN-NEEDED') ? 'HUMAN-NEEDED' : 'NO-GO')}`);
  lines.push(`**Reason:** ${result.reason}`);
  lines.push(`**Agents participated:** ${result.agentsParticipated.join(', ') || 'none'}`);

  if (result.blockers.length > 0) {
    lines.push('');
    lines.push('### Blockers (must resolve)');
    for (const b of result.blockers) {
      lines.push(`- 🛑 **${b.agent}:** ${b.text}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('### Warnings (advisory)');
    for (const w of result.warnings.slice(0, 5)) {
      lines.push(`- ⚠️ **${w.agent}:** ${w.text}`);
    }
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────
// CLI Interface
// ─────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const discussionPath = args[1];

  if (!cmd) {
    console.error('Usage: discussion-synthesizer.ts <synthesize|check-participation|update-consensus> <path> [options]');
    process.exit(1);
  }

  (async () => {
    try {
      if (cmd === 'synthesize') {
        if (!discussionPath) { console.error('Path required'); process.exit(1); }
        const result = synthesize(discussionPath);
        if (args.includes('--json')) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(formatSynthesis(result));
          process.exit(result.proceed ? 0 : 1);
        }
      } else if (cmd === 'check-participation') {
        if (!discussionPath) { console.error('Path required'); process.exit(1); }
        const result = checkParticipation(discussionPath);
        console.log(JSON.stringify(result, null, 2));
      } else if (cmd === 'update-consensus') {
        if (!discussionPath) { console.error('Path required'); process.exit(1); }
        const dataArg = args[2];
        if (!dataArg) { console.error('Consensus data JSON required'); process.exit(1); }
        const data = JSON.parse(dataArg) as ConsensusData;
        const ok = await updateConsensus(discussionPath, data);
        console.log(JSON.stringify({ updated: ok }));
      } else {
        console.error(`Unknown command: ${cmd}`);
        process.exit(1);
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  })();
}
