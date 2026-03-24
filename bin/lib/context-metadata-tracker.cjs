#!/usr/bin/env node

/**
 * Context Metadata Tracker
 *
 * Tracks comprehensive metadata about context gathering operations including:
 * - File counts and sizes
 * - Token estimates
 * - Scoring statistics
 * - Compression statistics
 * - Deduplication statistics
 * - Optimization recommendations
 *
 * Usage:
 *   const ContextMetadataTracker = require('./context-metadata-tracker.cjs');
 *   const tracker = new ContextMetadataTracker(process.cwd());
 *   const metadata = tracker.createMetadata(contextResult, { taskId: 'TASK-001', task: 'My task' });
 *   tracker.saveMetadata(metadata);
 */

const fs = require('fs');
const path = require('path');

class ContextMetadataTracker {
  /**
   * Create a new ContextMetadataTracker instance
   * @param {string} cwd - Current working directory
   */
  constructor(cwd) {
    this.cwd = cwd || process.cwd();
    this.metadataPath = path.join(this.cwd, '.planning', 'context-metadata.json');
    this.currentMetadata = null;
  }

  /**
   * Count tokens in text (estimate: 1 token ≈ 4 characters)
   * @param {string} text - Text to count tokens for
   * @returns {number} - Estimated token count
   */
  countTokens(text) {
    return Math.ceil(text.length / 4);
  }

  /**
   * Create metadata object from context result
   * @param {{context: string, sources: Array, scoringStats?: Object, compressionStats?: Object, dedupStats?: Object}} contextResult - Context result from ContextManager
   * @param {{taskId?: string, task?: string}} [options] - Metadata options
   * @returns {Object} - Metadata object
   */
  createMetadata(contextResult, options = {}) {
    const { context, sources, scoringStats, compressionStats, dedupStats } = contextResult;
    const { taskId, task } = options;

    // Build file metadata array
    const fileMetadata = sources.map(source => {
      const metadata = {
        path: source.source,
        size: source.size,
        tokens: this.countTokens(source.size ? '' : context),
        type: source.type,
        timestamp: source.timestamp
      };

      // Add score if available
      if (source.score !== undefined) {
        metadata.score = source.score;
      }

      // Add compression info if available
      if (source.compression) {
        metadata.compression = {
          method: source.compression.method,
          originalSize: source.compression.originalSize,
          compressedSize: source.compression.compressedSize,
          reduction: source.compression.reduction
        };
        metadata.tokens = this.countTokens(source.compression.compressedSize ? '' : context);
      }

      return metadata;
    });

    // Calculate totals
    const totalSize = fileMetadata.reduce((sum, f) => sum + (f.size || 0), 0);
    const totalTokens = fileMetadata.reduce((sum, f) => sum + (f.tokens || 0), 0);

    // Calculate average score from scored files
    const scoredFiles = fileMetadata.filter(f => f.score !== undefined);
    const avgScore = scoredFiles.length > 0
      ? Math.round((scoredFiles.reduce((sum, f) => sum + f.score, 0) / scoredFiles.length) * 100) / 100
      : 0;

    // Build compression summary
    const compressionEnabled = compressionStats !== undefined && compressionStats !== null;
    const compressionSummary = compressionEnabled ? {
      enabled: true,
      originalSize: compressionStats.originalSize || 0,
      compressedSize: compressionStats.compressedSize || 0,
      reductionPercent: compressionStats.reductionPercent || 0,
      methods: compressionStats.compressedFiles > 0 ? 'code_folding,markdown_summary,json_minify,first_last_lines' : 'none'
    } : { enabled: false };

    // Build deduplication summary
    const dedupEnabled = dedupStats !== undefined && dedupStats !== null;
    const dedupSummary = dedupEnabled ? {
      enabled: true,
      totalFiles: dedupStats.totalFiles || 0,
      uniqueFiles: dedupStats.uniqueFiles || 0,
      removedCount: dedupStats.duplicates || 0,
      savingsPercent: dedupStats.savingsPercent || 0
    } : { enabled: false };

    // Build scoring summary
    const scoringEnabled = scoringStats !== undefined && scoringStats !== null;
    const scoringSummary = scoringEnabled ? {
      enabled: true,
      minScore: scoringStats.minScore || 0,
      avgScore: avgScore,
      filteredCount: scoringStats.filteredCount || 0
    } : { enabled: false };

    const metadata = {
      taskId: taskId || `TASK-${Date.now()}`,
      task: task || '',
      timestamp: new Date().toISOString(),
      totalFiles: fileMetadata.length,
      totalSize,
      totalTokens,
      scoring: scoringSummary,
      compression: compressionSummary,
      deduplication: dedupSummary,
      files: fileMetadata
    };

    this.currentMetadata = metadata;
    return metadata;
  }

  /**
   * Save metadata to file
   * @param {Object} metadata - Metadata object to save
   * @returns {boolean} - Success status
   */
  saveMetadata(metadata) {
    try {
      // Ensure .planning directory exists
      const planningDir = path.join(this.cwd, '.planning');
      if (!fs.existsSync(planningDir)) {
        fs.mkdirSync(planningDir, { recursive: true });
      }

      // Load existing history
      let history = [];
      if (fs.existsSync(this.metadataPath)) {
        const content = fs.readFileSync(this.metadataPath, 'utf8');
        if (content.trim()) {
          history = JSON.parse(content);
        }
      }

      // Push new metadata
      history.push(metadata);

      // Keep last 100 entries
      if (history.length > 100) {
        history = history.slice(-100);
      }

      // Write to file
      fs.writeFileSync(this.metadataPath, JSON.stringify(history, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Failed to save metadata:', err.message);
      return false;
    }
  }

  /**
   * Get metadata history
   * @returns {Array} - Array of metadata objects
   */
  getHistory() {
    try {
      if (fs.existsSync(this.metadataPath)) {
        const content = fs.readFileSync(this.metadataPath, 'utf8');
        if (content.trim()) {
          return JSON.parse(content);
        }
      }
      return [];
    } catch (err) {
      console.error('Failed to load metadata history:', err.message);
      return [];
    }
  }

  /**
   * Get optimization recommendations based on history
   * @returns {Array<{type: string, recommendation: string, impact: string}>}
   */
  getRecommendations() {
    const history = this.getHistory();
    const recommendations = [];

    if (history.length === 0) {
      return recommendations;
    }

    // Calculate averages
    const avgTokens = history.reduce((sum, m) => sum + (m.totalTokens || 0), 0) / history.length;
    const avgScore = history.reduce((sum, m) => sum + (m.scoring?.avgScore || 0), 0) / history.length;
    const avgCompressionReduction = history.reduce((sum, m) => sum + (m.compression?.reductionPercent || 0), 0) / history.length;
    const avgDedupSavings = history.reduce((sum, m) => sum + (m.deduplication?.savingsPercent || 0), 0) / history.length;

    // High token usage recommendation
    if (avgTokens > 8000) {
      recommendations.push({
        type: 'compression',
        recommendation: 'Consider enabling compression for large contexts. Average token count is high.',
        impact: 'high',
        details: `Average tokens: ${Math.round(avgTokens)}`
      });
    }

    // Low relevance score recommendation
    if (avgScore < 0.5 && avgScore > 0) {
      recommendations.push({
        type: 'scoring',
        recommendation: 'Improve task descriptions for better file relevance scoring.',
        impact: 'medium',
        details: `Average score: ${avgScore.toFixed(2)}`
      });
    }

    // Low compression ratio recommendation
    if (avgCompressionReduction > 0 && avgCompressionReduction < 20) {
      recommendations.push({
        type: 'compression',
        recommendation: 'Adjust compression thresholds for better reduction ratio.',
        impact: 'low',
        details: `Average reduction: ${avgCompressionReduction.toFixed(1)}%`
      });
    }

    // High deduplication savings recommendation
    if (avgDedupSavings > 10) {
      recommendations.push({
        type: 'deduplication',
        recommendation: 'Review file patterns to reduce duplicate content inclusion.',
        impact: 'medium',
        details: `Average savings: ${avgDedupSavings.toFixed(1)}%`
      });
    }

    return recommendations;
  }
}

module.exports = ContextMetadataTracker;
