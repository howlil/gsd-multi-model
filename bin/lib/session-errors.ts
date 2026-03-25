#!/usr/bin/env node

/**
 * Session Error Classes
 *
 * Provides structured error handling for session operations
 */

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface SessionErrorDetails {
  code?: string;
  details?: Record<string, unknown>;
  sessionId?: string;
  chain?: string[];
  format?: string;
  reason?: string;
  validationErrors?: string[];
  [key: string]: unknown;
}

export interface SessionErrorOptions {
  code?: string;
  details?: Record<string, unknown>;
}

// ─── SessionError Base Class ────────────────────────────────────────────────

/**
 * Base class for all session-related errors
 */
export class SessionError extends Error {
  public code: string;
  public details: Record<string, unknown>;
  public timestamp: string;

  constructor(message: string, options: SessionErrorOptions = {}) {
    super(message);
    this.name = 'SessionError';
    this.code = options.code || 'SESSION_ERROR';
    this.details = options.details || {};
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, SessionError);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

// ─── SessionNotFoundError ───────────────────────────────────────────────────

/**
 * Error thrown when a session is not found
 */
export class SessionNotFoundError extends SessionError {
  public sessionId: string;

  constructor(sessionId: string, options: SessionErrorOptions = {}) {
    super(`Session '${sessionId}' not found`, {
      code: 'SESSION_NOT_FOUND',
      details: { sessionId, ...options.details }
    });
    this.name = 'SessionNotFoundError';
    this.sessionId = sessionId;
  }
}

// ─── SessionChainError ──────────────────────────────────────────────────────

/**
 * Error thrown for session chain operations
 */
export class SessionChainError extends SessionError {
  public chain: string[];

  constructor(message: string, chain: string[] = [], options: SessionErrorOptions = {}) {
    super(message, {
      code: 'SESSION_CHAIN_ERROR',
      details: { chain, ...options.details }
    });
    this.name = 'SessionChainError';
    this.chain = chain;
  }
}

// ─── SessionExportError ─────────────────────────────────────────────────────

/**
 * Error thrown during session export operations
 */
export class SessionExportError extends SessionError {
  public format: string;
  public reason: string;

  constructor(format: string, reason: string, options: SessionErrorOptions = {}) {
    super(`Export failed for format '${format}': ${reason}`, {
      code: 'SESSION_EXPORT_ERROR',
      details: { format, reason, ...options.details }
    });
    this.name = 'SessionExportError';
    this.format = format;
    this.reason = reason;
  }
}

// ─── SessionImportError ─────────────────────────────────────────────────────

/**
 * Error thrown during session import operations
 */
export class SessionImportError extends SessionError {
  public validationErrors: string[];

  constructor(message: string, validationErrors: string[] = [], options: SessionErrorOptions = {}) {
    super(message, {
      code: 'SESSION_IMPORT_ERROR',
      details: { validationErrors, ...options.details }
    });
    this.name = 'SessionImportError';
    this.validationErrors = validationErrors;
  }
}
