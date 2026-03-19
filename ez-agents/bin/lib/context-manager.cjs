#!/usr/bin/env node

/**
 * Context Manager
 *
 * Orchestrates context gathering from files and URLs.
 * Aggregates content, tracks sources, and updates STATE.md with context metadata.
 */

const fs = require('fs');
const path = require('path');
const FileAccessService = require('./file-access.cjs');
const URLFetchService = require('./url-fetch.cjs');
const ContentSecurityScanner = require('./content-scanner.cjs');
const ContextCache = require('./context-cache.cjs');
const { SecurityScanError, FileAccessError, URLFetchError } = require('./context-errors.cjs');

class ContextManager {
  /**
   * Create a new ContextManager instance
   * @param {string} cwd - Current working directory
   */
  constructor(cwd) {
    this.cwd = cwd || process.cwd();
    this.sources = [];
    this.cache = new ContextCache();
    this.fileAccess = new FileAccessService(this.cwd);
    this.urlFetch = new URLFetchService();
    this.scanner = new ContentSecurityScanner();
  }

  /**
   * Request context from files and URLs
   * @param {{files?: string[], urls?: string[]}} options - Context options
   * @returns {{context: string, sources: Array, errors: Array}} - Aggregated context
   */
  async requestContext(options = {}) {
    const { files = [], urls = [] } = options;
    const contextParts = [];
    const sources = [];
    const errors = [];

    // Process file patterns
    for (const pattern of files) {
      try {
        const fileResults = this.fileAccess.readFiles(pattern);
        for (const file of fileResults) {
          contextParts.push(`## File: ${file.path}\n\n${file.content}`);
          const source = {
            type: 'file',
            source: file.path,
            timestamp: new Date().toISOString(),
            size: file.content.length
          };
          sources.push(source);
          this.trackSources([source]);
        }
      } catch (err) {
        errors.push({
          source: pattern,
          type: 'file',
          message: err.message
        });
      }
    }

    // Process URLs
    for (const url of urls) {
      try {
        // Confirm URL fetch with user
        const confirmed = await URLFetchService.confirmUrlFetch(url);
        if (!confirmed) {
          errors.push({
            source: url,
            type: 'url',
            message: 'User declined to fetch URL'
          });
          continue;
        }

        // Fetch the URL
        const result = await this.urlFetch.fetchUrl(url);
        
        // Scan for security issues
        const scanResult = this.scanner.scan(result.content, result.contentType);
        if (!scanResult.safe) {
          throw new SecurityScanError(scanResult.findings);
        }

        // Add to context
        contextParts.push(`## URL: ${url}\n\n${result.content}`);
        
        const source = {
          type: 'url',
          source: url,
          timestamp: new Date().toISOString(),
          contentType: result.contentType,
          size: result.content.length
        };
        sources.push(source);
        this.trackSources([source]);

        // Cache the content
        this.cache.set(url, result.content, {
          type: 'url',
          contentType: result.contentType
        });
      } catch (err) {
        errors.push({
          source: url,
          type: 'url',
          message: err.message
        });
      }
    }

    return {
      context: contextParts.join('\n\n---\n\n'),
      sources,
      errors
    };
  }

  /**
   * Track source metadata (with deduplication)
   * @param {Array} sources - Array of source objects
   */
  trackSources(sources) {
    for (const source of sources) {
      // Check for duplicates (same type and source)
      const isDuplicate = this.sources.some(
        s => s.type === source.type && s.source === source.source
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
  updateStateMd() {
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
    const tableHeader = '| Source | Type | Timestamp |\n|--------|------|-----------|';
    const tableRows = this.sources.map(s => 
      `| ${s.source} | ${s.type.toUpperCase()} | ${s.timestamp} |`
    );
    
    const contextSection = `\n## Context Sources\n\n${tableHeader}\n${tableRows.join('\n')}\n`;

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
   * @returns {Array} - Array of source objects
   */
  getSources() {
    return [...this.sources];
  }

  /**
   * Get cached content for a URL
   * @param {string} key - Cache key (URL)
   * @returns {{content: string, timestamp: number, type: string}|undefined}
   */
  getCached(key) {
    return this.cache.get(key);
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {{size: number, keys: Array<string>}}
   */
  getCacheStats() {
    return this.cache.stats();
  }
}

module.exports = ContextManager;
