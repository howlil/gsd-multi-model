#!/usr/bin/env node

/**
 * Git Workflow Error Classes
 *
 * Provides structured error handling for git operations
 */

class GitWorkflowError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'GitWorkflowError';
    this.code = options.code || 'GIT_WORKFLOW_ERROR';
    this.details = options.details || {};
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, GitWorkflowError);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

class BranchExistsError extends GitWorkflowError {
  constructor(branchName, options = {}) {
    super(`Branch '${branchName}' already exists`, {
      code: 'BRANCH_EXISTS',
      details: { branchName, ...options.details }
    });
    this.name = 'BranchExistsError';
    this.branchName = branchName;
  }
}

class BranchNotFoundError extends GitWorkflowError {
  constructor(branchName, options = {}) {
    super(`Branch '${branchName}' does not exist`, {
      code: 'BRANCH_NOT_FOUND',
      details: { branchName, ...options.details }
    });
    this.name = 'BranchNotFoundError';
    this.branchName = branchName;
  }
}

class MergeConflictError extends GitWorkflowError {
  constructor(sourceBranch, targetBranch, conflictingFiles = [], options = {}) {
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

class ValidationFailedError extends GitWorkflowError {
  constructor(validationType, failures = [], options = {}) {
    super(`${validationType} validation failed`, {
      code: 'VALIDATION_FAILED',
      details: { validationType, failures, ...options.details }
    });
    this.name = 'ValidationFailedError';
    this.validationType = validationType;
    this.failures = failures;
  }
}

module.exports = {
  GitWorkflowError,
  BranchExistsError,
  BranchNotFoundError,
  MergeConflictError,
  ValidationFailedError
};
