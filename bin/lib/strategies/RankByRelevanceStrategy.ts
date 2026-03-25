/**
 * Rank By Relevance Strategy
 *
 * Relevance-based content filtering strategy for context compression.
 * Scores content sections by their relevance to a query and retains
 * the highest-scored sections up to the token limit.
 *
 * @example
 * ```typescript
 * const scorer = new ContextRelevanceScorer('implement feature X');
 * const strategy = new RankByRelevanceStrategy(scorer);
 * const result = await strategy.compress(content, {
 *   maxTokens: 4000,
 *   query: 'implement feature X'
 * });
 * ```
 */

import { LogExecution } from '../decorators/LogExecution.js';
import { defaultLogger as logger } from '../logger.js';
import type { CompressionStrategy, CompressionOptions, CompressionResult } from './CompressionStrategy.js';
import { ContextRelevanceScorer } from '../context-relevance-scorer.js';

/**
 * Section with relevance score
 */
interface ScoredSection {
  content: string;
  score: number;
  order: number;
}

/**
 * RankByRelevanceStrategy implementation
 *
 * Provides intelligent compression by:
 * - Splitting content into logical sections
 * - Scoring each section by relevance to query
 * - Keeping highest-scored sections up to token limit
 * - Preserving original order of retained sections
 */
export class RankByRelevanceStrategy implements CompressionStrategy {
  private scorer: ContextRelevanceScorer;

  /**
   * Create a RankByRelevanceStrategy instance
   * @param scorer - ContextRelevanceScorer instance for scoring
   */
  constructor(scorer: ContextRelevanceScorer) {
    this.scorer = scorer;
  }

  /**
   * Get the strategy name
   * @returns Strategy identifier
   */
  getName(): string {
    return 'rank-by-relevance';
  }

  /**
   * Compress content by ranking sections by relevance
   * @param content - Content to compress
   * @param options - Compression options
   * @returns Compression result with metadata
   */
  @LogExecution('RankByRelevanceStrategy.compress', { logParams: false, logResult: false, level: 'debug' })
  async compress(content: string, options: CompressionOptions = {}): Promise<CompressionResult> {
    const originalSize = content.length;

    if (!content || content.length === 0) {
      return {
        content: '',
        originalSize: 0,
        compressedSize: 0,
        reduction: 0,
        method: 'rank-by-relevance'
      };
    }

    // Get query from options or use default
    const query = options.query ?? 'context';

    // Calculate max characters from tokens
    const maxTokens = options.maxTokens ?? 4000;
    const charsPerToken = 4; // Conservative estimate
    const maxChars = maxTokens * charsPerToken;

    // If content is already within limits, return as-is
    if (content.length <= maxChars) {
      return {
        content,
        originalSize,
        compressedSize: originalSize,
        reduction: 0,
        method: 'rank-by-relevance'
      };
    }

    // Split content into sections
    const sections = this._splitIntoSections(content);

    // Score each section by relevance
    const scoredSections = await this._scoreSections(sections, query);

    // Select top sections up to token limit
    const selectedSections = this._selectTopSections(scoredSections, maxChars);

    // Reconstruct content in original order
    const compressedContent = this._reconstructContent(selectedSections, sections.length);

    const compressedSize = compressedContent.length;
    const reduction = originalSize - compressedSize;

    logger.debug('RankByRelevanceStrategy compression complete', {
      originalSize,
      compressedSize,
      reduction,
      sectionsCount: sections.length,
      selectedCount: selectedSections.length,
      ratio: originalSize > 0 ? ((reduction / originalSize) * 100).toFixed(2) + '%' : '0%'
    });

    return {
      content: compressedContent,
      originalSize,
      compressedSize,
      reduction,
      method: 'rank-by-relevance',
      breakdown: this._createBreakdown(scoredSections, selectedSections),
      metadata: {
        query,
        totalSections: sections.length,
        selectedSections: selectedSections.length
      }
    };
  }

  /**
   * Split content into logical sections
   * @param content - Content to split
   * @returns Array of sections
   * @private
   */
  private _splitIntoSections(content: string): string[] {
    // Split by markdown headers or double newlines
    const sections = content.split(/(?=^#{1,6}\s)|\n\n+/m);
    return sections.filter((section) => section.trim().length > 0);
  }

  /**
   * Score each section by relevance to query
   * @param sections - Array of content sections
   * @param query - Query string for relevance scoring
   * @returns Array of scored sections
   * @private
   */
  private async _scoreSections(sections: string[], query: string): Promise<ScoredSection[]> {
    const scoredSections: ScoredSection[] = [];

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i] ?? '';
      const score = await this._scoreSection(section, query);
      scoredSections.push({
        content: section,
        score,
        order: i
      });
    }

    return scoredSections;
  }

  /**
   * Score a single section by relevance
   * @param section - Section content
   * @param query - Query string
   * @returns Relevance score (0-100)
   * @private
   */
  private async _scoreSection(section: string, query: string): Promise<number> {
    // Use keyword matching for relevance scoring
    const queryKeywords = query.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
    const sectionLower = section.toLowerCase();

    let matchCount = 0;
    let totalWeight = 0;

    for (const keyword of queryKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = sectionLower.match(regex);
      if (matches) {
        matchCount += matches.length;
        // Weight longer keywords higher
        totalWeight += keyword.length * matches.length;
      }
    }

    // Calculate score based on keyword density and weight
    const wordCount = section.split(/\s+/).length;
    if (wordCount === 0) return 0;

    const density = matchCount / wordCount;
    const normalizedWeight = queryKeywords.length > 0 ? totalWeight / queryKeywords.length : 0;

    // Combine density and weight (0-100 scale)
    const score = Math.min(100, Math.round((density * 1000) + normalizedWeight));

    return score;
  }

  /**
   * Select top-scored sections up to token limit
   * @param sections - Scored sections
   * @param maxChars - Maximum characters allowed
   * @returns Array of selected sections
   * @private
   */
  private _selectTopSections(sections: ScoredSection[], maxChars: number): ScoredSection[] {
    // Sort by score (descending)
    const sorted = [...sections].sort((a, b) => b.score - a.score);

    const selected: ScoredSection[] = [];
    let currentLength = 0;

    for (const section of sorted) {
      const sectionLength = section.content.length + 2; // Account for newlines
      if (currentLength + sectionLength <= maxChars) {
        selected.push(section);
        currentLength += sectionLength;
      }
    }

    // Sort selected sections back to original order
    return selected.sort((a, b) => a.order - b.order);
  }

  /**
   * Reconstruct content from selected sections
   * @param selected - Selected sections
   * @param totalSections - Total number of original sections
   * @returns Reconstructed content
   * @private
   */
  private _reconstructContent(selected: ScoredSection[], totalSections: number): string {
    if (selected.length === 0) {
      return '';
    }

    // If all sections selected, join normally
    if (selected.length === totalSections) {
      return selected.map((s) => s.content).join('\n\n');
    }

    // Build content with omission markers
    const parts: string[] = [];
    let lastOrder = -1;

    for (const section of selected) {
      // Add omission marker if sections were skipped
      if (lastOrder >= 0 && section.order - lastOrder > 1) {
        const omittedCount = section.order - lastOrder - 1;
        parts.push(`\n[... ${omittedCount} section${omittedCount > 1 ? 's' : ''} omitted ...]\n`);
      }

      parts.push(section.content);
      lastOrder = section.order;
    }

    return parts.join('\n\n');
  }

  /**
   * Create breakdown of compression results
   * @param allSections - All scored sections
   * @param selected - Selected sections
   * @returns Breakdown object
   * @private
   */
  private _createBreakdown(allSections: ScoredSection[], selected: ScoredSection[]): Record<string, number> {
    const breakdown: Record<string, number> = {
      totalSections: allSections.length,
      selectedSections: selected.length,
      omittedSections: allSections.length - selected.length,
      avgScore: 0,
      selectedAvgScore: 0
    };

    if (allSections.length > 0) {
      breakdown.avgScore = Math.round(
        allSections.reduce((sum, s) => sum + s.score, 0) / allSections.length
      );
    }

    if (selected.length > 0) {
      breakdown.selectedAvgScore = Math.round(
        selected.reduce((sum, s) => sum + s.score, 0) / selected.length
      );
    }

    return breakdown;
  }
}

export default RankByRelevanceStrategy;
