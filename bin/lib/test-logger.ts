#!/usr/bin/env node

/**
 * Test script for EZ Logger
 * Run: node --loader ts-node/esm bin/lib/test-logger.ts
 */

import Logger from './logger.js';

console.log('='.repeat(50));
console.log('Testing EZ Logger...');
console.log('='.repeat(50));

const logger = new Logger();

console.log('\nRunning test logs (console only)...\n');

// Test all log levels
logger.debug('Debug message', { test: 'debug', timestamp: Date.now() });
console.log('✓ Debug logged');

logger.info('Info message', { test: 'info', component: 'test-logger' });
console.log('✓ Info logged');

logger.warn('Warning message', { test: 'warn', action: 'testing' });
console.log('✓ Warning logged');

logger.error('Error message', { test: 'error', code: 'TEST_ERROR' });
console.log('✓ Error logged (check console output above)');

console.log('\n' + '='.repeat(50));
console.log('Logger test PASSED ✓');
console.log('='.repeat(50));
