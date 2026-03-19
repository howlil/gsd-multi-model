#!/usr/bin/env node

/**
 * EZ Git Utils — Safe git operations with atomic commits
 * 
 * Provides:
 * - Atomic commits with validation
 * - Branch creation and management
 * - Safe git operations using execFile
 * - Error handling with recovery suggestions
 * 
 * Usage:
 *   const GitUtils = require('./git-utils.cjs');
 *   const git = new GitUtils(process.cwd());
 *   await git.commitAtomic('feat: add feature', ['file1.js']);
 */

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const Logger = require('./logger.cjs');
const logger = new Logger();
const { BranchExistsError, BranchNotFoundError } = require('./git-errors.cjs');
const { MergeConflictError } = require('./git-errors.cjs');

class GitUtils {
  constructor(cwd) {
    this.cwd = cwd || process.cwd();
  }

  /**
   * Execute git command safely
   */
  async exec(args, options = {}) {
    const { timeout = 30000 } = options;
    
    try {
      const { stdout, stderr } = await execFileAsync('git', args, {
        cwd: this.cwd,
        encoding: 'utf-8',
        timeout,
        maxBuffer: 10 * 1024 * 1024
      });
      
      logger.debug('Git command executed', { args, stdout_length: stdout?.length });
      
      return { stdout: stdout?.trim(), stderr: stderr?.trim() };
    } catch (err) {
      logger.error('Git command failed', { args, error: err.message });
      throw err;
    }
  }

  /**
   * Check if directory is a git repo
   */
  async isGitRepo() {
    try {
      await this.exec(['rev-parse', '--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch() {
    const { stdout } = await this.exec(['rev-parse', '--abbrev-ref', 'HEAD']);
    return stdout;
  }

  /**
   * Get git status (porcelain format)
   */
  async getStatus() {
    const { stdout } = await this.exec(['status', '--porcelain']);
    return stdout.split('\n').filter(line => line.trim());
  }

  /**
   * Check if there are uncommitted changes
   */
  async hasChanges() {
    const status = await this.getStatus();
    return status.length > 0;
  }

  /**
   * Stage files for commit
   */
  async add(files) {
    if (!Array.isArray(files)) files = [files];
    await this.exec(['add', ...files]);
    logger.info('Files staged', { files });
  }

  /**
   * Add all changes
   */
  async addAll() {
    await this.exec(['add', '-A']);
    logger.info('All files staged');
  }

  /**
   * Create atomic commit with validation
   */
  async commitAtomic(message, files = []) {
    // Stage files if provided
    if (files.length > 0) {
      await this.add(files);
    }
    
    // Validate commit message format (conventional commits)
    const conventionalPattern = /^(feat|fix|docs|chore|test|refactor|style|perf)(\([^)]+\))?:\s.+/;
    if (!conventionalPattern.test(message)) {
      logger.warn('Commit message may not follow conventional commits', { message });
    }
    
    // Create commit
    await this.exec(['commit', '-m', message]);
    
    // Get commit hash
    const { stdout } = await this.exec(['rev-parse', '--short', 'HEAD']);
    
    logger.info('Commit created', { hash: stdout, message });
    
    return stdout;
  }

  /**
   * Create new branch
   */
  async createBranch(name, from = 'HEAD') {
    await this.exec(['checkout', '-b', name, from]);
    logger.info('Branch created', { name, from });
    return name;
  }

  /**
   * Check if branch exists
   */
  async branchExists(branchName) {
    try {
      await this.exec(['rev-parse', '--verify', branchName]);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * List branches matching pattern
   */
  async listBranches(pattern = '*') {
    const { stdout } = await this.exec(['branch', '--list', pattern]);
    return stdout.split('\n')
      .map(b => b.trim().replace(/^\*\s*/, '').replace(/^\+\s*/, ''))
      .filter(b => b);
  }

  /**
   * Delete branch
   */
  async deleteBranch(branchName, force = false) {
    const exists = await this.branchExists(branchName);
    if (!exists) {
      throw new BranchNotFoundError(branchName);
    }
    const args = force ? ['branch', '-D', branchName] : ['branch', '-d', branchName];
    await this.exec(args);
    logger.info('Branch deleted', { branch: branchName, force });
  }

  /**
   * Get branch point (merge base with HEAD)
   */
  async getBranchPoint(branchName) {
    const { stdout } = await this.exec(['merge-base', 'HEAD', branchName]);
    return stdout;
  }

  /**
   * Check if merge would have conflicts
   */
  async hasConflicts(sourceBranch, targetBranch) {
    try {
      await this.exec(['merge-tree', targetBranch, sourceBranch]);
      return false;
    } catch (err) {
      if (err.stdout?.includes('conflict')) {
        return true;
      }
      return false;
    }
  }

  /**
   * Merge with strategy (merge, squash, rebase)
   */
  async mergeWithStrategy(source, target, strategy = 'merge') {
    const currentBranch = await this.getCurrentBranch();

    try {
      await this.checkout(target);

      if (strategy === 'squash') {
        await this.exec(['merge', '--squash', source]);
        await this.exec(['commit', '-m', `Merge '${source}' into '${target}'`]);
      } else if (strategy === 'rebase') {
        await this.exec(['rebase', source]);
      } else {
        await this.exec(['merge', source, '--no-edit']);
      }

      logger.info('Merge completed', { source, target, strategy });
      return { success: true, strategy };
    } catch (err) {
      if (err.message?.includes('conflict')) {
        throw new MergeConflictError(source, target);
      }
      throw err;
    } finally {
      if (currentBranch !== target) {
        await this.checkout(currentBranch);
      }
    }
  }

  /**
   * Squash merge with custom commit message
   */
  async squashMerge(source, target, commitMessage) {
    await this.checkout(target);
    await this.exec(['merge', '--squash', source]);
    await this.exec(['commit', '-m', commitMessage]);
    logger.info('Squash merge completed', { source, target, message: commitMessage });
  }

  /**
   * Abort merge
   */
  async abortMerge() {
    await this.exec(['merge', '--abort']);
    logger.info('Merge aborted');
  }

  /**
   * Revert commit
   */
  async revertCommit(commitHash) {
    await this.exec(['revert', commitHash, '--no-edit']);
    logger.info('Commit reverted', { hash: commitHash });
  }

  /**
   * Switch to branch
   */
  async checkout(branch) {
    await this.exec(['checkout', branch]);
    logger.info('Checked out branch', { branch });
  }

  /**
   * Merge branch
   */
  async mergeBranch(branch, squash = false) {
    const args = squash ? ['merge', '--squash', branch] : ['merge', branch];
    await this.exec(args);
    logger.info('Branch merged', { branch, squash });
  }

  /**
   * Create tag
   */
  async tagRelease(version, message = '') {
    const args = ['-a', version, '-m', message || `Release ${version}`];
    await this.exec(['tag', ...args]);
    logger.info('Tag created', { version });
  }

  /**
   * Push to remote
   */
  async push(remote = 'origin', branch = null) {
    const args = ['push', remote];
    if (branch) args.push(branch);
    await this.exec(args);
    logger.info('Pushed to remote', { remote, branch });
  }

  /**
   * Pull from remote
   */
  async pull(remote = 'origin', branch = null) {
    const args = ['pull', remote];
    if (branch) args.push(branch);
    await this.exec(args);
    logger.info('Pulled from remote', { remote, branch });
  }

  /**
   * Get recent commits
   */
  async getCommits(count = 5) {
    const { stdout } = await this.exec(['log', `-n${count}`, '--oneline']);
    return stdout.split('\n');
  }

  /**
   * Get diff between commits/branches
   */
  async getDiff(from, to = 'HEAD') {
    const { stdout } = await this.exec(['diff', `${from}..${to}`, '--stat']);
    return stdout;
  }
}

module.exports = GitUtils;
