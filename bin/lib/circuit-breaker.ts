#!/usr/bin/env node

/**
 * EZ Circuit Breaker — Prevent cascading failures
 *
 * Implements circuit breaker pattern:
 * - CLOSED: Normal operation
 * - OPEN: Failing, reject requests
 * - HALF_OPEN: Testing if service recovered
 *
 * Persists state to .planning/circuit-breaker.json for recovery across restarts
 *
 * Usage:
 *   import { CircuitBreaker } from './circuit-breaker.js';
 *   const breaker = new CircuitBreaker({ failureThreshold: 5, cwd });
 *   const result = await breaker.execute(() => riskyOperation());
 */

import fs from 'fs';
import path from 'path';
import { withLock } from './file-lock.js';
import { Logger } from './logger.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  persistState?: boolean;
  cwd?: string;
  agentType?: string;
}

export interface AgentState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastStateChange: string;
}

export interface CircuitBreakerState {
  [agentType: string]: AgentState;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  failureThreshold: number;
  resetTimeout: number;
  lastFailureTime: number | null;
  lastStateChange: string;
  agentType: string;
}

// ─── CircuitBreaker Class ────────────────────────────────────────────────────

export class CircuitBreaker {
  private failureThreshold: number;
  private resetTimeout: number;
  private persistState: boolean;
  private cwd: string;
  private agentType: string;
  private state: CircuitState;
  private failures: number;
  private lastFailureTime: number | null;
  private successes: number;
  private lastStateChange: string;
  private logger: Logger;

  /**
   * Create circuit breaker
   * @param options - Configuration
   * @param options.failureThreshold - Number of failures before opening circuit (default: 5)
   * @param options.resetTimeout - Time in ms before trying to recover (default: 60000)
   * @param options.persistState - Whether to persist state to disk (default: true)
   * @param options.cwd - Working directory (defaults to process.cwd())
   * @param options.agentType - Agent type identifier for per-agent state
   */
  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.persistState = options.persistState !== false;
    this.cwd = options.cwd || process.cwd();
    this.agentType = options.agentType || 'default';
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
    this.successes = 0;
    this.lastStateChange = new Date().toISOString();
    this.logger = new Logger();

    // Load persisted state if available
    if (this.persistState) {
      this.loadState();
    }
  }

  /**
   * Get state file path
   * @returns Path to circuit-breaker.json
   */
  getStateFile(): string {
    return path.join(this.cwd, '.planning', 'circuit-breaker.json');
  }

  /**
   * Load state from disk
   */
  loadState(): void {
    const stateFile = this.getStateFile();
    if (!fs.existsSync(stateFile)) {
      return;
    }

    try {
      const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      const agentState = data[this.agentType];

      if (agentState) {
        this.state = agentState.state || 'CLOSED';
        this.failures = agentState.failures || 0;
        this.successes = agentState.successes || 0;
        this.lastFailureTime = agentState.lastFailureTime || null;
        this.lastStateChange = agentState.lastStateChange || new Date().toISOString();
      }
    } catch (err) {
      const error = err as Error;
      this.logger.warn('circuit-breaker: failed to load state', { error: error.message });
    }
  }

  /**
   * Save state to disk
   */
  async saveState(): Promise<void> {
    if (!this.persistState) {
      return;
    }

    const stateFile = this.getStateFile();
    const planningDir = path.join(this.cwd, '.planning');

    // Ensure .planning directory exists
    if (!fs.existsSync(planningDir)) {
      fs.mkdirSync(planningDir, { recursive: true });
    }

    await withLock(stateFile, async () => {
      let data: CircuitBreakerState = {};
      if (fs.existsSync(stateFile)) {
        try {
          data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        } catch {
          data = {};
        }
      }

      data[this.agentType] = {
        state: this.state,
        failures: this.failures,
        successes: this.successes,
        failureThreshold: this.failureThreshold,
        resetTimeout: this.resetTimeout,
        lastFailureTime: this.lastFailureTime,
        lastStateChange: this.lastStateChange
      };

      fs.writeFileSync(stateFile, JSON.stringify(data, null, 2), 'utf8');
    });
  }

  /**
   * Log state transition to metrics
   * @param fromState - Previous state
   * @param toState - New state
   */
  private logStateTransition(fromState: CircuitState, toState: CircuitState): void {
    const metricsPath = path.join(this.cwd, '.planning', 'metrics.json');
    const event = {
      event: 'circuit_breaker_state_change',
      timestamp: new Date().toISOString(),
      agentType: this.agentType,
      fromState,
      toState
    };

    try {
      let metrics: { events: any[] } = { events: [] };
      if (fs.existsSync(metricsPath)) {
        try {
          metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
          if (!Array.isArray(metrics.events)) metrics.events = [];
        } catch {
          metrics = { events: [] };
        }
      }

      metrics.events.push(event);
      fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2), 'utf8');
    } catch (err) {
      const error = err as Error;
      this.logger.error('circuit-breaker: failed to log state transition', { error: error.message });
    }
  }

  /**
   * Change state and persist
   * @param newState - New state
   */
  private async changeState(newState: CircuitState): Promise<void> {
    if (this.state === newState) {
      return;
    }

    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = new Date().toISOString();

    this.logStateTransition(oldState, newState);
    await this.saveState();
  }

  /**
   * Execute operation with circuit breaker protection
   * @param operation - Async function to execute
   * @returns Result of operation
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is OPEN
    if (this.state === 'OPEN') {
      const timeSinceFailure = this.lastFailureTime ? Date.now() - this.lastFailureTime : 0;

      if (timeSinceFailure > this.resetTimeout) {
        // Try to recover
        await this.changeState('HALF_OPEN');
        this.failures = 0;
        this.logger.info('Circuit breaker HALF_OPEN - testing recovery');
      } else {
        const waitTime = Math.round((this.resetTimeout - timeSinceFailure) / 1000);
        this.logger.warn('Circuit breaker OPEN - rejecting request', { waitTime });
        throw new Error(`Circuit breaker is OPEN. Try again in ${waitTime}s`);
      }
    }

    try {
      const result = await operation();

      // Success - reset counters if in HALF_OPEN
      if (this.state === 'HALF_OPEN') {
        await this.changeState('CLOSED');
        this.failures = 0;
        this.logger.info('Circuit breaker CLOSED - service recovered');
      }

      this.successes++;
      await this.saveState();
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailureTime = Date.now();

      // Open circuit if threshold reached
      if (this.failures >= this.failureThreshold) {
        await this.changeState('OPEN');
        this.logger.error('Circuit breaker OPEN - failure threshold reached', {
          failures: this.failures
        });
      } else {
        await this.saveState();
      }

      throw err;
    }
  }

  /**
   * Get current state
   * @returns CLOSED, OPEN, or HALF_OPEN
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get stats
   * @returns Statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      failureThreshold: this.failureThreshold,
      resetTimeout: this.resetTimeout,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
      agentType: this.agentType
    };
  }

  /**
   * Reset circuit breaker
   */
  async reset(): Promise<void> {
    const oldState = this.state;
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.lastStateChange = new Date().toISOString();

    this.logStateTransition(oldState, 'CLOSED');
    await this.saveState();
    this.logger.info('Circuit breaker reset');
  }
}
