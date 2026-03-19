# Setup Metrics Collection

Prometheus metrics collection setup with prom-client for EZ Agents projects.

## Description

This command sets up metrics collection for your EZ Agents project using Prometheus and prom-client. It provides:

- **Automatic HTTP metrics** (request count, duration, status codes)
- **Default Node.js metrics** (CPU, memory, event loop, GC)
- **Custom business metrics** (orders, users, etc.)
- **Express middleware** for automatic metrics injection
- **Prometheus-compatible** `/metrics` endpoint

## Requirements

- OBSERVE-01: Metrics collection setup (Prometheus, CloudWatch, Datadog)
- OBSERVE-02: Custom metrics definition (business + technical KPIs)

## Usage

```javascript
const MetricsCollector = require('./ez-agents/bin/lib/metrics-collector.cjs');

// Create metrics collector instance
const metrics = new MetricsCollector({
  prefix: 'ez_'  // All metrics will be prefixed with 'ez_'
});

// Add middleware to Express app (must be before routes)
app.use(metrics.middleware());

// Add /metrics endpoint for Prometheus scraping
app.get('/metrics', metrics.metricsHandler.bind(metrics));
```

## Examples

### Basic Integration

```javascript
const express = require('express');
const MetricsCollector = require('./ez-agents/bin/lib/metrics-collector.cjs');

const app = express();
const metrics = new MetricsCollector({ prefix: 'ez_' });

// Middleware must be added before routes
app.use(metrics.middleware());

// Your routes
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

// Metrics endpoint
app.get('/metrics', metrics.metricsHandler.bind(metrics));

app.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('Metrics available at http://localhost:3000/metrics');
});
```

### Recording Business Metrics

```javascript
// Record an order
metrics.recordOrder('subscription', 'credit_card', 'us');

// Record user registration
metrics.recordUserRegistration('organic', 'pro');

// Set active connections
metrics.setActiveConnections('websocket', 150);
```

### Custom Metrics

```javascript
const client = require('prom-client');

// Create custom counter
const customCounter = new client.Counter({
  name: 'ez_custom_events_total',
  help: 'Total number of custom events',
  labelNames: ['event_type']
});

// Create custom gauge
const customGauge = new client.Gauge({
  name: 'ez_custom_gauge',
  help: 'Custom gauge value',
  labelNames: ['type']
});

// Create custom histogram
const customHistogram = new client.Histogram({
  name: 'ez_custom_duration_seconds',
  help: 'Custom duration histogram',
  labelNames: ['operation'],
  buckets: [0.1, 0.5, 1, 2, 5]
});
```

### Prometheus Configuration

Add job to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'nodeapp'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s
```

### Docker Compose Integration

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"

  prometheus:
    image: prom/prometheus:v2.50.0
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    depends_on:
      - app
```

## Metrics Exposed

### HTTP Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `ez_http_requests_total` | Counter | Total HTTP requests | method, route, status_code |
| `ez_http_request_duration_seconds` | Histogram | HTTP request duration | method, route, status_code |
| `ez_active_connections` | Gauge | Active connections | type |

### Node.js Default Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `nodejs_heap_size_used_bytes` | Gauge | Heap memory used |
| `nodejs_heap_size_total_bytes` | Gauge | Total heap size |
| `nodejs_eventloop_lag_seconds` | Gauge | Event loop lag |
| `nodejs_active_handles_total` | Gauge | Active handles |
| `nodejs_active_requests_total` | Gauge | Active requests |

### Business Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `ez_orders_total` | Counter | Total orders | type, payment_method, region |
| `ez_users_total` | Counter | Total users | source, plan |

## Query Examples

### Request Rate

```promql
rate(ez_http_requests_total[5m])
```

### Error Rate Percentage

```promql
sum(rate(ez_http_requests_total{status_code=~"5.."}[5m])) / sum(rate(ez_http_requests_total[5m])) * 100
```

### P95 Latency

```promql
histogram_quantile(0.95, rate(ez_http_request_duration_seconds_bucket[5m]))
```

### Memory Usage

```promql
nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes * 100
```

## Related Commands

- `/ez:setup-observability` - Complete observability stack setup
- `/ez:setup-logging` - Structured logging setup
- `/ez:setup-alerting` - Alerting configuration
- `/ez:health` - Health check command

## Troubleshooting

### Metrics not showing in Prometheus

1. Verify `/metrics` endpoint: `curl http://localhost:3000/metrics`
2. Check Prometheus targets: http://localhost:9090/targets
3. Verify scrape config in `prometheus.yml`
4. Check network connectivity between Prometheus and app

### High cardinality warnings

Avoid high-cardinality labels like user IDs:

```javascript
// BAD - high cardinality
new client.Counter({
  name: 'ez_user_requests_total',
  labelNames: ['user_id']  // Don't do this!
});

// GOOD - low cardinality
new client.Counter({
  name: 'ez_user_requests_total',
  labelNames: ['user_type']  // 'free', 'pro', 'enterprise'
});
```

### Memory leaks from metrics

Always unregister metrics when no longer needed:

```javascript
const counter = new client.Counter({...});
// Later when done
client.register.removeMetric(counter);
```
