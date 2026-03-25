#!/usr/bin/env node

/**
 * URL Fetch Service
 *
 * Provides secure URL fetching with HTTPS validation and user confirmation.
 * Only HTTPS URLs are allowed. HTTP, file, data, javascript, and vbscript protocols are blocked.
 */

import { URL } from 'url';
import { URLFetchError } from './context-errors.js';

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const BLOCKED_PROTOCOLS = ['http:', 'file:', 'data:', 'javascript:', 'vbscript:'];

/**
 * URL validation result
 */
export interface URLValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Fetched content result
 */
export interface FetchResult {
  content: string;
  contentType: string;
}

/**
 * URL Validator - Static validation methods
 */
export class URLValidator {
  /**
   * Validate a URL string
   * @param urlString - The URL to validate
   * @returns Validation result
   */
  static validate(urlString: string | null | undefined): URLValidationResult {
    if (!urlString || typeof urlString !== 'string') {
      return { valid: false, error: 'URL is required' };
    }

    try {
      const url = new URL(urlString);

      // Check protocol
      if (url.protocol !== 'https:') {
        if (BLOCKED_PROTOCOLS.includes(url.protocol)) {
          return {
            valid: false,
            error: `Protocol '${url.protocol}' is not allowed. Only HTTPS is permitted.`
          };
        }
        return {
          valid: false,
          error: `Invalid protocol '${url.protocol}'. Only HTTPS is allowed.`
        };
      }

      // Check hostname exists
      if (!url.hostname || url.hostname.trim() === '') {
        return { valid: false, error: 'Invalid URL: missing hostname' };
      }

      // Reject localhost URLs
      if (url.hostname === 'localhost' ||
          url.hostname === '127.0.0.1' ||
          url.hostname === '::1' ||
          url.hostname.endsWith('.localhost')) {
        return {
          valid: false,
          error: 'Localhost URLs are not allowed. Use a publicly accessible HTTPS URL.'
        };
      }

      return { valid: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return {
        valid: false,
        error: `Invalid URL format: ${errorMessage}`
      };
    }
  }
}

/**
 * URL Fetch Service - Secure URL fetching
 */
export class URLFetchService {
  private timeout: number;

  /**
   * Create a new URLFetchService instance
   * @param timeout - Request timeout in milliseconds (default: 30000)
   */
  constructor(timeout: number = DEFAULT_TIMEOUT) {
    this.timeout = timeout;
  }

  /**
   * Validate a URL
   * @param urlString - The URL to validate
   * @returns Validation result
   */
  validateUrl(urlString: string): URLValidationResult {
    return URLValidator.validate(urlString);
  }

  /**
   * Fetch content from a URL
   * @param url - The URL to fetch
   * @returns Fetched content
   * @throws {URLFetchError} On fetch errors
   */
  async fetchUrl(url: string): Promise<FetchResult> {
    // Validate URL first
    const validation = this.validateUrl(url);
    if (!validation.valid) {
      throw new URLFetchError(url, validation.error || 'Unknown validation error');
    }

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ez-agents/1.0'
        },
        signal: controller.signal,
        redirect: 'follow'
      });

      clearTimeout(timeoutId);

      // Check for HTTP errors
      if (!response.ok) {
        throw new URLFetchError(
          url,
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // Get content type
      const contentType = response.headers.get('content-type') || 'text/plain';

      // Get content
      const content = await response.text();

      return {
        content,
        contentType
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new URLFetchError(url, `Request timeout after ${this.timeout}ms`);
      }

      if (err instanceof URLFetchError) {
        throw err;
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown network error';
      throw new URLFetchError(url, `Network error: ${errorMessage}`);
    }
  }

  /**
   * Prompt user for confirmation before fetching a URL
   * @param url - The URL to fetch
   * @returns True if user confirmed
   */
  static async confirmUrlFetch(url: string): Promise<boolean> {
    const readline = await import('readline');

    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question(`Fetch ${url}? (y/n): `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y');
      });
    });
  }
}

export default URLFetchService;
