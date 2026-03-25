/**
 * Git Utils — Git operations for version control
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { defaultLogger as logger } from './logger.js';

const execFileAsync = promisify(execFile);

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface GitStatus {
  isClean: boolean;
  modified: string[];
  staged: string[];
  untracked: string[];
}

export interface GitDiffResult {
  staged: string;
  unstaged: string;
}

export interface GitCommitOptions {
  message: string;
  files?: string[];
  allowEmpty?: boolean;
}

// ─── Git Functions ──────────────────────────────────────────────────────────

/**
 * Check if directory is a git repository
 */
export async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get git status
 */
export async function getGitStatus(cwd: string): Promise<GitStatus> {
  try {
    // Get modified files
    const { stdout: modifiedOut } = await execFileAsync('git', ['diff', '--name-only'], { cwd });
    const modified = modifiedOut.trim().split('\n').filter(Boolean);

    // Get staged files
    const { stdout: stagedOut } = await execFileAsync('git', ['diff', '--cached', '--name-only'], { cwd });
    const staged = stagedOut.trim().split('\n').filter(Boolean);

    // Get untracked files
    const { stdout: untrackedOut } = await execFileAsync('git', ['ls-files', '--others', '--exclude-standard'], { cwd });
    const untracked = untrackedOut.trim().split('\n').filter(Boolean);

    return {
      isClean: modified.length === 0 && staged.length === 0 && untracked.length === 0,
      modified,
      staged,
      untracked
    };
  } catch (err) {
    logger.error('Failed to get git status', {
      error: err instanceof Error ? err.message : 'Unknown'
    });
    return { isClean: true, modified: [], staged: [], untracked: [] };
  }
}

/**
 * Get git diff
 */
export async function getGitDiff(cwd: string): Promise<GitDiffResult> {
  try {
    const [{ stdout: staged }, { stdout: unstaged }] = await Promise.all([
      execFileAsync('git', ['diff', '--cached'], { cwd }),
      execFileAsync('git', ['diff'], { cwd })
    ]);

    return { staged, unstaged };
  } catch (err) {
    logger.error('Failed to get git diff', {
      error: err instanceof Error ? err.message : 'Unknown'
    });
    return { staged: '', unstaged: '' };
  }
}

/**
 * Stage files for commit
 */
export async function gitAdd(cwd: string, files: string[]): Promise<void> {
  if (files.length === 0) return;
  
  try {
    await execFileAsync('git', ['add', ...files], { cwd });
  } catch (err) {
    logger.error('Failed to stage files', {
      files,
      error: err instanceof Error ? err.message : 'Unknown'
    });
    throw err;
  }
}

/**
 * Create a commit
 */
export async function gitCommit(cwd: string, options: GitCommitOptions): Promise<string> {
  const { message, files, allowEmpty = false } = options;
  
  try {
    if (files && files.length > 0) {
      await gitAdd(cwd, files);
    }

    const args = ['commit', '-m', message];
    if (allowEmpty) {
      args.push('--allow-empty');
    }

    await execFileAsync('git', args, { cwd });
    return message;
  } catch (err) {
    logger.error('Failed to commit', {
      message,
      error: err instanceof Error ? err.message : 'Unknown'
    });
    throw err;
  }
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
    return stdout.trim();
  } catch (err) {
    logger.error('Failed to get current branch', {
      error: err instanceof Error ? err.message : 'Unknown'
    });
    return 'unknown';
  }
}

/**
 * Create a new branch
 */
export async function createBranch(cwd: string, branchName: string): Promise<void> {
  try {
    await execFileAsync('git', ['checkout', '-b', branchName], { cwd });
  } catch (err) {
    logger.error('Failed to create branch', {
      branchName,
      error: err instanceof Error ? err.message : 'Unknown'
    });
    throw err;
  }
}

// Default export for backward compatibility
export default {
  isGitRepo,
  getGitStatus,
  getGitDiff,
  gitAdd,
  gitCommit,
  getCurrentBranch,
  createBranch
};
