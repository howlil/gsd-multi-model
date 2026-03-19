#!/usr/bin/env node

/**
 * Observability Engine — Orchestrator for all observability components
 *
 * Initializes and manages metrics collection, structured logging,
 * distributed tracing, and error tracking from a single configuration.
 *
 * Usage:
 *   const ObservabilityEngine = require('./observability-engine.cjs');
 *   const engine = new ObservabilityEngine(config);
 *   await engine.initialize();
 *   // Use engine.metrics, engine.logger, engine.tracing, engine.errorTracker
 *   await engine.shutdown();
 */

'use strict';

const MetricsCollector = require('./metrics-collector.cjs');
const { StructuredLogger } = require('./logger-structured.cjs');
const TracingSDK = require('./tracing-otel.cjs');
const ErrorTracker = require('./error-tracker.cjs');

class ObservabilityEngine {
  /**
   * Create Observability Engine
   * @param {object} config - Configuration object
   * @param {object} config.metrics - Metrics configuration
   * @param {boolean} config.metrics.enabled - Enable metrics collection
   * @param {string} config.metrics.prefix - Metric name prefix (default: 'ez_')
   * @param {number} config.metrics.port - Metrics server port (default: 9091)
   * @param {object} config.logging - Logging configuration
   * @param {boolean} config.logging.enabled - Enable structured logging
   * @param {string} config.logging.level - Log level (default: 'info')
   * @param {string} config.logging.correlationIdHeader - Correlation ID header name
   * @param {object} config.tracing - Tracing configuration
   * @param {boolean} config.tracing.enabled - Enable distributed tracing
   * @param {string} config.tracing.serviceName - Service name (default: 'ez-app')
   * @param {string} config.tracing.serviceVersion - Service version (default: '1.0.0')
   * @param {string} config.tracing.exporter - Exporter type: 'jaeger' or 'zipkin'
   * @param {string} config.tracing.collectorEndpoint - Collector endpoint URL
   * @param {number} config.tracing.sampleRate - Sampling rate 0.0-1.0
   * @param {object} config.errorTracking - Error tracking configuration
   * @param {boolean} config.errorTracking.enabled - Enable error tracking
   * @param {string} config.errorTracking.dsn - Sentry DSN
   * @param {string} config.errorTracking.environment - Environment name
   * @param {string} config.errorTracking.release - Release version
   */
  constructor(config = {}) {
    this.config = {
      metrics: {
        enabled: config.metrics?.enabled ?? true,
        prefix: config.metrics?.prefix || 'ez_',
        port: config.metrics?.port || 9091
      },
      logging: {
        enabled: config.logging?.enabled ?? true,
        level: config.logging?.level || 'info',
        correlationIdHeader: config.logging?.correlationIdHeader || 'x-correlation-id'
      },
      tracing: {
        enabled: config.tracing?.enabled ?? false,
        serviceName: config.tracing?.serviceName || 'ez-app',
        serviceVersion: config.tracing?.serviceVersion || '1.0.0',
        exporter: config.tracing?.exporter || 'jaeger',
        collectorEndpoint: config.tracing?.collectorEndpoint || 'http://jaeger:14268/api/traces',
        sampleRate: config.tracing?.sampleRate ?? 1.0
      },
      errorTracking: {
        enabled: config.errorTracking?.enabled ?? false,
        dsn: config.errorTracking?.dsn || '',
        environment: config.errorTracking?.environment || 'production',
        release: config.errorTracking?.release || '1.0.0'
      }
    };

    // Component instances
    this.metrics = null;
    this.logger = null;
    this.tracing = null;
    this.errorTracker = null;

    // Component status
    this.status = {
      metrics: { initialized: false, error: null },
      logging: { initialized: false, error: null },
      tracing: { initialized: false, error: null },
      errorTracking: { initialized: false, error: null }
    };
  }

  /**
   * Initialize all observability components
   * @returns {Promise<void>}
   */
  async initialize() {
    const enabledComponents = [];

    // Initialize Metrics Collector
    if (this.config.metrics.enabled) {
      try {
        this.metrics = new MetricsCollector({
          prefix: this.config.metrics.prefix
        });
        this.status.metrics.initialized = true;
        enabledComponents.push('metrics');
        console.log('[ObservabilityEngine] Metrics collector initialized');
      } catch (error) {
        this.status.metrics.error = error.message;
        console.error('[ObservabilityEngine] Failed to initialize metrics:', error.message);
      }
    }

    // Initialize Structured Logger
    if (this.config.logging.enabled) {
      try {
        this.logger = new StructuredLogger({
          level: this.config.logging.level,
          correlationIdHeader: this.config.logging.correlationIdHeader
        });
        this.status.logging.initialized = true;
        enabledComponents.push('logging');
        console.log('[ObservabilityEngine] Structured logger initialized');
      } catch (error) {
        this.status.logging.error = error.message;
        console.error('[ObservabilityEngine] Failed to initialize logger:', error.message);
      }
    }

    // Initialize Distributed Tracing
    if (this.config.tracing.enabled) {
      try {
        this.tracing = new TracingSDK({
          serviceName: this.config.tracing.serviceName,
          serviceVersion: this.config.tracing.serviceVersion,
          exporter: this.config.tracing.exporter,
          collectorEndpoint: this.config.tracing.collectorEndpoint,
          sampleRate: this.config.tracing.sampleRate
        });
        await this.tracing.start();
        this.status.tracing.initialized = true;
        enabledComponents.push('tracing');
        console.log('[ObservabilityEngine] Distributed tracing initialized');
      } catch (error) {
        this.status.tracing.error = error.message;
        console.error('[ObservabilityEngine] Failed to initialize tracing:', error.message);
      }
    }

    // Initialize Error Tracker
    if (this.config.errorTracking.enabled && this.config.errorTracking.dsn) {
      try {
        this.errorTracker = new ErrorTracker({
          dsn: this.config.errorTracking.dsn,
          environment: this.config.errorTracking.environment,
          release: this.config.errorTracking.release
        });
        this.status.errorTracking.initialized = this.errorTracker.isEnabled;
        if (this.errorTracker.isEnabled) {
          enabledComponents.push('errorTracking');
          console.log('[ObservabilityEngine] Error tracker initialized');
        }
      } catch (error) {
        this.status.errorTracking.error = error.message;
        console.error('[ObservabilityEngine] Failed to initialize error tracker:', error.message);
      }
    }

    console.log(`[ObservabilityEngine] Initialized with components: ${enabledComponents.join(', ') || 'none'}`);
  }

  /**
   * Get health status of all components
   * @returns {object} Health status object
   */
  getHealth() {
    const allEnabledInitialized = 
      (!this.config.metrics.enabled || this.status.metrics.initialized) &&
      (!this.config.logging.enabled || this.status.logging.initialized) &&
      (!this.config.tracing.enabled || this.status.tracing.initialized) &&
      (!this.config.errorTracking.enabled || this.status.errorTracking.initialized);

    const hasErrors = 
      this.status.metrics.error ||
      this.status.logging.error ||
      this.status.tracing.error ||
      this.status.errorTracking.error;

    return {
      status: allEnabledInitialized && !hasErrors ? 'healthy' : 'degraded',
      components: {
        metrics: {
          enabled: this.config.metrics.enabled,
          initialized: this.status.metrics.initialized,
          error: this.status.metrics.error
        },
        logging: {
          enabled: this.config.logging.enabled,
          initialized: this.status.logging.initialized,
          error: this.status.logging.error
        },
        tracing: {
          enabled: this.config.tracing.enabled,
          initialized: this.status.tracing.initialized,
          error: this.status.tracing.error
        },
        errorTracking: {
          enabled: this.config.errorTracking.enabled,
          initialized: this.status.errorTracking.initialized,
          error: this.status.errorTracking.error
        }
      }
    };
  }

  /**
   * Get Express middleware for all components
   * @returns {array} Array of middleware functions
   */
  getMiddleware() {
    const middleware = [];

    if (this.status.metrics.initialized && this.metrics) {
      middleware.push(this.metrics.middleware());
    }

    if (this.status.logging.initialized && this.logger) {
      middleware.push(this.logger.middleware());
    }

    if (this.status.errorTracking.initialized && this.errorTracker) {
      middleware.push(this.errorTracker.middleware());
      middleware.push(this.errorTracker.tracingHandler());
    }

    return middleware;
  }

  /**
   * Get metrics handler for /metrics endpoint
   * @returns {function|null} Express handler or null if not initialized
   */
  getMetricsHandler() {
    if (this.status.metrics.initialized && this.metrics) {
      return this.metrics.metricsHandler.bind(this.metrics);
    }
    return null;
  }

  /**
   * Get error handler middleware
   * @returns {function|null} Error handler or null if not initialized
   */
  getErrorHandler() {
    if (this.status.errorTracking.initialized && this.errorTracker) {
      return this.errorTracker.errorHandler.bind(this.errorTracker);
    }
    return null;
  }

  /**
   * Shutdown all observability components
   * @returns {Promise<void>}
   */
  async shutdown() {
    console.log('[ObservabilityEngine] Shutting down...');

    // Shutdown tracing
    if (this.tracing && this.status.tracing.initialized) {
      try {
        await this.tracing.shutdown();
        console.log('[ObservabilityEngine] Tracing shut down complete');
      } catch (error) {
        console.error('[ObservabilityEngine] Error shutting down tracing:', error.message);
      }
    }

    // Close error tracker
    if (this.errorTracker && this.status.errorTracking.initialized) {
      try {
        await this.errorTracker.close();
        console.log('[ObservabilityEngine] Error tracker shut down complete');
      } catch (error) {
        console.error('[ObservabilityEngine] Error shutting down error tracker:', error.message);
      }
    }

    // Reset status
    this.status.metrics.initialized = false;
    this.status.logging.initialized = false;
    this.status.tracing.initialized = false;
    this.status.errorTracking.initialized = false;

    console.log('[ObservabilityEngine] Shut down complete');
  }

  /**
   * Get configuration
   * @returns {object} Configuration object
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Check if engine is fully initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.status.metrics.initialized ||
           this.status.logging.initialized ||
           this.status.tracing.initialized ||
           this.status.errorTracking.initialized;
  }
}

module.exports = ObservabilityEngine;
