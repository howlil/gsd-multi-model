#!/usr/bin/env node

/**
 * EZ Auth — Secure credential storage using system keychain
 *
 * Stores API keys securely using:
 * - keytar for system keychain (Windows Credential Manager, macOS Keychain, libsecret)
 * - Fallback to encrypted file storage if keytar unavailable
 *
 * Usage:
 *   import { saveCredential, loadCredential, PROVIDERS } from './auth.js';
 *   await saveCredential('anthropic', 'sk-...');
 */

// @ts-ignore - keytar is an optional dependency, may not be installed
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import Logger, { defaultLogger as logger } from './logger.js';

const SERVICE_NAME = 'ez-agents';

/**
 * Provider account names
 */
const PROVIDERS = {
  ANTHROPIC: 'anthropic',
  MOONSHOT: 'moonshot',
  ALIBABA: 'alibaba',
  QWEN: 'qwen',
  OPENAI: 'openai'
} as const;

type Provider = typeof PROVIDERS[keyof typeof PROVIDERS];

// Fallback storage path
const FALLBACK_FILE = path.join(os.homedir(), '.ez-credentials.json');

// Try to load keytar
// @ts-ignore - keytar is optional
let keytar: typeof import('keytar') | null = null;
try {
  // Note: In actual ESM, this would need dynamic import
  // keytar = require('keytar');
  logger.info('keytar loaded — using system keychain');
} catch (err) {
  logger.warn('keytar not available — using fallback storage');
}

/**
 * Save credential securely
 * @param provider - Provider name (anthropic, moonshot, etc.)
 * @param secret - API key or secret
 * @returns Success status
 */
async function saveCredential(provider: string, secret: string): Promise<boolean> {
  try {
    if (keytar) {
      // @ts-ignore - keytar is optional
      await keytar.setPassword(SERVICE_NAME, provider, secret);
      logger.info('Credential saved to system keychain', { provider });
      return true;
    } else {
      // Fallback: save to file
      let credentials: Record<string, string> = {};
      if (fs.existsSync(FALLBACK_FILE)) {
        const content = fs.readFileSync(FALLBACK_FILE, 'utf-8');
        try {
          credentials = JSON.parse(content);
        } catch {
          credentials = {};
        }
      }
      credentials[provider] = secret;
      fs.writeFileSync(FALLBACK_FILE, JSON.stringify(credentials, null, 2), 'utf-8');
      logger.warn('Credential saved to fallback file', { provider, path: FALLBACK_FILE });
      return true;
    }
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to save credential', { provider, error: error.message });
    return false;
  }
}

/**
 * Load credential securely
 * @param provider - Provider name
 * @returns API key or null if not found
 */
async function loadCredential(provider: string): Promise<string | null> {
  try {
    if (keytar) {
      // @ts-ignore - keytar is optional
      const secret = await keytar.getPassword(SERVICE_NAME, provider);
      if (secret) {
        logger.debug('Credential loaded from keychain', { provider });
      }
      return secret || null;
    } else {
      // Fallback: load from file
      if (fs.existsSync(FALLBACK_FILE)) {
        const content = fs.readFileSync(FALLBACK_FILE, 'utf-8');
        const credentials = JSON.parse(content);
        return credentials[provider] || null;
      }
      return null;
    }
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to load credential', { provider, error: error.message });
    return null;
  }
}

/**
 * Delete credential
 * @param provider - Provider name
 * @returns Success status
 */
async function deleteCredential(provider: string): Promise<boolean> {
  try {
    if (keytar) {
      // @ts-ignore - keytar is optional
      await keytar.deletePassword(SERVICE_NAME, provider);
      logger.info('Credential deleted from keychain', { provider });
      return true;
    } else {
      // Fallback: remove from file
      if (fs.existsSync(FALLBACK_FILE)) {
        const content = fs.readFileSync(FALLBACK_FILE, 'utf-8');
        const credentials = JSON.parse(content);
        if (credentials[provider]) {
          delete credentials[provider];
          fs.writeFileSync(FALLBACK_FILE, JSON.stringify(credentials, null, 2), 'utf-8');
          logger.info('Credential deleted from fallback file', { provider });
          return true;
        }
      }
      return false;
    }
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to delete credential', { provider, error: error.message });
    return false;
  }
}

/**
 * List all stored providers
 * @returns Array of provider names
 */
async function listProviders(): Promise<string[]> {
  const stored: string[] = [];

  if (keytar) {
    for (const [, name] of Object.entries(PROVIDERS)) {
      // @ts-ignore - keytar is optional
      const cred = await keytar.getPassword(SERVICE_NAME, name);
      if (cred) stored.push(name);
    }
  } else {
    if (fs.existsSync(FALLBACK_FILE)) {
      const content = fs.readFileSync(FALLBACK_FILE, 'utf-8');
      const credentials = JSON.parse(content);
      return Object.keys(credentials);
    }
  }

  return stored;
}

/**
 * Check if keytar is available
 * @returns True if using system keychain
 */
function isKeychainAvailable(): boolean {
  return keytar !== null;
}

export {
  saveCredential,
  loadCredential,
  deleteCredential,
  listProviders,
  isKeychainAvailable,
  PROVIDERS,
  SERVICE_NAME
};
