#!/usr/bin/env node

/**
 * Tracing SDK — Distributed tracing with OpenTelemetry
 *
 * Provides OpenTelemetry integration with auto-instrumentation
 * and Jaeger exporter for distributed tracing.
 *
 * Requirements: OBSERVE-06
 *
 * Usage:
 *   const TracingSDK = require('./tracing-otel.cjs');
 *   const tracing = new TracingSDK({ serviceName: 'ez-app' });
 *   await tracing.start();
 *   // Use manual spans
 *   await tracing.withSpan('my-operation', async (span) => { ... });
 */

'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const api = require('@opentelemetry/api');

class TracingSDK {
  /**
   * Create Tracing SDK
   * @param {object} options - Configuration options
   * @param {string} options.serviceName - Service name (default: 'ez-app')
   * @param {string} options.serviceVersion - Service version (default: '1.0.0')
   * @param {string} options.exporter - Exporter type: 'jaeger' or 'zipkin' (default: 'jaeger')
   * @param {string} options.collectorEndpoint - Collector endpoint URL (default: 'http://jaeger:14268/api/traces')
   * @param {number} options.sampleRate - Sampling rate 0.0-1.0 (default: 1.0)
   */
  constructor(options = {}) {
    const {
      serviceName = 'ez-app',
      serviceVersion = '1.0.0',
      exporter = 'jaeger',
      collectorEndpoint = 'http://jaeger:14268/api/traces',
      sampleRate = 1.0
    } = options;

    this.serviceName = serviceName;
    this.serviceVersion = serviceVersion;
    this.exporter = exporter;
    this.collectorEndpoint = collectorEndpoint;
    this.sampleRate = sampleRate;
    this.isInitialized = false;

    // Select exporter
    let traceExporter;
    if (exporter === 'zipkin') {
      traceExporter = new ZipkinExporter({ url: collectorEndpoint });
    } else {
      // Default to Jaeger
      traceExporter = new JaegerExporter({ endpoint: collectorEndpoint });
    }

    // Create SDK with auto-instrumentations
    this.sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
      }),
      traceExporter,
      sampler: new api.TraceIdRatioBasedSampler(sampleRate),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': { enabled: true },
          '@opentelemetry/instrumentation-express': { enabled: true },
          '@opentelemetry/instrumentation-pino': { enabled: true }, // Auto-inject trace IDs to logs
          '@opentelemetry/instrumentation-dns': { enabled: true },
          '@opentelemetry/instrumentation-net': { enabled: true },
        })
      ],
    });
  }

  /**
   * Start the OpenTelemetry SDK
   * @returns {Promise<void>}
   */
  async start() {
    try {
      await this.sdk.start();
      this.isInitialized = true;
      console.log(`OpenTelemetry SDK started for service: ${this.serviceName}`);
    } catch (error) {
      console.error('Failed to start OpenTelemetry SDK:', error.message);
      throw error;
    }
  }

  /**
   * Shutdown the OpenTelemetry SDK
   * @returns {Promise<void>}
   */
  async shutdown() {
    try {
      await this.sdk.shutdown();
      this.isInitialized = false;
      console.log('OpenTelemetry SDK shut down');
    } catch (error) {
      console.error('Failed to shutdown OpenTelemetry SDK:', error.message);
      throw error;
    }
  }

  /**
   * Get a tracer instance
   * @param {string} name - Tracer name (default: service name)
   * @returns {object} OpenTelemetry tracer
   */
  getTracer(name) {
    const tracerName = name || this.serviceName;
    return api.trace.getTracer(tracerName, this.serviceVersion);
  }

  /**
   * Execute a function within an active span
   * Creates a span, makes it active, executes the function, and ends the span
   * @param {string} name - Span name
   * @param {function} fn - Function to execute (receives span as argument)
   * @param {object} attributes - Span attributes to set
   * @returns {Promise<any>} Result of the function
   */
  async withSpan(name, fn, attributes = {}) {
    const tracer = this.getTracer();
    
    return tracer.startActiveSpan(name, async (span) => {
      try {
        // Set span attributes
        Object.entries(attributes).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            span.setAttribute(key, value);
          }
        });

        // Execute the function
        const result = await fn(span);
        return result;
      } catch (error) {
        // Record exception on span
        span.recordException(error);
        span.setStatus({
          code: api.SpanStatusCode.ERROR,
          message: error.message
        });
        throw error;
      } finally {
        // Always end the span
        span.end();
      }
    });
  }

  /**
   * Get the current active span
   * @returns {object|null} Current active span or null
   */
  getCurrentSpan() {
    return api.trace.getSpan(api.context.active());
  }

  /**
   * Get the current trace context
   * @returns {object} Trace context with traceId and spanId
   */
  getCurrentTraceContext() {
    const span = this.getCurrentSpan();
    if (span) {
      const spanContext = span.spanContext();
      return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId
      };
    }
    return null;
  }

  /**
   * Inject trace context into headers for propagation
   * @param {object} headers - Headers object to inject into
   * @returns {object} Headers with trace context
   */
  injectTraceContext(headers = {}) {
    const propagation = api.propagation;
    const ctx = api.context.active();
    propagation.inject(ctx, headers);
    return headers;
  }

  /**
   * Extract trace context from headers
   * @param {object} headers - Headers object to extract from
   * @returns {object} Context with extracted trace
   */
  extractTraceContext(headers) {
    const propagation = api.propagation;
    return propagation.extract(api.context.active(), headers);
  }

  /**
   * Create a manual span (alternative to withSpan)
   * @param {string} name - Span name
   * @returns {object} Span object
   */
  startSpan(name) {
    const tracer = this.getTracer();
    return tracer.startSpan(name);
  }

  /**
   * Check if tracing is enabled and initialized
   * @returns {boolean}
   */
  isEnabled() {
    return this.isInitialized;
  }
}

module.exports = TracingSDK;
