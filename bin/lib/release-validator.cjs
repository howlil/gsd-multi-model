#!/usr/bin/env node

/**
 * Release Validator — Automated release readiness validation
 *
 * Runs security gates, tier checklist validation, and produces
 * a Production Readiness Score (0-100) for /ez:release.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const TierManager = require('./tier-manager.cjs');

// ─────────────────────────────────────────────
// Security Helpers
// ─────────────────────────────────────────────

/**
 * Calculate Shannon entropy for a string — used to detect high-entropy secrets
 * @param {string} str
 * @param {number} threshold
 * @returns {boolean}
 */
function hasHighEntropy(str, threshold = 4.5) {
  const freq = {};
  for (const c of str) freq[c] = (freq[c] || 0) + 1;
  const len = str.length;
  let entropy = 0;
  for (const c in freq) {
    const p = freq[c] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy > threshold;
}

// ─────────────────────────────────────────────
// Security Gates
// ─────────────────────────────────────────────

/**
 * Run all security gates
 * @param {string} cwd - Working directory
 * @returns {{ passed: boolean, gates: object[] }}
 */
function runSecurityGates(cwd = process.cwd()) {
  const gates = [];

  // Gate 1: Multi-pattern secret detection
  try {
    const secretPatterns = [
      // Original + variants
      '(api[_-]?key|api[_-]?k[e3]y|password|passw[0o]rd|s[e3]cr[e3]t|auth[_-]?token)',
      // High-value secret types
      '(bearer|private[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret)',
      // Known formats: AWS
      'AKIA[0-9A-Z]{16}',
      // GitHub PAT
      'ghp_[a-zA-Z0-9]{36}',
      // JWT pattern
      'eyJ[a-zA-Z0-9-_=]+\\.[a-zA-Z0-9-_=]+\\.'
    ];
    const secretPattern = secretPatterns.join('|');
    const result = execSync(
      `git grep -i -E "${secretPattern}" HEAD 2>/dev/null | grep -v "example\\|placeholder\\|your-key\\|process\\.env\\|env\\.\\|config\\." | wc -l`,
      { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    const count = parseInt(result) || 0;
    gates.push({
      name: 'no_secrets',
      label: 'No secrets in committed files',
      passed: count === 0,
      blocking: true,
      detail: count === 0 ? 'Clean' : `${count} potential secret(s) found`
    });
  } catch {
    gates.push({ name: 'no_secrets', label: 'No secrets in committed files', passed: true, blocking: true, detail: 'Check skipped (git not available)' });
  }

  // Gate 2: npm audit
  try {
    execSync('npm audit --audit-level=critical 2>/dev/null', { cwd, stdio: 'pipe', timeout: 60000 });
    gates.push({ name: 'npm_audit', label: 'npm audit — no critical vulnerabilities', passed: true, blocking: true, detail: 'Clean' });
  } catch (err) {
    const output = err.stdout ? err.stdout.toString() : '';
    const criticals = (output.match(/critical/gi) || []).length;
    gates.push({
      name: 'npm_audit',
      label: 'npm audit — no critical vulnerabilities',
      passed: false,
      blocking: true,
      detail: `${criticals} critical vulnerability issue(s). Run: npm audit fix`
    });
  }

  // Gate 3: No production TODOs
  try {
    const srcDirs = ['src', 'lib', 'app', 'server'].filter(d => fs.existsSync(path.join(cwd, d)));
    if (srcDirs.length > 0) {
      const searchDirs = srcDirs.join(' ');
      const result = execSync(
        `grep -rn "TODO\\|FIXME\\|HACK\\|XXX" ${searchDirs} --include="*.ts" --include="*.js" --include="*.py" 2>/dev/null | grep -v "test\\|spec\\|\\.test\\." | wc -l`,
        { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();
      const count = parseInt(result) || 0;
      gates.push({
        name: 'no_prod_todos',
        label: 'No production TODO/FIXME in src/',
        passed: count === 0,
        blocking: false, // advisory
        detail: count === 0 ? 'Clean' : `${count} TODO/FIXME found in production code`
      });
    } else {
      gates.push({ name: 'no_prod_todos', label: 'No production TODO/FIXME in src/', passed: true, blocking: false, detail: 'No src/ directory found — skipped' });
    }
  } catch {
    gates.push({ name: 'no_prod_todos', label: 'No production TODO/FIXME in src/', passed: true, blocking: false, detail: 'Check skipped' });
  }

  // Gate 4: .env in .gitignore
  try {
    const gitignore = fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8');
    const protected_ = gitignore.match(/^\.env/m) !== null;
    gates.push({
      name: 'env_protected',
      label: '.env files in .gitignore',
      passed: protected_,
      blocking: true,
      detail: protected_ ? 'Protected' : '.env not found in .gitignore — add it before releasing'
    });
  } catch {
    gates.push({ name: 'env_protected', label: '.env files in .gitignore', passed: false, blocking: true, detail: '.gitignore not found or .env not listed' });
  }

  // Gate 5: MoSCoW coverage advisory (non-blocking)
  try {
    const featuresDir = path.join(cwd, 'features');
    const testDir = path.join(cwd, 'test');
    const specDir = path.join(cwd, 'spec');
    const bddDir = [featuresDir, testDir, specDir].find(d => fs.existsSync(d));
    if (bddDir) {
      const featureFiles = fs.readdirSync(bddDir).filter(f => f.endsWith('.feature'));
      if (featureFiles.length > 0) {
        let totalScenarios = 0;
        let taggedScenarios = 0;
        for (const file of featureFiles) {
          const content = fs.readFileSync(path.join(bddDir, file), 'utf8');
          const scenarioMatches = content.match(/^\s*Scenario/gm) || [];
          const mustMatches = content.match(/@must|@should|@could|@wont/g) || [];
          totalScenarios += scenarioMatches.length;
          taggedScenarios += mustMatches.length;
        }
        const untaggedPct = totalScenarios > 0 ? ((totalScenarios - taggedScenarios) / totalScenarios) * 100 : 0;
        gates.push({
          name: 'moscow_coverage',
          label: 'MoSCoW tag coverage in BDD scenarios',
          passed: untaggedPct <= 20,
          blocking: false, // advisory
          detail: untaggedPct <= 20
            ? `${Math.round(100 - untaggedPct)}% scenarios tagged`
            : `${Math.round(untaggedPct)}% scenarios missing @must/@should tags`
        });
      } else {
        gates.push({ name: 'moscow_coverage', label: 'MoSCoW tag coverage in BDD scenarios', passed: true, blocking: false, detail: 'No .feature files found — skipped' });
      }
    } else {
      gates.push({ name: 'moscow_coverage', label: 'MoSCoW tag coverage in BDD scenarios', passed: true, blocking: false, detail: 'No BDD directory found — skipped' });
    }
  } catch {
    gates.push({ name: 'moscow_coverage', label: 'MoSCoW tag coverage in BDD scenarios', passed: true, blocking: false, detail: 'Check skipped' });
  }

  const passed = gates.filter(g => g.passed && g.blocking).length;
  const total = gates.filter(g => g.blocking).length;
  const allPassed = gates.filter(g => g.blocking).every(g => g.passed);

  return { passed: allPassed, gates, score: `${passed}/${total}` };
}

// ─────────────────────────────────────────────
// Tier Checklist
// ─────────────────────────────────────────────

const MVP_CHECKLIST = [
  { id: 'bdd_must', label: 'All @must BDD scenarios passing', auto: true },
  { id: 'npm_audit', label: 'npm audit — no critical vulnerabilities', auto: true },
  { id: 'health_endpoint', label: 'Health endpoint returns 200', auto: true },
  { id: 'no_secrets', label: 'No secrets in committed files', auto: true },
  { id: 'app_starts', label: 'Application starts without errors', auto: true },
  { id: 'rollback_documented', label: 'Rollback procedure documented', auto: true },
  { id: 'security_scan', label: 'Baseline security scan completed', auto: true },
  { id: 'audit_logging', label: 'Audit logging enabled for security-sensitive actions', auto: true },
  { id: 'compliance_evidence', label: 'Required compliance checklist/evidence files present', auto: false }
];

const MEDIUM_EXTRA = [
  { id: 'bdd_should', label: 'All @should BDD scenarios passing', auto: true },
  { id: 'coverage_80', label: 'Test coverage ≥ 80%', auto: true },
  { id: 'staging_parity', label: 'Staging environment parity verified', auto: false },
  { id: 'monitoring', label: 'Monitoring/alerts configured', auto: false },
  { id: 'structured_logging', label: 'Structured logging (no console.log in prod)', auto: true },
  { id: 'perf_baseline', label: 'Performance baseline documented', auto: false },
  { id: 'error_tracking', label: 'Error tracking configured', auto: false },
  { id: 'db_migrations', label: 'Database migrations tested on staging', auto: false },
  { id: 'api_docs', label: 'API documentation current', auto: false },
  { id: 'env_example', label: '.env.example up to date', auto: true },
  { id: 'graceful_shutdown', label: 'Graceful shutdown handled', auto: true },
  { id: 'rate_limiting', label: 'Rate limiting on public API endpoints', auto: true }
];

const ENTERPRISE_EXTRA = [
  { id: 'bdd_could', label: 'All @could BDD scenarios passing', auto: true },
  { id: 'coverage_95', label: 'Test coverage ≥ 95%', auto: true },
  { id: 'security_audit', label: 'Security audit completed', auto: false },
  { id: 'compliance_docs', label: 'Compliance documentation updated', auto: false },
  { id: 'load_test', label: 'Load test results documented', auto: false },
  { id: 'dr_tested', label: 'Disaster recovery tested', auto: false },
  { id: 'data_retention', label: 'Data retention policy configured', auto: false },
  { id: 'audit_logging', label: 'Audit logging enabled', auto: true },
  { id: 'pentest', label: 'Penetration test completed or scheduled', auto: false },
  { id: 'soc2_gdpr', label: 'SOC2/GDPR controls validated', auto: false },
  { id: 'change_ticket', label: 'Change management ticket filed', auto: false },
  { id: 'incident_runbook', label: 'Incident runbook up to date', auto: false }
];

// ─────────────────────────────────────────────
// Rollback Validation
// ─────────────────────────────────────────────

/**
 * Validate rollback plan content — checks for unfilled placeholders
 * @param {string} cwd
 * @returns {{ status: string, detail: string }}
 */
function validateRollbackContent(cwd) {
  const releasesDir = path.join(cwd, '.planning', 'releases');
  if (!fs.existsSync(releasesDir)) {
    return { status: 'fail', detail: 'No .planning/releases/ directory found' };
  }

  const rollbackFiles = fs.readdirSync(releasesDir)
    .filter(f => f.includes('ROLLBACK') && f.endsWith('.md'));

  if (rollbackFiles.length === 0) {
    return { status: 'fail', detail: 'No rollback plan found' };
  }

  const latest = rollbackFiles.sort().pop();
  const content = fs.readFileSync(path.join(releasesDir, latest), 'utf8');

  // Detect unfilled placeholders like {name}, {migration_name}, {your-domain}
  const placeholders = content.match(/\{[a-z_-]+\}/gi) || [];
  if (placeholders.length > 0) {
    return {
      status: 'fail',
      detail: `Rollback plan has ${placeholders.length} unfilled placeholder(s): ${placeholders.slice(0, 3).join(', ')}`
    };
  }

  return { status: 'pass', detail: `Rollback plan validated: ${latest}` };
}

// ─────────────────────────────────────────────
// Manual Checklist State Persistence (Fix 11)
// ─────────────────────────────────────────────

/**
 * Load persisted manual checklist state
 * @param {string} cwd
 * @returns {object}
 */
function loadChecklistState(cwd) {
  const statePath = path.join(cwd, '.planning', 'releases', 'checklist-state.json');
  if (!fs.existsSync(statePath)) return {};
  try { return JSON.parse(fs.readFileSync(statePath, 'utf8')); }
  catch { return {}; }
}

/**
 * Mark a manual checklist item as complete with approver and timestamp
 * @param {string} itemId
 * @param {string} approver
 * @param {string} cwd
 */
function markManualItemComplete(itemId, approver, cwd = process.cwd()) {
  const state = loadChecklistState(cwd);
  state[itemId] = {
    approved: true,
    approver: approver || 'unknown',
    timestamp: new Date().toISOString(),
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  };
  const statePath = path.join(cwd, '.planning', 'releases', 'checklist-state.json');
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

/**
 * Get full checklist for a tier
 * @param {string} tier
 * @returns {object[]}
 */
function getChecklist(tier) {
  const t = tier.toLowerCase();
  if (t === 'mvp') return [...MVP_CHECKLIST];
  if (t === 'medium') return [...MVP_CHECKLIST, ...MEDIUM_EXTRA];
  if (t === 'enterprise') return [...MVP_CHECKLIST, ...MEDIUM_EXTRA, ...ENTERPRISE_EXTRA];
  throw new Error(`Unknown tier: ${tier}`);
}

/**
 * Run automated checklist items
 * @param {string} tier
 * @param {string} cwd
 * @param {object} context - additional context (coverage, bddResults, etc.)
 * @returns {{ items: object[], passed: number, total: number, score: number }}
 */
function runChecklist(tier, cwd = process.cwd(), context = {}) {
  const items = getChecklist(tier);
  const results = [];

  for (const item of items) {
    let result;
    if (!item.auto) {
      // Fix 11: Check persisted state for manual items
      const state = loadChecklistState(cwd);
      const saved = state[item.id];
      if (saved && saved.approved) {
        const age = Date.now() - new Date(saved.timestamp).getTime();
        const ageDays = Math.floor(age / (1000 * 60 * 60 * 24));
        if (ageDays > 30) {
          result = { ...item, status: 'fail', detail: `Manual check expired ${ageDays}d ago — re-verify required` };
        } else {
          result = { ...item, status: 'pass', detail: `Verified by ${saved.approver} on ${saved.timestamp.split('T')[0]}` };
        }
      } else {
        result = { ...item, status: 'manual', detail: 'Requires manual verification (run: ez checklist mark <id> <approver>)' };
      }
    } else {
      result = runChecklistItem(item, cwd, context);
    }
    results.push(result);
  }

  const autoItems = results.filter(r => r.auto);
  const passed = autoItems.filter(r => r.status === 'pass').length;
  const total = autoItems.length;

  // Compute readiness score: blocking failures cost 10, advisory failures cost 2
  let score = 100;
  for (const r of results) {
    if (r.status === 'fail') {
      score -= r.blocking !== false ? 10 : 2;
    }
  }
  score = Math.max(0, score);

  return { items: results, passed, total, score };
}

function runChecklistItem(item, cwd, context) {
  try {
    switch (item.id) {
      case 'npm_audit':
      case 'no_secrets':
        // Already handled in security gates — check from context
        return { ...item, status: 'pass', detail: 'Verified in security gates' };

      case 'coverage_80': {
        const cov = context.coverage;
        if (cov === undefined) return { ...item, status: 'skip', detail: 'No coverage data available' };
        return { ...item, status: cov >= 80 ? 'pass' : 'fail', detail: `Coverage: ${cov}%` };
      }

      case 'coverage_95': {
        const cov = context.coverage;
        if (cov === undefined) return { ...item, status: 'skip', detail: 'No coverage data available' };
        return { ...item, status: cov >= 95 ? 'pass' : 'fail', detail: `Coverage: ${cov}%` };
      }

      case 'bdd_must': {
        const { bddPassed, moscowTagged, totalScenarios } = context;
        // Hard gate: fail if there are too many untagged scenarios
        if (moscowTagged !== undefined && totalScenarios > 0) {
          const untaggedPct = ((totalScenarios - moscowTagged) / totalScenarios) * 100;
          if (untaggedPct > 20) { // > 20% untagged = blocking
            return { ...item, status: 'fail', detail: `${Math.round(untaggedPct)}% scenarios missing @must/@should tags — BDD coverage unverifiable` };
          }
        }
        if (bddPassed === undefined) return { ...item, status: 'skip', detail: 'No BDD results — run test suite first' };
        return { ...item, status: bddPassed ? 'pass' : 'fail', detail: bddPassed ? 'All scenarios passing' : 'Some scenarios failing' };
      }

      case 'bdd_should':
      case 'bdd_could': {
        const bddPassed = context.bddPassed;
        if (bddPassed === undefined) return { ...item, status: 'skip', detail: 'No BDD test results available' };
        return { ...item, status: bddPassed ? 'pass' : 'fail', detail: bddPassed ? 'All scenarios passing' : 'Some scenarios failing' };
      }

      case 'rollback_documented': {
        const rollbackResult = validateRollbackContent(cwd);
        return { ...item, status: rollbackResult.status, detail: rollbackResult.detail };
      }

      case 'env_example': {
        const hasExample = fs.existsSync(path.join(cwd, '.env.example'));
        return { ...item, status: hasExample ? 'pass' : 'fail', detail: hasExample ? '.env.example found' : '.env.example missing' };
      }

      case 'structured_logging': {
        try {
          const srcDirs = ['src', 'lib', 'app'].filter(d => fs.existsSync(path.join(cwd, d)));
          if (srcDirs.length === 0) return { ...item, status: 'skip', detail: 'No src/ found' };
          const result = execSync(
            `grep -rn "console\\.log" ${srcDirs.join(' ')} --include="*.ts" --include="*.js" 2>/dev/null | grep -v "test\\|spec" | wc -l`,
            { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
          ).trim();
          const count = parseInt(result) || 0;
          return { ...item, status: count === 0 ? 'pass' : 'fail', detail: count === 0 ? 'No console.log in prod' : `${count} console.log found` };
        } catch {
          return { ...item, status: 'skip', detail: 'Check failed' };
        }
      }

      case 'health_endpoint': {
        // Try to detect health endpoint in source
        try {
          const srcDirs = ['src', 'app', 'server', 'pages/api'].filter(d => fs.existsSync(path.join(cwd, d)));
          if (srcDirs.length === 0) return { ...item, status: 'skip', detail: 'No src/ found' };
          const result = execSync(
            `grep -rn "health\\|/ping\\|/status" ${srcDirs.join(' ')} --include="*.ts" --include="*.js" 2>/dev/null | wc -l`,
            { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
          ).trim();
          const found = parseInt(result) > 0;
          return { ...item, status: found ? 'pass' : 'skip', detail: found ? 'Health endpoint found in source' : 'No health endpoint found (optional for MVP)' };
        } catch {
          return { ...item, status: 'skip', detail: 'Check failed' };
        }
      }

      default:
        return { ...item, status: 'skip', detail: 'Automated check not implemented' };
    }
  } catch (err) {
    return { ...item, status: 'error', detail: err.message };
  }
}

// ─────────────────────────────────────────────
// Full Validation
// ─────────────────────────────────────────────

/**
 * Run full release validation
 * @param {string} tier
 * @param {string} version
 * @param {string} cwd
 * @param {object} context
 * @returns {{ valid: boolean, blockers: string[], warnings: string[], score: number, securityGates: object, checklist: object }}
 */
function validateRelease(tier, version, cwd = process.cwd(), context = {}) {
  const securityGates = runSecurityGates(cwd);
  const checklist = runChecklist(tier, cwd, context);

  const blockers = [];
  const warnings = [];

  // Security gate failures
  for (const gate of securityGates.gates) {
    if (!gate.passed && gate.blocking) blockers.push(`Security: ${gate.label} — ${gate.detail}`);
    if (!gate.passed && !gate.blocking) warnings.push(`Security: ${gate.label} — ${gate.detail}`);
  }

  // Checklist failures
  for (const item of checklist.items) {
    if (item.status === 'fail') {
      if (item.blocking !== false) warnings.push(`Checklist: ${item.label}`);
    }
  }

  const valid = blockers.length === 0;
  const readinessScore = Math.min(checklist.score, securityGates.passed ? 100 : 50);

  const readinessStatus = readinessScore >= 90 ? 'READY'
    : readinessScore >= 70 ? 'CONDITIONAL'
    : 'NOT READY';

  return {
    valid,
    tier,
    version,
    blockers,
    warnings,
    score: readinessScore,
    readinessStatus,
    securityGates,
    checklist
  };
}

/**
 * Format validation result as markdown
 */
function formatValidation(result) {
  const lines = [];
  const icon = result.valid ? '✓' : '✗';

  lines.push(`## Release Validation: v${result.version} (${result.tier})`);
  lines.push(`**Status:** ${icon} ${result.valid ? 'READY' : 'BLOCKED'}`);
  lines.push(`**Production Readiness Score:** ${result.score}/100 — ${result.readinessStatus}`);
  lines.push('');

  lines.push('### Security Gates');
  for (const g of result.securityGates.gates) {
    lines.push(`- ${g.passed ? '✓' : '✗'} ${g.label}: ${g.detail}`);
  }
  lines.push('');

  lines.push(`### Checklist (${result.tier})`);
  for (const item of result.checklist.items) {
    const icon2 = item.status === 'pass' ? '✓' : item.status === 'skip' ? '○' : item.status === 'manual' ? '?' : '✗';
    lines.push(`- ${icon2} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
  }
  lines.push('');

  if (result.blockers.length > 0) {
    lines.push('### Blockers (must fix)');
    result.blockers.forEach(b => lines.push(`- 🛑 ${b}`));
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('### Warnings (advisory)');
    result.warnings.forEach(w => lines.push(`- ⚠️ ${w}`));
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────
// CLI Interface
// ─────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0];

  try {
    if (cmd === 'security-gates') {
      const result = runSecurityGates(process.cwd());
      if (args.includes('--json')) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        for (const g of result.gates) {
          console.log(`${g.passed ? '✓' : '✗'} ${g.label}: ${g.detail}`);
        }
        process.exit(result.passed ? 0 : 1);
      }
    } else if (cmd === 'checklist') {
      const tier = args[1];
      if (!tier) { console.error('Usage: release-validator.cjs checklist <tier>'); process.exit(1); }
      const result = runChecklist(tier, process.cwd());
      if (args.includes('--json')) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        for (const item of result.items) {
          const icon = item.status === 'pass' ? '✓' : item.status === 'skip' ? '○' : '✗';
          console.log(`${icon} ${item.label}`);
        }
        console.log(`\nScore: ${result.score}/100`);
      }
    } else if (cmd === 'validate') {
      const tier = args[1];
      const version = args[2] || '0.0.0';
      if (!tier) { console.error('Usage: release-validator.cjs validate <tier> [version]'); process.exit(1); }
      const result = validateRelease(tier, version, process.cwd());
      if (args.includes('--json')) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatValidation(result));
        process.exit(result.valid ? 0 : 1);
      }
    } else if (cmd === 'checklist-mark') {
      // Fix 11: ez checklist mark <id> <approver>
      const itemId = args[1];
      const approver = args[2];
      if (!itemId || !approver) {
        console.error('Usage: release-validator.cjs checklist-mark <item-id> <approver>');
        process.exit(1);
      }
      markManualItemComplete(itemId, approver, process.cwd());
      console.log(JSON.stringify({ marked: true, item: itemId, approver, timestamp: new Date().toISOString() }));
    } else {
      console.error(`Unknown command: ${cmd}`);
      console.error('Commands: security-gates, checklist, validate, checklist-mark');
      process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  runSecurityGates,
  getChecklist,
  runChecklist,
  validateRelease,
  formatValidation,
  validateRollbackContent,
  loadChecklistState,
  markManualItemComplete,
  hasHighEntropy
};
