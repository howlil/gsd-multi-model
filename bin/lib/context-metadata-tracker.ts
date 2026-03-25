/**
 * Context Metadata Tracker — Track metadata for context items
 *
 * Tracks:
 * - Creation time
 * - Last access time
 * - Access count
 * - Source/origin
 * - Tags/categories
 */

/**
 * Metadata for a context item
 */
export interface ContextMetadata {
  createdAt: number;
  updatedAt: number;
  lastAccessed: number;
  accessCount: number;
  [key: string]: unknown;
}

/**
 * Metadata statistics
 */
export interface MetadataStats {
  total: number;
  totalAccesses: number;
  avgAccesses: number;
  oldest: string | null;
  newest: string;
}

/**
 * ContextMetadataTracker class for tracking context item metadata
 */
export class ContextMetadataTracker {
  private metadata: Map<string, ContextMetadata>;

  /**
   * Create a ContextMetadataTracker instance
   * @param _cwd - Current working directory (reserved for future use)
   */
  constructor(_cwd: string) {
    this.metadata = new Map<string, ContextMetadata>();
  }

  /**
   * Track metadata for a context item
   * @param id - Item identifier
   * @param data - Metadata to track
   */
  track(id: string, data: Partial<ContextMetadata> = {}): void {
    const existing = this.metadata.get(id);

    this.metadata.set(id, {
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      lastAccessed: existing?.lastAccessed ?? Date.now(),
      accessCount: existing?.accessCount ?? 0,
      ...data
    });
  }

  /**
   * Record an access to a context item
   * @param id - Item identifier
   */
  recordAccess(id: string): void {
    const data = this.metadata.get(id);
    if (data) {
      data.lastAccessed = Date.now();
      data.accessCount = (data.accessCount || 0) + 1;
      this.metadata.set(id, data);
    }
  }

  /**
   * Get metadata for an item
   * @param id - Item identifier
   * @returns Metadata or undefined
   */
  get(id: string): ContextMetadata | undefined {
    return this.metadata.get(id);
  }

  /**
   * Remove metadata for an item
   * @param id - Item identifier
   * @returns True if removed
   */
  remove(id: string): boolean {
    return this.metadata.delete(id);
  }

  /**
   * Get all tracked metadata
   * @returns All metadata as an object
   */
  getAll(): Record<string, ContextMetadata> {
    const result: Record<string, ContextMetadata> = {};
    this.metadata.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Clear all metadata
   */
  clear(): void {
    this.metadata.clear();
  }

  /**
   * Get statistics about tracked items
   * @returns Statistics
   */
  stats(): MetadataStats {
    let totalAccesses = 0;
    let oldest = Infinity;
    let newest = 0;

    this.metadata.forEach((data) => {
      totalAccesses += data.accessCount || 0;
      if (data.createdAt < oldest) oldest = data.createdAt;
      if (data.createdAt > newest) newest = data.createdAt;
    });

    return {
      total: this.metadata.size,
      totalAccesses,
      avgAccesses: this.metadata.size > 0 ? Math.round(totalAccesses / this.metadata.size) : 0,
      oldest: oldest === Infinity ? null : new Date(oldest).toISOString(),
      newest: new Date(newest).toISOString()
    };
  }

  /**
   * Find items by metadata criteria
   * @param criteria - Search criteria
   * @returns Matching item IDs
   */
  findBy(criteria: Record<string, unknown>): string[] {
    const results: string[] = [];

    this.metadata.forEach((data, id) => {
      let matches = true;

      for (const [key, value] of Object.entries(criteria)) {
        if (data[key] !== value) {
          matches = false;
          break;
        }
      }

      if (matches) {
        results.push(id);
      }
    });

    return results;
  }

  /**
   * Create metadata for context aggregation
   * @param contextData - Context data including sources and stats
   * @param options - Options including taskId and task
   * @returns Created metadata
   */
  createMetadata(
    contextData: {
      context: string;
      sources: unknown[];
      scoringStats?: unknown;
      compressionStats?: unknown;
      dedupStats?: unknown;
    },
    options: { taskId: string; task: string }
  ): ContextMetadata {
    const metadata: ContextMetadata = {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      taskId: options.taskId,
      task: options.task,
      sourceCount: contextData.sources.length
    };

    if (contextData.scoringStats) {
      (metadata as Record<string, unknown>).scoringStats = contextData.scoringStats;
    }
    if (contextData.compressionStats) {
      (metadata as Record<string, unknown>).compressionStats = contextData.compressionStats;
    }
    if (contextData.dedupStats) {
      (metadata as Record<string, unknown>).dedupStats = contextData.dedupStats;
    }

    this.metadata.set(options.taskId, metadata);
    return metadata;
  }

  /**
   * Save metadata to file system
   * @param _metadata - Metadata to save
   * @returns True if saved successfully
   */
  saveMetadata(_metadata: ContextMetadata): boolean {
    // Implementation would depend on storage requirements
    // For now, metadata is kept in-memory
    return true;
  }
}

export default ContextMetadataTracker;
