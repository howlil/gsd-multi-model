# Setup Structured Logging

High-performance JSON logging with Pino and correlation IDs for EZ Agents projects.

## Description

This command sets up structured logging for your EZ Agents project using Pino. It provides:

- **High-performance JSON logging** (5-10x faster than Winston)
- **Automatic correlation ID generation** for request tracing
- **Express middleware** for automatic request/response logging
- **ISO timestamp format** for log parsing
- **Child logger support** for contextual logging

## Requirements

- OBSERVE-04: Log aggregation setup (ELK stack, Loki, Papertrail)
- OBSERVE-05: Structured logging with correlation IDs

## Usage

```javascript
const { StructuredLogger, createPinoHttpMiddleware } = require('./ez-agents/bin/lib/logger-structured.cjs');

// Create logger instance
const logger = new StructuredLogger({
  level: 'info',  // Log level: fatal, error, warn, info, debug, trace
  correlationIdHeader: 'x-correlation-id'
});

// Add middleware to Express app
app.use(logger.middleware());

// Use logger in routes
app.get('/api/users', (req, res) => {
  req.logger.info('Fetching users');
  res.json({ users: [] });
});
```

## Examples

### Basic Integration

```javascript
const express = require('express');
const { StructuredLogger } = require('./ez-agents/bin/lib/logger-structured.cjs');

const app = express();
const logger = new StructuredLogger({ level: 'info' });

// Middleware must be added before routes
app.use(logger.middleware());

// Your routes
app.get('/api/users', (req, res) => {
  // Logger is attached to req.logger with correlation ID
  req.logger.info('Fetching users from database');
  res.json({ users: [] });
});

// Manual logging with context
logger.info('Server started', { port: 3000, env: process.env.NODE_ENV });

app.listen(3000);
```

### Log Output Format

```json
{
  "level": "info",
  "time": "2026-03-20T12:00:00.000Z",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "GET",
  "path": "/api/users",
  "ip": "127.0.0.1",
  "msg": "Request received"
}
```

Response log:
```json
{
  "level": "info",
  "time": "2026-03-20T12:00:00.050Z",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "GET",
  "path": "/api/users",
  "statusCode": 200,
  "durationMs": 50,
  "msg": "Response sent"
}
```

### Child Loggers

```javascript
// Create child logger with additional context
const dbLogger = logger.child({ module: 'database', connection: 'primary' });

dbLogger.info('Database connected');
// Output includes: { module: 'database', connection: 'primary' }
```

### Error Logging

```javascript
try {
  // Some operation
} catch (error) {
  logger.error('Operation failed', {
    error: error.message,
    stack: error.stack,
    userId: '123'
  });
}
```

### Using pino-http (Alternative)

```javascript
const { createPinoHttpMiddleware } = require('./ez-agents/bin/lib/logger-structured.cjs');

// Requires pino-http package: npm install pino-http
const middleware = createPinoHttpMiddleware({
  level: 'info',
  customProps: (req, res) => ({
    userId: req.user?.id,
    tenant: req.tenant?.name
  })
});

app.use(middleware);
```

### Integration with Tracing

```javascript
const { StructuredLogger } = require('./logger-structured.cjs');
const TracingSDK = require('./tracing-otel.cjs');

const logger = new StructuredLogger({ level: 'info' });
const tracing = new TracingSDK({ serviceName: 'my-app' });

await tracing.start();

// Trace ID is automatically injected into logs via Pino instrumentation
app.use(logger.middleware());
```

## Log Levels

| Level | Use Case |
|-------|----------|
| `fatal` | Application crashes, unrecoverable errors |
| `error` | Errors that need attention but don't crash app |
| `warn` | Unexpected events that don't affect functionality |
| `info` | General operational information |
| `debug` | Detailed information for debugging |
| `trace` | Very detailed information for tracing |

## Configuration Options

```javascript
const logger = new StructuredLogger({
  level: 'info',                    // Minimum log level
  correlationIdHeader: 'x-correlation-id'  // Header name for correlation ID
});
```

### Dynamic Log Level

```javascript
// Change log level at runtime
logger.setLevel('debug');

// Get current log level
const currentLevel = logger.getLevel();
```

## Log Shipping to Loki

### Promtail Configuration

```yaml
# promtail-config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: app-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: node-app
          __path__: /var/log/app/*.log
```

### Docker Logging

```yaml
version: '3.8'

services:
  app:
    build: .
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    volumes:
      - app-logs:/var/log/app
```

## Query Examples (Loki LogQL)

### Find logs by correlation ID

```logql
{job="node-app"} |~ "correlationId=\"550e8400-e29b-41d4-a716-446655440000\""
```

### Error logs in last 5 minutes

```logql
{job="node-app"} |= "error" | json | level = "error"
```

### Request duration over 1 second

```logql
{job="node-app"} | json | durationMs > 1000
```

### Logs by HTTP method

```logql
{job="node-app"} | json | method = "POST"
```

## Related Commands

- `/ez:setup-observability` - Complete observability stack setup
- `/ez:setup-tracing` - Distributed tracing setup
- `/ez:setup-logging` - This command
- `/ez:health` - Health check command

## Troubleshooting

### Correlation ID not propagating

1. Ensure middleware is added before routes
2. Check header name matches: `x-correlation-id`
3. Verify client sends correlation ID in request headers

### Logs not appearing in Loki

1. Check Promtail is running: `docker-compose ps promtail`
2. Verify log path in `promtail-config.yml`
3. Check Loki logs: `docker-compose logs loki`

### Performance issues

Pino is designed for high performance. If you experience issues:

1. Use `info` level in production (avoid `debug` or `trace`)
2. Limit context object size
3. Use child loggers for module-specific logging

### Pretty printing in development

```javascript
const pino = require('pino');
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});
```

Install: `npm install pino-pretty`
