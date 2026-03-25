/**
 * CurrentTimestampCommand — Get current timestamp in various formats
 */

import { BaseCommand, type CommandResult } from './index.js';

export type TimestampFormat = 'date' | 'filename' | 'full';

export interface CurrentTimestampOptions {
  format?: TimestampFormat;
  raw?: boolean;
}

/**
 * Command to get current timestamp
 */
export class CurrentTimestampCommand extends BaseCommand {
  private readonly format: TimestampFormat;
  private readonly raw: boolean;

  constructor(cwd: string, options: CurrentTimestampOptions = {}) {
    super(cwd);
    this.format = options.format ?? 'full';
    this.raw = options.raw ?? false;
  }

  async execute(): Promise<CommandResult> {
    const now = new Date();
    let result: string;

    switch (this.format) {
      case 'date':
        result = now.toISOString().split('T')[0]!;
        break;
      case 'filename':
        result = now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
        break;
      case 'full':
      default:
        result = now.toISOString();
        break;
    }

    this.result({ timestamp: result }, this.raw, result);
    return { success: true, data: { timestamp: result } }; // Never reached
  }
}
