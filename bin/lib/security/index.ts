/**
 * Security Module
 */

export {
  SecurityOpsError,
  SecurityProviderError,
  SecurityComplianceError,
  SecurityAuditError,
  type SecurityErrorContext,
  type SecurityErrorData
} from './security-errors.js';

export { authenticate, authorize, type AuthResult, type AuthOptions } from './auth.js';

// Secrets Vault
export {
  SecretsVault,
  type VaultConfig,
  type VaultStats,
  type VaultError,
  type VaultErrorCode,
  type SecretMetadata,
  type SecretVersion,
  type EncryptedSecret,
  type DecryptedSecret,
  type AccessControlRule,
  type AccessLogEntry,
  type AuditTrailEntry,
  type SecretBackup,
  type RestoreResult,
  type SecretQueryOptions,
  type SecretQueryResult,
  type RotationConfig,
  type SecretAction
} from '../vault/secrets-vault.js';

export {
  generateEncryptionKey,
  validateEncryptionKey,
  getVaultConfig,
  saveConfigToFile,
  initVaultDirectories,
  checkVaultConfigStatus,
  createVaultEnvExample
} from '../vault/vault-config.js';

export type {
  AccessCondition,
  TimeRange,
  IpRange,
  AuditDetails,
  VaultErrorContext,
  VaultConfigStatus
} from '../vault/vault-types.js';
