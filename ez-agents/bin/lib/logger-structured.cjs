#!/usr/bin/env node

/**
 * Structured Logger — High-performance JSON logging with Pino
 *
 * Provides structured logging with automatic correlation ID generation
 * and Express middleware for request/response auto-logging.
 *
 * Requirements: OBSERVE-04, OBSERVE-05
 *
 * Usage:
 *   const { StructuredLogger, createPinoHttpMiddleware } = require('./logger-structured.cjs');
 *   const logger = new StructuredLogger({ level: 'info' });
 *   app.use(logger.middleware());
 */

'use strict';

const pino = require('pino');
const crypto = require('crypto');

/**
 * Generate a correlation ID
 * @returns {string} UUID-like correlation ID
 */
function generateCorrelationId() {
  return crypto.randomUUID();
}

class StructuredLogger {
  /**
   * Create Structured Logger
   * @param {object} options - Configuration options
   * @param {string} options.level - Log level (default: 'info')
   * @param {string} options.correlationIdHeader - Header name for correlation ID (default: 'x-correlation-id')
   */
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.correlationIdHeader = options.correlationIdHeader || 'x-correlation-id';

    this.logger = pino({
      level: this.level,
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    });
  }

  /**
   * Express middleware for correlation IDs and request logging
   * Generates correlation ID if not present, logs request/response
   * @returns {function} Express middleware function
   */
  middleware() {
    const self = this;
    return (req, res, next) => {
      // Get or generate correlation ID
      const correlationId = req.headers[self.correlationIdHeader.toLowerCase()] || generateCorrelationId();

      // Add to response headers
      res.setHeader(self.correlationIdHeader, correlationId);

      // Create request-specific logger with correlation ID
      req.logger = self.logger.child({
        correlationId,
        method: req.method,
        path: req.path,
        ip: req.ip || req.connection?.remoteAddress || 'unknown'
      });

      // Log request received
      req.logger.info('Request received');

      // Track response
      const start = Date.now();
      res.on('finish', () => {
        req.logger.info('Response sent', {
          statusCode: res.statusCode,
          durationMs: Date.now() - start
        });
      });

      next();
    };
  }

  /**
   * Create a child logger with additional context
   * @param {object} bindings - Additional context to attach to logs
   * @returns {object} Child logger instance
   */
  child(bindings) {
    return this.logger.child(bindings);
  }

  /**
   * Log error level message
   * @param {string} msg - Log message
   * @param {object} context - Additional context
   */
  error(msg, context = {}) {
    this.logger.error(context, msg);
  }

  /**
   * Log warn level message
   * @param {string} msg - Log message
   * @param {object} context - Additional context
   */
  warn(msg, context = {}) {
    this.logger.warn(context, msg);
  }

  /**
   * Log info level message
   * @param {string} msg - Log message
   * @param {object} context - Additional context
   */
  info(msg, context = {}) {
    this.logger.info(context, msg);
  }

  /**
   * Log debug level message
   * @param {string} msg - Log message
   * @param {object} context - Additional context
   */
  debug(msg, context = {}) {
    this.logger.debug(context, msg);
  }

  /**
   * Log trace level message
   * @param {string} msg - Log message
   * @param {object} context - Additional context
   */
  trace(msg, context = {}) {
    this.logger.trace(context, msg);
  }

  /**
   * Log fatal level message
   * @param {string} msg - Log message
   * @param {object} context - Additional context
   */
  fatal(msg, context = {}) {
    this.logger.fatal(context, msg);
  }

  /**
   * Get the underlying pino logger instance
   * @returns {object} Pino logger instance
   */
  getLogger() {
    return this.logger;
  }

  /**
   * Set log level dynamically
   * @param {string} level - New log level
   */
  setLevel(level) {
    this.logger.level = level;
  }

  /**
   * Get current log level
   * @returns {string} Current log level
   */
  getLevel() {
    return this.logger.level;
  }
}

/**
 * Create Pino HTTP middleware using pino-http package
 * This is an alternative to StructuredLogger.middleware()
 * @param {object} options - Pino HTTP options
 * @param {string} options.level - Log level (default: 'info')
 * @returns {function} Pino HTTP middleware function
 */
function createPinoHttpMiddleware(options = {}) {
  try {
    const pinoHttp = require('pino-http');
    return pinoHttp({
      logger: pino({
        level: options.level || 'info',
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
      customProps: (req, res) => ({
        correlationId: req.headers['x-correlation-id'] || 'unknown',
      }),
      autoLogging: true,
    });
  } catch (err) {
    // Fallback to built-in middleware if pino-http not available
    console.warn('pino-http not available, using fallback middleware');
    const logger = new StructuredLogger({ level: options.level });
    return logger.middleware();
  }
}

module.exports = { StructuredLogger, createPinoHttpMiddleware, generateCorrelationId };
