/**
 * GenerateSlugCommand — Generate URL-friendly slug from text
 */

import { BaseCommand, type CommandResult } from './index.js';

export interface GenerateSlugOptions {
  text: string;
  raw?: boolean;
}

/**
 * Command to generate a slug from text
 */
export class GenerateSlugCommand extends BaseCommand {
  private readonly text: string;
  private readonly raw: boolean;

  constructor(cwd: string, options: GenerateSlugOptions) {
    super(cwd);
    this.text = options.text;
    this.raw = options.raw ?? false;
  }

  async execute(): Promise<CommandResult> {
    if (!this.text) {
      this.fail('text required for slug generation');
    }

    const slug = this.text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    this.result({ slug }, this.raw, slug);
    return { success: true, data: { slug } }; // Never reached due to process.exit() in result()
  }
}
