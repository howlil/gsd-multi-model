# Setup Distributed Tracing

OpenTelemetry instrumentation with Jaeger exporter for distributed tracing in EZ Agents projects.

## Description

This command sets up distributed tracing for your EZ Agents project using OpenTelemetry. It provides:

- **Vendor-neutral instrumentation** with OpenTelemetry SDK
- **Automatic instrumentation** for HTTP, Express, Pino, DNS, and Net modules
- **Jaeger exporter** for trace visualization
- **Manual span creation** API for custom operations
- **Trace ID propagation** to logs via Pino integration

## Requirements

- OBSERVE-06: Distributed tracing integration (Jaeger, Zipkin, X-Ray)

## Usage

```javascript
const TracingSDK = require('./ez-agents/bin/lib/tracing-otel.cjs');

// Create tracing instance
const tracing = new TracingSDK({
  serviceName: 'my-app',
  serviceVersion: '1.0.0',
  exporter: 'jaeger',  // 'jaeger' or 'zipkin'
  collectorEndpoint: 'http://jaeger:14268/api/traces',
  sampleRate: 1.0  // 0.0-1.0, sample percentage
});

// Start tracing SDK
await tracing.start();

// Use in Express app (auto-instrumented)
app.use(express());

// Manual span creation
app.get('/api/users', async (req, res) => {
  await tracing.withSpan('fetch-users', async (span) => {
    span.setAttribute('db.type', 'postgres');
    // Your code here
  });
  res.json({ users: [] });
});
```

## Examples

### Basic Integration

```javascript
const express = require('express');
const TracingSDK = require('./ez-agents/bin/lib/tracing-otel.cjs');

const app = express();

// Initialize tracing before creating app
const tracing = new TracingSDK({
  serviceName: 'my-app',
  serviceVersion: '1.0.0',
  exporter: 'jaeger',
  collectorEndpoint: 'http://localhost:14268/api/traces'
});

async function start() {
  await tracing.start();
  console.log('Tracing started');

  // Your routes (automatically instrumented)
  app.get('/api/users', async (req, res) => {
    // HTTP spans are created automatically
    const users = await fetchUsers();
    res.json({ users });
  });

  app.listen(3000);
}

start();
```

### Manual Span Creation

```javascript
// Create a span manually
await tracing.withSpan('process-order', async (span) => {
  span.setAttribute('order.id', '12345');
  span.setAttribute('order.total', 99.99);

  // Your business logic
  await processPayment();
  await updateInventory();

  span.setAttribute('payment.status', 'success');
}, {
  'order.type': 'subscription',
  'user.id': 'user-123'
});
```

### Nested Spans

```javascript
await tracing.withSpan('parent-operation', async (parentSpan) => {
  parentSpan.setAttribute('operation', 'parent');

  // Child span
  await tracing.withSpan('child-operation', async (childSpan) => {
    childSpan.setAttribute('operation', 'child');
    await doWork();
  });

  // Another child span
  await tracing.withSpan('another-child', async (span) => {
    await doMoreWork();
  });
});
```

### Error Handling in Spans

```javascript
try {
  await tracing.withSpan('risky-operation', async (span) => {
    span.setAttribute('attempt', 1);
    await riskyOperation();
  });
} catch (error) {
  // Exception is automatically recorded on span
  console.error('Operation failed:', error);
}
```

### Custom Span Attributes

```javascript
await tracing.withSpan('database-query', async (span) => {
  // Standard attributes
  span.setAttribute('db.system', 'postgresql');
  span.setAttribute('db.name', 'mydb');
  span.setAttribute('db.user', 'user');
  span.setAttribute('db.statement', 'SELECT * FROM users');

  // Custom attributes
  span.setAttribute('app.query.type', 'user_lookup');
  span.setAttribute('app.cache.hit', false);

  const result = await db.query('SELECT * FROM users');
  span.setAttribute('db.rows_returned', result.rows.length);
}, {
  'custom.attribute': 'value'
});
```

### Trace Context Propagation

```javascript
// Get current trace context
const context = tracing.getCurrentTraceContext();
console.log('Trace ID:', context.traceId);
console.log('Span ID:', context.spanId);

// Inject trace context into outgoing HTTP headers
const headers = {};
tracing.injectTraceContext(headers);
// headers now contains traceparent and tracestate

// Make HTTP request with trace context
await fetch('http://api.example.com/data', {
  headers
});

// Extract trace context from incoming request
const incomingHeaders = req.headers;
const extractedContext = tracing.extractTraceContext(incomingHeaders);
```

### Integration with Logging

```javascript
const { StructuredLogger } = require('./logger-structured.cjs');
const TracingSDK = require('./tracing-otel.cjs');

const logger = new StructuredLogger({ level: 'info' });
const tracing = new TracingSDK({ serviceName: 'my-app' });

await tracing.start();

// Pino auto-instrumentation injects trace IDs into logs
app.use(logger.middleware());

// Logs will include traceId and spanId when available
```

### Multiple Services

```javascript
// Service A (upstream)
const tracingA = new TracingSDK({
  serviceName: 'api-gateway',
  collectorEndpoint: 'http://jaeger:14268/api/traces'
});

// Service B (downstream)
const tracingB = new TracingSDK({
  serviceName: 'user-service',
  collectorEndpoint: 'http://jaeger:14268/api/traces'
});

// Trace context propagates automatically via HTTP headers
```

## Configuration Options

```javascript
const tracing = new TracingSDK({
  serviceName: 'my-app',           // Service name (required)
  serviceVersion: '1.0.0',         // Service version
  exporter: 'jaeger',              // 'jaeger' or 'zipkin'
  collectorEndpoint: 'http://jaeger:14268/api/traces',
  sampleRate: 1.0                  // Sampling rate 0.0-1.0
});
```

### Sampling Strategies

```javascript
// Sample 10% of traces (production recommended)
const tracing = new TracingSDK({
  serviceName: 'my-app',
  sampleRate: 0.1
});

// Sample all traces (development)
const tracing = new TracingSDK({
  serviceName: 'my-app',
  sampleRate: 1.0
});

// Sample no traces
const tracing = new TracingSDK({
  serviceName: 'my-app',
  sampleRate: 0.0
});
```

## Docker Compose Setup

```yaml
version: '3.8'

services:
  jaeger:
    image: jaegertracing/all-in-one:1.54
    container_name: jaeger
    ports:
      - "16686:16686"  # UI
      - "14268:14268"  # Collector
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    networks:
      - observability

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - OTEL_EXPORTER_JAEGER_ENDPOINT=http://jaeger:14268/api/traces
    depends_on:
      - jaeger
```

## Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| Jaeger UI | http://localhost:16686 | Trace visualization |
| Jaeger Collector | http://localhost:14268 | Trace ingestion |
| OTLP gRPC | http://localhost:4317 | OTLP gRPC endpoint |
| OTLP HTTP | http://localhost:4318 | OTLP HTTP endpoint |

## Span Attributes

### Standard Attributes (Semantic Conventions)

| Attribute | Description |
|-----------|-------------|
| `http.method` | HTTP method (GET, POST, etc.) |
| `http.url` | Full URL |
| `http.status_code` | HTTP status code |
| `db.system` | Database system (postgresql, mysql, etc.) |
| `db.name` | Database name |
| `db.statement` | SQL statement |
| `net.peer.name` | Remote host name |
| `net.peer.port` | Remote port |

### Custom Attributes

Prefix custom attributes with your namespace:
- `app.user.id`
- `app.order.total`
- `app.feature.flag`

## Query Examples (Jaeger UI)

### Find traces by service

```
service: my-app
```

### Find traces with errors

```
service: my-app error:true
```

### Find traces by operation

```
service: my-app operation: fetch-users
```

### Find traces by tag

```
service: my-app app.user.id:123
```

### Find slow traces

```
service: my-app minDuration: 1s
```

## Related Commands

- `/ez:setup-observability` - Complete observability stack setup
- `/ez:setup-logging` - Structured logging setup
- `/ez:setup-metrics` - Metrics collection setup
- `/ez:health` - Health check command

## Troubleshooting

### Traces not appearing in Jaeger

1. Verify Jaeger is running: `docker-compose ps jaeger`
2. Check collector endpoint is reachable
3. Verify service name matches in Jaeger UI
4. Check sample rate is > 0

### High overhead from tracing

1. Reduce sample rate in production (0.1 = 10%)
2. Disable unnecessary instrumentations
3. Use async context propagation carefully

### Trace IDs not in logs

1. Ensure Pino instrumentation is enabled
2. Check `@opentelemetry/instrumentation-pino` is installed
3. Verify logger is created after tracing starts

### Memory leaks

1. Always end spans (withSpan handles this automatically)
2. Avoid storing span references in global state
3. Use appropriate sample rates
