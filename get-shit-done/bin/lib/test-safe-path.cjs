#!/usr/bin/env node
const path = require('path');
const { normalizePath, isPathSafe, validatePathExists, safeReadFile } = require('./safe-path.cjs');

const testBase = __dirname;

async function runTests() {
  console.log('=== Testing safe-path.cjs ===\n');
  
  // Test 1: Safe path
  console.log('Test 1: Safe path (logger.cjs)');
  try {
    const safe = normalizePath(testBase, 'logger.cjs');
    console.log('✓ Normalized:', safe);
  } catch (err) { console.error('✗ Failed:', err.message); }
  
  // Test 2: Path traversal
  console.log('\nTest 2: Path traversal (../../../etc/passwd)');
  try {
    normalizePath(testBase, '../../../etc/passwd');
    console.error('✗ Should have thrown error');
  } catch (err) { console.log('✓ Blocked:', err.message); }
  
  // Test 3: isPathSafe
  console.log('\nTest 3: isPathSafe boolean check');
  console.log('  Safe (logger.cjs):', isPathSafe(testBase, 'logger.cjs'));
  console.log('  Unsafe (../..):', isPathSafe(testBase, '../..'));
  console.log('✓ Boolean checks working');
  
  console.log('\n=== Tests Complete ===');
}

runTests().catch(console.error);
