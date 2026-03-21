# Requirements: EZ Agents v4.0

**Defined:** 2026-03-21
**Core Value:** Prevent overheat/deadlock scenarios and optimize resource usage in AI agent orchestration.

---

## v4.0 Requirements

### P0 Critical Fixes (Do First)

- [ ] **NEST-01**: Implement max agent nesting depth limit (3 levels)
- [ ] **NEST-02**: Add error message with suggested fix when depth exceeded
- [ ] **NEST-03**: Track nesting depth in session metadata
- [ ] **CKPT-01**: Add timeout to checkpoint protocol (1 hour default)
- [ ] **CKPT-02**: Implement escalation path (slack → email → phone)
- [ ] **CKPT-03**: Add auto-advance fallback with warning flag
- [ ] **SESS-01**: Implement atomic session writes (temp file + rename)
- [ ] **SESS-02**: Add session backup on update (.bak file)
- [ ] **SESS-03**: Implement session version tracking
- [ ] **SESS-04**: Add type validation for session updates

### P1 High Priority Fixes

- [ ] **REV-01**: Implement smart revision loop with learning tracking
- [ ] **REV-02**: Add root cause analysis for revision failures
- [ ] **REV-03**: Implement early exit if quality degrading
- [ ] **REV-04**: Preserve learnings across iterations
- [ ] **LOCK-01**: Add deadlock detection to file lock manager
- [ ] **LOCK-02**: Replace busy-wait with exponential backoff
- [ ] **LOCK-03**: Implement lock timeout with proper error
- [ ] **CIRCUIT-01**: Apply circuit breaker to all agent spawns
- [ ] **CIRCUIT-02**: Add circuit breaker metrics/tracking

### P2 Optimizations

- [ ] **CTX-01**: Implement context relevance scoring
- [ ] **CTX-02**: Add context compression for large files
- [ ] **CTX-03**: Implement context deduplication
- [ ] **CTX-04**: Add context metadata (files included, compression ratio)
- [ ] **COST-01**: Implement cost tracking per phase/agent
- [ ] **COST-02**: Add budget threshold alerts (50%, 75%, 90%)
- [ ] **COST-03**: Implement model downgrade on budget pressure
- [ ] **WAVE-01**: Replace static wave assignment with dynamic computation
- [ ] **WAVE-02**: Add resource-aware parallelism (maxParallel config)
- [ ] **WAVE-03**: Implement failure handling in wave execution
- [ ] **ERR-01**: Implement unified error classification
- [ ] **ERR-02**: Add error caching for recurring error detection
- [ ] **ERR-03**: Implement root cause identification
- [ ] **GATE-01**: Implement quality gate checks (tests, lint, verification)
- [ ] **GATE-02**: Add quality gate blocking before commit
- [ ] **GATE-03**: Track quality gate pass/fail metrics

---

## v5.0 Requirements (Deferred)

### Cross-Agent Memory

- **MEM-01**: Implement shared memory layer per phase
- **MEM-02**: Add semantic search for relevant learnings
- **MEM-03**: Persist learnings to MEMORY.json

### Prompt Quality

- **PROMPT-01**: Implement prompt versioning system
- **PROMPT-02**: Add A/B testing for prompts
- **PROMPT-03**: Track prompt quality metrics

### Observability

- **OBS-01**: Implement real-time dashboard
- **OBS-02**: Add token cost tracking per phase
- **OBS-03**: Implement bottleneck detection

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Complete rewrite to ES modules | Too disruptive, defer to v5.0+ |
| Visual UI/dashboard | CLI-first workflow, out of scope |
| Real-time collaboration | Single-user context management |
| Database persistence | File-based state sufficient |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NEST-01 | Phase 40 | Pending |
| NEST-02 | Phase 40 | Pending |
| NEST-03 | Phase 40 | Pending |
| CKPT-01 | Phase 40 | Pending |
| CKPT-02 | Phase 40 | Pending |
| CKPT-03 | Phase 40 | Pending |
| SESS-01 | Phase 41 | Pending |
| SESS-02 | Phase 41 | Pending |
| SESS-03 | Phase 41 | Pending |
| SESS-04 | Phase 41 | Pending |
| LOCK-01 | Phase 41 | Pending |
| LOCK-02 | Phase 41 | Pending |
| LOCK-03 | Phase 41 | Pending |
| REV-01 | Phase 42 | Pending |
| REV-02 | Phase 42 | Pending |
| REV-03 | Phase 42 | Pending |
| REV-04 | Phase 42 | Pending |
| CTX-01 | Phase 43 | Pending |
| CTX-02 | Phase 43 | Pending |
| CTX-03 | Phase 43 | Pending |
| CTX-04 | Phase 43 | Pending |
| COST-01 | Phase 44 | Pending |
| COST-02 | Phase 44 | Pending |
| COST-03 | Phase 44 | Pending |
| CIRCUIT-01 | Phase 44 | Pending |
| CIRCUIT-02 | Phase 44 | Pending |
| WAVE-01 | Phase 45 | Pending |
| WAVE-02 | Phase 45 | Pending |
| WAVE-03 | Phase 45 | Pending |
| ERR-01 | Phase 46 | Pending |
| ERR-02 | Phase 46 | Pending |
| ERR-03 | Phase 46 | Pending |
| GATE-01 | Phase 46 | Pending |
| GATE-02 | Phase 46 | Pending |
| GATE-03 | Phase 46 | Pending |

**Coverage:**
- v4.0 requirements: 38 total
- Mapped to phases: 35
- Unmapped: 3 (CIRCUIT-01, CIRCUIT-02 added to Phase 44) ✓

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after initial definition*
