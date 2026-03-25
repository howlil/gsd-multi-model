/**
 * Config Directory Resolver — Resolves configuration directory paths for different runtimes
 *
 * Supports multiple runtime types:
 * - claude: Claude Code
 * - opencode: OpenCode
 * - gemini: Gemini CLI
 * - codex: Codex CLI
 * - copilot: GitHub Copilot
 * - qwen: Qwen Code
 * - kimi: Kimi AI
 *
 * Resolution priority:
 * 1. Explicit runtime directory (provided at construction)
 * 2. Environment variable (e.g., CLAUDE_CONFIG_DIR)
 * 3. Default path (~/.<runtime>)
 *
 * @class ConfigDirectoryResolver
 */
export class ConfigDirectoryResolver {
  private readonly runtime: string;
  private readonly explicitDir: string | null;

  /**
   * Create a ConfigDirectoryResolver instance
   * @param runtime - The runtime type (claude, opencode, gemini, codex, copilot, qwen, kimi)
   * @param explicitDir - Optional explicit directory path override
   */
  constructor(runtime: string, explicitDir: string | null = null) {
    this.runtime = runtime;
    this.explicitDir = explicitDir;
  }

  /**
   * Resolve the configuration directory path
   * @param isGlobal - Whether this is a global install (affects path resolution)
   * @returns The resolved configuration directory path
   */
  resolve(isGlobal: boolean = true): string {
    // Priority 1: Explicit directory provided at construction
    if (this.explicitDir) {
      return this.expandTilde(this.explicitDir);
    }

    // Priority 2: Environment variable
    const envVar = this.getEnvironmentVariable();
    if (envVar) {
      return this.expandTilde(envVar);
    }

    // Priority 3: Default path
    return this.getDefaultPath(isGlobal);
  }

  /**
   * Get the environment variable name for this runtime
   * @returns The environment variable name or null if not applicable
   * @private
   */
  private getEnvironmentVariable(): string | null {
    const envVarMap: Record<string, string> = {
      claude: 'CLAUDE_CONFIG_DIR',
      opencode: 'OPENCODE_CONFIG_DIR',
      gemini: 'GEMINI_CONFIG_DIR',
      codex: 'CODEX_CONFIG_DIR',
      copilot: 'COPILOT_CONFIG_DIR',
      qwen: 'QWEN_CONFIG_DIR',
      kimi: 'KIMI_CONFIG_DIR',
    };

    const envVar = envVarMap[this.runtime];
    if (!envVar) {
      return null;
    }

    return process.env[envVar] || null;
  }

  /**
   * Get the default path for this runtime
   * @param isGlobal - Whether this is a global install
   * @returns The default configuration directory path
   * @private
   */
  private getDefaultPath(isGlobal: boolean): string {
    const os = require('os');
    const path = require('path');

    if (!isGlobal) {
      // Local installs use directory name pattern
      return path.join(process.cwd(), this.getDirName());
    }

    const homeDir = os.homedir();

    // OpenCode uses XDG Base Directory spec
    if (this.runtime === 'opencode') {
      return this.getOpencodeGlobalDir(homeDir);
    }

    // Copilot uses .copilot in home
    if (this.runtime === 'copilot') {
      return path.join(homeDir, '.copilot');
    }

    // All others use ~/.<runtime>
    return path.join(homeDir, `.${this.runtime}`);
  }

  /**
   * Get OpenCode global directory following XDG spec
   * @param homeDir - Home directory path
   * @returns The OpenCode configuration directory
   * @private
   */
  private getOpencodeGlobalDir(homeDir: string): string {
    const path = require('path');

    // Check XDG_CONFIG_HOME
    if (process.env.XDG_CONFIG_HOME) {
      return path.join(process.env.XDG_CONFIG_HOME, 'opencode');
    }

    // Default to ~/.config/opencode
    return path.join(homeDir, '.config', 'opencode');
  }

  /**
   * Get the directory name for a runtime
   * @returns The directory name
   * @private
   */
  private getDirName(): string {
    const dirNameMap: Record<string, string> = {
      claude: '.claude',
      opencode: '.opencode',
      gemini: '.gemini',
      codex: '.codex',
      copilot: '.github',
      qwen: '.qwen',
      kimi: '.kimi',
    };

    return dirNameMap[this.runtime] || '.claude';
  }

  /**
   * Expand tilde in file path
   * @param filePath - The file path
   * @returns The expanded path
   * @private
   */
  private expandTilde(filePath: string): string {
    if (!filePath.startsWith('~')) {
      return filePath;
    }

    const os = require('os');
    const homeDir = os.homedir();
    return filePath.replace(/^~/, homeDir);
  }
}
