/**
 * Secrets Vault Module
 *
 * Secure secret management with encryption at rest, access control,
 * versioning, rotation, audit trails, and backup/restore capabilities.
 *
 * @example
 * ```typescript
 * import { SecretsVault, generateEncryptionKey } from './vault/index.js';
 *
 * const vault = new SecretsVault({
 *   encryptionKey: generateEncryptionKey(),
 *   vaultPath: '.planning/vault'
 * });
 *
 * vault.init();
 *
 * // Store a secret
 * vault.storeSecret('api-key', 'sk-123456', { owner: 'admin' });
 *
 * // Retrieve a secret
 * const secret = vault.getSecret('api-key', 'admin');
 * ```
 */

export { SecretsVault } from './secrets-vault.js';

export {
  generateEncryptionKey,
  validateEncryptionKey,
  getVaultConfig,
  saveConfigToFile,
  initVaultDirectories,
  checkVaultConfigStatus,
  createVaultEnvExample,
  type VaultConfig,
  type VaultConfigStatus
} from './vault-config.js';

export type {
  VaultStats,
  VaultError,
  VaultErrorCode,
  SecretMetadata,
  SecretVersion,
  EncryptedSecret,
  DecryptedSecret,
  AccessControlRule,
  AccessLogEntry,
  AuditTrailEntry,
  SecretBackup,
  RestoreResult,
  SecretQueryOptions,
  SecretQueryResult,
  RotationConfig,
  SecretAction,
  AccessCondition,
  TimeRange,
  IpRange,
  AuditDetails,
  VaultErrorContext
} from './vault-types.js';
