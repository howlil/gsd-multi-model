#!/usr/bin/env node

/**
 * Context Relevance Scorer
 *
 * Scores files by relevance to a task description using multi-factor scoring:
 * - Keyword matching (40% weight)
 * - File type weighting (20% weight)
 * - Path matching (20% weight)
 * - Recency boost (20% weight)
 *
 * Usage:
 *   const ContextRelevanceScorer = require('./context-relevance-scorer.cjs');
 *   const scorer = new ContextRelevanceScorer('Implement user authentication with JWT');
 *   const recommended = scorer.getRecommendedFiles('./src');
 */

const fs = require('fs');
const path = require('path');
const micromatch = require('micromatch');

class ContextRelevanceScorer {
  /**
   * Create a new ContextRelevanceScorer instance
   * @param {string} taskDescription - The task description to extract keywords from
   * @param {{maxFiles?: number, minScore?: number}} [options] - Scoring options
   */
  constructor(taskDescription, options = {}) {
    this.task = taskDescription.toLowerCase();
    this.taskKeywords = this.extractKeywords(taskDescription);
    this.options = {
      maxFiles: options.maxFiles || 20,
      minScore: options.minScore || 0.1,
      ...options
    };

    // File type weights
    this.fileTypeWeights = {
      // High value: direct implementation
      '.ts': 1.0, '.tsx': 1.0, '.js': 0.9, '.jsx': 0.9,
      // Config files: medium-high value
      '.json': 0.7, '.yaml': 0.7, '.yml': 0.7, '.toml': 0.7,
      // Documentation: medium value
      '.md': 0.6,
      // Build/test: lower value for context
      '.test.ts': 0.4, '.spec.ts': 0.4,
      '.test.js': 0.4, '.spec.js': 0.4,
      // Ignore these
      '.log': 0, '.lock': 0, '.map': 0
    };
  }

  /**
   * Extract keywords from task description
   * @param {string} text - Task description
   * @returns {string[]} - Array of keywords
   */
  extractKeywords(text) {
    // Remove common stop words and extract meaningful terms
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
      'dare', 'ought', 'used', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
      'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
      'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
      'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once'
    ]);

    // Extract words (alphanumeric, min 3 chars)
    const words = text.match(/\b[a-z0-9]{3,}\b/gi) || [];

    // Filter stop words and get unique keywords
    return [...new Set(words.filter(w => !stopWords.has(w.toLowerCase())))];
  }

  /**
   * Score a single file
   * @param {string} filePath - Path to file
   * @param {string} [content] - Optional file content (reads if not provided)
   * @returns {{score: number, breakdown: Object}} - Score and breakdown
   */
  scoreFile(filePath, content = null) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath).toLowerCase();
    const relativePath = filePath.toLowerCase();

    // Read content if not provided
    if (content === null) {
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch (err) {
        return { score: 0, breakdown: { error: err.message } };
      }
    }
    const contentLower = content.toLowerCase();

    // 1. Keyword matching (40% weight)
    let keywordMatches = 0;
    let keywordScore = 0;

    for (const keyword of this.taskKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = contentLower.match(regex);
      if (matches) {
        keywordMatches += matches.length;
      }
    }

    // Normalize keyword score (0-1 range, cap at 10 matches)
    keywordScore = Math.min(keywordMatches / 10, 1);

    // 2. File type weight (20% weight)
    const fileTypeWeight = this.fileTypeWeights[ext] || 0.5;

    // 3. Path matching (20% weight)
    let pathMatchScore = 0;
    for (const keyword of this.taskKeywords) {
      if (relativePath.includes(keyword)) {
        pathMatchScore += 0.2;
      }
    }
    pathMatchScore = Math.min(pathMatchScore, 1);

    // 4. Recency boost (20% weight) - based on file modification time
    let recencyScore = 0.5; // Default middle score
    try {
      const stats = fs.statSync(filePath);
      const mtime = stats.mtimeMs;
      const now = Date.now();
      const daysOld = (now - mtime) / (1000 * 60 * 60 * 24);

      // Files modified in last 7 days get boost
      if (daysOld < 1) recencyScore = 1.0;
      else if (daysOld < 7) recencyScore = 0.8;
      else if (daysOld < 30) recencyScore = 0.6;
      else recencyScore = 0.4;
    } catch (err) {
      recencyScore = 0.5;
    }

    // Calculate final score
    const finalScore = (
      (keywordScore * 0.4) +
      (fileTypeWeight * 0.2) +
      (pathMatchScore * 0.2) +
      (recencyScore * 0.2)
    );

    return {
      score: Math.round(finalScore * 100) / 100,
      breakdown: {
        keyword: Math.round(keywordScore * 100) / 100,
        fileType: Math.round(fileTypeWeight * 100) / 100,
        path: Math.round(pathMatchScore * 100) / 100,
        recency: Math.round(recencyScore * 100) / 100,
        keywordMatches,
        taskKeywords: this.taskKeywords.length
      }
    };
  }

  /**
   * Score multiple files and return sorted results
   * @param {string[]} filePaths - Array of file paths
   * @returns {Array<{path: string, score: number, breakdown: Object}>}
   */
  scoreFiles(filePaths) {
    const results = [];

    for (const filePath of filePaths) {
      const result = this.scoreFile(filePath);
      if (result.score >= this.options.minScore) {
        results.push({
          path: filePath,
          score: result.score,
          breakdown: result.breakdown
        });
      }
    }

    // Sort by score (descending) and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, this.options.maxFiles);
  }

  /**
   * Get recommended files for a task from a directory
   * @param {string} rootDir - Root directory to search
   * @param {string[]} [extensions] - File extensions to include
   * @returns {Array<{path: string, score: number, breakdown: Object}>}
   */
  getRecommendedFiles(rootDir, extensions = ['.ts', '.tsx', '.js', '.jsx', '.md']) {
    const files = this.findSourceFiles(rootDir, extensions);
    return this.scoreFiles(files);
  }

  /**
   * Find source files in directory
   * @param {string} rootDir - Root directory
   * @param {string[]} extensions - File extensions to include
   * @returns {string[]} - Array of file paths
   */
  findSourceFiles(rootDir, extensions) {
    const files = [];
    const ignorePatterns = [
      'node_modules/**', '.git/**', 'dist/**', 'build/**',
      '.next/**', 'coverage/**', '*.log', '.env*',
      'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'
    ];

    const traverse = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (micromatch.isMatch(fullPath, ignorePatterns)) continue;

        if (entry.isDirectory()) {
          traverse(fullPath);
        } else if (entry.isFile() && extensions.includes(path.extname(fullPath))) {
          files.push(fullPath);
        }
      }
    };

    traverse(rootDir);
    return files;
  }
}

module.exports = ContextRelevanceScorer;
