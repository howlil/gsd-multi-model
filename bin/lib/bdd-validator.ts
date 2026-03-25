#!/usr/bin/env node

/**
 * BDD Validator — INVEST criteria checker and MoSCoW tagging utilities
 *
 * Validates Gherkin .feature files against:
 * - INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable)
 * - MoSCoW priority tagging (@must/@should/@could/@wont)
 * - Tier tagging (@mvp/@medium/@enterprise)
 * - Structural correctness (Given/When/Then format)
 */

'use strict';

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ScenarioStep {
  keyword: string;
  resolvedType: string;
  text: string;
  lineNumber: number;
}

interface Scenario {
  type: string;
  name?: string;
  id?: string;
  tags?: string[];
  steps: ScenarioStep[];
  lineNumber: number;
}

interface Feature {
  name: string;
  tags: string[];
  lineNumber: number;
}

interface ParsedFeature {
  feature: Feature | null;
  scenarios: Scenario[];
  errors: string[];
}

interface MosCowValidation {
  valid: boolean;
  moscow: string | null;
  tier: string | null;
  issues: string[];
}

interface INVESTDimension {
  dimension: string;
  letter: string;
  passed: boolean;
  note: string;
}

interface INVESTValidation {
  score: number;
  max: number;
  dimensions: INVESTDimension[];
  passed: boolean;
}

interface StructureValidation {
  valid: boolean;
  issues: string[];
}

interface FeatureValidationResult {
  file: string;
  valid: boolean;
  invest?: INVESTValidation | null;
  moscow?: { valid: boolean; issues: string[]; counts: MosCowCounts; scenarios: MosCowValidation[] } | null;
  structure?: StructureValidation | null;
  parseErrors?: string[];
  scenarioCount?: number;
  summary: string;
  error?: string;
}

interface DirectoryValidationResult {
  valid: boolean;
  files: FeatureValidationResult[];
  totalScenarios: number;
  moscowCounts: MosCowCounts;
  error?: string;
}

interface MosCowCounts {
  must: number;
  should: number;
  could: number;
  wont: number;
  untagged: number;
}

interface TraceabilityEntry {
  id: string;
  name: string;
  moscow: string;
  file: string;
  status: string;
}

// ─────────────────────────────────────────────
// Traceability
// ─────────────────────────────────────────────

/**
 * Generate a deterministic scenario ID using FNV-1a hash
 * @param featureName - Feature name
 * @param scenarioName - Scenario name
 * @returns ID like "SC-A1B2C3"
 */
function generateScenarioId(featureName: string, scenarioName: string): string {
  const input = `${featureName}::${scenarioName}`.toLowerCase().replace(/\s+/g, '-');
  // Simple non-crypto hash (FNV-1a)
  let hash = 0x811c9dc5;
  for (const char of input) {
    hash ^= char.charCodeAt(0);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `SC-${hash.toString(16).toUpperCase().slice(0, 6)}`;
}

// ─────────────────────────────────────────────
// Parser
// ─────────────────────────────────────────────

/**
 * Parse a .feature file into structured object
 * @param content - Raw file content
 * @returns Parsed feature structure
 */
function parseFeatureFile(content: string): ParsedFeature {
  const lines = content.split('\n');
  const result: ParsedFeature = { feature: null, scenarios: [], errors: [] };

  let currentScenario: Scenario | null = null;
  let currentStep: ScenarioStep | null = null;
  let pendingTags: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? '';

    // Skip blank lines and comments
    if (!line || line.startsWith('#')) continue;

    // Tags
    if (line.startsWith('@')) {
      const tags = line.split(/\s+/).filter(t => t.startsWith('@'));
      pendingTags.push(...tags);
      continue;
    }

    // Feature declaration
    if (line.startsWith('Feature:')) {
      result.feature = {
        name: line.replace('Feature:', '').trim(),
        tags: [...pendingTags],
        lineNumber: i + 1
      };
      pendingTags = [];
      continue;
    }

    // Background
    if (line.startsWith('Background:')) {
      currentScenario = { type: 'background', steps: [], lineNumber: i + 1 };
      pendingTags = [];
      continue;
    }

    // Scenario
    if (line.startsWith('Scenario:') || line.startsWith('Scenario Outline:')) {
      if (currentScenario && currentScenario.type !== 'background') {
        result.scenarios.push(currentScenario);
      }
      const scenarioName = line.replace(/^Scenario(?: Outline)?:/, '').trim();
      const featureName = result.feature ? result.feature.name : 'unknown';
      currentScenario = {
        type: line.startsWith('Scenario Outline:') ? 'outline' : 'scenario',
        name: scenarioName,
        id: generateScenarioId(featureName, scenarioName),
        tags: [...pendingTags],
        steps: [],
        lineNumber: i + 1
      };
      pendingTags = [];
      currentStep = null;
      continue;
    }

    // Steps
    const stepMatch = line.match(/^(Given|When|Then|And|But)\s+(.+)$/);
    if (stepMatch && currentScenario) {
      const stepType = stepMatch[1] ?? 'Given';
      // Resolve And/But to actual type based on previous step
      let resolvedType = stepType;
      if ((stepType === 'And' || stepType === 'But') && currentStep) {
        resolvedType = currentStep.resolvedType;
      } else if (stepType === 'And' || stepType === 'But') {
        resolvedType = 'Given'; // fallback
      }
      currentStep = {
        keyword: stepType,
        resolvedType,
        text: stepMatch[2] ?? '',
        lineNumber: i + 1
      };
      currentScenario.steps.push(currentStep);
      continue;
    }
  }

  // Push last scenario
  if (currentScenario && currentScenario.type !== 'background') {
    result.scenarios.push(currentScenario);
  }

  if (!result.feature) {
    result.errors.push('No Feature: declaration found');
  }

  return result;
}

// ─────────────────────────────────────────────
// MoSCoW Validation
// ─────────────────────────────────────────────

const MOSCOW_TAGS = ['@must', '@should', '@could', '@wont'];
const TIER_TAGS = ['@mvp', '@medium', '@enterprise'];

/**
 * Validate MoSCoW tags on a scenario
 * @param scenario - Scenario to validate
 * @returns Validation result
 */
function validateMosCowTags(scenario: Scenario): MosCowValidation {
  const issues: string[] = [];
  const tags = scenario.tags ?? [];

  const moscowTag = tags.find(t => MOSCOW_TAGS.includes(t));
  const tierTag = tags.find(t => TIER_TAGS.includes(t));

  if (!moscowTag) {
    issues.push(`Scenario "${scenario.name ?? 'unknown'}" missing MoSCoW tag (@must/@should/@could/@wont)`);
  }

  if (!tierTag && moscowTag !== '@wont') {
    issues.push(`Scenario "${scenario.name ?? 'unknown'}" missing tier tag (@mvp/@medium/@enterprise)`);
  }

  // Check consistency
  if (moscowTag === '@must' && tierTag && tierTag !== '@mvp') {
    issues.push(`Scenario "${scenario.name ?? 'unknown'}": @must scenarios should be tagged @mvp (found ${tierTag})`);
  }
  if (moscowTag === '@could' && tierTag === '@mvp') {
    issues.push(`Scenario "${scenario.name ?? 'unknown'}": @could scenarios should not be tagged @mvp`);
  }

  return {
    valid: issues.length === 0,
    moscow: moscowTag ?? null,
    tier: tierTag ?? null,
    issues
  };
}

/**
 * Count scenarios by MoSCoW priority
 * @param scenarios - Scenarios to count
 * @returns Counts by priority
 */
function countByMosCow(scenarios: Scenario[]): MosCowCounts {
  const counts: MosCowCounts = { must: 0, should: 0, could: 0, wont: 0, untagged: 0 };
  for (const s of scenarios) {
    const tag = (s.tags ?? []).find(t => MOSCOW_TAGS.includes(t));
    if (!tag) counts.untagged++;
    else counts[tag.replace('@', '') as keyof Omit<MosCowCounts, 'untagged'>]++;
  }
  return counts;
}

// ─────────────────────────────────────────────
// INVEST Validation
// ─────────────────────────────────────────────

/**
 * Validate INVEST criteria for a Feature + its scenarios
 * @param parsed - Result from parseFeatureFile
 * @returns INVEST validation result
 */
function validateINVEST(parsed: ParsedFeature): INVESTValidation {
  const dimensions: INVESTDimension[] = [];

  // Independent — check for explicit dependency language
  const dependencyWords = ['requires', 'depends on', 'after', 'before completing'];
  const featureName = parsed.feature ? parsed.feature.name.toLowerCase() : '';
  const hasDependencyLanguage = dependencyWords.some(w => featureName.includes(w));
  dimensions.push({
    dimension: 'Independent',
    letter: 'I',
    passed: !hasDependencyLanguage,
    note: hasDependencyLanguage
      ? 'Feature name suggests hard dependency — split or remove dependency language'
      : 'No hard dependency language detected in Feature name'
  });

  // Negotiable — check that Then clauses don't over-specify implementation
  const implementationWords = ['using react', 'via postgres', 'with redis', 'using jwt', 'via sendgrid'];
  const thenClauses: string[] = [];
  for (const s of parsed.scenarios) {
    thenClauses.push(...s.steps.filter(st => st.resolvedType === 'Then').map(st => st.text.toLowerCase()));
  }
  const overSpecified = thenClauses.some(t => implementationWords.some(w => t.includes(w)));
  dimensions.push({
    dimension: 'Negotiable',
    letter: 'N',
    passed: !overSpecified,
    note: overSpecified
      ? 'Then clauses reference specific implementation technology — keep outcomes technology-agnostic'
      : 'Then clauses describe outcomes, not implementation'
  });

  // Valuable — check Feature has "As a... I want... So that..." structure
  const hasAsA = parsed.feature ? /as a/i.test(parsed.feature.name) : false;
  dimensions.push({
    dimension: 'Valuable',
    letter: 'V',
    passed: !!parsed.feature,
    note: parsed.feature
      ? (hasAsA ? 'Feature has user-value statement' : 'Feature exists but consider adding "As a... I want... So that..."')
      : 'No Feature declaration found'
  });

  // Estimable — check sufficient detail in steps
  const avgStepsPerScenario = parsed.scenarios.length > 0
    ? parsed.scenarios.reduce((sum, s) => sum + s.steps.length, 0) / parsed.scenarios.length
    : 0;
  const estimable = avgStepsPerScenario >= 2 && avgStepsPerScenario <= 10;
  dimensions.push({
    dimension: 'Estimable',
    letter: 'E',
    passed: estimable,
    note: avgStepsPerScenario < 2
      ? 'Scenarios have too few steps — add more detail for estimability'
      : avgStepsPerScenario > 10
      ? 'Scenarios are overly complex — split into smaller scenarios'
      : `Average ${avgStepsPerScenario.toFixed(1)} steps per scenario — good estimability`
  });

  // Small — count @must scenarios (should be <= 8 for one phase)
  const mustCount = parsed.scenarios.filter(s => (s.tags ?? []).includes('@must')).length;
  const small = mustCount <= 8;
  dimensions.push({
    dimension: 'Small',
    letter: 'S',
    passed: small,
    note: small
      ? `${mustCount} @must scenarios — fits in one phase`
      : `${mustCount} @must scenarios — consider splitting Feature across phases (max 8 recommended)`
  });

  // Testable — check all Then clauses have specific assertions
  const vagueWords = ['should work', 'is correct', 'looks good', 'is happy', 'functions properly'];
  const vagueThens = thenClauses.filter(t => vagueWords.some(w => t.includes(w)));
  dimensions.push({
    dimension: 'Testable',
    letter: 'T',
    passed: vagueThens.length === 0,
    note: vagueThens.length === 0
      ? 'All Then clauses have specific, testable assertions'
      : `${vagueThens.length} vague Then clause(s) found — replace with specific assertions`
  });

  const score = dimensions.filter(d => d.passed).length;
  return {
    score,
    max: dimensions.length,
    dimensions,
    passed: score === dimensions.length
  };
}

// ─────────────────────────────────────────────
// Structural Validation
// ─────────────────────────────────────────────

/**
 * Validate Given/When/Then structure of scenarios
 * @param scenarios - Scenarios to validate
 * @returns Structure validation result
 */
function validateStructure(scenarios: Scenario[]): StructureValidation {
  const issues: string[] = [];

  for (const scenario of scenarios) {
    if (scenario.type === 'background') continue;

    const steps = scenario.steps;
    if (steps.length === 0) {
      issues.push(`Scenario "${scenario.name ?? 'unknown'}" has no steps`);
      continue;
    }

    const hasGiven = steps.some(s => s.resolvedType === 'Given');
    const hasWhen = steps.some(s => s.resolvedType === 'When');
    const hasThen = steps.some(s => s.resolvedType === 'Then');

    if (!hasWhen) {
      issues.push(`Scenario "${scenario.name ?? 'unknown'}": missing When step (the action being tested)`);
    }
    if (!hasThen) {
      issues.push(`Scenario "${scenario.name ?? 'unknown'}": missing Then step (the expected outcome)`);
    }

    // Check order: Given before When, When before Then
    // Polyfill for findLastIndex (ES2023)
    const findLastIndex = <T>(arr: T[], predicate: (item: T) => boolean): number => {
      for (let i = arr.length - 1; i >= 0; i--) {
        if (predicate(arr[i]!)) return i;
      }
      return -1;
    };
    const givenIndex = findLastIndex(steps, s => s.resolvedType === 'Given');
    const whenIndex = steps.findIndex(s => s.resolvedType === 'When');
    const thenIndex = steps.findIndex(s => s.resolvedType === 'Then');

    if (hasWhen && hasThen && whenIndex > thenIndex) {
      issues.push(`Scenario "${scenario.name ?? 'unknown'}": When step appears after Then step`);
    }
    if (hasGiven && hasWhen && (givenIndex ?? -1) > whenIndex) {
      // Only warn if Given appears much later
    }
  }

  return { valid: issues.length === 0, issues };
}

// ─────────────────────────────────────────────
// Main Validation Entry Point
// ─────────────────────────────────────────────

/**
 * Validate a single .feature file
 * @param filePath - Path to .feature file
 * @returns Validation result
 */
function validateFeatureFile(filePath: string): FeatureValidationResult {
  if (!fs.existsSync(filePath)) {
    return {
      file: filePath,
      valid: false,
      error: `File not found: ${filePath}`,
      invest: null,
      moscow: null,
      structure: null,
      summary: 'FILE_NOT_FOUND'
    };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = parseFeatureFile(content);

  // Structural validation
  const structure = validateStructure(parsed.scenarios);

  // INVEST validation
  const invest = validateINVEST(parsed);

  // MoSCoW validation (per scenario)
  const moscowResults = parsed.scenarios.map(s => validateMosCowTags(s));
  const moscowIssues = moscowResults.flatMap(r => r.issues);
  const moscow = {
    valid: moscowIssues.length === 0,
    issues: moscowIssues,
    counts: countByMosCow(parsed.scenarios),
    scenarios: moscowResults
  };

  const allIssues = [
    ...parsed.errors,
    ...structure.issues,
    ...moscowIssues
  ];

  const valid = allIssues.length === 0 && invest.score >= 5; // Must pass at least 5/6 INVEST

  return {
    file: filePath,
    valid,
    invest,
    moscow,
    structure,
    parseErrors: parsed.errors,
    scenarioCount: parsed.scenarios.length,
    summary: valid ? 'PASS' : `FAIL (${allIssues.length} issues, INVEST ${invest.score}/${invest.max})`
  };
}

/**
 * Recursively find all .feature files
 * @param dirPath - Directory to search
 * @returns Array of file paths
 */
function findFeatureFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...findFeatureFiles(fullPath));
    } else if (entry.name.endsWith('.feature')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Validate all .feature files in a directory
 * @param dirPath - Directory to scan
 * @param options - Validation options
 * @returns Directory validation result
 */
function validateFeatureDirectory(dirPath: string, options: { outputTraceability?: boolean; cwd?: string } = {}): DirectoryValidationResult {
  const featureFiles = findFeatureFiles(dirPath);

  if (featureFiles.length === 0) {
    return {
      valid: false,
      files: [],
      totalScenarios: 0,
      moscowCounts: { must: 0, should: 0, could: 0, wont: 0, untagged: 0 },
      error: `No .feature files found in ${dirPath}`
    };
  }

  const results = featureFiles.map(f => validateFeatureFile(f));
  const totalMoscow: MosCowCounts = { must: 0, should: 0, could: 0, wont: 0, untagged: 0 };

  let totalScenarios = 0;
  const allScenarios: TraceabilityEntry[] = []; // for traceability matrix

  for (const r of results) {
    totalScenarios += r.scenarioCount ?? 0;
    if (r.moscow && r.moscow.counts) {
      const counts = r.moscow.counts as unknown as Record<string, number>;
      const total = totalMoscow as unknown as Record<string, number>;
      for (const [key, val] of Object.entries(counts)) {
        total[key] = (total[key] ?? 0) + val;
      }
    }
    // Collect scenario data for traceability
    if (r.moscow && r.moscow.scenarios) {
      const featureBase = path.basename(r.file);
      r.moscow.scenarios.forEach((s, idx) => {
        allScenarios.push({
          id: `SC-${idx}`,
          name: 'scenario' in s && s.scenario ? (s.scenario as Scenario).name ?? `Scenario ${idx + 1}` : `Scenario ${idx + 1}`,
          moscow: s.moscow ?? 'untagged',
          file: featureBase,
          status: 'not-run'
        });
      });
    }
  }

  // Write traceability matrix if requested or by default when .planning/ exists
  const cwd = options.cwd ?? process.cwd();
  const planningDir = path.join(cwd, '.planning');
  if (allScenarios.length > 0 && fs.existsSync(planningDir)) {
    try {
      const matrixLines = [
        '# BDD Traceability Matrix',
        '',
        '| ID | Scenario | MoSCoW | Feature File | Status |',
        '|-----|----------|--------|-------------|--------|'
      ];
      for (const s of allScenarios) {
        matrixLines.push(`| ${s.id} | ${s.name} | ${s.moscow} | ${s.file} | ⬜ ${s.status} |`);
      }
      matrixLines.push('');
      matrixLines.push(`*Generated: ${new Date().toISOString()}*`);
      fs.writeFileSync(
        path.join(planningDir, 'bdd-traceability.md'),
        matrixLines.join('\n'),
        'utf8'
      );
    } catch {
      // Non-fatal — traceability matrix is best-effort
    }
  }

  return {
    valid: results.every(r => r.valid),
    files: results,
    totalScenarios,
    moscowCounts: totalMoscow
  };
}

/**
 * Format validation report as human-readable markdown
 * @param result - From validateFeatureDirectory or validateFeatureFile
 * @returns Markdown report
 */
function formatReport(result: DirectoryValidationResult | FeatureValidationResult): string {
  const lines: string[] = [];

  if ('files' in result) {
    // Directory report
    lines.push(`## BDD Validation Report`);
    lines.push(`**Status:** ${result.valid ? '✓ PASS' : '✗ FAIL'}`);
    lines.push(`**Files:** ${result.files.length} | **Scenarios:** ${result.totalScenarios}`);
    lines.push('');
    lines.push('### MoSCoW Distribution');
    lines.push(`| Priority | Count |`);
    lines.push(`|----------|-------|`);
    for (const [key, val] of Object.entries(result.moscowCounts)) {
      lines.push(`| @${key} | ${val} |`);
    }
    lines.push('');
    lines.push('### File Results');
    for (const f of result.files) {
      const icon = f.valid ? '✓' : '✗';
      lines.push(`- ${icon} \`${path.basename(f.file)}\` — ${f.summary}`);
      if (!f.valid && f.parseErrors) {
        for (const e of f.parseErrors) lines.push(`  - **Parse Error:** ${e}`);
      }
      if (f.structure && f.structure.issues.length > 0) {
        for (const e of f.structure.issues) lines.push(`  - **Structure:** ${e}`);
      }
      if (f.moscow && f.moscow.issues.length > 0) {
        for (const e of f.moscow.issues.slice(0, 3)) lines.push(`  - **MoSCoW:** ${e}`);
      }
    }
  } else {
    // Single file report
    lines.push(`## BDD Validation: ${path.basename(result.file)}`);
    lines.push(`**Status:** ${result.valid ? '✓ PASS' : '✗ FAIL'}`);
    lines.push(`**Scenarios:** ${result.scenarioCount ?? 0}`);

    if (result.invest) {
      lines.push('');
      lines.push('### INVEST Score');
      lines.push(`**${result.invest.score}/${result.invest.max}** dimensions pass`);
      for (const d of result.invest.dimensions) {
        lines.push(`- ${d.passed ? '✓' : '✗'} **${d.letter}** — ${d.dimension}: ${d.note}`);
      }
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
  const target = args[1];

  if (!cmd || !target) {
    console.error('Usage: bdd-validator.cjs <validate-file|validate-dir|count-moscow> <path>');
    process.exit(1);
  }

  try {
    if (cmd === 'validate-file') {
      const result = validateFeatureFile(target);
      if (args.includes('--json')) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatReport(result));
        process.exit(result.valid ? 0 : 1);
      }
    } else if (cmd === 'validate-dir') {
      const result = validateFeatureDirectory(target);
      if (args.includes('--json')) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatReport(result));
        process.exit(result.valid ? 0 : 1);
      }
    } else if (cmd === 'count-moscow') {
      const result = validateFeatureDirectory(target);
      console.log(JSON.stringify(result.moscowCounts, null, 2));
    } else {
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
    }
  } catch (err) {
    const error = err as Error;
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

export {
  parseFeatureFile,
  validateFeatureFile,
  validateFeatureDirectory,
  validateMosCowTags,
  validateINVEST,
  validateStructure,
  countByMosCow,
  findFeatureFiles,
  formatReport,
  generateScenarioId
};
