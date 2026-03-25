/**
 * ListTodosCommand — List pending todos
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseCommand, type CommandResult } from './index.js';
import { toPosixPath } from '../core.js';
import { defaultLogger as logger } from '../logger.js';

export interface TodoEntry {
  file: string;
  created: string;
  title: string;
  area: string;
  path: string;
}

export interface ListTodosOptions {
  area?: string;
  raw?: boolean;
}

/**
 * Command to list pending todos
 */
export class ListTodosCommand extends BaseCommand {
  private readonly area?: string | undefined;
  private readonly raw: boolean;

  constructor(cwd: string, options: ListTodosOptions = {}) {
    super(cwd);
    this.area = options.area;
    this.raw = options.raw ?? false;
  }

  async execute(): Promise<CommandResult> {
    const pendingDir = path.join(this.cwd, '.planning', 'todos', 'pending');

    const todos: TodoEntry[] = [];

    try {
      if (!fs.existsSync(pendingDir)) {
        this.result({ count: 0, todos: [] }, this.raw, '0');
        return { success: true, data: { count: 0, todos: [] } }; // Never reached
      }

      const files = fs
        .readdirSync(pendingDir)
        .filter((f) => f.endsWith('.md'));

      for (const file of files) {
        try {
          const content = fs.readFileSync(
            path.join(pendingDir, file),
            'utf-8'
          );
          const createdMatch = content.match(/^created:\s*(.+)$/m);
          const titleMatch = content.match(/^title:\s*(.+)$/m);
          const areaMatch = content.match(/^area:\s*(.+)$/m);

          const todoArea = areaMatch
            ? areaMatch[1]?.trim() ?? 'general'
            : 'general';

          // Apply area filter if specified
          if (this.area && todoArea !== this.area) continue;

          todos.push({
            file,
            created: createdMatch
              ? createdMatch[1]?.trim() ?? 'unknown'
              : 'unknown',
            title: titleMatch
              ? titleMatch[1]?.trim() ?? 'Untitled'
              : 'Untitled',
            area: todoArea,
            path: toPosixPath(
              path.join('.planning', 'todos', 'pending', file)
            ),
          });
        } catch (err) {
          const error = err as Error;
          logger.warn('Failed to parse todo file', {
            file,
            error: error.message,
          });
        }
      }
    } catch (err) {
      const error = err as Error;
      logger.warn('Failed to list pending todos', {
        pendingDir,
        error: error.message,
      });
    }

    const result = { count: todos.length, todos };
    this.result(result, this.raw, todos.length.toString());
    return { success: true, data: result }; // Never reached
  }
}
