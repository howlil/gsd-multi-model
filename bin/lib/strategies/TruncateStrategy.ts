/**
 * Truncate Strategy
 *
 * Simple length-based truncation strategy for context compression.
 * Provides fast, deterministic compression by truncating content
 * at word or sentence boundaries.
 *
 * @example
 * ```typescript
 * const strategy = new TruncateStrategy(4000);
 * const result = await strategy.compress(content, { maxTokens: 4000 });
 * ```
 */

import { LogExecution } from '../decorators/LogExecution.js';
import { defaultLogger as logger } from '../logger.js';
import type { CompressionStrategy, CompressionOptions, CompressionResult } from './CompressionStrategy.js';

/**
 * TruncateStrategy implementation
 *
 * Provides fast, deterministic compression by:
 * - Truncating at word boundaries (not cutting words in half)
 * - Preserving content structure when possible
 * - Respecting maxTokens option
 */
export class TruncateStrategy implements CompressionStrategy {
  private defaultMaxTokens: number;

  /**
   * Create a TruncateStrategy instance
   * @param maxTokens - Default maximum tokens to retain
   */
  constructor(maxTokens: number = 1000) {
    this.defaultMaxTokens = maxTokens;
  }

  /**
   * Get the strategy name
   * @returns Strategy identifier
   */
  getName(): string {
    return 'truncate';
  }

  /**
   * Compress content using truncation
   * @param content - Content to compress
   * @param options - Compression options
   * @returns Compression result with metadata
   */
  @LogExecution('TruncateStrategy.compress', { logParams: false, logResult: false, level: 'debug' })
  async compress(content: string, options: CompressionOptions = {}): Promise<CompressionResult> {
    const originalSize = content.length;

    if (!content || content.length === 0) {
      return {
        content: '',
        originalSize: 0,
        compressedSize: 0,
        reduction: 0,
        method: 'truncate'
      };
    }

    // Calculate max characters from tokens
    const maxTokens = options.maxTokens ?? this.defaultMaxTokens;
    const charsPerToken = 4; // Conservative estimate
    const maxChars = maxTokens * charsPerToken;

    // If content is already within limits, return as-is
    if (content.length <= maxChars) {
      return {
        content,
        originalSize,
        compressedSize: originalSize,
        reduction: 0,
        method: 'truncate'
      };
    }

    // Truncate content at appropriate boundary
    const truncatedContent = this._truncateAtBoundary(content, maxChars);

    const compressedSize = truncatedContent.length;
    const reduction = originalSize - compressedSize;

    logger.debug('TruncateStrategy compression complete', {
      originalSize,
      compressedSize,
      reduction,
      ratio: originalSize > 0 ? ((reduction / originalSize) * 100).toFixed(2) + '%' : '0%'
    });

    return {
      content: truncatedContent,
      originalSize,
      compressedSize,
      reduction,
      method: 'truncate',
      metadata: {
        maxTokens,
        truncateMethod: 'word-boundary'
      }
    };
  }

  /**
   * Truncate content at word or sentence boundary
   * @param content - Content to truncate
   * @param maxLength - Maximum length in characters
   * @returns Truncated content
   * @private
   */
  private _truncateAtBoundary(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    // Reserve space for ellipsis
    const reserveLength = ' [...]'.length;
    const targetLength = maxLength - reserveLength;

    // Try to find sentence boundary (period, exclamation, question mark)
    const sentenceEnd = this._findLastBoundary(content, ['.', '!', '?'], targetLength);
    if (sentenceEnd > targetLength * 0.5) {
      return content.slice(0, sentenceEnd + 1) + ' [...]';
    }

    // Try to find paragraph boundary (double newline)
    const paragraphEnd = content.lastIndexOf('\n\n', targetLength);
    if (paragraphEnd > targetLength * 0.5) {
      return content.slice(0, paragraphEnd) + '\n\n[...]';
    }

    // Try to find word boundary (space)
    const wordBoundary = content.lastIndexOf(' ', targetLength);
    if (wordBoundary > targetLength * 0.5) {
      return content.slice(0, wordBoundary) + ' [...]';
    }

    // Fallback: truncate at exact character limit (may cut word)
    return content.slice(0, targetLength) + ' [...]';
  }

  /**
   * Find the last occurrence of any boundary character
   * @param content - Content to search
   * @param boundaries - Array of boundary characters
   * @param maxLength - Maximum search length
   * @returns Index of last boundary, or -1 if not found
   * @private
   */
  private _findLastBoundary(content: string, boundaries: string[], maxLength: number): number {
    let lastIndex = -1;

    for (const boundary of boundaries) {
      const index = content.lastIndexOf(boundary, maxLength);
      if (index > lastIndex) {
        lastIndex = index;
      }
    }

    return lastIndex;
  }

  /**
   * Truncate content to fit within token limit
   * @param content - Content to truncate
   * @param maxTokens - Maximum tokens
   * @returns Truncated content
   * @deprecated Use compress() with options instead
   */
  truncateToTokens(content: string, maxTokens?: number): string {
    const charsPerToken = 4;
    const maxChars = (maxTokens ?? this.defaultMaxTokens) * charsPerToken;
    return this._truncateAtBoundary(content, maxChars);
  }
}

export default TruncateStrategy;
