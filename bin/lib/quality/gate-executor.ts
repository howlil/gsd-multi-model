
/**
 * Gate Executor — Quality gate execution coordinator
 *
 * Executes all registered quality gates and reports results.
 * Supports bypass with audit trail, caching, and CI mode.
 *
 * Usage:
 *   node gate-executor.js --gate gate-04 --timeout 2000
 *   node gate-executor.js --ci --cache --timeout 30000
 *   node gate-executor.js --status
 *   node gate-executor.js --bypass "reason" --gate gate-04
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { QualityGate } from '../quality/index.js';
import { z } from 'zod';

const AUDIT_FILE = path.join(process.cwd(), '.planning', 'gate-audit.json');
const STATUS_FILE = path.join(process.cwd(), '.planning', 'quality-status.json');
const BYPASS_LOG = path.join(process.cwd(), '.planning', 'gates', 'bypass-log.md');
const RESULTS_FILE = path.join(process.cwd(), 'gate-results.json');
const CONFIG_FILE = path.join(process.cwd(), '.planning', 'config.json');

// Initialize quality gate coordinator
const qg = new QualityGate();

// Register standard gates

// Test gate
qg.registerGate('test', z.object({ passRate: z.number().min(0.9) }), async () => {
  try {
    execSync('npm test', { stdio: 'pipe', encoding: 'utf8' });
    return { passed: true, errors: [], warnings: [] };
  } catch (err) {
    // Try to parse test output for pass rate
    const error = err as { stdout?: string; stderr?: string };
    const output = error.stdout || error.stderr || '';
    const match = output.match(/(\d+)%\s+pass/);
    const passRate = match && match[1] ? parseInt(match[1], 10) / 100 : 0;
    return { passed: false, errors: [{ path: 'test', message: `Tests failed (pass rate: ${(passRate * 100).toFixed(1)}%)` }], warnings: [] };
  }
});

// Lint gate
qg.registerGate('lint', z.object({ errorCount: z.number().max(0) }), async () => {
  try {
    execSync('npx eslint . --ext .cjs,.js --max-warnings=0', { stdio: 'pipe', encoding: 'utf8' });
    return { passed: true, errors: [], warnings: [] };
  } catch (err) {
    const error = err as { stdout?: string; stderr?: string };
    const output = error.stdout || error.stderr || '';
    const match = output.match(/(\d+)\s+error/);
    const errorCount = match && match[1] ? parseInt(match[1], 10) : 1;
    return { passed: false, errors: [{ path: 'lint', message: `Linting failed (${errorCount} errors)` }], warnings: [] };
  }
});

// Security gate
qg.registerGate('security', z.object({ vulnerabilities: z.number().max(0) }), async () => {
  try {
    execSync('npm audit --production', { stdio: 'pipe', encoding: 'utf8' });
    return { passed: true, errors: [], warnings: [] };
  } catch (err) {
    const error = err as { stdout?: string; stderr?: string };
    const output = error.stdout || error.stderr || '';
    const match = output.match(/found\s+(\d+)\s+vulnerabilit/);
    const vulnerabilities = match && match[1] ? parseInt(match[1], 10) : 1;
    if (vulnerabilities > 0) {
      console.warn(`[WARN] Found ${vulnerabilities} vulnerabilities`);
      // Don't fail - just warn
    }
    return { passed: vulnerabilities === 0, errors: [], warnings: vulnerabilities > 0 ? [`Found ${vulnerabilities} vulnerabilities`] : [] };
  }
});

// Build gate
qg.registerGate('build', z.object({ success: z.boolean() }), async () => {
  try {
    execSync('node scripts/build-hooks.js', { stdio: 'pipe', encoding: 'utf8' });
    return { passed: true, errors: [], warnings: [] };
  } catch (err) {
    return { passed: false, errors: [{ path: 'build', message: 'Build failed' }], warnings: [] };
  }
});

// Documentation gate (JSDoc coverage)
qg.registerGate('docs', z.object({ jsdocCoverage: z.number().min(0.5) }), async () => {
  // Simple check: count files with JSDoc comments
  const libDir = path.join(process.cwd(), 'bin', 'lib');
  if (!fs.existsSync(libDir)) {
    return { passed: true, errors: [], warnings: [] };
  }

  const files = fs.readdirSync(libDir).filter((f) => f.endsWith('.cjs') || f.endsWith('.ts'));
  let withJSDoc = 0;

  for (const file of files) {
    const content = fs.readFileSync(path.join(libDir, file), 'utf8');
    if (content.includes('/**')) {
      withJSDoc++;
    }
  }

  const coverage = files.length > 0 ? withJSDoc / files.length : 1.0;
  return {
    passed: coverage >= 0.5,
    errors: coverage < 0.5 ? [{ path: 'docs', message: `JSDoc coverage too low: ${(coverage * 100).toFixed(1)}%` }] : [],
    warnings: [],
  };
});

/**
 * Gate status interface
 */
interface GateStatusData {
  gates: Record<string, GateResultData>;
  lastRun: string | null;
  duration?: number;
}

/**
 * Gate result data interface
 */
interface GateResultData {
  passed: boolean;
  timestamp: string;
  errors: string[];
  warnings: string[];
}

/**
 * Load gate status from file
 */
function loadStatus(): GateStatusData {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8')) as GateStatusData;
    }
  } catch (err) {
    // Ignore
  }
  return { gates: {}, lastRun: null };
}

/**
 * Save gate status to file
 */
function saveStatus(status: GateStatusData): void {
  try {
    const dir = path.dirname(STATUS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save status:', (err as Error).message);
  }
}

/**
 * Record gate bypass to audit trail and bypass log
 */
function recordBypass(gateId: string, reason: string): void {
  const audit = {
    gate: gateId,
    action: 'bypass',
    reason,
    bypassedBy: process.env.USER || process.env.USERNAME || 'unknown',
    timestamp: new Date().toISOString(),
  };

  let auditTrail: unknown[] = [];
  try {
    if (fs.existsSync(AUDIT_FILE)) {
      auditTrail = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
    }
  } catch (err) {
    // Ignore
  }

  auditTrail.push(audit);
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(auditTrail, null, 2), 'utf8');
  
  // Also log to bypass-log.md
  try {
    const dir = path.dirname(BYPASS_LOG);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const date = new Date().toISOString().split('T')[0];
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const author = execSync('git config user.name', { encoding: 'utf8' }).trim();
    
    const logEntry = `| ${date} | ${gateId} | ${commit} | ${author} | ${reason} |\n`;
    
    // Read existing log and add entry before the statistics section
    let logContent = '';
    if (fs.existsSync(BYPASS_LOG)) {
      logContent = fs.readFileSync(BYPASS_LOG, 'utf8');
      const lines = logContent.split('\n');
      const statsIdx = lines.findIndex(line => line.includes('## Bypass Statistics'));
      if (statsIdx > 0) {
        // Insert before statistics
        lines.splice(statsIdx, 0, logEntry);
        logContent = lines.join('\n');
      } else {
        // Append to table
        logContent = logContent.trimEnd() + '\n' + logEntry + '\n';
      }
    } else {
      logContent = `# Gate Bypass Log\n\n| Date | Gate | Commit | Author | Reason |\n|------|------|--------|--------|--------|\n${logEntry}\n`;
    }
    
    fs.writeFileSync(BYPASS_LOG, logContent, 'utf8');
  } catch (err) {
    console.error('Failed to log bypass:', (err as Error).message);
  }
  
  console.warn(`[GATE BYPASS] ${gateId} bypassed: ${reason}`);
}

/**
 * Check if gate should run based on cache
 */
async function shouldRunGate(gateId: string, relevancePatterns: string[]): Promise<boolean> {
  const cacheFile = path.join(process.cwd(), '.planning', 'gate-cache.json');
  
  try {
    let cache: Record<string, { hash: string; timestamp: number }> = {};
    if (fs.existsSync(cacheFile)) {
      cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    }
    
    // Calculate hash of relevant files
    const crypto = await import('crypto');
    const hash = crypto.createHash('md5');
    
    for (const pattern of relevancePatterns) {
      const dir = path.dirname(pattern.replace(/^\*\*\//, ''));
      const ext = path.extname(pattern);
      
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir, { recursive: true }) as string[];
        for (const file of files.filter(f => f.endsWith(ext))) {
          const filePath = path.join(dir, file);
          if (fs.existsSync(filePath)) {
            hash.update(fs.readFileSync(filePath, 'utf8'));
          }
        }
      }
    }
    
    const newHash = hash.digest('hex');
    const now = Date.now();
    
    // Check if cache is valid (5 minutes)
    if (cache[gateId] && cache[gateId].hash === newHash && (now - cache[gateId].timestamp) < 300000) {
      return false; // Skip gate, cache is valid
    }
    
    // Update cache
    cache[gateId] = { hash: newHash, timestamp: now };
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf8');
    
    return true; // Run gate
  } catch (err) {
    console.error('Cache check failed, running gate:', (err as Error).message);
    return true; // Run gate on error
  }
}

/**
 * Load configuration
 */
function loadConfig(): Record<string, unknown> {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (err) {
    // Ignore
  }
  return {};
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const status = loadStatus();
  const config = loadConfig() as Record<string, Record<string, unknown>>;
  
  // Parse arguments
  const gateIdx = args.indexOf('--gate');
  const singleGate = gateIdx !== -1 && args[gateIdx + 1] ? args[gateIdx + 1] : null;
  const cacheEnabled = args.includes('--cache');
  const timeoutIdx = args.indexOf('--timeout');
  const timeout = timeoutIdx !== -1 && args[timeoutIdx + 1] ? parseInt(args[timeoutIdx + 1], 10) : 30000;
  const ciMode = args.includes('--ci');
  
  // Check for bypass flag
  const bypassIdx = args.indexOf('--bypass');
  if (bypassIdx !== -1 && args[bypassIdx + 1]) {
    const reason = args[bypassIdx + 1];
    if (singleGate && reason) {
      recordBypass(singleGate, reason);
      process.exit(0);
    } else {
      console.error('Error: --bypass requires --gate <gate-id>');
      process.exit(1);
    }
  }
  
  // Get gate list
  let gatesToRun: string[] = [];
  if (singleGate) {
    gatesToRun = [singleGate];
  } else if (ciMode && config.quality_gates?.ci?.gates) {
    gatesToRun = config.quality_gates.ci.gates as string[];
  } else {
    gatesToRun = qg.getRegisteredGates();
  }
  
  // Get relevance patterns for caching
  const relevancePatterns: Record<string, string[]> = config.quality_gates?.relevance_patterns as Record<string, string[]> || {};
  
  // Execute gates
  const results: Record<string, GateResultData> = {};
  const startTime = Date.now();
  
  console.log('Executing quality gates...');
  console.log('');
  
  for (const gateId of gatesToRun) {
    try {
      // Check cache if enabled
      if (cacheEnabled && relevancePatterns[gateId]) {
        const shouldRun = await shouldRunGate(gateId, relevancePatterns[gateId]);
        if (!shouldRun) {
          console.log(`⊘ ${gateId} (cached - no relevant changes)`);
          results[gateId] = {
            passed: true,
            timestamp: new Date().toISOString(),
            errors: [],
            warnings: ['Skipped (cached)'],
          };
          continue;
        }
      }
      
      // Execute gate with timeout
      const gatePromise = qg.executeGate(gateId, {});
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
      );
      
      const result = await Promise.race([gatePromise, timeoutPromise]);
      results[gateId] = {
        passed: result.passed,
        timestamp: new Date().toISOString(),
        errors: (result.errors || []).map((e) => e.message),
        warnings: result.warnings || [],
      };
      
      const icon = result.passed ? '✓' : '✗';
      console.log(`${icon} ${gateId}`);
      
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach((w) => console.warn(`  ⚠ ${w}`));
      }
    } catch (err) {
      results[gateId] = {
        passed: false,
        timestamp: new Date().toISOString(),
        errors: [(err as Error).message],
        warnings: [],
      };
      console.log(`✗ ${gateId}: ${(err as Error).message}`);
    }
  }
  
  const duration = Date.now() - startTime;
  status.lastRun = new Date().toISOString();
  status.gates = results;
  status.duration = duration;
  saveStatus(status);
  
  // Save results for CI mode
  if (ciMode) {
    const resultsData = Object.entries(results).map(([gateId, result]) => ({
      name: gateId,
      passed: result.passed,
      errors: result.errors,
      warnings: result.warnings,
      timestamp: result.timestamp,
    }));
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(resultsData, null, 2), 'utf8');
  }
  
  console.log('');
  console.log(`Quality gates completed in ${(duration / 1000).toFixed(1)}s`);
  
  // Check for failures
  const failed = Object.entries(results).filter(([_, r]) => !r.passed);
  if (failed.length > 0) {
    console.log('');
    console.log('Failed gates:');
    failed.forEach(([gateId, result]) => {
      console.log(`  - ${gateId}: ${result.errors.join(', ')}`);
    });
    console.log('');
    console.log('Use --bypass "reason" to bypass a gate (requires audit trail)');
    process.exit(1);
  }
  
  console.log('');
  console.log('All quality gates passed ✓');
}

// Handle different modes
if (process.argv.includes('--pre-commit') || process.argv.includes('--gate') || process.argv.includes('--ci')) {
  main().catch((err) => {
    console.error('Gate execution failed:', (err as Error).message);
    process.exit(1);
  });
}

// Handle status mode
if (process.argv.includes('--status')) {
  const status = loadStatus();
  console.log('');
  console.log('Quality Gate Status');
  console.log('═══════════════════');
  console.log('');
  
  if (!status.lastRun) {
    console.log('No gate runs recorded');
  } else {
    console.log(`Last run: ${new Date(status.lastRun).toLocaleString()}`);
    console.log(`Duration: ${status.duration || 0}ms`);
    console.log('');
    
    const passed = Object.values(status.gates).filter((g) => g.passed).length;
    const failed = Object.values(status.gates).filter((g) => !g.passed).length;
    console.log(`Results: ${passed} passed, ${failed} failed`);
  }
  console.log('');
  process.exit(0);
}

// Default: don't run, just export
export { QualityGate, recordBypass, loadStatus, saveStatus };
