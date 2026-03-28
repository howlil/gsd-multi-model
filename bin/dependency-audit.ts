#!/usr/bin/env node

/**
 * Dependency Audit CLI
 *
 * Usage:
 *   node bin/dependency-audit.ts [options]
 *
 * Options:
 *   --report, -r <path>  Save report to file
 *   --json, -j           Output as JSON
 *   --quiet, -q          Only show issues
 *   --help, -h           Show help
 */

import { DependencyAudit } from './lib/dependency-audit.js';

// Parse arguments
const args = process.argv.slice(2);
const options = {
  report: null as string | null,
  json: false,
  quiet: false,
  help: false
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--report' || arg === '-r') {
    options.report = args[++i] || 'dependency-audit-report.md';
  } else if (arg === '--json' || arg === '-j') {
    options.json = true;
  } else if (arg === '--quiet' || arg === '-q') {
    options.quiet = true;
  } else if (arg === '--help' || arg === '-h') {
    options.help = true;
  }
}

if (options.help) {
  console.log(`
Dependency Audit CLI

Usage: node bin/dependency-audit.ts [options]

Options:
  --report, -r <path>  Save report to file (default: dependency-audit-report.md)
  --json, -j           Output as JSON
  --quiet, -q          Only show issues
  --help, -h           Show this help message

Examples:
  node bin/dependency-audit.ts
  node bin/dependency-audit.ts --json
  node bin/dependency-audit.ts --report audit.md
`);
  process.exit(0);
}

async function main() {
  const audit = new DependencyAudit();

  try {
    const result = await audit.audit();

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (options.quiet) {
      // Only show issues
      if (result.issues.length === 0) {
        console.log('No issues found.');
      } else {
        console.log('Issues found:\n');
        for (const issue of result.issues) {
          console.log(`[${issue.severity.toUpperCase()}] ${issue.message}`);
          if (issue.recommendation) {
            console.log(`  → ${issue.recommendation}`);
          }
        }
      }
    } else {
      // Full report
      console.log('\n=== Dependency Audit Report ===\n');
      console.log(`Total Dependencies: ${result.total}`);
      console.log(`  Production: ${result.production}`);
      console.log(`  Development: ${result.development}`);
      console.log(`  Optional: ${result.optional}`);
      console.log('');
      console.log(`Vulnerabilities: ${result.vulnerabilities.total}`);
      if (result.vulnerabilities.critical > 0) {
        console.log(`  Critical: ${result.vulnerabilities.critical}`);
      }
      if (result.vulnerabilities.high > 0) {
        console.log(`  High: ${result.vulnerabilities.high}`);
      }
      if (result.vulnerabilities.moderate > 0) {
        console.log(`  Moderate: ${result.vulnerabilities.moderate}`);
      }
      if (result.vulnerabilities.low > 0) {
        console.log(`  Low: ${result.vulnerabilities.low}`);
      }
      console.log('');
      console.log(`Issues: ${result.issues.length}`);

      if (result.issues.length > 0) {
        console.log('\n--- Issues ---\n');
        for (const issue of result.issues) {
          console.log(`[${issue.severity.toUpperCase()}] ${issue.message}`);
          if (issue.packages) {
            console.log(`  Packages: ${issue.packages}`);
          }
          if (issue.recommendation) {
            console.log(`  → ${issue.recommendation}`);
          }
          console.log('');
        }
      }

      if (result.sizes.topPackages.length > 0) {
        console.log('\n--- Largest Packages ---\n');
        for (const pkg of result.sizes.topPackages.slice(0, 5)) {
          console.log(`${pkg.name}: ${pkg.sizeFormatted} (${pkg.percentage}%)`);
        }
      }

      console.log('\n--- License Summary ---\n');
      for (const [license, packages] of Object.entries(result.licenses.byLicense).slice(0, 10)) {
        console.log(`${license}: ${packages.length} packages`);
      }

      if (result.licenses.unknown.length > 0) {
        console.log(`\nUnknown licenses: ${result.licenses.unknown.length}`);
      }
      if (result.licenses.restrictive.length > 0) {
        console.log(`Restrictive licenses: ${result.licenses.restrictive.length}`);
      }
    }

    // Save report if requested
    if (options.report) {
      audit.saveReport(result, options.report);
      console.log(`\nReport saved to: ${options.report}`);
    }

    // Exit with error if critical issues found
    const hasCriticalIssues = result.issues.some(i => i.severity === 'critical');
    const hasHighVulnerabilities = result.vulnerabilities.high > 0 || result.vulnerabilities.critical > 0;

    if (hasCriticalIssues || hasHighVulnerabilities) {
      process.exit(1);
    }

  } catch (error: any) {
    console.error('Audit failed:', error.message);
    process.exit(1);
  }
}

main();
