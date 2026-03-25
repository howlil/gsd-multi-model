/**
 * Deploy Health Check — Verifies deployment success
 * Checks deployment URL for healthy response
 */

import * as https from 'https';
import * as http from 'http';

/**
 * Health check result for a single endpoint
 */
export interface HealthResult {
  /** URL that was checked */
  url: string;
  /** Whether endpoint is healthy */
  healthy: boolean;
  /** HTTP status code or error type */
  status: number | string;
  /** Status message */
  message: string;
}

/**
 * Overall health check result
 */
export interface HealthCheckResult {
  /** Whether all endpoints are healthy */
  healthy: boolean;
  /** Results for each endpoint */
  results: HealthResult[];
  /** Overall message */
  message: string;
}

export class DeployHealthCheck {
  private timeout: number;

  constructor(timeout: number = 10000) {
    this.timeout = timeout;
  }

  /**
   * Check health of deployment URL
   * @param url - Deployment URL to check
   * @param endpoints - Additional endpoints to check
   * @returns Health result { healthy, status, message }
   */
  async checkHealth(url: string, endpoints: string[] = []): Promise<HealthCheckResult> {
    const allEndpoints = [url, ...endpoints];
    const results: HealthResult[] = [];

    for (const endpoint of allEndpoints) {
      try {
        const result = await this.checkEndpoint(endpoint);
        results.push(result);
      } catch (e) {
        results.push({
          url: endpoint,
          healthy: false,
          status: 'error',
          message: (e as Error).message
        });
      }
    }

    const allHealthy = results.every(r => r.healthy);
    return {
      healthy: allHealthy,
      results,
      message: allHealthy ? 'All endpoints healthy' : 'Some endpoints unhealthy'
    };
  }

  /**
   * Check single endpoint
   * @param url - URL to check
   * @returns Health result
   */
  private async checkEndpoint(url: string): Promise<HealthResult> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      const req = protocol.get(url, { timeout: this.timeout }, (res) => {
        if (res.statusCode === 200) {
          resolve({ url, healthy: true, status: res.statusCode, message: 'OK' });
        } else if (res.statusCode !== undefined && res.statusCode >= 500) {
          resolve({ url, healthy: false, status: res.statusCode, message: 'Server Error' });
        } else {
          resolve({ url, healthy: true, status: res.statusCode ?? 'unknown', message: 'OK (non-200)' });
        }
      });

      req.on('error', (e) => {
        resolve({ url, healthy: false, status: 'error', message: e.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ url, healthy: false, status: 'timeout', message: 'Request timed out' });
      });
    });
  }
}

/**
 * Check health of deployment URL
 * @param url - Deployment URL
 * @param endpoints - Additional endpoints
 * @returns Health result
 */
export async function checkHealth(url: string, endpoints: string[] = []): Promise<HealthCheckResult> {
  const checker = new DeployHealthCheck();
  return checker.checkHealth(url, endpoints);
}
