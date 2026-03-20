---
phase: 30
slug: gsd-gap-closure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) |
| **Config file** | none (node:test built-in, no config needed) |
| **Quick run command** | `node --test tests/crash-recovery.test.cjs tests/cost-tracker.test.cjs` |
| **Full suite command** | `node scripts/run-tests.cjs` |
| **Estimated runtime** | ~15 seconds (quick), ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run `node scripts/run-tests.cjs`
- **Before `/ez:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 1 | GSD-01 | unit | `node --test tests/crash-recovery.test.cjs` | ❌ W0 | ⬜ pending |
| 30-01-02 | 01 | 1 | GSD-02 | unit | `node --test tests/cost-tracker.test.cjs` | ❌ W0 | ⬜ pending |
| 30-01-03 | 01 | 1 | GSD-04 | unit | `node --test tests/lock-cli.test.cjs` | ❌ W0 | ⬜ pending |
| 30-02-01 | 02 | 2 | GSD-03 | integration | `node ez-agents/bin/ez-tools.cjs cost report` | ❌ W0 | ⬜ pending |
| 30-02-02 | 02 | 2 | GSD-05 | integration | `node ez-agents/bin/ez-tools.cjs doctor --json` | ✅ | ⬜ pending |
| 30-02-03 | 02 | 2 | GSD-06 | integration | `node ez-agents/bin/ez-tools.cjs cost-init --budget-ceiling=1` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/crash-recovery.test.cjs` — stubs for GSD-01, GSD-04
- [ ] `tests/cost-tracker.test.cjs` — stubs for GSD-02, GSD-03, GSD-06

*Existing infrastructure (node:test built-in) covers the framework — only test stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Budget ceiling stops operation mid-run | GSD-06 | Requires live AI call to reach threshold | Run `cost-init --budget-ceiling=0.01`, trigger any operation, verify pause |
| Lock file heartbeat keeps updating | GSD-04 | Requires real process + time delay | Create lock, sleep 6s, check `last_heartbeat` updated in auto.lock |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
