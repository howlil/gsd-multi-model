#!/usr/bin/env node

/**
 * Test script for EZ Temp File Handler
 * Run: node ez-agents/bin/lib/test-temp-file.js
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

import {
  createTempDir,
  createTempFile,
  writeToTemp,
  readFromTemp,
  cleanupTemp,
  cleanupAll,
  getTrackedTemps,
  isPathSafe
} from './temp-file.js';

/**
 * Test 1: Create temp directory
 */
async function testCreateTempDir(): Promise<string> {
  console.log('\n=== Test 1: Create Temp Directory ===');

  const tempDir = await createTempDir('ez-test-');
  console.log('Created temp dir:', tempDir);

  const exists = fs.existsSync(tempDir);
  console.log('Directory exists:', exists);

  if (!exists) throw new Error('Temp dir was not created');
  console.log('✓ Temp directory created successfully');

  return tempDir;
}

/**
 * Test 2: Create temp file
 */
async function testCreateTempFile(tempDir: string): Promise<string> {
  console.log('\n=== Test 2: Create Temp File ===');

  const tempFile = await createTempFile('test-', tempDir, 'Initial content');
  console.log('Created temp file:', tempFile);

  const content = await readFromTemp(tempFile, { validateBase: tempDir });
  console.log('File content:', content);

  if (content !== 'Initial content') {
    throw new Error('File content mismatch');
  }
  console.log('✓ Temp file created and read successfully');

  return tempFile;
}

/**
 * Test 3: Write to temp file
 */
async function testWriteToTemp(tempFile: string, tempDir: string): Promise<void> {
  console.log('\n=== Test 3: Write to Temp File ===');

  await writeToTemp(tempFile, 'Updated content', { validateBase: tempDir });
  const content = await readFromTemp(tempFile, { validateBase: tempDir });

  console.log('Updated content:', content);

  if (content !== 'Updated content') {
    throw new Error('Write failed');
  }
  console.log('✓ Temp file write successful');
}

/**
 * Test 4: Path safety validation
 */
async function testPathSafety(): Promise<void> {
  console.log('\n=== Test 4: Path Safety Validation ===');

  const baseDir = os.tmpdir();

  // Safe paths
  console.log('Safe path (same dir):', isPathSafe(baseDir, path.join(baseDir, 'file.txt')));
  console.log('Safe path (subdir):', isPathSafe(baseDir, path.join(baseDir, 'sub', 'file.txt')));

  // Unsafe paths (should be false)
  const unsafePath = path.resolve(baseDir, '..', '..', 'etc', 'passwd');
  console.log('Unsafe path (/etc/passwd):', isPathSafe(baseDir, unsafePath));

  console.log('✓ Path safety validation working');
}

/**
 * Test 5: Cleanup
 */
async function testCleanup(tempFile: string, tempDir: string): Promise<void> {
  console.log('\n=== Test 5: Cleanup ===');

  console.log('Tracked temps before cleanup:', getTrackedTemps().length);

  await cleanupTemp(tempFile);
  console.log('Cleaned up temp file');

  const fileExists = fs.existsSync(tempFile);
  console.log('Temp file exists after cleanup:', fileExists);

  await cleanupAll();
  console.log('Cleaned up all temps');

  const dirExists = fs.existsSync(tempDir);
  console.log('Temp dir exists after cleanup:', dirExists);

  console.log('✓ Cleanup successful');
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  try {
    const tempDir = await testCreateTempDir();
    const tempFile = await testCreateTempFile(tempDir);
    await testWriteToTemp(tempFile, tempDir);
    await testPathSafety();
    await testCleanup(tempFile, tempDir);

    console.log('\n' + '='.repeat(50));
    console.log('Temp File Handler test COMPLETE ✓');
    console.log('='.repeat(50));
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

// Run tests
runTests().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
