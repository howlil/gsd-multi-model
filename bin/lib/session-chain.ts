#!/usr/bin/env node

/**
 * Session Chain — Navigate linked sessions
 *
 * Provides chain navigation, visualization, and repair capabilities
 */

import { SessionChainError } from './session-errors.js';
import { defaultLogger as logger } from './logger.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface SessionMetadata {
  session_id: string;
  session_version: string;
  started_at: string;
  ended_at: string | null;
  model: string | null;
  phase: number | null;
  plan: number | null;
  status: string;
  session_chain: string[];
  token_usage: {
    input: number;
    output: number;
    total: number;
  };
}

export interface SessionContext {
  transcript: string;
  tasks: Array<{ name?: string; description?: string; status?: string }>;
  decisions: Array<{ title?: string; rationale?: string; status?: string }>;
  file_changes: Array<{ file?: string; action?: string; reason?: string }>;
  open_questions: string[];
  blockers: string[];
}

export interface SessionState {
  current_phase: number | null;
  current_plan: number | null;
  incomplete_tasks: string[];
  last_action: string | null;
  next_recommended_action: string | null;
}

export interface Session {
  metadata: SessionMetadata;
  context: SessionContext;
  state: SessionState;
}

export interface SessionManagerLike {
  loadSession(sessionId: string): Session | null;
  updateSession(sessionId: string, updates: Record<string, unknown>): boolean;
  listSessions(): Array<{ session_id: string; [key: string]: unknown }>;
}

export interface ChainRepairResult {
  repaired: boolean;
  repairs?: Array<{ missing: string; found: string }>;
  warnings: string[];
}

// ─── SessionChain Class ─────────────────────────────────────────────────────

/**
 * SessionChain provides navigation and management for linked sessions
 */
export class SessionChain {
  private sessionManager: SessionManagerLike;

  /**
   * Create a SessionChain instance
   * @param sessionManager - SessionManager instance
   */
  constructor(sessionManager: SessionManagerLike) {
    this.sessionManager = sessionManager;
  }

  /**
   * Navigate to adjacent session in chain
   * @param sessionId - Current session ID
   * @param direction - Navigation direction ('previous' or 'next')
   * @returns Adjacent session or null
   */
  navigate(sessionId: string, direction: 'previous' | 'next'): Session | null {
    const session = this.sessionManager.loadSession(sessionId);
    if (!session) {
      return null;
    }

    const chain = session.metadata?.session_chain || [];
    const currentIndex = chain.indexOf(sessionId);

    if (currentIndex === -1) {
      // Session not in chain, check if it's the last one
      logger.warn('Session not in chain', { sessionId });
      return null;
    }

    if (direction === 'previous') {
      if (currentIndex > 0) {
        const previousId = chain[currentIndex - 1];
        if (previousId) {
          return this.sessionManager.loadSession(previousId);
        }
      }
      return null;
    }

    if (direction === 'next') {
      if (currentIndex < chain.length - 1) {
        const nextId = chain[currentIndex + 1];
        if (nextId) {
          return this.sessionManager.loadSession(nextId);
        }
      }
      return null;
    }

    throw new SessionChainError(`Invalid direction: ${direction}`, chain);
  }

  /**
   * Get full chain as array of session objects
   * @param sessionId - Session ID in the chain
   * @returns Array of session objects
   */
  getChain(sessionId: string): Session[] {
    const session = this.sessionManager.loadSession(sessionId);
    if (!session) {
      return [];
    }

    const chain = session.metadata?.session_chain || [];
    const chainSessions: Session[] = [];

    for (const id of chain) {
      const chainSession = this.sessionManager.loadSession(id);
      if (chainSession) {
        chainSessions.push(chainSession);
      } else {
        logger.warn('Missing session in chain', { id });
      }
    }

    // Include current session if not already in chain
    if (!chain.includes(sessionId)) {
      chainSessions.push(session);
    }

    return chainSessions;
  }

  /**
   * Get chain visualization string
   * @param sessionId - Session ID
   * @returns Formatted chain visualization
   */
  getChainVisualization(sessionId: string): string {
    const session = this.sessionManager.loadSession(sessionId);
    if (!session) {
      return `Session not found: ${sessionId}`;
    }

    const chain = session.metadata?.session_chain || [];
    const currentIndex = chain.indexOf(sessionId);

    let viz = `Session Chain for ${sessionId}:\n\n`;

    chain.forEach((id, index) => {
      const chainSession = this.sessionManager.loadSession(id);
      const startedAt = chainSession?.metadata?.started_at || 'Unknown';
      const status = chainSession?.metadata?.status || 'unknown';
      const marker = index === currentIndex ? ' <-- Current' : '';
      viz += `[${index + 1}] ${id} (${startedAt}) - ${status}${marker}\n`;
    });

    if (!chain.includes(sessionId)) {
      const startedAt = session.metadata?.started_at || 'Unknown';
      const status = session.metadata?.status || 'unknown';
      viz += `[${chain.length + 1}] ${sessionId} (${startedAt}) - ${status} <-- Current\n`;
    }

    viz += `\nNavigation:\n`;
    if (currentIndex > 0) {
      viz += `- Previous: ${chain[currentIndex - 1]}\n`;
    } else {
      viz += `- Previous: none\n`;
    }

    if (currentIndex < chain.length - 1) {
      viz += `- Next: ${chain[currentIndex + 1]}\n`;
    } else {
      viz += `- Next: none\n`;
    }

    return viz;
  }

  /**
   * Repair broken chain links
   * @param sessionId - Session ID
   * @returns Repair result with warnings
   */
  repairChain(sessionId: string): ChainRepairResult {
    const session = this.sessionManager.loadSession(sessionId);
    if (!session) {
      throw new SessionChainError(`Session not found: ${sessionId}`, []);
    }

    const chain = session.metadata?.session_chain || [];
    const warnings: string[] = [];
    const repairs: Array<{ missing: string; found: string }> = [];

    // Get all available sessions
    const allSessions = this.sessionManager.listSessions();
    const availableIds = new Set(allSessions.map(s => s.session_id));

    // Find missing links
    const missingLinks: string[] = [];
    for (const id of chain) {
      if (!availableIds.has(id)) {
        missingLinks.push(id);
      }
    }

    if (missingLinks.length === 0) {
      return { repaired: false, warnings: ['Chain is intact'] };
    }

    // Attempt to repair by finding closest timestamp match
    for (const missingId of missingLinks) {
      const match = this._findClosestSessionMatch(missingId, allSessions);
      if (match) {
        logger.info('Auto-repaired chain link', { missing: missingId, found: match.session_id });
        repairs.push({ missing: missingId, found: match.session_id });
      } else {
        warnings.push(`Unrecoverable link: ${missingId}`);
      }
    }

    // Update chain with repaired links
    if (repairs.length > 0) {
      const newChain = chain.map(id => {
        const repair = repairs.find(r => r.missing === id);
        return repair ? repair.found : id;
      });

      this.sessionManager.updateSession(sessionId, {
        metadata: { session_chain: newChain }
      });
    }

    return {
      repaired: repairs.length > 0,
      repairs,
      warnings
    };
  }

  /**
   * Add session to chain
   * @param sessionId - Session ID to add to
   * @param linkedSessionId - Session ID to link
   * @param position - Position ('before' or 'after')
   * @returns Success
   */
  addToChain(sessionId: string, linkedSessionId: string, position: 'before' | 'after' = 'after'): boolean {
    const session = this.sessionManager.loadSession(sessionId);
    if (!session) {
      return false;
    }

    const linkedSession = this.sessionManager.loadSession(linkedSessionId);
    if (!linkedSession) {
      return false;
    }

    let chain = session.metadata?.session_chain || [];

    // Ensure current session is in chain
    if (!chain.includes(sessionId)) {
      chain.push(sessionId);
    }

    const currentIndex = chain.indexOf(sessionId);

    if (position === 'after') {
      // Insert after current
      chain.splice(currentIndex + 1, 0, linkedSessionId);
    } else if (position === 'before') {
      // Insert before current
      chain.splice(currentIndex, 0, linkedSessionId);
    }

    // Update both sessions
    this.sessionManager.updateSession(sessionId, {
      metadata: { session_chain: chain }
    });

    // Also update linked session's chain
    const linkedChain = linkedSession.metadata?.session_chain || [];
    if (!linkedChain.includes(sessionId)) {
      linkedChain.push(sessionId);
      this.sessionManager.updateSession(linkedSessionId, {
        metadata: { session_chain: linkedChain }
      });
    }

    logger.info('Session added to chain', { sessionId, linkedSessionId, position });
    return true;
  }

  /**
   * Find closest session match by timestamp
   * @private
   */
  private _findClosestSessionMatch(
    missingId: string,
    allSessions: Array<{ session_id: string; [key: string]: unknown }>
  ): { session_id: string } | null {
    // Extract timestamp from missing ID
    const timestampMatch = missingId.match(/session-(.+)/);
    if (!timestampMatch) {
      return null;
    }

    const missingTimestamp = timestampMatch[1];

    // Find session with closest timestamp
    let closestMatch: { session_id: string } | null = null;
    let minDiff = Infinity;

    for (const session of allSessions) {
      const sessionTimestamp = session.session_id.replace('session-', '');
      const diff = this._compareTimestamps(missingTimestamp, sessionTimestamp);

      if (diff < minDiff) {
        minDiff = diff;
        closestMatch = session;
      }
    }

    // Only return match if within reasonable threshold (1 hour)
    if (minDiff < 3600000 && closestMatch) {
      return closestMatch;
    }

    return null;
  }

  /**
   * Compare timestamps and return difference in ms
   * @private
   */
  private _compareTimestamps(ts1: string, ts2: string): number {
    try {
      const date1 = new Date(ts1.replace(/-/g, ':').replace('T', ' '));
      const date2 = new Date(ts2.replace(/-/g, ':').replace('T', ' '));
      return Math.abs(date1.getTime() - date2.getTime());
    } catch {
      return Infinity;
    }
  }
}
