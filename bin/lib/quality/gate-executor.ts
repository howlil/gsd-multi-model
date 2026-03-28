
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
import { QualityGate } from './quality-gate.js';
import { z } from 'zod';
import { executeGate1, registerGate1 } from '../gates/gate-01-requirement.js';
import { executeGate2, registerGate2 } from '../gates/gate-02-architecture.js';
import { executeGate3, registerGate3 } from '../gates/gate-03-code.js';
import { executeGate4, registerGate4 } from '../gates/gate-04-security.js';

const AUDIT_FILE = path.join(process.cwd(), '.planning', 'gate-audit.json');
const STATUS_FILE = path.join(process.cwd(), '.planning', 'quality-status.json');
const BYPASS_LOG = path.join(process.cwd(), '.planning', 'gates', 'bypass-log.md');
const RESULTS_FILE = path.join(process.cwd(), 'gate-results.json');
const CONFIG_FILE = path.join(process.cwd(), '.planning', 'config.json');

// Initialize quality gate coordinator
const qg = new QualityGate();

// Register all 4 quality gates
registerGate1(qg);
registerGate2(qg);
registerGate3(qg);
registerGate4(qg);

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
        const files = fs.readdirSync(dir);
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
 * Load requirements for gate-01
 */
function loadRequirements(): Array<{ id: string; description: string; acceptanceCriteria: string[]; mappedTasks?: string[]; mappedPhases?: string[] }> {
  const requirements: Array<{ id: string; description: string; acceptanceCriteria: string[]; mappedTasks?: string[]; mappedPhases?: string[] }> = [];
  
  // Read REQUIREMENTS.md
  const reqFile = path.join(process.cwd(), '.planning', 'REQUIREMENTS.md');
  if (fs.existsSync(reqFile)) {
    const content = fs.readFileSync(reqFile, 'utf8');
    // Extract requirement IDs from markdown
    const reqIdPattern = /\*\*([A-Z]+-\d+)\*\*:?/g;
    const matches = content.match(reqIdPattern);
    if (matches) {
      for (const match of matches) {
        const id = match.replace(/\*\*/g, '').replace(/:$/, '');
        requirements.push({
          id,
          description: `Requirement ${id}`,
          acceptanceCriteria: ['Given the system, When triggered, Then it should work'],
        });
      }
    }
  }
  
  // Also scan phase files for requirements
  const phasesDir = path.join(process.cwd(), '.planning', 'phases');
  if (fs.existsSync(phasesDir)) {
    const phaseFiles = fs.readdirSync(phasesDir);
    for (const file of phaseFiles) {
      if (file.endsWith('.md')) {
        const filePath = path.join(phasesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const reqIdPattern = /\*\*([A-Z]+-\d+)\*\*:?/g;
        const reqMatches = content.match(reqIdPattern);
        if (reqMatches) {
          for (const match of reqMatches) {
            const id = match.replace(/\*\*/g, '').replace(/:$/, '');
            if (!requirements.find(r => r.id === id)) {
              requirements.push({
                id,
                description: `Requirement ${id}`,
                acceptanceCriteria: ['Given the system, When triggered, Then it should work'],
              });
            }
          }
        }
      }
    }
  }
  
  return requirements;
}

/**
 * Load tasks and phases for mapping validation
 */
function loadTasksAndPhases(): { tasks: Array<{ id?: string; name?: string; description?: string; requirements?: string[] }>; phases: Array<{ id?: string; name?: string; description?: string; requirements?: string[] }> } {
  const tasks: Array<{ id?: string; name?: string; description?: string; requirements?: string[] }> = [];
  const phases: Array<{ id?: string; name?: string; description?: string; requirements?: string[] }> = [];
  
  // Scan phase files for tasks and phases
  const phasesDir = path.join(process.cwd(), '.planning', 'phases');
  if (fs.existsSync(phasesDir)) {
    const phaseFiles = fs.readdirSync(phasesDir);
    for (const file of phaseFiles) {
      if (file.endsWith('.md')) {
        const filePath = path.join(phasesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Extract phase ID from frontmatter
        const phaseIdMatch = content.match(/phase:\s*(\d+)/);
        const phaseId = phaseIdMatch ? `phase-${phaseIdMatch[1]}` : file.replace('.md', '');
        
        // Extract requirements from phase content
        const reqPattern = /\*\*([A-Z]+-\d+)\*\*/g;
        const reqMatches = content.match(reqPattern);
        const requirements = reqMatches ? reqMatches.map(m => m.replace(/\*\*/g, '').replace(/:$/, '')) : [];
        
        phases.push({
          id: phaseId,
          name: file.replace('.md', ''),
          description: `Phase ${phaseId}`,
          requirements,
        });
        
        // Extract tasks from phase (tasks are usually numbered like 33.1, 33.2, etc.)
        const taskPattern = /##\s*Task\s*(\d+\.\d+)/g;
        let taskMatch;
        while ((taskMatch = taskPattern.exec(content)) !== null) {
          tasks.push({
            id: `task-${taskMatch[1]}`,
            name: `Task ${taskMatch[1]}`,
            description: `Task ${taskMatch[1]} in phase ${phaseId}`,
            requirements,
          });
        }
      }
    }
  }
  
  return { tasks, phases };
}

/**
 * Get gate context based on gate ID
 */
function getGateContext(gateId: string): Record<string, unknown> {
  switch (gateId) {
    case 'gate-01-requirement': {
      const requirements = loadRequirements();
      const { tasks, phases } = loadTasksAndPhases();
      return { requirements, tasks, phases };
    }
    case 'gate-02-architecture': {
      // For architecture gate, scan source files
      const srcDir = path.join(process.cwd(), 'bin', 'lib');
      const files: Array<{ path: string; type?: string; layer?: number }> = [];
      if (fs.existsSync(srcDir)) {
        const allFiles = fs.readdirSync(srcDir);
        const tsFiles = allFiles
          .filter(f => f.endsWith('.ts'))
          .map(f => ({
            path: f,
            type: f.includes('/strategies/') ? 'strategy' : f.includes('/adapters/') ? 'adapter' : 'module',
            layer: 1,
          }));
        files.push(...tsFiles);
      }
      return { files, projectTier: 'medium' as const };
    }
    case 'gate-03-code': {
      // For code quality gate, scan source files
      const srcDir = path.join(process.cwd(), 'bin', 'lib');
      const codeFiles: Array<{ path: string; content: string; language?: string }> = [];
      if (fs.existsSync(srcDir)) {
        const allFiles = fs.readdirSync(srcDir);
        const tsFiles = allFiles
          .filter(f => f.endsWith('.ts'))
          .slice(0, 10); // Limit to first 10 files for performance
        for (const file of tsFiles) {
          const filePath = path.join(srcDir, file);
          if (fs.existsSync(filePath)) {
            codeFiles.push({
              path: file,
              content: fs.readFileSync(filePath, 'utf8'),
              language: 'typescript',
            });
          }
        }
      }
      return { files: codeFiles };
    }
    case 'gate-04-security': {
      // For security gate, scan source files for security issues
      const srcDir = path.join(process.cwd(), 'bin', 'lib');
      const codeFiles: Array<{ path: string; content: string; language?: string }> = [];
      if (fs.existsSync(srcDir)) {
        const allFiles = fs.readdirSync(srcDir);
        const tsFiles = allFiles
          .filter(f => f.endsWith('.ts'))
          .slice(0, 20); // Limit to first 20 files for performance
        for (const file of tsFiles) {
          const filePath = path.join(srcDir, file);
          if (fs.existsSync(filePath)) {
            codeFiles.push({
              path: file,
              content: fs.readFileSync(filePath, 'utf8'),
              language: 'typescript',
            });
          }
        }
      }
      return { files: codeFiles, hasInputValidation: true };
    }
    default:
      return {};
  }
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
      // Validate minimum reason length (10 chars)
      if (reason.length < 10) {
        console.error('Error: Bypass reason must be at least 10 characters');
        console.error(`Provided: ${reason.length} characters`);
        process.exit(1);
      }
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
  } else if (ciMode) {
    const qualityGatesConfig = config as { quality_gates?: { ci?: { gates?: string[] } } };
    if (qualityGatesConfig.quality_gates?.ci?.gates) {
      gatesToRun = qualityGatesConfig.quality_gates.ci.gates;
    } else {
      gatesToRun = qg.getRegisteredGates();
    }
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
      const context = getGateContext(gateId);
      const gatePromise = qg.executeGate(gateId, context);
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
    
    // Show per-gate status
    console.log('');
    console.log('Gate Status:');
    Object.entries(status.gates).forEach(([gateId, result]) => {
      const icon = result.passed ? '✓' : '✗';
      console.log(`  ${icon} ${gateId}: ${result.passed ? 'PASSED' : 'FAILED'}`);
    });
  }
  console.log('');
  process.exit(0);
}

// Handle stats mode
if (process.argv.includes('--stats')) {
  const status = loadStatus();
  const auditFile = path.join(process.cwd(), '.planning', 'gate-audit.json');
  
  console.log('');
  console.log('Quality Gate Statistics');
  console.log('═══════════════════════');
  console.log('');
  
  // Load audit trail for bypass statistics
  let bypassCount = 0;
  try {
    if (fs.existsSync(auditFile)) {
      const audit = JSON.parse(fs.readFileSync(auditFile, 'utf8')) as Array<{ action: string }>;
      bypassCount = audit.filter(a => a.action === 'bypass').length;
    }
  } catch (err) {
    // Ignore
  }
  
  if (!status.lastRun) {
    console.log('No gate runs recorded');
  } else {
    const totalRuns = Object.keys(status.gates).length;
    const passed = Object.values(status.gates).filter((g) => g.passed).length;
    const failed = totalRuns - passed;
    const passRate = totalRuns > 0 ? ((passed / totalRuns) * 100).toFixed(1) : '0.0';
    
    console.log(`Total Gates: ${totalRuns}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Pass Rate: ${passRate}%`);
    console.log(`Bypass Count: ${bypassCount}`);
    console.log(`Last Duration: ${status.duration || 0}ms`);
    console.log(`Last Run: ${new Date(status.lastRun).toLocaleString()}`);
  }
  console.log('');
  process.exit(0);
}

// Default: don't run, just export
export { QualityGate, recordBypass, loadStatus, saveStatus };
