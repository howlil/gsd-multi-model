#!/usr/bin/env node

/**
 * Content Security Scanner
 *
 * Scans fetched content for XSS vectors, malicious scripts, and dangerous patterns.
 * Detects script tags, JavaScript URLs, event handlers, and other security threats.
 */

const { SecurityScanError } = require('./context-errors.cjs');

class ContentSecurityScanner {
  constructor() {
    this.maxSize = 1048576; // 1MB

    // XSS detection patterns with severity levels
    this.patterns = [
      {
        name: 'script_tag_open',
        regex: /<script\b[^>]*>/gi,
        severity: 'high',
        description: 'Opening script tag'
      },
      {
        name: 'script_tag_close',
        regex: /<\/script>/gi,
        severity: 'high',
        description: 'Closing script tag'
      },
      {
        name: 'javascript_url',
        regex: /javascript\s*:/gi,
        severity: 'high',
        description: 'JavaScript URL protocol'
      },
      {
        name: 'vbscript_url',
        regex: /vbscript\s*:/gi,
        severity: 'high',
        description: 'VBScript URL protocol'
      },
      {
        name: 'data_html_url',
        regex: /data\s*:\s*text\/html/gi,
        severity: 'high',
        description: 'Data URL with HTML content'
      },
      {
        name: 'event_handler',
        regex: /\bon\w+\s*=/gi,
        severity: 'medium',
        description: 'Event handler attribute'
      },
      {
        name: 'iframe_tag',
        regex: /<iframe\b[^>]*>/gi,
        severity: 'medium',
        description: 'IFRAME tag'
      },
      {
        name: 'embed_tag',
        regex: /<embed\b[^>]*>/gi,
        severity: 'medium',
        description: 'EMBED tag'
      },
      {
        name: 'object_tag',
        regex: /<object\b[^>]*>/gi,
        severity: 'medium',
        description: 'OBJECT tag'
      },
      {
        name: 'svg_tag',
        regex: /<svg\b[^>]*>/gi,
        severity: 'medium',
        description: 'SVG tag (potential XSS vector)'
      },
      {
        name: 'img_onerror',
        regex: /<img[^>]*\s+onerror\s*=/gi,
        severity: 'high',
        description: 'IMG tag with onerror handler'
      },
      {
        name: 'expression_css',
        regex: /expression\s*\(/gi,
        severity: 'medium',
        description: 'CSS expression (IE XSS vector)'
      },
      {
        name: 'eval_call',
        regex: /\beval\s*\(/gi,
        severity: 'high',
        description: 'eval() call'
      },
      {
        name: 'document_cookie',
        regex: /document\.cookie/gi,
        severity: 'medium',
        description: 'Document cookie access'
      },
      {
        name: 'window_location',
        regex: /window\.location/gi,
        severity: 'low',
        description: 'Window location access'
      }
    ];

    // Binary content types to reject
    this.binaryContentTypes = [
      'application/octet-stream',
      'image/',
      'video/',
      'audio/',
      'application/pdf',
      'application/zip',
      'application/x-rar',
      'application/x-executable'
    ];
  }

  /**
   * Scan content for security issues
   * @param {string} content - The content to scan
   * @param {string} contentType - Optional content type header
   * @returns {{safe: boolean, findings: Array}} - Scan results
   */
  scan(content, contentType = '') {
    const findings = [];

    // Check content size
    if (content && content.length > this.maxSize) {
      return {
        safe: false,
        findings: [{
          type: 'size_limit',
          severity: 'high',
          description: `Content exceeds maximum size (${content.length} > ${this.maxSize} bytes)`,
          pattern: null,
          matches: []
        }]
      };
    }

    // Check for binary content types
    if (contentType) {
      const lowerContentType = contentType.toLowerCase();
      for (const binaryType of this.binaryContentTypes) {
        if (lowerContentType.includes(binaryType.toLowerCase())) {
          return {
            safe: false,
            findings: [{
              type: 'binary_content',
              severity: 'high',
              description: `Binary content type detected: ${contentType}`,
              pattern: null,
              matches: []
            }]
          };
        }
      }
    }

    // Scan for XSS patterns
    if (content) {
      for (const pattern of this.patterns) {
        // Reset regex lastIndex
        pattern.regex.lastIndex = 0;

        const matches = [];
        let match;

        while ((match = pattern.regex.exec(content)) !== null) {
          matches.push(match[0]);
          // Limit matches to prevent memory issues
          if (matches.length >= 5) {
            break;
          }
        }

        if (matches.length > 0) {
          findings.push({
            type: pattern.name,
            severity: pattern.severity,
            description: pattern.description,
            pattern: pattern.regex.toString(),
            matches: [...new Set(matches)] // Deduplicate
          });
        }
      }
    }

    return {
      safe: findings.length === 0,
      findings
    };
  }

  /**
   * Get severity level for a pattern
   * @param {string} patternName - The pattern name
   * @returns {string} - 'high', 'medium', or 'low'
   */
  getSeverity(patternName) {
    const pattern = this.patterns.find(p => p.name === patternName);
    if (!pattern) {
      return 'low';
    }
    return pattern.severity;
  }

  /**
   * Check if content is safe (convenience method)
   * @param {string} content - The content to check
   * @param {string} contentType - Optional content type
   * @returns {boolean} - True if safe
   */
  isSafe(content, contentType = '') {
    return this.scan(content, contentType).safe;
  }

  /**
   * Validate content and throw error if unsafe
   * @param {string} content - The content to validate
   * @param {string} contentType - Optional content type
   * @throws {SecurityScanError} - If content is unsafe
   */
  validate(content, contentType = '') {
    const result = this.scan(content, contentType);
    if (!result.safe) {
      throw new SecurityScanError(result.findings);
    }
    return result;
  }
}

module.exports = ContentSecurityScanner;
