/**
 * Session Manager — Manages agent session state and continuity
 */

import * as fs from 'fs';
import * as path from 'path';
import { defaultLogger as logger } from './logger.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface SessionState {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  phase?: string;
  plan?: string;
  stoppedAt?: string;
  context?: Record<string, any>;
}

export interface SessionExport {
  state: SessionState;
  history: SessionHistoryEntry[];
}

export interface SessionHistoryEntry {
  timestamp: number;
  action: string;
  details?: Record<string, any>;
}

// ─── SessionManager Class ───────────────────────────────────────────────────

export class SessionManager {
  private statePath: string;
  private currentState: SessionState | null;

  constructor(planningDir: string) {
    this.statePath = path.join(planningDir, 'SESSION.json');
    this.currentState = null;
  }

  /**
   * Load session state from file
   */
  loadState(): SessionState | null {
    try {
      if (fs.existsSync(this.statePath)) {
        const content = fs.readFileSync(this.statePath, 'utf-8');
        this.currentState = JSON.parse(content);
        return this.currentState;
      }
    } catch (err) {
      logger.warn('Failed to load session state', {
        error: err instanceof Error ? err.message : 'Unknown'
      });
    }
    return null;
  }

  /**
   * Save session state to file
   */
  saveState(state: SessionState): void {
    try {
      fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2), 'utf-8');
      this.currentState = state;
    } catch (err) {
      logger.error('Failed to save session state', {
        error: err instanceof Error ? err.message : 'Unknown'
      });
    }
  }

  /**
   * Create a new session
   */
  createSession(sessionId: string): SessionState {
    const now = Date.now();
    const state: SessionState = {
      sessionId,
      startTime: now,
      lastActivity: now,
      context: {}
    };
    this.saveState(state);
    return state;
  }

  /**
   * Update session activity timestamp
   */
  updateActivity(): void {
    if (this.currentState) {
      this.currentState.lastActivity = Date.now();
      this.saveState(this.currentState);
    }
  }

  /**
   * Set session phase and plan
   */
  setPhase(phase: string, plan?: string): void {
    if (this.currentState) {
      this.currentState.phase = phase;
      if (plan) this.currentState.plan = plan;
      this.updateActivity();
    }
  }

  /**
   * Set stopped-at point for resume
   */
  setStoppedAt(stoppedAt: string): void {
    if (this.currentState) {
      this.currentState.stoppedAt = stoppedAt;
      this.updateActivity();
    }
  }

  /**
   * Export session for backup
   */
  exportSession(): SessionExport {
    return {
      state: this.currentState || this.createSession('unknown'),
      history: []
    };
  }

  /**
   * Clear session state
   */
  clearSession(): void {
    try {
      if (fs.existsSync(this.statePath)) {
        fs.unlinkSync(this.statePath);
      }
      this.currentState = null;
    } catch (err) {
      logger.warn('Failed to clear session', {
        error: err instanceof Error ? err.message : 'Unknown'
      });
    }
  }
}

// Default export for backward compatibility
export default SessionManager;
