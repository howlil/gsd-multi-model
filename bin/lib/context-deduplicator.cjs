#!/usr/bin/env node

/**
 * Context Deduplicator
 *
 * Detects and removes duplicate content to reduce token waste.
 * Uses hash-based exact matching and Jaccard similarity for fuzzy matching.
 *
 * Usage:
 *   const ContextDeduplicator = require('./context-deduplicator.cjs');
 *   const deduplicator = new ContextDeduplicator({ enableFuzzyMatch: true, fuzzyThreshold: 0.8 });
 *   const { unique, duplicates } = deduplicator.deduplicateFiles(files);
 */

const crypto = require('crypto');

class ContextDeduplicator {
  /**
   * Create a new ContextDeduplicator instance
   * @param {{enableExactMatch?: boolean, enableFuzzyMatch?: boolean, fuzzyThreshold?: number, minSize?: number}} [options] - Deduplication options
   */
  constructor(options = {}) {
    this.options = {
      enableExactMatch: options.enableExactMatch !== false,
      enableFuzzyMatch: options.enableFuzzyMatch !== false,
      fuzzyThreshold: options.fuzzyThreshold || 0.8,
      minSize: options.minSize || 100,
      ...options
    };

    this.seenHashes = new Map();
    this.seenContent = [];
    this.dedupStats = {
      totalFiles: 0,
      uniqueFiles: 0,
      duplicates: 0
    };
  }

  /**
   * Compute MD5 hash of content
   * @param {string} content - Content to hash
   * @returns {string} - MD5 hash
   */
  computeHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Compute Jaccard similarity between two texts
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {number} - Similarity score (0-1)
   */
  jaccardSimilarity(text1, text2) {
    // Tokenize text into sets of lowercase words
    const tokenize = (text) => {
      const words = text.toLowerCase().match(/\b\w+\b/g) || [];
      return new Set(words);
    };

    const set1 = tokenize(text1);
    const set2 = tokenize(text2);

    // Compute intersection
    const intersection = new Set([...set1].filter(word => set2.has(word)));

    // Compute union
    const union = new Set([...set1, ...set2]);

    // Return Jaccard similarity
    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Normalize content (remove extra whitespace)
   * @param {string} content - Content to normalize
   * @returns {string} - Normalized content
   */
  normalizeContent(content) {
    return content
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if content is a duplicate
   * @param {string} content - Content to check
   * @param {string} filePath - File path (for reporting)
   * @returns {{isDuplicate: boolean, duplicateOf?: string, similarity?: number}}
   */
  isDuplicate(content, filePath) {
    // Skip if content is too small
    if (content.length < this.options.minSize) {
      return { isDuplicate: false };
    }

    // Normalize content
    const normalizedContent = this.normalizeContent(content);

    // Check exact match
    if (this.options.enableExactMatch) {
      const hash = this.computeHash(normalizedContent);
      if (this.seenHashes.has(hash)) {
        const duplicateOf = this.seenHashes.get(hash);
        return {
          isDuplicate: true,
          duplicateOf,
          similarity: 1.0
        };
      }
      // Store hash for future comparisons
      this.seenHashes.set(hash, filePath);
    }

    // Check fuzzy match
    if (this.options.enableFuzzyMatch) {
      for (const stored of this.seenContent) {
        const similarity = this.jaccardSimilarity(normalizedContent, stored.content);
        if (similarity >= this.options.fuzzyThreshold) {
          return {
            isDuplicate: true,
            duplicateOf: stored.filePath,
            similarity: Math.round(similarity * 100) / 100
          };
        }
      }
      // Store content for future fuzzy comparisons
      this.seenContent.push({
        content: normalizedContent,
        filePath
      });
    }

    return { isDuplicate: false };
  }

  /**
   * Deduplicate array of files
   * @param {Array<{path: string, content: string}>} files - Array of file objects
   * @returns {{unique: Array<{path: string, content: string}>, duplicates: Array<{path: string, content: string, duplicateOf: string, similarity: number}>}}
   */
  deduplicateFiles(files) {
    // Reset state
    this.reset();

    const unique = [];
    const duplicates = [];

    this.dedupStats.totalFiles = files.length;

    for (const file of files) {
      const result = this.isDuplicate(file.content, file.path);

      if (result.isDuplicate) {
        duplicates.push({
          path: file.path,
          content: file.content,
          duplicateOf: result.duplicateOf,
          similarity: result.similarity
        });
        this.dedupStats.duplicates++;
      } else {
        unique.push(file);
        this.dedupStats.uniqueFiles++;
      }
    }

    return { unique, duplicates };
  }

  /**
   * Get deduplication statistics
   * @returns {{totalFiles: number, uniqueFiles: number, duplicates: number, savingsPercent: number}}
   */
  getStats() {
    const savingsPercent = this.dedupStats.totalFiles > 0
      ? Math.round((this.dedupStats.duplicates / this.dedupStats.totalFiles) * 100)
      : 0;

    return {
      totalFiles: this.dedupStats.totalFiles,
      uniqueFiles: this.dedupStats.uniqueFiles,
      duplicates: this.dedupStats.duplicates,
      savingsPercent
    };
  }

  /**
   * Reset deduplication state
   */
  reset() {
    this.seenHashes.clear();
    this.seenContent = [];
    this.dedupStats = {
      totalFiles: 0,
      uniqueFiles: 0,
      duplicates: 0
    };
  }
}

module.exports = ContextDeduplicator;
