/**
 * Commands — Command pattern implementation for CLI commands
 *
 * Command Pattern: Encapsulates requests as objects, allowing parameterization
 * of clients with different requests, queuing of requests, and logging of requests.
 */

import { output, error } from '../core.js';

/**
 * Command interface
 */
export interface Command {
  /**
   * Execute the command
   */
  execute(): Promise<CommandResult>;
}

/**
 * Command result interface
 */
export interface CommandResult {
  success: boolean;
  data?: unknown;
  output?: string;
  error?: string;
}

/**
 * Base command class with common functionality
 */
export abstract class BaseCommand implements Command {
  protected readonly cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  abstract execute(): Promise<CommandResult>;

  /**
   * Output result and exit (calls process.exit)
   */
  protected result(result: unknown, raw?: boolean, rawValue?: string): void {
    output(result as Record<string, unknown>, raw, rawValue);
    // Note: output() calls process.exit(), so this never returns in practice
  }

  /**
   * Throw error and exit (calls process.exit)
   */
  protected fail(message: string): void {
    error(message);
    // Note: error() calls process.exit(), so this never returns in practice
  }
}

/**
 * Command factory for creating commands by name
 */
export class CommandFactory {
  private static commands = new Map<string, new (cwd: string) => BaseCommand>();

  /**
   * Register a command
   */
  static register(
    name: string,
    commandClass: new (cwd: string) => BaseCommand
  ): void {
    this.commands.set(name, commandClass);
  }

  /**
   * Create a command by name
   */
  static create(name: string, cwd: string): BaseCommand | null {
    const CommandClass = this.commands.get(name);
    return CommandClass ? new CommandClass(cwd) : null;
  }

  /**
   * List registered commands
   */
  static listCommands(): string[] {
    return Array.from(this.commands.keys());
  }
}
