<div align="center">

# EZ Agents

**Turn AI coding assistants into reliable development teammates.**

[![npm](https://img.shields.io/npm/v/@howlil/ez-agents?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@howlil/ez-agents)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/howlil/ez-agents?style=for-the-badge&logo=github)](https://github.com/howlil/ez-agents/stargazers)

```bash
npm i -g @howlil/ez-agents@latest
```

**Works with:** Claude Code · OpenCode · Gemini CLI · Codex · Copilot · Qwen · Kimi

[Quick Start](#quick-start) · [How It Works](#how-it-works) · [Commands](#commands) · [Setup](#setup) · [Docs](docs/)

</div>

---

> **What is this?** EZ Agents adds structure to AI coding. Instead of asking Claude to "build a login system" and hoping for the best, you get a repeatable workflow: plan it out, build it in pieces, verify it works. Every change is committed with context, so you (or your team) can pick up where the AI left off.

---

## Why EZ Agents Exists

AI coding tools are great at writing code. But real development work needs more than that:

- **Context gets lost** between sessions
- **No one reviews** whether the code actually fits the plan
- **Important decisions** about architecture happen implicitly
- **Testing is an afterthought**

EZ Agents fixes this by adding a lightweight orchestration layer. Think of it as a project manager for your AI assistants.

---

## Quick Start

### 1. Install

```bash
npm i -g @howlil/ez-agents@latest
```

### 2. Setup for Your AI Tool

```bash
# For Claude Code
ez-agents --claude --global

# For OpenCode
ez-agents --opencode --global

# For Gemini CLI
ez-agents --gemini --global

# See all options
ez-agents --help
```

### 3. Start a Project

```bash
# In your project directory
/ez:new-project
```

You'll answer a few questions about what you're building, then EZ Agents generates a roadmap. From there, you work through phases:

```bash
/ez:discuss-phase 1    # Lock in how you want it built
/ez:plan-phase 1       # Break it into specific tasks
/ez:execute-phase 1    # Build it (one task per commit)
/ez:verify-work 1      # Check it actually works
```

---

## How It Works

### The Workflow

```
┌─────────────────┐
│  Start Project  │
│  /ez:new-project│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  For Each Phase:                                │
│                                                 │
│  1. /ez:discuss-phase  → Decide HOW to build   │
│  2. /ez:plan-phase     → Break into tasks      │
│  3. /ez:execute-phase  → Build (one commit/task)│
│  4. /ez:verify-work    → Test it works         │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  /ez:audit-milestone    │
│  /ez:complete-milestone │
└─────────────────────────┘
```

### Parallel Execution with Git Commits

Setiap task dijalankan secara paralel (jika tidak ada dependensi), dengan fresh context dan atomic commit:

```
Phase 1: Foundation
│
├─ Wave 1 (Parallel) ───────────────────────────┐
│  ┌─────────────────┐  ┌─────────────────┐     │
│  │ Task 1.1:       │  │ Task 1.2:       │     │
│  │ Database Schema │  │ Next.js Setup   │     │
│  │                 │  │                 │     │
│  │ Fresh 200K ctx  │  │ Fresh 200K ctx  │     │
│  │     ↓           │  │     ↓           │     │
│  │ git commit      │  │ git commit      │     │
│  │ "feat: schema"  │  │ "feat: setup"   │     │
│  └─────────────────┘  └─────────────────┘     │
└────────────────────────────────────────────────┘
         │
         ▼
├─ Wave 2 (Depends on Wave 1) ──────────────────┐
│  ┌─────────────────┐                          │
│  │ Task 1.3:       │                          │
│  │ Auth Endpoints  │  ← Needs schema + setup  │
│  │                 │                          │
│  │ Fresh 200K ctx  │                          │
│  │     ↓           │                          │
│  │ git commit      │                          │
│  │ "feat: auth"    │                          │
│  └─────────────────┘                          │
└────────────────────────────────────────────────┘
```

**Keuntungan:**
- **Fresh context per task** — AI tidak kehilangan context karena window penuh
- **Atomic commits** — Setiap commit = satu task, mudah di-revert jika ada masalah
- **Parallel execution** — Task independen jalan barengan, lebih cepat
- **Clean git history** — Commit message deskriptif, jelas apa yang berubah

### What Makes It Different

| Problem | Without EZ Agents | With EZ Agents |
|---------|------------------|----------------|
| **Lost context** | "What was I working on again?" | STATE.md tracks decisions, blockers, next steps |
| **Vague plans** | "Build the API" | Specific tasks: "Create POST /users endpoint with validation" |
| **No verification** | Code written, but does it work? | Each phase has explicit verification criteria |
| **Messy git history** | "WIP", "fix", "asdf" | One commit per task, meaningful messages |
| **Scope creep** | Features added ad-hoc | ROADMAP.md tracks what's in/out of scope |

---

## Features

### Core

- **Multi-Model Support** — Use Qwen, Kimi, OpenAI, or Anthropic. Mix providers per task.
- **Wave Execution** — Independent tasks run in parallel; dependent tasks wait their turn
- **Context Engineering** — PROJECT.md, STATE.md, SUMMARY.md preserve decisions across sessions
- **Atomic Commits** — Each task gets its own commit with context about what changed and why
- **Milestone Tracking** — Version releases with requirements audit and git tagging

### Built for Production

- **Security** — Command injection prevention, path validation, audit logging
- **Cross-Platform** — Pure JavaScript. Works on Windows, macOS, Linux (no Unix dependencies)
- **Error Handling** — Retry logic with backoff, circuit breaker for failing operations
- **Git Safety** — Atomic commits, branch automation, merge strategies

### For Existing Codebases

```bash
# Analyze what you have
/ez:map-codebase

# Then plan what to add
/ez:new-project
```

Parallel agents analyze your stack, architecture, conventions, and pain points. The output: structured docs that inform the roadmap.

---

## Commands

### Starting Out

| Command | What It Does |
|---------|-------------|
| `/ez:new-project` | Initialize: answer questions, get research, requirements, and roadmap |
| `/ez:map-codebase` | Analyze existing codebase (before `/ez:new-project`) |
| `/ez:quick` | Small task without full phase workflow (bug fixes, config changes) |

### Phase Workflow

| Command | What It Does |
|---------|-------------|
| `/ez:discuss-phase [N]` | Clarify implementation approach before planning |
| `/ez:plan-phase [N]` | Research domain, create task breakdown, define verification |
| `/ez:execute-phase [N]` | Build the plan (parallel waves, one commit per task) |
| `/ez:verify-work [N]` | Manual testing with auto-diagnosis of failures |

### Managing Scope

| Command | What It Does |
|---------|-------------|
| `/ez:add-phase` | Append new phase to roadmap |
| `/ez:insert-phase [N]` | Insert urgent work between existing phases |
| `/ez:remove-phase [N]` | Remove a phase and renumber |
| `/ez:progress` | See where you are and what's next |

### Wrapping Up

| Command | What It Does |
|---------|-------------|
| `/ez:audit-milestone` | Verify all requirements are met |
| `/ez:complete-milestone` | Archive milestone, create git tag |
| `/ez:new-milestone` | Start next version cycle |

### Utilities

| Command | What It Does |
|---------|-------------|
| `/ez:resume-work` | Restore context from last session |
| `/ez:settings` | Configure workflow, model profile, git strategy |
| `/ez:update` | Update EZ Agents (with changelog preview) |
| `/ez:help` | Show all commands |

---

## Setup

### Prerequisites

- Node.js >= 16.7.0
- One of: Claude Code, OpenCode, Gemini CLI, Codex, Copilot, Qwen Code, Kimi Code

### Installation

```bash
npm i -g @howlil/ez-agents@latest
ez-agents --claude --global
```

### Updating

```bash
npm update -g @howlil/ez-agents
```

**Development Install** (for contributing)

```bash
git clone https://github.com/howlil/ez-agents.git
cd ez-agents
npm install -g .
ez-agents --claude --local
```

---

## Configuration

EZ Agents stores settings in `.planning/config.json`. You configure this during `/ez:new-project` or adjust later with `/ez:settings`.

### Key Settings

| Setting | Options | Default | What It Does |
|---------|---------|---------|-------------|
| `mode` | `interactive`, `yolo` | `interactive` | `yolo` skips confirmation prompts |
| `model_profile` | `quality`, `balanced`, `budget` | `balanced` | Controls which model tier each agent uses |
| `granularity` | `coarse`, `standard`, `fine` | `standard` | How many phases (3-5, 5-8, or 8-12) |

### Model Profiles

| Agent | `quality` | `balanced` | `budget` |
|-------|-----------|------------|----------|
| Planner | Opus | Opus | Sonnet |
| Executor | Opus | Sonnet | Sonnet |
| Researcher | Opus | Sonnet | Haiku |
| Verifier | Sonnet | Sonnet | Haiku |

**When to use each:**
- **quality** — Critical work, complex decisions, you have quota
- **balanced** — Day-to-day development (the default for a reason)
- **budget** — High-volume work, familiar domains, prototyping

### Multi-Provider Setup

Different providers for different tasks:

```json
{
  "provider": {
    "default": "alibaba",
    "anthropic": {
      "api_key": "env:ANTHROPIC_API_KEY"
    },
    "alibaba": {
      "api_key": "env:DASHSCOPE_API_KEY"
    }
  },
  "agent_overrides": {
    "ez-planner": { "provider": "alibaba", "model": "qwen-max" },
    "ez-executor": { "provider": "anthropic", "model": "sonnet" }
  }
}
```

---

## Project Structure

After running `/ez:new-project`, you'll have:

```
.planning/
  PROJECT.md           # What you're building and why
  REQUIREMENTS.md      # Scoped requirements with IDs
  ROADMAP.md           # Phase breakdown with status
  STATE.md             # Current decisions, blockers, next steps
  config.json          # Your configuration
  phases/
    01-phase-name/
      01-01-PLAN.md    # Tasks to execute
      01-01-SUMMARY.md # What was built and why
      CONTEXT.md       # Your implementation preferences
      RESEARCH.md      # Domain research
      VERIFICATION.md  # Test results
```

**Note:** You can add `.planning/` to `.gitignore` if you don't want planning docs in your repo. Set `commit_docs: false` in `/ez:settings`.

---

## Example: Building a Task App

Let's say you want to build "a task management app with team collaboration."

### 1. Initialize

```bash
/ez:new-project
```

You answer questions:
- Tech stack? → "Next.js + PostgreSQL"
- Auth method? → "Email + OAuth (Google, GitHub)"
- First milestone? → "MVP: user accounts, create/edit tasks, share with team"

EZ Agents generates research, requirements, and a roadmap with ~6 phases.

### 2. Phase 1: Foundation

```bash
/ez:discuss-phase 1
```

You clarify: "Use Next.js App Router, Prisma for DB, next-auth for OAuth."

```bash
/ez:plan-phase 1
```

Research runs (auth patterns, Prisma schema design). Plan is created:
- Task 1: Database schema (users, tasks, teams)
- Task 2: Next.js setup with next-auth
- Task 3: User model and auth endpoints

```bash
/ez:execute-phase 1
```

Three tasks, three commits. Each task gets fresh context.

```bash
/ez:verify-work 1
```

You test: Can register? Can login? Can connect to DB? All pass.

### 3. Repeat for Each Phase

```bash
/ez:discuss-phase 2
/ez:plan-phase 2
/ez:execute-phase 2
/ez:verify-work 2
```

### 4. Complete Milestone

```bash
/ez:audit-milestone     # Checks all requirements are met
/ez:complete-milestone  # Archives, tags v1.0
```

---

## Documentation

| Doc | What's Inside |
|-----|---------------|
| [User Guide](docs/USER-GUIDE.md) | Full command reference, workflows, troubleshooting |
| [Workflows](docs/WORKFLOWS.md) | Complete workflow diagrams for all use cases |
| [Provider Behaviors](docs/PROVIDER-BEHAVIORS.md) | Differences between Claude, OpenCode, Gemini, etc. |
| [Qwen Code Install](docs/QWEN-CODE-INSTALL.md) | Fix for Qwen Code CLI installation issues |

---

## Contributing

Contributions welcome! A few guidelines:

1. **Test your changes** — Run `npm test` before submitting
2. **Keep it cross-platform** — No Unix-specific commands (use `fs-utils.cjs`)
3. **Document behavior** — Update USER-GUIDE.md for new commands
4. **Respect the workflow** — EZ Agents is about structure; don't break existing patterns

### Development Setup

```bash
git clone https://github.com/howlil/ez-agents.git
cd ez-agents
npm install
npm run build:hooks
npm link
```

### Running Tests

```bash
npm test              # Run all tests
npm run test:coverage # With coverage report
```

---

## Acknowledgments

EZ Agents is a fork of the original project by [TÂCHES](https://github.com/glittercowboy). This fork adds multi-model support (Qwen, Kimi, OpenAI), enterprise-grade security, and cross-platform reliability. Not affiliated with the upstream repository.

---

## License

MIT — see [LICENSE](LICENSE)

---

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/howlil/ez-agents/issues)
- **Discussions:** [GitHub Discussions](https://github.com/howlil/ez-agents/discussions)
- **npm:** [@howlil/ez-agents](https://www.npmjs.com/package/@howlil/ez-agents)
