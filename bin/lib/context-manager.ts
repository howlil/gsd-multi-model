/**
 * Context Manager
 *
 * Orchestrates context gathering from files and URLs.
 * Aggregates content, tracks sources, and updates STATE.md with context metadata.
 * Enhanced with context optimization: scoring, compression, deduplication, and metadata tracking.
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileAccessService } from './file-access.cjs';
import { URLFetchService } from './url-fetch.cjs';
import { ContentSecurityScanner, type SecurityFinding } from './content-scanner.cjs';
import { ContextCache, type CacheEntry } from './context-cache.js';
import { SecurityScanError } from './context-errors.js';
import { ContextRelevanceScorer, type ScoredFile } from './context-relevance-scorer.js';
import { ContextCompressor, type CompressionResult } from './context-compressor.js';
import { ContextDeduplicator } from './context-deduplicator.js';
import { ContextMetadataTracker } from './context-metadata-tracker.js';

/**
 * Context source information
 */
export interface ContextSource {
  type: 'file' | 'url';
  source: string;
  timestamp: string;
  size: number;
  score?: number | null;
  compression?: {
    method: string;
    originalSize: number;
    compressedSize: number;
    reduction: number;
  } | null;
  contentType?: string;
}

/**
 * Scoring statistics
 */
export interface ScoringStats {
  enabled: boolean;
  minScore: number;
  avgScore: number;
  filteredCount: number;
}

/**
 * Compression statistics
 */
export interface CompressionStats {
  enabled: boolean;
  totalOriginal: number;
  totalCompressed: number;
  totalSaved: number;
  avgReduction: number;
}

/**
 * Deduplication statistics
 */
export interface DedupStats {
  original: number;
  deduplicated: number;
  removed: number;
  ratio: number;
}

/**
 * Context metadata
 */
export interface ContextMetadataOutput {
  taskId: string;
  task: string;
  context: string;
  sources: ContextSource[];
  scoringStats?: ScoringStats;
  compressionStats?: CompressionStats;
  dedupStats?: DedupStats;
  createdAt: string;
}

/**
 * Context request options
 */
export interface ContextOptions {
  files?: string[];
  urls?: string[];
  task?: string;
  enableScoring?: boolean;
  minScore?: number;
  maxFiles?: number;
  enableCompression?: boolean;
  enableDeduplication?: boolean;
  taskId?: string;
}

/**
 * Context result
 */
export interface ContextResult {
  context: string;
  sources: ContextSource[];
  errors: Array<{
    source: string;
    type: string;
    message: string;
  }>;
  scoringStats?: ScoringStats;
  compressionStats?: CompressionStats;
  dedupStats?: DedupStats;
  metadata?: ContextMetadataOutput;
}

/**
 * Processed file with optimization metadata
 */
interface ProcessedFile {
  path: string;
  content: string;
  score?: number;
  breakdown?: { recency: number; frequency: number; relevance: number } | null;
  compression?: CompressionResult | null;
}

/**
 * ContextManager class for orchestrating context gathering
 */
export class ContextManager {
  private cwd: string;
  private sources: ContextSource[];
  private cache: ContextCache;
  private fileAccess: FileAccessService;
  private urlFetch: URLFetchService;
  private scanner: ContentSecurityScanner;
  private scorer: ContextRelevanceScorer | null;
  private compressor: ContextCompressor;
  private deduplicator: ContextDeduplicator;
  private metadataTracker: ContextMetadataTracker;

  /**
   * Create a new ContextManager instance
   * @param cwd - Current working directory
   */
  constructor(cwd: string) {
    this.cwd = cwd || process.cwd();
    this.sources = [];
    this.cache = new ContextCache();
    this.fileAccess = new FileAccessService(this.cwd);
    this.urlFetch = new URLFetchService();
    this.scanner = new ContentSecurityScanner();
    this.scorer = null;
    this.compressor = new ContextCompressor();
    this.deduplicator = new ContextDeduplicator({ enableFuzzyMatch: true });
    this.metadataTracker = new ContextMetadataTracker(this.cwd);
  }

  /**
   * Request context from files and URLs
   * @param options - Context options
   * @returns Aggregated context with optimization stats
   */
  async requestContext(options: ContextOptions = {}): Promise<ContextResult> {
    const {
      files = [],
      urls = [],
      task,
      enableScoring = false,
      minScore = 0.1,
      maxFiles = 20,
      enableCompression = false,
      enableDeduplication = false,
      taskId
    } = options;

    const contextParts: string[] = [];
    const sources: ContextSource[] = [];
    const errors: Array<{ source: string; type: string; message: string }> = [];
    let scoringStats: ScoringStats | null = null;
    let compressionStats: CompressionStats | null = null;
    let dedupStats: DedupStats | null = null;

    // Gather all files from patterns
    let allFiles: Array<{ path: string; content: string }> = [];
    for (const pattern of files) {
      try {
        const fileResults = this.fileAccess.readFiles(pattern);
        for (const file of fileResults) {
          allFiles.push({
            path: file.path,
            content: file.content
          });
        }
      } catch (err) {
        errors.push({
          source: pattern,
          type: 'file',
          message: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    // Step 1: Score files if task provided and scoring enabled
    let filesToProcess: ProcessedFile[] = allFiles as ProcessedFile[];
    if (task && enableScoring && allFiles.length > 0) {
      this.scorer = new ContextRelevanceScorer(task, { minScore, maxFiles });
      const scoredFiles: ScoredFile[] = this.scorer.scoreFiles(allFiles.map((f) => f.path));
      const scoredPaths = new Set(scoredFiles.map((f) => f.path));

      // Filter to scored files and attach scores
      filesToProcess = allFiles
        .filter((f): f is { path: string; content: string } => scoredPaths.has(f.path))
        .map((f) => {
          const scored = scoredFiles.find((s) => s.path === f.path);
          return {
            path: f.path,
            content: f.content,
            score: scored ? scored.score : 0,
            breakdown: scored ? scored.breakdown : null
          };
        });

      // Calculate scoring stats
      const avgScore =
        filesToProcess.length > 0
          ? filesToProcess.reduce((sum, f) => sum + (f.score ?? 0), 0) / filesToProcess.length
          : 0;

      scoringStats = {
        enabled: true,
        minScore,
        avgScore: Math.round(avgScore * 100) / 100,
        filteredCount: allFiles.length - filesToProcess.length
      };
    }

    // Step 2: Deduplicate files if enabled
    let uniqueFiles: ProcessedFile[] = filesToProcess;
    if (enableDeduplication && filesToProcess.length > 0) {
      const result = this.deduplicator.deduplicateFiles(filesToProcess);
      uniqueFiles = result.unique;
      dedupStats = result.stats;
    }

    // Step 3: Compress files if enabled
    const processedFiles: ProcessedFile[] = [];
    let totalOriginal = 0;
    let totalCompressed = 0;

    for (const file of uniqueFiles) {
      let content = file.content;
      let compressionInfo: CompressionResult | null = null;

      if (enableCompression) {
        const result = this.compressor.compressFile(file.path, content);
        if (result.compressed) {
          content = result.content;
          compressionInfo = result;
          totalOriginal += result.originalSize;
          totalCompressed += result.compressedSize;
        }
      }

      processedFiles.push({
        ...file,
        content,
        compression: compressionInfo
      });
    }

    if (enableCompression && processedFiles.length > 0) {
      const totalSaved = totalOriginal - totalCompressed;
      const avgReduction = totalOriginal > 0 ? (totalSaved / totalOriginal) * 100 : 0;
      compressionStats = {
        enabled: true,
        totalOriginal,
        totalCompressed,
        totalSaved,
        avgReduction: Math.round(avgReduction * 100) / 100
      };
    }

    // Build context from processed files
    for (const file of processedFiles) {
      contextParts.push(`## File: ${file.path}\n\n${file.content}`);
      const source: ContextSource = {
        type: 'file',
        source: file.path,
        timestamp: new Date().toISOString(),
        size: file.content.length
      };
      
      if (file.score !== undefined) {
        source.score = file.score;
      }
      
      if (file.compression) {
        source.compression = {
          method: file.compression.method,
          originalSize: file.compression.originalSize,
          compressedSize: file.compression.compressedSize,
          reduction: file.compression.reduction
        };
      }
      
      sources.push(source);
      this.trackSources([source]);
    }

    // Process URLs (unchanged)
    for (const url of urls) {
      try {
        const confirmed = await URLFetchService.confirmUrlFetch(url);
        if (!confirmed) {
          errors.push({
            source: url,
            type: 'url',
            message: 'User declined to fetch URL'
          });
          continue;
        }

        const result = await this.urlFetch.fetchUrl(url);
        const scanResult = this.scanner.scan(result.content, result.contentType);
        if (!scanResult.safe) {
          throw new SecurityScanError(scanResult.findings as SecurityFinding[]);
        }

        contextParts.push(`## URL: ${url}\n\n${result.content}`);

        const source: ContextSource = {
          type: 'url',
          source: url,
          timestamp: new Date().toISOString(),
          contentType: result.contentType,
          size: result.content.length
        };
        sources.push(source);
        this.trackSources([source]);
        this.cache.set(url, result.content, {
          type: 'url',
          ...(result.contentType && { contentType: result.contentType })
        });
      } catch (err) {
        errors.push({
          source: url,
          type: 'url',
          message: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    // Build metadata if taskId provided
    let metadata: ContextMetadataOutput | undefined = undefined;
    if (taskId) {
      const metadataObj = this.metadataTracker.createMetadata(
        {
          context: contextParts.join('\n\n---\n\n'),
          sources,
          scoringStats: scoringStats ?? undefined,
          compressionStats: compressionStats ?? undefined,
          dedupStats: dedupStats ?? undefined
        },
        { taskId, task: task || '' }
      );
      this.metadataTracker.saveMetadata(metadataObj);
      metadata = {
        taskId,
        task: task || '',
        context: contextParts.join('\n\n---\n\n'),
        sources,
        ...(scoringStats && { scoringStats }),
        ...(compressionStats && { compressionStats }),
        ...(dedupStats && { dedupStats }),
        createdAt: new Date(metadataObj.createdAt).toISOString()
      };
    }

    return {
      context: contextParts.join('\n\n---\n\n'),
      sources,
      errors,
      ...(scoringStats && { scoringStats }),
      ...(compressionStats && { compressionStats }),
      ...(dedupStats && { dedupStats }),
      ...(metadata && { metadata })
    };
  }

  /**
   * Track source metadata (with deduplication)
   * @param sources - Array of source objects
   */
  private trackSources(sources: ContextSource[]): void {
    for (const source of sources) {
      // Check for duplicates (same type and source)
      const isDuplicate = this.sources.some(
        (s) => s.type === source.type && s.source === source.source
      );

      if (!isDuplicate) {
        this.sources.push(source);
      }
    }
  }

  /**
   * Update STATE.md with context sources
   * Creates or appends to the Context Sources section
   */
  updateStateMd(): void {
    const statePath = path.join(this.cwd, '.planning', 'STATE.md');

    // Ensure .planning directory exists
    const planningDir = path.join(this.cwd, '.planning');
    if (!fs.existsSync(planningDir)) {
      fs.mkdirSync(planningDir, { recursive: true });
    }

    let content = '';

    // Read existing content or start fresh
    if (fs.existsSync(statePath)) {
      content = fs.readFileSync(statePath, 'utf-8');
    } else {
      content = '# Project State\n\n';
    }

    // Build the context sources table
    const tableHeader = '| Source | Type | Timestamp |';
    const tableRows = this.sources.map(
      (s) => `| ${s.source} | ${s.type.toUpperCase()} | ${s.timestamp} |`
    );

    const contextSection = `\n## Context Sources\n\n${tableHeader}\n|--------|------|-----------|\n${tableRows.join('\n')}\n`;

    // Check if Context Sources section already exists
    const sectionRegex = /## Context Sources\n[\s\S]*?(?=\n## |\n$|$)/i;
    const existingSection = content.match(sectionRegex);

    if (existingSection) {
      // Replace existing section
      content = content.replace(sectionRegex, contextSection);
    } else {
      // Append new section
      content = content.trimEnd() + '\n' + contextSection;
    }

    // Write back to STATE.md
    fs.writeFileSync(statePath, content, 'utf-8');
  }

  /**
   * Get all tracked sources
   * @returns Array of source objects
   */
  getSources(): ContextSource[] {
    return [...this.sources];
  }

  /**
   * Get cached content for a URL
   * @param key - Cache key (URL)
   * @returns Cached entry or undefined
   */
  getCached(key: string): CacheEntry | undefined {
    return this.cache.get(key);
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return this.cache.stats();
  }
}

export default ContextManager;
