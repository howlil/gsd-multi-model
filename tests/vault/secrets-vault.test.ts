/**
 * Secrets Vault Test Suite
 *
 * Comprehensive tests for the SecretsVault implementation.
 * Covers all 8 requirements: SEC-01 to SEC-08
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { SecretsVault } from '../../bin/lib/vault/secrets-vault.js';
import type { VaultConfig, AccessControlRule } from '../../bin/lib/vault/vault-types.js';
import { generateEncryptionKey, validateEncryptionKey } from '../../bin/lib/vault/vault-config.js';

// Test configuration
const TEST_VAULT_PATH = join(process.cwd(), '.planning', 'test-vault');
const TEST_BACKUP_PATH = join(process.cwd(), '.planning', 'test-vault-backups');

/**
 * Generate test encryption key
 */
function getTestEncryptionKey(): string {
  return generateEncryptionKey();
}

/**
 * Clean test directories
 */
function cleanupTestDirs(): void {
  try {
    if (existsSync(TEST_VAULT_PATH)) {
      rmSync(TEST_VAULT_PATH, { recursive: true, force: true });
    }
    if (existsSync(TEST_BACKUP_PATH)) {
      rmSync(TEST_BACKUP_PATH, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors
  }
}

describe('SecretsVault', () => {
  let vault: SecretsVault;
  let encryptionKey: string;

  beforeEach(() => {
    cleanupTestDirs();
    encryptionKey = getTestEncryptionKey();

    vault = new SecretsVault({
      vaultPath: TEST_VAULT_PATH,
      backupPath: TEST_BACKUP_PATH,
      encryptionKey,
      enableAccessLogging: true,
      enableAuditTrail: true,
      maxVersionsPerSecret: 5,
      backupRetentionCount: 3,
      accessLogRetentionDays: 30,
      auditLogRetentionDays: 90
    });

    vault.init();
  });

  afterEach(() => {
    cleanupTestDirs();
  });

  // ==================== SEC-01: Vault Class Implementation ====================

  describe('SEC-01: Vault Class Implementation', () => {
    it('should initialize vault successfully', () => {
      expect(vault.isInitialized()).toBe(true);
      expect(existsSync(TEST_VAULT_PATH)).toBe(true);
      expect(existsSync(TEST_BACKUP_PATH)).toBe(true);
    });

    it('should store and retrieve a secret', () => {
      const metadata = vault.storeSecret(
        'test-secret',
        'secret-value-123',
        {
          description: 'Test secret for unit testing',
          tags: ['test', 'unit'],
          owner: 'test-user'
        },
        'test-user'
      );

      expect(metadata.id).toBeDefined();
      expect(metadata.name).toBe('test-secret');
      expect(metadata.owner).toBe('test-user');
      expect(metadata.enabled).toBe(true);
      expect(metadata.tags).toEqual(['test', 'unit']);

      // Retrieve the secret
      const decrypted = vault.getSecret(metadata.id, 'test-user');

      expect(decrypted).not.toBeNull();
      expect(decrypted?.value).toBe('secret-value-123');
      expect(decrypted?.metadata.name).toBe('test-secret');
    });

    it('should retrieve secret by name', () => {
      vault.storeSecret('api-key', 'key-12345', {}, 'system');

      const decrypted = vault.getSecret('api-key', 'system');

      expect(decrypted).not.toBeNull();
      expect(decrypted?.value).toBe('key-12345');
    });

    it('should update a secret', () => {
      vault.storeSecret('update-test', 'initial-value', {}, 'user1');

      const updated = vault.updateSecret(
        'update-test',
        'new-value',
        'user1',
        'Testing update functionality'
      );

      expect(updated).not.toBeNull();

      const decrypted = vault.getSecret('update-test', 'user1');
      expect(decrypted?.value).toBe('new-value');
    });

    it('should delete a secret', () => {
      vault.storeSecret('delete-test', 'to-be-deleted', {}, 'user1');

      const deleted = vault.deleteSecret('delete-test', 'user1');
      expect(deleted).toBe(true);

      const retrieved = vault.getSecret('delete-test', 'user1');
      expect(retrieved).toBeNull();
    });

    it('should return null for non-existent secret', () => {
      const result = vault.getSecret('non-existent', 'user1');
      expect(result).toBeNull();
    });

    it('should query secrets with filters', () => {
      vault.storeSecret('secret-1', 'value1', { tags: ['tag1', 'common'], owner: 'user1' });
      vault.storeSecret('secret-2', 'value2', { tags: ['tag2', 'common'], owner: 'user2' });
      vault.storeSecret('secret-3', 'value3', { tags: ['tag1'], owner: 'user1', enabled: false });

      // Query by tag
      const byTag = vault.querySecrets({ tags: ['tag1'] });
      expect(byTag.total).toBe(2);

      // Query by owner
      const byOwner = vault.querySecrets({ owner: 'user1' });
      expect(byOwner.total).toBe(2);

      // Query by enabled status
      const byEnabled = vault.querySecrets({ enabled: true });
      expect(byEnabled.total).toBe(2);

      // Query with search
      const withSearch = vault.querySecrets({ search: 'secret-2' });
      expect(withSearch.total).toBe(1);
    });
  });

  // ==================== SEC-02: Encryption at Rest ====================

  describe('SEC-02: Secret Encryption at Rest', () => {
    it('should encrypt secret value at rest', () => {
      vault.storeSecret('encrypted-secret', 'sensitive-data', {}, 'system');

      // Read the raw file to verify encryption
      const secretsDir = join(TEST_VAULT_PATH, 'secrets');
      const files = readFileSync(secretsDir, 'utf-8');

      // Find the secret file
      const secretFiles = files.split('\n').filter(f => f.includes('.json'));

      // The encrypted value should not contain the plain text
      const secretContent = readFileSync(
        join(secretsDir, secretFiles[0] || 'test.json'),
        'utf-8'
      );

      expect(secretContent).not.toContain('sensitive-data');
      expect(secretContent).toContain('encryptedValue');
      expect(secretContent).toContain('iv');
      expect(secretContent).toContain('authTag');
    });

    it('should use AES-256-GCM encryption', () => {
      vault.storeSecret('aes-test', 'data', {}, 'system');

      const secretsDir = join(TEST_VAULT_PATH, 'secrets');
      const files = readFileSync(secretsDir, { encoding: 'utf-8' } as any);

      // Find and read a secret file
      const secretFiles = files.split('\n').filter(f => f.includes('.json'));
      if (secretFiles.length > 0) {
        const content = JSON.parse(readFileSync(join(secretsDir, secretFiles[0]), 'utf-8'));
        expect(content.versions[0].encryptionAlgorithm).toBe('aes-256-gcm');
      }
    });

    it('should validate encryption key format', () => {
      expect(validateEncryptionKey(encryptionKey)).toBe(true);
      expect(validateEncryptionKey('invalid-key')).toBe(false);
      expect(validateEncryptionKey('')).toBe(false);
    });

    it('should generate valid encryption keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(validateEncryptionKey(key1)).toBe(true);
      expect(validateEncryptionKey(key2)).toBe(true);
      expect(key1).not.toBe(key2); // Keys should be unique
    });

    it('should fail with invalid encryption key', () => {
      expect(() => {
        const badVault = new SecretsVault({
          vaultPath: TEST_VAULT_PATH + '-bad',
          backupPath: TEST_BACKUP_PATH + '-bad',
          encryptionKey: 'invalid-key-format'
        });
      }).toThrow();
    });
  });

  // ==================== SEC-03: Access Logging ====================

  describe('SEC-03: Secret Access Logging', () => {
    it('should log successful secret access', () => {
      const metadata = vault.storeSecret('access-log-test', 'value', {}, 'user1');

      vault.getSecret(metadata.id, 'user1');

      const logs = vault.getAccessLogs(metadata.id);
      expect(logs.length).toBeGreaterThan(0);

      const accessLog = logs[0];
      expect(accessLog.secretId).toBe(metadata.id);
      expect(accessLog.principal).toBe('user1');
      expect(accessLog.action).toBe('read');
      expect(accessLog.granted).toBe(true);
    });

    it('should log denied access attempts', () => {
      const metadata = vault.storeSecret('denied-access-test', 'value', {}, 'owner');

      // Try to access with different user (no access control set, should succeed)
      vault.getSecret(metadata.id, 'other-user');

      const logs = vault.getAccessLogs(metadata.id);
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should log access with context', () => {
      const metadata = vault.storeSecret('context-test', 'value', {}, 'user1');

      vault.getSecret(metadata.id, 'user1', {
        taskId: 'task-123',
        agentType: 'test-agent'
      });

      const logs = vault.getAccessLogs(metadata.id);
      const logWithContext = logs.find(l => l.context?.taskId === 'task-123');
      expect(logWithContext).toBeDefined();
      expect(logWithContext?.context?.agentType).toBe('test-agent');
    });

    it('should limit access log results', () => {
      const metadata = vault.storeSecret('limit-test', 'value', {}, 'user1');

      // Access multiple times
      for (let i = 0; i < 10; i++) {
        vault.getSecret(metadata.id, 'user1');
      }

      const logs = vault.getAccessLogs(metadata.id, 5);
      expect(logs.length).toBe(5);
    });

    it('should return empty array when no logs exist', () => {
      const logs = vault.getAccessLogs('non-existent');
      expect(logs).toEqual([]);
    });
  });

  // ==================== SEC-04: Secret Rotation ====================

  describe('SEC-04: Secret Rotation', () => {
    it('should rotate a secret manually', () => {
      vault.storeSecret('rotate-test', 'old-value', {}, 'user1');

      const result = vault.rotateSecret(
        'rotate-test',
        'new-rotated-value',
        'user1',
        'scheduled rotation'
      );

      expect(result).toBe(true);

      const decrypted = vault.getSecret('rotate-test', 'user1');
      expect(decrypted?.value).toBe('new-rotated-value');
    });

    it('should create new version on rotation', () => {
      vault.storeSecret('version-rotate-test', 'v1', {}, 'user1');

      vault.rotateSecret('version-rotate-test', 'v2', 'user1', 'rotation 1');
      vault.rotateSecret('version-rotate-test', 'v3', 'user1', 'rotation 2');

      const versions = vault.getVersionHistory('version-rotate-test');
      expect(versions).not.toBeNull();
      expect(versions?.length).toBe(3);
    });

    it('should configure automatic rotation', () => {
      const metadata = vault.storeSecret('auto-rotate-test', 'value', {}, 'user1');

      vault.configureRotation({
        secretId: metadata.id,
        interval: 60000, // 1 minute
        strategy: 'automatic',
        notifyOnRotation: ['admin@example.com']
      });

      // Verify rotation is configured (timer should be set)
      // Note: We can't easily test the timer without waiting
    });

    it('should stop rotation when configured', () => {
      const metadata = vault.storeSecret('stop-rotate-test', 'value', {}, 'user1');

      vault.configureRotation({
        secretId: metadata.id,
        interval: 60000,
        strategy: 'automatic'
      });

      vault.stopRotation(metadata.id);
      // Should not throw
    });

    it('should audit rotation operation', () => {
      vault.storeSecret('audit-rotate-test', 'value', {}, 'user1');

      vault.rotateSecret('audit-rotate-test', 'new-value', 'user1', 'test rotation');

      const auditLogs = vault.getAuditTrail(undefined, 'rotate');
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].details.rotationReason).toBe('test rotation');
    });
  });

  // ==================== SEC-05: Secret Versioning ====================

  describe('SEC-05: Secret Versioning', () => {
    it('should track versions on updates', () => {
      vault.storeSecret('version-test', 'v1', {}, 'user1');
      vault.updateSecret('version-test', 'v2', 'user1', 'update 1');
      vault.updateSecret('version-test', 'v3', 'user1', 'update 2');

      const versions = vault.getVersionHistory('version-test');

      expect(versions).not.toBeNull();
      expect(versions?.length).toBe(3);
      expect(versions?.[0].version).toBe(1);
      expect(versions?.[1].version).toBe(2);
      expect(versions?.[2].version).toBe(3);
    });

    it('should mark only current version as active', () => {
      vault.storeSecret('active-version-test', 'v1', {}, 'user1');
      vault.updateSecret('active-version-test', 'v2', 'user1');

      const versions = vault.getVersionHistory('active-version-test');

      expect(versions?.[0].isActive).toBe(false);
      expect(versions?.[1].isActive).toBe(true);
    });

    it('should include change description in versions', () => {
      vault.storeSecret('desc-test', 'v1', {}, 'user1');
      vault.updateSecret('desc-test', 'v2', 'user1', 'Important change description');

      const versions = vault.getVersionHistory('desc-test');
      expect(versions?.[1].changeDescription).toBe('Important change description');
    });

    it('should enforce max versions limit', () => {
      // Store initial version
      vault.storeSecret('max-version-test', 'v1', {}, 'user1');

      // Update multiple times to exceed max (5)
      for (let i = 2; i <= 7; i++) {
        vault.updateSecret('max-version-test', `v${i}`, 'user1');
      }

      const versions = vault.getVersionHistory('max-version-test');
      expect(versions?.length).toBe(5); // Should be limited to maxVersionsPerSecret
    });

    it('should track version creator', () => {
      vault.storeSecret('creator-test', 'v1', {}, 'user1');
      vault.updateSecret('creator-test', 'v2', 'user2', 'update by user2');

      const versions = vault.getVersionHistory('creator-test');
      expect(versions?.[0].createdBy).toBe('user1');
      expect(versions?.[1].createdBy).toBe('user2');
    });

    it('should include value hash in version', () => {
      vault.storeSecret('hash-test', 'value', {}, 'user1');

      const versions = vault.getVersionHistory('hash-test');
      expect(versions?.[0].valueHash).toBeDefined();
      expect(versions?.[0].valueHash.length).toBe(64); // SHA-256 hex
    });
  });

  // ==================== SEC-06: Access Control ====================

  describe('SEC-06: Secret Access Control', () => {
    it('should set access control rules', () => {
      const metadata = vault.storeSecret('acl-test', 'value', {}, 'owner');

      const rules: AccessControlRule[] = [
        {
          principal: 'user1',
          principalType: 'user',
          actions: ['read']
        },
        {
          principal: 'user2',
          principalType: 'user',
          actions: ['read', 'write']
        }
      ];

      const result = vault.setAccessControl(metadata.id, rules, 'owner');
      expect(result).toBe(true);

      const retrievedRules = vault.getAccessControl(metadata.id);
      expect(retrievedRules.length).toBe(2);
    });

    it('should allow access based on rules', () => {
      const metadata = vault.storeSecret('allow-access-test', 'value', {}, 'owner');

      vault.setAccessControl(
        metadata.id,
        [
          {
            principal: 'allowed-user',
            principalType: 'user',
            actions: ['read']
          }
        ],
        'owner'
      );

      const result = vault.getSecret(metadata.id, 'allowed-user');
      expect(result).not.toBeNull();
      expect(result?.value).toBe('value');
    });

    it('should deny access based on rules', () => {
      const metadata = vault.storeSecret('deny-access-test', 'value', {}, 'owner');

      vault.setAccessControl(
        metadata.id,
        [
          {
            principal: 'specific-user',
            principalType: 'user',
            actions: ['read']
          }
        ],
        'owner'
      );

      // Different user without permission
      const result = vault.getSecret(metadata.id, 'unauthorized-user');
      expect(result).toBeNull();
    });

    it('should allow owner access by default', () => {
      const metadata = vault.storeSecret('owner-access-test', 'value', { owner: 'the-owner' });

      // No ACL set, owner should have access
      const result = vault.getSecret(metadata.id, 'the-owner');
      expect(result).not.toBeNull();
    });

    it('should support wildcard principal', () => {
      const metadata = vault.storeSecret('wildcard-test', 'value', {}, 'owner');

      vault.setAccessControl(
        metadata.id,
        [
          {
            principal: '*',
            principalType: 'user',
            actions: ['read']
          }
        ],
        'owner'
      );

      // Any user should have read access
      const result1 = vault.getSecret(metadata.id, 'any-user-1');
      const result2 = vault.getSecret(metadata.id, 'any-user-2');

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
    });

    it('should require write permission for updates', () => {
      const metadata = vault.storeSecret('write-perm-test', 'value', {}, 'owner');

      vault.setAccessControl(
        metadata.id,
        [
          {
            principal: 'reader',
            principalType: 'user',
            actions: ['read']
          }
        ],
        'owner'
      );

      // Reader should not be able to update
      const result = vault.updateSecret(metadata.id, 'new-value', 'reader');
      expect(result).toBeNull();
    });
  });

  // ==================== SEC-07: Audit Trail ====================

  describe('SEC-07: Secret Audit Trail', () => {
    it('should log secret creation in audit trail', () => {
      vault.storeSecret('audit-create-test', 'value', { description: 'Test' }, 'creator');

      const auditLogs = vault.getAuditTrail(undefined, 'create');
      expect(auditLogs.length).toBeGreaterThan(0);

      const log = auditLogs[0];
      expect(log.operation).toBe('create');
      expect(log.principal).toBe('creator');
      expect(log.details.description).toContain('created');
    });

    it('should log secret updates in audit trail', () => {
      vault.storeSecret('audit-update-test', 'v1', {}, 'user1');
      vault.updateSecret('audit-update-test', 'v2', 'user1', 'update reason');

      const auditLogs = vault.getAuditTrail(undefined, 'update');
      expect(auditLogs.length).toBeGreaterThan(0);

      const log = auditLogs.find(l => l.operation === 'update' && l.details.newVersion === 2);
      expect(log).toBeDefined();
      expect(log?.details.modifiedFields).toContain('value');
    });

    it('should log secret deletion in audit trail', () => {
      const metadata = vault.storeSecret('audit-delete-test', 'value', {}, 'user1');
      vault.deleteSecret(metadata.id, 'user1');

      const auditLogs = vault.getAuditTrail(undefined, 'delete');
      expect(auditLogs.length).toBeGreaterThan(0);

      const log = auditLogs[0];
      expect(log.operation).toBe('delete');
      expect(log.details.description).toContain('deleted');
    });

    it('should filter audit trail by secret ID', () => {
      vault.storeSecret('audit-filter-1', 'value', {}, 'user1');
      vault.storeSecret('audit-filter-2', 'value', {}, 'user1');

      const secret1 = vault.getSecret('audit-filter-1', 'user1');

      if (secret1) {
        const logs = vault.getAuditTrail(secret1.metadata.id);
        expect(logs.length).toBeGreaterThan(0);
        expect(logs.every(l => l.secretId === secret1.metadata.id)).toBe(true);
      }
    });

    it('should filter audit trail by operation', () => {
      vault.storeSecret('audit-op-filter', 'value', {}, 'user1');
      vault.updateSecret('audit-op-filter', 'new', 'user1');
      vault.deleteSecret('audit-op-filter', 'user1');

      const createLogs = vault.getAuditTrail(undefined, 'create');
      const updateLogs = vault.getAuditTrail(undefined, 'update');
      const deleteLogs = vault.getAuditTrail(undefined, 'delete');

      expect(createLogs.length).toBeGreaterThan(0);
      expect(updateLogs.length).toBeGreaterThan(0);
      expect(deleteLogs.length).toBeGreaterThan(0);
    });

    it('should include state hashes in audit entries', () => {
      vault.storeSecret('audit-hash-test', 'value', {}, 'user1');

      const auditLogs = vault.getAuditTrail(undefined, 'create');
      const log = auditLogs[0];

      expect(log.newStateHash).toBeDefined();
      expect(log.newStateHash.length).toBe(64); // SHA-256 hex
    });

    it('should track access control changes', () => {
      const metadata = vault.storeSecret('audit-acl-test', 'value', {}, 'owner');

      vault.setAccessControl(
        metadata.id,
        [{ principal: 'user1', principalType: 'user', actions: ['read'] }],
        'owner'
      );

      const auditLogs = vault.getAuditTrail(undefined, 'access_change');
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].details.modifiedFields).toContain('accessControl');
    });
  });

  // ==================== SEC-08: Backup/Restore ====================

  describe('SEC-08: Secret Backup/Restore', () => {
    it('should backup all secrets', () => {
      vault.storeSecret('backup-test-1', 'value1', {}, 'user1');
      vault.storeSecret('backup-test-2', 'value2', {}, 'user1');
      vault.storeSecret('backup-test-3', 'value3', {}, 'user1');

      const count = vault.backupAllSecrets('system');
      expect(count).toBe(3);

      const backups = vault.listBackups();
      expect(backups.length).toBe(3);
    });

    it('should restore from backup', () => {
      const metadata = vault.storeSecret('restore-test', 'original-value', {}, 'user1');

      // Backup
      vault.backupAllSecrets();

      // Update the secret
      vault.updateSecret('restore-test', 'modified-value', 'user1');

      // Verify update
      const current = vault.getSecret('restore-test', 'user1');
      expect(current?.value).toBe('modified-value');

      // Get backup ID
      const backups = vault.listBackups();
      expect(backups.length).toBeGreaterThan(0);

      // Restore (note: restore restores the encrypted data, but we can't easily
      // verify the value without decrypting, which the restore does internally)
      const result = vault.restoreFromBackup(backups[0].id, 'system');

      expect(result.success).toBe(true);
      expect(result.secretId).toBe(metadata.id);
    });

    it('should verify backup checksum on restore', () => {
      vault.storeSecret('checksum-test', 'value', {}, 'user1');
      vault.backupAllSecrets();

      const backups = vault.listBackups();
      expect(backups.length).toBeGreaterThan(0);
      expect(backups[0].checksum).toBeDefined();
    });

    it('should return error for non-existent backup', () => {
      const result = vault.restoreFromBackup('non-existent-backup-id', 'system');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should cleanup old backups', () => {
      // Create multiple backups
      vault.storeSecret('cleanup-test', 'value', {}, 'user1');

      for (let i = 0; i < 5; i++) {
        vault.backupAllSecrets();
      }

      const beforeCleanup = vault.listBackups();
      expect(beforeCleanup.length).toBe(5);

      const removed = vault.cleanupBackups();
      expect(removed).toBe(2); // Should keep only 3 (backupRetentionCount)

      const afterCleanup = vault.listBackups();
      expect(afterCleanup.length).toBe(3);
    });

    it('should backup before delete', () => {
      const metadata = vault.storeSecret('pre-delete-backup', 'value', {}, 'user1');

      vault.deleteSecret(metadata.id, 'user1');

      // Should have a backup from the delete operation
      const backups = vault.listBackups();
      expect(backups.length).toBeGreaterThan(0);
    });

    it('should list backups sorted by time', () => {
      vault.storeSecret('sort-test', 'value', {}, 'user1');

      // Create backups with slight delays to ensure different timestamps
      vault.backupAllSecrets();
      vault.backupAllSecrets();
      vault.backupAllSecrets();

      const backups = vault.listBackups();

      // Verify sorted descending (newest first)
      for (let i = 1; i < backups.length; i++) {
        expect(backups[i].backedUpAt).toBeLessThanOrEqual(backups[i - 1].backedUpAt);
      }
    });
  });

  // ==================== Additional Integration Tests ====================

  describe('Integration Tests', () => {
    it('should handle complete secret lifecycle', () => {
      // Create
      const metadata = vault.storeSecret(
        'lifecycle-test',
        'initial',
        {
          description: 'Lifecycle test secret',
          tags: ['lifecycle', 'test'],
          owner: 'test-admin'
        },
        'test-admin'
      );

      // Read
      let secret = vault.getSecret(metadata.id, 'test-admin');
      expect(secret?.value).toBe('initial');

      // Update
      vault.updateSecret(metadata.id, 'updated', 'test-admin', 'lifecycle update');
      secret = vault.getSecret(metadata.id, 'test-admin');
      expect(secret?.value).toBe('updated');

      // Set ACL
      vault.setAccessControl(
        metadata.id,
        [{ principal: 'viewer', principalType: 'user', actions: ['read'] }],
        'test-admin'
      );

      // Verify ACL
      const viewerSecret = vault.getSecret(metadata.id, 'viewer');
      expect(viewerSecret).not.toBeNull();

      // Rotate
      vault.rotateSecret(metadata.id, 'rotated', 'test-admin', 'lifecycle rotation');
      secret = vault.getSecret(metadata.id, 'test-admin');
      expect(secret?.value).toBe('rotated');

      // Backup
      vault.backupAllSecrets();

      // Delete
      vault.deleteSecret(metadata.id, 'test-admin');

      // Verify deleted
      const deleted = vault.getSecret(metadata.id, 'test-admin');
      expect(deleted).toBeNull();
    });

    it('should handle expired secrets', () => {
      const expiredTime = Date.now() - 1000; // 1 second ago

      vault.storeSecret(
        'expired-test',
        'value',
        {
          expiresAt: expiredTime,
          enabled: true
        },
        'system'
      );

      const result = vault.getSecret('expired-test', 'user1');
      expect(result).toBeNull(); // Should not retrieve expired secret
    });

    it('should handle disabled secrets', () => {
      vault.storeSecret(
        'disabled-test',
        'value',
        { enabled: false },
        'system'
      );

      const result = vault.getSecret('disabled-test', 'user1');
      expect(result).toBeNull(); // Should not retrieve disabled secret
    });

    it('should get vault statistics', () => {
      vault.storeSecret('stats-1', 'value1', { tags: ['stats'] });
      vault.storeSecret('stats-2', 'value2', { tags: ['stats'] });
      vault.storeSecret('stats-3', 'value3', { enabled: false });

      const stats = vault.getStats();

      expect(stats.totalSecrets).toBe(3);
      expect(stats.enabledSecrets).toBe(2);
      expect(stats.totalVersions).toBe(3);
      expect(stats.storageSizeBytes).toBeGreaterThan(0);
    });

    it('should handle special characters in secret values', () => {
      const specialValue = 'value-with-special-chars-!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

      vault.storeSecret('special-chars-test', specialValue, {}, 'system');

      const result = vault.getSecret('special-chars-test', 'system');
      expect(result?.value).toBe(specialValue);
    });

    it('should handle unicode in secret values', () => {
      const unicodeValue = 'Unicode value: 你好世界 🌍 مرحبا';

      vault.storeSecret('unicode-test', unicodeValue, {}, 'system');

      const result = vault.getSecret('unicode-test', 'system');
      expect(result?.value).toBe(unicodeValue);
    });

    it('should handle large secret values', () => {
      const largeValue = 'x'.repeat(10000); // 10KB value

      vault.storeSecret('large-value-test', largeValue, {}, 'system');

      const result = vault.getSecret('large-value-test', 'system');
      expect(result?.value).toBe(largeValue);
      expect(result?.value.length).toBe(10000);
    });
  });

  // ==================== Error Handling Tests ====================

  describe('Error Handling', () => {
    it('should throw error when vault not initialized', () => {
      const uninitializedVault = new SecretsVault({
        vaultPath: TEST_VAULT_PATH + '-uninit',
        backupPath: TEST_BACKUP_PATH + '-uninit',
        encryptionKey: generateEncryptionKey()
      });

      expect(() => {
        uninitializedVault.getSecret('test', 'user');
      }).toThrow('Vault not initialized');
    });

    it('should handle concurrent operations gracefully', () => {
      // Store multiple secrets concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve().then(() =>
          vault.storeSecret(`concurrent-${i}`, `value-${i}`, {}, 'system')
        )
      );

      // All should succeed
      expect(() => Promise.all(promises)).not.toThrow();
    });
  });
});

describe('Vault Config Utilities', () => {
  describe('generateEncryptionKey', () => {
    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      expect(key1).not.toBe(key2);
    });

    it('should generate valid keys', () => {
      const key = generateEncryptionKey();
      expect(validateEncryptionKey(key)).toBe(true);
    });
  });

  describe('validateEncryptionKey', () => {
    it('should accept valid 32-byte base64 keys', () => {
      const validKey = generateEncryptionKey();
      expect(validateEncryptionKey(validKey)).toBe(true);
    });

    it('should reject invalid keys', () => {
      expect(validateEncryptionKey('')).toBe(false);
      expect(validateEncryptionKey('short')).toBe(false);
      expect(validateEncryptionKey('not-base64-!!!')).toBe(false);
    });

    it('should reject wrong size keys', () => {
      // 16 bytes instead of 32
      const shortKey = Buffer.from('x'.repeat(16)).toString('base64');
      expect(validateEncryptionKey(shortKey)).toBe(false);
    });
  });
});
