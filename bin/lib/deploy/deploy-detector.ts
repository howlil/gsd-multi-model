/**
 * Deploy Detector — Detects target deployment environment
 * Checks config files (vercel.json, fly.toml, Procfile) and git remotes
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Deployment detection result
 */
export interface DetectionResult {
  /** Detected platform name */
  platform: string;
  /** Confidence level */
  confidence: 'high' | 'medium' | 'none';
  /** Source of detection (config file or git-remote) */
  source: string;
}

/**
 * Configuration check definition
 */
interface ConfigCheck {
  file: string;
  platform: string;
  confidence: 'high' | 'medium';
}

export class DeployDetector {
  private cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
  }

  /**
   * Detect deployment environment from config files and git remotes
   * @returns Detection result { platform, confidence, source }
   */
  detect(): DetectionResult {
    // Check for platform config files (high confidence)
    const configChecks: ConfigCheck[] = [
      { file: 'vercel.json', platform: 'vercel', confidence: 'high' },
      { file: 'fly.toml', platform: 'fly.io', confidence: 'high' },
      { file: 'Procfile', platform: 'heroku', confidence: 'high' },
      { file: 'railway.json', platform: 'railway', confidence: 'high' }
    ];

    for (const check of configChecks) {
      if (fs.existsSync(path.join(this.cwd, check.file))) {
        return {
          platform: check.platform,
          confidence: check.confidence,
          source: check.file
        };
      }
    }

    // Fallback: check git remotes (medium confidence)
    try {
      const remotes = execSync('git remote -v', {
        cwd: this.cwd,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      if (remotes.includes('vercel.com')) {
        return { platform: 'vercel', confidence: 'medium', source: 'git-remote' };
      }
      if (remotes.includes('fly.dev')) {
        return { platform: 'fly.io', confidence: 'medium', source: 'git-remote' };
      }
      if (remotes.includes('heroku.com')) {
        return { platform: 'heroku', confidence: 'medium', source: 'git-remote' };
      }
    } catch {
      // No git or no remotes
    }

    return { platform: 'unknown', confidence: 'none', source: 'none' };
  }
}

/**
 * Detect deployment environment
 * @param cwd - Working directory
 * @returns Detection result
 */
export function detect(cwd?: string): DetectionResult {
  const detector = new DeployDetector(cwd);
  return detector.detect();
}
