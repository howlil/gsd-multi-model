/**
 * Base CLI Handler — Abstract base class for CLI entry points
 *
 * Provides common CLI functionality including:
 * - Color constants for terminal output
 * - Logging utility methods
 * - Path expansion utilities
 * - JSON file operations
 * - Directory management
 *
 * @abstract
 * @class BaseCliHandler
 */
export abstract class BaseCliHandler {
  /**
   * Color codes for terminal output
   */
  protected readonly colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    bold: '\x1b[1m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
  };

  /**
   * Log a message to console with optional color
   * @param message - The message to log
   * @param color - Optional color key from colors object
   */
  protected log(message: string, color?: keyof typeof this.colors): void {
    const colorCode = color ? this.colors[color] : '';
    const resetCode = color ? this.colors.reset : '';
    console.log(`${colorCode}${message}${resetCode}`);
  }

  /**
   * Expand tilde (~) in file paths to home directory
   * @param filePath - The file path potentially containing ~
   * @returns The expanded absolute path
   */
  protected expandTilde(filePath: string): string {
    if (!filePath.startsWith('~')) {
      return filePath;
    }

    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    return filePath.replace(/^~/, homeDir);
  }

  /**
   * Read and parse a JSON file
   * @template T - Expected type of the JSON data
   * @param path - Path to the JSON file
   * @returns Parsed JSON data
   * @throws {Error} If file cannot be read or parsed
   */
  protected readJsonFile<T>(path: string): T {
    const fs = require('fs');
    const content = fs.readFileSync(path, 'utf-8');
    return JSON.parse(content) as T;
  }

  /**
   * Write data to a JSON file
   * @param path - Path to the JSON file
   * @param data - Data to write (will be JSON stringified)
   * @throws {Error} If file cannot be written
   */
  protected writeJsonFile(path: string, data: unknown): void {
    const fs = require('fs');
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(path, content, 'utf-8');
  }

  /**
   * Ensure a directory exists, creating it if necessary
   * @param dirPath - Path to the directory
   * @throws {Error} If directory cannot be created
   */
  protected ensureDirectory(dirPath: string): void {
    const fs = require('fs');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}
