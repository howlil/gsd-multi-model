/**
 * Context Access Error Classes
 *
 * Provides structured error handling for context access operations
 * including file access, URL fetching, and security scanning.
 * Uses discriminated unions for type-safe error handling.
 */

// ─── Type Definitions ────────────────────────────────────────────────────────

/**
 * Severity level for errors
 */
export type SeverityLevel = 'critical' | 'error' | 'warning' | 'info' | 'debug';

/**
 * Error code registry interface
 */
interface ErrorCodeData {
  code: string;
  severity: SeverityLevel;
}

/**
 * Default error codes for context errors
 */
const CONTEXT_ERROR_CODES: Record<string, ErrorCodeData> = {
  ACCESS_DENIED: { code: 'ERR_CONTEXT_ACCESS_ERROR', severity: 'error' },
  URL_FETCH_FAILED: { code: 'ERR_CONTEXT_URL_FETCH_FAILED', severity: 'error' },
  FILE_ACCESS_FAILED: { code: 'ERR_CONTEXT_FILE_ACCESS_FAILED', severity: 'error' },
  SECURITY_SCAN_FAILED: { code: 'ERR_CONTEXT_SECURITY_SCAN_FAILED', severity: 'critical' }
};

// ─── Discriminated Union Types ───────────────────────────────────────────────

/**
 * Base context error type discriminator
 */
export type ContextErrorType =
  | 'CONTEXT_ACCESS_ERROR'
  | 'URL_FETCH_ERROR'
  | 'FILE_ACCESS_ERROR'
  | 'SECURITY_SCAN_ERROR';

/**
 * Security finding for XSS and other security issues
 */
export interface SecurityFinding {
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  pattern: string | null;
  matches: string[];
}

/**
 * Base context error interface
 */
export interface BaseContextError {
  type: ContextErrorType;
  code: string;
  severity: SeverityLevel;
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
}

/**
 * Context access error
 */
export interface ContextAccessErrorData extends BaseContextError {
  type: 'CONTEXT_ACCESS_ERROR';
  details: {
    [key: string]: unknown;
  };
}

/**
 * URL fetch error
 */
export interface URLFetchErrorData extends BaseContextError {
  type: 'URL_FETCH_ERROR';
  details: {
    url: string;
    reason: string;
    [key: string]: unknown;
  };
}

/**
 * File access error
 */
export interface FileAccessErrorData extends BaseContextError {
  type: 'FILE_ACCESS_ERROR';
  details: {
    path: string;
    reason: string;
    [key: string]: unknown;
  };
}

/**
 * Security scan error
 */
export interface SecurityScanErrorData extends BaseContextError {
  type: 'SECURITY_SCAN_ERROR';
  details: {
    findings: SecurityFinding[];
    [key: string]: unknown;
  };
}

/**
 * Discriminated union of all context error types
 */
export type ContextError =
  | ContextAccessErrorData
  | URLFetchErrorData
  | FileAccessErrorData
  | SecurityScanErrorData;

// ─── Error Classes ───────────────────────────────────────────────────────────

/**
 * Base class for context access errors
 */
export class ContextAccessError extends Error {
  readonly type: ContextErrorType = 'CONTEXT_ACCESS_ERROR';
  readonly code: string;
  readonly severity: SeverityLevel;
  readonly details: Record<string, unknown>;
  readonly timestamp: string;

  constructor(message: string, options: { code?: string; severity?: SeverityLevel; details?: Record<string, unknown> } = {}) {
    super(message);
    this.name = 'ContextAccessError';
    this.code = options.code ?? CONTEXT_ERROR_CODES.ACCESS_DENIED!.code;
    this.severity = options.severity ?? CONTEXT_ERROR_CODES.ACCESS_DENIED!.severity;
    this.details = options.details ?? {};
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, ContextAccessError);
  }

  /**
   * Convert error to plain object
   */
  toJSON(): Omit<ContextAccessErrorData, 'type'> {
    return {
      code: this.code,
      severity: this.severity,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * Error thrown when URL fetching fails
 */
export class URLFetchError extends ContextAccessError {
  override readonly type: 'URL_FETCH_ERROR' = 'URL_FETCH_ERROR';
  readonly url: string;
  readonly reason: string;

  constructor(url: string, reason: string, options: { details?: Record<string, unknown> } = {}) {
    super(`Failed to fetch URL: ${reason}`, {
      code: CONTEXT_ERROR_CODES.URL_FETCH_FAILED!.code,
      severity: CONTEXT_ERROR_CODES.URL_FETCH_FAILED!.severity,
      details: { url, reason, ...options.details }
    });
    this.name = 'URLFetchError';
    this.url = url;
    this.reason = reason;
  }

  override toJSON(): URLFetchErrorData {
    return {
      ...super.toJSON(),
      type: 'URL_FETCH_ERROR',
      details: {
        url: this.url,
        reason: this.reason,
        ...this.details
      }
    };
  }
}

/**
 * Error thrown when file access fails
 */
export class FileAccessError extends ContextAccessError {
  override readonly type: 'FILE_ACCESS_ERROR' = 'FILE_ACCESS_ERROR';
  readonly path: string;
  readonly reason: string;

  constructor(path: string, reason: string, options: { details?: Record<string, unknown> } = {}) {
    super(`Failed to access file: ${reason}`, {
      code: CONTEXT_ERROR_CODES.FILE_ACCESS_FAILED!.code,
      severity: CONTEXT_ERROR_CODES.FILE_ACCESS_FAILED!.severity,
      details: { path, reason, ...options.details }
    });
    this.name = 'FileAccessError';
    this.path = path;
    this.reason = reason;
  }

  override toJSON(): FileAccessErrorData {
    return {
      ...super.toJSON(),
      type: 'FILE_ACCESS_ERROR',
      details: {
        path: this.path,
        reason: this.reason,
        ...this.details
      }
    };
  }
}

/**
 * Error thrown when security scan fails
 */
export class SecurityScanError extends ContextAccessError {
  override readonly type: 'SECURITY_SCAN_ERROR' = 'SECURITY_SCAN_ERROR';
  readonly findings: SecurityFinding[];

  constructor(findings: SecurityFinding[], options: { details?: Record<string, unknown> } = {}) {
    super(`Security scan failed: ${findings.length} issue(s) detected`, {
      code: CONTEXT_ERROR_CODES.SECURITY_SCAN_FAILED!.code,
      severity: CONTEXT_ERROR_CODES.SECURITY_SCAN_FAILED!.severity,
      details: { findings, ...options.details }
    });
    this.name = 'SecurityScanError';
    this.findings = findings;
  }

  override toJSON(): SecurityScanErrorData {
    return {
      ...super.toJSON(),
      type: 'SECURITY_SCAN_ERROR',
      details: {
        findings: this.findings,
        ...this.details
      }
    };
  }
}
