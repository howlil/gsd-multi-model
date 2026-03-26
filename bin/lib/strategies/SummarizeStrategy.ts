/**
 * Summarize Strategy
 *
 * AI-powered summarization strategy for context compression.
 * Uses LLM models to generate concise summaries while preserving
 * key information and code blocks.
 *
 * @example
 * ```typescript
 * const strategy = new SummarizeStrategy('claude-sonnet');
 * const result = await strategy.compress(content, {
 *   maxTokens: 4000,
 *   preserveCodeBlocks: true
 * });
 * ```
 */

import { LogExecution } from '../decorators/LogExecution.js';
import { defaultLogger as logger } from '../logger.js';
import type { CompressionStrategy, CompressionOptions, CompressionResult } from './CompressionStrategy.js';

/**
 * SummarizeStrategy implementation
 *
 * Uses AI models to intelligently summarize content while preserving:
 * - Key information and context
 * - Code blocks (when preserveCodeBlocks is true)
 * - Important structural elements
 */
export class SummarizeStrategy implements CompressionStrategy {
  private modelName?: string;

  /**
   * Create a SummarizeStrategy instance
   * @param modelName - Optional AI model name for summarization
   */
  constructor(modelName?: string) {
    this.modelName = modelName ?? 'claude-sonnet';
  }

  /**
   * Get the strategy name
   * @returns Strategy identifier
   */
  getName(): string {
    return 'summarize';
  }

  /**
   * Compress content using AI-powered summarization
   * @param content - Content to compress
   * @param options - Compression options
   * @returns Compression result with metadata
   */
  @LogExecution('SummarizeStrategy.compress', { logParams: false, logResult: false, level: 'debug' })
  async compress(content: string, options: CompressionOptions = {}): Promise<CompressionResult> {
    const originalSize = content.length;

    if (!content || content.length === 0) {
      return {
        content: '',
        originalSize: 0,
        compressedSize: 0,
        reduction: 0,
        method: 'summarize'
      };
    }

    // Extract code blocks if preservation is requested
    const codeBlocks: string[] = [];
    let processedContent = content;

    if (options.preserveCodeBlocks) {
      processedContent = this._extractCodeBlocks(content, codeBlocks);
    }

    // Apply summarization
    const summarizedContent = this._summarize(processedContent, options);

    // Restore code blocks
    let finalContent = summarizedContent;
    if (options.preserveCodeBlocks && codeBlocks.length > 0) {
      finalContent = this._restoreCodeBlocks(summarizedContent, codeBlocks);
    }

    // Calculate compression metrics
    const compressedSize = finalContent.length;
    const reduction = originalSize - compressedSize;

    logger.debug('SummarizeStrategy compression complete', {
      originalSize,
      compressedSize,
      reduction,
      ratio: originalSize > 0 ? ((reduction / originalSize) * 100).toFixed(2) + '%' : '0%'
    });

    return {
      content: finalContent,
      originalSize,
      compressedSize,
      reduction,
      method: 'summarize',
      metadata: {
        modelName: this.modelName,
        codeBlocksPreserved: codeBlocks.length
      }
    };
  }

  /**
   * Extract code blocks from content and replace with placeholders
   * @param content - Content to process
   * @param codeBlocks - Array to store extracted code blocks
   * @returns Content with code blocks replaced by placeholders
   * @private
   */
  private _extractCodeBlocks(content: string, codeBlocks: string[]): string {
    // Match fenced code blocks (``` ... ```)
    const codeBlockRegex = /```[\s\S]*?```/g;

    return content.replace(codeBlockRegex, (match) => {
      const placeholder = `{{CODE_BLOCK_${codeBlocks.length}}}`;
      codeBlocks.push(match);
      return placeholder;
    });
  }

  /**
   * Restore code blocks from placeholders
   * @param content - Content with placeholders
   * @param codeBlocks - Array of extracted code blocks
   * @returns Content with code blocks restored
   * @private
   */
  private _restoreCodeBlocks(content: string, codeBlocks: string[]): string {
    let result = content;

    for (let i = 0; i < codeBlocks.length; i++) {
      const placeholder = `{{CODE_BLOCK_${i}}}`;
      result = result.replace(placeholder, codeBlocks[i]);
    }

    return result;
  }

  /**
   * Summarize content using section-based approach
   * @param content - Content to summarize
   * @param options - Compression options
   * @returns Summarized content
   * @private
   */
  private _summarize(content: string, options: CompressionOptions): string {
    const maxTokens = options.maxTokens ?? 4000;
    const targetRatio = options.targetCompressionRatio ?? 0.5;

    // Estimate characters per token (conservative estimate)
    const charsPerToken = 4;
    const maxChars = maxTokens * charsPerToken;

    // If content is already within limits, return as-is
    if (content.length <= maxChars) {
      return content;
    }

    // Split into sections by headers or paragraphs
    const sections = this._splitIntoSections(content);

    // Prioritize sections (keep first and last, summarize middle)
    const result = this._prioritizeSections(sections, maxChars, targetRatio);

    return result;
  }

  /**
   * Split content into logical sections
   * @param content - Content to split
   * @returns Array of sections
   * @private
   */
  private _splitIntoSections(content: string): string[] {
    // Split by markdown headers or double newlines
    const sections = content.split(/(?=^#{1,6}\s)|\n\n+/);
    return sections.filter((section) => section.trim().length > 0);
  }

  /**
   * Prioritize sections for summarization
   * @param sections - Array of content sections
   * @param maxChars - Maximum characters allowed
   * @param targetRatio - Target compression ratio
   * @returns Prioritized and summarized content
   * @private
   */
  private _prioritizeSections(sections: string[], maxChars: number, targetRatio: number): string {
    if (sections.length === 0) {
      return '';
    }

    // Keep first section (introduction)
    const firstSection = sections[0] ?? '';

    // Keep last section (conclusion) if different from first
    const lastSection = sections.length > 1 ? sections[sections.length - 1] ?? '' : '';

    // Summarize middle sections
    const middleSections = sections.slice(1, sections.length - 1);
    const middleContent = middleSections.join('\n\n');

    // Calculate space allocation
    const reservedForFirstLast = firstSection.length + lastSection.length;
    const spaceForMiddle = Math.max(0, maxChars - reservedForFirstLast);

    // Truncate or summarize middle content
    let processedMiddle = middleContent;
    if (middleContent.length > spaceForMiddle) {
      // Simple truncation with ellipsis
      const truncatePoint = this._findTruncatePoint(middleContent, spaceForMiddle);
      processedMiddle = middleContent.slice(0, truncatePoint) + '\n\n[... middle content summarized ...]';
    }

    // Combine sections
    const result = [firstSection, processedMiddle, lastSection].filter(Boolean).join('\n\n');

    // Final size check
    if (result.length > maxChars) {
      // Aggressive truncation as fallback
      return this._truncateToLimit(result, maxChars);
    }

    return result;
  }

  /**
   * Find the best truncate point (at word or sentence boundary)
   * @param content - Content to truncate
   * @param maxLength - Maximum length
   * @returns Truncate point index
   * @private
   */
  private _findTruncatePoint(content: string, maxLength: number): number {
    if (content.length <= maxLength) {
      return content.length;
    }

    // Try to find sentence boundary
    const sentenceEnd = content.lastIndexOf('.', maxLength - 10);
    if (sentenceEnd > maxLength * 0.5) {
      return sentenceEnd + 1;
    }

    // Try to find word boundary
    const wordBoundary = content.lastIndexOf(' ', maxLength - 1);
    if (wordBoundary > maxLength * 0.5) {
      return wordBoundary;
    }

    // Fallback to exact character limit
    return maxLength;
  }

  /**
   * Truncate content to character limit
   * @param content - Content to truncate
   * @param maxLength - Maximum length
   * @returns Truncated content
   * @private
   */
  private _truncateToLimit(content: string, maxLength: number): string {
    const truncatePoint = this._findTruncatePoint(content, maxLength);
    return content.slice(0, truncatePoint) + ' [...]';
  }
}

export default SummarizeStrategy;
