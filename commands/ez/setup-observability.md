# Setup Observability

Complete observability stack setup for EZ Agents projects including metrics, logging, tracing, and alerting.

## Description

This command sets up the complete observability infrastructure for your EZ Agents project. It configures:

- **Metrics Collection** (Prometheus + prom-client)
- **Structured Logging** (Pino with correlation IDs)
- **Distributed Tracing** (OpenTelemetry + Jaeger)
- **Alerting** (Alertmanager with routing rules)
- **Error Tracking** (Sentry integration)
- **Uptime Monitoring** (Health check endpoints)

## Requirements

- OBSERVE-01: Metrics collection setup
- OBSERVE-02: Custom metrics definition
- OBSERVE-03: Dashboard template generation
- OBSERVE-10: Uptime monitoring setup

## Usage

```bash
/ez:setup-observability [stack]
```

### Options

| Option | Description |
|--------|-------------|
| `docker` | Start the full Docker Compose observability stack |
| `config` | Generate configuration files only |
| `full` | Complete setup with Docker + application integration |

## Examples

### Start Observability Stack

```bash
# Start all observability services
cd assets/observability
docker-compose up -d
```

### Access Services

| Service | URL | Purpose |
|---------|-----|---------|
| Prometheus | http://localhost:9090 | Metrics collection and querying |
| Grafana | http://localhost:3001 | Dashboards and visualization |
| Loki | http://localhost:3100 | Log aggregation |
| Jaeger | http://localhost:16686 | Distributed tracing UI |
| Alertmanager | http://localhost:9093 | Alert routing and notifications |

### Application Integration

```javascript
const { ObservabilityEngine } = require('./ez-agents/bin/lib/index.cjs');

const engine = new ObservabilityEngine({
  metrics: { enabled: true, prefix: 'ez_' },
  logging: { enabled: true, level: 'info' },
  tracing: { enabled: true, serviceName: 'my-app' },
  errorTracking: { enabled: true, dsn: process.env.SENTRY_DSN }
});

await engine.initialize();

// Add middleware to Express
app.use(engine.getMiddleware());

// Add metrics endpoint
app.get('/metrics', engine.getMetricsHandler());

// Add error handler
app.use(engine.getErrorHandler());
```

## Configuration Files

Generated files are located in `assets/observability/`:

```
assets/observability/
├── docker-compose.yml          # Docker Compose stack (6 services)
├── prometheus.yml              # Prometheus scrape config
├── alerting-rules.yml          # Prometheus alerting rules
├── alertmanager.yml            # Alertmanager routing config
├── loki-config.yml             # Loki log aggregation config
├── promtail-config.yml         # Promtail log shipper config
└── grafana/
    ├── datasources/
    │   └── datasources.yml     # Grafana datasource provisioning
    └── dashboards/
        ├── dashboard-provisioning.yml
        └── nodejs-metrics.json # Pre-built Node.js metrics dashboard
```

## Health Check

The health check endpoint is available at `/api/health`:

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-20T12:00:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" }
  }
}
```

## Related Commands

- `/ez:setup-metrics` - Metrics collection setup only
- `/ez:setup-logging` - Structured logging setup only
- `/ez:setup-tracing` - Distributed tracing setup only
- `/ez:setup-alerting` - Alerting configuration only
- `/ez:setup-error-tracking` - Error tracking setup only
- `/ez:health` - Health check command

## Troubleshooting

### Services not starting

```bash
# Check Docker Compose logs
docker-compose logs -f

# Restart specific service
docker-compose restart prometheus
```

### Metrics not showing

1. Verify `/metrics` endpoint is accessible: `curl http://localhost:3000/metrics`
2. Check Prometheus targets: http://localhost:9090/targets
3. Verify scrape config in `prometheus.yml`

### Logs not appearing in Loki

1. Check Promtail is running: `docker-compose ps promtail`
2. Verify log path in `promtail-config.yml`
3. Check Loki logs: `docker-compose logs loki`
