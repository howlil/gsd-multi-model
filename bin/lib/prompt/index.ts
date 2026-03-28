/**
 * Prompt Module
 *
 * Agent prompt compression and optimization (Phase 25).
 * Provides token-efficient prompt generation and caching.
 */

// COMP-01, COMP-02: Prompt compression and template optimization
export { PromptCompressor } from './prompt-compressor.js';
export type { PromptCompressionResult, PromptTemplate } from './prompt-compressor.js';

// COMP-04, COMP-05: Prompt caching and dynamic assembly
export { PromptCache } from './prompt-cache.js';
export type { PromptCacheStats, PromptComponent, AssembledPrompt } from './prompt-cache.js';

// COMP-06: Compression quality validation
export { PromptQualityValidator } from './prompt-quality-validator.js';
export type { QualityValidationResult, ValidationOptions } from './prompt-quality-validator.js';
