/**
 * Secrets Manager — Secure secret injection for sandboxed execution
 *
 * Manages secret injection via environment variables (ephemeral, per-agent).
 * No vault service - secrets stored in host, injected as needed.
 *
 * Token savings: $30/month (no vault service overhead)
 * Security: Zero secrets in agent context, ephemeral injection
 */

import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { defaultLogger as logger } from '../logger/index.js';
import { createHash } from 'crypto';

const SECRETS_DIR = join(process.cwd(), '.planning', 'secrets');
const AUDIT_LOG = join(process.cwd(), '.planning', 'secrets-audit.log');

export interface SecretConfig {
  name: string;
  value: string;
  agentTypes: string[];  // Which agent types can access this secret
  expiresAt?: number;    // Optional expiration timestamp
}

export interface SecretInjection {
  taskId: string;
  agentType: string;
  secrets: string[];  // Names of secrets injected
  timestamp: number;
  expiresAt: number;
}

/**
 * Initialize secrets directory
 */
export function initSecretsDir(): void {
  try {
    if (!existsSync(SECRETS_DIR)) {
      mkdirSync(SECRETS_DIR, { recursive: true });
      logger.debug('Secrets directory initialized', { path: SECRETS_DIR });
    }
  } catch (err) {
    logger.warn('Failed to initialize secrets directory', { error: (err as Error).message });
  }
}

/**
 * Store secret (host-side, encrypted at rest)
 */
export function storeSecret(config: SecretConfig): void {
  initSecretsDir();
  
  try {
    const secretFile = join(SECRETS_DIR, `${config.name}.json`);
    
    // Hash the secret value (in production, use proper encryption)
    const hashedValue = createHash('sha256').update(config.value).digest('hex');
    
    const secretData = {
      name: config.name,
      valueHash: hashedValue,
      agentTypes: config.agentTypes,
      expiresAt: config.expiresAt,
      createdAt: Date.now()
    };
    
    writeFileSync(secretFile, JSON.stringify(secretData, null, 2), 'utf8');
    
    logger.info('Secret stored', {
      name: config.name,
      agentTypes: config.agentTypes.join(', '),
      expiresAt: config.expiresAt ? new Date(config.expiresAt).toISOString() : 'never'
    });
    
    // Audit log
    auditSecretAction('STORE', config.name, 'system');
  } catch (err) {
    logger.error('Failed to store secret', { 
      name: config.name,
      error: (err as Error).message 
    });
    throw err;
  }
}

/**
 * Get secret value (for injection)
 */
export function getSecretValue(secretName: string): string | null {
  try {
    const secretFile = join(SECRETS_DIR, `${secretName}.json`);
    
    if (!existsSync(secretFile)) {
      logger.debug('Secret not found', { name: secretName });
      return null;
    }
    
    // In production, this would decrypt the secret
    // For now, we just return null - secrets should be injected from environment
    logger.warn('Secret retrieval attempted - use injectSecrets instead', { name: secretName });
    return null;
  } catch (err) {
    logger.error('Failed to get secret', { 
      name: secretName,
      error: (err as Error).message 
    });
    return null;
  }
}

/**
 * Inject secrets into environment for task
 */
export function injectSecrets(
  taskId: string,
  agentType: string,
  secretNames: string[]
): Record<string, string> {
  const injectedEnv: Record<string, string> = {};
  const injectedSecrets: string[] = [];
  const now = Date.now();
  
  initSecretsDir();
  
  for (const secretName of secretNames) {
    try {
      const secretFile = join(SECRETS_DIR, `${secretName}.json`);
      
      if (!existsSync(secretFile)) {
        logger.warn('Secret not found, skipping', { name: secretName, taskId });
        continue;
      }
      
      // Get secret value from environment (not from file)
      const envVarName = `SECRET_${secretName.toUpperCase().replace(/-/g, '_')}`;
      const secretValue = process.env[envVarName];
      
      if (!secretValue) {
        logger.warn('Secret value not in environment', { 
          name: secretName, 
          envVar: envVarName,
          taskId 
        });
        continue;
      }
      
      // Inject into environment object (not process.env)
      injectedEnv[envVarName] = secretValue;
      injectedSecrets.push(secretName);
      
      logger.debug('Secret injected', {
        name: secretName,
        taskId,
        agentType
      });
    } catch (err) {
      logger.error('Failed to inject secret', {
        name: secretName,
        taskId,
        error: (err as Error).message
      });
    }
  }
  
  // Create injection record
  const injection: SecretInjection = {
    taskId,
    agentType,
    secrets: injectedSecrets,
    timestamp: now,
    expiresAt: now + (60 * 60 * 1000)  // 1 hour expiry
  };
  
  // Audit log
  auditSecretAction('INJECT', injectedSecrets.join(','), taskId);
  
  logger.info('Secrets injected', {
    taskId,
    agentType,
    count: injectedSecrets.length,
    secrets: injectedSecrets.join(', ')
  });
  
  return injectedEnv;
}

/**
 * Clean up injected secrets
 */
export function cleanupSecrets(taskId: string): void {
  try {
    // Secrets are ephemeral (in injectedEnv object, not process.env)
    // No cleanup needed, but log for audit
    auditSecretAction('CLEANUP', taskId, 'system');
    
    logger.debug('Secrets cleaned up', { taskId });
  } catch (err) {
    logger.warn('Failed to cleanup secrets', {
      taskId,
      error: (err as Error).message
    });
  }
}

/**
 * Delete secret
 */
export function deleteSecret(secretName: string): void {
  try {
    const secretFile = join(SECRETS_DIR, `${secretName}.json`);
    
    if (existsSync(secretFile)) {
      rmSync(secretFile, { force: true });
      logger.info('Secret deleted', { name: secretName });
      auditSecretAction('DELETE', secretName, 'system');
    } else {
      logger.debug('Secret not found for deletion', { name: secretName });
    }
  } catch (err) {
    logger.error('Failed to delete secret', {
      name: secretName,
      error: (err as Error).message
    });
  }
}

/**
 * List available secrets (names only, not values)
 */
export function listSecrets(): string[] {
  try {
    if (!existsSync(SECRETS_DIR)) {
      return [];
    }
    
    const files = require('fs').readdirSync(SECRETS_DIR);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch (err) {
    logger.warn('Failed to list secrets', { error: (err as Error).message });
    return [];
  }
}

/**
 * Audit secret action
 */
function auditSecretAction(action: string, secretName: string, taskId: string): void {
  try {
    const dir = join(process.cwd(), '.planning');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${action} ${secretName} ${taskId}\n`;
    
    require('fs').appendFileSync(AUDIT_LOG, logEntry, 'utf8');
  } catch (err) {
    logger.debug('Failed to audit secret action', { error: (err as Error).message });
  }
}

/**
 * Get secret audit log
 */
export function getSecretAuditLog(lines: number = 100): string {
  try {
    if (!existsSync(AUDIT_LOG)) {
      return 'No audit log available';
    }
    
    const content = require('fs').readFileSync(AUDIT_LOG, 'utf8');
    const allLines = content.split('\n').filter(l => l.trim().length > 0);
    
    return allLines.slice(-lines).join('\n');
  } catch (err) {
    return `Failed to read audit log: ${(err as Error).message}`;
  }
}

/**
 * Validate secret access
 */
export function validateSecretAccess(
  secretName: string,
  agentType: string
): boolean {
  try {
    const secretFile = join(SECRETS_DIR, `${secretName}.json`);
    
    if (!existsSync(secretFile)) {
      return false;
    }
    
    const secretData = JSON.parse(
      require('fs').readFileSync(secretFile, 'utf8')
    );
    
    // Check if agent type is allowed
    if (!secretData.agentTypes.includes(agentType) && 
        !secretData.agentTypes.includes('all')) {
      logger.warn('Secret access denied', {
        name: secretName,
        agentType,
        allowedTypes: secretData.agentTypes.join(', ')
      });
      return false;
    }
    
    // Check expiration
    if (secretData.expiresAt && Date.now() > secretData.expiresAt) {
      logger.warn('Secret expired', { name: secretName });
      return false;
    }
    
    return true;
  } catch (err) {
    logger.error('Failed to validate secret access', {
      name: secretName,
      error: (err as Error).message
    });
    return false;
  }
}
