/**
 * Token Extractor Class Tests
 *
 * Tests for TokenExtractorClass with tiktoken integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TokenExtractorClass } from '../../bin/lib/adapters/shared/tokenExtractor.js';

describe('TokenExtractorClass', () => {
  let extractor: TokenExtractorClass;

  beforeEach(() => {
    extractor = new TokenExtractorClass('gpt-4');
  });

  it('counts tokens for simple text', () => {
    const content = 'Hello, world!';
    const count = extractor.countTokens(content);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(100);
  });

  it('counts tokens for longer text', () => {
    const content = 'The quick brown fox jumps over the lazy dog. '.repeat(10);
    const count = extractor.countTokens(content);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(1000);
  });

  it('returns zero for empty string', () => {
    const count = extractor.countTokens('');
    expect(count).toBe(0);
  });

  it('uses cache for repeated content', () => {
    const content = 'Cached content test';
    const count1 = extractor.countTokens(content);
    const count2 = extractor.countTokens(content);
    expect(count1).toBe(count2);
    expect(extractor.getCacheSize()).toBe(1);
  });

  it('caches different models separately', () => {
    const content = 'Test content for multiple models';
    const count1 = extractor.countTokens(content, 'gpt-4');
    const count2 = extractor.countTokens(content, 'gpt-3.5-turbo');
    expect(count1).toBeGreaterThan(0);
    expect(count2).toBeGreaterThan(0);
    expect(extractor.getCacheSize()).toBe(2);
  });

  it('clears cache when clearCache is called', () => {
    const content = 'Content to cache';
    extractor.countTokens(content);
    expect(extractor.getCacheSize()).toBe(1);
    extractor.clearCache();
    expect(extractor.getCacheSize()).toBe(0);
  });

  it('handles special characters', () => {
    const content = 'Special chars: @#$%^&*()_+-=[]{}|;:,.<>?';
    const count = extractor.countTokens(content);
    expect(count).toBeGreaterThan(0);
  });

  it('handles unicode characters', () => {
    const content = 'Unicode: 你好世界 🌍 Привет мир';
    const count = extractor.countTokens(content);
    expect(count).toBeGreaterThan(0);
  });

  it('handles code snippets', () => {
    const content = `
function hello() {
  console.log('Hello, World!');
}

class MyClass {
  constructor() {
    this.value = 42;
  }
}
    `.trim();
    const count = extractor.countTokens(content);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(100);
  });

  it('falls back to char estimate when tiktoken fails', () => {
    // Create extractor with invalid model to trigger fallback
    const fallbackExtractor = new TokenExtractorClass('invalid-model' as any);
    const content = 'This should use fallback estimation';
    const count = fallbackExtractor.countTokens(content);
    // Fallback uses 4 chars/token estimate
    const expectedEstimate = Math.ceil(content.length / 4);
    expect(count).toBe(expectedEstimate);
  });

  it('handles very long content', () => {
    const content = 'A'.repeat(10000);
    const count = extractor.countTokens(content);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(5000);
  });

  it('respects model parameter override', () => {
    const content = 'Test with model override';
    const count1 = extractor.countTokens(content);
    const count2 = extractor.countTokens(content, 'gpt-3.5-turbo');
    // Both should return valid counts
    expect(count1).toBeGreaterThan(0);
    expect(count2).toBeGreaterThan(0);
  });
});
