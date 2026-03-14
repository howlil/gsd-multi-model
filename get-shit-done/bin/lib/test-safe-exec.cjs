#!/usr/bin/env node
const { safeExec, safeExecJSON, ALLOWED_COMMANDS } = require('./safe-exec.cjs');

async function runTests() {
  console.log('=== Testing safe-exec.cjs ===\n');
  
  // Test 1: Allowed command
  console.log('Test 1: Allowed command (node --version)');
  try {
    const version = await safeExec('node', ['--version']);
    console.log('✓ Result:', version);
  } catch (err) { console.error('✗ Failed:', err.message); }
  
  // Test 2: Disallowed command
  console.log('\nTest 2: Disallowed command (rm -rf /)');
  try {
    await safeExec('rm', ['-rf', '/']);
    console.error('✗ Should have thrown error');
  } catch (err) { console.log('✓ Blocked:', err.message); }
  
  // Test 3: Dangerous argument
  console.log('\nTest 3: Dangerous argument (injection attempt)');
  try {
    await safeExec('echo', ['hello; rm -rf /']);
    console.error('✗ Should have thrown error');
  } catch (err) { console.log('✓ Blocked:', err.message); }
  
  // Test 4: Git command
  console.log('\nTest 4: Git command (git --version)');
  try {
    const gitVersion = await safeExec('git', ['--version']);
    console.log('✓ Result:', gitVersion);
  } catch (err) { console.error('✗ Failed:', err.message); }
  
  console.log('\n=== Tests Complete ===');
}

runTests().catch(console.error);
