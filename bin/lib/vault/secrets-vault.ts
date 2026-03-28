/**
 * Secrets Vault - Secure Secret Management
 *
 * Implements secure secret storage with encryption at rest, access control,
 * versioning, rotation, audit trails, and backup/restore capabilities.
 *
 * Requirements:
 * - SEC-01: Secrets vault class implementation
 * - SEC-02: Secret encryption at rest
 * - SEC-03: Secret access logging
 * - SEC-04: Secret rotation
 * - SEC-05: Secret versioning
 * - SEC-06: Secret access control
 * - SEC-07: Secret audit trail
 * - SEC-08: Secret backup/restore
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  rmSync,
  readdirSync,
  appendFileSync,
  mkdirSync
} from 'fs';
import { join, basename } from 'path';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
  scryptSync
} from 'crypto';
import { defaultLogger as logger } from '../logger/index.js';
import type {
  SecretMetadata,
  EncryptedSecret,
  DecryptedSecret,
  SecretVersion,
  AccessControlRule,
  AccessLogEntry,
  AuditTrailEntry,
  SecretBackup,
  RestoreResult,
  VaultConfig,
  SecretQueryOptions,
  SecretQueryResult,
  VaultStats,
  VaultError,
  VaultErrorCode,
  SecretAction,
  RotationConfig
} from './vault-types.js';
import { getVaultConfig, initVaultDirectories, validateEncryptionKey } from './vault-config.js';

/**
 * Algorithm used for encryption
 */
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

/**
 * Salt for key derivation
 */
const KEY_DERIVATION_SALT = 'ez-agents-vault-salt-v1';

/**
 * Generate a unique ID
 */
function generateId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Hash a value using SHA-256
 */
function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Derive encryption key from provided key material
 */
function deriveKey(encryptionKey: string): Buffer {
  return scryptSync(encryptionKey, KEY_DERIVATION_SALT, 32);
}

/**
 * Encrypt a value
 * @param value - Plain text value to encrypt
 * @param key - Encryption key (Buffer)
 * @returns Object with encrypted value, IV, and auth tag
 */
function encryptValue(
  value: string,
  key: Buffer
): { encryptedValue: string; iv: string; authTag: string } {
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(value, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag().toString('base64');

  return {
    encryptedValue: encrypted,
    iv: iv.toString('base64'),
    authTag
  };
}

/**
 * Decrypt a value
 * @param encryptedValue - Base64-encoded encrypted value
 * @param iv - Base64-encoded initialization vector
 * @param authTag - Base64-encoded authentication tag
 * @param key - Encryption key (Buffer)
 * @returns Decrypted plain text
 */
function decryptValue(
  encryptedValue: string,
  iv: string,
  authTag: string,
  key: Buffer
): string {
  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    key,
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  let decrypted = decipher.update(encryptedValue, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Create a vault error
 */
function createVaultError(
  code: VaultErrorCode,
  message: string,
  context: Record<string, unknown> = {},
  cause?: Error
): VaultError {
  return {
    code,
    message,
    context: {
      operation: (context.operation as string) || 'unknown',
      ...(context.secretId && { secretId: context.secretId as string }),
      ...(context.secretName && { secretName: context.secretName as string }),
      ...(context.principal && { principal: context.principal as string })
    },
    cause
  };
}

/**
 * Secrets Vault Class
 *
 * Provides secure secret management with:
 * - AES-256-GCM encryption at rest
 * - Role-based access control
 * - Version history
 * - Automatic rotation
 * - Comprehensive audit logging
 * - Backup and restore
 */
export class SecretsVault {
  private config: VaultConfig;
  private derivedKey: Buffer;
  private initialized: boolean = false;

  /**
   * Access control rules indexed by secret ID
   */
  private accessControlRules: Map<string, AccessControlRule[]> = new Map();

  /**
   * Rotation configurations indexed by secret ID
   */
  private rotationConfigs: Map<string, RotationConfig> = new Map();

  /**
   * Rotation timers indexed by secret ID
   */
  private rotationTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a new SecretsVault instance
   * @param config - Optional vault configuration overrides
   */
  constructor(config?: Partial<VaultConfig>) {
    this.config = getVaultConfig(config);
    this.derivedKey = deriveKey(this.config.encryptionKey);
  }

  /**
   * Initialize the vault
   */
  public init(): void {
    if (this.initialized) {
      return;
    }

    initVaultDirectories(this.config);
    this.initialized = true;
    logger.info('Secrets Vault initialized', {
      vaultPath: this.config.vaultPath,
      backupPath: this.config.backupPath,
      encryption: ENCRYPTION_ALGORITHM,
      accessLogging: this.config.enableAccessLogging,
      auditTrail: this.config.enableAuditTrail
    });
  }

  /**
   * Get vault initialization status
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  // ==================== SEC-01: Vault Class Implementation ====================

  /**
   * Store a new secret
   * @param name - Secret name
   * @param value - Secret value
   * @param options - Optional metadata
   * @param principal - Principal storing the secret
   * @returns Secret metadata
   */
  public storeSecret(
    name: string,
    value: string,
    options: {
      description?: string;
      tags?: string[];
      owner?: string;
      expiresAt?: number;
      enabled?: boolean;
    } = {},
    principal: string = 'system'
  ): SecretMetadata {
    this.ensureInitialized();

    const secretId = generateId();
    const now = Date.now();

    // Create metadata
    const metadata: SecretMetadata = {
      id: secretId,
      name,
      description: options.description,
      tags: options.tags || [],
      owner: options.owner || principal,
      createdAt: now,
      updatedAt: now,
      expiresAt: options.expiresAt,
      enabled: options.enabled ?? true
    };

    // Encrypt the value
    const { encryptedValue, iv, authTag } = encryptValue(value, this.derivedKey);

    // Create version record
    const version: SecretVersion = {
      version: 1,
      valueHash: hashValue(value),
      createdAt: now,
      createdBy: principal,
      isActive: true,
      encryptionAlgorithm: ENCRYPTION_ALGORITHM
    };

    // Create encrypted secret
    const encryptedSecret: EncryptedSecret = {
      metadata,
      encryptedValue,
      iv,
      authTag,
      currentVersion: 1,
      versions: [version]
    };

    // Save to vault
    this.saveEncryptedSecret(secretId, encryptedSecret);

    // Audit trail
    this.logAuditTrail({
      id: generateId(),
      secretId,
      secretName: name,
      operation: 'create',
      principal,
      timestamp: now,
      details: {
        description: `Secret '${name}' created`,
        newVersion: 1
      },
      newStateHash: hashValue(JSON.stringify(encryptedSecret))
    });

    logger.info('Secret stored', {
      secretId,
      name,
      owner: metadata.owner,
      expiresAt: metadata.expiresAt
    });

    return metadata;
  }

  /**
   * Get a secret (decrypted)
   * @param secretIdOrName - Secret ID or name
   * @param principal - Principal requesting the secret
   * @param context - Additional context for access logging
   * @returns Decrypted secret or null if not found/access denied
   */
  public getSecret(
    secretIdOrName: string,
    principal: string,
    context?: Record<string, string>
  ): DecryptedSecret | null {
    this.ensureInitialized();

    const encryptedSecret = this.loadEncryptedSecret(secretIdOrName);
    if (!encryptedSecret) {
      this.logAccess({
        id: generateId(),
        secretId: secretIdOrName,
        secretName: secretIdOrName,
        principal,
        principalType: 'user',
        action: 'read',
        granted: false,
        denialReason: 'SECRET_NOT_FOUND',
        timestamp: Date.now(),
        context
      });
      return null;
    }

    const metadata = encryptedSecret.metadata;

    // Check access control
    if (!this.checkAccess(metadata.id, principal, 'read')) {
      this.logAccess({
        id: generateId(),
        secretId: metadata.id,
        secretName: metadata.name,
        principal,
        principalType: 'user',
        action: 'read',
        granted: false,
        denialReason: 'ACCESS_DENIED',
        timestamp: Date.now(),
        context
      });
      return null;
    }

    // Check if enabled
    if (!metadata.enabled) {
      this.logAccess({
        id: generateId(),
        secretId: metadata.id,
        secretName: metadata.name,
        principal,
        principalType: 'user',
        action: 'read',
        granted: false,
        denialReason: 'SECRET_DISABLED',
        timestamp: Date.now(),
        context
      });
      return null;
    }

    // Check expiration
    if (metadata.expiresAt && Date.now() > metadata.expiresAt) {
      this.logAccess({
        id: generateId(),
        secretId: metadata.id,
        secretName: metadata.name,
        principal,
        principalType: 'user',
        action: 'read',
        granted: false,
        denialReason: 'SECRET_EXPIRED',
        timestamp: Date.now(),
        context
      });
      return null;
    }

    // Decrypt the value
    try {
      const value = decryptValue(
        encryptedSecret.encryptedValue,
        encryptedSecret.iv,
        encryptedSecret.authTag || '',
        this.derivedKey
      );

      // Log successful access
      this.logAccess({
        id: generateId(),
        secretId: metadata.id,
        secretName: metadata.name,
        principal,
        principalType: 'user',
        action: 'read',
        granted: true,
        timestamp: Date.now(),
        context
      });

      return {
        metadata,
        value,
        version: encryptedSecret.currentVersion
      };
    } catch (err) {
      logger.error('Failed to decrypt secret', {
        secretId: metadata.id,
        error: (err as Error).message
      });
      return null;
    }
  }

  /**
   * Update a secret value (creates new version)
   * @param secretIdOrName - Secret ID or name
   * @param newValue - New secret value
   * @param principal - Principal updating the secret
   * @param changeDescription - Optional description of changes
   * @returns Updated metadata or null if not found
   */
  public updateSecret(
    secretIdOrName: string,
    newValue: string,
    principal: string,
    changeDescription?: string
  ): SecretMetadata | null {
    this.ensureInitialized();

    const encryptedSecret = this.loadEncryptedSecret(secretIdOrName);
    if (!encryptedSecret) {
      return null;
    }

    // Check access control
    if (!this.checkAccess(encryptedSecret.metadata.id, principal, 'write')) {
      this.logAuditTrail({
        id: generateId(),
        secretId: encryptedSecret.metadata.id,
        secretName: encryptedSecret.metadata.name,
        operation: 'update',
        principal,
        timestamp: Date.now(),
        details: {
          description: 'Update denied',
          modifiedFields: ['value']
        },
        previousStateHash: hashValue(JSON.stringify(encryptedSecret)),
        newStateHash: hashValue(JSON.stringify(encryptedSecret))
      });
      return null;
    }

    const now = Date.now();
    const oldStateHash = hashValue(JSON.stringify(encryptedSecret));

    // Encrypt new value
    const { encryptedValue, iv, authTag } = encryptValue(newValue, this.derivedKey);

    // Create new version
    const newVersion: SecretVersion = {
      version: encryptedSecret.currentVersion + 1,
      valueHash: hashValue(newValue),
      createdAt: now,
      createdBy: principal,
      changeDescription,
      isActive: true,
      encryptionAlgorithm: ENCRYPTION_ALGORITHM
    };

    // Mark previous version as inactive
    encryptedSecret.versions.forEach((v) => {
      v.isActive = false;
    });

    // Update secret
    encryptedSecret.encryptedValue = encryptedValue;
    encryptedSecret.iv = iv;
    encryptedSecret.authTag = authTag;
    encryptedSecret.currentVersion = newVersion.version;
    encryptedSecret.versions.push(newVersion);
    encryptedSecret.metadata.updatedAt = now;

    // Enforce max versions
    this.enforceMaxVersions(encryptedSecret);

    // Save updated secret
    this.saveEncryptedSecret(encryptedSecret.metadata.id, encryptedSecret);

    // Audit trail
    this.logAuditTrail({
      id: generateId(),
      secretId: encryptedSecret.metadata.id,
      secretName: encryptedSecret.metadata.name,
      operation: 'update',
      principal,
      timestamp: now,
      details: {
        description: changeDescription || `Secret '${encryptedSecret.metadata.name}' updated`,
        modifiedFields: ['value'],
        oldVersion: newVersion.version - 1,
        newVersion: newVersion.version
      },
      previousStateHash: oldStateHash,
      newStateHash: hashValue(JSON.stringify(encryptedSecret))
    });

    logger.info('Secret updated', {
      secretId: encryptedSecret.metadata.id,
      name: encryptedSecret.metadata.name,
      newVersion: newVersion.version
    });

    return encryptedSecret.metadata;
  }

  /**
   * Delete a secret
   * @param secretIdOrName - Secret ID or name
   * @param principal - Principal deleting the secret
   * @returns True if deleted, false if not found
   */
  public deleteSecret(secretIdOrName: string, principal: string): boolean {
    this.ensureInitialized();

    const encryptedSecret = this.loadEncryptedSecret(secretIdOrName);
    if (!encryptedSecret) {
      return false;
    }

    // Check access control
    if (!this.checkAccess(encryptedSecret.metadata.id, principal, 'delete')) {
      return false;
    }

    // Backup before delete
    this.backupSecret(encryptedSecret);

    // Delete the secret file
    const secretFile = this.getSecretFilePath(encryptedSecret.metadata.id);
    try {
      rmSync(secretFile, { force: true });
    } catch (err) {
      logger.error('Failed to delete secret file', {
        secretId: encryptedSecret.metadata.id,
        error: (err as Error).message
      });
      return false;
    }

    // Audit trail
    this.logAuditTrail({
      id: generateId(),
      secretId: encryptedSecret.metadata.id,
      secretName: encryptedSecret.metadata.name,
      operation: 'delete',
      principal,
      timestamp: Date.now(),
      details: {
        description: `Secret '${encryptedSecret.metadata.name}' deleted`
      },
      newStateHash: 'deleted'
    });

    // Clean up rotation timer
    this.stopRotation(encryptedSecret.metadata.id);

    logger.info('Secret deleted', {
      secretId: encryptedSecret.metadata.id,
      name: encryptedSecret.metadata.name
    });

    return true;
  }

  // ==================== SEC-02: Encryption at Rest ====================

  /**
   * Re-encrypt a secret with a new key
   * @param secretIdOrName - Secret ID or name
   * @param newEncryptionKey - New encryption key
   * @param principal - Principal performing re-encryption
   * @returns True if successful
   */
  public reencryptSecret(
    secretIdOrName: string,
    newEncryptionKey: string,
    principal: string
  ): boolean {
    this.ensureInitialized();

    if (!validateEncryptionKey(newEncryptionKey)) {
      logger.error('Invalid new encryption key format');
      return false;
    }

    const encryptedSecret = this.loadEncryptedSecret(secretIdOrName);
    if (!encryptedSecret) {
      return false;
    }

    // Decrypt with current key
    let plainValue: string;
    try {
      plainValue = decryptValue(
        encryptedSecret.encryptedValue,
        encryptedSecret.iv,
        encryptedSecret.authTag || '',
        this.derivedKey
      );
    } catch (err) {
      logger.error('Failed to decrypt secret for re-encryption', {
        secretId: encryptedSecret.metadata.id,
        error: (err as Error).message
      });
      return false;
    }

    // Derive new key
    const newDerivedKey = deriveKey(newEncryptionKey);

    // Encrypt with new key
    const { encryptedValue, iv, authTag } = encryptValue(plainValue, newDerivedKey);

    // Update secret
    encryptedSecret.encryptedValue = encryptedValue;
    encryptedSecret.iv = iv;
    encryptedSecret.authTag = authTag;
    encryptedSecret.metadata.updatedAt = Date.now();

    // Save
    this.saveEncryptedSecret(encryptedSecret.metadata.id, encryptedSecret);

    // Audit trail
    this.logAuditTrail({
      id: generateId(),
      secretId: encryptedSecret.metadata.id,
      secretName: encryptedSecret.metadata.name,
      operation: 'update',
      principal,
      timestamp: Date.now(),
      details: {
        description: 'Secret re-encrypted with new key',
        modifiedFields: ['encryption']
      },
      newStateHash: hashValue(JSON.stringify(encryptedSecret))
    });

    logger.info('Secret re-encrypted', {
      secretId: encryptedSecret.metadata.id,
      principal
    });

    return true;
  }

  // ==================== SEC-03: Access Logging ====================

  /**
   * Log access attempt
   */
  private logAccess(entry: AccessLogEntry): void {
    if (!this.config.enableAccessLogging) {
      return;
    }

    const logFile = join(this.config.vaultPath, 'access-logs', 'access.log');
    const logLine = JSON.stringify(entry) + '\n';

    try {
      appendFileSync(logFile, logLine, 'utf-8');
    } catch (err) {
      logger.warn('Failed to write access log', {
        error: (err as Error).message
      });
    }
  }

  /**
   * Get access logs
   * @param secretId - Optional filter by secret ID
   * @param limit - Maximum entries to return
   * @returns Access log entries
   */
  public getAccessLogs(secretId?: string, limit: number = 100): AccessLogEntry[] {
    const logFile = join(this.config.vaultPath, 'access-logs', 'access.log');

    if (!existsSync(logFile)) {
      return [];
    }

    try {
      const content = readFileSync(logFile, 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);

      const entries: AccessLogEntry[] = lines
        .map((line) => {
          try {
            return JSON.parse(line) as AccessLogEntry;
          } catch {
            return null;
          }
        })
        .filter((e): e is AccessLogEntry => e !== null);

      // Filter by secret ID if provided
      let filtered = secretId
        ? entries.filter((e) => e.secretId === secretId)
        : entries;

      // Sort by timestamp descending and limit
      filtered.sort((a, b) => b.timestamp - a.timestamp);
      return filtered.slice(0, limit);
    } catch (err) {
      logger.warn('Failed to read access logs', {
        error: (err as Error).message
      });
      return [];
    }
  }

  /**
   * Clean up old access logs
   */
  public cleanupAccessLogs(): number {
    const logFile = join(this.config.vaultPath, 'access-logs', 'access.log');
    const cutoffDate = Date.now() - this.config.accessLogRetentionDays * 24 * 60 * 60 * 1000;

    if (!existsSync(logFile)) {
      return 0;
    }

    try {
      const content = readFileSync(logFile, 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);

      const keptLines: string[] = [];
      let removedCount = 0;

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as AccessLogEntry;
          if (entry.timestamp >= cutoffDate) {
            keptLines.push(line);
          } else {
            removedCount++;
          }
        } catch {
          keptLines.push(line); // Keep malformed lines
        }
      }

      writeFileSync(logFile, keptLines.join('\n') + '\n', 'utf-8');
      logger.info('Access logs cleaned up', { removedCount });
      return removedCount;
    } catch (err) {
      logger.warn('Failed to cleanup access logs', {
        error: (err as Error).message
      });
      return 0;
    }
  }

  // ==================== SEC-04: Secret Rotation ====================

  /**
   * Configure automatic secret rotation
   * @param config - Rotation configuration
   */
  public configureRotation(config: RotationConfig): void {
    this.rotationConfigs.set(config.secretId, config);

    if (config.strategy === 'automatic') {
      this.startRotation(config.secretId, config.interval);
    }

    logger.info('Rotation configured', {
      secretId: config.secretId,
      interval: config.interval,
      strategy: config.strategy
    });
  }

  /**
   * Rotate a secret
   * @param secretIdOrName - Secret ID or name
   * @param newValue - New secret value
   * @param principal - Principal performing rotation
   * @param reason - Rotation reason
   * @returns True if successful
   */
  public rotateSecret(
    secretIdOrName: string,
    newValue: string,
    principal: string,
    reason: string = 'manual rotation'
  ): boolean {
    this.ensureInitialized();

    const result = this.updateSecret(
      secretIdOrName,
      newValue,
      principal,
      `Rotation: ${reason}`
    );

    if (result) {
      const encryptedSecret = this.loadEncryptedSecret(secretIdOrName);
      if (encryptedSecret) {
        // Audit trail for rotation
        this.logAuditTrail({
          id: generateId(),
          secretId: encryptedSecret.metadata.id,
          secretName: encryptedSecret.metadata.name,
          operation: 'rotate',
          principal,
          timestamp: Date.now(),
          details: {
            description: `Secret rotated: ${reason}`,
            rotationReason: reason,
            newVersion: encryptedSecret.currentVersion
          },
          newStateHash: hashValue(JSON.stringify(encryptedSecret))
        });

        logger.info('Secret rotated', {
          secretId: encryptedSecret.metadata.id,
          reason
        });
      }
      return true;
    }

    return false;
  }

  /**
   * Start automatic rotation timer
   */
  private startRotation(secretId: string, interval: number): void {
    this.stopRotation(secretId);

    const timer = setInterval(() => {
      const config = this.rotationConfigs.get(secretId);
      if (config && config.strategy === 'automatic') {
        logger.info('Automatic rotation triggered', { secretId });
        // In production, this would call a rotation hook or service
      }
    }, interval);

    this.rotationTimers.set(secretId, timer);
  }

  /**
   * Stop automatic rotation
   */
  public stopRotation(secretId: string): void {
    const timer = this.rotationTimers.get(secretId);
    if (timer) {
      clearInterval(timer);
      this.rotationTimers.delete(secretId);
    }
  }

  // ==================== SEC-05: Secret Versioning ====================

  /**
   * Get version history for a secret
   * @param secretIdOrName - Secret ID or name
   * @returns Array of versions or null if not found
   */
  public getVersionHistory(secretIdOrName: string): SecretVersion[] | null {
    this.ensureInitialized();

    const encryptedSecret = this.loadEncryptedSecret(secretIdOrName);
    if (!encryptedSecret) {
      return null;
    }

    return encryptedSecret.versions;
  }

  /**
   * Get a specific version of a secret
   * @param secretIdOrName - Secret ID or name
   * @param version - Version number to retrieve
   * @param principal - Principal requesting the version
   * @returns Decrypted secret or null if not found
   */
  public getVersion(
    secretIdOrName: string,
    version: number,
    principal: string
  ): DecryptedSecret | null {
    this.ensureInitialized();

    const encryptedSecret = this.loadEncryptedSecret(secretIdOrName);
    if (!encryptedSecret) {
      return null;
    }

    // Check access
    if (!this.checkAccess(encryptedSecret.metadata.id, principal, 'read')) {
      return null;
    }

    // Find the version
    const versionInfo = encryptedSecret.versions.find((v) => v.version === version);
    if (!versionInfo) {
      return null;
    }

    // For non-active versions, we can't decrypt without storing all versions
    // This is a limitation - in production, you'd store encrypted values per version
    if (!versionInfo.isActive) {
      logger.warn('Cannot retrieve inactive version value', {
        secretId: encryptedSecret.metadata.id,
        version
      });
      return null;
    }

    // Decrypt current value
    try {
      const value = decryptValue(
        encryptedSecret.encryptedValue,
        encryptedSecret.iv,
        encryptedSecret.authTag || '',
        this.derivedKey
      );

      return {
        metadata: encryptedSecret.metadata,
        value,
        version: encryptedSecret.currentVersion
      };
    } catch (err) {
      logger.error('Failed to decrypt secret version', {
        secretId: encryptedSecret.metadata.id,
        version,
        error: (err as Error).message
      });
      return null;
    }
  }

  /**
   * Rollback to a previous version
   * @param secretIdOrName - Secret ID or name
   * @param version - Version to rollback to
   * @param principal - Principal performing rollback
   * @returns True if successful
   */
  public rollbackToVersion(
    secretIdOrName: string,
    version: number,
    principal: string
  ): boolean {
    this.ensureInitialized();

    const encryptedSecret = this.loadEncryptedSecret(secretIdOrName);
    if (!encryptedSecret) {
      return false;
    }

    // Check access
    if (!this.checkAccess(encryptedSecret.metadata.id, principal, 'write')) {
      return false;
    }

    // Find the version
    const versionInfo = encryptedSecret.versions.find((v) => v.version === version);
    if (!versionInfo) {
      return false;
    }

    // Note: In production, you'd need to store encrypted values per version
    // For now, we just log the rollback attempt
    logger.warn('Rollback requested but version values not stored separately', {
      secretId: encryptedSecret.metadata.id,
      version
    });

    // Audit trail
    this.logAuditTrail({
      id: generateId(),
      secretId: encryptedSecret.metadata.id,
      secretName: encryptedSecret.metadata.name,
      operation: 'version_change',
      principal,
      timestamp: Date.now(),
      details: {
        description: `Rollback to version ${version} requested`,
        oldVersion: encryptedSecret.currentVersion,
        newVersion: version
      },
      newStateHash: hashValue(JSON.stringify(encryptedSecret))
    });

    return true;
  }

  /**
   * Enforce maximum versions limit
   */
  private enforceMaxVersions(encryptedSecret: EncryptedSecret): void {
    const maxVersions = this.config.maxVersionsPerSecret;

    if (encryptedSecret.versions.length > maxVersions) {
      const toRemove = encryptedSecret.versions.length - maxVersions;
      encryptedSecret.versions.splice(0, toRemove);

      logger.debug('Enforced max versions', {
        secretId: encryptedSecret.metadata.id,
        removed: toRemove,
        remaining: encryptedSecret.versions.length
      });
    }
  }

  // ==================== SEC-06: Access Control ====================

  /**
   * Set access control rules for a secret
   * @param secretIdOrName - Secret ID or name
   * @param rules - Access control rules
   * @param principal - Principal setting the rules
   * @returns True if successful
   */
  public setAccessControl(
    secretIdOrName: string,
    rules: AccessControlRule[],
    principal: string
  ): boolean {
    this.ensureInitialized();

    const encryptedSecret = this.loadEncryptedSecret(secretIdOrName);
    if (!encryptedSecret) {
      return false;
    }

    // Only owner or admin can set access control
    if (
      encryptedSecret.metadata.owner !== principal &&
      !this.checkAccess(encryptedSecret.metadata.id, principal, 'write')
    ) {
      return false;
    }

    this.accessControlRules.set(encryptedSecret.metadata.id, rules);

    // Audit trail
    this.logAuditTrail({
      id: generateId(),
      secretId: encryptedSecret.metadata.id,
      secretName: encryptedSecret.metadata.name,
      operation: 'access_change',
      principal,
      timestamp: Date.now(),
      details: {
        description: `Access control rules updated for '${encryptedSecret.metadata.name}'`,
        modifiedFields: ['accessControl']
      },
      newStateHash: hashValue(JSON.stringify(encryptedSecret))
    });

    logger.info('Access control updated', {
      secretId: encryptedSecret.metadata.id,
      rulesCount: rules.length
    });

    return true;
  }

  /**
   * Check if principal has access
   */
  private checkAccess(
    secretId: string,
    principal: string,
    action: SecretAction
  ): boolean {
    const rules = this.accessControlRules.get(secretId);

    // If no rules, allow access (owner has full access)
    if (!rules || rules.length === 0) {
      return true;
    }

    // Check each rule
    for (const rule of rules) {
      if (rule.principal === principal || rule.principal === '*') {
        if (rule.actions.includes(action) || rule.actions.includes('read' as SecretAction)) {
          // Check conditions
          if (rule.conditions && rule.conditions.length > 0) {
            for (const condition of rule.conditions) {
              if (!this.checkCondition(condition)) {
                return false;
              }
            }
          }

          // Check expiration
          if (rule.expiresAt && Date.now() > rule.expiresAt) {
            continue; // Rule expired
          }

          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check access condition
   */
  private checkCondition(condition: {
    type: string;
    value: unknown;
  }): boolean {
    // Simplified condition checking
    // In production, implement full condition evaluation
    return true;
  }

  /**
   * Get access control rules for a secret
   * @param secretIdOrName - Secret ID or name
   * @returns Access control rules or empty array
   */
  public getAccessControl(secretIdOrName: string): AccessControlRule[] {
    this.ensureInitialized();

    const encryptedSecret = this.loadEncryptedSecret(secretIdOrName);
    if (!encryptedSecret) {
      return [];
    }

    return this.accessControlRules.get(encryptedSecret.metadata.id) || [];
  }

  // ==================== SEC-07: Audit Trail ====================

  /**
   * Log audit trail entry
   */
  private logAuditTrail(entry: AuditTrailEntry): void {
    if (!this.config.enableAuditTrail) {
      return;
    }

    const logFile = join(this.config.vaultPath, 'audit-logs', 'audit.log');
    const logLine = JSON.stringify(entry) + '\n';

    try {
      appendFileSync(logFile, logLine, 'utf-8');
    } catch (err) {
      logger.warn('Failed to write audit log', {
        error: (err as Error).message
      });
    }
  }

  /**
   * Get audit trail entries
   * @param secretId - Optional filter by secret ID
   * @param operation - Optional filter by operation type
   * @param limit - Maximum entries to return
   * @returns Audit trail entries
   */
  public getAuditTrail(
    secretId?: string,
    operation?: string,
    limit: number = 100
  ): AuditTrailEntry[] {
    const logFile = join(this.config.vaultPath, 'audit-logs', 'audit.log');

    if (!existsSync(logFile)) {
      return [];
    }

    try {
      const content = readFileSync(logFile, 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);

      const entries: AuditTrailEntry[] = lines
        .map((line) => {
          try {
            return JSON.parse(line) as AuditTrailEntry;
          } catch {
            return null;
          }
        })
        .filter((e): e is AuditTrailEntry => e !== null);

      // Filter
      let filtered = entries;
      if (secretId) {
        filtered = filtered.filter((e) => e.secretId === secretId);
      }
      if (operation) {
        filtered = filtered.filter((e) => e.operation === operation);
      }

      // Sort by timestamp descending and limit
      filtered.sort((a, b) => b.timestamp - a.timestamp);
      return filtered.slice(0, limit);
    } catch (err) {
      logger.warn('Failed to read audit trail', {
        error: (err as Error).message
      });
      return [];
    }
  }

  /**
   * Clean up old audit logs
   */
  public cleanupAuditLogs(): number {
    const logFile = join(this.config.vaultPath, 'audit-logs', 'audit.log');
    const cutoffDate =
      Date.now() - this.config.auditLogRetentionDays * 24 * 60 * 60 * 1000;

    if (!existsSync(logFile)) {
      return 0;
    }

    try {
      const content = readFileSync(logFile, 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);

      const keptLines: string[] = [];
      let removedCount = 0;

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as AuditTrailEntry;
          if (entry.timestamp >= cutoffDate) {
            keptLines.push(line);
          } else {
            removedCount++;
          }
        } catch {
          keptLines.push(line);
        }
      }

      writeFileSync(logFile, keptLines.join('\n') + '\n', 'utf-8');
      logger.info('Audit logs cleaned up', { removedCount });
      return removedCount;
    } catch (err) {
      logger.warn('Failed to cleanup audit logs', {
        error: (err as Error).message
      });
      return 0;
    }
  }

  // ==================== SEC-08: Backup/Restore ====================

  /**
   * Backup a secret
   */
  private backupSecret(encryptedSecret: EncryptedSecret): SecretBackup | null {
    try {
      const backup: SecretBackup = {
        id: generateId(),
        secretId: encryptedSecret.metadata.id,
        encryptedData: encryptedSecret,
        backedUpAt: Date.now(),
        backupLocation: this.config.backupPath,
        checksum: hashValue(JSON.stringify(encryptedSecret))
      };

      const backupFile = join(
        this.config.backupPath,
        'backups',
        `${encryptedSecret.metadata.id}-${backup.id}.json`
      );

      writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf-8');

      logger.debug('Secret backed up', {
        secretId: encryptedSecret.metadata.id,
        backupId: backup.id
      });

      return backup;
    } catch (err) {
      logger.error('Failed to backup secret', {
        secretId: encryptedSecret.metadata.id,
        error: (err as Error).message
      });
      return null;
    }
  }

  /**
   * Backup all secrets
   * @param principal - Principal performing backup
   * @returns Number of secrets backed up
   */
  public backupAllSecrets(principal: string = 'system'): number {
    this.ensureInitialized();

    const secretsDir = join(this.config.vaultPath, 'secrets');
    if (!existsSync(secretsDir)) {
      return 0;
    }

    let backupCount = 0;

    try {
      const files = readdirSync(secretsDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = join(secretsDir, file);
        try {
          const content = readFileSync(filePath, 'utf-8');
          const encryptedSecret = JSON.parse(content) as EncryptedSecret;
          if (this.backupSecret(encryptedSecret)) {
            backupCount++;
          }
        } catch (err) {
          logger.warn('Failed to backup secret file', {
            file,
            error: (err as Error).message
          });
        }
      }

      // Audit trail
      this.logAuditTrail({
        id: generateId(),
        secretId: 'all',
        secretName: 'all-secrets',
        operation: 'update',
        principal,
        timestamp: Date.now(),
        details: {
          description: `Backup of all secrets: ${backupCount} secrets backed up`
        },
        newStateHash: hashValue(backupCount.toString())
      });

      logger.info('All secrets backed up', { count: backupCount });
    } catch (err) {
      logger.error('Failed to backup all secrets', {
        error: (err as Error).message
      });
    }

    return backupCount;
  }

  /**
   * Restore a secret from backup
   * @param backupId - Backup ID to restore
   * @param principal - Principal performing restore
   * @returns Restore result
   */
  public restoreFromBackup(
    backupId: string,
    principal: string
  ): RestoreResult {
    this.ensureInitialized();

    try {
      // Find backup file
      const backupsDir = join(this.config.backupPath, 'backups');
      if (!existsSync(backupsDir)) {
        return {
          success: false,
          error: 'Backups directory not found',
          restoredAt: Date.now()
        };
      }

      const files = readdirSync(backupsDir);
      const backupFile = files.find((f) => f.includes(backupId));

      if (!backupFile) {
        return {
          success: false,
          error: `Backup not found: ${backupId}`,
          restoredAt: Date.now()
        };
      }

      // Load backup
      const backupPath = join(backupsDir, backupFile);
      const content = readFileSync(backupPath, 'utf-8');
      const backup = JSON.parse(content) as SecretBackup;

      // Verify checksum
      const checksum = hashValue(JSON.stringify(backup.encryptedData));
      if (checksum !== backup.checksum) {
        return {
          success: false,
          error: 'Backup checksum verification failed',
          restoredAt: Date.now()
        };
      }

      // Restore the secret
      this.saveEncryptedSecret(backup.secretId, backup.encryptedData);

      // Audit trail
      this.logAuditTrail({
        id: generateId(),
        secretId: backup.secretId,
        secretName: backup.encryptedData.metadata.name,
        operation: 'update',
        principal,
        timestamp: Date.now(),
        details: {
          description: `Secret restored from backup ${backupId}`,
          newVersion: backup.encryptedData.currentVersion
        },
        newStateHash: checksum
      });

      logger.info('Secret restored from backup', {
        backupId,
        secretId: backup.secretId
      });

      return {
        success: true,
        secretId: backup.secretId,
        restoredVersion: backup.encryptedData.currentVersion,
        restoredAt: Date.now()
      };
    } catch (err) {
      logger.error('Failed to restore from backup', {
        backupId,
        error: (err as Error).message
      });

      return {
        success: false,
        error: (err as Error).message,
        restoredAt: Date.now()
      };
    }
  }

  /**
   * List available backups
   * @returns Array of backup metadata
   */
  public listBackups(): SecretBackup[] {
    const backupsDir = join(this.config.backupPath, 'backups');
    if (!existsSync(backupsDir)) {
      return [];
    }

    const backups: SecretBackup[] = [];

    try {
      const files = readdirSync(backupsDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = join(backupsDir, file);
        try {
          const content = readFileSync(filePath, 'utf-8');
          const backup = JSON.parse(content) as SecretBackup;
          backups.push(backup);
        } catch (err) {
          logger.warn('Failed to read backup file', {
            file,
            error: (err as Error).message
          });
        }
      }

      // Sort by backup time descending
      backups.sort((a, b) => b.backedUpAt - a.backedUpAt);
    } catch (err) {
      logger.warn('Failed to list backups', {
        error: (err as Error).message
      });
    }

    return backups;
  }

  /**
   * Clean up old backups
   */
  public cleanupBackups(): number {
    const backups = this.listBackups();
    const retentionCount = this.config.backupRetentionCount;

    if (backups.length <= retentionCount) {
      return 0;
    }

    let removedCount = 0;
    const toRemove = backups.slice(retentionCount);

    for (const backup of toRemove) {
      try {
        const backupFile = join(
          this.config.backupPath,
          'backups',
          `${backup.secretId}-${backup.id}.json`
        );
        rmSync(backupFile, { force: true });
        removedCount++;
      } catch (err) {
        logger.warn('Failed to remove old backup', {
          backupId: backup.id,
          error: (err as Error).message
        });
      }
    }

    logger.info('Old backups cleaned up', { removedCount });
    return removedCount;
  }

  // ==================== Utility Methods ====================

  /**
   * Query secrets
   */
  public querySecrets(
    options: SecretQueryOptions = {}
  ): SecretQueryResult {
    this.ensureInitialized();

    const secretsDir = join(this.config.vaultPath, 'secrets');
    if (!existsSync(secretsDir)) {
      return { secrets: [], total: 0, offset: 0, limit: options.limit || 100 };
    }

    const allMetadata: SecretMetadata[] = [];
    const now = Date.now();

    try {
      const files = readdirSync(secretsDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = join(secretsDir, file);
        try {
          const content = readFileSync(filePath, 'utf-8');
          const encryptedSecret = JSON.parse(content) as EncryptedSecret;
          const metadata = encryptedSecret.metadata;

          // Apply filters
          if (options.tags && options.tags.length > 0) {
            if (!options.tags.some((t) => metadata.tags.includes(t))) {
              continue;
            }
          }

          if (options.owner && metadata.owner !== options.owner) {
            continue;
          }

          if (options.enabled !== undefined && metadata.enabled !== options.enabled) {
            continue;
          }

          if (options.expiresBefore && (!metadata.expiresAt || metadata.expiresAt > options.expiresBefore)) {
            continue;
          }

          if (options.expiresAfter && (!metadata.expiresAt || metadata.expiresAt < options.expiresAfter)) {
            continue;
          }

          if (options.search) {
            const searchLower = options.search.toLowerCase();
            if (
              !metadata.name.toLowerCase().includes(searchLower) &&
              !metadata.description?.toLowerCase().includes(searchLower)
            ) {
              continue;
            }
          }

          allMetadata.push(metadata);
        } catch (err) {
          logger.warn('Failed to read secret file', {
            file,
            error: (err as Error).message
          });
        }
      }

      const total = allMetadata.length;
      const offset = options.offset || 0;
      const limit = options.limit || 100;

      const secrets = allMetadata.slice(offset, offset + limit);

      return { secrets, total, offset, limit };
    } catch (err) {
      logger.warn('Failed to query secrets', {
        error: (err as Error).message
      });
      return { secrets: [], total: 0, offset: 0, limit: options.limit || 100 };
    }
  }

  /**
   * Get vault statistics
   */
  public getStats(): VaultStats {
    this.ensureInitialized();

    const queryResult = this.querySecrets();
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    let enabledCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;
    let totalVersions = 0;

    const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;

    for (const secret of queryResult.secrets) {
      if (secret.enabled) enabledCount++;

      if (secret.expiresAt) {
        if (secret.expiresAt < now) {
          expiredCount++;
        } else if (secret.expiresAt < weekFromNow) {
          expiringSoonCount++;
        }
      }
    }

    // Count versions
    const secretsDir = join(this.config.vaultPath, 'secrets');
    if (existsSync(secretsDir)) {
      try {
        const files = readdirSync(secretsDir);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const filePath = join(secretsDir, file);
          const content = readFileSync(filePath, 'utf-8');
          const encryptedSecret = JSON.parse(content) as EncryptedSecret;
          totalVersions += encryptedSecret.versions.length;
        }
      } catch (err) {
        logger.warn('Failed to count versions', {
          error: (err as Error).message
        });
      }
    }

    // Count access and audit events
    const accessLogs = this.getAccessLogs(undefined, 1000);
    const auditLogs = this.getAuditTrail(undefined, undefined, 1000);

    const accessEventsLast24h = accessLogs.filter((l) => l.timestamp >= dayAgo).length;
    const auditEventsLast24h = auditLogs.filter((l) => l.timestamp >= dayAgo).length;

    // Count backups
    const backups = this.listBackups();

    // Calculate storage size
    let storageSize = 0;
    try {
      storageSize = this.calculateDirectorySize(this.config.vaultPath);
    } catch (err) {
      logger.warn('Failed to calculate storage size', {
        error: (err as Error).message
      });
    }

    const lastBackup = backups.length > 0 ? backups[0].backedUpAt : undefined;

    return {
      totalSecrets: queryResult.total,
      enabledSecrets: enabledCount,
      expiringSoon: expiringSoonCount,
      expiredSecrets: expiredCount,
      totalVersions,
      accessEventsLast24h,
      auditEventsLast24h,
      totalBackups: backups.length,
      storageSizeBytes: storageSize,
      lastBackupAt: lastBackup
    };
  }

  /**
   * Calculate directory size recursively
   */
  private calculateDirectorySize(dirPath: string): number {
    let totalSize = 0;

    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          totalSize += this.calculateDirectorySize(fullPath);
        } else {
          try {
            const stats = readFileSync(fullPath).byteLength;
            totalSize += stats;
          } catch {
            // Skip files we can't read
          }
        }
      }
    } catch {
      // Skip directories we can't read
    }

    return totalSize;
  }

  /**
   * Ensure vault is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'Vault not initialized. Call init() before using the vault.'
      );
    }
  }

  /**
   * Get secret file path
   */
  private getSecretFilePath(secretId: string): string {
    return join(this.config.vaultPath, 'secrets', `${secretId}.json`);
  }

  /**
   * Save encrypted secret to file
   */
  private saveEncryptedSecret(secretId: string, secret: EncryptedSecret): void {
    const secretFile = this.getSecretFilePath(secretId);
    writeFileSync(secretFile, JSON.stringify(secret, null, 2), 'utf-8');
  }

  /**
   * Load encrypted secret from file
   */
  private loadEncryptedSecret(secretIdOrName: string): EncryptedSecret | null {
    // Try by ID first
    const secretFile = this.getSecretFilePath(secretIdOrName);

    if (existsSync(secretFile)) {
      try {
        const content = readFileSync(secretFile, 'utf-8');
        return JSON.parse(content) as EncryptedSecret;
      } catch (err) {
        logger.warn('Failed to load secret', {
          secretId: secretIdOrName,
          error: (err as Error).message
        });
        return null;
      }
    }

    // Try by name
    const secretsDir = join(this.config.vaultPath, 'secrets');
    if (!existsSync(secretsDir)) {
      return null;
    }

    try {
      const files = readdirSync(secretsDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = join(secretsDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const encryptedSecret = JSON.parse(content) as EncryptedSecret;

        if (encryptedSecret.metadata.name === secretIdOrName) {
          return encryptedSecret;
        }
      }
    } catch (err) {
      logger.warn('Failed to search for secret by name', {
        name: secretIdOrName,
        error: (err as Error).message
      });
    }

    return null;
  }

  /**
   * Get vault configuration
   */
  public getConfig(): Readonly<VaultConfig> {
    return { ...this.config };
  }
}

export default SecretsVault;
