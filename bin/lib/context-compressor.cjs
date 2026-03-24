#!/usr/bin/env node

/**
 * Context Compressor
 *
 * Compresses file content to reduce token usage while preserving essential information.
 * Supports multiple compression strategies based on file type:
 * - Code files: Code folding (keep signatures, collapse bodies)
 * - Markdown: Keep headers, code blocks, first sentences
 * - JSON: Minification
 * - Logs/Text: Keep first N and last M lines
 * - Default: Whitespace removal
 *
 * Usage:
 *   const ContextCompressor = require('./context-compressor.cjs');
 *   const compressor = new ContextCompressor({ minSizeForCompression: 5000 });
 *   const result = compressor.compressFile('./src/large-file.ts');
 */

const fs = require('fs');
const path = require('path');

class ContextCompressor {
  /**
   * Create a new ContextCompressor instance
   * @param {{minSizeForCompression?: number, maxTokenBudget?: number, keepFunctionSignatures?: boolean, keepImports?: boolean, keepExports?: boolean, summaryRatio?: number, keepFirstNLines?: number, keepLastNLines?: number}} [options] - Compression options
   */
  constructor(options = {}) {
    this.options = {
      // Compression thresholds
      minSizeForCompression: options.minSizeForCompression || 5000, // bytes
      maxTokenBudget: options.maxTokenBudget || 4000, // tokens

      // Code folding options
      keepFunctionSignatures: options.keepFunctionSignatures !== false,
      keepImports: options.keepImports !== false,
      keepExports: options.keepExports !== false,

      // Summary options
      summaryRatio: options.summaryRatio || 0.3, // Keep 30% of original

      // Line-based options
      keepFirstNLines: options.keepFirstNLines || 20,
      keepLastNLines: options.keepLastNLines || 30,

      ...options
    };

    this.compressionStats = {
      totalFiles: 0,
      compressedFiles: 0,
      originalSize: 0,
      compressedSize: 0
    };
  }

  /**
   * Compress file content
   * @param {string} filePath - Path to file
   * @param {string} [content] - Optional content (reads if not provided)
   * @returns {{compressed: boolean, content: string, originalSize: number, compressedSize: number, method: string, reduction: number}}
   */
  compressFile(filePath, content = null) {
    const ext = path.extname(filePath).toLowerCase();

    // Read content if not provided
    if (content === null) {
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch (err) {
        return {
          compressed: false,
          content: '',
          originalSize: 0,
          compressedSize: 0,
          method: 'error',
          reduction: 0
        };
      }
    }

    const originalSize = content.length;
    this.compressionStats.totalFiles++;
    this.compressionStats.originalSize += originalSize;

    // Skip if file is small
    if (originalSize < this.options.minSizeForCompression) {
      return {
        compressed: false,
        content,
        originalSize,
        compressedSize: originalSize,
        method: 'none',
        reduction: 0
      };
    }

    // Choose compression strategy based on file type
    let compressedContent;
    let method;

    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      // Code files: use code folding
      ({ content: compressedContent, method } = this.compressCode(content, ext));
    } else if (ext === '.md') {
      // Markdown: keep headers and first sentences
      ({ content: compressedContent, method } = this.compressMarkdown(content));
    } else if (ext === '.json') {
      // JSON: minify
      ({ content: compressedContent, method } = this.compressJson(content));
    } else if (ext === '.log' || ext === '.txt') {
      // Logs/text: keep first N and last M lines
      ({ content: compressedContent, method } = this.compressLines(content));
    } else {
      // Default: whitespace removal
      ({ content: compressedContent, method } = this.compressWhitespace(content));
    }

    const compressedSize = compressedContent.length;
    this.compressionStats.compressedFiles++;
    this.compressionStats.compressedSize += compressedSize;

    const reduction = Math.round((1 - compressedSize / originalSize) * 100);

    return {
      compressed: true,
      content: compressedContent,
      originalSize,
      compressedSize,
      method,
      reduction
    };
  }

  /**
   * Compress code files (TypeScript/JavaScript)
   * @param {string} content - File content
   * @param {string} ext - File extension
   * @returns {{content: string, method: string}}
   */
  compressCode(content, ext) {
    const lines = content.split('\n');
    const compressedLines = [];
    let inFunction = false;
    let functionDepth = 0;
    let skippedLines = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Keep imports
      if (this.options.keepImports && (trimmed.startsWith('import ') || trimmed.startsWith('export '))) {
        compressedLines.push(line);
        continue;
      }

      // Detect function start
      const functionMatch = trimmed.match(/^(export\s+)?(async\s+)?function\s+\w+\s*\(/) ||
                           trimmed.match(/^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/) ||
                           trimmed.match(/^(export\s+)?(class\s+\w+)/) ||
                           trimmed.match(/^\s*(public|private|protected)?\s*(async\s+)?\w+\s*\([^)]*\)\s*:/) ||
                           trimmed.match(/^\s*(const|let|var)\s+\w+\s*=\s*(async\s+)?\([^)]*\)\s*=>/) ||
                           trimmed.match(/^\s*(async\s+)?\w+\s*\([^)]*\)\s*{/);

      if (functionMatch && this.options.keepFunctionSignatures) {
        // Keep function signature
        compressedLines.push(line);
        inFunction = true;
        functionDepth = 1;
        continue;
      }

      // Track function depth
      if (inFunction) {
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;
        functionDepth += openBraces - closeBraces;

        if (functionDepth <= 0) {
          // End of function
          inFunction = false;
          functionDepth = 0;
          if (skippedLines > 0) {
            compressedLines.push(`  // ... ${skippedLines} lines of implementation ...`);
            skippedLines = 0;
          }
          compressedLines.push(line);
        } else {
          // Skip function body
          skippedLines++;
          continue;
        }
      }

      // Keep comments and empty lines between functions
      if (!inFunction && (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed === '')) {
        compressedLines.push(line);
      }

      // Keep top-level code
      if (!inFunction && functionDepth === 0) {
        compressedLines.push(line);
      }
    }

    const compressedContent = compressedLines.join('\n');
    return {
      content: compressedContent,
      method: 'code_folding'
    };
  }

  /**
   * Compress Markdown files
   * @param {string} content - Markdown content
   * @returns {{content: string, method: string}}
   */
  compressMarkdown(content) {
    const lines = content.split('\n');
    const compressedLines = [];
    let inCodeBlock = false;
    let inList = false;
    let listItemCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Keep headers
      if (trimmed.startsWith('#')) {
        compressedLines.push(line);
        inList = false;
        listItemCount = 0;
        continue;
      }

      // Keep code blocks
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        compressedLines.push(line);
        continue;
      }

      if (inCodeBlock) {
        compressedLines.push(line);
        continue;
      }

      // Keep first sentence of paragraphs
      if (trimmed.length > 0 && !inList) {
        const firstSentence = trimmed.split(/[.!?]/)[0];
        if (firstSentence.length > 0) {
          compressedLines.push(firstSentence + '.');
        }
        inList = false;
        listItemCount = 0;
      }

      // Keep list items (but limit)
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
        if (!inList) {
          compressedLines.push('... list items ...');
          inList = true;
        }
        // Keep first 3 list items per section
        if (listItemCount < 3) {
          compressedLines.push(line);
          listItemCount++;
        }
      }
    }

    return {
      content: compressedLines.join('\n'),
      method: 'markdown_summary'
    };
  }

  /**
   * Compress JSON files (minify)
   * @param {string} content - JSON content
   * @returns {{content: string, method: string}}
   */
  compressJson(content) {
    try {
      const parsed = JSON.parse(content);
      // Keep structure but remove whitespace
      const minified = JSON.stringify(parsed);
      return {
        content: minified,
        method: 'json_minify'
      };
    } catch (err) {
      // Invalid JSON, return as-is
      return {
        content,
        method: 'none'
      };
    }
  }

  /**
   * Compress line-based files (logs, plain text)
   * @param {string} content - File content
   * @returns {{content: string, method: string}}
   */
  compressLines(content) {
    const lines = content.split('\n');
    const totalLines = lines.length;

    if (totalLines <= this.options.keepFirstNLines + this.options.keepLastNLines) {
      return {
        content,
        method: 'none'
      };
    }

    const firstLines = lines.slice(0, this.options.keepFirstNLines);
    const lastLines = lines.slice(-this.options.keepLastNLines);
    const skippedLines = totalLines - this.options.keepFirstNLines - this.options.keepLastNLines;

    const compressedContent = [
      ...firstLines,
      `... ${skippedLines} lines omitted ...`,
      ...lastLines
    ].join('\n');

    return {
      content: compressedContent,
      method: 'first_last_lines'
    };
  }

  /**
   * Compress by removing whitespace (fallback)
   * @param {string} content - File content
   * @returns {{content: string, method: string}}
   */
  compressWhitespace(content) {
    // Remove multiple spaces, tabs, and empty lines
    const compressed = content
      .replace(/\n\s*\n/g, '\n') // Multiple empty lines
      .replace(/  +/g, ' ')      // Multiple spaces
      .replace(/\t/g, ' ')       // Tabs to spaces
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n');

    return {
      content: compressed,
      method: 'whitespace_removal'
    };
  }

  /**
   * Get compression statistics
   * @returns {{totalFiles: number, compressedFiles: number, originalSize: number, compressedSize: number, reductionPercent: number}}
   */
  getStats() {
    const reductionPercent = this.compressionStats.originalSize > 0
      ? Math.round((1 - this.compressionStats.compressedSize / this.compressionStats.originalSize) * 100)
      : 0;

    return {
      totalFiles: this.compressionStats.totalFiles,
      compressedFiles: this.compressionStats.compressedFiles,
      originalSize: this.compressionStats.originalSize,
      compressedSize: this.compressionStats.compressedSize,
      reductionPercent
    };
  }

  /**
   * Reset compression statistics
   */
  resetStats() {
    this.compressionStats = {
      totalFiles: 0,
      compressedFiles: 0,
      originalSize: 0,
      compressedSize: 0
    };
  }
}

module.exports = ContextCompressor;
