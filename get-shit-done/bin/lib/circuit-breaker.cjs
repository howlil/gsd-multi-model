#!/usr/bin/env node

/**
 * GSD Circuit Breaker — Prevent cascading failures
 * 
 * Implements circuit breaker pattern:
 * - CLOSED: Normal operation
 * - OPEN: Failing, reject requests
 * - HALF_OPEN: Testing if service recovered
 * 
 * Usage:
 *   const CircuitBreaker = require('./circuit-breaker.cjs');
 *   const breaker = new CircuitBreaker({ failureThreshold: 5 });
 *   const result = await breaker.execute(() => riskyOperation());
 */

const Logger = require('./logger.cjs');
const logger = new Logger();

class CircuitBreaker {
  /**
   * Create circuit breaker
   * @param {Object} options - Configuration
   */
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
    this.successes = 0;
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
        this.state = 'HALF_OPEN';
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
        this.state = 'CLOSED';
        this.failures = 0;
        logger.info('Circuit breaker CLOSED - service recovered');
      }
      
      this.successes++;
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      // Open circuit if threshold reached
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        logger.error('Circuit breaker OPEN - failure threshold reached', { 
          failures: this.failures 
        });
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
      lastFailureTime: this.lastFailureTime
    };
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    logger.info('Circuit breaker reset');
  }
}

module.exports = CircuitBreaker;
