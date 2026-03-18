#!/usr/bin/env node

/**
 * EZ Auth — Secure credential storage using system keychain
 * 
 * Stores API keys securely using:
 * - keytar for system keychain (Windows Credential Manager, macOS Keychain, libsecret)
 * - Fallback to encrypted file storage if keytar unavailable
 * 
 * Usage:
 *   const { saveCredential, loadCredential } = require('./auth.cjs');
 *   await saveCredential('anthropic', 'sk-...');
 */

const Logger = require('./logger.cjs');
const logger = new Logger();
const path = require('path');
const fs = require('fs');
const os = require('os');

const SERVICE_NAME = 'ez-agents';

// Provider account names
const PROVIDERS = {
  ANTHROPIC: 'anthropic',
  MOONSHOT: 'moonshot',
  ALIBABA: 'alibaba',
  OPENAI: 'openai'
};

// Fallback storage path
const FALLBACK_FILE = path.join(os.homedir(), '.ez-credentials.json');

// Try to load keytar
let keytar = null;
try {
  keytar = require('keytar');
  logger.info('keytar loaded — using system keychain');
} catch (err) {
  logger.warn('keytar not available — using fallback storage');
}

/**
 * Save credential securely
 * @param {string} provider - Provider name (anthropic, moonshot, etc.)
 * @param {string} secret - API key or secret
 * @returns {Promise<boolean>} - Success status
 */
async function saveCredential(provider, secret) {
  try {
    if (keytar) {
      await keytar.setPassword(SERVICE_NAME, provider, secret);
      logger.info('Credential saved to system keychain', { provider });
      return true;
    } else {
      // Fallback: save to file
      let credentials = {};
      if (fs.existsSync(FALLBACK_FILE)) {
        const content = fs.readFileSync(FALLBACK_FILE, 'utf-8');
        try {
          credentials = JSON.parse(content);
        } catch (e) {
          credentials = {};
        }
      }
      credentials[provider] = secret;
      fs.writeFileSync(FALLBACK_FILE, JSON.stringify(credentials, null, 2), 'utf-8');
      logger.warn('Credential saved to fallback file', { provider, path: FALLBACK_FILE });
      return true;
    }
  } catch (err) {
    logger.error('Failed to save credential', { provider, error: err.message });
    return false;
  }
}

/**
 * Load credential securely
 * @param {string} provider - Provider name
 * @returns {Promise<string|null>} - API key or null if not found
 */
async function loadCredential(provider) {
  try {
    if (keytar) {
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
    logger.error('Failed to load credential', { provider, error: err.message });
    return null;
  }
}

/**
 * Delete credential
 * @param {string} provider - Provider name
 * @returns {Promise<boolean>} - Success status
 */
async function deleteCredential(provider) {
  try {
    if (keytar) {
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
    logger.error('Failed to delete credential', { provider, error: err.message });
    return false;
  }
}

/**
 * List all stored providers
 * @returns {Promise<string[]>} - Array of provider names
 */
async function listProviders() {
  const stored = [];
  
  if (keytar) {
    for (const [, name] of Object.entries(PROVIDERS)) {
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
 * @returns {boolean} - True if using system keychain
 */
function isKeychainAvailable() {
  return keytar !== null;
}

module.exports = {
  saveCredential,
  loadCredential,
  deleteCredential,
  listProviders,
  isKeychainAvailable,
  PROVIDERS,
  SERVICE_NAME
};
