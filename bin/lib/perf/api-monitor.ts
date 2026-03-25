/**
 * API Monitor — Endpoint latency tracking with baseline storage
 * Tracks p50, p95, p99 percentiles
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Endpoint latency result
 */
export interface LatencyResult {
  /** Endpoint path */
  endpoint: string;
  /** HTTP method */
  method: string;
  /** Latency in milliseconds */
  latency: number;
  /** HTTP status code */
  status?: number;
  /** Error message if failed */
  error?: string;
  /** Timestamp of measurement */
  timestamp: string;
}

/**
 * Percentile values
 */
export interface Percentiles {
  /** 50th percentile (median) */
  p50: number;
  /** 95th percentile */
  p95: number;
  /** 99th percentile */
  p99: number;
}

/**
 * Endpoint definition
 */
export interface Endpoint {
  /** Endpoint path */
  path: string;
  /** HTTP method */
  method?: string;
}

export class ApiMonitor {
  private cwd: string;
  private latenciesPath: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.latenciesPath = path.join(this.cwd, '.planning', 'perf', 'api-latencies.json');
  }

  /**
   * Track endpoint latency
   * @param baseUrl - Base URL of API
   * @param endpoints - Array of endpoint paths to track
   * @returns Latency results
   */
  async trackEndpoint(baseUrl: string, endpoints: (string | Endpoint)[]): Promise<LatencyResult[]> {
    const results: LatencyResult[] = [];

    for (const endpoint of endpoints) {
      const start = Date.now();
      try {
        // Placeholder - would make actual HTTP request in real implementation
        const latency = Date.now() - start;
        results.push({
          endpoint: typeof endpoint === 'string' ? endpoint : endpoint.path,
          method: typeof endpoint === 'string' ? 'GET' : endpoint.method || 'GET',
          latency,
          status: 200,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        results.push({
          endpoint: typeof endpoint === 'string' ? endpoint : endpoint.path,
          method: typeof endpoint === 'string' ? 'GET' : endpoint.method || 'GET',
          latency: -1,
          error: (e as Error).message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * Calculate percentiles from latency array
   * @param latencies - Array of latency values
   * @returns Percentile values
   */
  calculatePercentiles(latencies: number[]): Percentiles {
    const sorted = latencies.filter(l => l > 0).sort((a, b) => a - b);
    if (sorted.length === 0) return { p50: 0, p95: 0, p99: 0 };

    return {
      p50: sorted[Math.floor(sorted.length * 0.50)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
}

/**
 * Track endpoint latency
 * @param baseUrl - Base URL of API
 * @param endpoints - Array of endpoint paths to track
 * @returns Latency results
 */
export async function trackEndpoint(baseUrl: string, endpoints: (string | Endpoint)[]): Promise<LatencyResult[]> {
  const monitor = new ApiMonitor();
  return monitor.trackEndpoint(baseUrl, endpoints);
}

/**
 * Calculate percentiles from latency array
 * @param latencies - Array of latency values
 * @returns Percentile values
 */
export function calculatePercentiles(latencies: number[]): Percentiles {
  const monitor = new ApiMonitor();
  return monitor.calculatePercentiles(latencies);
}
