# EZ Agents User Guide

Detailed reference for workflows, configuration, and troubleshooting. For quick-start setup, see the [README](../README.md).

---

## Table of Contents

- [Workflow](#workflow)
- [Command Reference](#command-reference)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)
- [Recovery Quick Reference](#recovery-quick-reference)

---

## Workflow

### Full Project Lifecycle

```
  ┌────────────────────────────────┐
  │     /ez:new-project            │
  │  Questions → Research → Plan   │
  └───────────────┬────────────────┘
                  │
                  ▼
  ┌───────────────────────────────────────────┐
  │  FOR EACH PHASE:                          │
  │                                           │
  │  /ez:discuss-phase  → Lock in approach    │
  │  /ez:plan-phase     → Break into tasks    │
  │  /ez:execute-phase  → Build (wave-based)  │
  │  /ez:verify-work    → Test & validate     │
  └───────────────────────────────────────────┘
                  │
                  ▼
  ┌────────────────────────────────┐
  │  /ez:audit-milestone           │
  │  /ez:complete-milestone        │
  └────────────────────────────────┘
```

### Parallel Execution with Git Commits

EZ Agents executes tasks in **waves** based on dependencies. Each task gets a fresh context window and creates an atomic git commit.

```
Phase 1: Foundation
│
├─ Wave 1 (Parallel) ─────────────────────────────┐
│  ┌─────────────────┐    ┌─────────────────┐    │
│  │ Task 1.1:       │    │ Task 1.2:       │    │
│  │ Database Schema │    │ Next.js Setup   │    │
│  │                 │    │                 │    │
│  │ Fresh 200K ctx  │    │ Fresh 200K ctx  │    │
│  │     ↓           │    │     ↓           │    │
│  │ git commit      │    │ git commit      │    │
│  │ "feat: schema"  │    │ "feat: setup"   │    │
│  └─────────────────┘    └─────────────────┘    │
│         ↓                      ↓                │
│  ┌─────────────────────────────────────────┐   │
│  │   Both commits pushed, context cleared  │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
         │
         ▼
├─ Wave 2 (Depends on Wave 1) ───────────────────┐
│  ┌─────────────────┐                           │
│  │ Task 1.3:       │                           │
│  │ Auth Endpoints  │  ← Needs schema + setup   │
│  │                 │                           │
│  │ Fresh 200K ctx  │                           │
│  │     ↓           │                           │
│  │ git commit      │                           │
│  │ "feat: auth"    │                           │
│  └─────────────────┘                           │
└─────────────────────────────────────────────────┘
```

**Why this matters:**

| Benefit | Explanation |
|---------|-------------|
| **Fresh context** | Each task gets full 200K token window — no context degradation |
| **Atomic commits** | One commit per task, easy to revert if something goes wrong |
| **Parallel execution** | Independent tasks run simultaneously, faster completion |
| **Clean history** | Commit messages describe what changed and why |
| **Debuggable** | When something breaks, you know exactly which task caused it |

### How Wave Execution Works

1. **Analyze dependencies** — EZ Agents reads all PLAN.md files and builds a dependency graph
2. **Wave 1** — All tasks with no dependencies run in parallel
3. **Commit & clear** — Each task commits independently, context is cleared
4. **Wave 2+** — Tasks wait for their dependencies to complete before starting
5. **Verify** — After all waves complete, `/ez:verify-work` checks everything works

### Example: E-commerce Platform

```
Milestone v1.0: MVP
│
├─ Phase 1: Foundation
│  ├─ Wave 1: User Model, Product Model (parallel)
│  └─ Wave 2: Auth API (needs User Model)
│
├─ Phase 2: Core Features
│  ├─ Wave 1: Cart API, Order API (parallel)
│  └─ Wave 2: Checkout UI (needs Cart + Order)
│
└─ Phase 3: Payments
   └─ Wave 1: Stripe Integration (needs Checkout)
```

### Existing Codebases

```
/ez:map-codebase
       │
       ├── Stack Mapper     → codebase/STACK.md
       ├── Arch Mapper      → codebase/ARCHITECTURE.md
       ├── Convention Mapper → codebase/CONVENTIONS.md
       └── Concern Mapper   → codebase/CONCERNS.md
              │
              ▼
       /ez:new-project  ← Questions focus on what you're ADDING
```

---

## Command Reference

### Core Workflow

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/ez:new-project` | Full project init: questions, research, requirements, roadmap | Start of a new project |
| `/ez:discuss-phase [N]` | Capture implementation decisions | Before planning, to shape how it gets built |
| `/ez:plan-phase [N]` | Research + plan + verify | Before executing a phase |
| `/ez:execute-phase <N>` | Execute all plans in parallel waves | After planning is complete |
| `/ez:verify-work [N]` | Manual UAT with auto-diagnosis | After execution completes |
| `/ez:audit-milestone` | Verify milestone met definition of done | Before completing milestone |
| `/ez:complete-milestone` | Archive milestone, tag release | All phases verified |
| `/ez:new-milestone [name]` | Start next version cycle | After completing a milestone |

### Navigation

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/ez:progress` | Show status and next steps | Anytime — "where am I?" |
| `/ez:resume-work` | Restore full context from last session | Starting a new session |
| `/ez:pause-work` | Save context handoff | Stopping mid-phase |
| `/ez:help` | Show all commands | Quick reference |
| `/ez:update` | Update EZ Agents with changelog preview | Check for new versions |

### Phase Management

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/ez:add-phase` | Append new phase to roadmap | Scope grows after initial planning |
| `/ez:insert-phase [N]` | Insert urgent work (decimal numbering) | Urgent fix mid-milestone |
| `/ez:remove-phase [N]` | Remove future phase and renumber | Descoping a feature |
| `/ez:list-phase-assumptions [N]` | Preview Claude's intended approach | Before planning, to validate direction |
| `/ez:plan-milestone-gaps` | Create phases for audit gaps | After audit finds missing items |
| `/ez:research-phase [N]` | Deep ecosystem research only | Complex or unfamiliar domain |

### Utilities

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/ez:map-codebase` | Analyze existing codebase | Before `/ez:new-project` on existing code |
| `/ez:quick` | Ad-hoc task with EZ Agents guarantees | Bug fixes, small features, config changes |
| `/ez:debug [desc]` | Systematic debugging with persistent state | When something breaks |
| `/ez:add-todo [desc]` | Capture an idea for later | Think of something during a session |
| `/ez:check-todos` | List pending todos | Review captured ideas |
| `/ez:settings` | Configure workflow toggles and model profile | Change model, toggle agents |
| `/ez:set-profile <profile>` | Quick profile switch | Change cost/quality tradeoff |
| `/ez:reapply-patches` | Restore local modifications after update | After `/ez:update` if you had local edits |

---

## Configuration

EZ Agents stores settings in `.planning/config.json`. Configure during `/ez:new-project` or update with `/ez:settings`.

### Full Schema

```json
{
  "mode": "interactive",
  "granularity": "standard",
  "model_profile": "balanced",
  "planning": {
    "commit_docs": true,
    "search_gitignored": false
  },
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true
  },
  "git": {
    "branching_strategy": "none",
    "phase_branch_template": "ez/phase-{phase}-{slug}",
    "milestone_branch_template": "ez/{milestone}-{slug}"
  }
}
```

### Core Settings

| Setting | Options | Default | What It Controls |
|---------|---------|---------|------------------|
| `mode` | `interactive`, `yolo` | `interactive` | `yolo` auto-approves; `interactive` confirms |
| `granularity` | `coarse`, `standard`, `fine` | `standard` | Phase count: 3-5, 5-8, or 8-12 |
| `model_profile` | `quality`, `balanced`, `budget` | `balanced` | Model tier per agent |

### Workflow Toggles

| Setting | Default | What It Controls |
|---------|---------|------------------|
| `workflow.research` | `true` | Domain investigation before planning |
| `workflow.plan_check` | `true` | Plan verification loop (up to 3 iterations) |
| `workflow.verifier` | `true` | Post-execution verification |

Disable these for familiar domains or to conserve tokens.

### Git Branching

| Strategy | Creates Branch | Best For |
|----------|---------------|----------|
| `none` | Never | Solo development, simple projects |
| `phase` | At each `execute-phase` | Code review per phase, granular rollback |
| `milestone` | At first `execute-phase` | Release branches, PR per version |

**Template variables:** `{phase}` = zero-padded number, `{slug}` = lowercase hyphenated name, `{milestone}` = version.

### Model Profiles

| Agent | `quality` | `balanced` | `budget` |
|-------|-----------|------------|----------|
| ez-planner | Opus | Opus | Sonnet |
| ez-roadmapper | Opus | Sonnet | Sonnet |
| ez-executor | Opus | Sonnet | Sonnet |
| ez-phase-researcher | Opus | Sonnet | Haiku |
| ez-project-researcher | Opus | Sonnet | Haiku |
| ez-research-synthesizer | Sonnet | Sonnet | Haiku |
| ez-debugger | Opus | Sonnet | Sonnet |
| ez-codebase-mapper | Sonnet | Haiku | Haiku |
| ez-verifier | Sonnet | Sonnet | Haiku |
| ez-plan-checker | Sonnet | Sonnet | Haiku |
| ez-integration-checker | Sonnet | Sonnet | Haiku |

**When to use:**
- **quality** — Critical work, complex decisions, you have quota
- **balanced** — Day-to-day development
- **budget** — High-volume work, familiar domains, prototyping

---

## Usage Examples

### New Project (Full Cycle)

```bash
/ez:new-project            # Answer questions, approve roadmap
/ez:discuss-phase 1        # Lock in approach
/ez:plan-phase 1           # Research + plan + verify
/ez:execute-phase 1        # Parallel execution
/ez:verify-work 1          # Manual UAT
/ez:discuss-phase 2        # Repeat for each phase
...
/ez:audit-milestone        # Check everything shipped
/ez:complete-milestone     # Archive, tag, done
```

### New Project from Document

```bash
/ez:new-project --auto @prd.md   # Auto-runs from your doc
/ez:discuss-phase 1               # Normal flow from here
```

### Existing Codebase

```bash
/ez:map-codebase           # Analyze what exists
/ez:new-project            # Questions focus on what you're ADDING
```

### Quick Bug Fix

```bash
/ez:quick
> "Fix the login button not responding on mobile Safari"
```

### Resuming After a Break

```bash
/ez:progress               # See where you left off
# or
/ez:resume-work            # Full context restoration
```

### Preparing for Release

```bash
/ez:audit-milestone        # Check requirements coverage
/ez:plan-milestone-gaps    # If audit found gaps, create phases
/ez:complete-milestone     # Archive, tag, done
```

### Speed vs Quality Presets

| Scenario | Mode | Granularity | Profile | Research | Plan Check | Verifier |
|----------|------|-------------|---------|----------|------------|----------|
| Prototyping | `yolo` | `coarse` | `budget` | off | off | off |
| Normal dev | `interactive` | `standard` | `balanced` | on | on | on |
| Production | `interactive` | `fine` | `quality` | on | on | on |

### Mid-Milestone Scope Changes

```bash
/ez:add-phase              # Append new phase
/ez:insert-phase 3         # Insert between phases 3 and 4
/ez:remove-phase 7         # Descope and renumber
```

---

## Troubleshooting

### "Project already initialized"

You ran `/ez:new-project` but `.planning/PROJECT.md` already exists. Delete `.planning/` to start over.

### Context Degradation During Long Sessions

Clear context between major commands: `/clear` in Claude Code. EZ Agents is designed around fresh contexts — every subagent gets a clean window. If quality drops, clear and use `/ez:resume-work` to restore state.

### Plans Seem Wrong or Misaligned

Run `/ez:discuss-phase [N]` before planning. Most plan quality issues come from Claude making assumptions. Or run `/ez:list-phase-assumptions [N]` to see what Claude intends before committing.

### Execution Fails or Produces Stubs

Plans should have 2-3 tasks maximum. If tasks are too large, they exceed what a single context window can produce reliably. Re-plan with smaller scope.

### Lost Track of Where You Are

Run `/ez:progress`. It reads all state files and tells you exactly where you are and what to do next.

### Need to Change Something After Execution

Don't re-run `/ez:execute-phase`. Use `/ez:quick` for targeted fixes, or `/ez:verify-work` to systematically identify issues through UAT.

### Model Costs Too High

Switch to budget profile: `/ez:set-profile budget`. Disable research and plan-check via `/ez:settings` if the domain is familiar.

### Working on a Sensitive/Private Project

Set `commit_docs: false` during `/ez:new-project` or via `/ez:settings`. Add `.planning/` to `.gitignore`. Planning artifacts stay local.

### EZ Agents Update Overwrote Local Changes

Since v1.17, the installer backs up locally modified files to `ez-local-patches/`. Run `/ez:reapply-patches` to merge changes back.

### Subagent Fails but Work Was Done

A known workaround exists for a Claude Code classification bug. EZ Agents spot-checks actual output before reporting failure. If you see failure but commits were made, check `git log` — the work may have succeeded.

---

## Recovery Quick Reference

| Problem | Solution |
|---------|----------|
| Lost context / new session | `/ez:resume-work` or `/ez:progress` |
| Phase went wrong | `git revert` the phase commits, then re-plan |
| Need to change scope | `/ez:add-phase`, `/ez:insert-phase`, or `/ez:remove-phase` |
| Milestone audit found gaps | `/ez:plan-milestone-gaps` |
| Something broke | `/ez:debug "description"` |
| Quick targeted fix | `/ez:quick` |
| Plan doesn't match vision | `/ez:discuss-phase [N]` then re-plan |
| Costs running high | `/ez:set-profile budget` and toggle agents off |
| Update broke local changes | `/ez:reapply-patches` |

---

## Project File Structure

```
.planning/
  PROJECT.md              # Project vision and context
  REQUIREMENTS.md         # Scoped requirements with IDs
  ROADMAP.md              # Phase breakdown with status
  STATE.md                # Decisions, blockers, session memory
  config.json             # Workflow configuration
  MILESTONES.md           # Completed milestone archive
  research/               # Domain research from /ez:new-project
  todos/
    pending/              # Captured ideas awaiting work
    done/                 # Completed todos
  debug/                  # Active debug sessions
    resolved/             # Archived debug sessions
  phases/
    XX-phase-name/
      XX-YY-PLAN.md       # Atomic execution plans
      XX-YY-SUMMARY.md    # Execution outcomes
      CONTEXT.md          # Implementation preferences
      RESEARCH.md         # Ecosystem research findings
      VERIFICATION.md     # Post-execution verification
```

---

## Related Documentation

- [Provider Behaviors](PROVIDER-BEHAVIORS.md) — Differences between Claude, OpenCode, Gemini, etc.
- [Qwen Code Install](QWEN-CODE-INSTALL.md) — Fix for Qwen Code CLI installation issues
- [README](../README.md) — Quick start and overview
