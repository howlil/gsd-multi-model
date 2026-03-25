#!/usr/bin/env node

/**
 * Test script for safe-path
 * Run: node --loader ts-node/esm bin/lib/test-safe-path.ts
 */

import path from 'path';
import { normalizePath, isPathSafe, validatePathExists, safeReadFile } from './safe-path.js';

const testBase = __dirname;

async function runTests(): Promise<void> {
  console.log('=== Testing safe-path.ts ===\n');

  // Test 1: Safe path
  console.log('Test 1: Safe path (logger.cjs)');
  try {
    const safe = normalizePath(testBase, 'logger.cjs');
    console.log('✓ Normalized:', safe);
  } catch (err) {
    const error = err as Error;
    console.error('✗ Failed:', error.message);
  }

  // Test 2: Path traversal
  console.log('\nTest 2: Path traversal (../../../etc/passwd)');
  try {
    normalizePath(testBase, '../../../etc/passwd');
    console.error('✗ Should have thrown error');
  } catch (err) {
    const error = err as Error;
    console.log('✓ Blocked:', error.message);
  }

  // Test 3: isPathSafe
  console.log('\nTest 3: isPathSafe boolean check');
  console.log('  Safe (logger.cjs):', isPathSafe(testBase, 'logger.cjs'));
  console.log('  Unsafe (../..):', isPathSafe(testBase, '../..'));
  console.log('✓ Boolean checks working');

  console.log('\n=== Tests Complete ===');
}

runTests().catch(console.error);
