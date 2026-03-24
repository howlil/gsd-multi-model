# Roadmap: EZ Agents

## v4.1 Roadmap (Phase Locking Mechanism)

**Milestone:** v4.1 Phase Locking Mechanism
**Goal:** Prevent multiple agents from working on the same phase concurrently (tumpang tindih)
**Phases:** 47-51 (5 phases)
**Requirements:** 10 total

---

### Phase 47: Core Phase Lock Implementation

**Goal:** Create phase-lock.cjs with basic lock/unlock functionality

**Requirements:**
- PLOCK-01: Phase lock acquisition with agent ID and session tracking
- PLOCK-02: Phase lock release on phase completion
- PLOCK-03: Lock file structure in `.planning/locks/phase-{N}.lock.json`

**Lock File Structure:**
```json
{
  "phase": "47",
  "status": "active",
  "agent_id": "ez-backend-agent",
  "agent_name": "Backend Agent",
  "acquired_at": "2026-03-24T10:30:00.000Z",
  "last_heartbeat": "2026-03-24T10:30:00.000Z",
  "expires_at": "2026-03-24T11:30:00.000Z",
  "milestone": "v4.1",
  "session_id": "session-20260324-103000"
}
```

**Success Criteria:**
1. Lock file created on acquire
2. Lock file removed on release
3. Lock metadata includes agent ID, session ID, timestamps
4. Lock acquisition fails if lock already exists (not stale)

**Estimated Cost:** $4.00

---

### Phase 48: Heartbeat & Stale Detection

**Goal:** Implement heartbeat mechanism and stale lock auto-release

**Requirements:**
- PLOCK-04: Stale lock detection and auto-release (90-min timeout)
- PLOCK-05: Heartbeat mechanism to prevent stale locks (5-min interval)

**Success Criteria:**
1. Heartbeat updates `last_heartbeat` and `expires_at`
2. Stale locks (>90 min without heartbeat) auto-released
3. Stale detection runs on lock acquisition attempt
4. Warning logged when stale lock detected

**Estimated Cost:** $3.00

---

### Phase 49: Lock State Integration

**Goal:** Integrate lock state into STATE.md and logging

**Requirements:**
- PLOCK-06: Lock state visible in STATE.md
- PLOCK-07: Lock operations logged to `.planning/logs/`

**Success Criteria:**
1. STATE.md shows "Lock Status: Locked by {agent-id}"
2. STATE.md shows "Lock Expires: YYYY-MM-DD HH:MM"
3. All lock operations (acquire, heartbeat, release) logged
4. Logs include timestamp, agent ID, phase, result

**Estimated Cost:** $3.00

---

### Phase 50: Agent Pool Integration

**Goal:** Integrate phase lock checks into agent assignment

**Requirements:**
- PLOCK-08: Integration with agent-pool.cjs for assignment checks

**Success Criteria:**
1. Agent assignment checks phase lock before proceeding
2. Blocked agents receive clear conflict message
3. Conflict message includes holder agent ID and expiry time
4. Agent can optionally wait for lock release

**Error Message Example:**
```
Phase 47 is locked by ez-backend-agent
Lock expires: 2026-03-24 11:30:00
Options:
  1. Wait for lock release (max 30 min)
  2. Skip this phase
  3. Force acquire (if lock is stale)
```

**Estimated Cost:** $4.00

---

### Phase 51: Workflow Integration & Tests

**Goal:** Integrate into workflow commands and add comprehensive tests

**Requirements:**
- PLOCK-09: Integration with workflow commands (execute-phase, plan-phase)
- PLOCK-10: Tests for acquire, release, heartbeat, stale detection

**Workflow Commands:**
```bash
# Acquire lock at phase start
node ez-tools.cjs phase-lock acquire \
  --phase "47" \
  --agent "ez-backend-agent" \
  --session "session-20260324-103000"

# Heartbeat during phase work
node ez-tools.cjs phase-lock heartbeat \
  --phase "47"

# Release lock at phase completion
node ez-tools.cjs phase-lock release \
  --phase "47"
```

**Test Coverage:**
1. `acquire()` — success, conflict, stale recovery
2. `release()` — success, not-found, already-released
3. `heartbeat()` — success, expired, not-found
4. `isLocked()` — true, false, stale
5. `getLockInfo()` — returns lock metadata
6. Concurrent acquisition (race condition handling)

**Estimated Cost:** $5.00

---

## v4.0 Roadmap (Production Hardening & Optimization) — ✅ Complete

**Milestone:** v4.0 Production Hardening & Optimization
**Goal:** Prevent overheat/deadlock scenarios and optimize resource usage
**Phases:** 40-46 (7 phases)
**Requirements:** 38 total

---

### Phase 40: Agent Nesting & Checkpoint Fixes

**Goal:** Implement P0 critical fixes for agent nesting and checkpoint timeouts

**Requirements:**
- NEST-01, NEST-02, NEST-03: Agent nesting depth limit
- CKPT-01, CKPT-02, CKPT-03: Checkpoint timeout with escalation

**Success Criteria:**
1. Agent spawning fails with clear error when nesting > 3
2. Checkpoints timeout after 1 hour with escalation
3. No indefinite blocking on missing user response

**Estimated Cost:** $5.00

---

### Phase 41: Session State & File Locking

**Goal:** Implement atomic session writes and deadlock-free file locking

**Requirements:**
- SESS-01, SESS-02, SESS-03, SESS-04: Atomic session writes with versioning
- LOCK-01, LOCK-02, LOCK-03: File lock with deadlock detection

**Success Criteria:**
1. Session writes use atomic temp+rename pattern
2. Session backup created before updates
3. Deadlock detected and prevented in file locks
4. Lock wait uses exponential backoff (not busy-wait)

**Estimated Cost:** $6.00

---

### Phase 42: Smart Revision Loops

**Goal:** Implement learning-based revision loops with early exit

**Requirements:**
- REV-01, REV-02, REV-03, REV-04: Smart revision loop with learning

**Success Criteria:**
1. Revision iterations track learnings
2. Root cause analysis performed on failures
3. Early exit when quality degrading
4. Learnings preserved across iterations

**Estimated Cost:** $5.00

---

### Phase 43: Context Optimization

**Goal:** Implement intelligent context management

**Requirements:**
- CTX-01, CTX-02, CTX-03, CTX-04: Context scoring, compression, dedup

**Success Criteria:**
1. Files scored by relevance to task
2. Large files compressed when possible
3. Duplicate content deduplicated
4. Context metadata tracked

**Estimated Cost:** $7.00

---

### Phase 44: Cost Tracking & Circuit Breaker

**Goal:** Implement cost control and cascading failure prevention

**Requirements:**
- COST-01, COST-02, COST-03: Cost tracking with alerts
- CIRCUIT-01, CIRCUIT-02: Circuit breaker on agent spawns

**Success Criteria:**
1. Cost tracked per phase and agent
2. Alerts at 50%, 75%, 90% budget thresholds
3. Circuit breaker trips after 5 failures
4. Model downgrade on budget pressure

**Estimated Cost:** $5.00

---

### Phase 45: Dynamic Wave Execution

**Goal:** Replace static wave assignment with dynamic computation

**Requirements:**
- WAVE-01, WAVE-02, WAVE-03: Dynamic wave execution

**Success Criteria:**
1. Waves computed dynamically based on dependencies
2. Resource-aware parallelism (configurable maxParallel)
3. Failures handled without blocking entire wave

**Estimated Cost:** $6.00

---

### Phase 46: Error Handling & Quality Gates

**Goal:** Implement unified error handling and quality gates

**Requirements:**
- ERR-01, ERR-02, ERR-03: Unified error handling
- GATE-01, GATE-02, GATE-03: Quality gates

**Success Criteria:**
1. Errors classified by type and severity
2. Recurring errors cached and detected
3. Quality gates block commits on failure
4. Quality metrics tracked

**Estimated Cost:** $6.00

---

## Progress Summary

### v4.1 Progress

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 47 | Core Phase Lock Implementation | 3 | Pending |
| 48 | Heartbeat & Stale Detection | 2 | Pending |
| 49 | Lock State Integration | 2 | Pending |
| 50 | Agent Pool Integration | 1 | Pending |
| 51 | Workflow Integration & Tests | 2 | Pending |

**Total:** 5 phases, 10 requirements

### v4.0 Progress

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 40 | Agent Nesting & Checkpoint | 6 | ✅ Complete |
| 41 | Session State & File Locking | 7 | ✅ Complete |
| 42 | Smart Revision Loops | 4 | ✅ Complete |
| 43 | Context Optimization | 4 | ✅ Complete |
| 44 | 1/1 | Complete   | 2026-03-24 |
| 45 | Dynamic Wave Execution | 3 | ✅ Complete |
| 46 | Error Handling & Quality Gates | 6 | ✅ Complete |

**Total:** 7 phases, 38 requirements — ✅ Complete

---

## Budget

### v4.1 Budget

| Category | Estimated |
|----------|-----------|
| Core Implementation (Phase 47) | $4.00 |
| Heartbeat & Stale (Phase 48) | $3.00 |
| State Integration (Phase 49) | $3.00 |
| Agent Pool Integration (Phase 50) | $4.00 |
| Workflow & Tests (Phase 51) | $5.00 |
| **Total** | **$19.00** |

Budget Ceiling: $25.00
Alert Threshold: $20.00 (80%)

### v4.0 Budget (Actual)

| Category | Estimated | Spent |
|----------|-----------|-------|
| P0 Critical Fixes (Phase 40-41) | $11.00 | $10.50 |
| P1 High Priority (Phase 42-43) | $12.00 | $11.00 |
| P2 Optimizations (Phase 44-46) | $17.00 | $16.50 |
| **Total** | **$40.00** | **$38.00** |

Budget Ceiling: $50.00 ✅
Final Spend: $38.00 (under budget)

---

## Configuration

Add to `planning-config.md`:

```json
{
  "phase_lock": {
    "enabled": true,
    "timeout_minutes": 60,
    "heartbeat_interval_minutes": 5,
    "stale_threshold_minutes": 90,
    "max_retries": 3,
    "retry_delay_seconds": 10
  }
}
```

---

## Related Milestones

- **v1.0 LOCK-01, LOCK-02:** File locking infrastructure (proper-lockfile)
- **v2.0 SESSION-01 to SESSION-10:** Cross-model session handoff
- **v2.0 PHASE-GIT-01 to PHASE-GIT-20:** Phase-based GitFlow
- **v4.0:** Production hardening (agent nesting, checkpoint timeout)

---

*Roadmap created: 2026-03-21 (v4.0)*
*Last updated: 2026-03-24 — Added v4.1 Phase Locking (5 phases, 10 requirements)*
