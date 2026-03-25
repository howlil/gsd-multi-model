#!/usr/bin/env node

/**
 * Session Import — Import session data from exported files
 *
 * Validates session structure and chain integrity
 * Supports model-specific adapters
 */

import * as fs from 'fs';
import { SessionImportError } from './session-errors.js';
import { defaultLogger as logger } from './logger.js';
import type { Session, SessionMetadata, SessionContext, SessionState } from './session-chain.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface ImportOptions {
  sourceModel?: string;
}

export interface ImportResult {
  success: true;
  sessionId: string;
  warnings: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface SessionData {
  metadata?: Partial<SessionMetadata>;
  context?: Partial<SessionContext>;
  state?: Partial<SessionState>;
  session?: Session;
}

export interface SessionManagerLike {
  createSession(options: { model?: string | null; phase?: number | null; plan?: number | null }): string;
  updateSession(sessionId: string, updates: Record<string, unknown>): boolean;
  loadSession(sessionId: string): Session | null;
}

// ─── SessionImport Class ────────────────────────────────────────────────────

/**
 * SessionImport provides session import functionality with validation
 */
export class SessionImport {
  private sessionManager: SessionManagerLike;

  /**
   * Create a SessionImport instance
   * @param sessionManager - SessionManager instance
   */
  constructor(sessionManager: SessionManagerLike) {
    this.sessionManager = sessionManager;
  }

  /**
   * Import a session from file
   * @param sessionFile - Path to session file
   * @param options - Import options
   * @returns Import result with sessionId and warnings
   */
  import(sessionFile: string, options: ImportOptions = {}): ImportResult {
    const { sourceModel } = options;
    const warnings: string[] = [];

    // Read and parse file
    let importedData: SessionData;
    try {
      const content = fs.readFileSync(sessionFile, 'utf-8');
      importedData = JSON.parse(content);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new SessionImportError(`Failed to parse JSON: ${errorMessage}`, [errorMessage]);
    }

    // Handle model-specific format conversion
    if (sourceModel) {
      importedData = this.importFromModelSpecificFormat(importedData, sourceModel);
    }

    // Validate structure
    const structureValidation = this.validateStructure(importedData);
    if (!structureValidation.valid) {
      throw new SessionImportError('Invalid session structure', structureValidation.errors);
    }

    // Validate session chain
    const chainValidation = this.validateSessionChain(importedData);
    if (!chainValidation.valid) {
      throw new SessionImportError('Invalid session chain', chainValidation.errors);
    }

    // Validate chain links exist
    const linksValidation = this.validateChainLinksExist(importedData);
    if (linksValidation.warnings && linksValidation.warnings.length > 0) {
      warnings.push(...linksValidation.warnings);
    }

    // Create new session
    const sessionData = importedData.session || importedData;
    const newSessionId = this.sessionManager.createSession({
      model: sessionData.metadata?.model || null,
      phase: sessionData.metadata?.phase || null,
      plan: sessionData.metadata?.plan || null
    });

    // Merge imported context and state
    const updates: Record<string, unknown> = {
      context: sessionData.context || {},
      state: sessionData.state || {}
    };

    // Add previous session to chain
    const previousSessionId = sessionData.metadata?.session_id;
    if (previousSessionId) {
      updates.metadata = {
        session_chain: [previousSessionId]
      };
    }

    this.sessionManager.updateSession(newSessionId, updates);

    logger.info('Session imported', { sessionId: newSessionId, sourceFile: sessionFile });

    return {
      success: true,
      sessionId: newSessionId,
      warnings
    };
  }

  /**
   * Validate session structure
   * @param session - Session object
   * @returns Validation result
   */
  validateStructure(session: SessionData): ValidationResult {
    const errors: string[] = [];

    // Check for export wrapper or direct session
    const sessionData = session.session || session;

    if (!sessionData.metadata) {
      errors.push('Missing metadata section');
    } else {
      if (!sessionData.metadata.session_id) {
        errors.push('Missing metadata.session_id');
      }
      if (!sessionData.metadata.started_at) {
        errors.push('Missing metadata.started_at');
      }
      if (!sessionData.metadata.session_version) {
        errors.push('Missing metadata.session_version');
      }
    }

    if (!sessionData.context) {
      errors.push('Missing context section');
    } else {
      if (!Array.isArray(sessionData.context.tasks)) {
        errors.push('context.tasks must be an array');
      }
      if (!Array.isArray(sessionData.context.decisions)) {
        errors.push('context.decisions must be an array');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate session chain integrity
   * @param session - Session object
   * @returns Validation result
   */
  validateSessionChain(session: SessionData): ValidationResult {
    const errors: string[] = [];
    const sessionData = session.session || session;

    if (sessionData.metadata?.session_chain) {
      const chain = sessionData.metadata.session_chain;
      const sessionId = sessionData.metadata.session_id;

      if (!Array.isArray(chain)) {
        errors.push('session_chain must be an array');
      } else if (chain.includes(sessionId || '')) {
        errors.push('Circular reference detected: session_chain includes current session_id');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate chain links exist in session manager
   * @param session - Session object
   * @returns Validation result with warnings
   */
  validateChainLinksExist(session: SessionData): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const sessionData = session.session || session;

    if (sessionData.metadata?.session_chain) {
      const chain = sessionData.metadata.session_chain;
      const missingLinks: string[] = [];

      for (const id of chain) {
        const linkedSession = this.sessionManager.loadSession(id);
        if (!linkedSession) {
          missingLinks.push(id);
        }
      }

      if (missingLinks.length > 0) {
        warnings.push(`Missing chain links: ${missingLinks.join(', ')}`);
      }
    }

    return {
      valid: true,
      warnings
    };
  }

  /**
   * Import from model-specific format
   * @param data - Data to convert
   * @param sourceModel - Source model name
   * @returns Converted session object
   */
  importFromModelSpecificFormat(data: SessionData, sourceModel: string): SessionData {
    // If data has session wrapper, use it
    if (data.session) {
      return data.session;
    }

    // Model-specific adapters (can be extended)
    switch (sourceModel.toLowerCase()) {
      case 'claude':
        return this._adaptClaudeFormat(data);
      case 'qwen':
        return this._adaptQwenFormat(data);
      case 'openai':
        return this._adaptOpenAIFormat(data);
      case 'kimi':
        return this._adaptKimiFormat(data);
      default:
        // Assume standard format
        return data;
    }
  }

  /**
   * Adapt Claude-specific format
   * @private
   */
  private _adaptClaudeFormat(data: SessionData): SessionData {
    // Claude format adapter (placeholder)
    return data;
  }

  /**
   * Adapt Qwen-specific format
   * @private
   */
  private _adaptQwenFormat(data: SessionData): SessionData {
    // Qwen format adapter (placeholder)
    return data;
  }

  /**
   * Adapt OpenAI-specific format
   * @private
   */
  private _adaptOpenAIFormat(data: SessionData): SessionData {
    // OpenAI format adapter (placeholder)
    return data;
  }

  /**
   * Adapt Kimi-specific format
   * @private
   */
  private _adaptKimiFormat(data: SessionData): SessionData {
    // Kimi format adapter (placeholder)
    return data;
  }
}
