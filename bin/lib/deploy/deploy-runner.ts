/**
 * Deploy Runner — Executes one-command deploy for multiple platforms
 * Spawns platform CLI (vercel, flyctl, heroku, railway)
 */

import { spawn, execSync } from 'child_process';

/**
 * Deploy options
 */
export interface DeployOptions {
  /** Environment name */
  env?: string;
  /** Callback for output data */
  onOutput?: (data: string) => void;
}

/**
 * Deploy result
 */
export interface DeployResult {
  /** Whether deployment was successful */
  success: boolean;
  /** Deployment output */
  output: string;
}

export class DeployRunner {
  private cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
  }

  /**
   * Run deployment for specified platform
   * @param platform - Platform name (vercel, fly.io, heroku, railway)
   * @param options - Deploy options
   * @returns Deploy result
   */
  async run(platform: string, options: DeployOptions = {}): Promise<DeployResult> {
    const commands: Record<string, string[]> = {
      vercel: ['vercel', '--prod', ...(options.env ? ['--env', options.env] : [])],
      'fly.io': ['fly', 'deploy', ...(options.env ? ['--env', options.env] : [])],
      heroku: ['git', 'push', 'heroku', 'main'],
      railway: ['railway', 'up', ...(options.env ? ['--environment', options.env] : [])]
    };

    const cmdArgs = commands[platform];
    if (!cmdArgs) {
      throw new Error(`Unknown platform: ${platform}`);
    }

    const [cmd, ...args] = cmdArgs;

    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: this.cwd,
        timeout: 300000 // 5 minute timeout
      });

      let output = '';
      proc.stdout.on('data', (data) => {
        output += data.toString();
        if (options.onOutput) options.onOutput(data.toString());
      });
      proc.stderr.on('data', (data) => {
        output += data.toString();
        if (options.onOutput) options.onOutput(data.toString());
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output });
        } else {
          reject(new Error(`Deploy failed with code ${code}`));
        }
      });

      proc.on('error', reject);
    });
  }

  /**
   * Check if platform CLI is installed
   * @param platform - Platform name
   * @returns True if installed
   */
  isCliInstalled(platform: string): boolean {
    const commands: Record<string, string> = {
      vercel: 'vercel',
      'fly.io': 'fly',
      heroku: 'heroku',
      railway: 'railway'
    };

    try {
      execSync(`${commands[platform]} --version`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Run deployment
 * @param platform - Platform name
 * @param options - Deploy options
 * @returns Deploy result
 */
export async function run(platform: string, options: DeployOptions = {}): Promise<DeployResult> {
  const runner = new DeployRunner();
  return runner.run(platform, options);
}
