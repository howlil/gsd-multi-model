#!/usr/bin/env node

/**
 * GSD Retry — Retry utility with exponential backoff
 * 
 * Features:
 * - Configurable max retries, base delay, max delay
 * - Jitter to prevent thundering herd
 * - Error classification (retryable vs non-retryable)
 * 
 * Usage:
 *   const { retry, isRetryableError } = require('./retry.cjs');
 *   const result = await retry(() => fetch(url), { maxRetries: 3 });
 */

const Logger = require('./logger.cjs');
const logger = new Logger();

/**
 * Retry an operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<any>} - Result of operation
 */
async function retry(operation, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    jitter = true,
    shouldRetry = isRetryableError
  } = options;

  let lastError;
  let lastAttempt = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      lastAttempt = attempt;
      return await operation();
    } catch (err) {
      lastError = err;
      
      // Don't retry if error is not retryable or max retries reached
      if (attempt === maxRetries || !shouldRetry(err)) {
        logger.error('Operation failed after retries', { 
          attempts: attempt + 1, 
          error: err.message 
        });
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt),
        maxDelay
      );
      const jitteredDelay = jitter ? delay * (0.5 + Math.random()) : delay;

      logger.warn('Retrying operation', { 
        attempt: attempt + 1, 
        maxRetries, 
        delay: Math.round(jitteredDelay),
        error: err.message 
      });

      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }

  const error = new Error(`Operation failed after ${lastAttempt + 1} attempts: ${lastError.message}`);
  error.cause = lastError;
  throw error;
}

/**
 * Check if error is retryable
 * @param {Error} err - Error to check
 * @returns {boolean} - True if retryable
 */
function isRetryableError(err) {
  const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND'];
  const retryableStatus = [429, 500, 502, 503, 504];

  if (err.code && retryableCodes.includes(err.code)) return true;
  if (err.status && retryableStatus.includes(err.status)) return true;
  if (err.message?.includes('rate limit')) return true;
  if (err.message?.includes('timeout')) return true;
  if (err.message?.includes('network')) return true;

  return false;
}

/**
 * Classify error type
 * @param {Error} err - Error to classify
 * @returns {string} - Error classification
 */
function classifyError(err) {
  if (isRetryableError(err)) {
    return 'retryable';
  }
  
  if (err.code === 'ENOENT' || err.code === 'EPERM') {
    return 'filesystem';
  }
  
  if (err.message?.includes('parse') || err.message?.includes('invalid')) {
    return 'validation';
  }
  
  return 'unknown';
}

module.exports = {
  retry,
  isRetryableError,
  classifyError
};
