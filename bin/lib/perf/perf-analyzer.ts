/**
 * Perf Analyzer — Core performance analysis coordinator
 * Orchestrates all analyzers and aggregates results
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Performance analysis options
 */
export interface PerfAnalysisOptions {
  /** Database connection URL */
  dbUrl?: string;
  /** Queries to analyze */
  queries?: string[];
  /** URL for frontend analysis */
  url?: string;
  /** API base URL */
  apiUrl?: string;
  /** Endpoints to track */
  endpoints?: string[];
}

/**
 * Performance analysis result
 */
export interface PerfAnalysisResult {
  /** Timestamp of analysis */
  timestamp: string;
  /** Database analysis results */
  db: unknown | null;
  /** Frontend analysis results */
  frontend: unknown | null;
  /** API analysis results */
  api: unknown | null;
  /** Array of error messages */
  errors: string[];
}

export class PerfAnalyzer {
  private cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
  }

  /**
   * Run all performance analyzers and aggregate results
   * @param options - Analysis options
   * @returns Aggregated performance results
   */
  async analyze(options: PerfAnalysisOptions = {}): Promise<PerfAnalysisResult> {
    const results: PerfAnalysisResult = {
      timestamp: new Date().toISOString(),
      db: null,
      frontend: null,
      api: null,
      errors: []
    };

    try {
      // Run DB analysis if DB URL provided
      if (options.dbUrl) {
        const { analyzeQueries } = await import('./db-optimizer.js');
        results.db = await analyzeQueries(options.dbUrl, options.queries || []);
      }
    } catch (e) {
      results.errors.push(`DB analysis failed: ${(e as Error).message}`);
    }

    try {
      // Run frontend analysis if URL provided
      if (options.url) {
        const { runLighthouse } = await import('./frontend-performance.js');
        results.frontend = await runLighthouse(options.url);
      }
    } catch (e) {
      results.errors.push(`Frontend analysis failed: ${(e as Error).message}`);
    }

    try {
      // Run API analysis if API URL provided
      if (options.apiUrl) {
        const { trackEndpoint } = await import('./api-monitor.js');
        results.api = await trackEndpoint(options.apiUrl, options.endpoints || []);
      }
    } catch (e) {
      results.errors.push(`API analysis failed: ${(e as Error).message}`);
    }

    return results;
  }

  /**
   * Aggregate results from multiple analyzers
   * @param resultsArray - Array of analysis results
   * @returns Aggregated results
   */
  aggregate(resultsArray: PerfAnalysisResult[]): PerfAnalysisResult {
    const aggregated: PerfAnalysisResult = {
      timestamp: new Date().toISOString(),
      db: [],
      frontend: [],
      api: [],
      errors: []
    };

    for (const r of resultsArray) {
      if (r.db) (aggregated.db as unknown[]).push(r.db);
      if (r.frontend) (aggregated.frontend as unknown[]).push(r.frontend);
      if (r.api) (aggregated.api as unknown[]).push(r.api);
      aggregated.errors.push(...(r.errors || []));
    }

    return aggregated;
  }
}
