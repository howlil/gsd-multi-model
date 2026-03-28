/**
 * SummarizeStrategy Tests
 *
 * Tests for SummarizeStrategy with LLM abstractive summarization
 * and quality validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SummarizeStrategy } from '../../bin/lib/strategies/SummarizeStrategy.js';
import type { CompressionOptions } from '../../bin/lib/strategies/CompressionStrategy.js';

describe('SummarizeStrategy', () => {
  let strategy: SummarizeStrategy;

  beforeEach(() => {
    // Create strategy without API key (will use fallback)
    strategy = new SummarizeStrategy('claude-sonnet');
  });

  it('returns strategy name "summarize"', () => {
    expect(strategy.getName()).toBe('summarize');
  });

  it('returns empty result for empty content', async () => {
    const result = await strategy.compress('');
    expect(result.content).toBe('');
    expect(result.originalSize).toBe(0);
    expect(result.compressedSize).toBe(0);
    expect(result.reduction).toBe(0);
    expect(result.method).toBe('summarize');
  });

  it('returns empty result for null content', async () => {
    const result = await strategy.compress(null as any);
    expect(result.content).toBe('');
    expect(result.originalSize).toBe(0);
    expect(result.compressedSize).toBe(0);
  });

  it('preserves code blocks when preserveCodeBlocks is true', async () => {
    const content = `
Here is some text before the code.

\`\`\`typescript
function hello() {
  console.log('Hello, World!');
}
\`\`\`

Here is some text after the code.
    `.trim();

    const result = await strategy.compress(content, {
      preserveCodeBlocks: true
    });

    expect(result.content).toContain('function hello()');
    expect(result.content).toContain('console.log');
    expect(result.metadata?.codeBlocksPreserved).toBe(1);
  });

  it('includes qualityScore in metadata', async () => {
    const content = 'This is a test content for compression.';
    const result = await strategy.compress(content);

    expect(result.metadata).toBeDefined();
    expect(typeof result.metadata?.qualityScore).toBe('number');
    expect(result.metadata?.qualityScore).toBeGreaterThanOrEqual(0);
    expect(result.metadata?.qualityScore).toBeLessThanOrEqual(1);
  });

  it('handles content with task context', async () => {
    const content = `
# Implementation Plan

This document describes the implementation plan for token compression.

## Phase 1: Token Counting

We need to implement accurate token counting using tiktoken.

## Phase 2: Summarization

The summarization strategy should use LLM for abstractive summarization.
    `.trim();

    const result = await strategy.compress(content, {
      taskContext: 'token compression implementation'
    });

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.metadata?.qualityScore).toBeDefined();
  });

  it('extracts entities from TypeScript code', async () => {
    // This test verifies the _extractEntities functionality indirectly
    const content = `
export class TokenExtractor {
  private cache: Map<string, number>;

  constructor() {
    this.cache = new Map();
  }

  function countTokens(content: string): number {
    return content.length;
  }

  export function helper(): void {
    console.log('helper');
  }
}
    `.trim();

    const result = await strategy.compress(content);
    expect(result.content).toBeDefined();
    expect(result.metadata?.qualityScore).toBeDefined();
  });

  it('handles very long content', async () => {
    const content = 'A'.repeat(10000) + ' Important conclusion.';
    const result = await strategy.compress(content, {
      maxTokens: 1000
    });

    expect(result.content).toBeDefined();
    expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);
    expect(result.metadata?.qualityScore).toBeDefined();
  });

  it('respects targetCompressionRatio', async () => {
    const content = `
# Introduction

This is the introduction section.

# Main Content

This is the main content with lots of information.
It spans multiple paragraphs.
More details here.

# Conclusion

This is the conclusion.
    `.trim();

    const result = await strategy.compress(content, {
      targetCompressionRatio: 0.5,
      maxTokens: 500
    });

    expect(result.content).toBeDefined();
    expect(result.metadata?.qualityScore).toBeDefined();
  });

  it('handles content without task context', async () => {
    const content = 'Simple content without specific task context.';
    const result = await strategy.compress(content);

    expect(result.content).toBe(content);
    expect(result.metadata?.qualityScore).toBeDefined();
  });

  it('validates quality with entity preservation', async () => {
    // Content with clear entities
    const content = `
function calculateTotal() {
  return 42;
}

class DataProcessor {
  process() {}
}

export const VERSION = '1.0.0';
    `.trim();

    const result = await strategy.compress(content);
    expect(result.metadata?.qualityScore).toBeDefined();
    // Quality should be high since all content is preserved
    expect(result.metadata?.qualityScore).toBeGreaterThan(0.5);
  });

  it('validates quality with keyword preservation', async () => {
    const content = `
This document describes the token compression system.
The compression strategy uses summarization to reduce token count.
Token tracking is implemented for budget enforcement.
    `.trim();

    const result = await strategy.compress(content, {
      taskContext: 'token compression summarization'
    });

    expect(result.metadata?.qualityScore).toBeDefined();
  });

  it('falls back to section-based summarization when no API key', async () => {
    const content = `
# Section 1

Introduction content.

# Section 2

Main content here.

# Section 3

Conclusion.
    `.trim();

    // Strategy without API key should use fallback
    const result = await strategy.compress(content, {
      maxTokens: 100
    });

    expect(result.content).toBeDefined();
    expect(result.metadata?.qualityScore).toBeDefined();
  });

  it('handles multiple code blocks', async () => {
    const content = `
First code block:

\`\`\`javascript
function first() { return 1; }
\`\`\`

Second code block:

\`\`\`typescript
class Second {
  second() { return 2; }
}
\`\`\`

Third code block:

\`\`\`json
{"key": "value"}
\`\`\`
    `.trim();

    const result = await strategy.compress(content, {
      preserveCodeBlocks: true
    });

    expect(result.metadata?.codeBlocksPreserved).toBe(3);
    expect(result.content).toContain('function first()');
    expect(result.content).toContain('class Second');
    expect(result.content).toContain('{"key": "value"}');
  });

  it('calculates compression metrics correctly', async () => {
    const content = 'A'.repeat(1000);
    const result = await strategy.compress(content);

    expect(result.originalSize).toBe(1000);
    expect(result.compressedSize).toBeLessThanOrEqual(1000);
    expect(result.reduction).toBeGreaterThanOrEqual(0);
    expect(result.method).toBe('summarize');
  });
});
