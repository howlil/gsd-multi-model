#!/usr/bin/env node

/**
 * Content Security Scanner
 *
 * Scans fetched content for XSS vectors, malicious scripts, and dangerous patterns.
 * Detects script tags, JavaScript URLs, event handlers, and other security threats.
 */

interface SecurityFinding {
  type: string;
  severity: string;
  description: string;
  pattern: string | null;
  matches: string[];
}

interface ScanResult {
  safe: boolean;
  findings: SecurityFinding[];
}

interface SecurityPattern {
  name: string;
  regex: RegExp;
  severity: string;
  description: string;
}

class SecurityScanError extends Error {
  findings: SecurityFinding[];

  constructor(findings: SecurityFinding[]) {
    super(`Security scan found ${findings.length} issue(s)`);
    this.name = 'SecurityScanError';
    this.findings = findings;
  }
}

class ContentSecurityScanner {
  private maxSize: number;
  private patterns: SecurityPattern[];
  private binaryContentTypes: string[];

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
   * @param content - The content to scan
   * @param contentType - Optional content type header
   * @returns Scan results
   */
  scan(content: string, contentType = ''): ScanResult {
    const findings: SecurityFinding[] = [];

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

        const matches: string[] = [];
        let match: RegExpExecArray | null;

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
   * @param patternName - The pattern name
   * @returns Severity level
   */
  getSeverity(patternName: string): string {
    const pattern = this.patterns.find(p => p.name === patternName);
    if (!pattern) {
      return 'low';
    }
    return pattern.severity;
  }

  /**
   * Check if content is safe (convenience method)
   * @param content - The content to check
   * @param contentType - Optional content type
   * @returns True if safe
   */
  isSafe(content: string, contentType = ''): boolean {
    return this.scan(content, contentType).safe;
  }

  /**
   * Validate content and throw error if unsafe
   * @param content - The content to validate
   * @param contentType - Optional content type
   * @throws SecurityScanError if content is unsafe
   */
  validate(content: string, contentType = ''): ScanResult {
    const result = this.scan(content, contentType);
    if (!result.safe) {
      throw new SecurityScanError(result.findings);
    }
    return result;
  }
}

export default ContentSecurityScanner;
export { SecurityScanError };

export type { SecurityFinding, ScanResult, SecurityPattern };
