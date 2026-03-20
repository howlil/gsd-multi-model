# EZ Agents Multi-Model

## What This Is

**EZ Agents** is an AI App Builder — a system where an Orchestrator (Chief Strategist) understands project needs, decomposes work into a dependency-aware task graph, delegates to Specialist Agents in parallel, enforces quality gates, and produces implementation-ready output (code, tests, docs, release). Works for new projects, existing codebases, rapid MVPs, and enterprise-scale products. Stack-agnostic and requirement-driven.

## Core Value

Turn any project requirement into structured, parallel, auditable delivery — from MVP to enterprise scale.

## Requirements

### Validated

**v1.0 Shipped (2026-03-18):**
- ✓ LOG-01: Error logging infrastructure with levels — v1.0
- ✓ LOG-02: Logs write to `.planning/logs/ez-{timestamp}.log` — v1.0
- ✓ LOG-03: Replace silent `catch {}` blocks with proper logging — v1.0
- ✓ GRACE-01: Health check endpoint for ez-tools.cjs — v1.0
- ✓ GRACE-02: Fallback functions in workflows — v1.0
- ✓ GRACE-03: Timeout guards (5s max) for CLI calls — v1.0
- ✓ LOCK-01: File locking utility using proper-lockfile — v1.0
- ✓ LOCK-02: Deadlock detection (30s timeout) — v1.0
- ✓ TEMP-01: Secure temp file handler with fs.mkdtemp() — v1.0
- ✓ TEMP-02: Temp file cleanup on process exit — v1.0
- ✓ SEC-01: Replace execSync with execFile — v1.0
- ✓ SEC-02: Input validation for user-provided paths — v1.0
- ✓ SEC-03: Allowlist for shell commands — v1.0
- ✓ SEC-04: Path traversal prevention utility — v1.0
- ✓ SEC-05: Support for system keychain (keytar) — v1.0
- ✓ SEC-06: ez:auth command for credential management — v1.0
- ✓ AUDIT-01: Audit all execSync/spawn/exec calls — v1.0
- ✓ AUDIT-02: Audit log for all shell commands — v1.0
- ✓ GIT-01: Husky + lint-staged installation — v1.0
- ✓ GIT-02: Pre-commit hook for format/lint/test — v1.0
- ✓ GIT-03: Commit-msg hook for conventional commits — v1.0
- ✓ GIT-04: Gitleaks integration for secret detection — v1.0
- ✓ HOOK-01: Auto-add `.planning/` files — v1.0
- ✓ HOOK-02: Validate STATE.md consistency — v1.0
- ✓ HOOK-03: Check PLAN.md structure — v1.0
- ✓ GIT-UTIL-01: Git utility module with atomic commits — v1.0
- ✓ GIT-UTIL-02: Git status check before operations — v1.0
- ✓ BRANCH-01: Phase branch creation — v1.0
- ✓ BRANCH-02: Milestone branch creation — v1.0
- ✓ BRANCH-03: Auto-merge phase branches — v1.0
- ✓ BRANCH-04: Auto-squash merge milestone branches — v1.0
- ✓ COMMIT-01: Parse PLAN.md tasks for commit messages — v1.0
- ✓ COMMIT-02: Format: `<type>(scope): <description> [TASK-XX]` — v1.0
- ✓ PUSH-01: Pre-push validation — v1.0
- ✓ PUSH-02: Branch naming convention validation — v1.0
- ✓ FS-01: Cross-platform fs-utils (find replacement) — v1.0
- ✓ FS-02: Cross-platform grep replacement — v1.0
- ✓ FS-03: Cross-platform head/tail replacement — v1.0
- ✓ WIN-01: Windows path normalization — v1.0
- ✓ WIN-02: Handle drive letters (C:) — v1.0
- ✓ SHELL-01: Detect shell type — v1.0
- ✓ SHELL-02: Use appropriate syntax — v1.0
- ✓ CI-01: GitHub Actions matrix — v1.0
- ✓ CI-02: Test on Node 16, 18, 20 — v1.0
- ✓ CI-03: Block PRs that fail on any platform — v1.0
- ✓ MODEL-01: Model provider abstraction — v1.0
- ✓ MODEL-02: Support Anthropic (Claude) — v1.0
- ✓ MODEL-03: Support Moonshot (Kimi) — v1.0
- ✓ MODEL-04: Support Alibaba (Qwen) — v1.0
- ✓ MODEL-05: Support OpenAI — v1.0
- ✓ CONFIG-01: Extended config.json with provider selection — v1.0
- ✓ CONFIG-02: Model-specific parameters — v1.0
- ✓ CONFIG-03: Per-agent model overrides — v1.0
- ✓ TOOL-01: Tool/function calling adapter — v1.0
- ✓ TOOL-02: Map tool_use across providers — v1.0
- ✓ MCP-01: Context7 MCP adapter — v1.0
- ✓ MCP-02: Provider-specific MCP implementations — v1.0
- ✓ FALLBACK-01: Fallback when MCP not available — v1.0
- ✓ RETRY-01: Retry utility with exponential backoff — v1.0
- ✓ RETRY-02: Configurable max retries, delays — v1.0
- ✓ RETRY-03: Jitter to prevent thundering herd — v1.0
- ✓ ERR-CLASS-01: Error classification — v1.0
- ✓ ERR-CLASS-02: Network errors → retry — v1.0
- ✓ ERR-CLASS-03: API rate limits → retry — v1.0
- ✓ ERR-CLASS-04: Invalid input → fail immediately — v1.0
- ✓ CIRCUIT-01: Circuit breaker pattern — v1.0
- ✓ CIRCUIT-02: Open after N failures — v1.0
- ✓ CIRCUIT-03: Half-open after timeout — v1.0
- ✓ ERRMSG-01: User-friendly error messages — v1.0
- ✓ ERRMSG-02: Include suggested fixes — v1.0
- ✓ ERRMSG-03: Link to documentation — v1.0
- ✓ DEC-01: AI Assistant adapter interface — v1.0
- ✓ DEC-02: ClaudeCodeAdapter implementation — v1.0
- ✓ DEC-03: OpenCodeAdapter implementation — v1.0
- ✓ DEC-04: GeminiAdapter implementation — v1.0
- ✓ DEC-05: CodexAdapter implementation — v1.0
- ✓ CONFIG-DRV-01: Move hardcoded paths to config — v1.0
- ✓ CONFIG-DRV-02: Support custom `.planning` directory — v1.0
- ✓ PLUGIN-01: Plugin API for custom workflows — v1.0
- ✓ PLUGIN-02: Support third-party agents — v1.0
- ✓ HOOK-03: Hook system for lifecycle events — v1.0

**v1.1 Shipped (2026-03-18):**
- ✓ SEC-INT-01: Wire secure exec wrappers into git commit path — v1.1
- ✓ MODEL-RUNTIME-01: Connect provider config to runtime model resolution — v1.1
- ✓ RETRY-INTEGRATE-01: Integrate retry/circuit into model-provider HTTP calls — v1.1
- ✓ CONFIG-PATHS-01: Replace hardcoded .planning paths with config-driven resolution — v1.1
- ✓ PLUGIN-HOOK-01: Implement plugin lifecycle hook integration — v1.1

**v2.0 Shipped (2026-03-20):**
- ✓ PHASE-GIT-01 to PHASE-GIT-20: Phase-based GitFlow workflow engine — v2.0
- ✓ CONTEXT-01 to CONTEXT-08: Local file + URL context access with XSS scanning — v2.0
- ✓ PKG-01 to PKG-08: Package manager auto-detect (npm/yarn/pnpm) — v2.0
- ✓ SESSION-01 to SESSION-10: Cross-model session handoff and resume — v2.0
- ✓ CICD-01 to CICD-05, CICD-07 to CICD-10: GitHub Actions CI/CD pipeline — v2.0 (CICD-06 deferred)
- ✓ OBSERVE-01 to OBSERVE-10: Full observability stack (metrics, logs, traces, alerts) — v2.0
- ✓ RECOVER-01 to RECOVER-08: Backup automation, restore drills, incident runbooks — v2.0
- ✓ SECOPS-01 to SECOPS-08: Penetration testing, WAF, compliance templates — v2.0
- ✓ IAC-01 to IAC-08: Pulumi IaC templates, multi-environment, auto-scaling — v2.0
- ✓ GSD-17 to GSD-37: Fresh context, stuck detection, health check command — v2.0

### Active (v3.0 AI App Builder — "Improve Accuracy")

- [ ] ORCH-01 to ORCH-07: Orchestrator Core & Chief Strategist pattern
- [ ] INTAKE-01 to INTAKE-04: Intake & Triage layer
- [ ] CTXE-01 to CTXE-05: Context Engine enhancement (codebase mapping, stack detection)
- [ ] RQNM-01 to RQNM-06: Requirement Normalization engine
- [ ] GRAPH-01 to GRAPH-04: Task Graph Builder (DAG, parallel classification)
- [ ] MODE-01 to MODE-05: Operation Modes (Greenfield/MVP/Existing/Scale-up/Maintenance)
- [ ] POOL-01 to POOL-05: Specialist Agent Pool (layered, standardized output)
- [ ] GATE-01 to GATE-07: Quality Gates system (7 gates)
- [ ] RECON-01 to RECON-03: Reconciliation & cross-agent conflict resolution
- [ ] EDGE-01 to EDGE-06: Edge case handling (overengineering, hallucination, production bugs)

**Deferred from v2.0 (v2.1 backlog, tracked separately):**
- [ ] DEPLOY-01 to DEPLOY-10, PERF-01 to PERF-08, ANALYTICS-01 to ANALYTICS-06, COST-01 to COST-06, GSD-01 to GSD-16, CICD-06

### Out of Scope

- **Real-time collaboration features** — EZ Agents is single-user context management
- **Visual UI/dashboard** — CLI and AI assistant-first workflow
- **Database persistence** — File-based state in `.planning/`

## Context

### Actors

```
Orchestrator / Chief Strategist
  → understands target, forms plan, routes work, reconciles output

Specialist Agent Pool
  ├── Analyst Layer       — Business Analyst, System Analyst, Data Architect
  ├── Product Layer       — Product Strategist, Sprint Prioritizer, Experiment Tracker
  ├── Design Layer        — UX Researcher, UI Designer, Brand Consistency Agent
  ├── Engineering Layer   — Solution Architect, Backend, Frontend, Mobile, DevOps
  └── QA / Governance     — API Tester, Performance, Security, Release Manager

Shared State / Memory
  → requirement canon, ADRs, task status, API contracts, test evidence

Quality Gates
  → requirement completeness, architecture sanity, code quality, test coverage, security, docs, release readiness
```

### Workflow

```
Intake → Context Discovery → Requirement Normalization → Strategy & Architecture
→ Task Graph → Parallel Delegation → Integration & Reconciliation
→ Validation & Quality Gates → Release Preparation → Post-Release Loop
```

### Operation Modes

- **Greenfield Mode** — new project, stack selection, foundation
- **Existing Codebase Mode** — mapping, minimal-risk changes
- **Rapid MVP Mode** — fast delivery, functional core, low ceremony
- **Scale-up Mode** — modularity, observability, governance
- **Maintenance/Support Mode** — bug triage, hotfix, tech debt control

### Current State

**Current State:** v2.0 shipped. Starting v3.0 AI App Builder milestone. This project is the main EZ Agents package containing:
- 32 user-facing commands in `commands/`
- 12+ specialized agent definitions in `agents/`
- 35+ workflow orchestrations in `ez/workflows/`
- 26+ document templates in `ez/templates/`
- 500+ tests passing
- 29 phases shipped across 3 milestones

**Technical Environment:**
- Node.js 16+ CommonJS modules
- Cross-platform (Windows, macOS, Linux)
- Git-based workflow with atomic commits
- YAML frontmatter + XML-structured prompts for agents
- Multi-model support: Anthropic, Moonshot (Kimi), Alibaba (Qwen), OpenAI

**Shipped Milestones:**
- **v1.0 EZ Multi-Model** (shipped 2026-03-18): 8 phases, 34 plans, 89 requirements
- **v1.1 Gap Closure Sprint** (shipped 2026-03-18): 6 phases, 24 plans
- **v2.0 Full SDLC Coverage** (shipped 2026-03-20): 15 phases, 173 requirements

**Current Milestone:**
- **v3.0 AI App Builder** (started 2026-03-20): 8 phases, 52 requirements — Orchestrator pattern, specialist agents, quality gates, operation modes

## Constraints

- **Tech Stack**: CommonJS (require()), Node 16+ compatible — ES modules would require full refactor
- **Cross-Platform**: Must work on Windows (PowerShell, cmd.exe, Git Bash), macOS, Linux
- **Backwards Compatible**: Existing commands and workflows must not break
- **Size Limits**: Context files have strict line limits (PROJECT.md ~500, STATE.md ~100)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Thin orchestrator pattern | Commands → Workflows → Agents separation | ✓ Good — clean architecture |
| Fresh context per agent | Pass file paths, not content | ✓ Good — prevents context rot |
| Atomic commits per task | Traceable, reversible history | ✓ Good — enables precise rollbacks |
| YAML frontmatter + XML prompts | Structured for AI reasoning | ✓ Good — consistent agent behavior |
| ez-tools.cjs centralized CLI | Single source of truth for state ops | ✓ Good — reduces code duplication |
| Wave execution (parallel/sequential) | Dependency-aware plan execution | ✓ Good — optimizes wall-clock time |
| Nyquist validation contract | Per-phase validation with automated tests | ✓ Good — prevents regression |
| Multi-model provider abstraction | Decouple from single AI vendor | ✓ Good — flexibility, fallback options |
| Layered agent pool | Analyst/Product/Design/Engineering/QA tiers | ✓ Good — clear responsibility boundaries |
| 10-phase SDLC workflow | Intake → discovery → requirements → strategy → task graph → delegation → reconciliation → quality gates → release → post-release | ✓ Good — full delivery lifecycle |
| Operation modes (Greenfield/MVP/Scale-up/Maintenance) | Different project contexts need different ceremony levels | ✓ Good — right-sized process per situation |
| Anti-overengineering guardrails | Minimum ceremony for task complexity | ✓ Good — prevents process bloat |

---
*Last updated: 2026-03-20 after v3.0 milestone start — 29 phases shipped, 4 milestones total. v3.0 adds AI App Builder layer: Orchestrator, agent pool, quality gates, operation modes. 52 new requirements, 8 phases (30–37).*
