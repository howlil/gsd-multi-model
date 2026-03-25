/**
 * Config — Planning config CRUD operations
 */

import * as fs from 'fs';
import * as path from 'path';
import { output, error, Config } from './core.js';
import { safePlanningWriteSync } from './planning-write.js';

const VALID_CONFIG_KEYS = new Set([
  'mode', 'granularity', 'parallelization', 'commit_docs', 'model_profile',
  'search_gitignored', 'brave_search',
  'workflow.research', 'workflow.plan_check', 'workflow.verifier',
  'workflow.nyquist_validation', 'workflow.ui_phase', 'workflow.ui_safety_gate',
  'workflow._auto_chain_active',
  'git.branching_strategy', 'git.phase_branch_template', 'git.milestone_branch_template',
  'planning.commit_docs', 'planning.search_gitignored',
  'security.provider', 'security.scan.default_mode', 'security.scan.block_on_critical',
  'security.headers_profile', 'security.audit_logs.enabled', 'security.audit_logs.format',
  'recovery.enabled', 'recovery.backup_scope', 'recovery.retention.local_backups',
  'recovery.retention.drill_reports', 'recovery.rto_minutes.planning_state',
  'recovery.rto_minutes.release_metadata', 'recovery.rpo_minutes.planning_state',
  'recovery.rpo_minutes.release_metadata',
  'infrastructure.enabled', 'infrastructure.provider', 'infrastructure.environments',
  'infrastructure.validation.checkov', 'infrastructure.validation.cdk_nag',
]);

interface DepthToGranularityMap {
  [key: string]: string;
}

interface UserDefaults {
  [key: string]: any;
  workflow?: {
    [key: string]: any;
  };
  depth?: string;
  granularity?: string;
}

interface HardcodedDefaults {
  model_profile: string;
  commit_docs: boolean;
  search_gitignored: boolean;
  branching_strategy: string;
  phase_branch_template: string;
  milestone_branch_template: string;
  workflow: {
    research: boolean;
    plan_check: boolean;
    verifier: boolean;
    nyquist_validation: boolean;
  };
  parallelization: boolean;
  brave_search: boolean;
  recovery: {
    enabled: boolean;
    backup_scope: string[];
    retention: {
      local_backups: number;
      drill_reports: number;
    };
    rto_minutes: {
      planning_state: number;
      release_metadata: number;
    };
    rpo_minutes: {
      planning_state: number;
      release_metadata: number;
    };
  };
  infrastructure: {
    enabled: boolean;
    provider: string;
    environments: string[];
    validation: {
      checkov: boolean;
      cdk_nag: boolean;
    };
  };
}

/**
 * Ensure config.json exists with default values
 * @param cwd - Current working directory
 * @param raw - If true, output raw value
 */
export function ensureConfigSection(cwd: string, raw?: boolean): void {
  const configPath = path.join(cwd, '.planning', 'config.json');
  const planningDir = path.join(cwd, '.planning');

  // Ensure .planning directory exists
  try {
    if (!fs.existsSync(planningDir)) {
      fs.mkdirSync(planningDir, { recursive: true });
    }
  } catch (err) {
    error('Failed to create .planning directory: ' + (err instanceof Error ? err.message : 'Unknown'));
  }

  // Check if config already exists
  if (fs.existsSync(configPath)) {
    const result = { created: false, reason: 'already_exists' };
    output(result, raw, 'exists');
    return;
  }

  // Detect Brave Search API key availability (prefer ~/.ez)
  const homedir = require('os').homedir();
  const braveKeyCandidates = [
    path.join(homedir, '.ez', 'brave_api_key'),
  ];
  const hasBraveSearch = !!(process.env.BRAVE_API_KEY || braveKeyCandidates.some(p => fs.existsSync(p)));

  // Load user-level defaults from ~/.ez/defaults.json
  const defaultsCandidates = [
    path.join(homedir, '.ez', 'defaults.json'),
  ];
  const existingDefaultsPath = defaultsCandidates.find(p => fs.existsSync(p));
  const globalDefaultsPath = existingDefaultsPath || defaultsCandidates[0];
  let userDefaults: UserDefaults = {};
  
  try {
    if (existingDefaultsPath) {
      userDefaults = JSON.parse(fs.readFileSync(globalDefaultsPath, 'utf-8'));
      // Migrate deprecated "depth" key to "granularity"
      if ('depth' in userDefaults && !('granularity' in userDefaults)) {
        const depthToGranularity: DepthToGranularityMap = { quick: 'coarse', standard: 'standard', comprehensive: 'fine' };
        userDefaults.granularity = depthToGranularity[userDefaults.depth] || userDefaults.depth;
        delete userDefaults.depth;
        try {
          fs.writeFileSync(globalDefaultsPath, JSON.stringify(userDefaults, null, 2), 'utf-8');
        } catch (err) {
          const { defaultLogger: logger } = require('./logger.js');
          logger.warn('Failed to migrate global defaults', { path: globalDefaultsPath, error: err instanceof Error ? err.message : 'Unknown' });
        }
      }
    }
  } catch (err) {
    const { defaultLogger: logger } = require('./logger.js');
    logger.warn('Malformed global defaults, using hardcoded defaults', { path: globalDefaultsPath, error: err instanceof Error ? err.message : 'Unknown' });
  }

  // Create default config (user-level defaults override hardcoded defaults)
  const hardcoded: HardcodedDefaults = {
    model_profile: 'balanced',
    commit_docs: true,
    search_gitignored: false,
    branching_strategy: 'none',
    phase_branch_template: 'ez/phase-{phase}-{slug}',
    milestone_branch_template: 'ez/{milestone}-{slug}',
    workflow: {
      research: true,
      plan_check: true,
      verifier: true,
      nyquist_validation: true,
    },
    parallelization: true,
    brave_search: hasBraveSearch,
    recovery: {
      enabled: true,
      backup_scope: [
        '.planning',
        '.github/workflows',
        'commands',
        'ez-agents/bin/lib',
        'package.json',
        'package-lock.json'
      ],
      retention: {
        local_backups: 10,
        drill_reports: 12
      },
      rto_minutes: {
        planning_state: 30,
        release_metadata: 60
      },
      rpo_minutes: {
        planning_state: 1440,
        release_metadata: 1440
      }
    },
    infrastructure: {
      enabled: true,
      provider: 'aws',
      environments: ['dev', 'staging', 'prod'],
      validation: {
        checkov: true,
        cdk_nag: true
      }
    }
  };
  
  const defaults = {
    ...hardcoded,
    ...userDefaults,
    workflow: { ...hardcoded.workflow, ...(userDefaults.workflow || {}) },
  };

  try {
    safePlanningWriteSync(configPath, JSON.stringify(defaults, null, 2));
    const result = { created: true, path: '.planning/config.json' };
    output(result, raw, 'created');
  } catch (err) {
    error('Failed to create config.json: ' + (err instanceof Error ? err.message : 'Unknown'));
  }
}

/**
 * Set a config value using dot notation
 * @param cwd - Current working directory
 * @param keyPath - Dot-notation key path (e.g., 'workflow.research')
 * @param value - Value to set
 * @param raw - If true, output raw value
 */
export function configSet(cwd: string, keyPath: string, value: string, raw?: boolean): void {
  const configPath = path.join(cwd, '.planning', 'config.json');

  if (!keyPath) {
    error('Usage: config-set <key.path> <value>');
  }

  if (!VALID_CONFIG_KEYS.has(keyPath)) {
    error(`Unknown config key: "${keyPath}". Valid keys: ${Array.from(VALID_CONFIG_KEYS).sort().join(', ')}`);
  }

  // Parse value (handle booleans and numbers)
  let parsedValue: any = value;
  if (value === 'true') parsedValue = true;
  else if (value === 'false') parsedValue = false;
  else if (!isNaN(Number(value)) && value !== '') parsedValue = Number(value);

  // Load existing config or start with empty object
  let config: Record<string, any> = {};
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (err) {
    error('Failed to read config.json: ' + (err instanceof Error ? err.message : 'Unknown'));
  }

  // Set nested value using dot notation (e.g., "workflow.research")
  const keys = keyPath.split('.');
  let current: any = config;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = parsedValue;

  // Write back
  try {
    safePlanningWriteSync(configPath, JSON.stringify(config, null, 2));
    const result = { updated: true, key: keyPath, value: parsedValue };
    output(result, raw, `${keyPath}=${parsedValue}`);
  } catch (err) {
    error('Failed to write config.json: ' + (err instanceof Error ? err.message : 'Unknown'));
  }
}

/**
 * Get a config value using dot notation
 * @param cwd - Current working directory
 * @param keyPath - Dot-notation key path (e.g., 'workflow.research')
 * @param raw - If true, output raw value
 */
export function configGet(cwd: string, keyPath: string, raw?: boolean): void {
  const configPath = path.join(cwd, '.planning', 'config.json');

  if (!keyPath) {
    error('Usage: config-get <key.path>');
  }

  let config: Record<string, any> = {};
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } else {
      error('No config.json found at ' + configPath);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('No config.json')) {
      throw err;
    }
    error('Failed to read config.json: ' + (err instanceof Error ? err.message : 'Unknown'));
  }

  // Traverse dot-notation path (e.g., "workflow.auto_advance")
  const keys = keyPath.split('.');
  let current: any = config;
  
  for (const key of keys) {
    if (current === undefined || current === null || typeof current !== 'object') {
      error(`Key not found: ${keyPath}`);
    }
    current = current[key];
  }

  if (current === undefined) {
    error(`Key not found: ${keyPath}`);
  }

  output(current, raw, String(current));
}
