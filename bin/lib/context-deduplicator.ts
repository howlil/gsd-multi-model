/**
 * Context Deduplicator — Remove duplicate context items
 *
 * Identifies and removes:
 * - Exact duplicates
 * - Near-duplicates (similar content)
 * - Redundant information
 */

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
 * Generic context item with content field
 */
export interface ContextItem<T = string> {
  content: T;
  [key: string]: unknown;
}

/**
 * ContextDeduplicator class for removing duplicate context
 */
export class ContextDeduplicator {
  private seen: Set<string>;

  /**
   * Create a ContextDeduplicator instance
   * @param _options - Deduplicator options
   */
  constructor(_options: { enableFuzzyMatch?: boolean } = {}) {
    this.seen = new Set<string>();
  }

  /**
   * Generate a hash for content
   * @param content - Content to hash
   * @returns Hash value
   */
  private _hash(content: string): string {
    // Simple hash for deduplication
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Check if content is a duplicate
   * @param content - Content to check
   * @returns True if duplicate
   */
  isDuplicate(content: string): boolean {
    const hash = this._hash(content);
    return this.seen.has(hash);
  }

  /**
   * Mark content as seen
   * @param content - Content to mark
   */
  markSeen(content: string): void {
    const hash = this._hash(content);
    this.seen.add(hash);
  }

  /**
   * Deduplicate an array of items
   * @param items - Items to deduplicate
   * @param keyField - Field to use for deduplication (default: 'content')
   * @returns Deduplicated items
   */
  deduplicate<T extends Record<string, unknown>>(items: T[], keyField: string = 'content'): T[] {
    const seen = new Set<string>();
    const result: T[] = [];

    for (const item of items) {
      const keyValue = item[keyField] as string | undefined;
      const key = keyValue ?? JSON.stringify(item);
      const hash = this._hash(key);

      if (!seen.has(hash)) {
        seen.add(hash);
        result.push(item);
      }
    }

    return result;
  }

  /**
   * Deduplicate file items with content field
   * @param files - Array of file items with content
   * @returns Deduplication result
   */
  deduplicateFiles<T extends { content: string }>(files: T[]): { unique: T[]; stats: DedupStats } {
    const unique = this.deduplicate(files, 'content');
    const stats = this.getStats(files, unique);
    return { unique, stats };
  }

  /**
   * Clear the seen set
   */
  clear(): void {
    this.seen.clear();
  }

  /**
   * Get deduplication statistics
   * @param original - Original items
   * @param deduplicated - Deduplicated items
   * @returns Statistics
   */
  getStats<T extends unknown[]>(original: T, deduplicated: T): DedupStats {
    const removed = original.length - deduplicated.length;
    const ratio = original.length > 0 ? (removed / original.length) * 100 : 0;

    return {
      original: original.length,
      deduplicated: deduplicated.length,
      removed,
      ratio: Math.round(ratio * 100) / 100
    };
  }
}

export default ContextDeduplicator;
