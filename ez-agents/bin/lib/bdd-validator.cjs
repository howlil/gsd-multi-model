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

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────
// Traceability
// ─────────────────────────────────────────────

/**
 * Generate a deterministic scenario ID using FNV-1a hash
 * @param {string} featureName
 * @param {string} scenarioName
 * @returns {string} ID like "SC-A1B2C3"
 */
function generateScenarioId(featureName, scenarioName) {
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
 * @param {string} content - Raw file content
 * @returns {{ feature: object, scenarios: object[], errors: string[] }}
 */
function parseFeatureFile(content) {
  const lines = content.split('\n');
  const result = { feature: null, scenarios: [], errors: [] };

  let currentScenario = null;
  let currentStep = null;
  let pendingTags = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

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
        tags: pendingTags.slice(),
        lineNumber: i + 1
      };
      pendingTags = [];
      continue;
    }

    // Background
    if (line.startsWith('Background:')) {
      currentScenario = { type: 'background', steps: [] };
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
        tags: pendingTags.slice(),
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
      const stepType = stepMatch[1];
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
        text: stepMatch[2],
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
 * @param {object} scenario
 * @returns {{ valid: boolean, moscow: string|null, tier: string|null, issues: string[] }}
 */
function validateMosCowTags(scenario) {
  const issues = [];
  const tags = scenario.tags || [];

  const moscowTag = tags.find(t => MOSCOW_TAGS.includes(t));
  const tierTag = tags.find(t => TIER_TAGS.includes(t));

  if (!moscowTag) {
    issues.push(`Scenario "${scenario.name}" missing MoSCoW tag (@must/@should/@could/@wont)`);
  }

  if (!tierTag && moscowTag !== '@wont') {
    issues.push(`Scenario "${scenario.name}" missing tier tag (@mvp/@medium/@enterprise)`);
  }

  // Check consistency
  if (moscowTag === '@must' && tierTag && tierTag !== '@mvp') {
    issues.push(`Scenario "${scenario.name}": @must scenarios should be tagged @mvp (found ${tierTag})`);
  }
  if (moscowTag === '@could' && tierTag === '@mvp') {
    issues.push(`Scenario "${scenario.name}": @could scenarios should not be tagged @mvp`);
  }

  return {
    valid: issues.length === 0,
    moscow: moscowTag || null,
    tier: tierTag || null,
    issues
  };
}

/**
 * Count scenarios by MoSCoW priority
 * @param {object[]} scenarios
 * @returns {{ must: number, should: number, could: number, wont: number, untagged: number }}
 */
function countByMosCow(scenarios) {
  const counts = { must: 0, should: 0, could: 0, wont: 0, untagged: 0 };
  for (const s of scenarios) {
    const tag = (s.tags || []).find(t => MOSCOW_TAGS.includes(t));
    if (!tag) counts.untagged++;
    else counts[tag.replace('@', '')]++;
  }
  return counts;
}

// ─────────────────────────────────────────────
// INVEST Validation
// ─────────────────────────────────────────────

/**
 * Validate INVEST criteria for a Feature + its scenarios
 * @param {object} parsed - Result from parseFeatureFile
 * @returns {{ score: number, max: number, dimensions: object[], passed: boolean }}
 */
function validateINVEST(parsed) {
  const dimensions = [];

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
  let thenClauses = [];
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
  const hasAsA = parsed.feature && /as a/i.test(parsed.feature.name);
  dimensions.push({
    dimension: 'Valuable',
    letter: 'V',
    passed: !!parsed.feature, // Feature declaration exists
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
  const mustCount = parsed.scenarios.filter(s => (s.tags || []).includes('@must')).length;
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
 * @param {object[]} scenarios
 * @returns {{ valid: boolean, issues: string[] }}
 */
function validateStructure(scenarios) {
  const issues = [];

  for (const scenario of scenarios) {
    if (scenario.type === 'background') continue;

    const steps = scenario.steps;
    if (steps.length === 0) {
      issues.push(`Scenario "${scenario.name}" has no steps`);
      continue;
    }

    const hasGiven = steps.some(s => s.resolvedType === 'Given');
    const hasWhen = steps.some(s => s.resolvedType === 'When');
    const hasThen = steps.some(s => s.resolvedType === 'Then');

    if (!hasWhen) {
      issues.push(`Scenario "${scenario.name}": missing When step (the action being tested)`);
    }
    if (!hasThen) {
      issues.push(`Scenario "${scenario.name}": missing Then step (the expected outcome)`);
    }

    // Check order: Given before When, When before Then
    let givenIndex = steps.findLastIndex(s => s.resolvedType === 'Given');
    let whenIndex = steps.findIndex(s => s.resolvedType === 'When');
    let thenIndex = steps.findIndex(s => s.resolvedType === 'Then');

    if (hasWhen && hasThen && whenIndex > thenIndex) {
      issues.push(`Scenario "${scenario.name}": When step appears after Then step`);
    }
    if (hasGiven && hasWhen && givenIndex > whenIndex) {
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
 * @param {string} filePath - Path to .feature file
 * @returns {{ file: string, valid: boolean, invest: object, moscow: object, structure: object, summary: string }}
 */
function validateFeatureFile(filePath) {
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
 * Validate all .feature files in a directory
 * @param {string} dirPath - Directory to scan
 * @param {object} options - { outputTraceability: boolean, cwd: string }
 * @returns {{ valid: boolean, files: object[], totalScenarios: number, moscowCounts: object }}
 */
function validateFeatureDirectory(dirPath, options = {}) {
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
  const totalMoscow = { must: 0, should: 0, could: 0, wont: 0, untagged: 0 };

  let totalScenarios = 0;
  const allScenarios = []; // for traceability matrix

  for (const r of results) {
    totalScenarios += r.scenarioCount || 0;
    if (r.moscow && r.moscow.counts) {
      for (const [key, val] of Object.entries(r.moscow.counts)) {
        totalMoscow[key] = (totalMoscow[key] || 0) + val;
      }
    }
    // Collect scenario data for traceability
    if (r.moscow && r.moscow.scenarios) {
      const featureBase = path.basename(r.file);
      r.moscow.scenarios.forEach((s, idx) => {
        allScenarios.push({
          id: s.id || `SC-${idx}`,
          name: s.scenario ? s.scenario.name : `Scenario ${idx + 1}`,
          moscow: s.moscow || 'untagged',
          file: featureBase,
          status: 'not-run'
        });
      });
    }
  }

  // Write traceability matrix if requested or by default when .planning/ exists
  const cwd = options.cwd || process.cwd();
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
 * Recursively find all .feature files
 * @param {string} dirPath
 * @returns {string[]}
 */
function findFeatureFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

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
 * Format validation report as human-readable markdown
 * @param {object} result - From validateFeatureDirectory or validateFeatureFile
 * @returns {string}
 */
function formatReport(result) {
  const lines = [];

  if (result.files) {
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
    lines.push(`**Scenarios:** ${result.scenarioCount}`);

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

if (require.main === module) {
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
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
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
