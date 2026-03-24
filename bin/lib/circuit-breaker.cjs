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
 *   const CircuitBreaker = require('./circuit-breaker.cjs');
 *   const breaker = new CircuitBreaker({ failureThreshold: 5, cwd });
 *   const result = await breaker.execute(() => riskyOperation());
 */

const fs = require('fs');
const path = require('path');
const { withLock } = require('./file-lock.cjs');
const Logger = require('./logger.cjs');
const logger = new Logger();

class CircuitBreaker {
  /**
   * Create circuit breaker
   * @param {Object} options - Configuration
   * @param {number} [options.failureThreshold=5] - Number of failures before opening circuit
   * @param {number} [options.resetTimeout=60000] - Time in ms before trying to recover
   * @param {boolean} [options.persistState=true] - Whether to persist state to disk
   * @param {string} [options.cwd] - Working directory (defaults to process.cwd())
   * @param {string} [options.agentType] - Agent type identifier for per-agent state
   */
  constructor(options = {}) {
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

    // Load persisted state if available
    if (this.persistState) {
      this.loadState();
    }
  }

  /**
   * Get state file path
   * @returns {string} - Path to circuit-breaker.json
   */
  getStateFile() {
    return path.join(this.cwd, '.planning', 'circuit-breaker.json');
  }

  /**
   * Load state from disk
   * @returns {void}
   */
  loadState() {
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
      logger.warn('circuit-breaker: failed to load state', { error: err.message });
    }
  }

  /**
   * Save state to disk
   * @returns {Promise<void>}
   */
  async saveState() {
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
      let data = {};
      if (fs.existsSync(stateFile)) {
        try {
          data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        } catch (e) {
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
   * @param {string} fromState - Previous state
   * @param {string} toState - New state
   * @private
   */
  _logStateTransition(fromState, toState) {
    const metricsPath = path.join(this.cwd, '.planning', 'metrics.json');
    const event = {
      event: 'circuit_breaker_state_change',
      timestamp: new Date().toISOString(),
      agentType: this.agentType,
      fromState,
      toState
    };

    try {
      let metrics = { events: [] };
      if (fs.existsSync(metricsPath)) {
        try {
          metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
          if (!Array.isArray(metrics.events)) metrics.events = [];
        } catch (e) {
          metrics = { events: [] };
        }
      }

      metrics.events.push(event);
      fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2), 'utf8');
    } catch (err) {
      logger.error('circuit-breaker: failed to log state transition', { error: err.message });
    }
  }

  /**
   * Change state and persist
   * @param {string} newState - New state
   * @private
   */
  async _changeState(newState) {
    if (this.state === newState) {
      return;
    }

    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = new Date().toISOString();

    this._logStateTransition(oldState, newState);
    await this.saveState();
  }

  /**
   * Execute operation with circuit breaker protection
   * @param {Function} operation - Async function to execute
   * @returns {Promise<any>} - Result of operation
   */
  async execute(operation) {
    // Check if circuit is OPEN
    if (this.state === 'OPEN') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;

      if (timeSinceFailure > this.resetTimeout) {
        // Try to recover
        await this._changeState('HALF_OPEN');
        this.failures = 0;
        logger.info('Circuit breaker HALF_OPEN - testing recovery');
      } else {
        const waitTime = Math.round((this.resetTimeout - timeSinceFailure) / 1000);
        logger.warn('Circuit breaker OPEN - rejecting request', { waitTime });
        throw new Error(`Circuit breaker is OPEN. Try again in ${waitTime}s`);
      }
    }

    try {
      const result = await operation();

      // Success - reset counters if in HALF_OPEN
      if (this.state === 'HALF_OPEN') {
        await this._changeState('CLOSED');
        this.failures = 0;
        logger.info('Circuit breaker CLOSED - service recovered');
      }

      this.successes++;
      await this.saveState();
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailureTime = Date.now();

      // Open circuit if threshold reached
      if (this.failures >= this.failureThreshold) {
        await this._changeState('OPEN');
        logger.error('Circuit breaker OPEN - failure threshold reached', {
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
   * @returns {string} - CLOSED, OPEN, or HALF_OPEN
   */
  getState() {
    return this.state;
  }

  /**
   * Get stats
   * @returns {Object} - Statistics
   */
  getStats() {
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
   * @returns {Promise<void>}
   */
  async reset() {
    const oldState = this.state;
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.lastStateChange = new Date().toISOString();

    this._logStateTransition(oldState, 'CLOSED');
    await this.saveState();
    logger.info('Circuit breaker reset');
  }
}

module.exports = CircuitBreaker;
