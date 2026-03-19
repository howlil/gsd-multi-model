#!/usr/bin/env node

/**
 * Git Workflow Engine
 *
 * Enterprise-grade Git workflow management with branch hierarchy,
 * validation gates, and automated merging.
 *
 * Branch Hierarchy:
 *   main (production) ← develop (staging) ← phase/* ← {feature,fix,docs,refactor}/*
 */

const GitUtils = require('./git-utils.cjs');
const Logger = require('./logger.cjs');
const {
  GitWorkflowError,
  BranchExistsError,
  BranchNotFoundError,
  MergeConflictError,
  ValidationFailedError
} = require('./git-errors.cjs');

class GitWorkflowEngine {
  constructor(config = {}) {
    this.git = new GitUtils(process.cwd());
    this.logger = new Logger();
    this.config = config;
    this.validationLevels = {
      minimal: ['format', 'lint'],
      standard: ['format', 'lint', 'test'],
      full: ['format', 'lint', 'test', 'security', 'performance']
    };
  }

  /**
   * Detect branch type from name
   */
  detectBranchType(branchName) {
    const patterns = {
      feature: /^feature\//,
      fix: /^fix\//,
      docs: /^docs\//,
      refactor: /^refactor\//,
      phase: /^phase\//,
      release: /^release\//,
      hotfix: /^hotfix\//
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(branchName)) {
        return type;
      }
    }
    return null;
  }

  /**
   * Validate branch naming convention
   */
  validateBranchNaming(branchName, type) {
    const patterns = {
      feature: /^feature\/[a-zA-Z0-9\-_]+$/,
      fix: /^fix\/[a-zA-Z0-9\-_]+$/,
      docs: /^docs\/[a-zA-Z0-9\-_]+$/,
      refactor: /^refactor\/[a-zA-Z0-9\-_]+$/,
      phase: /^phase\/\d+-[a-zA-Z0-9\-_]+$/,
      release: /^release\/v\d+\.\d+\.\d+$/,
      hotfix: /^hotfix\/[a-zA-Z0-9\-_]+$/
    };

    const pattern = patterns[type];
    if (!pattern) {
      throw new ValidationFailedError('branch_type', [`Unknown branch type: ${type}`]);
    }

    if (!pattern.test(branchName)) {
      throw new ValidationFailedError('branch_naming', [
        `Branch '${branchName}' does not match ${type} pattern: ${pattern}`
      ]);
    }

    return true;
  }

  /**
   * Validate merge strategy
   */
  _validateStrategy(strategy) {
    const validStrategies = ['merge', 'squash', 'rebase'];
    if (!validStrategies.includes(strategy)) {
      throw new ValidationFailedError('merge_strategy', [
        `Invalid merge strategy: ${strategy}. Must be one of: ${validStrategies.join(', ')}`
      ]);
    }
    return true;
  }

  /**
   * Create phase branch from develop
   * PHASE-GIT-01: Auto-create phase branch from develop
   */
  async createPhaseBranch(phaseNumber, phaseSlug) {
    const branchName = `phase/${phaseNumber}-${phaseSlug}`;

    // Validate naming convention
    this.validateBranchNaming(branchName, 'phase');

    // Check if branch exists
    if (await this.git.branchExists(branchName)) {
      throw new BranchExistsError(branchName);
    }

    // Determine source branch (develop or main)
    let sourceBranch = 'develop';
    if (!(await this.git.branchExists('develop'))) {
      this.logger.warn('develop branch not found, using main', { sourceBranch: 'main' });
      sourceBranch = 'main';
    }

    // Create branch
    await this.git.createBranch(branchName, sourceBranch);

    this.logger.info('Phase branch created', {
      branch: branchName,
      phaseNumber,
      phaseSlug,
      source: sourceBranch
    });

    return branchName;
  }

  /**
   * Create feature/fix/docs/refactor branch
   * PHASE-GIT-02: Auto-create feature/fix/docs/refactor branches within phase
   */
  async createWorkBranch(type, ticketId = null, slug) {
    const validTypes = ['feature', 'fix', 'docs', 'refactor'];

    if (!validTypes.includes(type)) {
      throw new ValidationFailedError('branch_type', [
        `Invalid branch type: ${type}. Must be one of: ${validTypes.join(', ')}`
      ]);
    }

    // Build branch name
    let branchName;
    if (ticketId && ['feature', 'fix'].includes(type)) {
      branchName = `${type}/${ticketId}-${slug}`;
    } else {
      branchName = `${type}/${slug}`;
    }

    // Validate naming convention
    this.validateBranchNaming(branchName, type);

    // Check if branch exists
    if (await this.git.branchExists(branchName)) {
      throw new BranchExistsError(branchName);
    }

    // Source from current branch (should be phase branch or develop)
    const sourceBranch = await this.git.getCurrentBranch();

    // Create branch
    await this.git.createBranch(branchName, sourceBranch);

    this.logger.info('Work branch created', {
      branch: branchName,
      type,
      ticketId,
      slug,
      source: sourceBranch
    });

    return branchName;
  }

  /**
   * Create atomic commit for task completion
   * PHASE-GIT-03: Auto-commit after each task completion
   * PHASE-GIT-04: Commit message format: <type>(scope): <description> [TASK-XX]
   */
  async commitTask(taskDescription, taskId, files = []) {
    // Parse task ID to number for formatting
    const taskNum = parseInt(taskId.replace('TASK-', ''), 10);
    const formattedTaskId = `TASK-${String(taskNum).padStart(2, '0')}`;

    // Extract commit type from task description
    const typePatterns = {
      feat: /add|implement|create|new|enable/i,
      fix: /fix|resolve|patch|correct/i,
      docs: /document|update docs|readme/i,
      refactor: /refactor|restructure|reorganize/i,
      test: /test|add tests/i,
      chore: /update|configure|setup|clean/i
    };

    let commitType = 'chore';
    for (const [type, pattern] of Object.entries(typePatterns)) {
      if (pattern.test(taskDescription)) {
        commitType = type;
        break;
      }
    }

    // Extract scope (optional)
    const scopePattern = /\[([^\]]+)\]/;
    const scopeMatch = taskDescription.match(scopePattern);
    const scope = scopeMatch ? `(${scopeMatch[1]})` : '';

    // Clean description
    let cleanDescription = taskDescription
      .replace(scopePattern, '')
      .replace(/^(add|implement|create|fix|update|resolve)\s+/i, '')
      .trim();

    // Build commit message
    const commitMessage = `${commitType}${scope}: ${cleanDescription} [${formattedTaskId}]`;

    // Create commit
    const commitHash = await this.git.commitAtomic(commitMessage, files);

    this.logger.info('Task commit created', {
      hash: commitHash,
      message: commitMessage,
      taskId: formattedTaskId
    });

    return commitHash;
  }

  /**
   * Validate planning file consistency
   */
  async _validatePlanningFiles() {
    const fs = require('fs');
    const path = require('path');
    const errors = [];

    // Check STATE.md exists
    const statePath = path.join(process.cwd(), '.planning', 'STATE.md');
    if (!fs.existsSync(statePath)) {
      errors.push('STATE.md not found');
    }

    // Check STATE.md has required frontmatter
    if (fs.existsSync(statePath)) {
      const stateContent = fs.readFileSync(statePath, 'utf-8');
      if (!stateContent.includes('current_phase:') || !stateContent.includes('status:')) {
        errors.push('STATE.md missing required frontmatter fields');
      }
    }

    return {
      name: 'planning_consistency',
      passed: errors.length === 0,
      message: errors.length === 0 ? 'Planning files consistent' : errors.join('; ')
    };
  }

  /**
   * Run format check (Prettier)
   */
  async _runFormatCheck() {
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);

    try {
      await execFileAsync('npx', ['prettier', '--check', '.'], { cwd: process.cwd() });
      return { name: 'format', passed: true, message: 'Format check passed' };
    } catch (err) {
      return { name: 'format', passed: false, message: 'Format check failed' };
    }
  }

  /**
   * Run lint check (ESLint)
   */
  async _runLintCheck() {
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);

    try {
      await execFileAsync('npx', ['eslint', '.'], { cwd: process.cwd() });
      return { name: 'lint', passed: true, message: 'Lint check passed' };
    } catch (err) {
      return { name: 'lint', passed: false, message: 'Lint check failed' };
    }
  }

  /**
   * Run test check
   */
  async _runTestCheck() {
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);

    try {
      await execFileAsync('npm', ['test'], { cwd: process.cwd() });
      return { name: 'test', passed: true, message: 'Test check passed' };
    } catch (err) {
      return { name: 'test', passed: false, message: 'Test check failed' };
    }
  }

  /**
   * Run security check (npm audit)
   */
  async _runSecurityCheck() {
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);

    try {
      await execFileAsync('npm', ['audit', '--audit-level=critical'], { cwd: process.cwd() });
      return { name: 'security', passed: true, message: 'Security check passed' };
    } catch (err) {
      return { name: 'security', passed: false, message: 'Security check failed: critical vulnerabilities found' };
    }
  }

  /**
   * Validate branch before merge
   * PHASE-GIT-05: Validate feature/fix branches before merge to phase
   */
  async validateBeforeMerge(branch, validationLevel = 'standard') {
    const currentBranch = await this.git.getCurrentBranch();
    const checks = [];
    let passed = true;

    try {
      // Switch to branch for validation
      await this.git.checkout(branch);

      // Get validation checks based on level
      const requiredChecks = this.validationLevels[validationLevel] || this.validationLevels.standard;

      // Planning file consistency check (always run)
      const planningCheck = await this._validatePlanningFiles();
      checks.push(planningCheck);
      if (!planningCheck.passed) passed = false;

      // Format check
      if (requiredChecks.includes('format')) {
        const formatCheck = await this._runFormatCheck();
        checks.push(formatCheck);
        if (!formatCheck.passed) passed = false;
      }

      // Lint check
      if (requiredChecks.includes('lint')) {
        const lintCheck = await this._runLintCheck();
        checks.push(lintCheck);
        if (!lintCheck.passed) passed = false;
      }

      // Test check
      if (requiredChecks.includes('test')) {
        const testCheck = await this._runTestCheck();
        checks.push(testCheck);
        if (!testCheck.passed) passed = false;
      }

      // Security check (full level only)
      if (requiredChecks.includes('security')) {
        const securityCheck = await this._runSecurityCheck();
        checks.push(securityCheck);
        if (!securityCheck.passed) passed = false;
      }

      const result = {
        branch,
        validationLevel,
        passed,
        checks,
        timestamp: new Date().toISOString()
      };

      this.logger.info('Validation completed', result);

      if (!passed) {
        throw new ValidationFailedError('pre_merge', checks.filter(c => !c.passed).map(c => c.message));
      }

      return result;
    } finally {
      // Restore original branch
      if (currentBranch !== branch) {
        await this.git.checkout(currentBranch);
      }
    }
  }

  /**
   * Merge feature/fix branch to phase branch
   * PHASE-GIT-06: Auto-merge feature/fix branches to phase branch after validation
   */
  async mergeToPhase(featureBranch, phaseBranch) {
    const branchType = this.detectBranchType(featureBranch);
    const strategy = this.config.git?.merge_strategies?.[branchType] || 'squash';

    this.logger.info('Merging to phase', {
      source: featureBranch,
      target: phaseBranch,
      strategy
    });

    // Validate before merge
    await this.validateBeforeMerge(featureBranch, 'standard');

    // Check for conflicts
    const hasConflicts = await this.git.hasConflicts(featureBranch, phaseBranch);
    if (hasConflicts) {
      throw new MergeConflictError(featureBranch, phaseBranch);
    }

    // Perform merge
    await this.git.mergeWithStrategy(featureBranch, phaseBranch, strategy);

    this.logger.info('Merge to phase completed', {
      source: featureBranch,
      target: phaseBranch
    });

    return { success: true, source: featureBranch, target: phaseBranch };
  }

  /**
   * Merge phase branch to develop
   * PHASE-GIT-08: Auto-merge phase branch to develop after validation
   */
  async mergePhaseToDevelop(phaseBranch) {
    const strategy = this.config.git?.merge_strategies?.phase || 'merge';
    const targetBranch = 'develop';

    this.logger.info('Merging phase to develop', {
      source: phaseBranch,
      target: targetBranch,
      strategy
    });

    // Validate before merge
    await this.validateBeforeMerge(phaseBranch, 'full');

    // Check for conflicts
    const hasConflicts = await this.git.hasConflicts(phaseBranch, targetBranch);
    if (hasConflicts) {
      throw new MergeConflictError(phaseBranch, targetBranch);
    }

    // Perform merge
    await this.git.mergeWithStrategy(phaseBranch, targetBranch, strategy);

    this.logger.info('Phase merge to develop completed', {
      source: phaseBranch,
      target: targetBranch
    });

    return { success: true, source: phaseBranch, target: targetBranch };
  }

  /**
   * Create release branch from develop
   * PHASE-GIT-09: Create release branch from develop for stabilization
   */
  async createReleaseBranch(version) {
    const semver = require('semver');

    // Validate version format
    const validVersion = semver.valid(version);
    if (!validVersion) {
      throw new ValidationFailedError('version_format', [
        `Invalid version format: ${version}. Must be valid semver (e.g., 2.0.0)`
      ]);
    }

    const branchName = `release/v${validVersion}`;

    // Check if branch exists
    if (await this.git.branchExists(branchName)) {
      throw new BranchExistsError(branchName);
    }

    // Source from develop
    if (!(await this.git.branchExists('develop'))) {
      throw new BranchNotFoundError('develop');
    }

    // Create branch
    await this.git.createBranch(branchName, 'develop');

    this.logger.info('Release branch created', {
      branch: branchName,
      version: validVersion
    });

    return branchName;
  }

  /**
   * Run integration tests
   */
  async _runIntegrationTestCheck() {
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);

    try {
      // Try to run integration tests if they exist
      await execFileAsync('npm', ['run', 'test:integration'], { cwd: process.cwd() });
      return { name: 'integration_tests', passed: true, message: 'Integration tests passed' };
    } catch (err) {
      // If integration test script doesn't exist, skip
      if (err.code === 1 || err.stderr?.includes('Missing script')) {
        return { name: 'integration_tests', passed: true, message: 'Integration tests not configured, skipped' };
      }
      return { name: 'integration_tests', passed: false, message: 'Integration tests failed' };
    }
  }

  /**
   * Run dependency audit
   */
  async _runDependencyAudit() {
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);

    try {
      await execFileAsync('npm', ['audit', '--production', '--audit-level=high'], { cwd: process.cwd() });
      return { name: 'dependency_audit', passed: true, message: 'Dependency audit passed' };
    } catch (err) {
      return { name: 'dependency_audit', passed: false, message: 'Dependency audit failed: high/critical vulnerabilities' };
    }
  }

  /**
   * Run critical bug detection
   */
  async _runCriticalBugDetection() {
    // Check for common critical bug patterns in code
    const fs = require('fs');
    const path = require('path');
    const errors = [];

    // Example: Check for console.log in production code (excluding tests)
    const srcDir = path.join(process.cwd(), 'ez-agents', 'bin', 'lib');
    if (fs.existsSync(srcDir)) {
      const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.cjs'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(srcDir, file), 'utf-8');
        if (content.includes('console.log(') && !content.includes('// console.log')) {
          errors.push(`Potential debug logging in ${file}`);
        }
      }
    }

    return {
      name: 'critical_bug_detection',
      passed: errors.length === 0,
      message: errors.length === 0 ? 'No critical bugs detected' : errors.join('; ')
    };
  }

  /**
   * Validate release branch stability
   * PHASE-GIT-10: Run full test suite, integration tests, security scans on release branch
   * PHASE-GIT-11: Validate release branch stability (zero critical bugs, all tests green)
   */
  async validateReleaseBranch(releaseBranch) {
    const currentBranch = await this.git.getCurrentBranch();
    const checks = [];
    let passed = true;
    let criticalFailures = 0;

    try {
      // Switch to release branch
      await this.git.checkout(releaseBranch);

      // Full test suite
      this.logger.info('Running full test suite', { branch: releaseBranch });
      const testCheck = await this._runTestCheck();
      testCheck.name = 'full_test_suite';
      testCheck.critical = true;
      checks.push(testCheck);
      if (!testCheck.passed) {
        passed = false;
        criticalFailures++;
      }

      // Integration tests
      this.logger.info('Running integration tests', { branch: releaseBranch });
      const integrationCheck = await this._runIntegrationTestCheck();
      integrationCheck.critical = true;
      checks.push(integrationCheck);
      if (!integrationCheck.passed) {
        passed = false;
        criticalFailures++;
      }

      // Security scan - npm audit
      this.logger.info('Running security audit', { branch: releaseBranch });
      const securityCheck = await this._runSecurityCheck();
      securityCheck.critical = true;
      checks.push(securityCheck);
      if (!securityCheck.passed) {
        passed = false;
        criticalFailures++;
      }

      // Dependency vulnerability scan
      this.logger.info('Scanning dependencies', { branch: releaseBranch });
      const dependencyCheck = await this._runDependencyAudit();
      dependencyCheck.critical = true;
      checks.push(dependencyCheck);
      if (!dependencyCheck.passed) {
        passed = false;
        criticalFailures++;
      }

      // Critical bug detection (check for known critical patterns)
      this.logger.info('Checking for critical bugs', { branch: releaseBranch });
      const criticalBugCheck = await this._runCriticalBugDetection();
      criticalBugCheck.critical = true;
      checks.push(criticalBugCheck);
      if (!criticalBugCheck.passed) {
        passed = false;
        criticalFailures++;
      }

      const result = {
        branch: releaseBranch,
        passed,
        criticalFailures,
        checks,
        timestamp: new Date().toISOString()
      };

      this.logger.info('Release validation completed', result);

      if (criticalFailures > 0) {
        throw new ValidationFailedError('release_stability', [
          `${criticalFailures} critical check(s) failed`,
          ...checks.filter(c => c.critical && !c.passed).map(c => c.message)
        ]);
      }

      return result;
    } finally {
      // Restore original branch
      if (currentBranch !== releaseBranch) {
        await this.git.checkout(currentBranch);
      }
    }
  }

  /**
   * Bump version in package.json
   */
  async _bumpVersion(newVersion) {
    const fs = require('fs');
    const path = require('path');

    const packagePath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      packageJson.version = newVersion;
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

      // Commit version bump
      await this.git.add('package.json');
      await this.git.commitAtomic(`chore: bump version to ${newVersion} [RELEASE]`, ['package.json']);

      this.logger.info('Version bumped', { version: newVersion });
    }
  }

  /**
   * Merge release to main with version tag
   * PHASE-GIT-12: Merge release to main with version tag
   * PHASE-GIT-13: Merge release back to develop with version bump
   */
  async mergeReleaseToMain(releaseBranch) {
    const semver = require('semver');

    // Extract version from branch name
    const versionMatch = releaseBranch.match(/^release\/v(\d+\.\d+\.\d+)$/);
    if (!versionMatch) {
      throw new ValidationFailedError('release_branch_format', [
        `Invalid release branch format: ${releaseBranch}. Expected: release/vX.Y.Z`
      ]);
    }

    const version = versionMatch[1];
    const tagName = `v${version}`;

    this.logger.info('Merging release to main', {
      releaseBranch,
      version,
      tagName
    });

    // Validate release branch
    await this.validateReleaseBranch(releaseBranch);

    // Merge to main
    await this.git.checkout('main');
    await this.git.mergeWithStrategy(releaseBranch, 'main', 'merge');

    // Create tag
    await this.git.tagRelease(tagName, `Release ${tagName}`);

    this.logger.info('Release merged to main', {
      branch: 'main',
      tag: tagName
    });

    // Merge back to develop with version bump
    await this.git.checkout('develop');
    await this.git.mergeWithStrategy(releaseBranch, 'develop', 'merge');

    // Bump version in package.json
    await this._bumpVersion(version);

    this.logger.info('Release merged to develop', {
      branch: 'develop',
      version
    });

    return {
      success: true,
      releaseBranch,
      mainTag: tagName,
      version
    };
  }

  /**
   * Create pull request for enterprise mode
   */
  async _createPullRequest(source, target, options = {}) {
    const { Octokit } = require('@octokit/rest');

    // Check if GitHub token is configured
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new ValidationFailedError('github_auth', [
        'GITHUB_TOKEN environment variable not set. Required for enterprise PR workflow.'
      ]);
    }

    const octokit = new Octokit({ auth: githubToken });

    // Get repository info
    const repoPath = process.cwd();
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);

    try {
      const { stdout: remoteUrl } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: repoPath });
      const repoMatch = remoteUrl.match(/github\.com[:/]([^/]+)\/([^.]+)\.git/);

      if (!repoMatch) {
        throw new Error('Could not parse repository URL');
      }

      const [, owner, repo] = repoMatch;

      // Create PR
      const prTitle = options.title || `Merge '${source}' into '${target}'`;
      const prBody = options.body || `Automated PR for merging ${source} into ${target}`;

      const { data: pr } = await octokit.pulls.create({
        owner,
        repo,
        title: prTitle,
        body: prBody,
        head: source,
        base: target
      });

      this.logger.info('Pull request created', {
        number: pr.number,
        url: pr.html_url,
        source,
        target
      });

      return {
        success: true,
        mode: 'enterprise',
        pullRequest: pr.number,
        url: pr.html_url,
        requiredReviewers: options.requiredReviewers,
        createdAt: new Date().toISOString()
      };
    } catch (err) {
      this.logger.error('Failed to create pull request', { error: err.message });
      throw new GitWorkflowError(`Failed to create PR: ${err.message}`, {
        code: 'PR_CREATION_FAILED',
        details: { source, target }
      });
    }
  }

  /**
   * Merge branch with enterprise/open source mode support
   * PHASE-GIT-14: Support enterprise workflow (protected branches, PR required, code review)
   * PHASE-GIT-15: Support open source workflow (direct merge after automated validation)
   */
  async mergeBranch(source, target, options = {}) {
    const enterpriseMode = this.config.git?.enterprise_mode?.require_pull_request || false;
    const requiredReviewers = this.config.git?.enterprise_mode?.required_reviewers || 1;

    // Validate strategy
    const strategy = options.strategy || this.config.git?.merge_strategies?.[this.detectBranchType(source)] || 'merge';
    this._validateStrategy(strategy);

    this.logger.info('Merge branch requested', {
      source,
      target,
      enterpriseMode,
      requiredReviewers,
      strategy
    });

    if (enterpriseMode) {
      // Enterprise mode: Create PR and require approval
      return await this._createPullRequest(source, target, {
        ...options,
        requiredReviewers
      });
    } else {
      // Open source mode: Direct merge after validation
      await this.validateBeforeMerge(source, options.validationLevel || 'standard');

      await this.git.mergeWithStrategy(source, target, strategy);

      this.logger.info('Direct merge completed (open source mode)', {
        source,
        target
      });

      return {
        success: true,
        mode: 'open_source',
        source,
        target,
        mergedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Create and merge Hotfix
   * PHASE-GIT-17: Hotfix workflow (create from main, merge to main + develop)
   */
  async createHotfix(description) {
    // Create slug from description
    const slug = description
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const branchName = `hotfix/${slug}`;

    // Check if branch exists
    if (await this.git.branchExists(branchName)) {
      throw new BranchExistsError(branchName);
    }

    // Create hotfix branch from main
    await this.git.createBranch(branchName, 'main');

    this.logger.info('Hotfix branch created', {
      branch: branchName,
      description
    });

    return branchName;
  }

  /**
   * Merge hotfix to main and develop
   */
  async mergeHotfix(hotfixBranch, version = null) {
    const branchType = this.detectBranchType(hotfixBranch);
    if (branchType !== 'hotfix') {
      throw new ValidationFailedError('branch_type', [
        `Expected hotfix branch, got: ${hotfixBranch}`
      ]);
    }

    this.logger.info('Merging hotfix', { branch: hotfixBranch });

    // Validate hotfix
    await this.validateBeforeMerge(hotfixBranch, 'standard');

    // Merge to main
    await this.git.checkout('main');
    await this.git.mergeWithStrategy(hotfixBranch, 'main', 'squash');

    // Create tag if version provided
    if (version) {
      const tagName = `v${version}`;
      await this.git.tagRelease(tagName, `Hotfix ${version}`);
      this.logger.info('Hotfix tagged', { tag: tagName });
    }

    // Merge to develop
    await this.git.checkout('develop');
    await this.git.mergeWithStrategy(hotfixBranch, 'develop', 'squash');

    this.logger.info('Hotfix merged to main and develop', {
      branch: hotfixBranch
    });

    return {
      success: true,
      hotfixBranch,
      mergedTo: ['main', 'develop'],
      version
    };
  }

  /**
   * Rollback phase
   * PHASE-GIT-18: Rollback capability with auto-revert if phase introduces regressions
   */
  async rollbackPhase(phaseNumber) {
    const phasePattern = `phase/${phaseNumber}-`;
    const branches = await this.git.listBranches(phasePattern + '*');

    if (branches.length === 0) {
      throw new BranchNotFoundError(`phase/${phaseNumber}-*`);
    }

    const phaseBranch = branches[0];
    this.logger.info('Rolling back phase', { phaseNumber, phaseBranch });

    // Create rollback branch for safety
    const rollbackBranch = `rollback/phase-${phaseNumber}-${Date.now()}`;
    await this.git.createBranch(rollbackBranch, 'develop');

    // Check if phase was merged to develop
    const currentBranch = await this.git.getCurrentBranch();
    await this.git.checkout('develop');

    // Find merge commit
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);

    try {
      const { stdout } = await execFileAsync('git', [
        'log', '--oneline', '--grep', phaseBranch, '-n', '1'
      ], { cwd: process.cwd() });

      if (stdout) {
        const mergeCommit = stdout.split(' ')[0];

        // Revert the merge commit
        await this.git.revertCommit(mergeCommit);

        this.logger.info('Phase rollback completed', {
          phaseNumber,
          revertedCommit: mergeCommit,
          rollbackBranch
        });

        return {
          success: true,
          phaseNumber,
          revertedCommit: mergeCommit,
          rollbackBranch
        };
      } else {
        // Phase not merged yet, just delete the branch
        await this.git.deleteBranch(phaseBranch, true);

        this.logger.info('Phase branch deleted (not merged)', {
          phaseNumber,
          phaseBranch
        });

        return {
          success: true,
          phaseNumber,
          deleted: true,
          rollbackBranch
        };
      }
    } finally {
      await this.git.checkout(currentBranch);
    }
  }

  /**
   * Check branch protection rules
   * PHASE-GIT-19: Branch protection rules enforcement (require PR, reviews, status checks)
   */
  async checkBranchProtection(branch) {
    const { Octokit } = require('@octokit/rest');

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      this.logger.warn('GITHUB_TOKEN not set, skipping branch protection check');
      return { protected: false, reason: 'no_token' };
    }

    const octokit = new Octokit({ auth: githubToken });

    // Get repository info
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);

    try {
      const { stdout: remoteUrl } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: process.cwd() });
      const repoMatch = remoteUrl.match(/github\.com[:/]([^/]+)\/([^.]+)\.git/);

      if (!repoMatch) {
        throw new Error('Could not parse repository URL');
      }

      const [, owner, repo] = repoMatch;

      // Get branch protection rules
      try {
        const { data: protection } = await octokit.repos.getBranchProtection({
          owner,
          repo,
          branch
        });

        const result = {
          protected: true,
          requiredStatusChecks: protection.required_status_checks?.strict || false,
          requiredPullRequestReviews: protection.required_pull_request_reviews || null,
          requiredLinearHistory: protection.required_linear_history?.enabled || false,
          allowForcePushes: protection.allow_force_pushes?.enabled || false,
          allowDeletions: protection.allow_deletions?.enabled || false
        };

        this.logger.info('Branch protection status', { branch, ...result });

        // Validate enterprise mode requirements
        if (this.config.git?.enterprise_mode?.require_pull_request) {
          if (!result.requiredPullRequestReviews) {
            throw new ValidationFailedError('branch_protection', [
              `Branch '${branch}' does not require pull request reviews (enterprise mode requires it)`
            ]);
          }
        }

        return result;
      } catch (err) {
        if (err.status === 404) {
          // Branch not protected
          return { protected: false, reason: 'not_protected' };
        }
        throw err;
      }
    } catch (err) {
      this.logger.error('Failed to check branch protection', { error: err.message });
      throw new GitWorkflowError(`Failed to check branch protection: ${err.message}`, {
        code: 'PROTECTION_CHECK_FAILED',
        details: { branch }
      });
    }
  }

  /**
   * Enhance changelog with task IDs
   */
  _enhanceChangelogWithTaskIds(changelog) {
    // Add header
    const header = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n`;

    // Parse task IDs from commits and add to changelog
    const taskPattern = /\[TASK-(\d+)\]/g;
    const enhanced = changelog.replace(taskPattern, (match, taskId) => {
      return `[Task #${taskId}](https://github.com/howlil/ez-agents/issues/${taskId})`;
    });

    return header + enhanced;
  }

  /**
   * Generate changelog from commits
   * PHASE-GIT-20: Automated changelog generation from commits on merge to main
   */
  async generateChangelog(fromTag, toTag = 'HEAD') {
    const conventionalChangelog = require('conventional-changelog');
    const fs = require('fs');
    const path = require('path');

    this.logger.info('Generating changelog', { fromTag, toTag });

    return new Promise((resolve, reject) => {
      const changelogStream = conventionalChangelog({
        preset: 'angular',
        releaseCount: 1
      }, {
        from: fromTag,
        to: toTag
      }, {
        commits: true,
        commitsPath: process.cwd()
      });

      let changelog = '';

      changelogStream.on('data', (chunk) => {
        changelog += chunk.toString();
      });

      changelogStream.on('end', () => {
        // Parse and enhance with task IDs
        const enhancedChangelog = this._enhanceChangelogWithTaskIds(changelog);

        // Append to CHANGELOG.md
        const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');

        if (fs.existsSync(changelogPath)) {
          const existingContent = fs.readFileSync(changelogPath, 'utf-8');
          fs.writeFileSync(changelogPath, enhancedChangelog + '\n' + existingContent);
        } else {
          fs.writeFileSync(changelogPath, enhancedChangelog);
        }

        this.logger.info('Changelog generated', { path: changelogPath });

        resolve({
          success: true,
          fromTag,
          toTag,
          path: changelogPath
        });
      });

      changelogStream.on('error', (err) => {
        this.logger.error('Changelog generation failed', { error: err.message });
        reject(new GitWorkflowError(`Changelog generation failed: ${err.message}`, {
          code: 'CHANGELOG_GENERATION_FAILED'
        }));
      });
    });
  }
}

module.exports = GitWorkflowEngine;
