/**
 * Security Errors — Structured error handling for security operations
 *
 * Provides discriminated union types and error classes for security operations.
 */

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface SecurityErrorContext {
  operation?: string;
  provider?: string;
  complianceStandard?: string;
  [key: string]: unknown;
}

export interface SecurityErrorData {
  name: string;
  message: string;
  context: SecurityErrorContext;
  timestamp: string;
}

// ─── Error Classes ──────────────────────────────────────────────────────────

/**
 * Base class for all security operation errors
 */
export class SecurityOpsError extends Error {
  public readonly context: SecurityErrorContext;
  public readonly timestamp: string;

  constructor(message: string, context: SecurityErrorContext = {}) {
    super(message);
    this.name = 'SecurityOpsError';
    this.context = context;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, SecurityOpsError);
  }

  toJSON(): SecurityErrorData {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp
    };
  }
}

/**
 * Error thrown when a security scan fails
 */
export class SecurityScanError extends SecurityOpsError {
  constructor(message: string, context: SecurityErrorContext = {}) {
    super(message, context);
    this.name = 'SecurityScanError';
  }
}

/**
 * Error thrown when a security provider operation fails
 */
export class SecurityProviderError extends SecurityOpsError {
  constructor(message: string, context: SecurityErrorContext = {}) {
    super(message, context);
    this.name = 'SecurityProviderError';
  }
}

/**
 * Error thrown when compliance requirements are not met
 */
export class SecurityComplianceError extends SecurityOpsError {
  constructor(message: string, context: SecurityErrorContext = {}) {
    super(message, context);
    this.name = 'SecurityComplianceError';
  }
}

/**
 * Error thrown when a security audit operation fails
 */
export class SecurityAuditError extends SecurityOpsError {
  constructor(message: string, context: SecurityErrorContext = {}) {
    super(message, context);
    this.name = 'SecurityAuditError';
  }
}

// ─── Default Export ─────────────────────────────────────────────────────────

export default {
  SecurityOpsError,
  SecurityScanError,
  SecurityProviderError,
  SecurityComplianceError,
  SecurityAuditError
};
