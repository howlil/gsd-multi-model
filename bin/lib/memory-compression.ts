#!/usr/bin/env node

/**
 * Memory Compression — Compress long session transcripts
 *
 * Reduces session size by keeping first N and last M messages
 */

import Logger, { defaultLogger as logger } from './logger.js';

interface CompressionOptions {
  threshold?: number;
  keepFirst?: number;
  keepLast?: number;
}

interface CompressionResult {
  compressed: boolean;
  reason?: string;
  messageCount?: number;
  threshold?: number;
  originalLength?: number;
  newLength?: number;
  reduction?: number;
}

interface CompressionStats {
  compressed: boolean;
  original_size?: number;
  compressed_size?: number;
  reduction_percent?: number;
  compressed_at?: string;
}

interface BatchCompressionResult {
  total: number;
  compressed: number;
  skipped: number;
  details: CompressionResult[];
}

interface SessionManager {
  loadSession(sessionId: string): Session | null;
  updateSession(sessionId: string, updates: Record<string, unknown>): void;
  listSessions(): SessionMeta[];
}

interface Session {
  context?: {
    transcript?: string | unknown[];
  };
  metadata?: {
    compressed?: boolean;
    compressed_at?: string;
    compression_stats?: {
      original_count?: number;
      compressed_count?: number;
      removed_count?: number;
    };
  };
}

interface SessionMeta {
  session_id: string;
}

class MemoryCompression {
  private sessionManager: SessionManager;

  /**
   * Create a MemoryCompression instance
   * @param sessionManager - SessionManager instance
   */
  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  /**
   * Compress a session transcript
   * @param sessionId - Session ID
   * @param options - Compression options
   * @returns Compression result
   */
  compress(sessionId: string, options: CompressionOptions = {}): CompressionResult {
    const session = this.sessionManager.loadSession(sessionId);
    if (!session) {
      return { compressed: false, reason: 'Session not found' };
    }

    const {
      threshold = 50,
      keepFirst = 5,
      keepLast = 10
    } = options;

    const transcript = session.context?.transcript || '';

    // Handle string transcript (split by newlines or messages)
    let messages: unknown[] = [];
    if (typeof transcript === 'string') {
      // Try to parse as JSON array first
      try {
        messages = JSON.parse(transcript) as unknown[];
      } catch {
        // Split by newlines as fallback
        messages = transcript.split('\n').filter(line => line.trim());
      }
    } else if (Array.isArray(transcript)) {
      messages = transcript;
    }

    if (messages.length <= threshold) {
      logger.info('Session below compression threshold', { sessionId, messageCount: messages.length });
      return {
        compressed: false,
        reason: 'Below threshold',
        messageCount: messages.length,
        threshold
      };
    }

    // Create compressed transcript
    const firstMessages = messages.slice(0, keepFirst);
    const lastMessages = messages.slice(-keepLast);
    const compressedCount = messages.length - keepFirst - keepLast;

    const placeholder = {
      role: 'system',
      content: `... ${compressedCount} messages compressed ...`,
      timestamp: new Date().toISOString(),
      compressed: true
    };

    const compressedMessages = [
      ...firstMessages,
      placeholder,
      ...lastMessages
    ];

    // Update session
    const updates = {
      context: {
        transcript: compressedMessages
      },
      metadata: {
        compressed: true,
        compressed_at: new Date().toISOString(),
        compression_stats: {
          original_count: messages.length,
          compressed_count: compressedMessages.length,
          removed_count: compressedCount
        }
      }
    };

    this.sessionManager.updateSession(sessionId, updates);

    const reduction = Math.round((1 - compressedMessages.length / messages.length) * 100);

    logger.info('Session compressed', {
      sessionId,
      originalLength: messages.length,
      newLength: compressedMessages.length,
      reduction
    });

    return {
      compressed: true,
      originalLength: messages.length,
      newLength: compressedMessages.length,
      reduction
    };
  }

  /**
   * Get compression stats for a session
   * @param sessionId - Session ID
   * @returns Compression statistics
   */
  getCompressionStats(sessionId: string): CompressionStats {
    const session = this.sessionManager.loadSession(sessionId);
    if (!session) {
      return { compressed: false };
    }

    if (!session.metadata?.compressed) {
      return { compressed: false };
    }

    const originalSize = session.metadata.compression_stats?.original_count || 0;
    const compressedSize = session.metadata.compression_stats?.compressed_count || 0;
    const reduction = session.metadata.compression_stats?.removed_count || 0;
    const reductionPercent = originalSize > 0
      ? Math.round((reduction / originalSize) * 100)
      : 0;

    const stats: CompressionStats = {
      compressed: true,
      original_size: originalSize,
      compressed_size: compressedSize,
      reduction_percent: reductionPercent
    };

    if (session.metadata.compressed_at) stats.compressed_at = session.metadata.compressed_at;

    return stats;
  }

  /**
   * Check if session should be compressed
   * @param sessionId - Session ID
   * @param threshold - Message threshold
   * @returns True if compression recommended
   */
  shouldCompress(sessionId: string, threshold = 50): boolean {
    const session = this.sessionManager.loadSession(sessionId);
    if (!session) {
      return false;
    }

    const transcript = session.context?.transcript || '';
    let messageCount = 0;

    if (typeof transcript === 'string') {
      try {
        const messages = JSON.parse(transcript) as unknown[];
        messageCount = Array.isArray(messages) ? messages.length : 0;
      } catch {
        messageCount = transcript.split('\n').filter(line => line.trim()).length;
      }
    } else if (Array.isArray(transcript)) {
      messageCount = transcript.length;
    }

    return messageCount > threshold;
  }

  /**
   * Compress all sessions exceeding threshold
   * @param options - Compression options
   * @returns Batch compression result
   */
  compressAll(options: CompressionOptions = {}): BatchCompressionResult {
    const sessions = this.sessionManager.listSessions();
    const results: BatchCompressionResult = {
      total: sessions.length,
      compressed: 0,
      skipped: 0,
      details: []
    };

    for (const sessionMeta of sessions) {
      const shouldCompress = this.shouldCompress(sessionMeta.session_id, options.threshold);

      if (shouldCompress) {
        const result = this.compress(sessionMeta.session_id, options);
        if (result.compressed) {
          results.compressed++;
          results.details.push(result);
        } else {
          results.skipped++;
        }
      } else {
        results.skipped++;
      }
    }

    logger.info('Batch compression complete', {
      total: results.total,
      compressed: results.compressed,
      skipped: results.skipped
    });

    return results;
  }

  /**
   * Decompress a session (restore placeholder info)
   * Note: Cannot restore original messages, only marks as decompressed
   * @param sessionId - Session ID
   * @returns Decompression result
   */
  decompress(sessionId: string): CompressionResult {
    const session = this.sessionManager.loadSession(sessionId);
    if (!session) {
      return { compressed: false, reason: 'Session not found' };
    }

    if (!session.metadata?.compressed) {
      return { compressed: false, reason: 'Not compressed' };
    }

    // Remove compression metadata
    this.sessionManager.updateSession(sessionId, {
      metadata: {
        compressed: false,
        compressed_at: null,
        compression_stats: null
      }
    });

    logger.info('Session marked as decompressed', { sessionId });

    return {
      compressed: true,
      reason: 'Original messages cannot be restored'
    };
  }
}

export default MemoryCompression;

export type {
  CompressionOptions,
  CompressionResult,
  CompressionStats,
  BatchCompressionResult,
  SessionManager,
  Session,
  SessionMeta
};
