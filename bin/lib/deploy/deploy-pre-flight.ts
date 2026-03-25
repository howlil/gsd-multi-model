/**
 * Deploy Pre-Flight — Runs tests + lint before deploy
 * Blocks deploy if either fails
 */

import { execSync } from 'child_process';

/**
 * Pre-flight check result
 */
export interface PreFlightResult {
  /** Whether all checks passed */
  passed: boolean;
  /** Whether tests passed */
  tests: boolean;
  /** Whether lint passed */
  lint: boolean;
  /** Array of error messages */
  errors: string[];
}

export class DeployPreFlight {
  private cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
  }

  /**
   * Run pre-flight checks (tests + lint)
   * @returns Result { passed, tests, lint, errors }
   */
  runPreFlight(): PreFlightResult {
    const result: PreFlightResult = {
      passed: true,
      tests: false,
      lint: false,
      errors: []
    };

    // Run tests
    try {
      execSync('npm test', { cwd: this.cwd, stdio: 'pipe' });
      result.tests = true;
    } catch (e) {
      result.passed = false;
      result.errors.push(`Tests failed: ${(e as Error).message}`);
    }

    // Run lint
    try {
      execSync('npm run lint', { cwd: this.cwd, stdio: 'pipe' });
      result.lint = true;
    } catch (e) {
      result.passed = false;
      result.errors.push(`Lint failed: ${(e as Error).message}`);
    }

    return result;
  }
}

/**
 * Run pre-flight checks
 * @param cwd - Working directory
 * @returns Result { passed, tests, lint, errors }
 */
export function runPreFlight(cwd?: string): PreFlightResult {
  const preFlight = new DeployPreFlight(cwd);
  return preFlight.runPreFlight();
}
