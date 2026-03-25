/**
 * Deploy Env Manager — Multi-environment deploy config
 * Manages dev/staging/prod environment configurations
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Environment configuration
 */
export interface EnvConfig {
  /** Environment name */
  env: string;
  /** Platform name */
  platform: string;
  /** Environment URL */
  url: string | null;
  /** Required environment variables */
  requiredVars: string[];
}

/**
 * Deploy configuration structure
 */
interface DeployConfig {
  environments?: Record<string, Partial<EnvConfig>>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Array of missing environment variable names */
  missing: string[];
}

export class DeployEnvManager {
  private cwd: string;
  private configPath: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.configPath = path.join(this.cwd, '.planning', 'deploy-config.json');
  }

  /**
   * Get environment configuration
   * @param env - Environment name (dev, staging, prod)
   * @returns Environment config
   */
  getEnvConfig(env: string): EnvConfig {
    const config = this.loadConfig();
    const defaultConfig: EnvConfig = {
      env,
      platform: 'vercel',
      url: null,
      requiredVars: []
    };

    return config.environments?.[env] ? { ...defaultConfig, ...config.environments[env] } : defaultConfig;
  }

  /**
   * Set environment configuration
   * @param env - Environment name
   * @param config - Configuration to set
   */
  setEnv(env: string, config: Partial<EnvConfig>): void {
    const current = this.loadConfig();
    if (!current.environments) current.environments = {};
    current.environments[env] = { ...current.environments[env], ...config };
    this.saveConfig(current);
  }

  /**
   * List all configured environments
   * @returns Array of environment names
   */
  listEnvs(): string[] {
    const config = this.loadConfig();
    return Object.keys(config.environments || {});
  }

  /**
   * Validate environment has required variables
   * @param env - Environment name
   * @returns Validation result { valid, missing }
   */
  validateEnv(env: string): ValidationResult {
    const config = this.getEnvConfig(env);
    const missing: string[] = [];

    for (const envVar of config.requiredVars || []) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Load config from file
   * @returns Config
   */
  private loadConfig(): DeployConfig {
    if (!fs.existsSync(this.configPath)) {
      return { environments: {} };
    }
    return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
  }

  /**
   * Save config to file
   * @param config - Config to save
   */
  private saveConfig(config: DeployConfig): void {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
  }
}

/**
 * Get environment configuration
 * @param env - Environment name
 * @param cwd - Working directory
 * @returns Environment config
 */
export function getEnvConfig(env: string, cwd?: string): EnvConfig {
  const manager = new DeployEnvManager(cwd);
  return manager.getEnvConfig(env);
}
