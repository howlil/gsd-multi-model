/**
 * Git Errors — Structured error handling for git operations
 *
 * Provides discriminated union types and error classes for git workflow operations.
 */

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface GitErrorOptions {
  code?: string;
  details?: Record<string, unknown>;
}

export interface GitErrorData {
  name: string;
  code: string;
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
}

// ─── Error Classes ──────────────────────────────────────────────────────────

/**
 * Base class for all git workflow errors
 */
export class GitWorkflowError extends Error {
  public readonly code: string;
  public readonly details: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(message: string, options: GitErrorOptions = {}) {
    super(message);
    this.name = 'GitWorkflowError';
    this.code = options.code ?? 'GIT_WORKFLOW_ERROR';
    this.details = options.details ?? {};
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, GitWorkflowError);
  }

  toJSON(): GitErrorData {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * Error thrown when attempting to create a branch that already exists
 */
export class BranchExistsError extends GitWorkflowError {
  public readonly branchName: string;

  constructor(branchName: string, options: GitErrorOptions = {}) {
    super(`Branch '${branchName}' already exists`, {
      code: 'BRANCH_EXISTS',
      details: { branchName, ...options.details }
    });
    this.name = 'BranchExistsError';
    this.branchName = branchName;
  }
}

/**
 * Error thrown when a branch is not found
 */
export class BranchNotFoundError extends GitWorkflowError {
  public readonly branchName: string;

  constructor(branchName: string, options: GitErrorOptions = {}) {
    super(`Branch '${branchName}' does not exist`, {
      code: 'BRANCH_NOT_FOUND',
      details: { branchName, ...options.details }
    });
    this.name = 'BranchNotFoundError';
    this.branchName = branchName;
  }
}

/**
 * Error thrown when a merge operation encounters conflicts
 */
export class MergeConflictError extends GitWorkflowError {
  public readonly sourceBranch: string;
  public readonly targetBranch: string;
  public readonly conflictingFiles: string[];

  constructor(
    sourceBranch: string,
    targetBranch: string,
    conflictingFiles: string[] = [],
    options: GitErrorOptions = {}
  ) {
    super(`Merge conflict between '${sourceBranch}' and '${targetBranch}'`, {
      code: 'MERGE_CONFLICT',
      details: { sourceBranch, targetBranch, conflictingFiles, ...options.details }
    });
    this.name = 'MergeConflictError';
    this.sourceBranch = sourceBranch;
    this.targetBranch = targetBranch;
    this.conflictingFiles = conflictingFiles;
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationFailedError extends GitWorkflowError {
  public readonly validationType: string;
  public readonly failures: string[];

  constructor(validationType: string, failures: string[] = [], options: GitErrorOptions = {}) {
    super(`${validationType} validation failed`, {
      code: 'VALIDATION_FAILED',
      details: { validationType, failures, ...options.details }
    });
    this.name = 'ValidationFailedError';
    this.validationType = validationType;
    this.failures = failures;
  }
}

// ─── Default Export ─────────────────────────────────────────────────────────

export default {
  GitWorkflowError,
  BranchExistsError,
  BranchNotFoundError,
  MergeConflictError,
  ValidationFailedError
};
