/**
 * VerifyPathCommand — Verify if a path exists
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseCommand, type CommandResult } from './index.js';

export interface VerifyPathOptions {
  targetPath: string;
  raw?: boolean;
}

/**
 * Command to verify path existence
 */
export class VerifyPathCommand extends BaseCommand {
  private readonly targetPath: string;
  private readonly raw: boolean;

  constructor(cwd: string, options: VerifyPathOptions) {
    super(cwd);
    this.targetPath = options.targetPath;
    this.raw = options.raw ?? false;
  }

  async execute(): Promise<CommandResult> {
    if (!this.targetPath) {
      this.fail('path required for verification');
    }

    const fullPath = path.isAbsolute(this.targetPath)
      ? this.targetPath
      : path.join(this.cwd, this.targetPath);

    try {
      const stats = fs.statSync(fullPath);
      const type = stats.isDirectory()
        ? 'directory'
        : stats.isFile()
        ? 'file'
        : 'other';
      this.result({ exists: true, type }, this.raw, 'true');
      return { success: true, data: { exists: true, type } }; // Never reached
    } catch (err) {
      const error = err as Error;
      this.result(
        { exists: false, type: null, error: error.message },
        this.raw,
        'false'
      );
      return { success: true, data: { exists: false, error: error.message } }; // Never reached
    }
  }
}
