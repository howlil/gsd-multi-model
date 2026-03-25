/**
 * Quality Gate Tests
 *
 * Tests for the Quality Gate Coordinator (Phase 34-02)
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { createTempDir, cleanupTempDir } from './test-utils.js';

import { QualityGate, z } from '../ez-agents/bin/lib/quality-gate.js';

// Audit file path for testing
const AUDIT_FILE_PATH = path.join(process.cwd(), '.planning', 'gate-audit.json');

describe('QualityGate', () => {
  let gates;
  let originalCwd;
  let tempDir;

  beforeEach(() => {
    gates = new QualityGate();
    originalCwd = process.cwd();
    tempDir = createTempDir();
    // Change cwd to temp dir so audit file is written there
    process.chdir(tempDir);
    // Ensure .planning directory exists
    fs.mkdirSync(path.join(tempDir, '.planning'), { recursive: true });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    cleanupTempDir(tempDir);
  });

  // Test 1: registerGate stores gate with id, schema, executor
  test('registerGate stores gate with id, schema, executor', () => {
    const schema = z.object({
      name: z.string(),
    });
    const executor = async (ctx) => ({ passed: true, errors: [], warnings: [] });

    gates.registerGate('test-gate', schema, executor);

    assert.ok(gates.isRegistered('test-gate'), 'Gate should be registered');
    const status = gates.getGateStatus('test-gate');
    assert.strictEqual(status.state, 'registered', 'State should be registered');
    assert.ok(status.registeredAt instanceof Date, 'Should have registeredAt timestamp');
  });

  // Test 2: executeGate validates context against schema
  test('executeGate validates context against schema', async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().min(0),
    });
    const executor = async (ctx) => ({ passed: true, errors: [], warnings: [] });

    gates.registerGate('validation-gate', schema, executor);

    // Invalid context (missing required field)
    const result = await gates.executeGate('validation-gate', { name: 'John' });

    assert.strictEqual(result.passed, false, 'Should fail validation');
    assert.ok(result.errors.length > 0, 'Should have validation errors');
    assert.ok(
      result.errors.some(e => e.path === 'age'),
      'Should have error for missing age field'
    );
  });

  // Test 3: executeGate runs executor on valid context
  test('executeGate runs executor on valid context', async () => {
    let executorCalled = false;
    let receivedContext = null;

    const schema = z.object({
      value: z.string(),
    });
    const executor = async (ctx) => {
      executorCalled = true;
      receivedContext = ctx;
      return { passed: true, errors: [], warnings: [] };
    };

    gates.registerGate('executor-gate', schema, executor);

    const testContext = { value: 'test123' };
    await gates.executeGate('executor-gate', testContext);

    assert.ok(executorCalled, 'Executor should be called');
    assert.deepStrictEqual(receivedContext, testContext, 'Executor should receive validated context');
  });

  // Test 4: executeGate returns { passed: true } on success
  test('executeGate returns { passed: true } on success', async () => {
    const schema = z.object({
      data: z.string(),
    });
    const executor = async (ctx) => ({
      passed: true,
      errors: [],
      warnings: ['Minor warning'],
    });

    gates.registerGate('success-gate', schema, executor);

    const result = await gates.executeGate('success-gate', { data: 'valid' });

    assert.strictEqual(result.passed, true, 'Should pass');
    assert.deepStrictEqual(result.errors, [], 'Should have no errors');
    assert.deepStrictEqual(result.warnings, ['Minor warning'], 'Should include warnings');

    const status = gates.getGateStatus('success-gate');
    assert.strictEqual(status.state, 'passed', 'Status should be passed');
    assert.ok(status.executedAt instanceof Date, 'Should have executedAt timestamp');
  });

  // Test 5: executeGate returns { passed: false, errors } on failure
  test('executeGate returns { passed: false, errors } on failure', async () => {
    const schema = z.object({
      items: z.array(z.string()),
    });
    const executor = async (ctx) => ({
      passed: false,
      errors: [{ path: 'items', message: 'Items array cannot be empty' }],
      warnings: [],
    });

    gates.registerGate('failure-gate', schema, executor);

    const result = await gates.executeGate('failure-gate', { items: [] });

    assert.strictEqual(result.passed, false, 'Should fail');
    assert.ok(result.errors.length > 0, 'Should have errors');
    assert.strictEqual(result.errors[0].path, 'items', 'Error should have correct path');
    assert.strictEqual(result.errors[0].message, 'Items array cannot be empty', 'Error should have correct message');

    const status = gates.getGateStatus('failure-gate');
    assert.strictEqual(status.state, 'failed', 'Status should be failed');
  });

  // Test 6: executeGate throws on unregistered gate id
  test('executeGate throws on unregistered gate id', async () => {
    await assert.rejects(
      async () => gates.executeGate('nonexistent-gate', {}),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('Gate not registered'), 'Error should mention gate not registered');
        assert.ok(err.message.includes('nonexistent-gate'), 'Error should include gate ID');
        return true;
      }
    );
  });

  // Test 7: bypassGate requires non-empty reason
  test('bypassGate requires non-empty reason', () => {
    const schema = z.object({});
    const executor = async () => ({ passed: true, errors: [], warnings: [] });

    gates.registerGate('bypass-test-gate', schema, executor);

    // Empty string should throw
    assert.throws(
      () => gates.bypassGate('bypass-test-gate', ''),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('non-empty'), 'Error should mention non-empty');
        return true;
      }
    );

    // Whitespace-only should throw
    assert.throws(
      () => gates.bypassGate('bypass-test-gate', '   '),
      (err) => {
        assert.ok(err instanceof Error);
        return true;
      }
    );

    // Undefined should throw
    assert.throws(
      () => gates.bypassGate('bypass-test-gate', undefined),
      (err) => {
        assert.ok(err instanceof Error);
        return true;
      }
    );
  });

  // Test 8: bypassGate logs to audit trail with timestamp
  test('bypassGate logs to audit trail with timestamp', () => {
    const schema = z.object({});
    const executor = async () => ({ passed: true, errors: [], warnings: [] });

    gates.registerGate('audit-test-gate', schema, executor);

    const bypassReason = 'MVP tier - deferred to Phase 40';
    const beforeBypass = Date.now();
    gates.bypassGate('audit-test-gate', bypassReason);
    const afterBypass = Date.now();

    // Check status
    const status = gates.getGateStatus('audit-test-gate');
    assert.strictEqual(status.state, 'bypassed', 'Status should be bypassed');
    assert.strictEqual(status.bypassReason, bypassReason, 'Should store bypass reason');
    assert.ok(status.bypassedAt instanceof Date, 'Should have bypassedAt timestamp');

    // Verify timestamp is reasonable
    const bypassedAtTime = status.bypassedAt.getTime();
    assert.ok(bypassedAtTime >= beforeBypass, 'Timestamp should be after bypass call started');
    assert.ok(bypassedAtTime <= afterBypass, 'Timestamp should be before bypass call ended');

    // Check audit trail
    const auditTrail = gates.getAuditTrail();
    assert.ok(auditTrail.length > 0, 'Audit trail should have entries');

    const lastEntry = auditTrail[auditTrail.length - 1];
    assert.strictEqual(lastEntry.gateId, 'audit-test-gate', 'Should have correct gate ID');
    assert.strictEqual(lastEntry.action, 'bypass', 'Action should be bypass');
    assert.strictEqual(lastEntry.reason, bypassReason, 'Should have correct reason');
    assert.ok(lastEntry.timestamp, 'Should have timestamp');

    // Verify timestamp format (ISO 8601)
    const timestampDate = new Date(lastEntry.timestamp);
    assert.ok(!isNaN(timestampDate.getTime()), 'Timestamp should be valid ISO date');

    // Verify audit file was written
    const auditFilePath = path.join(tempDir, '.planning', 'gate-audit.json');
    assert.ok(fs.existsSync(auditFilePath), 'Audit file should exist');

    const fileContent = JSON.parse(fs.readFileSync(auditFilePath, 'utf-8'));
    assert.ok(fileContent.length > 0, 'Audit file should have entries');
    assert.strictEqual(fileContent[0].gateId, 'audit-test-gate', 'File should have correct gate ID');
  });

  // Test 9: getGateStatus returns correct state for registered/passed/bypassed gates
  test('getGateStatus returns correct state for registered/passed/bypassed gates', async () => {
    const schema = z.object({ value: z.string() });
    const executor = async (ctx) => ({ passed: true, errors: [], warnings: [] });

    // Test registered state
    gates.registerGate('status-registered', schema, executor);
    let status = gates.getGateStatus('status-registered');
    assert.strictEqual(status.state, 'registered', 'Initial state should be registered');
    assert.strictEqual(status.id, 'status-registered', 'Should have correct ID');
    assert.ok(status.registeredAt instanceof Date, 'Should have registeredAt');

    // Test passed state
    gates.registerGate('status-passed', schema, executor);
    await gates.executeGate('status-passed', { value: 'test' });
    status = gates.getGateStatus('status-passed');
    assert.strictEqual(status.state, 'passed', 'State should be passed after successful execution');
    assert.ok(status.executedAt instanceof Date, 'Should have executedAt');

    // Test bypassed state
    gates.registerGate('status-bypassed', schema, executor);
    gates.bypassGate('status-bypassed', 'Testing bypass state');
    status = gates.getGateStatus('status-bypassed');
    assert.strictEqual(status.state, 'bypassed', 'State should be bypassed');
    assert.ok(status.bypassedAt instanceof Date, 'Should have bypassedAt');
    assert.strictEqual(status.bypassReason, 'Testing bypass state', 'Should have bypass reason');
  });

  // Test 10: Schema validation errors include field path
  test('Schema validation errors include field path', async () => {
    const schema = z.object({
      user: z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email format'),
        age: z.number().min(18, 'Must be at least 18'),
      }),
      settings: z.object({
        theme: z.enum(['light', 'dark']).optional(),
      }).optional(),
    });
    const executor = async (ctx) => ({ passed: true, errors: [], warnings: [] });

    gates.registerGate('nested-schema-gate', schema, executor);

    // Invalid context with multiple errors
    const result = await gates.executeGate('nested-schema-gate', {
      user: {
        name: '', // Empty string (fails min(1))
        email: 'not-an-email',
        age: 15, // Under 18
      },
    });

    assert.strictEqual(result.passed, false, 'Should fail validation');
    assert.ok(result.errors.length >= 3, 'Should have at least 3 errors');

    // Check that errors include field paths
    const errorPaths = result.errors.map(e => e.path);
    assert.ok(
      errorPaths.some(p => p.includes('user.name') || p === 'user.name'),
      'Should have error with user.name path'
    );
    assert.ok(
      errorPaths.some(p => p.includes('user.email') || p === 'user.email'),
      'Should have error with user.email path'
    );
    assert.ok(
      errorPaths.some(p => p.includes('user.age') || p === 'user.age'),
      'Should have error with user.age path'
    );

    // Check that errors include messages
    const errorMessages = result.errors.map(e => e.message);
    assert.ok(
      errorMessages.some(m => m.toLowerCase().includes('required') || m.toLowerCase().includes('min')),
      'Should have error message about name requirement'
    );
    assert.ok(
      errorMessages.some(m => m.toLowerCase().includes('email')),
      'Should have error message about email format'
    );
  });
});

describe('QualityGate edge cases', () => {
  let gates;
  let originalCwd;
  let tempDir;

  beforeEach(() => {
    gates = new QualityGate();
    originalCwd = process.cwd();
    tempDir = createTempDir();
    process.chdir(tempDir);
    fs.mkdirSync(path.join(tempDir, '.planning'), { recursive: true });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    cleanupTempDir(tempDir);
  });

  test('registerGate throws on invalid parameters', () => {
    // Missing ID
    assert.throws(
      () => gates.registerGate('', z.object({}), async () => ({})),
      (err) => err.message.includes('non-empty string')
    );

    // Invalid schema
    assert.throws(
      () => gates.registerGate('test', null, async () => ({})),
      (err) => err.message.includes('valid Zod schema')
    );

    // Invalid executor
    assert.throws(
      () => gates.registerGate('test', z.object({}), 'not a function'),
      (err) => err.message.includes('must be a function')
    );
  });

  test('bypassGate throws on unregistered gate', () => {
    assert.throws(
      () => gates.bypassGate('nonexistent', 'reason'),
      (err) => err.message.includes('Gate not registered')
    );
  });

  test('getGateStatus throws on unregistered gate', () => {
    assert.throws(
      () => gates.getGateStatus('nonexistent'),
      (err) => err.message.includes('Gate not registered')
    );
  });

  test('executor exceptions are caught and returned as errors', async () => {
    const schema = z.object({});
    const executor = async () => {
      throw new Error('Executor crashed');
    };

    gates.registerGate('crash-gate', schema, executor);
    const result = await gates.executeGate('crash-gate', {});

    assert.strictEqual(result.passed, false, 'Should fail on exception');
    assert.ok(result.errors.length > 0, 'Should have errors');
    assert.strictEqual(result.errors[0].path, 'executor', 'Error path should be executor');
    assert.ok(result.errors[0].message.includes('crashed'), 'Error message should include exception message');
  });

  test('getRegisteredGates returns all registered gate IDs', () => {
    gates.registerGate('gate-1', z.object({}), async () => ({}));
    gates.registerGate('gate-2', z.object({}), async () => ({}));
    gates.registerGate('gate-3', z.object({}), async () => ({}));

    const registered = gates.getRegisteredGates();
    assert.deepStrictEqual(
      registered.sort(),
      ['gate-1', 'gate-2', 'gate-3'].sort(),
      'Should return all registered gate IDs'
    );
  });

  test('clear resets all gates and audit trail', async () => {
    const schema = z.object({});
    gates.registerGate('clear-test', schema, async () => ({}));
    await gates.executeGate('clear-test', {});
    gates.bypassGate('clear-test', 'test reason');

    assert.ok(gates.isRegistered('clear-test'), 'Gate should be registered before clear');
    assert.ok(gates.getAuditTrail().length > 0, 'Audit trail should have entries before clear');

    gates.clear();

    assert.strictEqual(gates.isRegistered('clear-test'), false, 'Gate should not be registered after clear');
    assert.strictEqual(gates.getAuditTrail().length, 0, 'Audit trail should be empty after clear');
  });
});
