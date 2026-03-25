#!/usr/bin/env node

/**
 * Test script for safe-exec
 * Run: node --loader ts-node/esm bin/lib/test-safe-exec.ts
 */

import { safeExec, safeExecJSON, ALLOWED_COMMANDS } from './safe-exec.js';

async function runTests(): Promise<void> {
  console.log('=== Testing safe-exec.ts ===\n');

  // Test 1: Allowed command
  console.log('Test 1: Allowed command (node --version)');
  try {
    const version = await safeExec('node', ['--version']);
    console.log('✓ Result:', version);
  } catch (err) {
    const error = err as Error;
    console.error('✗ Failed:', error.message);
  }

  // Test 2: Disallowed command
  console.log('\nTest 2: Disallowed command (rm -rf /)');
  try {
    await safeExec('rm', ['-rf', '/']);
    console.error('✗ Should have thrown error');
  } catch (err) {
    const error = err as Error;
    console.log('✓ Blocked:', error.message);
  }

  // Test 3: Dangerous argument
  console.log('\nTest 3: Dangerous argument (injection attempt)');
  try {
    await safeExec('echo', ['hello; rm -rf /']);
    console.error('✗ Should have thrown error');
  } catch (err) {
    const error = err as Error;
    console.log('✓ Blocked:', error.message);
  }

  // Test 4: Git command
  console.log('\nTest 4: Git command (git --version)');
  try {
    const gitVersion = await safeExec('git', ['--version']);
    console.log('✓ Result:', gitVersion);
  } catch (err) {
    const error = err as Error;
    console.error('✗ Failed:', error.message);
  }

  console.log('\n=== Tests Complete ===');
}

runTests().catch(console.error);
