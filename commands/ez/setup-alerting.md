# Setup Alerting

Prometheus Alertmanager configuration and routing for EZ Agents projects.

## Description

This command sets up alerting for your EZ Agents project using Prometheus Alertmanager. It provides:

- **Threshold-based alerts** for metrics (error rate, latency, memory, etc.)
- **Alert routing** to multiple receivers (Slack, PagerDuty, Opsgenie)
- **Inhibition rules** to prevent alert storms
- **Alert grouping** and deduplication
- **Pre-configured alert rules** for Node.js applications

## Requirements

- OBSERVE-07: Alerting rules configuration (threshold-based, anomaly detection)
- OBSERVE-08: Alert routing (PagerDuty, Opsgenie, Slack)

## Usage

Alerting is configured via YAML files in `assets/observability/`:

```bash
# Start Alertmanager with Docker Compose
cd assets/observability
docker-compose up -d alertmanager prometheus

# Access Alertmanager UI
open http://localhost:9093
```

## Configuration Files

### Alertmanager Configuration

File: `assets/observability/alertmanager.yml`

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/XXX/YYY/ZZZ'

route:
  receiver: 'slack-notifications'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - match:
        severity: 'critical'
      receiver: 'pagerduty-critical'
      continue: true
    - match:
        severity: 'critical'
      receiver: 'opsgenie-critical'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#alerts'
        send_resolved: true

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'

  - name: 'opsgenie-critical'
    opsgenie_configs:
      - api_key: 'YOUR_OPSGENIE_API_KEY'
        teams:
          - name: 'platform-team'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

### Alerting Rules

File: `assets/observability/alerting-rules.yml`

```yaml
groups:
  - name: node-app-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(ez_http_requests_total{status_code=~"5.."}[5m]) / rate(ez_http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(ez_http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "P95 latency is {{ $value }}s"

      - alert: ServiceDown
        expr: up{job="nodeapp"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} has been down"

      - alert: HighMemoryUsage
        expr: nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      - alert: HighEventLoopLag
        expr: rate(nodejs_eventloop_lag_seconds_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High event loop lag"
          description: "Event loop lag is {{ $value | humanizeDuration }}"
```

## Examples

### Slack Integration

1. Create a Slack Incoming Webhook:
   - Go to https://my.slack.com/services/new/incoming-webhook/
   - Select channel for alerts
   - Copy webhook URL

2. Update `alertmanager.yml`:

```yaml
global:
  slack_api_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#alerts'
        send_resolved: true
        title: '{{ template "slack.title" . }}'
        text: '{{ range .Alerts }}*Alert:* {{ .Annotations.summary }}\n*Description:* {{ .Annotations.description }}\n{{ end }}'
        icon_emoji: ':warning:'
```

### PagerDuty Integration

1. Create a PagerDuty service:
   - Go to PagerDuty > Services > New Service
   - Copy the integration key

2. Update `alertmanager.yml`:

```yaml
receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_INTEGRATION_KEY'
        severity: 'critical'
        description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'
        details:
          alertname: '{{ .GroupLabels.alertname }}'
          severity: '{{ .GroupLabels.severity }}'
          description: '{{ .CommonAnnotations.description }}'
```

### Opsgenie Integration

1. Create an Opsgenie integration:
   - Go to Opsgenie > Teams > Integrations
   - Copy the API key

2. Update `alertmanager.yml`:

```yaml
receivers:
  - name: 'opsgenie-critical'
    opsgenie_configs:
      - api_key: 'YOUR_OPSGENIE_API_KEY'
        teams:
          - name: 'platform-team'
        priority: 'P1'
        description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'
```

### Custom Alert Rule

```yaml
groups:
  - name: custom-alerts
    rules:
      - alert: HighOrderVolume
        expr: rate(ez_orders_total[5m]) > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High order volume detected"
          description: "Order rate is {{ $value }} orders/sec"

      - alert: LowUserRegistrations
        expr: rate(ez_users_total[1h]) < 1
        for: 24h
        labels:
          severity: info
        annotations:
          summary: "Low user registration rate"
          description: "Only {{ $value }} registrations/hour"
```

### Time-based Routing

```yaml
route:
  receiver: 'slack-notifications'
  routes:
    # Business hours - go to Slack
    - match:
        severity: 'warning'
      receiver: 'slack-notifications'
      active_time_intervals:
        - weekdays
    # After hours - go to PagerDuty
    - match:
        severity: 'warning'
      receiver: 'pagerduty-critical'
      active_time_intervals:
        - weekends
        - nights
```

### Alert Grouping

```yaml
route:
  receiver: 'slack-notifications'
  group_by: ['alertname', 'service', 'environment']
  group_wait: 30s      # Wait 30s before sending first alert
  group_interval: 5m   # Wait 5m before sending new alerts for same group
  repeat_interval: 4h  # Repeat alert every 4h if not resolved
```

## Alert Rules Reference

### Available Metrics

| Metric | Description | Type |
|--------|-------------|------|
| `ez_http_requests_total` | HTTP request count | Counter |
| `ez_http_request_duration_seconds` | Request duration | Histogram |
| `ez_active_connections` | Active connections | Gauge |
| `nodejs_heap_size_used_bytes` | Heap memory used | Gauge |
| `nodejs_heap_size_total_bytes` | Total heap size | Gauge |
| `nodejs_eventloop_lag_seconds` | Event loop lag | Gauge |
| `up` | Target health status | Gauge |

### Alert Severity Levels

| Severity | Description | Response Time |
|----------|-------------|---------------|
| `critical` | Service down, data loss, major outage | Immediate (PagerDuty) |
| `warning` | Degraded performance, high error rate | Within hours (Slack) |
| `info` | Informational, trends | Next business day |

## Prometheus Configuration

File: `assets/observability/prometheus.yml`

```yaml
global:
  scrape_interval: 5s
  evaluation_interval: 5s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - "alerting-rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'nodeapp'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
```

## Related Commands

- `/ez:setup-observability` - Complete observability stack setup
- `/ez:setup-metrics` - Metrics collection setup
- `/ez:setup-error-tracking` - Error tracking setup
- `/ez:health` - Health check command

## Troubleshooting

### Alerts not firing

1. Check Prometheus rules: http://localhost:9090/rules
2. Verify alert expressions in Prometheus UI
3. Check `up` metric for target health
4. Review Prometheus logs: `docker-compose logs prometheus`

### Alerts not reaching receivers

1. Check Alertmanager UI: http://localhost:9093
2. Verify receiver configuration
3. Check Alertmanager logs: `docker-compose logs alertmanager`
4. Test webhook URLs manually

### Too many alerts (alert storm)

1. Increase `group_wait` and `group_interval`
2. Add inhibition rules for related alerts
3. Increase `for` duration on alerts
4. Adjust thresholds to reduce noise

### Alerts not grouping correctly

1. Check `group_by` labels match alert labels
2. Ensure consistent label names across alerts
3. Review Alertmanager silences

### Testing alerts

```bash
# Test alert expression in Prometheus
# Go to http://localhost:9090 and run:
rate(ez_http_requests_total{status_code=~"5.."}[5m])

# Silences - temporarily mute alerts
# Go to http://localhost:9093 > Silences > New Silence
```
