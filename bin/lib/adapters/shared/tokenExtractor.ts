/**
 * Token Usage Extractor
 *
 * Pure function for extracting token usage from API responses.
 * Shared across all model provider adapters.
 *
 * @example
 * ```typescript
 * const usage = extractTokenUsage(response, {
 *   promptTokens: 'input_tokens',
 *   completionTokens: 'output_tokens',
 *   totalTokens: 'total_tokens'
 * });
 * ```
 */

import { encoding_for_model, TiktokenModel } from 'tiktoken';
import type { TokenUsage } from '../ModelProviderAdapter.js';

/**
 * Token mapping configuration
 */
export interface TokenMappings {
  promptTokens: string;
  completionTokens: string;
  totalTokens?: string;
}

/**
 * Extract token usage from response
 *
 * @param response - API response object
 * @param mappings - Token field mappings
 * @returns Token usage information
 */
export function extractTokenUsage(
  response: Record<string, unknown>,
  mappings: TokenMappings
): TokenUsage {
  const usage = response.usage as Record<string, unknown> | undefined;

  if (!usage) {
    return {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };
  }

  const promptTokens = Number(usage[mappings.promptTokens]) || 0;
  const completionTokens = Number(usage[mappings.completionTokens]) || 0;
  const totalTokens = mappings.totalTokens
    ? Number(usage[mappings.totalTokens]) || 0
    : promptTokens + completionTokens;

  return {
    promptTokens,
    completionTokens,
    totalTokens
  };
}

/**
 * Extract token usage with nested path support
 *
 * @param response - API response object
 * @param mappings - Token field mappings with dot notation paths
 * @returns Token usage information
 */
export function extractTokenUsageWithPath(
  response: Record<string, unknown>,
  mappings: {
    promptTokens: string;
    completionTokens: string;
    totalTokens?: string;
  }
): TokenUsage {
  function getValue(obj: Record<string, unknown>, path: string): number {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (typeof current !== 'object' || current === null || !(part in current)) {
        return 0;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return Number(current) || 0;
  }

  const promptTokens = getValue(response, mappings.promptTokens);
  const completionTokens = getValue(response, mappings.completionTokens);
  const totalTokens = mappings.totalTokens
    ? getValue(response, mappings.totalTokens)
    : promptTokens + completionTokens;

  return {
    promptTokens,
    completionTokens,
    totalTokens
  };
}

/**
 * Token Extractor Class with tiktoken integration
 *
 * Provides accurate token counting using tiktoken with fallback to character-based estimation.
 * Includes Map-based caching for repeated content.
 *
 * @example
 * ```typescript
 * const extractor = new TokenExtractorClass('gpt-4');
 * const count = extractor.countTokens('Hello, world!');
 * ```
 */
export class TokenExtractorClass {
  private readonly model: TiktokenModel;
  private readonly cache: Map<string, number>;

  /**
   * Creates a new TokenExtractorClass instance
   *
   * @param model - The Tiktoken model to use (default: 'gpt-4')
   */
  constructor(model: TiktokenModel = 'gpt-4') {
    this.model = model;
    this.cache = new Map();
  }

  /**
   * Count tokens in content using tiktoken
   *
   * Uses tiktoken for accurate token counting. Falls back to character-based estimation
   * (4 chars/token) when tiktoken fails. Caches results for repeated content.
   *
   * @param content - The content to count tokens for
   * @param model - Optional model override (uses constructor model if not provided)
   * @returns The number of tokens in the content
   *
   * @example
   * ```typescript
   * const extractor = new TokenExtractorClass('gpt-4');
   * const count = extractor.countTokens('Hello, world!');
   * const customModelCount = extractor.countTokens('Hello, world!', 'gpt-3.5-turbo');
   * ```
   */
  countTokens(content: string, model?: string): number {
    const targetModel = model || this.model;
    const cacheKey = `${targetModel}:${content.length}:${content.slice(0, 100)}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    try {
      // Use tiktoken for accurate counting
      const encoder = encoding_for_model(targetModel as TiktokenModel);
      const tokens = encoder.encode(content);
      const count = tokens.length;
      encoder.free();

      // Cache the result
      this.cache.set(cacheKey, count);
      return count;
    } catch (error) {
      // Fallback: 4 chars/token estimate
      const estimate = Math.ceil(content.length / 4);
      this.cache.set(cacheKey, estimate);
      return estimate;
    }
  }

  /**
   * Clear the token cache
   *
   * Useful for freeing memory or resetting cached values.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   *
   * @returns The number of entries in the cache
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

export default extractTokenUsage;
