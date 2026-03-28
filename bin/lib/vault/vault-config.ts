/**
 * Secrets Vault Configuration
 *
 * Manages vault configuration with secure defaults and environment variable support.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { defaultLogger as logger } from '../logger/index.js';
import type { VaultConfig } from './vault-types.js';

// Re-export VaultConfig type
export type { VaultConfig };

/**
 * Default vault configuration
 */
const DEFAULT_CONFIG: Omit<VaultConfig, 'encryptionKey'> = {
  vaultPath: join(process.cwd(), '.planning', 'vault'),
  backupPath: join(process.cwd(), '.planning', 'vault-backups'),
  enableAccessLogging: true,
  enableAuditTrail: true,
  maxVersionsPerSecret: 10,
  backupRetentionCount: 5,
  accessLogRetentionDays: 90,
  auditLogRetentionDays: 365
};

/**
 * Environment variable names for vault configuration
 */
const ENV_VARS = {
  VAULT_PATH: 'EZ_VAULT_PATH',
  BACKUP_PATH: 'EZ_VAULT_BACKUP_PATH',
  ENCRYPTION_KEY: 'EZ_VAULT_ENCRYPTION_KEY',
  ENABLE_ACCESS_LOGGING: 'EZ_VAULT_ENABLE_ACCESS_LOGGING',
  ENABLE_AUDIT_TRAIL: 'EZ_VAULT_ENABLE_AUDIT_TRAIL',
  MAX_VERSIONS: 'EZ_VAULT_MAX_VERSIONS',
  BACKUP_RETENTION: 'EZ_VAULT_BACKUP_RETENTION'
} as const;

/**
 * Generate a secure random encryption key
 * @returns Base64-encoded 32-byte key (256 bits for AES-256)
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('base64');
}

/**
 * Validate encryption key format
 * @param key - Key to validate
 * @returns True if valid 32-byte key (base64 encoded)
 */
export function validateEncryptionKey(key: string): boolean {
  try {
    const decoded = Buffer.from(key, 'base64');
    return decoded.length === 32;
  } catch {
    return false;
  }
}

/**
 * Load configuration from environment variables
 * @returns Partial vault configuration
 */
function loadFromEnv(): Partial<VaultConfig> {
  const config: Partial<VaultConfig> = {};

  if (process.env[ENV_VARS.VAULT_PATH]) {
    config.vaultPath = process.env[ENV_VARS.VAULT_PATH];
  }

  if (process.env[ENV_VARS.BACKUP_PATH]) {
    config.backupPath = process.env[ENV_VARS.BACKUP_PATH];
  }

  if (process.env[ENV_VARS.ENCRYPTION_KEY]) {
    const key = process.env[ENV_VARS.ENCRYPTION_KEY];
    if (validateEncryptionKey(key)) {
      config.encryptionKey = key;
    } else {
      logger.warn('Invalid encryption key format in environment', {
        expected: '32-byte base64-encoded key',
        hint: `Use generateEncryptionKey() to create a valid key`
      });
    }
  }

  if (process.env[ENV_VARS.ENABLE_ACCESS_LOGGING]) {
    config.enableAccessLogging = process.env[ENV_VARS.ENABLE_ACCESS_LOGGING] === 'true';
  }

  if (process.env[ENV_VARS.ENABLE_AUDIT_TRAIL]) {
    config.enableAuditTrail = process.env[ENV_VARS.ENABLE_AUDIT_TRAIL] === 'true';
  }

  if (process.env[ENV_VARS.MAX_VERSIONS]) {
    const maxVersions = parseInt(process.env[ENV_VARS.MAX_VERSIONS], 10);
    if (!isNaN(maxVersions) && maxVersions > 0) {
      config.maxVersionsPerSecret = maxVersions;
    }
  }

  if (process.env[ENV_VARS.BACKUP_RETENTION]) {
    const retention = parseInt(process.env[ENV_VARS.BACKUP_RETENTION], 10);
    if (!isNaN(retention) && retention > 0) {
      config.backupRetentionCount = retention;
    }
  }

  return config;
}

/**
 * Configuration file path
 */
const CONFIG_FILE = join(process.cwd(), '.planning', 'vault-config.json');

/**
 * Load configuration from file
 * @returns Partial vault configuration or null if file doesn't exist
 */
function loadFromFile(): Partial<VaultConfig> | null {
  try {
    if (!existsSync(CONFIG_FILE)) {
      return null;
    }

    const content = readFileSync(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(content) as Partial<VaultConfig>;

    // Don't load encryption key from file for security
    const { encryptionKey, ...safeConfig } = config;
    if (encryptionKey) {
      logger.warn('Encryption key found in config file - ignoring for security');
    }

    return safeConfig;
  } catch (err) {
    logger.warn('Failed to load vault config from file', {
      error: (err as Error).message
    });
    return null;
  }
}

/**
 * Save configuration to file (excluding encryption key)
 * @param config - Configuration to save
 */
export function saveConfigToFile(config: Partial<VaultConfig>): void {
  try {
    const configDir = join(process.cwd(), '.planning');
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    // Remove encryption key before saving
    const { encryptionKey, ...safeConfig } = config;

    writeFileSync(CONFIG_FILE, JSON.stringify(safeConfig, null, 2), 'utf-8');
    logger.info('Vault configuration saved', { path: CONFIG_FILE });
  } catch (err) {
    logger.error('Failed to save vault config', {
      error: (err as Error).message
    });
  }
}

/**
 * Initialize vault directories
 * @param config - Vault configuration
 */
export function initVaultDirectories(config: VaultConfig): void {
  try {
    // Create vault directory
    if (!existsSync(config.vaultPath)) {
      mkdirSync(config.vaultPath, { recursive: true });
      logger.debug('Vault directory created', { path: config.vaultPath });
    }

    // Create backup directory
    if (!existsSync(config.backupPath)) {
      mkdirSync(config.backupPath, { recursive: true });
      logger.debug('Backup directory created', { path: config.backupPath });
    }

    // Create subdirectories for organization
    const subdirs = ['secrets', 'access-logs', 'audit-logs', 'backups'];
    for (const subdir of subdirs) {
      const vaultSubdir = join(config.vaultPath, subdir);
      if (!existsSync(vaultSubdir)) {
        mkdirSync(vaultSubdir, { recursive: true });
      }

      const backupSubdir = join(config.backupPath, subdir);
      if (!existsSync(backupSubdir)) {
        mkdirSync(backupSubdir, { recursive: true });
      }
    }
  } catch (err) {
    logger.error('Failed to initialize vault directories', {
      error: (err as Error).message
    });
    throw err;
  }
}

/**
 * Get the effective vault configuration
 * Priority: Environment > File > Defaults
 * @param overrides - Optional configuration overrides
 * @returns Complete vault configuration
 */
export function getVaultConfig(overrides?: Partial<VaultConfig>): VaultConfig {
  const defaults = { ...DEFAULT_CONFIG };
  const fileConfig = loadFromFile();
  const envConfig = loadFromEnv();

  // Merge configurations (priority: overrides > env > file > defaults)
  const config: VaultConfig = {
    ...defaults,
    ...fileConfig,
    ...envConfig,
    ...overrides
  } as VaultConfig;

  // Encryption key must be provided
  if (!config.encryptionKey) {
    logger.warn('No encryption key provided - generating temporary key');
    logger.warn('WARNING: Temporary key will not persist across restarts');
    logger.warn(`Set ${ENV_VARS.ENCRYPTION_KEY} environment variable for production use`);
    config.encryptionKey = generateEncryptionKey();
  }

  // Validate encryption key
  if (!validateEncryptionKey(config.encryptionKey)) {
    const error = new Error(
      'Invalid encryption key. Must be a 32-byte base64-encoded key.'
    );
    logger.error('Invalid vault encryption key', {
      keyLength: Buffer.from(config.encryptionKey, 'base64').length,
      expected: 32
    });
    throw error;
  }

  return config;
}

/**
 * Check if vault is properly configured
 * @returns Configuration status
 */
export interface VaultConfigStatus {
  /** Whether vault is configured */
  configured: boolean;
  /** Whether encryption key is set */
  hasEncryptionKey: boolean;
  /** Whether vault directory exists */
  vaultDirExists: boolean;
  /** Whether backup directory exists */
  backupDirExists: boolean;
  /** Issues found */
  issues: string[];
}

export function checkVaultConfigStatus(): VaultConfigStatus {
  const status: VaultConfigStatus = {
    configured: true,
    hasEncryptionKey: !!process.env[ENV_VARS.ENCRYPTION_KEY],
    vaultDirExists: existsSync(DEFAULT_CONFIG.vaultPath),
    backupDirExists: existsSync(DEFAULT_CONFIG.backupPath),
    issues: []
  };

  if (!status.hasEncryptionKey) {
    status.issues.push(
      `Encryption key not set. Set ${ENV_VARS.ENCRYPTION_KEY} environment variable.`
    );
    status.configured = false;
  }

  if (!status.vaultDirExists) {
    status.issues.push(
      `Vault directory does not exist: ${DEFAULT_CONFIG.vaultPath}`
    );
  }

  if (!status.backupDirExists) {
    status.issues.push(
      `Backup directory does not exist: ${DEFAULT_CONFIG.backupPath}`
    );
  }

  return status;
}

/**
 * Create a sample .env file with vault configuration
 * @param filePath - Path to write the .env file
 */
export function createVaultEnvExample(filePath: string): void {
  const envContent = `# Secrets Vault Configuration
# Generate a secure encryption key using: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Encryption key (32-byte base64-encoded key for AES-256)
${ENV_VARS.ENCRYPTION_KEY}=

# Vault storage path (optional, defaults to .planning/vault)
${ENV_VARS.VAULT_PATH}=.planning/vault

# Backup storage path (optional, defaults to .planning/vault-backups)
${ENV_VARS.BACKUP_PATH}=.planning/vault-backups

# Enable access logging (optional, defaults to true)
${ENV_VARS.ENABLE_ACCESS_LOGGING}=true

# Enable audit trail (optional, defaults to true)
${ENV_VARS.ENABLE_AUDIT_TRAIL}=true

# Maximum versions to keep per secret (optional, defaults to 10)
${ENV_VARS.MAX_VERSIONS}=10

# Backup retention count (optional, defaults to 5)
${ENV_VARS.BACKUP_RETENTION}=5
`;

  try {
    writeFileSync(filePath, envContent, 'utf-8');
    logger.info('Vault .env example created', { path: filePath });
  } catch (err) {
    logger.warn('Failed to create vault .env example', {
      error: (err as Error).message
    });
  }
}
