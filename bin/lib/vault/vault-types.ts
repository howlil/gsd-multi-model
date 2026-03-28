/**
 * Secrets Vault Type Definitions
 *
 * Core types for the secrets vault implementation.
 * Supports encryption at rest, versioning, access control, and audit trails.
 */

/**
 * Secret metadata
 */
export interface SecretMetadata {
  /** Unique identifier for the secret */
  id: string;
  /** Secret name/key */
  name: string;
  /** Description of the secret's purpose */
  description?: string;
  /** Tags for categorization */
  tags: string[];
  /** Owner/creator of the secret */
  owner: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  updatedAt: number;
  /** Expiration timestamp (optional) */
  expiresAt?: number;
  /** Whether the secret is enabled */
  enabled: boolean;
}

/**
 * Secret version information
 */
export interface SecretVersion {
  /** Version number (incrementing integer) */
  version: number;
  /** Hash of the secret value */
  valueHash: string;
  /** Timestamp when this version was created */
  createdAt: number;
  /** User/service that created this version */
  createdBy: string;
  /** Optional description of changes */
  changeDescription?: string;
  /** Whether this version is the active one */
  isActive: boolean;
  /** Encryption algorithm used */
  encryptionAlgorithm: string;
}

/**
 * Encrypted secret data stored in the vault
 */
export interface EncryptedSecret {
  /** Metadata about the secret */
  metadata: SecretMetadata;
  /** Encrypted value (base64 encoded) */
  encryptedValue: string;
  /** Initialization vector for encryption (base64 encoded) */
  iv: string;
  /** Authentication tag for AEAD encryption (base64 encoded) */
  authTag?: string;
  /** Current version number */
  currentVersion: number;
  /** All versions of this secret */
  versions: SecretVersion[];
}

/**
 * Decrypted secret ready for use
 */
export interface DecryptedSecret {
  /** Metadata about the secret */
  metadata: SecretMetadata;
  /** Plain text value */
  value: string;
  /** Current version number */
  version: number;
}

/**
 * Access control rule for a secret
 */
export interface AccessControlRule {
  /** Principal (user, service, or role) */
  principal: string;
  /** Type of principal */
  principalType: 'user' | 'service' | 'role' | 'agent';
  /** Allowed actions */
  actions: SecretAction[];
  /** Conditions for access (optional) */
  conditions?: AccessCondition[];
  /** When this rule expires (optional) */
  expiresAt?: number;
}

/**
 * Actions that can be performed on secrets
 */
export type SecretAction = 'read' | 'write' | 'delete' | 'rotate' | 'audit';

/**
 * Conditions for access control
 */
export interface AccessCondition {
  /** Type of condition */
  type: 'timeRange' | 'ipRange' | 'agentType' | 'environment';
  /** Condition value */
  value: string | string[] | TimeRange | IpRange;
}

/**
 * Time range condition
 */
export interface TimeRange {
  start: string;  // ISO 8601 time
  end: string;    // ISO 8601 time
}

/**
 * IP range condition
 */
export interface IpRange {
  cidr: string;
}

/**
 * Access log entry
 */
export interface AccessLogEntry {
  /** Unique log entry ID */
  id: string;
  /** Secret ID that was accessed */
  secretId: string;
  /** Secret name */
  secretName: string;
  /** Principal who accessed the secret */
  principal: string;
  /** Principal type */
  principalType: 'user' | 'service' | 'role' | 'agent';
  /** Action performed */
  action: SecretAction;
  /** Whether access was granted */
  granted: boolean;
  /** Reason for denial (if applicable) */
  denialReason?: string;
  /** Timestamp of access */
  timestamp: number;
  /** IP address (if available) */
  ipAddress?: string;
  /** Additional context */
  context?: Record<string, string>;
}

/**
 * Audit trail entry for secret changes
 */
export interface AuditTrailEntry {
  /** Unique audit entry ID */
  id: string;
  /** Secret ID */
  secretId: string;
  /** Secret name */
  secretName: string;
  /** Type of operation */
  operation: 'create' | 'update' | 'delete' | 'rotate' | 'version_change' | 'access_change';
  /** Principal who performed the operation */
  principal: string;
  /** Timestamp */
  timestamp: number;
  /** Details of the change */
  details: AuditDetails;
  /** Previous state hash (for rollback verification) */
  previousStateHash?: string;
  /** New state hash */
  newStateHash: string;
}

/**
 * Details of an audit operation
 */
export interface AuditDetails {
  /** Description of what changed */
  description: string;
  /** Fields that were modified */
  modifiedFields?: string[];
  /** Old version number (if applicable) */
  oldVersion?: number;
  /** New version number (if applicable) */
  newVersion?: number;
  /** Rotation reason (if applicable) */
  rotationReason?: string;
}

/**
 * Backup data for a secret
 */
export interface SecretBackup {
  /** Backup ID */
  id: string;
  /** Secret ID */
  secretId: string;
  /** Encrypted secret data */
  encryptedData: EncryptedSecret;
  /** Backup timestamp */
  backedUpAt: number;
  /** Backup location/identifier */
  backupLocation: string;
  /** Checksum for integrity verification */
  checksum: string;
}

/**
 * Restore result
 */
export interface RestoreResult {
  /** Whether restore was successful */
  success: boolean;
  /** Secret ID that was restored */
  secretId?: string;
  /** Error message if failed */
  error?: string;
  /** Restored version */
  restoredVersion?: number;
  /** Timestamp of restore */
  restoredAt: number;
}

/**
 * Vault configuration
 */
export interface VaultConfig {
  /** Path to vault storage directory */
  vaultPath: string;
  /** Path to backup directory */
  backupPath: string;
  /** Encryption key (should be 32 bytes for AES-256) */
  encryptionKey: string;
  /** Whether to enable access logging */
  enableAccessLogging: boolean;
  /** Whether to enable audit trail */
  enableAuditTrail: boolean;
  /** Maximum number of versions to keep per secret */
  maxVersionsPerSecret: number;
  /** Backup retention count */
  backupRetentionCount: number;
  /** Access log retention days */
  accessLogRetentionDays: number;
  /** Audit log retention days */
  auditLogRetentionDays: number;
}

/**
 * Secret rotation configuration
 */
export interface RotationConfig {
  /** Secret ID to rotate */
  secretId: string;
  /** Rotation interval in milliseconds */
  interval: number;
  /** Rotation strategy */
  strategy: 'automatic' | 'manual';
  /** Notification recipients */
  notifyOnRotation?: string[];
  /** Pre-rotation hook (optional callback name) */
  preRotationHook?: string;
  /** Post-rotation hook (optional callback name) */
  postRotationHook?: string;
}

/**
 * Secret query options
 */
export interface SecretQueryOptions {
  /** Filter by tags */
  tags?: string[];
  /** Filter by owner */
  owner?: string;
  /** Filter by enabled status */
  enabled?: boolean;
  /** Filter by expiration */
  expiresBefore?: number;
  /** Filter by expiration */
  expiresAfter?: number;
  /** Search in name/description */
  search?: string;
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Query result with pagination
 */
export interface SecretQueryResult {
  /** Matching secrets */
  secrets: SecretMetadata[];
  /** Total count matching query */
  total: number;
  /** Current offset */
  offset: number;
  /** Limit used */
  limit: number;
}

/**
 * Vault statistics
 */
export interface VaultStats {
  /** Total number of secrets */
  totalSecrets: number;
  /** Number of enabled secrets */
  enabledSecrets: number;
  /** Number of secrets expiring soon */
  expiringSoon: number;
  /** Number of expired secrets */
  expiredSecrets: number;
  /** Total number of versions across all secrets */
  totalVersions: number;
  /** Number of access events in last 24h */
  accessEventsLast24h: number;
  /** Number of audit events in last 24h */
  auditEventsLast24h: number;
  /** Number of backups */
  totalBackups: number;
  /** Vault storage size in bytes */
  storageSizeBytes: number;
  /** Last backup timestamp */
  lastBackupAt?: number;
}

/**
 * Error context for vault operations
 */
export interface VaultErrorContext {
  /** Operation being performed */
  operation: string;
  /** Secret ID (if applicable) */
  secretId?: string;
  /** Secret name (if applicable) */
  secretName?: string;
  /** Principal (if applicable) */
  principal?: string;
  /** Additional context */
  [key: string]: unknown;
}

/**
 * Vault error types
 */
export type VaultErrorCode =
  | 'VAULT_NOT_INITIALIZED'
  | 'SECRET_NOT_FOUND'
  | 'SECRET_ALREADY_EXISTS'
  | 'SECRET_EXPIRED'
  | 'SECRET_DISABLED'
  | 'ACCESS_DENIED'
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED'
  | 'VERSION_NOT_FOUND'
  | 'BACKUP_FAILED'
  | 'RESTORE_FAILED'
  | 'INVALID_ENCRYPTION_KEY'
  | 'VAULT_CORRUPTED'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_ARGUMENT';

/**
 * Base vault error
 */
export interface VaultError {
  /** Error code */
  code: VaultErrorCode;
  /** Human-readable message */
  message: string;
  /** Error context */
  context: VaultErrorContext;
  /** Underlying error (if any) */
  cause?: Error;
}
