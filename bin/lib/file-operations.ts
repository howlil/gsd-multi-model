/**
 * File Operations — Provides file and directory operations
 *
 * Encapsulates common file system operations:
 * - File copying
 * - Directory copying (recursive)
 * - File reading/writing
 * - Existence checks
 *
 * @class FileOperations
 */
export class FileOperations {
  private fs: any;
  private path: any;

  /**
   * Create a FileOperations instance
   */
  constructor() {
    this.fs = require('fs');
    this.path = require('path');
  }

  /**
   * Copy a file from source to destination
   * @param src - Source file path
   * @param dest - Destination file path
   * @throws {Error} If source file doesn't exist or copy fails
   */
  copyFile(src: string, dest: string): void {
    if (!this.fileExists(src)) {
      throw new Error(`Source file does not exist: ${src}`);
    }

    // Ensure destination directory exists
    const destDir = this.path.dirname(dest);
    this.ensureDirectory(destDir);

    this.fs.copyFileSync(src, dest);
  }

  /**
   * Copy a directory recursively from source to destination
   * @param src - Source directory path
   * @param dest - Destination directory path
   * @throws {Error} If source directory doesn't exist or copy fails
   */
  copyDirectory(src: string, dest: string): void {
    if (!this.directoryExists(src)) {
      throw new Error(`Source directory does not exist: ${src}`);
    }

    // Ensure destination directory exists
    this.ensureDirectory(dest);

    // Read source directory contents
    const entries = this.fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = this.path.join(src, entry.name);
      const destPath = this.path.join(dest, entry.name);

      if (entry.isDirectory()) {
        // Recursively copy subdirectory
        this.copyDirectory(srcPath, destPath);
      } else {
        // Copy file
        this.fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Read a file and return its contents
   * @param filePath - Path to the file
   * @returns File contents as string
   * @throws {Error} If file doesn't exist or cannot be read
   */
  readFile(filePath: string): string {
    if (!this.fileExists(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    return this.fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Write content to a file
   * @param filePath - Path to the file
   * @param content - Content to write
   * @throws {Error} If file cannot be written
   */
  writeFile(filePath: string, content: string): void {
    // Ensure directory exists
    const dir = this.path.dirname(filePath);
    this.ensureDirectory(dir);

    this.fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Check if a file exists
   * @param filePath - Path to the file
   * @returns True if file exists, false otherwise
   */
  fileExists(filePath: string): boolean {
    try {
      return this.fs.existsSync(filePath) && this.fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory exists
   * @param dirPath - Path to the directory
   * @returns True if directory exists, false otherwise
   */
  directoryExists(dirPath: string): boolean {
    try {
      return this.fs.existsSync(dirPath) && this.fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Ensure a directory exists, creating it if necessary
   * @param dirPath - Path to the directory
   * @throws {Error} If directory cannot be created
   */
  ensureDirectory(dirPath: string): void {
    if (!this.fs.existsSync(dirPath)) {
      this.fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}
