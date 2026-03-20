# Requirements: EZ Agents — v2.1 Gap Closure

**Defined:** 2026-03-20
**Core Value:** Turn any project requirement into structured, parallel, auditable delivery — from MVP to enterprise scale.

---

## v2.1 Requirements (Active)

Closing known gaps deferred from v2.0. All lib files confirmed missing on disk.

### GSD — Crash Recovery & Cost Tracking

- [ ] **GSD-01**: `crash-recovery.cjs` implemented — creates, heartbeats, detects orphaned, and releases lock files with real PID tracking
- [x] **GSD-02**: `cost-tracker.cjs` implemented — tracks real token usage and USD cost per phase/operation (not mock data)
- [ ] **GSD-03**: `/ez:cost` command shows live data from cost-tracker (not hardcoded stubs)
- [ ] **GSD-04**: Lock file operations (create/heartbeat/release/detect-orphan) wired through real crash-recovery lib
- [ ] **GSD-05**: Health check `doctor` command reports accurate live state (not stubbed responses)
- [x] **GSD-06**: Budget ceiling enforcement and alert-threshold warnings functional end-to-end

### DEPLOY — Deployment Operations

- [ ] **DEPLOY-01**: `deploy-detector.cjs` detects target deployment environment automatically (Vercel, Railway, Fly.io, EC2, etc.)
- [ ] **DEPLOY-02**: `deploy-runner.cjs` executes one-command deploy with pre-deploy validation gate
- [ ] **DEPLOY-03**: `deploy-rollback.cjs` rolls back to previous stable version on command or failure
- [ ] **DEPLOY-04**: `deploy-status.cjs` polls deployment status and reports result with logs
- [ ] **DEPLOY-05**: Multi-environment deploy support (dev/staging/prod) with environment-specific config
- [ ] **DEPLOY-06**: `ez-tools deploy` CLI command wires all deploy lib files with environment flag support
- [ ] **DEPLOY-07**: Pre-deploy validation runs tests + lint before allowing deploy execution
- [ ] **DEPLOY-08**: Deploy audit log written to `.planning/logs/deploy-{timestamp}.log`
- [ ] **DEPLOY-09**: Post-deploy health check verifies deployment success
- [ ] **DEPLOY-10**: `/ez:deploy` command with progress display and rollback option

### PERF — Performance Tooling

- [ ] **PERF-01**: Performance CLI commands reachable via `ez-tools perf` (route wiring for existing lib stubs)
- [ ] **PERF-02**: `perf-analyzer.cjs` — core performance analysis coordinator
- [ ] **PERF-03**: `db-optimizer.cjs` — query analysis and index recommendations
- [ ] **PERF-04**: `frontend-performance.cjs` — bundle size and render analysis
- [ ] **PERF-05**: `api-monitor.cjs` — endpoint latency tracking with baseline storage
- [ ] **PERF-06**: `regression-detector.cjs` — performance regression detection vs. stored baseline
- [ ] **PERF-07**: Performance reports written to `.planning/logs/perf-{timestamp}.json`
- [ ] **PERF-08**: `/ez:perf` command with subcommands (analyze, baseline, compare, report)

### ANALYTICS — Product Analytics

- [ ] **ANALYTICS-01**: `analytics-collector.cjs` — feature usage event collection and local storage
- [ ] **ANALYTICS-02**: `nps-tracker.cjs` — NPS survey prompt and score tracking
- [ ] **ANALYTICS-03**: `funnel-analyzer.cjs` — user funnel step tracking and drop-off analysis
- [ ] **ANALYTICS-04**: `cohort-analyzer.cjs` — cohort-based usage pattern analysis
- [ ] **ANALYTICS-05**: `analytics-reporter.cjs` — aggregated analytics report generation
- [ ] **ANALYTICS-06**: `ez-tools analytics` CLI command wires all analytics lib with report output

### COST — FinOps & Budget Management

- [ ] **COST-01**: Budget alerts fully wired — real thresholds trigger warnings (not mock alerts)
- [ ] **COST-02**: `finops-analyzer.cjs` — cloud resource cost analysis and rightsizing recommendations
- [ ] **COST-03**: `budget-enforcer.cjs` — enforces spending limits and auto-pauses over-budget operations
- [ ] **COST-04**: `cost-reporter.cjs` — cost breakdown by phase/operation/provider with trend analysis
- [ ] **COST-05**: `spot-manager.cjs` — spot/preemptible instance management recommendations
- [ ] **COST-06**: `/ez:cost` extended with FinOps subcommands (budget, report, rightsizing)

---

## v3.0 Requirements (Future — deferred, not in v2.1 roadmap)

These requirements were defined for v3.0 AI App Builder. Phases 30–37 will resume after v2.1 completes.
Phase numbers will be renumbered after v2.1 is scoped.

### ORCH — Orchestrator Core
- [ ] **ORCH-01** through **ORCH-07**: Chief Strategist pattern, work classification, anti-overengineering guardrails, trade-off reports

### INTAKE — Intake & Triage
- [ ] **INTAKE-01** through **INTAKE-04**: Diverse input types, normalization, risk scoring, mode recommendation

### CTXE — Context Engine Enhanced
- [ ] **CTXE-01** through **CTXE-05**: Codebase mapping, stack detection, tech debt, project report, business flow

### RQNM — Requirement Normalization
- [ ] **RQNM-01** through **RQNM-06**: Brief→requirements, NFRs, constraints, acceptance criteria, out-of-scope, open questions

### GRAPH — Task Graph Builder
- [ ] **GRAPH-01** through **GRAPH-04**: Dependency DAG, task metadata schema, parallel classification, execution model selection

### MODE — Operation Modes
- [ ] **MODE-01** through **MODE-05**: Greenfield, Existing Codebase, Rapid MVP, Scale-up, Maintenance flows

### POOL — Specialist Agent Pool
- [ ] **POOL-01** through **POOL-05**: Core 7 agents, Analyst/Engineering/QA layers, standardized output template

### GATE — Quality Gates
- [ ] **GATE-01** through **GATE-07**: Requirements completeness, architecture sanity, code quality, test coverage, security, docs, release readiness

### RECON + EDGE — Reconciliation & Edge Cases
- [ ] **RECON-01** through **RECON-03**: API contract validation, output reconciliation, conflict resolution
- [ ] **EDGE-01** through **EDGE-06**: Ambiguity detection, requirement conflict, overengineering, NFR underengineering, production bug routing, hallucination prevention

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Visual UI / dashboard | CLI and AI assistant-first workflow — no GUI planned |
| Real-time collaboration | Single-user context management — no multi-user session support |
| Database persistence | File-based state in `.planning/` is the design constraint |
| Full LLM training | System improves agent accuracy via prompting/structure, not fine-tuning |
| Cloud-hosted agents | Self-contained CLI — no cloud agent service |
| CICD-06 (container scanning) | Explicitly deferred — low severity |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| GSD-01 | Phase 30 | Pending |
| GSD-02 | Phase 30 | Complete |
| GSD-03 | Phase 30 | Pending |
| GSD-04 | Phase 30 | Pending |
| GSD-05 | Phase 30 | Pending |
| GSD-06 | Phase 30 | Complete |
| DEPLOY-01 | Phase 31 | Pending |
| DEPLOY-02 | Phase 31 | Pending |
| DEPLOY-03 | Phase 31 | Pending |
| DEPLOY-04 | Phase 31 | Pending |
| DEPLOY-05 | Phase 31 | Pending |
| DEPLOY-06 | Phase 31 | Pending |
| DEPLOY-07 | Phase 31 | Pending |
| DEPLOY-08 | Phase 31 | Pending |
| DEPLOY-09 | Phase 31 | Pending |
| DEPLOY-10 | Phase 31 | Pending |
| PERF-01 | Phase 32 | Pending |
| PERF-02 | Phase 32 | Pending |
| PERF-03 | Phase 32 | Pending |
| PERF-04 | Phase 32 | Pending |
| PERF-05 | Phase 32 | Pending |
| PERF-06 | Phase 32 | Pending |
| PERF-07 | Phase 32 | Pending |
| PERF-08 | Phase 32 | Pending |
| ANALYTICS-01 | Phase 33 | Pending |
| ANALYTICS-02 | Phase 33 | Pending |
| ANALYTICS-03 | Phase 33 | Pending |
| ANALYTICS-04 | Phase 33 | Pending |
| ANALYTICS-05 | Phase 33 | Pending |
| ANALYTICS-06 | Phase 33 | Pending |
| COST-01 | Phase 33 | Pending |
| COST-02 | Phase 33 | Pending |
| COST-03 | Phase 33 | Pending |
| COST-04 | Phase 33 | Pending |
| COST-05 | Phase 33 | Pending |
| COST-06 | Phase 33 | Pending |

**Coverage:**
- v2.1 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after v2.1 milestone start — gap closure sprint for v2.0 backlog*
