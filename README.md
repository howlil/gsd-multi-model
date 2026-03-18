<div align="center">

# EZ Agents

**Meta-prompting & Agent Orchestration for AI-Assisted Development**

[![GitHub forks](https://img.shields.io/github/forks/howlil/ez-agents?style=for-the-badge&logo=github&color=blue)](https://github.com/howlil/ez-agents/network)
[![GitHub stars](https://img.shields.io/github/stars/howlil/ez-agents?style=for-the-badge&logo=github&color=yellow)](https://github.com/howlil/ez-agents/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![npm](https://img.shields.io/npm/v/@howlil/ez-agents?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@howlil/ez-agents)

```bash
npm install -g git+https://github.com/howlil/ez-agents.git
```

**Supports:** Claude Code · OpenCode · Gemini CLI · Codex · Copilot · Qwen · Kimi

[Features](#features) · [Installation](#installation) · [Workflow](#workflow) · [Commands](#commands) · [Configuration](#configuration) · [Contributing](#contributing) · [User Guide](docs/USER-GUIDE.md)

</div>

---

> **Note:** EZ Agents is an independent fork of the original project by [TÂCHES](https://github.com/glittercowboy). This fork is not affiliated with the upstream repository. See [Acknowledgments](#acknowledgments) for details.

---

## Feature Comparison

### EZ Agents vs. Upstream Baseline

| Feature | Upstream Baseline | EZ Agents (Fork) |
|---------|----------------|------------------|
| **AI Providers** | Anthropic only | ✓ Anthropic, Qwen, Kimi, OpenAI |
| **Security** | Basic | ✓ Command allowlist, path validation, audit log, secret protection |
| **Error Handling** | Basic | ✓ Retry with backoff, circuit breaker, timeout handling |
| **Cross-Platform** | Unix commands (find, grep, head, tail) | ✓ Pure JavaScript (Windows-safe) |
| **Git Safety** | Direct git calls | ✓ Atomic commits, branch automation, merge strategies |
| **Updates** | Manual npm update | ✓ `ez-agents-update` command with changelog |
| **Credential Storage** | Plain text config | ✓ System keychain (keytar) + encrypted fallback |
| **Assistant Support** | Claude Code | ✓ Claude Code, OpenCode, Gemini, Codex, Copilot |
| **Codebase Mapping** | Basic | ✓ Parallel mapper agents with structured output |
| **Milestone Audit** | Manual verification | ✓ Automated requirements coverage check |
| **Wave Execution** | Sequential | ✓ Dependency-aware parallel execution |
| **Context Limits** | Fixed | ✓ Dynamic limits based on quality degradation points |

### New Libraries (17 Additions)

```
ez-agents/bin/lib/
├── safe-exec.cjs         # Command injection prevention (allowlist + validation)
├── safe-path.cjs         # Path traversal prevention
├── auth.cjs              # Secure credential storage (keytar + fallback)
├── audit-exec.cjs        # Command audit logging (.planning/logs/)
├── git-utils.cjs         # Safe git operations (atomic commits, branch automation)
├── fs-utils.cjs          # Cross-platform file utils (find/grep/head/tail replacement)
├── retry.cjs             # Exponential backoff retry logic
├── circuit-breaker.cjs   # Prevent cascading failures
├── model-provider.cjs    # Multi-model API abstraction
├── assistant-adapter.cjs # AI assistant abstraction (Claude/OpenCode/Gemini/Codex)
├── logger.cjs            # Centralized logging (ERROR/WARN/INFO/DEBUG)
├── health-check.cjs      # Environment validation
├── timeout-exec.cjs      # Command timeout with fallback
├── file-lock.cjs         # Concurrent write protection
├── temp-file.cjs         # Secure temp file handling
├── index.cjs             # Central library export
└── update.js             # ez-agents-update command
```

### Multi-Model Configuration Example

```json
{
  "provider": {
    "default": "alibaba",
    "anthropic": {
      "api_key": "env:ANTHROPIC_API_KEY",
      "models": { "opus": "claude-3-opus-20240229", "sonnet": "claude-3-sonnet-20240229" }
    },
    "alibaba": {
      "api_key": "env:DASHSCOPE_API_KEY",
      "models": { "high": "qwen-max", "balanced": "qwen-plus" }
    },
    "moonshot": {
      "api_key": "env:MOONSHOT_API_KEY",
      "models": { "high": "moonshot-v1-128k" }
    },
    "openai": {
      "api_key": "env:OPENAI_API_KEY",
      "models": { "high": "gpt-4-turbo-preview" }
    }
  },
  "agent_overrides": {
    "ez-planner": { "provider": "alibaba", "model": "qwen-max" },
    "ez-executor": { "provider": "anthropic", "model": "sonnet" },
    "ez-verifier": { "provider": "moonshot", "model": "balanced" }
  }
}
```

---

## Overview

EZ Agents is a context engineering layer that transforms AI coding assistants from reactive code generators into reliable development partners. It orchestrates specialized AI agents through a structured workflow: requirements gathering, research, planning, execution, and verification.

### Key Capabilities

- **Multi-Model Support** — Anthropic, Qwen (Alibaba), Kimi (Moonshot), OpenAI
- **Context Engineering** — Automatic state management across sessions
- **Parallel Agent Execution** — Wave-based task parallelization with dependency resolution
- **Atomic Git Commits** — Per-task commits with meaningful messages
- **Cross-Platform** — Windows, macOS, Linux (pure JavaScript, no Unix dependencies)
- **Security** — Command injection prevention, path validation, audit logging

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Model** | Configure different AI providers per agent (Qwen, Kimi, OpenAI, Anthropic) |
| **Agent Orchestration** | Thin orchestrator spawns specialized agents, collects results, routes to next step |
| **Wave Execution** | Dependency-aware parallel execution with fresh context per plan |
| **Milestone Management** | Versioned releases with audit, archive, and git tagging |
| **Codebase Mapping** | Parallel mapper agents analyze stack, architecture, conventions |
| **Context Files** | PROJECT.md, STATE.md, SUMMARY.md maintain memory across sessions |
| **XML Prompts** | Structured task definitions with verification criteria |
| **Error Handling** | Retry with exponential backoff, circuit breaker for failing operations |

---

## Installation

### Prerequisites

- Node.js >= 16.7.0
- One of: Claude Code, OpenCode, Gemini CLI, Codex, Copilot

### Install from GitHub (Recommended)

```bash
# Install globally
npm install -g git+https://github.com/howlil/ez-agents.git

# Setup for your runtime
ez-agents --claude --global    # Claude Code
ez-agents --opencode --global  # OpenCode
ez-agents --gemini --global    # Gemini CLI
ez-agents --codex --global     # Codex
ez-agents --all --global       # All runtimes
```

### Install from npm

```bash
npm install -g @howlil/ez-agents
ez-agents --claude --global
```

### Development Installation

```bash
git clone https://github.com/howlil/ez-agents.git
cd ez-agents
npm install -g .
ez-agents --claude --local
```

### Update

```bash
ez-agents-update
ez-agents-update --force  # Force reinstall
```

---

## Workflow

### Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         EZ AGENTS COMPLETE WORKFLOW                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                            ┌─────────────────────┐
                                            │   START PROJECT     │
                                            └─────────┬───────────┘
                                                      │
                              ┌───────────────────────┴───────────────────────┐
                              │                                               │
                              ▼                                               ▼
                    ┌───────────────────┐                         ┌───────────────────┐
                    │  GREENFIELD       │                         │   BROWNFIELD      │
                    │  (No code yet)    │                         │  (Existing code)  │
                    └─────────┬─────────┘                         └─────────┬─────────┘
                              │                                             │
                              │                                             ▼
                              │                                   ┌───────────────────┐
                              │                                   │  /ez:map-codebase │
                              │                                   │                   │
                              │                                   │ Parallel mappers: │
                              │                                   │ - STACK.md        │
                              │                                   │ - ARCHITECTURE.md │
                              │                                   │ - CONVENTIONS.md  │
                              │                                   │ - STRUCTURE.md    │
                              │                                   │ - INTEGRATIONS.md │
                              │                                   │ - TESTING.md      │
                              │                                   │ - CONCERNS.md     │
                              │                                   └─────────┬─────────┘
                              │                                             │
                              └───────────────────────┬─────────────────────┘
                                                      │
                                                      ▼
                                            ┌───────────────────┐
                                            │  /ez:new-project  │
                                            │                   │
                                            │ 1. Questions      │
                                            │ 2. Research       │
                                            │ 3. Requirements   │
                                            │ 4. Roadmap        │
                                            └─────────┬─────────┘
                                                      │
                                                      ▼
                                            ┌───────────────────┐
                                            │  MILESTONE v1.0   │
                                            │  (or v1.1, v2.0)  │
                                            └─────────┬─────────┘
                                                      │
         ┌────────────────────────────────────────────┼────────────────────────────────────────────┐
         │                                            │                                            │
         ▼                                            ▼                                            ▼
┌───────────────────┐                        ┌───────────────────┐                        ┌───────────────────┐
│  PHASE 1          │                        │  PHASE 2          │                        │  PHASE N          │
│                   │                        │                   │                        │                   │
│ ┌───────────────┐ │                        │ ┌───────────────┐ │                        │ ┌───────────────┐ │
│ │/ez:discuss    │ │                        │ │/ez:discuss    │ │                        │ │/ez:discuss    │ │
│ │-phase 1       │ │                        │ │-phase 2       │ │                        │ │-phase N       │ │
│ └───────┬───────┘ │                        │ └───────┬───────┘ │                        │ └───────┬───────┘ │
│         │         │                        │         │         │                        │         │         │
│         ▼         │                        │         ▼         │                        │         ▼         │
│ ┌───────────────┐ │                        │ ┌───────────────┐ │                        │ ┌───────────────┐ │
│ │/ez:plan       │ │                        │ │/ez:plan       │ │                        │ │/ez:plan       │ │
│ │-phase 1       │ │                        │ │-phase 2       │ │                        │ │-phase N       │ │
│ └───────┬───────┘ │                        │ └───────┬───────┘ │                        │ └───────┬───────┘ │
│         │         │                        │         │         │                        │         │         │
│         ▼         │                        │         ▼         │                        │         ▼         │
│ ┌───────────────┐ │                        │ ┌───────────────┐ │                        │ ┌───────────────┐ │
│ │/ez:execute    │ │                        │ │/ez:execute    │ │                        │ │/ez:execute    │ │
│ │-phase 1       │ │                        │ │/ez:execute    │ │                        │ │-phase N       │ │
│ └───────┬───────┘ │                        │ │-phase 2       │ │                        │ └───────┬───────┘ │
│         │         │                        │ └───────┬───────┘ │                        │         │         │
│         ▼         │                        │         │         │                        │         ▼         │
│ ┌───────────────┐ │                        │         ▼         │                        │ ┌───────────────┐ │
│ │/ez:verify     │ │                        │ ┌───────────────┐ │                        │ │/ez:verify     │ │
│ │-work 1        │ │                        │ │/ez:verify     │ │                        │ │-work N        │ │
│ └───────────────┘ │                        │ │-work 2        │ │                        │ └───────────────┘ │
│                   │                        │ └───────────────┘ │                        │                   │
└───────────────────┘                        └───────────────────┘                        └───────────────────┘
         │                                            │                                            │
         └────────────────────────────────────────────┴────────────────────────────────────────────┘
                                                      │
                                                      ▼
                                            ┌───────────────────┐
                                            │ /ez:audit-        │
                                            │ milestone         │
                                            │                   │
                                            │ ✓ Requirements    │
                                            │   coverage        │
                                            │ ✓ Cross-phase     │
                                            │   integration     │
                                            │ ✓ E2E flows       │
                                            └─────────┬─────────┘
                                                      │
                              ┌───────────────────────┴───────────────────────┐
                              │                                               │
                              ▼                                               ▼
                    ┌───────────────────┐                         ┌───────────────────┐
                    │   AUDIT PASS      │                         │   AUDIT FAIL      │
                    └─────────┬─────────┘                         └─────────┬─────────┘
                              │                                             │
                              ▼                                             ▼
                    ┌───────────────────┐                         ┌───────────────────┐
                    │ /ez:complete-     │                         │ /ez:plan-milestone│
                    │ milestone         │                         │ -gaps             │
                    │                   │                         │                   │
                    │ - Archive to      │                         │ Create fix phases │
                    │   milestones/     │                         │                   │
                    │ - Git tag v1.0    │                         │ Back to phase loop│
                    │ - Collapse ROADMAP│                         │                   │
                    └─────────┬─────────┘                         └───────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ /ez:new-milestone │
                    │                   │
                    │ Start v1.1, v2.0  │
                    │ (back to top)     │
                    └───────────────────┘
```

---

### Architecture: Agent Orchestration

```
┌─────────────────────────────────────────────────────────────────┐
│                    EZ Agents Orchestrator                        │
├─────────────────────────────────────────────────────────────────┤
│  Thin coordinator that spawns specialized agents, collects       │
│  results, and routes to the next step. Never does heavy lifting. │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ ez-planner    │   │ ez-executor     │   │ ez-verifier     │
│ ez-researcher │   │ ez-debugger     │   │ ez-auditor      │
│ ez-mapper     │   │ ez-checker      │   │ ez-roadmapper   │
└───────────────┘   └─────────────────┘   └─────────────────┘
```

---

### Phase Execution: Wave Model

Plans are grouped into waves based on dependencies. Independent plans run in parallel; dependent plans wait for prerequisites.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         PHASE EXECUTION: WAVE MODEL                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

Wave 1 (parallel)                    Wave 2 (parallel)                    Wave 3 (sequential)
┌─────────────────┐                  ┌─────────────────┐                  ┌─────────────────┐
│ ┌─────────────┐ │                  │ ┌─────────────┐ │                  │ ┌─────────────┐ │
│ │   Plan 01   │ │                  │ │   Plan 03   │ │                  │ │   Plan 05   │ │
│ │             │ │                  │ │             │ │                  │ │             │ │
│ │ User Model  │ │                  │ │ Orders API  │ │                  │ │ Checkout UI │ │
│ │ + Auth      │ │                  │ │             │ │                  │ │             │ │
│ └─────────────┘ │                  │ └─────────────┘ │                  │ └─────────────┘ │
│                 │       ┌──────────│                 │       ┌──────────│                 │
│ ┌─────────────┐ │       │          │ ┌─────────────┐ │       │          │ ┌─────────────┐ │
│ │   Plan 02   │ │       │          │ │   Plan 04   │ │       │          │ │   Plan 06   │ │
│ │             │ │       │          │ │             │ │       │          │ │             │ │
│ │ Product     │ │       │          │ │ Cart API    │ │       │          │ │ Payment     │ │
│ │ Model       │ │       │          │ │             │ │       │          │ │ Integration │ │
│ └─────────────┘ │       │          │ └─────────────┘ │       │          │ └─────────────┘ │
└─────────────────┘       │          └─────────────────┘       │          └─────────────────┘
        │                 │                    │                │                    │
        │                 │                    │                │                    │
        └─────────────────┴────────────────────┴────────────────┘                    │
        Dependencies:                                                                 │
        - Plan 03 needs Plan 01 (Orders API needs User Model)                        │
        - Plan 04 needs Plan 02 (Cart API needs Product Model)                       │
        - Plan 05 needs Plans 03 + 04 (Checkout needs Orders + Cart)                 │
        - Plan 06 needs Plan 05 (Payment needs Checkout)                             │
```

---

### Use Case: Greenfield Project (From Scratch)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         GREENFIELD PROJECT WORKFLOW                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ User Story   │ "I want to build a task management app with team collaboration"
└──────┬───────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ MILESTONE 1: MVP (v1.0)                                                                                          │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │ PHASE 1: Foundation                                                                                        │ │
│  │                                                                                                             │ │
│  │  /ez:discuss-phase 1                                                                                        │ │
│  │  ├── Clarify: Tech stack preferences? → "Next.js + PostgreSQL"                                              │ │
│  │  ├── Clarify: Auth method? → "Email + OAuth (Google, GitHub)"                                               │ │
│  │  └── Output: 1-CONTEXT.md                                                                                   │ │
│  │                                                                                                             │ │
│  │  /ez:plan-phase 1                                                                                           │ │
│  │  ├── Research: Next.js auth patterns, PostgreSQL schema design                                              │ │
│  │  ├── Plans: 1-01-user-auth.md, 1-02-database-schema.md, 1-03-project-setup.md                               │ │
│  │  └── Output: 1-RESEARCH.md, 3 PLAN files                                                                    │ │
│  │                                                                                                             │ │
│  │  /ez:execute-phase 1                                                                                        │ │
│  │  ├── Wave 1: Plan 1-02 (schema), Plan 1-03 (setup) [parallel]                                               │ │
│  │  ├── Wave 2: Plan 1-01 (auth) [depends on schema]                                                           │ │
│  │  └── Output: 3 SUMMARY.md files, 3 atomic commits                                                           │ │
│  │                                                                                                             │ │
│  │  /ez:verify-work 1                                                                                          │ │
│  │  ├── Test: Can register/login? ✓                                                                            │ │
│  │  ├── Test: Can connect to DB? ✓                                                                             │ │
│  │  └── Output: 1-VERIFICATION.md, 1-UAT.md                                                                    │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │ PHASE 2: Core Features                                                                                     │ │
│  │  (Same discuss → plan → execute → verify loop)                                                              │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │ PHASE 3: Team Collaboration                                                                                │ │
│  │  (Same discuss → plan → execute → verify loop)                                                              │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ /ez:audit-milestone                                                                                              │
│ ✓ All requirements covered                                                                                       │
│ ✓ Cross-phase integration verified                                                                               │
│ ✓ E2E flows working                                                                                              │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ /ez:complete-milestone v1.0                                                                                      │
│ ├── Archive: milestones/v1.0-ROADMAP.md, milestones/v1.0-REQUIREMENTS.md                                         │
│ ├── Git tag: v1.0                                                                                                │
│ └── Collapse: ROADMAP.md (one-line summary)                                                                      │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ /ez:new-milestone v1.1 "Advanced Features"                                                                       │
│ └── Back to phase loop for new features                                                                          │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Use Case: Brownfield Project (Existing Codebase)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         BROWNFIELD PROJECT WORKFLOW                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ User Story   │ "I want to add a notification system to my existing e-commerce app"
└──────┬───────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: MAP CODEBASE                                                                                             │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                   │
│  /ez:map-codebase                                                                                                 │
│                                                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │ Parallel Mapper Agents (spawn 4 agents simultaneously):                                                     │ │
│  │                                                                                                             │ │
│  │  Agent 1: Tech Focus          Agent 2: Architecture Focus                                                   │ │
│  │  ├── STACK.md                 ├── ARCHITECTURE.md                                                           │ │
│  │  └── INTEGRATIONS.md          └── STRUCTURE.md                                                              │ │
│  │                                                                                                             │ │
│  │  Agent 3: Quality Focus       Agent 4: Concerns Focus                                                       │ │
│  │  ├── CONVENTIONS.md           └── CONCERNS.md                                                               │ │
│  │  └── TESTING.md                                                                                             │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                                   │
│  Output: .planning/codebase/ (7 structured documents)                                                            │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: INITIALIZE PROJECT (uses codebase map)                                                                   │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                   │
│  /ez:new-project                                                                                                  │
│                                                                                                                   │
│  ├── Read: .planning/codebase/*.md (understand existing stack, patterns, concerns)                                │
│  ├── Questions: "What notification types?" → "Email, SMS, push"                                                   │
│  ├── Research: Notification service providers, delivery patterns                                                  │
│  ├── Requirements: v1.1 notification features                                                                     │
│  └── Roadmap: Phases for notification implementation                                                              │
│                                                                                                                   │
│  Output: PROJECT.md (updated), REQUIREMENTS.md, ROADMAP.md, STATE.md                                              │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: PHASE LOOP (same as greenfield)                                                                          │
│                                                                                                                   │
│  For each phase: discuss → plan → execute → verify                                                                │
│                                                                                                                   │
│  Key difference: Planner reads codebase map to ensure plans match existing patterns                               │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Use Case: Quick Task (Ad-hoc)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         QUICK TASK WORKFLOW                                                        │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ User Story   │ "Add a dark mode toggle to settings page"
└──────┬───────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ /ez:quick [--full] [--discuss]                                                                                   │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                   │
│  Standard Mode (default):                                                                                         │
│  ├── Planner: Create plan (skip research, skip plan-checker)                                                      │
│  ├── Executor: Implement with atomic commits                                                                      │
│  └── Output: .planning/quick/001-dark-mode-toggle/PLAN.md, SUMMARY.md                                             │
│                                                                                                                   │
│  With --full:                                                                                                     │
│  ├── Add plan-checker verification                                                                                │
│  └── Add verifier after execution                                                                                 │
│                                                                                                                   │
│  With --discuss:                                                                                                  │
│  ├── Gather context first (preferences, implementation details)                                                   │
│  └── Pass context to planner                                                                                      │
│                                                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

Use cases:
- Bug fixes
- Small features
- Configuration changes
- One-off tasks
```

---

### Use Case: Milestone with Audit Gaps

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         MILESTONE AUDIT WITH GAPS                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

All phases completed
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ /ez:audit-milestone v1.0                                                                                         │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                   │
│  Audit Checks:                                                                                                    │
│  ├── ✓ Requirements coverage: 45/48 requirements met                                                              │
│  ├── ✓ Cross-phase integration: All phase boundaries verified                                                     │
│  └── ✗ E2E flows: 3 flows incomplete                                                                              │
│                                                                                                                   │
│  Gaps Identified:                                                                                                 │
│  ├── REQ-023: Password reset email not implemented                                                                │
│  ├── REQ-041: Search results pagination missing                                                                   │
│  └── FLOW-003: Checkout flow fails at payment step                                                                │
│                                                                                                                   │
│  Output: v1.0-MILESTONE-AUDIT.md (status: gaps_found)                                                             │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ /ez:plan-milestone-gaps                                                                                          │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                   │
│  Creates fix phases:                                                                                              │
│  ├── Phase 8: Password reset implementation                                                                       │
│  ├── Phase 9: Search pagination                                                                                   │
│  └── Phase 10: Payment flow fix                                                                                   │
│                                                                                                                   │
│  Output: Updated ROADMAP.md with new phases                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Back to Phase Loop                                                                                               │
│                                                                                                                   │
│  /ez:discuss-phase 8 → /ez:plan-phase 8 → /ez:execute-phase 8 → /ez:verify-work 8                                 │
│  /ez:discuss-phase 9 → /ez:plan-phase 9 → /ez:execute-phase 9 → /ez:verify-work 9                                 │
│  /ez:discuss-phase 10 → /ez:plan-phase 10 → /ez:execute-phase 10 → /ez:verify-work 10                             │
│                                                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Re-run Audit                                                                                                     │
│                                                                                                                   │
│  /ez:audit-milestone v1.0 → status: passed                                                                        │
│                                                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Complete Milestone                                                                                               │
│                                                                                                                   │
│  /ez:complete-milestone v1.0                                                                                      │
│                                                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Use Case: Debug Session

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         DEBUG SESSION WORKFLOW                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

Issue discovered during verification
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ /ez:debug "Login fails with 500 error"                                                                           │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                   │
│  Debug Agent spawns:                                                                                              │
│  ├── 1. Reproduce: Attempt login, capture error                                                                   │
│  ├── 2. Investigate: Check logs, trace request flow                                                               │
│  ├── 3. Identify: Find root cause (e.g., missing env var, DB connection)                                          │
│  └── 4. Document: Create DEBUG.md with findings                                                                   │
│                                                                                                                   │
│  Output: .planning/debug/001-login-500-error/DEBUG.md                                                             │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Fix Plan Created                                                                                                 │
│                                                                                                                   │
│  ├── Plan: Fix login endpoint (add missing JWT_SECRET env var handling)                                           │
│  └── Ready for: /ez:execute-phase (with fix plan)                                                                 │
│                                                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Quick Start

```bash
# Install
npm install -g git+https://github.com/howlil/ez-agents.git

# Setup for your runtime
ez-agents --claude --global

# Start (in your runtime: Claude Code, OpenCode, Gemini, etc.)
/ez:help
```

### Basic Usage

**Greenfield (New Project):**
```bash
/ez:new-project          # Initialize: questions → research → requirements → roadmap
/ez:discuss-phase 1      # Capture implementation decisions
/ez:plan-phase 1         # Research + create plans
/ez:execute-phase 1      # Execute plans in waves
/ez:verify-work 1        # User acceptance testing
```

**Brownfield (Existing Codebase):**
```bash
/ez:map-codebase         # Analyze existing code first
/ez:new-project          # Initialize (uses codebase map)
# Continue with phase loop above
```

**Quick Tasks:**
```bash
/ez:quick                # Ad-hoc tasks without full planning
```

See [Workflow](#workflow) for complete diagrams and [Commands](#commands) for full reference.

---

## Commands

### Core Workflow

| Command | Description |
|---------|-------------|
| `/ez:new-project [--auto]` | Initialize: questions → research → requirements → roadmap |
| `/ez:discuss-phase [N]` | Capture implementation decisions before planning |
| `/ez:plan-phase [N]` | Research + plan + verify for a phase |
| `/ez:execute-phase <N>` | Execute plans in waves, verify on completion |
| `/ez:verify-work [N]` | User acceptance testing for a phase |
| `/ez:audit-milestone` | Verify milestone achieved definition of done |
| `/ez:complete-milestone <version>` | Archive milestone, tag release |
| `/ez:new-milestone [name]` | Start next version cycle |

### Codebase Analysis

| Command | Description |
|---------|-------------|
| `/ez:map-codebase [area]` | Analyze codebase with parallel mapper agents |

### Phase Management

| Command | Description |
|---------|-------------|
| `/ez:add-phase` | Append phase to roadmap |
| `/ez:insert-phase [N]` | Insert urgent work between phases |
| `/ez:remove-phase [N]` | Remove future phase, renumber |
| `/ez:list-phase-assumptions [N]` | Review intended approach before planning |
| `/ez:plan-milestone-gaps` | Create phases to close audit gaps |

### Session Management

| Command | Description |
|---------|-------------|
| `/ez:pause-work` | Create handoff when stopping mid-phase |
| `/ez:resume-work` | Restore from last session |
| `/ez:progress` | Current status and next steps |

### Utilities

| Command | Description |
|---------|-------------|
| `/ez:help` | Show all commands and usage guide |
| `/ez:settings` | Configure model profile and workflow agents |
| `/ez:set-profile <profile>` | Switch model profile (quality/balanced/budget) |
| `/ez:add-todo [desc]` | Capture idea for later |
| `/ez:check-todos` | List pending todos |
| `/ez:debug [desc]` | Systematic debugging with persistent state |
| `/ez:quick [--full] [--discuss]` | Execute ad-hoc task with EZ Agents guarantees |
| `/ez:health [--repair]` | Validate `.planning/` directory integrity |
| `/ez:update` | Update EZ Agents with changelog preview |

---

## Project Structure

### Generated Files

| File | Purpose |
|------|---------|
| `.planning/PROJECT.md` | Project vision and current state |
| `.planning/REQUIREMENTS.md` | Scoped requirements with phase traceability |
| `.planning/ROADMAP.md` | Phase structure and completion status |
| `.planning/STATE.md` | Decisions, blockers, position (session memory) |
| `.planning/config.json` | Workflow preferences and model configuration |
| `.planning/research/` | Domain research documents |
| `.planning/codebase/` | Codebase analysis (stack, architecture, conventions) |
| `.planning/phases/` | Phase plans and summaries |
| `.planning/milestones/` | Archived milestone artifacts |

### Context Documents

| Document | Content |
|----------|---------|
| `STACK.md` | Tech stack, versions, rationale |
| `ARCHITECTURE.md` | Patterns, layers, data flow |
| `STRUCTURE.md` | Folder structure, key files |
| `CONVENTIONS.md` | Coding standards, linting, formatting |
| `INTEGRATIONS.md` | External APIs, services, databases |
| `TESTING.md` | Test framework, coverage, patterns |
| `CONCERNS.md` | Tech debt, gotchas, performance issues |

---

## Configuration

### Model Profiles

Control which model each agent uses. Balance quality vs token spend.

| Profile | Planning | Execution | Verification |
|---------|----------|-----------|--------------|
| `quality` | Opus | Opus | Sonnet |
| `balanced` (default) | Opus | Sonnet | Sonnet |
| `budget` | Sonnet | Sonnet | Haiku |

```bash
/ez:set-profile quality
```

### Multi-Model Configuration

Configure different AI providers per agent in `.planning/config.json`:

```json
{
  "provider": {
    "default": "alibaba",
    "anthropic": {
      "api_key": "env:ANTHROPIC_API_KEY",
      "models": { "opus": "claude-3-opus-20240229", "sonnet": "claude-3-sonnet-20240229" }
    },
    "alibaba": {
      "api_key": "env:DASHSCOPE_API_KEY",
      "models": { "high": "qwen-max", "balanced": "qwen-plus" }
    },
    "moonshot": {
      "api_key": "env:MOONSHOT_API_KEY",
      "models": { "high": "moonshot-v1-128k" }
    },
    "openai": {
      "api_key": "env:OPENAI_API_KEY",
      "models": { "high": "gpt-4-turbo-preview" }
    }
  },
  "agent_overrides": {
    "ez-planner": { "provider": "alibaba", "model": "qwen-max" },
    "ez-executor": { "provider": "anthropic", "model": "sonnet" },
    "ez-verifier": { "provider": "moonshot", "model": "balanced" }
  }
}
```

### Workflow Settings

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| `mode` | `yolo`, `interactive` | `interactive` | Auto-approve vs confirm at each step |
| `granularity` | `coarse`, `standard`, `fine` | `standard` | Phase granularity (phases × plans) |
| `workflow.research` | `boolean` | `true` | Research domain before planning |
| `workflow.plan_check` | `boolean` | `true` | Verify plans achieve phase goals |
| `workflow.verifier` | `boolean` | `true` | Confirm must-haves delivered |
| `parallelization.enabled` | `boolean` | `true` | Run independent plans in parallel |

### Git Branching

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| `git.branching_strategy` | `none`, `phase`, `milestone` | `none` | Branch creation strategy |
| `git.phase_branch_template` | string | `ez/phase-{phase}-{slug}` | Template for phase branches |
| `git.milestone_branch_template` | string | `ez/{milestone}-{slug}` | Template for milestone branches |

---

## Security

### Protecting Sensitive Files

Add sensitive file patterns to Claude Code's deny list:

```json
{
  "permissions": {
    "deny": [
      "Read(.env)",
      "Read(.env.*)",
      "Read(**/secrets/*)",
      "Read(**/*credential*)",
      "Read(**/*.pem)",
      "Read(**/*.key)"
    ]
  }
}
```

### Built-in Protections

- Command injection prevention (allowlist + validation)
- Path traversal prevention
- Secure credential storage (keytar + fallback)
- Command audit logging (`.planning/logs/`)
- Atomic commits with branch automation

---

## Troubleshooting

### Commands Not Found

```bash
# Verify installation
/ez:help

# Reinstall
ez-agents --claude --global
```

### File Path Issues (Docker/Containers)

If tilde paths fail, set `CLAUDE_CONFIG_DIR`:

```bash
CLAUDE_CONFIG_DIR=/home/youruser/.claude ez-agents --global
```

### Uninstall

```bash
# Global
ez-agents --claude --global --uninstall
ez-agents --opencode --global --uninstall
ez-agents --codex --global --uninstall

# Local (current project)
ez-agents --claude --local --uninstall
```

---

## Contributing

Contributions are welcome! EZ Agents builds upon the foundation of the upstream project by TÂCHES.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit changes (`git commit -m 'Add my feature'`)
4. Push to branch (`git push origin feature/my-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/howlil/ez-agents.git
cd ez-agents

# Install globally from local source
npm install -g .

# Build hooks
npm run build:hooks

# Run tests
npm test
```

### Guidelines

- Follow existing code conventions (JavaScript, no TypeScript)
- Add tests for new functionality
- Update documentation for user-facing changes
- Keep changes focused and atomic

---

## Acknowledgments

### Original Project

EZ Agents is a fork of the original project by [TÂCHES](https://github.com/glittercowboy). We build upon that foundation with multi-model support and enterprise-grade enhancements.

### Community Ports

| Project | Platform | Repository |
|---------|----------|------------|
| ez-opencode | OpenCode | [rokicool/ez-opencode](https://github.com/rokicool/ez-opencode) |
| ez-gemini (archived) | Gemini CLI | uberfuzzy |

These community ports pioneered multi-runtime support now included in EZ Agents.

---

## License

MIT License — See [LICENSE](LICENSE) for details.

---

## Star History

<a href="https://star-history.com/#howlil/ez-agents&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=howlil/ez-agents&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=howlil/ez-agents&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=howlil/ez-agents&type=Date" />
 </picture>
</a>

---

<div align="center">

**EZ Agents makes AI-assisted development reliable through context engineering and agent orchestration.**

[Report Issue](https://github.com/howlil/ez-agents/issues) · [Request Feature](https://github.com/howlil/ez-agents/issues) · [User Guide](docs/USER-GUIDE.md)

</div>
