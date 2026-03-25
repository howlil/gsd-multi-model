#!/usr/bin/env node

/**
 * Test script for EZ Health Check and Timeout Exec
 * Run: node --loader ts-node/esm bin/lib/test-graceful.ts
 */

import { HealthCheck } from './health-check.js';
import { execWithTimeout } from './timeout-exec.js';
import fs from 'fs';
import path from 'path';

console.log('='.repeat(50));
console.log('Testing EZ Graceful Degradation...');
console.log('='.repeat(50));

// Test 1: Health Check
console.log('\n--- Test 1: Health Check ---\n');

const health = new HealthCheck();
const result = health.runAll();

console.log('Health Status:', result.status.toUpperCase());
console.log('Node Version:', result.node_version);
console.log('Timestamp:', result.timestamp);

if (result.warnings.length > 0) {
  console.log('\nWarnings:');
  result.warnings.forEach(w => console.log(`  ⚠ ${w}`));
}

if (result.issues.length > 0) {
  console.log('\nIssues:');
  result.issues.forEach(i => console.log(`  ✗ ${i}`));
}

console.log('\nChecks:');
Object.entries(result.checks).forEach(([key, value]) => {
  const icon = value ? '✓' : '✗';
  console.log(`  ${icon} ${key}: ${value ? 'pass' : 'fail'}`);
});

// Test 2: Timeout Exec - Success case
console.log('\n--- Test 2: Timeout Exec (Success) ---\n');

(async () => {
  try {
    const output = await execWithTimeout('node', ['--version']);
    console.log('Node version command:', output);
    console.log('✓ Command executed successfully');
  } catch (err) {
    const error = err as Error;
    console.error('✗ Command failed:', error.message);
  }

  // Test 3: Timeout Exec - With fallback
  console.log('\n--- Test 3: Timeout Exec (With Fallback) ---\n');

  try {
    // This should fail (nonexistent command) but return fallback
    const output = await execWithTimeout('nonexistent-command', [], {
      fallback: 'fallback-value'
    });
    console.log('Result with fallback:', output);
    console.log('✓ Fallback returned successfully');
  } catch (err) {
    const error = err as Error;
    console.error('✗ Command failed without fallback:', error.message);
  }

  // Test 4: Timeout Exec - Timeout scenario
  console.log('\n--- Test 4: Timeout Exec (Timeout Test) ---\n');

  try {
    // Create a script that takes too long
    const tempScript = path.join(__dirname, 'temp-sleep.js');
    fs.writeFileSync(tempScript, 'setTimeout(() => console.log("done"), 3000);');

    const output = await execWithTimeout('node', [tempScript], {
      timeout: 1000,
      fallback: 'timed-out-fallback'
    });
    console.log('Result after timeout:', output);
    console.log('✓ Timeout handled with fallback');

    // Cleanup
    fs.unlinkSync(tempScript);
  } catch (err) {
    const error = err as Error;
    console.error('Timeout test error:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('Graceful Degradation test COMPLETE ✓');
  console.log('='.repeat(50));
})();
