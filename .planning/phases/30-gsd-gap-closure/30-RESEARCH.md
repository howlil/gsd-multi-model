# Phase 30: GSD Gap Closure - Research

**Researched:** 2026-03-20
**Domain:** Node.js CommonJS CLI — crash recovery, cost tracking, health diagnostics
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GSD-01 | `crash-recovery.cjs` implemented — creates, heartbeats, detects orphaned, and releases lock files with real PID tracking | `process.pid`, `fs.writeFileSync`, `setInterval` heartbeat, stale-time orphan detection. All Node.js builtins. |
| GSD-02 | `cost-tracker.cjs` implemented — tracks real token usage and USD cost per phase/operation (not mock data) | JSON file persistence to `.planning/metrics.json`, config-driven rates from `.planning/config.json`, phase/milestone aggregation. |
| GSD-03 | `/ez:cost` command shows live data from cost-tracker (not hardcoded stubs) | Replace the hardcoded mock block in `ez-tools.cjs` case `'cost'` (lines 532–575) with real `CostTracker` calls. |
| GSD-04 | Lock file operations (create/heartbeat/release/detect-orphan) wired through real crash-recovery lib | New `case 'lock'` in `ez-tools.cjs` dispatching to `CrashRecovery` methods. |
| GSD-05 | Health check `doctor` command reports accurate live state (not stubbed responses) | Replace mock block in `ez-tools.cjs` case `'doctor'` (lines 457–530) with real `HealthCheck.runAll()` + new checks for git, API keys, dependencies. |
| GSD-06 | Budget ceiling enforcement and alert-threshold warnings functional end-to-end | `CostTracker.checkBudget()` reads `cost_tracking.budget` and `cost_tracking.warning_threshold` from `config.json`, writes warning/halt to stdout and optionally exits non-zero. |
</phase_requirements>

---

## Summary

Phase 30 is a pure wiring and lib-creation phase — no new user-facing features, no new command surface. The gap is that three things are missing from `ez-agents/bin/lib/`: `crash-recovery.cjs` and `cost-tracker.cjs` do not exist on disk, and the existing `health-check.cjs` class is incomplete for the `doctor` command's requirements. Meanwhile, `ez-tools.cjs` has two case blocks (`'doctor'`, `'cost'`) that return entirely hardcoded mock data and a `'recovery'` case that instantiates an undeclared `RecoveryManager` class (which would crash at runtime if called).

The work is: (1) create `crash-recovery.cjs` with PID-stamped lock files, heartbeat interval, orphan detection, and release; (2) create `cost-tracker.cjs` with JSON persistence to `.planning/metrics.json`, config-driven provider rates, phase/milestone aggregation, and budget enforcement; (3) replace the mock `'doctor'` block with real checks delegating to the extended `health-check.cjs`; (4) replace the mock `'cost'` block with real `CostTracker` calls; (5) add a `'lock'` case to `ez-tools.cjs` for GSD-04.

All lib files are Node.js 16+ CommonJS, cross-platform (Windows/macOS/Linux), and must not introduce new npm dependencies beyond what is already installed (`proper-lockfile`, `micromatch`).

**Primary recommendation:** Build the two new lib files first (`crash-recovery.cjs`, `cost-tracker.cjs`), then wire them into `ez-tools.cjs`, then fix the `doctor` case — in that order, since the doctor check depends on being able to load the new libs without errors.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js builtins (`fs`, `path`, `os`, `process`) | 16+ | File I/O, PID, platform paths | Zero install cost, already used everywhere in the codebase |
| `proper-lockfile` | ^4.1.2 | Advisory file locking | Already in `devDependencies`; used by `file-lock.cjs` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `logger.cjs` (internal) | — | Structured log output | All new lib files should use `new Logger()` for consistency |
| `config.cjs` (internal) | — | Read `.planning/config.json` | CostTracker reads `cost_tracking.*` keys; CrashRecovery reads `crash_recovery.*` stale time |
| `safe-path.cjs` (internal) | — | Path traversal prevention | Any user-supplied paths (phase filter, cwd override) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain JSON file for metrics | SQLite | JSON is adequate; SQLite would add a native dep incompatible with the no-new-deps constraint |
| `setInterval` heartbeat | `proper-lockfile` update option | `proper-lockfile` already has built-in `update` interval — use that for heartbeat rather than a manual interval |

**Installation:** No new packages needed. All dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure

```
ez-agents/bin/lib/
├── crash-recovery.cjs        # NEW — PID lock files, heartbeat, orphan detection
├── cost-tracker.cjs          # NEW — token/cost tracking, metrics.json, budget alerts
└── health-check.cjs          # EXTEND — add git, api-key, dependencies checks
```

### Pattern 1: PID-Stamped Lock File (crash-recovery.cjs)

**What:** Write a JSON lock file containing `{ pid, started, heartbeat, operation }` to `.planning/locks/<operation>.lock.json`. Heartbeat updates `heartbeat` timestamp via `proper-lockfile`'s `update` option. On next startup, detect orphans by checking if `pid` is still alive (`process.kill(pid, 0)` — throws if dead).

**When to use:** Any long-running CLI operation (phase execution, model call) can acquire a lock on startup and release on exit.

**Example:**
```js
// Source: Node.js docs — process.kill(pid, 0) for existence check (no signal sent)
function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false; // ESRCH = no such process
  }
}
```

**Cross-platform note:** `process.kill(pid, 0)` works on Windows (Node.js wraps it as `OpenProcess` check) since Node.js 16+. Confirmed in Node.js docs.

### Pattern 2: JSON Metrics Persistence (cost-tracker.cjs)

**What:** Read/write `.planning/metrics.json` atomically. Structure:
```json
{
  "version": "1.0",
  "entries": [
    {
      "timestamp": "ISO",
      "phase": 30,
      "milestone": "v2.1",
      "operation": "plan-phase",
      "provider": "claude",
      "model": "claude-sonnet-4-6",
      "input_tokens": 1234,
      "output_tokens": 567,
      "cost_usd": 0.012
    }
  ],
  "budget": {
    "ceiling": 50.00,
    "warning_threshold": 80
  }
}
```

**When to use:** Every time a model invocation cost is known. Also read by `cost` CLI command.

**Example write pattern:**
```js
// Source: existing pattern from state.cjs and config.cjs in this codebase
function saveMetrics(metricsPath, data) {
  fs.writeFileSync(metricsPath, JSON.stringify(data, null, 2), 'utf8');
}
```

### Pattern 3: Extend Existing health-check.cjs

**What:** The current `HealthCheck.runAll()` only checks static files. The `doctor` command needs to also check: git availability, API key env vars, installed npm dependencies, and optionally lock-file state.

**Example new check:**
```js
// Source: pattern from safe-exec.cjs in this codebase
checkGitAvailability() {
  try {
    const { execFileSync } = require('child_process');
    execFileSync('git', ['--version'], { stdio: 'pipe' });
    return true;
  } catch (e) {
    this.warnings.push('git not found in PATH');
    return false;
  }
}
```

**Cross-platform note:** Use `execFileSync('git', ...)` not `execSync('git ...')` — consistent with `safe-exec.cjs` pattern already in the codebase.

### Anti-Patterns to Avoid

- **Hardcoded mock blocks:** The existing `doctor` and `cost` case blocks are exactly this anti-pattern. Replace entirely — do not layer real data on top of mock output.
- **`RecoveryManager` usage in `recovery` case:** `RecoveryManager` is referenced but never imported in `ez-tools.cjs`. Before touching `recovery` case, confirm which lib file it should come from (likely a backup-manager lib, not crash-recovery). Do not conflate backup recovery with crash recovery.
- **`setInterval` without cleanup:** If CrashRecovery registers a heartbeat interval, it must be cleared in `release()` and on `process.exit` to avoid keeping the process alive.
- **Blocking `fs.readFileSync` inside heartbeat tick:** Heartbeat should only update a timestamp, not read/parse the full metrics file.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File locking | Custom `.lock` suffix + rename | `proper-lockfile` (already installed) | Handles stale detection, retries, cross-platform atomicity |
| Cost rate lookup | Hardcoded rate table in code | Rates from `config.json` `cost_tracking.rates` | Rates change; config is the right boundary |
| Budget threshold logic | Inline `if` chains | `CostTracker.checkBudget()` method | Reusable, testable, consistent alert format |
| Orphan PID detection | `fs.existsSync` only | `process.kill(pid, 0)` | Lock file may exist after clean shutdown; PID check is the correct signal |

**Key insight:** Node.js `process.kill(pid, 0)` is a 30-year Unix idiom. It sends no signal — just checks if the process exists. This is the correct primitive for orphan detection.

---

## Common Pitfalls

### Pitfall 1: `RecoveryManager` is Undeclared in ez-tools.cjs

**What goes wrong:** The `'recovery'` case in `ez-tools.cjs` calls `new RecoveryManager(cwd)` five times. `RecoveryManager` is never imported at the top of the file. The `recovery` subcommands would crash with `ReferenceError: RecoveryManager is not defined` if actually invoked.

**Why it happens:** The class was referenced anticipating a lib that was never created, and no test covers this case.

**How to avoid:** Phase 30 scope is `crash-recovery.cjs` (lock file ops), not backup recovery. Do not rename `crash-recovery.cjs` as `RecoveryManager` unless the backup case is also wired. Cleanest path: add the correct `require` at the top of `ez-tools.cjs` pointing to the lib that owns `RecoveryManager` (backup-manager or recovery-service), separate from `crash-recovery.cjs`.

**Warning signs:** Any test that calls `node ez-tools.cjs recovery backup` would fail immediately.

### Pitfall 2: `doctor` Case Calls `process.exit(2)` Unconditionally

**What goes wrong:** The current `doctor` implementation always calls `process.exit(2)` at line 529, regardless of actual health state. A passing health check would still exit with code 2 (warning). Tests checking exit code 0 would fail.

**Why it happens:** The mock was never meant to be correct — it just demonstrates the format.

**How to avoid:** The new `doctor` implementation must compute the real exit code from actual check results: 0 = healthy, 1 = unhealthy (errors), 2 = degraded (warnings only).

### Pitfall 3: Metrics File Race on Windows

**What goes wrong:** `.planning/metrics.json` may be read and written by multiple concurrent invocations (e.g., parallel agent execution). On Windows, `fs.writeFileSync` without locking can produce truncated or interleaved JSON.

**Why it happens:** Windows file locking semantics differ from Unix.

**How to avoid:** Use `file-lock.cjs`'s `withLock()` wrapper around all reads and writes to `metrics.json`. This is the existing pattern for `.planning/STATE.md`.

### Pitfall 4: Budget Alert Firing on Every CLI Call

**What goes wrong:** If `CostTracker.checkBudget()` is called on every `ez-tools cost` invocation without debouncing, a user who runs `ez-tools cost` frequently would see budget alerts on every call even after acknowledging them.

**Why it happens:** No "acknowledged" state — alert fires whenever total_cost > budget * threshold.

**How to avoid:** Alert is display-only (print warning to stdout). Do not exit non-zero just because the warning threshold is crossed — only exit non-zero when the hard ceiling is breached and `auto_pause: true` is set in config.

### Pitfall 5: Windows Path Separators in Lock File Names

**What goes wrong:** Using raw file paths as lock file names (e.g., `.planning/locks/C:\Users\...`) creates invalid file names on Windows.

**Why it happens:** Lock file names derived from CWD or operation name can contain colons or backslashes.

**How to avoid:** Slug-ify the operation name: `operation.replace(/[^a-zA-Z0-9-_]/g, '_')`. Use only the operation name (e.g., `phase-30-plan`), not the full path.

---

## Code Examples

Verified patterns from official sources and codebase conventions:

### Process Existence Check (Orphan Detection)

```js
// Source: Node.js docs — https://nodejs.org/api/process.html#processkillpid-signal
// Works on Windows (Node.js >=16) and Unix
function isProcessAlive(pid) {
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch (e) {
    if (e.code === 'ESRCH') return false; // No such process
    if (e.code === 'EPERM') return true;  // Process exists, no permission to signal
    return false;
  }
}
```

### Read Config with Defaults

```js
// Source: pattern from config.cjs in this codebase
function readCostConfig(cwd) {
  const configPath = require('path').join(cwd, '.planning', 'config.json');
  const fs = require('fs');
  if (!fs.existsSync(configPath)) return defaultCostConfig();
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return Object.assign(defaultCostConfig(), raw.cost_tracking || {});
  } catch (e) {
    return defaultCostConfig();
  }
}

function defaultCostConfig() {
  return {
    enabled: true,
    budget: null,
    warning_threshold: 80,
    auto_pause: false,
    rates: {
      'claude-3': { input: 0.003, output: 0.015 },
      'gpt-4':    { input: 0.03,  output: 0.06 },
      'qwen':     { input: 0.002, output: 0.006 },
      'kimi':     { input: 0.002, output: 0.006 }
    }
  };
}
```

### Atomic JSON Update (metrics.json)

```js
// Source: pattern from state.cjs in this codebase — read-modify-write
const { withLock } = require('./file-lock.cjs');

async function recordEntry(metricsPath, entry) {
  await withLock(metricsPath, async () => {
    const fs = require('fs');
    let data = { version: '1.0', entries: [] };
    if (fs.existsSync(metricsPath)) {
      try { data = JSON.parse(fs.readFileSync(metricsPath, 'utf8')); }
      catch (e) { /* corrupt — start fresh */ }
    }
    data.entries.push({ ...entry, timestamp: new Date().toISOString() });
    fs.writeFileSync(metricsPath, JSON.stringify(data, null, 2), 'utf8');
  });
}
```

### Aggregation (by phase, by provider)

```js
// Source: standard JS reduce pattern
function aggregate(entries) {
  return entries.reduce((acc, e) => {
    // by_phase
    if (!acc.by_phase[e.phase]) acc.by_phase[e.phase] = { cost: 0, tokens: 0 };
    acc.by_phase[e.phase].cost    += e.cost_usd || 0;
    acc.by_phase[e.phase].tokens  += (e.input_tokens || 0) + (e.output_tokens || 0);
    // by_provider
    if (!acc.by_provider[e.provider]) acc.by_provider[e.provider] = { cost: 0 };
    acc.by_provider[e.provider].cost += e.cost_usd || 0;
    // total
    acc.total.cost   += e.cost_usd || 0;
    acc.total.tokens += (e.input_tokens || 0) + (e.output_tokens || 0);
    return acc;
  }, { total: { cost: 0, tokens: 0 }, by_phase: {}, by_provider: {} });
}
```

### Replace doctor Mock with Real Checks

```js
// Source: existing health-check.cjs pattern
case 'doctor': {
  const fixFlag = args.includes('--fix');
  const jsonFlag = args.includes('--json');
  const HealthCheck = require('./lib/health-check.cjs');
  const health = new HealthCheck(cwd);
  const result = health.runAll(); // extended to check git, api keys, deps
  if (jsonFlag) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.status === 'healthy' ? 0 : result.status === 'degraded' ? 2 : 1);
  }
  // ... render human-readable output from result.checks ...
  process.exit(result.status === 'healthy' ? 0 : result.status === 'degraded' ? 2 : 1);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded mock in `doctor` case | Real `HealthCheck.runAll()` call | Phase 30 (this phase) | `doctor` returns accurate system state |
| Hardcoded mock in `cost` case | Real `CostTracker` reads from `metrics.json` | Phase 30 (this phase) | `/ez:cost` shows real token/cost data |
| No crash-recovery lib | `crash-recovery.cjs` with PID locks | Phase 30 (this phase) | Lock file ops callable from CLI |
| No cost-tracker lib | `cost-tracker.cjs` with JSON persistence | Phase 30 (this phase) | Token recording + budget enforcement |

**Deprecated/outdated:**
- `process.exit(2)` unconditional in `doctor`: replaced by computed exit code from real checks.
- Mock cost data block (lines 546–574 of ez-tools.cjs): replaced by CostTracker call.

---

## Open Questions

1. **What lib does `RecoveryManager` in the `recovery` case belong to?**
   - What we know: `recovery` case uses `new RecoveryManager(cwd)` 5 times; no import exists anywhere in the file.
   - What's unclear: Was this supposed to be a `backup-manager.cjs` (from Phase 22 disaster recovery)? Or should `crash-recovery.cjs` export `RecoveryManager`?
   - Recommendation: Check Phase 22 deliverables for a `backup-manager.cjs` or similar. If one exists, add the `require` at top of `ez-tools.cjs`. If not, scope is to NOT fix the `recovery` case in Phase 30 (it's backup recovery, not crash recovery) — document as a separate gap.

2. **Should `cost-tracker.cjs` record entries, or just read them?**
   - What we know: The CLI has no hook into actual AI model calls — those happen in external AI assistants (Claude Code, etc.). Token counts are not passed to `ez-tools.cjs` automatically.
   - What's unclear: Is Phase 30's scope to record entries from the CLI side, or to build the read/aggregate/display side only?
   - Recommendation: Build both read and write sides. The `cost-init` CLI route (described in additional context but not yet present in ez-tools.cjs) should initialize a metrics file. Manual or scripted recording via `ez-tools cost record --phase N --provider claude --input 1000 --output 500` covers the gap until model hooks exist.

3. **Does `health-check.cjs` need the extended checks added to the class, or only in the `doctor` case inline?**
   - What we know: `HealthCheck.runAll()` in `health-check.cjs` only checks files (node version, `.planning/` dir, config.json, STATE.md, ROADMAP.md, PROJECT.md, REQUIREMENTS.md).
   - What's unclear: Should the `doctor` case have inline logic for git/API key/dependency checks, or should `HealthCheck` be extended?
   - Recommendation: Extend `health-check.cjs` class — adds optional `cwd` constructor param so it can check within a project directory. This keeps the `doctor` case thin and testable.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test` + `node:assert`) |
| Config file | None — runner is `scripts/run-tests.cjs` which globs `tests/*.test.cjs` |
| Quick run command | `node scripts/run-tests.cjs` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GSD-01 | `crash-recovery.cjs` creates lock file with real PID | unit | `node --test tests/crash-recovery.test.cjs` | ❌ Wave 0 |
| GSD-01 | Heartbeat updates timestamp in lock file | unit | `node --test tests/crash-recovery.test.cjs` | ❌ Wave 0 |
| GSD-01 | `detectOrphan` returns true when PID is dead | unit | `node --test tests/crash-recovery.test.cjs` | ❌ Wave 0 |
| GSD-01 | `release` removes lock file and clears heartbeat | unit | `node --test tests/crash-recovery.test.cjs` | ❌ Wave 0 |
| GSD-02 | `cost-tracker.cjs` writes entry to `metrics.json` | unit | `node --test tests/cost-tracker.test.cjs` | ❌ Wave 0 |
| GSD-02 | Aggregation returns correct totals by phase and provider | unit | `node --test tests/cost-tracker.test.cjs` | ❌ Wave 0 |
| GSD-03 | `ez-tools cost` reads from `metrics.json`, not mock | integration | `node --test tests/cost-cli.test.cjs` | ❌ Wave 0 |
| GSD-03 | `ez-tools cost --json` returns real aggregated data | integration | `node --test tests/cost-cli.test.cjs` | ❌ Wave 0 |
| GSD-04 | `ez-tools lock create <op>` creates lock file with PID | integration | `node --test tests/lock-cli.test.cjs` | ❌ Wave 0 |
| GSD-04 | `ez-tools lock detect-orphan <op>` detects stale lock | integration | `node --test tests/lock-cli.test.cjs` | ❌ Wave 0 |
| GSD-04 | `ez-tools lock release <op>` removes lock file | integration | `node --test tests/lock-cli.test.cjs` | ❌ Wave 0 |
| GSD-05 | `ez-tools doctor` exits 0 on healthy system | integration | `node --test tests/doctor-cli.test.cjs` | ❌ Wave 0 |
| GSD-05 | `ez-tools doctor --json` returns real check values | integration | `node --test tests/doctor-cli.test.cjs` | ❌ Wave 0 |
| GSD-05 | `ez-tools doctor` does NOT hardcode API key status | integration | `node --test tests/doctor-cli.test.cjs` | ❌ Wave 0 |
| GSD-06 | Budget warning prints when cost exceeds threshold% | unit | `node --test tests/cost-tracker.test.cjs` | ❌ Wave 0 |
| GSD-06 | `ez-tools cost --budget N` persists ceiling to config | integration | `node --test tests/cost-cli.test.cjs` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/crash-recovery.test.cjs tests/cost-tracker.test.cjs`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/ez:verify-work`

### Wave 0 Gaps

- [ ] `tests/crash-recovery.test.cjs` — covers GSD-01 unit tests
- [ ] `tests/cost-tracker.test.cjs` — covers GSD-02 and GSD-06 unit tests
- [ ] `tests/cost-cli.test.cjs` — covers GSD-03 and GSD-06 CLI integration tests
- [ ] `tests/lock-cli.test.cjs` — covers GSD-04 CLI integration tests
- [ ] `tests/doctor-cli.test.cjs` — covers GSD-05 CLI integration tests

All test files follow the existing `node:test` + `helpers.cjs` `runEzTools` pattern established in `tests/verify-health.test.cjs`.

---

## Sources

### Primary (HIGH confidence)

- Node.js docs — `process.kill(pid, 0)` for process existence check: https://nodejs.org/api/process.html#processkillpid-signal
- Node.js docs — `node:test` built-in test runner: https://nodejs.org/api/test.html
- Codebase direct inspection:
  - `ez-agents/bin/ez-tools.cjs` lines 457–575 (mock `doctor` and `cost` blocks, confirmed by direct read)
  - `ez-agents/bin/lib/` directory listing (confirmed `crash-recovery.cjs` and `cost-tracker.cjs` absent)
  - `ez-agents/bin/lib/health-check.cjs` full read (confirmed checks limited to file existence)
  - `ez-agents/bin/lib/file-lock.cjs` (confirmed `proper-lockfile` integration and `process.pid` usage)
  - `package.json` (confirmed test runner, no SQLite dep, `proper-lockfile` already installed)
  - `.planning/config.json` (confirmed `cost_tracking` section absent — must be added)

### Secondary (MEDIUM confidence)

- Node.js `process.kill(pid, 0)` cross-platform behavior on Windows: documented behavior since Node.js 14+, consistent with Windows `OpenProcess` semantics.

### Tertiary (LOW confidence)

- None.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all required libraries already installed; no new deps needed
- Architecture: HIGH — patterns traced directly from existing codebase (`file-lock.cjs`, `state.cjs`, `config.cjs`, `health-check.cjs`)
- Pitfalls: HIGH — `RecoveryManager` undeclared reference and `process.exit(2)` unconditional confirmed by direct code inspection
- Open questions: MEDIUM — `RecoveryManager` origin requires checking Phase 22 deliverables before wiring

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable Node.js builtins; config shape is project-internal)
