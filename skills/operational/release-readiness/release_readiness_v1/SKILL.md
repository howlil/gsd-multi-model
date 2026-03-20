---
name: Release Readiness Checklist
description: Pre-release validation ensuring quality, performance, and operational readiness
version: 1.0.0
tags: [release, deployment, quality-gate, checklist]
category: operational
triggers:
  keywords: [release, deploy, launch, go-live]
  modes: [all]
key_components:
  acceptance_criteria_met: "All acceptance criteria from requirements verified"
  test_coverage_thresholds: "Unit/integration/E2E coverage meets thresholds (70-90%)"
  performance_benchmarks: "Response times, throughput, resource usage within targets"
  security_scan_clean: "SAST/DAST scans pass, no high-severity vulnerabilities"
  documentation_complete: "README, API docs, deployment guide, runbooks updated"
  monitoring_configured: "Alerts, dashboards, SLOs configured and tested"
  rollback_plan_documented: "Rollback steps tested, data rollback verified"
  stakeholder_signoff: "Product, engineering, operations approval obtained"
release_checklist:
  - Code review complete
  - Tests pass
  - Performance smoke test
  - Security scan clean
  - Docs updated
  - Monitoring ready
  - Rollback tested
when_not_to_use: "Hotfixes (use expedited process), experimental features (use feature flags)"
---

# Release Readiness Checklist

## Purpose

Provide a comprehensive pre-release validation gate ensuring quality, performance, and operational readiness before any deployment reaches production.

## Key Components

### 1. Acceptance Criteria Met

Every requirement must be verifiable:

- All acceptance criteria from the feature requirements are checked off
- Product owner or stakeholder has reviewed and confirmed
- No known open defects above the agreed severity threshold

### 2. Test Coverage Thresholds

Automated testing must meet defined coverage levels:

| Test Type | Minimum Threshold | Recommended |
|-----------|-------------------|-------------|
| Unit tests | 70% | 80%+ |
| Integration tests | 60% | 75%+ |
| E2E tests | Core user journeys | All critical paths |

Coverage is necessary but not sufficient — tests must be meaningful (assertions, not just line coverage).

### 3. Performance Benchmarks

Validate non-functional requirements:

- Response times within SLA (e.g., p95 < 500ms)
- Throughput meets expected load
- Memory and CPU usage within resource limits
- No regression from previous release baseline

### 4. Security Scan Clean

Security gates must pass:

- SAST (Static Analysis) scans: no high-severity findings
- DAST (Dynamic Analysis) scans: no critical vulnerabilities
- Dependency audit: no known vulnerable packages
- No hardcoded secrets or credentials

### 5. Documentation Complete

Documentation must be current:

- README updated with new features/changes
- API documentation reflects current contracts
- Deployment guide updated for new configuration
- Runbooks cover new failure modes
- CHANGELOG updated

### 6. Monitoring Configured

Observability must be in place before go-live:

- Alerts configured for new metrics/endpoints
- Dashboards reflect new features
- SLOs defined and baseline measurements recorded
- Logging covers new code paths

### 7. Rollback Plan Documented

Every deployment needs a tested exit strategy:

- Rollback steps documented and reviewed
- Database migrations are reversible (or data rollback procedure documented)
- Rollback tested in staging
- Rollback time estimated (must be within SLA)

### 8. Stakeholder Signoff

Governance approvals completed:

- Product: feature verification and acceptance
- Engineering: code review, architecture, security
- Operations: deployment readiness, monitoring

## Release Checklist

```
Pre-Deployment:
[ ] All acceptance criteria verified
[ ] Test suite passing (unit, integration, E2E)
[ ] Performance benchmarks within targets
[ ] Security scan: 0 high/critical findings
[ ] Documentation updated
[ ] Monitoring and alerts configured
[ ] Rollback procedure tested

Deployment:
[ ] Deployment to staging successful
[ ] Smoke tests pass in staging
[ ] Stakeholder signoff received
[ ] Change management ticket/approval (if required)
[ ] Deployment scheduled (avoid high-traffic periods)

Post-Deployment:
[ ] Deployment successful with no errors
[ ] Smoke tests pass in production
[ ] Monitoring shows normal behavior (15-30 min observation)
[ ] Stakeholders notified of successful release
```

## When NOT to Use This Skill

- Hotfixes (P1/P2): Use an expedited checklist covering security, smoke test, and rollback plan only
- Experimental features behind feature flags: Validate the flag toggle mechanism, not the full release checklist
