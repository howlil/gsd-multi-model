/**
 * EDGE-03: Hidden State Guard
 *
 * Detects state not persisted to .planning/ files.
 * Ensures all state is explicitly persisted for auditability.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────

interface HiddenStateResult {
  hasHiddenState: boolean;
  stateFiles: string[];
  stateReferences: string[];
  missing: string[];
  recommendation: string;
}

interface PersistenceValidationResult extends HiddenStateResult {
  valid: boolean;
}

// ─────────────────────────────────────────────
// Main Functions
// ─────────────────────────────────────────────

/**
 * List all state files in .planning/ directory
 * @param phaseDir - Phase directory
 * @returns Array of state file paths
 */
export function listStateFiles(phaseDir: string): string[] {
  const stateFiles: string[] = [];
  const planningDir = path.join(phaseDir, '.planning');

  if (!fs.existsSync(planningDir)) {
    return stateFiles;
  }

  // Recursively find all .md files in .planning/
  function scanDir(dir: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          stateFiles.push(fullPath);
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  scanDir(planningDir);
  return stateFiles;
}

/**
 * Extract state references from text
 * @param text - Text to analyze
 * @returns Array of state references
 */
export function extractStateReferences(text: string): string[] {
  const statePatterns = [
    /(?:state|status|progress|phase|step|current)[\s:]+([A-Z_]+\d*(?:\.\d+)?)/gi,
    /(?:task|plan|gate|edge)[\s:]+(\d+(?:-\d+)?)/gi,
    /(?:completed|finished|done|pending|blocked)[\s:]+([A-Z_]+)/gi
  ];

  const references = new Set<string>();

  for (const pattern of statePatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      references.add(match[0].toLowerCase());
    }
  }

  return Array.from(references);
}

/**
 * Check for hidden state (state not persisted to files)
 * @param output - AI generated output
 * @param phaseDir - Phase directory
 * @returns Hidden state result
 */
export function checkHiddenState(output: string, phaseDir: string): HiddenStateResult {
  const stateFiles = listStateFiles(phaseDir);
  const stateReferences = extractStateReferences(output);

  // Read all state file contents
  const stateContents = stateFiles.map(file => {
    try {
      return fs.readFileSync(file, 'utf8').toLowerCase();
    } catch {
      return '';
    }
  }).join(' ');

  // Check which state references are not in persisted files
  const missing = stateReferences.filter(ref => {
    // Skip common false positives
    if (['state', 'status', 'phase', 'plan'].includes(ref)) return false;
    return !stateContents.includes(ref);
  });

  return {
    hasHiddenState: missing.length > 0,
    stateFiles,
    stateReferences,
    missing,
    recommendation: missing.length > 0
      ? `Persist the following state to .planning/ files: ${missing.join(', ')}`
      : 'All state appears to be persisted'
  };
}

/**
 * Validate that all state is persisted
 * @param output - AI generated output
 * @param phaseDir - Phase directory
 * @returns Persistence validation result
 */
export function validatePersistence(output: string, phaseDir: string): PersistenceValidationResult {
  const result = checkHiddenState(output, phaseDir);

  return {
    valid: !result.hasHiddenState,
    ...result
  };
}

// ─────────────────────────────────────────────
// CLI Interface
// ─────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'check' && args[1]) {
    const phaseDir = args[1];
    console.log(`Checking for hidden state in ${phaseDir}`);

    const stateFiles = listStateFiles(phaseDir);
    console.log(`Found ${stateFiles.length} state files in .planning/`);

    if (stateFiles.length > 0) {
      console.log('State files:');
      stateFiles.slice(0, 10).forEach(f => console.log(`  - ${path.relative(phaseDir, f)}`));
      if (stateFiles.length > 10) {
        console.log(`  ... and ${stateFiles.length - 10} more`);
      }
    }

    process.exit(0);

  } else if (command === 'validate' && args[1]) {
    const phaseDir = args[1];
    const outputFile = args[2];

    if (!outputFile || !fs.existsSync(outputFile)) {
      console.error('Usage: node hidden-state-guard.ts validate <phaseDir> <outputFile>');
      process.exit(1);
    }

    const output = fs.readFileSync(outputFile, 'utf8');
    const result = validatePersistence(output, phaseDir);

    if (result.valid) {
      console.log('✅ All state is persisted');
      console.log(`   State files: ${result.stateFiles.length}`);
      process.exit(0);
    } else {
      console.log('⚠️  Hidden state detected');
      console.log(`   Missing: ${result.missing.join(', ')}`);
      console.log(`   ${result.recommendation}`);
      process.exit(1);
    }

  } else {
    console.log('Usage: node hidden-state-guard.ts <command> [args]');
    console.log('Commands:');
    console.log('  check <phaseDir>            - List state files');
    console.log('  validate <phaseDir> <file>  - Validate output persistence');
    process.exit(1);
  }
}
