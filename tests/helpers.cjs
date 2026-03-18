/**
 * EZ Tools Test Helpers
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const EZ_TOOLS_PATH = path.join(__dirname, '..', 'ez-agents', 'bin', 'ez-tools.cjs');

/**
 * Run ez-tools command.
 *
 * @param {string|string[]} args - Command string (shell-interpreted) or array
 *   of arguments (shell-bypassed, safe for JSON and dollar signs).
 * @param {string} cwd - Working directory.
 * @param {object} envOverrides - Optional env var overrides.
 */
function runEzTools(args, cwd = process.cwd(), envOverrides = {}) {
  try {
    const env = { ...process.env, ...envOverrides };
    let result;
    if (Array.isArray(args)) {
      // Use spawnSync for array args to properly capture stdout/stderr
      const { spawnSync } = require('child_process');
      const spawnResult = spawnSync(process.execPath, [EZ_TOOLS_PATH, ...args], {
        cwd,
        env,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { 
        success: spawnResult.status === 0, 
        output: (spawnResult.stdout || '').trim(), 
        stderr: (spawnResult.stderr || '').trim(),
      };
    } else {
      result = execSync(`node "${EZ_TOOLS_PATH}" ${args}`, {
        cwd,
        env,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    }
    return { success: true, output: result.trim() };
  } catch (err) {
    return {
      success: false,
      output: err.stdout?.toString().trim() || '',
      error: err.stderr?.toString().trim() || err.message,
    };
  }
}

// Create temp directory structure
function createTempProject() {
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'ez-test-'));
  fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });
  return tmpDir;
}

// Create temp directory with initialized git repo and at least one commit
function createTempGitProject() {
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'ez-test-'));
  fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });

  execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' });

  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'PROJECT.md'),
    '# Project\n\nTest project.\n'
  );

  execSync('git add -A', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git commit -m "initial commit"', { cwd: tmpDir, stdio: 'pipe' });

  return tmpDir;
}

function cleanup(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

module.exports = { runEzTools, createTempProject, createTempGitProject, cleanup, EZ_TOOLS_PATH };
