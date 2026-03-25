/**
 * Context Compressor — Compress context to reduce token usage
 *
 * Strategies:
 * - Remove redundant information
 * - Summarize verbose sections
 * - Compress repeated patterns
 */

/**
 * Compression result with metadata
 */
export interface CompressionResult {
  compressed: boolean;
  content: string;
  method: string;
  originalSize: number;
  compressedSize: number;
  reduction: number;
}

/**
 * Compression options
 */
export interface CompressionOptions {
  limit?: number;
  maxLength?: number;
}

/**
 * Compression statistics
 */
export interface CompressionStats {
  original: number;
  compressed: number;
  saved: number;
  ratio: number;
}

/**
 * ContextCompressor class for compressing context content
 */
export class ContextCompressor {
  private compressionThreshold: number;
  private defaultLimit: number;

  /**
   * Create a ContextCompressor instance
   */
  constructor() {
    this.compressionThreshold = 0.8; // Compress if over 80% of limit
    this.defaultLimit = 100000; // Default token limit
  }

  /**
   * Compress context content
   * @param content - Content to compress
   * @param options - Compression options
   * @returns Compression result with metadata
   */
  compress(content: string, options: CompressionOptions = {}): CompressionResult {
    if (!content) {
      return {
        compressed: false,
        content: '',
        method: 'none',
        originalSize: 0,
        compressedSize: 0,
        reduction: 0
      };
    }

    let result = content;
    const limit = options.limit ?? this.defaultLimit;

    // Remove excessive whitespace
    result = this._removeExtraWhitespace(result);

    // Check if compression is needed
    if (result.length < limit * this.compressionThreshold) {
      return {
        compressed: false,
        content: result,
        method: 'none',
        originalSize: content.length,
        compressedSize: result.length,
        reduction: 0
      };
    }

    // Apply aggressive compression
    result = this._summarizeSections(result, options);

    const originalLength = content.length;
    const compressedLength = result.length;
    const saved = originalLength - compressedLength;
    const ratio = originalLength > 0 ? (saved / originalLength) * 100 : 0;

    return {
      compressed: true,
      content: result,
      method: 'summarize',
      originalSize: originalLength,
      compressedSize: compressedLength,
      reduction: Math.round(ratio * 100) / 100
    };
  }

  /**
   * Compress a file content with path tracking
   * @param _filePath - Path to the file
   * @param content - Content to compress
   * @param options - Compression options
   * @returns Compression result with metadata
   */
  compressFile(_filePath: string, content: string, options: CompressionOptions = {}): CompressionResult {
    return this.compress(content, options);
  }

  /**
   * Remove extra whitespace from content
   * @param content - Content to process
   * @returns Processed content
   */
  private _removeExtraWhitespace(content: string): string {
    return content
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .replace(/[ \t]+$/gm, '') // Remove trailing whitespace
      .replace(/^\s*\n/gm, ''); // Remove leading blank lines
  }

  /**
   * Summarize long sections
   * @param content - Content to summarize
   * @param options - Options
   * @returns Summarized content
   */
  private _summarizeSections(content: string, options: CompressionOptions = {}): string {
    const maxLength = options.maxLength ?? 50000;

    if (content.length <= maxLength) {
      return content;
    }

    // Keep first and last parts, summarize middle
    const keepLength = Math.floor(maxLength / 3);
    const start = content.slice(0, keepLength);
    const end = content.slice(-keepLength);
    const omitted = content.length - (keepLength * 2);

    return `${start}\n\n[... ${omitted} characters omitted ...]\n\n${end}`;
  }

  /**
   * Get compression statistics
   * @param original - Original content
   * @param compressed - Compressed content
   * @returns Compression statistics
   */
  getStats(original: string | undefined, compressed: string | undefined): CompressionStats {
    const originalLength = original?.length ?? 0;
    const compressedLength = compressed?.length ?? 0;
    const saved = originalLength - compressedLength;
    const ratio = originalLength > 0 ? (saved / originalLength) * 100 : 0;

    return {
      original: originalLength,
      compressed: compressedLength,
      saved,
      ratio: Math.round(ratio * 100) / 100
    };
  }
}

export default ContextCompressor;
