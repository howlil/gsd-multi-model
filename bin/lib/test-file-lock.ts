#!/usr/bin/env node

/**
 * Test script for EZ File Lock
 * Run: node --loader ts-node/esm bin/lib/test-file-lock.ts
 */

import { withLock, isLocked, ifUnlocked } from './file-lock.js';
import fs from 'fs';
import path from 'path';

const testFile = path.join(__dirname, 'test-lock-target.txt');

async function testBasicLock(): Promise<void> {
  console.log('\n=== Test 1: Basic Lock ===');

  await withLock(testFile, async () => {
    console.log('Lock acquired, writing to file...');
    fs.writeFileSync(testFile, 'Test content', 'utf-8');
    console.log('File written');
  });

  console.log('Lock released');
  console.log('File content:', fs.readFileSync(testFile, 'utf-8'));
  console.log('✓ Basic lock test passed');
}

async function testIsLocked(): Promise<void> {
  console.log('\n=== Test 2: Check Lock Status ===');

  const beforeLock = await isLocked(testFile);
  console.log('Locked before:', beforeLock);

  const lockPromise = withLock(testFile, async () => {
    console.log('Lock held for 1 second...');
    await new Promise(r => setTimeout(r, 1000));
  });

  // Wait for lock to be acquired
  await new Promise(r => setTimeout(r, 100));

  const duringLock = await isLocked(testFile);
  console.log('Locked during:', duringLock);

  await lockPromise;

  await new Promise(r => setTimeout(r, 100));
  const afterLock = await isLocked(testFile);
  console.log('Locked after:', afterLock);

  if (!beforeLock && duringLock && !afterLock) {
    console.log('✓ Lock status test passed');
  } else {
    console.log('✗ Lock status test failed');
  }
}

async function testIfUnlocked(): Promise<void> {
  console.log('\n=== Test 3: If Unlocked Pattern ===');

  // First call should succeed (file not locked)
  const result1 = await ifUnlocked(testFile, async () => {
    console.log('File was unlocked, writing...');
    fs.writeFileSync(testFile, 'Written by ifUnlocked', 'utf-8');
    return 'success';
  }, 'fallback');

  console.log('Result 1:', result1);

  // Lock the file and try again
  const lockPromise = withLock(testFile, async () => {
    await new Promise(r => setTimeout(r, 500));
  });

  await new Promise(r => setTimeout(r, 50));

  const result2 = await ifUnlocked(testFile, async () => {
    return 'should-not-reach';
  }, 'fallback-value');

  console.log('Result 2 (while locked):', result2);

  await lockPromise;

  if (result1 === 'success' && result2 === 'fallback-value') {
    console.log('✓ IfUnlocked test passed');
  } else {
    console.log('✗ IfUnlocked test failed');
  }
}

async function runTests(): Promise<void> {
  try {
    await testBasicLock();
    await testIsLocked();
    await testIfUnlocked();

    console.log('\n' + '='.repeat(50));
    console.log('File Lock test COMPLETE ✓');
    console.log('='.repeat(50));
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    // Cleanup
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  }
}

runTests();
