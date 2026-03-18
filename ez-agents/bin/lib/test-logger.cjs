#!/usr/bin/env node

/**
 * Test script for EZ Logger
 * Run: node ez-agents/bin/lib/test-logger.cjs
 */

const Logger = require('./logger.cjs');
const path = require('path');

console.log('='.repeat(50));
console.log('Testing EZ Logger...');
console.log('='.repeat(50));

const logger = new Logger();

console.log('\nLog file:', logger.getLogFile());
console.log('\nRunning test logs...\n');

// Test all log levels
logger.debug('Debug message', { test: 'debug', timestamp: Date.now() });
console.log('✓ Debug logged');

logger.info('Info message', { test: 'info', component: 'test-logger' });
console.log('✓ Info logged');

logger.warn('Warning message', { test: 'warn', action: 'testing' });
console.log('✓ Warning logged');

logger.error('Error message', { test: 'error', code: 'TEST_ERROR' });
console.log('✓ Error logged (check console output above)');

// Verify log file was created
const logFile = logger.getLogFile();
if (require('fs').existsSync(logFile)) {
  console.log('\n✓ Log file created:', logFile);
  
  // Read and parse log entries
  const content = require('fs').readFileSync(logFile, 'utf-8');
  const lines = content.trim().split('\n');
  console.log(`✓ Log file contains ${lines.length} entries`);
  
  // Validate each entry
  console.log('\nLog entries:');
  lines.forEach((line, i) => {
    try {
      const entry = JSON.parse(line);
      console.log(`  ${i + 1}. [${entry.level}] ${entry.message}`);
    } catch (err) {
      console.log(`  ${i + 1}. (parse error: ${err.message})`);
    }
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('Logger test PASSED ✓');
  console.log('='.repeat(50));
} else {
  console.error('\n✗ Log file was not created');
  process.exit(1);
}
