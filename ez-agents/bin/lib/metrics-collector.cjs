#!/usr/bin/env node

/**
 * Metrics Collector — Prometheus metrics collection with prom-client
 *
 * Provides Counter, Gauge, Histogram metric types with Express middleware
 * for automatic HTTP metrics injection. Returns valid Prometheus format.
 *
 * Requirements: OBSERVE-01, OBSERVE-02
 *
 * Usage:
 *   const MetricsCollector = require('./metrics-collector.cjs');
 *   const metrics = new MetricsCollector({ prefix: 'ez_' });
 *   app.use(metrics.middleware());
 *   app.get('/metrics', metrics.metricsHandler);
 */

'use strict';

const client = require('prom-client');

class MetricsCollector {
  /**
   * Create Metrics Collector
   * @param {object} options - Configuration options
   * @param {string} options.prefix - Metric name prefix (default: 'ez_')
   * @param {string} options.contentType - Response content type (default: from prom-client)
   */
  constructor(options = {}) {
    this.register = new client.Registry();
    this.prefix = options.prefix || 'ez_';
    this.contentType = options.contentType || this.register.contentType;

    // Enable default metrics (CPU, memory, event loop, GC)
    client.collectDefaultMetrics({
      register: this.register,
      prefix: this.prefix
    });

    // Custom metrics
    this.initCustomMetrics();
  }

  /**
   * Initialize custom metrics
   * Creates Counter, Histogram, Gauge, and business metrics
   */
  initCustomMetrics() {
    // Counter - cumulative events (only increases)
    this.httpRequestsTotal = new client.Counter({
      name: `${this.prefix}http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register]
    });

    // Histogram - request duration distribution
    this.httpRequestDuration = new client.Histogram({
      name: `${this.prefix}http_request_duration_seconds`,
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.register]
    });

    // Gauge - point-in-time values
    this.activeConnections = new client.Gauge({
      name: `${this.prefix}active_connections`,
      help: 'Number of active connections',
      labelNames: ['type'],
      registers: [this.register]
    });

    // Business metric: orders total
    this.ordersTotal = new client.Counter({
      name: `${this.prefix}orders_total`,
      help: 'Total number of orders placed',
      labelNames: ['type', 'payment_method', 'region'],
      registers: [this.register]
    });

    // Business metric: users total
    this.usersTotal = new client.Counter({
      name: `${this.prefix}users_total`,
      help: 'Total number of users registered',
      labelNames: ['source', 'plan'],
      registers: [this.register]
    });
  }

  /**
   * Express middleware for automatic HTTP metrics
   * Records request count and duration for all HTTP requests
   * @returns {function} Express middleware function
   */
  middleware() {
    return (req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000; // Convert to seconds

        this.httpRequestsTotal.inc({
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode
        });

        this.httpRequestDuration.observe({
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode
        }, duration);
      });

      next();
    };
  }

  /**
   * Express handler for /metrics endpoint
   * Returns Prometheus-formatted metrics
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  async metricsHandler(req, res) {
    res.set('Content-Type', this.register.contentType);
    res.end(await this.register.metrics());
  }

  /**
   * Record a business order event
   * @param {string} type - Order type (e.g., 'subscription', 'one-time')
   * @param {string} paymentMethod - Payment method (e.g., 'credit_card', 'paypal')
   * @param {string} region - Geographic region (e.g., 'us', 'eu', 'asia')
   */
  recordOrder(type, paymentMethod, region) {
    this.ordersTotal.inc({ type, payment_method: paymentMethod, region });
  }

  /**
   * Set active connections gauge
   * @param {string} type - Connection type (e.g., 'websocket', 'database', 'api')
   * @param {number} count - Number of active connections
   */
  setActiveConnections(type, count) {
    this.activeConnections.set({ type }, count);
  }

  /**
   * Record user registration
   * @param {string} source - User source (e.g., 'organic', 'referral', 'ad')
   * @param {string} plan - User plan (e.g., 'free', 'pro', 'enterprise')
   */
  recordUserRegistration(source, plan) {
    this.usersTotal.inc({ source, plan });
  }

  /**
   * Get all metrics in Prometheus format
   * @returns {Promise<string>} Prometheus-formatted metrics string
   */
  async getMetrics() {
    return await this.register.metrics();
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset() {
    this.register.resetMetrics();
  }

  /**
   * Get metrics as JSON object
   * @returns {Promise<object>} Metrics as JSON
   */
  async getMetricsAsJSON() {
    return await this.register.getMetricsAsJSON();
  }
}

module.exports = MetricsCollector;
