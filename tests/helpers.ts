/**
 * EZ Tools Test Helpers
 */

import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface EzToolsResult {
  success: boolean;
  output: string;
  stderr?: string;
  error?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EZ_TOOLS_PATH = path.join(__dirname, '..', 'ez-agents', 'bin', 'ez-tools.cjs');

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Run ez-tools command.
 *
 * @param args - Command string (shell-interpreted) or array of arguments (shell-bypassed, safe for JSON and dollar signs)
 * @param cwd - Working directory
 * @param envOverrides - Optional env var overrides
 * @returns Result object with success, output, and optional stderr/error
 */
export function runEzTools(
  args: string | string[],
  cwd: string = process.cwd(),
  envOverrides: Record<string, string> = {}
): EzToolsResult {
  try {
    const env = { ...process.env, ...envOverrides };
    let result: EzToolsResult;

    if (Array.isArray(args)) {
      // Use spawnSync for array args to properly capture stdout/stderr
      const spawnResult = spawnSync(process.execPath, [EZ_TOOLS_PATH, ...args], {
        cwd,
        env,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      result = {
        success: spawnResult.status === 0,
        output: (spawnResult.stdout || '').trim(),
        stderr: (spawnResult.stderr || '').trim()
      };
    } else {
      const output = execSync(`node "${EZ_TOOLS_PATH}" ${args}`, {
        cwd,
        env,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      result = { success: true, output: output.trim() };
    }

    return result;
  } catch (err) {
    const error = err as Error & { stdout?: Buffer; stderr?: Buffer };
    return {
      success: false,
      output: error.stdout?.toString().trim() || '',
      error: error.stderr?.toString().trim() || error.message
    };
  }
}

/**
 * Create temp directory structure
 * @returns Path to temporary directory
 */
export function createTempProject(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ez-test-'));
  fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });
  return tmpDir;
}

/**
 * Create temp directory with initialized git repo and at least one commit
 * @returns Path to temporary directory
 */
export function createTempGitProject(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ez-test-'));
  fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, '.planning', 'logs'), { recursive: true });

  execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' });

  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'PROJECT.md'),
    '# Project\n\nTest project.\n'
  );

  execSync('git add -A', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git commit -m "initial commit"', { cwd: tmpDir, stdio: 'pipe' });

  // Ensure git object database is flushed (important for Linux CI/CD)
  execSync('git gc', { cwd: tmpDir, stdio: 'pipe' });

  return tmpDir;
}

/**
 * Clean up temporary directory
 * @param tmpDir - Path to directory to remove
 */
export function cleanup(tmpDir: string): void {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

/**
 * Get the EZ tools path
 * @returns Path to ez-tools.cjs
 */
export const EZ_TOOLS_PATH_CONST = EZ_TOOLS_PATH;
