#!/usr/bin/env node

/**
 * Error Tracker — Error tracking with Sentry
 *
 * Provides Sentry SDK integration with error classification,
 * user context, and breadcrumbs support.
 *
 * Requirements: OBSERVE-09
 *
 * Usage:
 *   const ErrorTracker = require('./error-tracker.cjs');
 *   const tracker = new ErrorTracker({ dsn: 'https://...', environment: 'production' });
 *   app.use(tracker.middleware());
 *   tracker.captureException(error, { userId: '123' });
 */

'use strict';

const Sentry = require('@sentry/node');

class ErrorTracker {
  /**
   * Create Error Tracker
   * @param {object} options - Configuration options
   * @param {string} options.dsn - Sentry DSN (required for error tracking)
   * @param {string} options.environment - Environment name (default: 'production')
   * @param {string} options.release - Release version (default: '1.0.0')
   * @param {number} options.tracesSampleRate - Tracing sample rate 0.0-1.0 (default: 0.1)
   * @param {number} options.profilesSampleRate - Profiling sample rate 0.0-1.0 (default: 0.1)
   * @param {object} options.expressApp - Express app for integration (optional)
   */
  constructor(options = {}) {
    const {
      dsn,
      environment = 'production',
      release = '1.0.0',
      tracesSampleRate = 0.1,
      profilesSampleRate = 0.1,
      expressApp = null
    } = options;

    this.dsn = dsn;
    this.environment = environment;
    this.release = release;
    this.isEnabled = false;

    // Check if DSN is provided
    if (!dsn) {
      console.warn('Sentry DSN not provided - error tracking disabled');
      return;
    }

    // Try to import profiling integration
    let profilingIntegration;
    try {
      const { nodeProfilingIntegration } = require('@sentry/profiling-node');
      profilingIntegration = nodeProfilingIntegration();
    } catch (err) {
      console.warn('@sentry/profiling-node not available - profiling disabled');
      profilingIntegration = null;
    }

    // Build integrations array
    const integrations = [
      new Sentry.Integrations.Http({ tracing: true }),
    ];

    if (expressApp) {
      integrations.push(new Sentry.Integrations.Express({ app: expressApp }));
    }

    if (profilingIntegration) {
      integrations.push(profilingIntegration);
    }

    // Initialize Sentry
    Sentry.init({
      dsn,
      environment,
      release,
      integrations,
      tracesSampleRate,
      profilesSampleRate,
      beforeSend: (event, hint) => {
        // Filter out sensitive data
        if (event.request) {
          delete event.request.cookies;
          if (event.request.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
            delete event.request.headers['set-cookie'];
          }
        }
        return event;
      },
      beforeSendTransaction: (event) => {
        // Filter sensitive data from transactions
        if (event.request) {
          delete event.request.cookies;
          if (event.request.headers) {
            delete event.request.headers.authorization;
          }
        }
        return event;
      },
    });

    this.isEnabled = true;
    console.log(`Sentry error tracking enabled for environment: ${environment}`);
  }

  /**
   * Express middleware for request handling
   * @returns {function} Sentry request handler
   */
  middleware() {
    if (!this.isEnabled) {
      return (req, res, next) => next();
    }
    return Sentry.Handlers.requestHandler();
  }

  /**
   * Express error handler middleware
   * @returns {function} Sentry error handler
   */
  errorHandler() {
    if (!this.isEnabled) {
      return (err, req, res, next) => next(err);
    }
    return Sentry.Handlers.errorHandler();
  }

  /**
   * Express tracing handler middleware
   * @returns {function} Sentry tracing handler
   */
  tracingHandler() {
    if (!this.isEnabled) {
      return (req, res, next) => next();
    }
    return Sentry.Handlers.tracingHandler();
  }

  /**
   * Capture an exception
   * @param {Error} error - Error to capture
   * @param {object} context - Additional context
   */
  captureException(error, context = {}) {
    if (!this.isEnabled) {
      console.error('ErrorTracker not enabled:', error);
      return;
    }

    Sentry.withScope((scope) => {
      // Set additional context
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  }

  /**
   * Capture a message
   * @param {string} message - Message to capture
   * @param {string} level - Log level (default: 'info')
   * @param {object} context - Additional context
   */
  captureMessage(message, level = 'info', context = {}) {
    if (!this.isEnabled) {
      console.log('ErrorTracker message:', message);
      return;
    }

    Sentry.withScope((scope) => {
      // Set log level
      switch (level.toLowerCase()) {
        case 'fatal':
          scope.setLevel(Sentry.Severity.Fatal);
          break;
        case 'error':
          scope.setLevel(Sentry.Severity.Error);
          break;
        case 'warning':
        case 'warn':
          scope.setLevel(Sentry.Severity.Warning);
          break;
        case 'info':
          scope.setLevel(Sentry.Severity.Info);
          break;
        case 'debug':
          scope.setLevel(Sentry.Severity.Debug);
          break;
        default:
          scope.setLevel(Sentry.Severity.Info);
      }

      // Set additional context
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });

      Sentry.captureMessage(message);
    });
  }

  /**
   * Set user context for error tracking
   * @param {object} user - User information
   * @param {string} user.id - User ID
   * @param {string} user.username - Username
   * @param {string} user.email - User email
   */
  setUserContext(user) {
    if (!this.isEnabled) {
      return;
    }

    Sentry.setUser({
      id: user.id,
      username: user.username,
      email: user.email,
    });
  }

  /**
   * Clear user context
   */
  clearUserContext() {
    if (!this.isEnabled) {
      return;
    }

    Sentry.setUser(null);
  }

  /**
   * Add a breadcrumb for debugging context
   * @param {string} message - Breadcrumb message
   * @param {string} category - Category (e.g., 'auth', 'navigation', 'error')
   * @param {object} data - Additional data
   * @param {string} level - Log level (default: 'info')
   */
  addBreadcrumb(message, category = 'default', data = {}, level = 'info') {
    if (!this.isEnabled) {
      return;
    }

    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Clear all breadcrumbs
   */
  clearBreadcrumbs() {
    if (!this.isEnabled) {
      return;
    }

    Sentry.configureScope((scope) => {
      scope.clearBreadcrumbs();
    });
  }

  /**
   * Set tags for subsequent events
   * @param {object} tags - Key-value pairs of tags
   */
  setTags(tags) {
    if (!this.isEnabled) {
      return;
    }

    Sentry.setTags(tags);
  }

  /**
   * Set a single tag
   * @param {string} key - Tag key
   * @param {string} value - Tag value
   */
  setTag(key, value) {
    if (!this.isEnabled) {
      return;
    }

    Sentry.setTag(key, value);
  }

  /**
   * Set additional context
   * @param {string} key - Context key
   * @param {object} value - Context value
   */
  setContext(key, value) {
    if (!this.isEnabled) {
      return;
    }

    Sentry.setContext(key, value);
  }

  /**
   * Start a new session for release health
   */
  startSession() {
    if (!this.isEnabled) {
      return;
    }

    Sentry.startSession();
  }

  /**
   * End the current session
   */
  endSession() {
    if (!this.isEnabled) {
      return;
    }

    Sentry.endSession();
  }

  /**
   * Flush pending events to Sentry
   * @param {number} timeout - Timeout in ms (default: 2000)
   * @returns {Promise<boolean>} Success status
   */
  async flush(timeout = 2000) {
    if (!this.isEnabled) {
      return true;
    }

    try {
      await Sentry.flush(timeout);
      return true;
    } catch (error) {
      console.error('Failed to flush Sentry events:', error.message);
      return false;
    }
  }

  /**
   * Close Sentry and cleanup
   * @param {number} timeout - Timeout in ms (default: 2000)
   * @returns {Promise<boolean>} Success status
   */
  async close(timeout = 2000) {
    if (!this.isEnabled) {
      return true;
    }

    try {
      await Sentry.close(timeout);
      this.isEnabled = false;
      return true;
    } catch (error) {
      console.error('Failed to close Sentry:', error.message);
      return false;
    }
  }

  /**
   * Check if error tracking is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.isEnabled;
  }

  /**
   * Classify an error as retryable or non-retryable
   * @param {Error} error - Error to classify
   * @returns {object} Classification result
   */
  classifyError(error) {
    const retryableErrors = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'ENOTFOUND',
      'Network Error',
      'Timeout',
      'RateLimit',
      'Too Many Requests',
    ];

    const nonRetryableErrors = [
      'ValidationError',
      'Unauthorized',
      'Forbidden',
      'NotFound',
      'BadRequest',
    ];

    const errorCode = error.code || error.status || error.statusCode;
    const errorMessage = error.message || '';

    // Check for retryable errors
    if (retryableErrors.some(e => errorMessage.includes(e) || errorCode === e)) {
      return {
        retryable: true,
        reason: 'Network or transient error',
        suggestedDelay: 1000
      };
    }

    // Check for non-retryable errors
    if (nonRetryableErrors.some(e => errorMessage.includes(e) || errorCode === e)) {
      return {
        retryable: false,
        reason: 'Client or validation error'
      };
    }

    // Default: unknown - may be retryable
    return {
      retryable: true,
      reason: 'Unknown error type - assuming retryable'
    };
  }
}

module.exports = ErrorTracker;
