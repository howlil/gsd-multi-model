/**
 * Deploy Rollback — Rolls back to previous version
 * Supports vercel rollback, fly rollback, and git revert
 */

import { execSync } from 'child_process';

/**
 * Rollback result
 */
export interface RollbackResult {
  /** Whether rollback was successful */
  success: boolean;
  /** Platform that was rolled back */
  platform: string;
}

export class DeployRollback {
  private cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
  }

  /**
   * Rollback deployment to previous version
   * @param platform - Platform name
   * @returns Rollback result
   */
  async rollback(platform: string): Promise<RollbackResult> {
    try {
      if (platform === 'vercel') {
        return this.rollbackVercel();
      } else if (platform === 'fly.io') {
        return this.rollbackFly();
      } else {
        return this.rollbackGit();
      }
    } catch (e) {
      throw new Error(`Rollback failed: ${(e as Error).message}`);
    }
  }

  /**
   * Rollback Vercel deployment
   * @returns Result
   */
  private rollbackVercel(): RollbackResult {
    execSync('vercel rollback', { stdio: 'inherit' });
    return { success: true, platform: 'vercel' };
  }

  /**
   * Rollback Fly.io deployment
   * @returns Result
   */
  private rollbackFly(): RollbackResult {
    execSync('fly rollback', { stdio: 'inherit' });
    return { success: true, platform: 'fly.io' };
  }

  /**
   * Generic git revert rollback
   * @returns Result
   */
  private rollbackGit(): RollbackResult {
    execSync('git revert HEAD --no-edit', { cwd: this.cwd, stdio: 'inherit' });
    execSync('git push origin main', { cwd: this.cwd, stdio: 'inherit' });
    return { success: true, platform: 'git' };
  }
}

/**
 * Rollback deployment
 * @param platform - Platform name
 * @param cwd - Working directory
 * @returns Rollback result
 */
export async function rollback(platform: string, cwd?: string): Promise<RollbackResult> {
  const rollbacker = new DeployRollback(cwd);
  return rollbacker.rollback(platform);
}
