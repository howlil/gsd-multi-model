#!/usr/bin/env node

/**
 * EZ Health Check — Health monitoring for EZ workflow
 *
 * Validates EZ environment and configuration
 * Used by workflows to detect failures and use fallback functions
 *
 * Usage:
 *   import HealthCheck from './health-check.js';
 *   const health = new HealthCheck();
 *   const result = health.runAll();
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as os from 'os';

interface ApiKeyCheckResult {
  ok: boolean;
  missing?: string[];
}

interface DependencyCheckResult {
  ok: boolean;
  missing?: string[];
}

interface HealthCheckResults {
  status: string;
  timestamp: string;
  node_version: string;
  checks: Record<string, boolean | ApiKeyCheckResult | DependencyCheckResult>;
  issues: string[];
  warnings: string[];
}

class HealthCheck {
  private issues: string[];
  private warnings: string[];

  /**
   * Create a HealthCheck instance
   */
  constructor() {
    this.issues = [];
    this.warnings = [];
  }

  /**
   * Check Node.js version (must be >= 16)
   * @returns True if version is acceptable
   */
  checkNodeVersion(): boolean {
    try {
      const version = process.version;
      const major = parseInt(version.slice(1).split('.')[0]);
      if (major < 16) {
        this.issues.push(`Node.js version ${version} is below required 16.x`);
        return false;
      }
      return true;
    } catch {
      this.issues.push('Cannot determine Node.js version');
      return false;
    }
  }

  /**
   * Check if .planning directory exists
   * @returns True if exists
   */
  checkPlanningDirectory(): boolean {
    const planningDir = '.planning';
    if (!fs.existsSync(planningDir)) {
      this.warnings.push('.planning directory does not exist');
      return false;
    }
    return true;
  }

  /**
   * Check if config.json exists and is valid JSON
   * @returns True if exists and valid
   */
  checkConfigFile(): boolean {
    const configPath = '.planning/config.json';
    if (!fs.existsSync(configPath)) {
      this.warnings.push('config.json not found');
      return false;
    }
    try {
      JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return true;
    } catch {
      this.issues.push('config.json is invalid JSON');
      return false;
    }
  }

  /**
   * Check if STATE.md exists
   * @returns True if exists
   */
  checkStateFile(): boolean {
    const statePath = '.planning/STATE.md';
    if (!fs.existsSync(statePath)) {
      this.warnings.push('STATE.md not found');
      return false;
    }
    return true;
  }

  /**
   * Check if ROADMAP.md exists
   * @returns True if exists
   */
  checkRoadmapFile(): boolean {
    const roadmapPath = '.planning/ROADMAP.md';
    if (!fs.existsSync(roadmapPath)) {
      this.warnings.push('ROADMAP.md not found');
      return false;
    }
    return true;
  }

  /**
   * Check if PROJECT.md exists
   * @returns True if exists
   */
  checkProjectFile(): boolean {
    const projectPath = '.planning/PROJECT.md';
    if (!fs.existsSync(projectPath)) {
      this.warnings.push('PROJECT.md not found');
      return false;
    }
    return true;
  }

  /**
   * Check if REQUIREMENTS.md exists
   * @returns True if exists
   */
  checkRequirementsFile(): boolean {
    const reqPath = '.planning/REQUIREMENTS.md';
    if (!fs.existsSync(reqPath)) {
      this.warnings.push('REQUIREMENTS.md not found');
      return false;
    }
    return true;
  }

  /**
   * Check if git is available in PATH
   * @returns True if git is available
   */
  checkGitAvailability(): boolean {
    try {
      execSync('git --version', { stdio: 'ignore', timeout: 5000 });
      return true;
    } catch {
      this.warnings.push('git is not available in PATH');
      return false;
    }
  }

  /**
   * Check if required API keys are configured
   * @returns API key check result
   */
  checkApiKeys(): ApiKeyCheckResult {
    const missing: string[] = [];
    const requiredKeys = ['ANTHROPIC_API_KEY'];

    for (const key of requiredKeys) {
      if (!process.env[key]) {
        // Also check ~/.ez/ directory
        const homeDir = os.homedir();
        const keyPath = path.join(homeDir, '.ez', key.toLowerCase().replace('_api_key', ''));
        if (!fs.existsSync(keyPath)) {
          missing.push(key);
        }
      }
    }

    if (missing.length > 0) {
      return { ok: false, missing };
    }
    return { ok: true };
  }

  /**
   * Check if npm dependencies are installed
   * @returns Dependency check result
   */
  checkDependencies(): DependencyCheckResult {
    const missing: string[] = [];
    const requiredDeps = ['proper-lockfile', 'semver'];

    for (const dep of requiredDeps) {
      try {
        import.meta.resolve(dep);
      } catch {
        missing.push(dep);
      }
    }

    if (missing.length > 0) {
      return { ok: false, missing };
    }
    return { ok: true };
  }

  /**
   * Run all health checks
   * @returns Health status object
   */
  runAll(): HealthCheckResults {
    const results: HealthCheckResults = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      node_version: process.version,
      checks: {
        node_version: this.checkNodeVersion(),
        planning_dir: this.checkPlanningDirectory(),
        config_file: this.checkConfigFile(),
        state_file: this.checkStateFile(),
        roadmap_file: this.checkRoadmapFile(),
        project_file: this.checkProjectFile(),
        requirements_file: this.checkRequirementsFile(),
        git: this.checkGitAvailability(),
        api_keys: this.checkApiKeys(),
        dependencies: this.checkDependencies()
      },
      issues: this.issues,
      warnings: this.warnings
    };

    if (this.issues.length > 0) {
      results.status = 'unhealthy';
    } else if (this.warnings.length > 0) {
      results.status = 'degraded';
    }

    return results;
  }
}

export default HealthCheck;

export type { HealthCheckResults, ApiKeyCheckResult, DependencyCheckResult };
