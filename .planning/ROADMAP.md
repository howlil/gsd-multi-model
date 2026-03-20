# Roadmap: EZ Agents Multi-Model

## Overview

EZ Agents is a meta-prompting, context engineering, and spec-driven development system for AI coding assistants. The project provides structured context management, multi-agent orchestration, and atomic git workflows to prevent context rot in AI-assisted development.

## Milestones

- ✅ **v1.0 EZ Multi-Model** — Phases 1–8 (shipped 2026-03-18)
- ✅ **v1.1 Gap Closure Sprint** — Phases 9–14 (shipped 2026-03-18)
- ✅ **v2.0 Full SDLC Coverage** — Phases 15–29 (shipped 2026-03-20)
- ◆ **v3.0 AI App Builder** — Phases 30–37 (started 2026-03-20)

See `.planning/milestones/` for full archives.

## Phases

<details>
<summary>✅ v1.0 EZ Multi-Model (Phases 1–8) — SHIPPED 2026-03-18</summary>

- [x] Phase 1: Foundation & Safety Nets (4/4 plans) — completed 2026-03-17
- [x] Phase 2: Security Hardening (4/4 plans) — completed 2026-03-17
- [x] Phase 3: Git Workflow & Pre-commit Automation (6/6 plans) — completed 2026-03-17
- [x] Phase 4: Cross-Platform Compatibility (4/4 plans) — completed 2026-03-17
- [x] Phase 5: Multi-Model Support (4/4 plans) — completed 2026-03-17
- [x] Phase 6: Error Handling & Retry Logic (4/4 plans) — completed 2026-03-17
- [x] Phase 7: Decoupling & Modularity (4/4 plans) — completed 2026-03-17
- [x] Phase 8: Gap Closure — Foundation & Safety Nets (6/6 plans) — completed 2026-03-18

</details>

<details>
<summary>✅ v1.1 Gap Closure Sprint (Phases 9–14) — SHIPPED 2026-03-18</summary>

- [x] Phase 9: Gap Closure — Security Hardening (4/4 plans) — completed 2026-03-18
- [x] Phase 10: Gap Closure — Git Workflow & Hooks (4/4 plans) — completed 2026-03-18
- [x] Phase 11: Gap Closure — Cross-Platform Compatibility (4/4 plans) — completed 2026-03-18
- [x] Phase 12: Gap Closure — Multi-Model Runtime Wiring (4/4 plans) — completed 2026-03-18
- [x] Phase 13: Gap Closure — Retry, Circuit Breaker & Error UX (4/4 plans) — completed 2026-03-18
- [x] Phase 14: Gap Closure — Decoupling, Plugins & Config Paths (4/4 plans) — completed 2026-03-18

</details>

<details>
<summary>✅ v2.0 Full SDLC Coverage (Phases 15–29) — SHIPPED 2026-03-20</summary>

- [x] Phase 15: Phase-Based Git Workflow — completed 2026-03-19
- [x] Phase 16: Context & File Access — completed 2026-03-19
- [x] Phase 17: Package Manager Flexibility — completed 2026-03-19
- [x] Phase 18: Session Memory & Model Continuity — completed 2026-03-20
- [x] Phase 19: Deployment & Operations — completed 2026-03-20 ⚠️ known gaps (DEPLOY-01 to DEPLOY-10)
- [x] Phase 20: CI/CD Pipeline Automation — completed 2026-03-20 (CICD-06 deferred)
- [x] Phase 21: Observability & Monitoring — completed 2026-03-20
- [x] Phase 22: Disaster Recovery & Business Continuity — completed 2026-03-20
- [x] Phase 23: Security Operations — completed 2026-03-20
- [x] Phase 24: Infrastructure as Code — completed 2026-03-20
- [x] Phase 25: Performance Engineering — completed 2026-03-20 ⚠️ PERF-05 to PERF-08 deferred
- [x] Phase 26: Documentation Automation — completed 2026-03-20
- [x] Phase 27: Product Analytics & Feedback — completed 2026-03-20 ⚠️ ANALYTICS-02 to ANALYTICS-06 deferred
- [x] Phase 28: Cost Optimization / FinOps — completed 2026-03-20 ⚠️ COST-02 to COST-06 deferred
- [x] Phase 29: GSD-2 Reliability Patterns — completed 2026-03-20 ⚠️ GSD-01 to GSD-16 CLI wiring deferred

</details>

### 📋 v3.0 AI App Builder — "Improve Accuracy" (Active)

**Started:** 2026-03-20 | **Phases:** 30–37 | **Requirements:** 52

- [ ] Phase 30: Orchestrator Core & Intake Layer — Chief Strategist pattern, work classification, mode routing
- [ ] Phase 31: Context Engine Enhancement — codebase mapping, stack detection, debt hotspots
- [ ] Phase 32: Requirement Normalization Engine — informal → structured, NFR, acceptance criteria
- [ ] Phase 33: Task Graph Builder — DAG generation, parallel classification, execution models
- [ ] Phase 34: Operation Modes — Greenfield/Existing/MVP/Scale-up/Maintenance flows
- [ ] Phase 35: Specialist Agent Pool — layered agents with standardized output format
- [ ] Phase 36: Quality Gates System — 7-gate enforcement (requirement to release)
- [ ] Phase 37: Reconciliation & Edge Cases — cross-agent consistency, overengineering/hallucination guards

**Phase Details:**

**Phase 30: Orchestrator Core & Intake Layer**
Goal: Establish the Chief Strategist pattern and work intake/triage system
Requirements: ORCH-01–07, INTAKE-01–04
Success criteria:
1. Orchestrator meta-prompt defines Chief Strategist role clearly
2. Any work input is classified into one of 8 work types within intake workflow
3. Scale (tiny→enterprise) and risk (low→critical) scores are produced
4. System routes to correct operation mode automatically
5. Anti-overengineering rules are enforced in plan/execute workflows

**Phase 31: Context Engine Enhancement**
Goal: System understands existing codebase before proposing any changes
Requirements: CTXE-01–05
Success criteria:
1. Existing project flow triggers codebase mapping before planning
2. Stack and framework detected from project files without user prompt
3. Technical debt hotspots identified in context report
4. Project context report includes architecture snapshot and dependency map
5. Greenfield flow produces actor map and business flow diagram

**Phase 32: Requirement Normalization Engine**
Goal: Any informal brief can be transformed into structured, testable requirements
Requirements: RQNM-01–06
Success criteria:
1. Informal brief produces functional requirements in user-centric format
2. NFRs (performance, security, compliance) extracted automatically
3. Constraints documented with rationale
4. Each requirement has acceptance criteria (observable behavior)
5. Out-of-scope list generated with reasoning
6. Unresolved questions flagged and assigned

**Phase 33: Task Graph Builder**
Goal: Phase objectives decompose into dependency-aware, execution-optimized task DAGs
Requirements: GRAPH-01–04
Success criteria:
1. Phase objective → task DAG with explicit dependency edges
2. Every task has complete metadata (input/output/dependency/priority/owner/criteria)
3. Parallel-eligible tasks are identified and marked
4. Execution model selected per phase with justification

**Phase 34: Operation Modes**
Goal: System selects right-sized workflow for any project type
Requirements: MODE-01–05
Success criteria:
1. Greenfield project triggers stack selection and foundation planning
2. Existing codebase triggers mapping-first, minimal-risk flow
3. MVP request triggers strict scope enforcement and low-ceremony flow
4. Scale-up request triggers modularity and governance checklist
5. Maintenance request triggers triage and hotfix path

**Phase 35: Specialist Agent Pool**
Goal: Domain expertise available via well-defined specialist agents
Requirements: POOL-01–05
Success criteria:
1. 7 core agent definitions exist and are usable
2. Analyst Layer agents defined (Business Analyst, System Analyst, Data Architect)
3. Engineering Layer agents defined (Solution Architect, Backend, Frontend, Mobile, DevOps)
4. QA/Governance Layer agents defined (API Tester, Security Reviewer, Reality Checker, Release Manager)
5. All agents use standardized output template

**Phase 36: Quality Gates System**
Goal: Consistent quality enforcement at every delivery milestone
Requirements: GATE-01–07
Success criteria:
1. Requirement completeness gate blocks planning if acceptance criteria missing
2. Architecture sanity gate checks complexity proportionality
3. Code quality gate integrated into execute workflow
4. Test coverage gate verifies critical paths
5. Security gate checks auth, secrets, injection
6. Documentation gate verifies setup/API/decisions/known-issues
7. Release readiness gate confirms rollback plan and monitoring

**Phase 37: Reconciliation & Edge Cases**
Goal: Multi-agent system produces consistent output and handles failure modes gracefully
Requirements: RECON-01–03, EDGE-01–06
Success criteria:
1. API contract vs implementation validated at integration checkpoint
2. Cross-agent output checked for design/backend/frontend/QA alignment
3. Conflicts generate targeted revision requests to affected agents
4. Ambiguous requirements trigger assumption list rather than guessing
5. Overengineering patterns detected and flagged
6. Agents produce facts/assumptions/decisions distinction in output

## Progress

| Phase | Milestone | Status | Completed |
|-------|-----------|--------|-----------|
| 1–8 | v1.0 | ✅ Complete | 2026-03-17/18 |
| 9–14 | v1.1 | ✅ Complete | 2026-03-18 |
| 15–29 | v2.0 | ✅ Complete (with known gaps) | 2026-03-19/20 |
