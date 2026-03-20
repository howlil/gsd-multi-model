---
phase: 30
plan: 03
subsystem: cost-tracker
tags: [cost-tracking, metrics, file-lock, budget]
dependency_graph:
  requires:
    - ez-agents/bin/lib/file-lock.cjs
    - ez-agents/bin/lib/logger.cjs
    - .planning/config.json
  provides:
    - ez-agents/bin/lib/cost-tracker.cjs
  affects:
    - .planning/metrics.json
tech_stack:
  added: []
  patterns:
    - withLock read-modify-write for atomic JSON persistence
    - sync aggregate reads for low-overhead cost totalling
    - config-driven model rates with per-model fallback lookup
key_files:
  created:
    - ez-agents/bin/lib/cost-tracker.cjs
  modified: []
decisions:
  - CostTracker.record() is async (returns Promise) because withLock is async
  - aggregate() is synchronous — reads metrics.json directly, no lock needed for reads
  - checkBudget() is pure/sync — calls aggregate() internally, no side effects, no process.exit()
  - setBudget() writes config.json synchronously using fs.writeFileSync
  - process.exit() is explicitly excluded from cost-tracker.cjs; callers decide how to react
metrics:
  duration: 2min
  completed: 2026-03-20
  tasks_completed: 1
  files_created: 1
---

# Phase 30 Plan 03: CostTracker Implementation Summary

**One-liner:** JSON-persisted cost tracker with atomic withLock writes, phase/provider aggregation, and budget ceiling enforcement — no process.exit() calls.

## What Was Built

`ez-agents/bin/lib/cost-tracker.cjs` — a `CostTracker` class that:

- **`record(entry)`** — async; uses `withLock(metricsPath)` to atomically read-modify-write `.planning/metrics.json`; auto-computes `cost_usd` from token counts and model rates when not supplied
- **`aggregate(filter?)`** — sync; reads `metrics.json` with `fs.readFileSync`, reduces into `{ total, by_phase, by_provider }`; supports optional filter by phase/milestone/provider
- **`checkBudget(opts?)`** — sync; compares `aggregate().total.cost` against ceiling; returns `{ status: 'ok' | 'warning' | 'exceeded', message, ... }` — no side effects
- **`getConfig()`** — reads `cost_tracking` section from `.planning/config.json` with `defaultCostConfig()` fallback
- **`setBudget(ceiling, warningThreshold?)`** — sync; writes `cost_tracking.budget` and optional `warning_threshold` to `.planning/config.json`

## Test Results

`node --test tests/cost-tracker.test.cjs` — 7/7 pass, 0 fail.

```
✔ constructor does not throw
✔ record() writes entry to metrics.json
✔ aggregate() returns object with total, by_phase, by_provider keys
✔ aggregate().total.cost equals sum of all recorded cost_usd
✔ checkBudget() returns { status: "ok" } when total < warning threshold
✔ checkBudget() returns { status: "warning" } when total >= warning_threshold% of ceiling
✔ checkBudget() returns { status: "exceeded" } when total >= ceiling
```

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement CostTracker class | b67f107 | ez-agents/bin/lib/cost-tracker.cjs |

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

1. **No process.exit() in checkBudget** — The method is pure; callers (CLI commands) decide whether to print warnings, pause, or exit based on the returned status object.
2. **Sync vs async split** — `record()` is async (withLock), `aggregate()` and `checkBudget()` are sync (read-only, no locking needed).
3. **metricsPath pre-created by withLock** — `withLock` creates the file if absent; we only need to ensure the `.planning/` directory exists before calling it.

## Self-Check: PASSED

- ez-agents/bin/lib/cost-tracker.cjs: FOUND
- commit b67f107: FOUND
- node --test tests/cost-tracker.test.cjs: 7/7 PASS
