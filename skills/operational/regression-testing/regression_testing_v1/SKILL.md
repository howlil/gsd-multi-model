---
name: Regression Testing
description: Systematic regression testing to validate no functionality breaks after changes
version: 1.0.0
tags: [regression-testing, qa, testing, validation]
category: operational
triggers:
  keywords: [regression, testing, validation, pre-release]
  modes: [all]
key_components:
  test_suite_selection: "Which tests to run (unit, integration, E2E, smoke)"
  environment_parity: "Staging matches production (config, data, infrastructure)"
  data_set_selection: "Representative data, edge cases, production snapshots"
  performance_baseline: "Compare against baseline (response time, throughput, memory)"
  visual_regression: "UI screenshot comparison for visual changes"
  automated_criteria: "Pass/fail thresholds, flaky test handling"
  manual_checklist: "Edge cases, exploratory testing, user journey validation"
regression_strategies:
  - Full suite on major changes
  - Smoke tests on minor changes
  - Targeted tests for affected areas
when_not_to_use: "Trivial changes (docs, comments), emergency hotfixes (use smoke tests only)"
---

# Regression Testing

## Purpose

Systematically validate that no existing functionality breaks after changes. Regression testing is the safety net that catches unintended side effects.

## Key Components

### 1. Test Suite Selection

Match test scope to change scope:

| Change Type | Test Scope | Rationale |
|-------------|-----------|-----------|
| Major feature | Full suite (unit + integration + E2E) | Broad impact, validate everything |
| Bug fix | Affected module + integration tests | Fix correctness without over-testing |
| Refactor | Full suite for refactored module | Validate behavior preservation |
| Config/infra change | Smoke tests + E2E critical paths | Validate deployment, not code |
| Minor change (docs/comments) | Skip regression tests | No functional impact |

### 2. Environment Parity

Staging must match production or test results are misleading:

- **Configuration:** Same environment variables, feature flags, service URLs
- **Infrastructure:** Same OS, runtime version, memory/CPU ratios
- **Data:** Representative data volume and distribution (use anonymized production snapshots)
- **Dependencies:** Same external service versions (databases, message queues, APIs)
- **Network:** Simulate production latency/topology if relevant

Mismatches between staging and production are a top cause of "it passed staging" incidents.

### 3. Data Set Selection

Tests are only as good as their data:

- **Representative data:** Cover common user profiles and transaction types
- **Edge cases:** Empty sets, maximum values, special characters, timezone edge cases
- **Production snapshots:** Anonymized recent production data for realistic regression scenarios
- **Synthetic data:** Deterministic, reproducible datasets for unit/integration tests

### 4. Performance Baseline

Catch performance regressions before users do:

- Record baseline metrics from the previous stable release
- Compare after changes: response time (p50, p95, p99), throughput (req/sec), memory usage
- Define thresholds: flag if any metric degrades > 10% from baseline
- Run performance tests under realistic load (not just single-user)

### 5. Visual Regression

Catch unintended UI changes:

- Take screenshots of key UI components and pages before changes
- Compare screenshots after changes with pixel-diff tooling
- Flag visual diffs for human review
- Particularly important for CSS refactors, component library upgrades

Tools: Percy, Chromatic, BackstopJS, Playwright visual comparison.

### 6. Automated Pass/Fail Criteria

Define objective gates:

- **Pass:** All tests green, coverage thresholds met, no performance regressions
- **Fail:** Any test failure, coverage drops below threshold, performance degrades > threshold
- **Flaky test handling:** Mark known flaky tests, require 3 consecutive failures to block

Never skip failing tests without creating a ticket. Failing tests that are suppressed become invisible regressions.

### 7. Manual Regression Checklist

Not everything can be automated:

- Walk through critical user journeys manually
- Test edge cases that are difficult to automate (complex UI interactions, multi-step flows)
- Exploratory testing in areas adjacent to the change
- Accessibility checks for UI changes

## Regression Strategies

### Full Suite (Major Changes)

Run all unit, integration, and E2E tests.

**When:** New features, large refactors, architectural changes, dependency upgrades.
**Time:** Accept longer test run times — thoroughness is worth it.

### Smoke Tests (Minor Changes)

Run a curated set of critical path tests (< 10 minutes).

**When:** Minor bug fixes, documentation updates, config tweaks.
**Contents:** Login, core CRUD operations, key user journey.

### Targeted Tests (Affected Areas)

Run tests for changed modules plus their consumers.

**When:** Isolated bug fixes, single-component changes.
**How:** Use code coverage to map tests to changed files; run those tests plus integration tests.

## Regression Testing Checklist

```
Before Testing:
[ ] Environment parity verified (staging matches production)
[ ] Test data prepared (representative + edge cases)
[ ] Performance baseline recorded from previous release
[ ] Test suite selection finalized based on change scope

During Testing:
[ ] Automated test suite executed
[ ] Performance comparison run against baseline
[ ] Visual regression scan completed (for UI changes)
[ ] Flaky test results noted and tracked

After Testing:
[ ] All automated gates pass (or failures documented with tickets)
[ ] Performance metrics within acceptable thresholds
[ ] Manual checklist completed for critical user journeys
[ ] Regression testing sign-off recorded
```

## When NOT to Use This Skill

- Trivial changes (docs, comments, whitespace): no functional impact to regress
- Emergency hotfixes (SEV1): use targeted smoke tests only, full regression after stabilization
