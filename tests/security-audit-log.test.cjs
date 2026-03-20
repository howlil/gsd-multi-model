/**
 * EZ Tools Tests - security-audit-log.cjs
 *
 * Unit tests for audit log validation and verification
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Security Audit Log', () => {
  let validateAuditEvent;
  let verifyAuditLogFile;
  let SecurityAuditError;

  // Try to load the module - RED state expected initially
  try {
    const auditMod = require('../ez-agents/bin/lib/security-audit-log.cjs');
    const errorMod = require('../ez-agents/bin/lib/security-errors.cjs');
    validateAuditEvent = auditMod.validateAuditEvent;
    verifyAuditLogFile = auditMod.verifyAuditLogFile;
    SecurityAuditError = errorMod.SecurityAuditError;
  } catch (err) {
    // Module doesn't exist yet - tests will fail (RED state)
  }

  describe('validateAuditEvent', () => {
    test('is exported and callable', () => {
      assert.ok(validateAuditEvent, 'validateAuditEvent should be exported');
      assert.strictEqual(typeof validateAuditEvent, 'function');
    });

    test('valid event with all required fields passes', () => {
      const event = {
        timestamp: '2026-03-20T10:00:00.000Z',
        actor: 'user:admin',
        action: 'secret.rotate',
        resource: 'aws:secretsmanager:prod-db',
        outcome: 'success'
      };
      const result = validateAuditEvent(event);
      assert.strictEqual(result.valid, true);
    });

    test('missing timestamp fails validation', () => {
      const event = {
        actor: 'user:admin',
        action: 'secret.rotate',
        resource: 'aws:secretsmanager:prod-db',
        outcome: 'success'
      };
      const result = validateAuditEvent(event);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('timestamp')), 'should report missing timestamp');
    });

    test('missing actor fails validation', () => {
      const event = {
        timestamp: '2026-03-20T10:00:00.000Z',
        action: 'secret.rotate',
        resource: 'aws:secretsmanager:prod-db',
        outcome: 'success'
      };
      const result = validateAuditEvent(event);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('actor')), 'should report missing actor');
    });

    test('missing action fails validation', () => {
      const event = {
        timestamp: '2026-03-20T10:00:00.000Z',
        actor: 'user:admin',
        resource: 'aws:secretsmanager:prod-db',
        outcome: 'success'
      };
      const result = validateAuditEvent(event);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('action')), 'should report missing action');
    });

    test('missing resource fails validation', () => {
      const event = {
        timestamp: '2026-03-20T10:00:00.000Z',
        actor: 'user:admin',
        action: 'secret.rotate',
        outcome: 'success'
      };
      const result = validateAuditEvent(event);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('resource')), 'should report missing resource');
    });

    test('missing outcome fails validation', () => {
      const event = {
        timestamp: '2026-03-20T10:00:00.000Z',
        actor: 'user:admin',
        action: 'secret.rotate',
        resource: 'aws:secretsmanager:prod-db'
      };
      const result = validateAuditEvent(event);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('outcome')), 'should report missing outcome');
    });

    test('rejects event with token in data', () => {
      const event = {
        timestamp: '2026-03-20T10:00:00.000Z',
        actor: 'user:admin',
        action: 'auth.login',
        resource: 'system:auth',
        outcome: 'success',
        token: 'secret-token-123'
      };
      const result = validateAuditEvent(event);
      // Token in field name OR value should be rejected
      assert.ok(!result.valid, 'event with token should fail');
    });

    test('rejects event with secret in data', () => {
      const event = {
        timestamp: '2026-03-20T10:00:00.000Z',
        actor: 'user:admin',
        action: 'secret.rotate',
        resource: 'aws:secretsmanager:prod-db',
        outcome: 'success',
        secret: 'my-secret-value'
      };
      const result = validateAuditEvent(event);
      assert.ok(!result.valid, 'event with secret should fail');
    });

    test('rejects event with password in data', () => {
      const event = {
        timestamp: '2026-03-20T10:00:00.000Z',
        actor: 'user:admin',
        action: 'user.update',
        resource: 'system:users:alice',
        outcome: 'success',
        password: 'hunter2'
      };
      const result = validateAuditEvent(event);
      assert.ok(!result.valid, 'event with password should fail');
    });

    test('rejects event with apiKey in data', () => {
      const event = {
        timestamp: '2026-03-20T10:00:00.000Z',
        actor: 'user:admin',
        action: 'api.key.create',
        resource: 'system:api-keys',
        outcome: 'success',
        apiKey: 'sk-1234567890'
      };
      const result = validateAuditEvent(event);
      assert.ok(!result.valid, 'event with apiKey should fail');
    });
  });

  describe('verifyAuditLogFile', () => {
    test('is exported and callable', () => {
      assert.ok(verifyAuditLogFile, 'verifyAuditLogFile should be exported');
      assert.strictEqual(typeof verifyAuditLogFile, 'function');
    });

    test('valid audit log file returns ok with no invalid lines', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ez-audit-test-'));
      const logFile = path.join(tmpDir, 'audit.log');
      const validEvent = {
        timestamp: '2026-03-20T10:00:00.000Z',
        actor: 'user:admin',
        action: 'secret.rotate',
        resource: 'aws:secretsmanager:prod-db',
        outcome: 'success'
      };
      fs.writeFileSync(logFile, JSON.stringify(validEvent) + '\n', 'utf-8');

      try {
        const result = verifyAuditLogFile(logFile);
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.invalidLines.length, 0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    test('file with invalid JSON returns errors', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ez-audit-test-'));
      const logFile = path.join(tmpDir, 'audit.log');
      fs.writeFileSync(logFile, 'not valid json\n', 'utf-8');

      try {
        const result = verifyAuditLogFile(logFile);
        assert.strictEqual(result.ok, false);
        assert.ok(result.errors.length > 0 || result.invalidLines.length > 0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    test('file with sensitive data returns invalid lines count', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ez-audit-test-'));
      const logFile = path.join(tmpDir, 'audit.log');
      const badEvent = {
        timestamp: '2026-03-20T10:00:00.000Z',
        actor: 'user:admin',
        action: 'secret.rotate',
        resource: 'aws:secretsmanager:prod-db',
        outcome: 'success',
        secret: 'should-not-be-logged'
      };
      fs.writeFileSync(logFile, JSON.stringify(badEvent) + '\n', 'utf-8');

      try {
        const result = verifyAuditLogFile(logFile);
        assert.strictEqual(result.ok, false);
        assert.ok(result.invalidLines.length > 0 || result.errors.length > 0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    test('missing file returns error', () => {
      const result = verifyAuditLogFile('/nonexistent/path/audit.log');
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.length > 0 || result.message);
    });
  });
});
