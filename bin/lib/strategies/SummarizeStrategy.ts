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
import { defaultLogger as logger } from '../logger/index.js';
import type { CompressionStrategy, CompressionOptions, CompressionResult } from './CompressionStrategy.js';
import { ClaudeAdapter } from '../adapters/ClaudeAdapter.js';

/**
 * SummarizeStrategy implementation
 *
 * Uses AI models to intelligently summarize content while preserving:
 * - Key information and context
 * - Code blocks (when preserveCodeBlocks is true)
 * - Important structural elements
 *
 * Features:
 * - LLM abstractive summarization with quality validation
 * - Fallback to extractive summarization if LLM fails or quality < 0.7
 * - Entity and keyword preservation checking
 */
export class SummarizeStrategy implements CompressionStrategy {
  private modelName?: string;
  private apiKey?: string;

  /**
   * Create a SummarizeStrategy instance
   * @param modelName - Optional AI model name for summarization
   * @param apiKey - Optional API key for LLM access (defaults to process.env.ANTHROPIC_API_KEY)
   */
  constructor(modelName?: string, apiKey?: string) {
    this.modelName = modelName ?? 'claude-sonnet';
    this.apiKey = apiKey;
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
    const originalSize = content?.length ?? 0;

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

    // LLM summarization with quality validation
    const taskContext = options.taskContext || '';
    let finalContent: string;
    let qualityScore: number;

    try {
      // Try LLM abstractive summarization
      const summary = await this._llmSummarize(processedContent, options);

      // Validate quality
      qualityScore = await this._validateQuality(processedContent, summary, taskContext);

      if (qualityScore < 0.7) {
        // Fallback to conservative summarization if quality is too low
        logger.debug('LLM summarization quality below threshold, using fallback', { qualityScore });
        finalContent = await this._summarizeConservative(processedContent, options);
        // Re-validate quality for fallback
        qualityScore = await this._validateQuality(processedContent, finalContent, taskContext);
      } else {
        finalContent = summary;
      }
    } catch (error) {
      // Fallback to conservative summarization on LLM error
      logger.warn('LLM summarization failed, using fallback', { error });
      finalContent = await this._summarizeConservative(processedContent, options);
      qualityScore = await this._validateQuality(processedContent, finalContent, taskContext);
    }

    // Restore code blocks
    if (options.preserveCodeBlocks && codeBlocks.length > 0) {
      finalContent = this._restoreCodeBlocks(finalContent, codeBlocks);
    }

    // Calculate compression metrics
    const compressedSize = finalContent.length;
    const reduction = originalSize - compressedSize;

    logger.debug('SummarizeStrategy compression complete', {
      originalSize,
      compressedSize,
      reduction,
      ratio: originalSize > 0 ? ((reduction / originalSize) * 100).toFixed(2) + '%' : '0%',
      qualityScore
    });

    return {
      content: finalContent,
      originalSize,
      compressedSize,
      reduction,
      method: 'summarize',
      metadata: {
        modelName: this.modelName,
        codeBlocksPreserved: codeBlocks.length,
        qualityScore
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
      const codeBlock = codeBlocks[i];
      if (codeBlock !== undefined) {
        result = result.replace(placeholder, codeBlock);
      }
    }

    return result;
  }

  /**
   * LLM-powered abstractive summarization
   * @param content - Content to summarize
   * @param options - Compression options
   * @returns Summarized content from LLM
   * @private
   */
  private async _llmSummarize(content: string, options: CompressionOptions): Promise<string> {
    const taskContext = options.taskContext || 'General summarization';
    const maxTokens = options.maxTokens || 1000;

    // Get API key from constructor or environment
    const apiKey = this.apiKey || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      // No API key available, fallback to section-based approach
      logger.debug('No API key available, using section-based summarization');
      return this._summarizeSectionBased(content, options);
    }

    // Create Claude adapter
    const adapter = new ClaudeAdapter(apiKey, this.modelName);

    // Build prompt for summarization
    const prompt = `Summarize the following content while preserving key information.
Task context: ${taskContext}

Focus on:
1. Main concepts and relationships
2. Important code patterns (will be restored separately)
3. Critical constraints and requirements

Content to summarize:
${content}`;

    try {
      const response = await adapter.chat([
        {
          role: 'user',
          content: prompt
        }
      ], {
        maxTokens,
        temperature: 0.3 // Lower temperature for more focused summarization
      });

      return response.content || this._summarizeSectionBased(content, options);
    } catch (error) {
      logger.warn('LLM summarization failed', { error });
      throw error; // Re-throw to trigger fallback in compress method
    }
  }

  /**
   * Validate the quality of a summary
   * @param original - Original content
   * @param summary - Summarized content
   * @param taskContext - Task context for keyword preservation
   * @returns Quality score (0.0-1.0)
   * @private
   */
  private async _validateQuality(original: string, summary: string, taskContext: string): Promise<number> {
    // Entity preservation (function names, class names, variable names) - 70% weight
    const originalEntities = this._extractEntities(original);
    const summaryEntities = this._extractEntities(summary);
    const preservedEntities = originalEntities.filter(e => summaryEntities.includes(e)).length;
    const preservationRatio = originalEntities.length > 0 ? preservedEntities / originalEntities.length : 1.0;

    // Keyword preservation (task keywords) - 30% weight
    const taskKeywords = taskContext.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const keywordMatches = taskKeywords.filter(k => summary.toLowerCase().includes(k)).length;
    const keywordRatio = taskKeywords.length > 0 ? keywordMatches / taskKeywords.length : 1.0;

    // Weighted quality score
    const qualityScore = (preservationRatio * 0.7) + (keywordRatio * 0.3);

    logger.debug('Quality validation complete', {
      originalEntities: originalEntities.length,
      summaryEntities: summaryEntities.length,
      preservedEntities,
      preservationRatio,
      taskKeywords: taskKeywords.length,
      keywordMatches,
      keywordRatio,
      qualityScore
    });

    return qualityScore;
  }

  /**
   * Extract entities (function names, class names, exports) from content
   * @param content - Content to extract entities from
   * @returns Array of extracted entity names
   * @private
   */
  private _extractEntities(content: string): string[] {
    const entities: string[] = [];

    // Extract function names
    const functionMatches = content.match(/function\s+(\w+)/g) || [];
    entities.push(...functionMatches.map(m => m.replace('function ', '')));

    // Extract class names
    const classMatches = content.match(/class\s+(\w+)/g) || [];
    entities.push(...classMatches.map(m => m.replace('class ', '')));

    // Extract export statements
    const exportMatches = content.match(/export\s+(?:const|let|var|function|class)\s+(\w+)/g) || [];
    entities.push(...exportMatches.map(m => m.split(/\s+/).pop() || ''));

    // Extract method names (inside classes)
    const methodMatches = content.match(/(?:public|private|protected)?\s*\w+\s*\([^)]*\)\s*{/g) || [];
    entities.push(...methodMatches.map(m => {
      const match = m.match(/(\w+)\s*\(/);
      return match ? match[1] : '';
    }).filter(Boolean));

    // Return unique entities
    return Array.from(new Set(entities));
  }

  /**
   * Conservative summarization fallback (less aggressive compression)
   * @param content - Content to summarize
   * @param options - Compression options
   * @returns Conservatively summarized content
   * @private
   */
  private async _summarizeConservative(content: string, options: CompressionOptions): Promise<string> {
    // Use the existing section-based approach with less aggressive compression
    return this._summarizeSectionBased(content, {
      ...options,
      targetCompressionRatio: 0.7 // Less aggressive: retain 70% instead of 50%
    });
  }

  /**
   * Section-based summarization (fallback when LLM unavailable)
   * @param content - Content to summarize
   * @param options - Compression options
   * @returns Summarized content
   * @private
   */
  private _summarizeSectionBased(content: string, options: CompressionOptions): string {
    const maxTokens = options.maxTokens ?? 4000;
    const targetRatio = options.targetCompressionRatio ?? 0.5;
    const taskContext = options.taskContext ?? '';

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
    // If taskContext is provided, prioritize sections matching task keywords
    const result = this._prioritizeSections(sections, maxChars, targetRatio, taskContext);

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
   * @param taskContext - Optional task context for relevance scoring
   * @returns Prioritized and summarized content
   * @private
   */
  private _prioritizeSections(
    sections: string[],
    maxChars: number,
    targetRatio: number,
    taskContext: string = ''
  ): string {
    if (sections.length === 0) {
      return '';
    }

    // Keep first section (introduction)
    const firstSection = sections[0] ?? '';

    // Keep last section (conclusion) if different from first
    const lastSection = sections.length > 1 ? sections[sections.length - 1] ?? '' : '';

    // Score middle sections by relevance to task context
    const middleSections = sections.slice(1, sections.length - 1);
    let scoredSections: Array<{ section: string; score: number }> = [];

    if (taskContext) {
      // Score sections by task relevance
      const taskKeywords = taskContext.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      scoredSections = middleSections.map(section => {
        const sectionLower = section.toLowerCase();
        const score = taskKeywords.reduce((acc, keyword) => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          const matches = sectionLower.match(regex);
          return acc + (matches ? matches.length : 0);
        }, 0);
        return { section, score };
      });

      // Sort by score (highest first)
      scoredSections.sort((a, b) => b.score - a.score);
    }

    // Calculate space allocation
    const reservedForFirstLast = firstSection.length + lastSection.length;
    const spaceForMiddle = Math.max(0, maxChars - reservedForFirstLast);

    // Build middle content from scored sections (or original if no task context)
    let middleContent = '';
    if (taskContext && scoredSections.length > 0) {
      // Take highest-scored sections first
      for (const { section } of scoredSections) {
        if (middleContent.length + section.length <= spaceForMiddle) {
          middleContent += section + '\n\n';
        } else {
          // Truncate this section to fit
          const remaining = spaceForMiddle - middleContent.length;
          if (remaining > 0) {
            middleContent += section.slice(0, remaining) + '\n\n[... summarized ...]';
          }
          break;
        }
      }
    } else {
      // Fallback: use original approach
      middleContent = middleSections.join('\n\n');
      if (middleContent.length > spaceForMiddle) {
        const truncatePoint = this._findTruncatePoint(middleContent, spaceForMiddle);
        middleContent = middleContent.slice(0, truncatePoint) + '\n\n[... middle content summarized ...]';
      }
    }

    // Combine sections
    const result = [firstSection, middleContent.trim(), lastSection].filter(Boolean).join('\n\n');

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
